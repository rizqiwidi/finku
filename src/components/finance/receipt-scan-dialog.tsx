'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  FileScan,
  Loader2,
  ReceiptText,
  Save,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCategories, useCreateTransaction } from '@/hooks/use-api';
import { useToast } from '@/hooks/use-toast';
import {
  findCategoryIdFromDescription,
  findMatchingCategoryId,
  type SuggestedTransactionDraft,
} from '@/lib/transaction-drafts';
import type { Category, TransactionType } from '@/types';

const MAX_OCR_UPLOAD_BYTES = 6 * 1024 * 1024;
const MAX_RECEIPT_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_RECEIPT_EDGE = 1800;

interface PreparedReceiptFile {
  file: File;
  fallbackFile?: File | null;
  originalName: string;
  originalSize: number;
  uploadSize: number;
  mode: 'image-optimized' | 'image-original' | 'pdf';
}

function formatDateInput(value?: string | null) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    return `${Math.round(kilobytes)} KB`;
  }

  return `${(kilobytes / 1024).toFixed(1)} MB`;
}

async function optimizeReceiptImage(file: File) {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Gambar struk tidak bisa dibaca di browser.'));
      element.src = imageUrl;
    });

    const longestEdge = Math.max(image.width, image.height);
    const scale = longestEdge > MAX_RECEIPT_EDGE ? MAX_RECEIPT_EDGE / longestEdge : 1;
    const targetWidth = Math.max(1, Math.round(image.width * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Browser tidak mendukung canvas untuk optimasi gambar.');
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, targetWidth, targetHeight);
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const imageData = context.getImageData(0, 0, targetWidth, targetHeight);
    for (let index = 0; index < imageData.data.length; index += 4) {
      const red = imageData.data[index];
      const green = imageData.data[index + 1];
      const blue = imageData.data[index + 2];
      const grayscale = Math.round(red * 0.299 + green * 0.587 + blue * 0.114);
      imageData.data[index] = grayscale;
      imageData.data[index + 1] = grayscale;
      imageData.data[index + 2] = grayscale;
    }
    context.putImageData(imageData, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.68)
    );

    if (!blob) {
      throw new Error('Gagal menyiapkan gambar hasil kompresi.');
    }

    const normalizedName = file.name.replace(/\.[^.]+$/, '') || 'receipt';
    const optimizedFile = new File([blob], `${normalizedName}-optimized.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });

    return {
      file: optimizedFile,
      fallbackFile: file,
      originalName: file.name,
      originalSize: file.size,
      uploadSize: optimizedFile.size,
      mode: 'image-optimized',
    } satisfies PreparedReceiptFile;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export function ReceiptScanDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preparedFile, setPreparedFile] = useState<PreparedReceiptFile | null>(null);
  const [prepareLoading, setPrepareLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [draft, setDraft] = useState<SuggestedTransactionDraft | null>(null);
  const [parsedText, setParsedText] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const { data: categories } = useCategories();
  const createMutation = useCreateTransaction();
  const { toast } = useToast();

  const filteredCategories = useMemo(
    () => (categories ?? []).filter((category) => category.type === type),
    [categories, type]
  );

  const resetState = () => {
    setFile(null);
    setPreparedFile(null);
    setPrepareLoading(false);
    setScanLoading(false);
    setDraft(null);
    setParsedText('');
    setType('expense');
    setAmount('');
    setDescription('');
    setCategoryId('');
    setDate(new Date().toISOString().slice(0, 10));
    setNotes('');
  };

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  useEffect(() => {
    if (!draft || !(categories && categories.length > 0)) {
      return;
    }

    const mappedCategories = categories.map((category) => ({
      id: category.id,
      name: category.name,
      type: category.type,
    }));
    const descriptionMatch = findCategoryIdFromDescription(mappedCategories, type, `${description} ${notes}`);
    const categoryNameMatch = draft.categoryName?.trim()
      ? findMatchingCategoryId(mappedCategories, type, draft.categoryName, null)
      : null;
    const matchedCategoryId =
      (descriptionMatch && categoryNameMatch && descriptionMatch !== categoryNameMatch
        ? descriptionMatch
        : descriptionMatch ?? categoryNameMatch) ??
      filteredCategories[0]?.id ??
      '';

    setCategoryId((current) => {
      if (current && filteredCategories.some((category) => category.id === current)) {
        return current;
      }

      return matchedCategoryId;
    });
  }, [categories, description, draft, filteredCategories, notes, type]);

  const handleFileChange = async (selectedFile: File | null) => {
    if (!selectedFile) {
      return;
    }

    setFile(null);
    setPreparedFile(null);
    setDraft(null);
    setParsedText('');

    const isPdf =
      selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      if (selectedFile.size > MAX_OCR_UPLOAD_BYTES) {
        toast({
          title: 'File PDF terlalu besar',
          description: 'Gunakan file PDF dengan ukuran maksimal 6MB.',
          variant: 'destructive',
        });
        return;
      }

      setPreparedFile({
        file: selectedFile,
        fallbackFile: selectedFile,
        originalName: selectedFile.name,
        originalSize: selectedFile.size,
        uploadSize: selectedFile.size,
        mode: 'pdf',
      });
      setFile(selectedFile);
      return;
    }

    if (!selectedFile.type.startsWith('image/')) {
      toast({
        title: 'Format file belum didukung',
        description: 'Gunakan gambar struk atau PDF.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedFile.size > MAX_RECEIPT_IMAGE_BYTES) {
      toast({
        title: 'Gambar terlalu besar',
        description: 'Gunakan gambar struk dengan ukuran maksimal 15MB sebelum optimasi.',
        variant: 'destructive',
      });
      return;
    }

    setPrepareLoading(true);
    try {
      const optimizedFile = await optimizeReceiptImage(selectedFile);

      if (optimizedFile.uploadSize > MAX_OCR_UPLOAD_BYTES) {
        if (selectedFile.size <= MAX_OCR_UPLOAD_BYTES) {
          setPreparedFile({
            file: selectedFile,
            fallbackFile: selectedFile,
            originalName: selectedFile.name,
            originalSize: selectedFile.size,
            uploadSize: selectedFile.size,
            mode: 'image-original',
          });
          setFile(selectedFile);
          toast({
            title: 'Optimasi dilewati',
            description: 'File asli dipakai karena hasil kompresi tidak cukup kecil untuk OCR.',
          });
          return;
        }

        toast({
          title: 'Hasil optimasi masih terlalu besar',
          description: 'Gunakan foto struk yang lebih fokus atau potong area yang tidak perlu.',
          variant: 'destructive',
        });
        return;
      }

      setPreparedFile(optimizedFile);
      setFile(optimizedFile.file);
    } catch (error) {
      if (selectedFile.size <= MAX_OCR_UPLOAD_BYTES) {
        setPreparedFile({
          file: selectedFile,
          fallbackFile: selectedFile,
          originalName: selectedFile.name,
          originalSize: selectedFile.size,
          uploadSize: selectedFile.size,
          mode: 'image-original',
        });
        setFile(selectedFile);
        toast({
          title: 'Optimasi gambar dilewati',
          description: 'File asli tetap dipakai agar scan struk bisa dicoba langsung.',
        });
        return;
      }

      toast({
        title: 'Gagal menyiapkan gambar struk',
        description:
          error instanceof Error ? error.message : 'Coba gunakan foto struk lain yang lebih jelas.',
        variant: 'destructive',
      });
    } finally {
      setPrepareLoading(false);
    }
  };

  const submitReceiptScan = async (scanFile: File) => {
    const formData = new FormData();
    formData.append('file', scanFile);

    const response = await fetch('/api/ocr/receipt', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Gagal memindai struk.');
    }

    return data;
  };

  const handleScan = async () => {
    if (!file) {
      toast({
        title: 'File belum dipilih',
        description: 'Pilih foto struk atau PDF terlebih dahulu.',
        variant: 'destructive',
      });
      return;
    }

    setScanLoading(true);
    try {
      let data;

      try {
        data = await submitReceiptScan(file);
      } catch (primaryError) {
        const retryFile =
          preparedFile?.mode === 'image-optimized' && preparedFile.fallbackFile
            ? preparedFile.fallbackFile
            : null;

        if (!retryFile) {
          throw primaryError;
        }

        data = await submitReceiptScan(retryFile);
        setPreparedFile((current) =>
          current
            ? {
                ...current,
                file: retryFile,
                fallbackFile: retryFile,
                uploadSize: retryFile.size,
                mode: 'image-original',
              }
            : current
        );
        setFile(retryFile);

        toast({
          title: 'Scan memakai file asli',
          description: 'Versi kompresi gagal dibaca OCR, jadi sistem otomatis mencoba file asli.',
        });
      }

      const nextDraft = data.draft as SuggestedTransactionDraft;
      setDraft(nextDraft);
      setParsedText(data.parsedText ?? '');
      setType(nextDraft.type ?? 'expense');
      setAmount(nextDraft.amount ? String(nextDraft.amount) : '');
      setDescription(nextDraft.description ?? nextDraft.merchantName ?? '');
      setDate(formatDateInput(nextDraft.date));
      setNotes(nextDraft.notes ?? '');

      toast({
        title: 'Scan selesai',
        description: 'Periksa hasil OCR sebelum menyimpan transaksi.',
      });
    } catch (error) {
      toast({
        title: 'Scan struk gagal',
        description: error instanceof Error ? error.message : 'Gagal memindai struk.',
        variant: 'destructive',
      });
    } finally {
      setScanLoading(false);
    }
  };

  const handleSave = async () => {
    const numericAmount = Number(amount.replace(/[^\d]/g, ''));
    if (!numericAmount || !description.trim() || !categoryId) {
      toast({
        title: 'Draft belum lengkap',
        description: 'Nominal, deskripsi, dan kategori wajib diisi sebelum menyimpan.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createMutation.mutateAsync({
        amount: numericAmount,
        description: description.trim(),
        categoryId,
        type,
        date: new Date(date),
        notes: notes.trim() || undefined,
      });

      toast({
        title: 'Transaksi ditambahkan',
        description: 'Hasil scan struk berhasil disimpan sebagai transaksi baru.',
      });
      setOpen(false);
    } catch {
      toast({
        title: 'Gagal menyimpan transaksi',
        description: 'Coba lagi setelah memeriksa data hasil scan.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full border-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 transition-all duration-300 hover:scale-105 hover:from-amber-600 hover:to-orange-600 sm:w-auto"
        >
          <FileScan className="mr-2 h-4 w-4" />
          Scan Struk
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[640px]">
        <DialogHeader className="shrink-0 border-b border-border bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-5">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ReceiptText className="h-4 w-4 text-amber-500" />
            Scan Struk dengan OCR
          </DialogTitle>
          <DialogDescription>
            Unggah foto struk atau PDF, lalu review hasil OCR sebelum disimpan sebagai transaksi.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {!draft ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                  <Upload className="h-7 w-7" />
                </div>
                <p className="text-sm font-medium text-foreground">Unggah foto struk atau PDF</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  OCR Space akan membaca teks struk, lalu Anda bisa meninjau hasilnya sebelum disimpan.
                </p>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  className="mt-4"
                  onChange={(event) => void handleFileChange(event.target.files?.[0] ?? null)}
                />
                {prepareLoading ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-background px-3 py-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Menyiapkan gambar di perangkat Anda...</span>
                  </div>
                ) : null}
                {preparedFile ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-background px-3 py-1 text-xs text-muted-foreground">
                    <Badge variant="secondary">{formatFileSize(preparedFile.uploadSize)}</Badge>
                    <span className="max-w-[220px] truncate">{preparedFile.originalName}</span>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-border bg-card/80 p-4 text-sm text-muted-foreground">
                <div className="mb-2 flex items-center gap-2 text-foreground">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Review sebelum simpan
                </div>
                Gambar struk akan dikompresi dan di-grayscale langsung di browser agar upload OCR lebih ringan. Setelah scan selesai, Anda bisa cek nominal, kategori, tanggal, deskripsi, lalu pilih simpan atau batal.
              </div>

              {preparedFile ? (
                <div className="rounded-2xl border border-border bg-muted/25 p-4 text-xs text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      Asal {formatFileSize(preparedFile.originalSize)}
                    </Badge>
                    <Badge variant="outline">
                      Upload {formatFileSize(preparedFile.uploadSize)}
                    </Badge>
                    <Badge variant="secondary">
                      {preparedFile.mode === 'image-optimized'
                        ? 'Grayscale + Compress'
                        : preparedFile.mode === 'image-original'
                          ? 'File Asli'
                          : 'PDF langsung'}
                    </Badge>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {type === 'income' ? 'Pemasukan' : type === 'savings' ? 'Tabungan' : 'Pengeluaran'}
                </Badge>
                {draft.confidence ? <Badge variant="outline">Confidence {draft.confidence}%</Badge> : null}
                {draft.reasoning ? (
                  <span className="text-xs text-muted-foreground">{draft.reasoning}</span>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Tipe Transaksi</Label>
                  <Select value={type} onValueChange={(value) => setType(value as TransactionType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Pengeluaran</SelectItem>
                      <SelectItem value="income">Pemasukan</SelectItem>
                      <SelectItem value="savings">Tabungan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Nominal (Rp)</Label>
                  <Input
                    inputMode="numeric"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ''))}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Deskripsi</Label>
                  <Input
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Deskripsi transaksi"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Kategori</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map((category: Category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Tanggal</Label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Catatan</Label>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Tambahkan catatan hasil scan"
                  className="min-h-20 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Hasil OCR Mentah</Label>
                <Textarea
                  value={parsedText}
                  readOnly
                  className="min-h-36 resize-none bg-muted/40 text-xs"
                />
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex gap-2 border-t border-border bg-background p-4">
          {!draft ? (
            <>
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                <X className="mr-2 h-4 w-4" />
                Batal
              </Button>
              <Button
                type="button"
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
                onClick={handleScan}
                disabled={scanLoading || prepareLoading}
              >
                {scanLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileScan className="mr-2 h-4 w-4" />}
                Proses Scan
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                <X className="mr-2 h-4 w-4" />
                Batal
              </Button>
              <Button
                type="button"
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600"
                onClick={handleSave}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Tambah Transaksi
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
