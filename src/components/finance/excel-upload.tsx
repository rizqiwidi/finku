'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, Check, AlertCircle, X, FileText, Table, Loader2, FileDown, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateFinanceQueries } from '@/hooks/use-api';
import { cn } from '@/lib/utils';

interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
}

type ParsedCell = unknown;
type ParsedRow = ParsedCell[];

const CSV_FILE_PATTERN = /\.csv$/i;
const EXCEL_FILE_PATTERN = /\.(xlsx|xlsm)$/i;
const SUPPORTED_FILE_PATTERN = /\.(csv|xlsx|xlsm)$/i;
const SUPPORTED_FILE_ACCEPT = [
  '.csv',
  'text/csv',
  '.xlsx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xlsm',
  'application/vnd.ms-excel.sheet.macroEnabled.12',
].join(',');
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_ROWS = 1000;
const DANGEROUS_FORMULA_PREFIX = /^[=+\-@]/;

function isSupportedImportFile(file: File) {
  return SUPPORTED_FILE_PATTERN.test(file.name);
}

function parseCsvText(text: string) {
  const rows: ParsedRow[] = [];
  let currentRow: string[] = [];
  let currentValue = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ',' && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = '';
      continue;
    }

    if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1;
      }

      currentRow.push(currentValue);
      rows.push(currentRow.map((value) => value.trim()));
      currentRow = [];
      currentValue = '';
      continue;
    }

    currentValue += character;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow.map((value) => value.trim()));
  }

  return rows.filter((row) => row.some((cell) => String(cell ?? '').length > 0));
}

async function parseSpreadsheetFile(file: File) {
  if (CSV_FILE_PATTERN.test(file.name)) {
    const csvText = await file.text();
    return parseCsvText(csvText.replace(/^\uFEFF/, ''));
  }

  if (EXCEL_FILE_PATTERN.test(file.name)) {
    const readXlsxFile = (await import('read-excel-file/browser')).default;
    return readXlsxFile(file);
  }

  throw new Error('UNSUPPORTED_FILE');
}

function parseDateValue(value: ParsedCell) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const trimmedValue = String(value ?? '').trim();

  if (!trimmedValue) {
    return null;
  }

  const isoDate = new Date(trimmedValue);
  if (!Number.isNaN(isoDate.getTime())) {
    return isoDate;
  }

  const match = trimmedValue.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function parseAmountValue(value: ParsedCell) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value === 0) {
      return null;
    }

    return Math.abs(value);
  }

  const digitsOnly = String(value ?? '').replace(/[^\d-]/g, '');

  if (!digitsOnly || digitsOnly === '-') {
    return null;
  }

  const amount = Number(digitsOnly);
  if (!Number.isFinite(amount) || amount === 0) {
    return null;
  }

  return Math.abs(amount);
}

function findColumnIndex(headers: string[], candidates: string[]) {
  return headers.findIndex((header) => candidates.some((candidate) => header.includes(candidate)));
}

function isSafeImportText(value: string) {
  return !DANGEROUS_FORMULA_PREFIX.test(value);
}

function normalizeTextValue(value: ParsedCell) {
  return String(value ?? '').trim();
}

export function ExcelUpload() {
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [parsedData, setParsedData] = React.useState<ParsedTransaction[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [dragActive, setDragActive] = React.useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (isSupportedImportFile(droppedFile)) {
        setFile(droppedFile);
        parseFile(droppedFile);
      } else {
        toast({
          title: 'Format tidak didukung',
          description: 'Gunakan file CSV, XLSX, atau XLSM yang sesuai template.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = async (file: File) => {
    setUploading(true);
    setErrors([]);
    setParsedData([]);

    try {
      if (!isSupportedImportFile(file)) {
        setErrors(['Gunakan file CSV, XLSX, atau XLSM untuk import.']);
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setErrors(['Ukuran file melebihi 5MB. Pecah file menjadi batch yang lebih kecil.']);
        return;
      }

      const jsonData = await parseSpreadsheetFile(file);

      if (jsonData.length < 2) {
        setErrors(['File harus berisi header dan minimal satu baris data.']);
        return;
      }

      if (jsonData.length - 1 > MAX_IMPORT_ROWS) {
        setErrors([`Maksimal ${MAX_IMPORT_ROWS} baris transaksi per import.`]);
        return;
      }

      const headers = jsonData[0]?.map((header) => String(header).trim().toLowerCase()) || [];
      const dateCol = findColumnIndex(headers, ['tanggal', 'date', 'tgl']);
      const descCol = findColumnIndex(headers, ['deskripsi', 'description', 'keterangan', 'nama']);
      const amountCol = findColumnIndex(headers, ['jumlah', 'amount', 'nominal', 'nilai']);
      const typeCol = findColumnIndex(headers, ['tipe', 'type', 'jenis']);
      const categoryCol = findColumnIndex(headers, ['kategori', 'category']);

      if (dateCol === -1 || descCol === -1 || amountCol === -1) {
        setErrors(['File harus memiliki kolom: Tanggal, Deskripsi/Keterangan, dan Jumlah/Nominal.']);
        return;
      }

      const transactions: ParsedTransaction[] = [];
      const newErrors: string[] = [];

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;

        try {
          const rawType = normalizeTextValue(row[typeCol] || 'expense').toLowerCase();
          const type: 'income' | 'expense' =
            rawType.includes('pemasukan') || rawType.includes('income') || rawType.includes('masuk')
              ? 'income'
              : rawType.includes('expense') || rawType.includes('pengeluaran') || rawType.includes('keluar')
                ? 'expense'
                : 'expense';
          const date = parseDateValue(row[dateCol] || '');
          const description = normalizeTextValue(row[descCol] || '');
          const amount = parseAmountValue(row[amountCol] || '');
          const category = normalizeTextValue(row[categoryCol] || (type === 'income' ? 'Gaji' : 'Lainnya'));

          if (!date || date.getFullYear() < 2000 || date.getFullYear() > 2100) {
            newErrors.push(`Baris ${i + 1}: Tanggal tidak valid`);
            continue;
          }

          if (!description || description.length > 120 || !isSafeImportText(description)) {
            newErrors.push(`Baris ${i + 1}: Deskripsi tidak valid`);
            continue;
          }

          if (!amount || amount > 1_000_000_000_000) {
            newErrors.push(`Baris ${i + 1}: Jumlah tidak valid`);
            continue;
          }

          if (!category || category.length > 60 || !isSafeImportText(category)) {
            newErrors.push(`Baris ${i + 1}: Kategori tidak valid`);
            continue;
          }

          transactions.push({
            date,
            description,
            amount: Math.abs(amount),
            type,
            category,
          });
        } catch {
          newErrors.push(`Baris ${i + 1}: Format data tidak valid`);
        }
      }

      if (transactions.length === 0) {
        newErrors.push('Tidak ada transaksi valid yang bisa diimpor.');
      }

      setParsedData(transactions);
      setErrors(newErrors);
    } catch {
      setErrors(['Gagal membaca file. Pastikan file CSV/XLSX/XLSM valid dan sesuai template.']);
    } finally {
      setUploading(false);
    }
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setImporting(true);
    setProgress(0);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < parsedData.length; i++) {
      const transaction = parsedData[i];
      
      try {
        // First, find or create category
        const categoryResponse = await fetch('/api/categories?type=' + transaction.type);
        const categories = await categoryResponse.json();
        
        let categoryId = categories.find((c: { name: string }) => 
          c.name.toLowerCase() === transaction.category.toLowerCase()
        )?.id;

        if (!categoryId && categories.length > 0) {
          categoryId = categories[0].id;
        }

        if (!categoryId) {
          // Create category
          const createCatResponse = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: transaction.category,
              type: transaction.type,
              icon: transaction.type === 'income' ? 'TrendingUp' : 'TrendingDown',
              color: transaction.type === 'income' ? '#10b981' : '#ef4444',
            }),
          });
          const newCategory = await createCatResponse.json();
          categoryId = newCategory.id;
        }

        // Create transaction
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: transaction.amount,
            description: transaction.description,
            type: transaction.type,
            date: transaction.date.toISOString(),
            categoryId,
          }),
        });

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }

      setProgress(Math.round(((i + 1) / parsedData.length) * 100));
    }

    setImporting(false);

    if (successCount > 0) {
      toast({
        title: 'Import Berhasil',
        description: `${successCount} transaksi berhasil diimpor`,
      });
    }

    if (failCount > 0) {
      toast({
        title: 'Peringatan',
        description: `${failCount} transaksi gagal diimpor`,
        variant: 'destructive',
      });
    }

    if (successCount > 0) {
      setOpen(false);
      setFile(null);
      setParsedData([]);
      setProgress(0);
      await invalidateFinanceQueries(queryClient);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setParsedData([]);
    setErrors([]);
    setProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="h-11 w-full gap-2 border-0 bg-gradient-to-r from-violet-500 to-purple-500 px-4 text-sm text-white shadow-lg shadow-violet-500/25 transition-all duration-300 hover:scale-105 hover:from-violet-600 hover:to-purple-600 sm:w-auto"
        >
          <Upload className="w-4 h-4" />
          Import File
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[min(92vh,860px)] flex-col gap-0 overflow-hidden border-border bg-background p-0 sm:max-w-[620px]">
        <DialogHeader className="relative isolate shrink-0 overflow-hidden border-b border-border bg-background px-5 py-5">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 dark:from-violet-500/20 dark:via-purple-500/15 dark:to-fuchsia-500/15" />
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative flex items-center gap-3 pr-8"
          >
            <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">Import Transaksi</DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                Upload file CSV, XLSX, atau XLSM tervalidasi untuk import batch
              </DialogDescription>
            </div>
          </motion.div>
        </DialogHeader>

        <div className="overflow-y-auto px-5 py-5">
          <div className="space-y-4 bg-background">
          {errors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-600 dark:text-red-400">
                  <ul className="list-disc pl-4 space-y-0.5">
                    {errors.slice(0, 5).map((error, i) => (
                      <li key={i} className="text-xs">{error}</li>
                    ))}
                    {errors.length > 5 && <li className="text-xs">...dan {errors.length - 5} error lainnya</li>}
                  </ul>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {!file ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={cn(
                "relative border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-300 bg-muted/50",
                dragActive 
                  ? "border-violet-500 bg-violet-500/10 scale-[1.02]" 
                  : "border-border hover:border-violet-500/50 hover:bg-muted"
              )}
            >
              <motion.div
                animate={dragActive ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="relative z-10"
              >
                <div className={cn(
                  "w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center transition-colors",
                  dragActive ? "bg-violet-500/30" : "bg-muted"
                )}>
                  <Upload className={cn(
                    "w-7 h-7 transition-colors",
                    dragActive ? "text-violet-500" : "text-muted-foreground"
                  )} />
                </div>
                <p className="text-base font-medium text-foreground mb-1">
                  {dragActive ? "Lepaskan file di sini" : "Drag & drop file"}
                </p>
                <p className="text-sm text-muted-foreground mb-3">
                  atau klik untuk memilih
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Format: .csv, .xlsx, .xlsm (maks 5MB, maksimal 1000 baris)
                </p>
                <input
                  type="file"
                  accept={SUPPORTED_FILE_ACCEPT}
                  onChange={handleFileChange}
                  className="hidden"
                  id="excel-upload"
                />
                <Button asChild variant="outline" className="border-border text-foreground hover:bg-muted">
                  <label htmlFor="excel-upload" className="cursor-pointer">
                    <FileText className="w-4 h-4 mr-2" />
                    Pilih File
                  </label>
                </Button>
              </motion.div>
            </motion.div>
          ) : uploading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-10"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-14 h-14 mx-auto mb-4 border-4 border-violet-500/30 border-t-violet-500 rounded-full"
              />
              <p className="text-foreground font-medium">Memproses file...</p>
              <p className="text-sm text-muted-foreground mt-1">Menganalisis data transaksi</p>
            </motion.div>
          ) : parsedData.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-3"
              >
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400">{parsedData.length} transaksi siap diimpor</p>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Data valid dan siap disimpan</p>
                </div>
              </motion.div>

              <div className="bg-muted rounded-xl border border-border overflow-hidden">
                <div className="p-3 border-b border-border bg-card">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Preview Data</span>
                  </div>
                </div>
                <div className="max-h-44 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_hsl(var(--border))]">
                      <tr>
                        <th className="p-2 text-left text-xs font-medium text-muted-foreground">Tanggal</th>
                        <th className="p-2 text-left text-xs font-medium text-muted-foreground">Deskripsi</th>
                        <th className="p-2 text-right text-xs font-medium text-muted-foreground">Jumlah</th>
                        <th className="p-2 text-center text-xs font-medium text-muted-foreground">Tipe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 6).map((t, i) => (
                        <motion.tr
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-t border-border/50"
                        >
                          <td className="p-2 text-foreground">{t.date.toLocaleDateString('id-ID')}</td>
                          <td className="p-2 text-foreground truncate max-w-[120px]">{t.description}</td>
                          <td className="p-2 text-right font-medium text-foreground">
                            Rp {t.amount.toLocaleString('id-ID')}
                          </td>
                          <td className="p-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              t.type === 'income' 
                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                                : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                            }`}>
                              {t.type === 'income' ? 'Masuk' : 'Keluar'}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedData.length > 6 && (
                    <div className="p-2 text-center text-xs text-muted-foreground bg-card border-t border-border">
                      ...dan {parsedData.length - 6} transaksi lainnya
                    </div>
                  )}
                </div>
              </div>

              {importing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Mengimpor data...</span>
                    <span className="text-violet-500 font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2 bg-muted [&>div]:bg-gradient-to-r [&>div]:from-violet-500 [&>div]:to-purple-500" />
                </motion.div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="ghost"
                  onClick={resetUpload}
                  disabled={importing}
                  className="flex-1 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                >
                  <X className="w-4 h-4 mr-2" />
                  Batal
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={importing}
                  className="flex-1 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white shadow-lg shadow-violet-500/25"
                >
                  {importing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4 mr-2" />
                  )}
                  Import {parsedData.length} Transaksi
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-between p-4 bg-muted rounded-xl border border-border"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-500/20 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                <p className="text-sm font-medium text-foreground truncate max-w-[200px]">{file.name}</p>
                <p className="text-xs text-muted-foreground">Memproses...</p>
              </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={resetUpload}
                className="text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {/* Format Guide with Example Table */}
          {!file && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 text-foreground">
                <Info className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-medium">Format File</span>
              </div>
              
              {/* Example Table */}
              <div className="bg-muted rounded-xl border border-border overflow-hidden">
                <div className="p-2 bg-card border-b border-border">
                  <span className="text-xs font-medium text-muted-foreground">Contoh Format Tabel</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-card">
                      <tr>
                        <th className="p-2 text-left font-medium text-emerald-600 dark:text-emerald-400 border-r border-border">Tanggal</th>
                        <th className="p-2 text-left font-medium text-emerald-600 dark:text-emerald-400 border-r border-border">Deskripsi</th>
                        <th className="p-2 text-left font-medium text-emerald-600 dark:text-emerald-400 border-r border-border">Jumlah</th>
                        <th className="p-2 text-left font-medium text-emerald-600 dark:text-emerald-400 border-r border-border">Tipe</th>
                        <th className="p-2 text-left font-medium text-violet-500">Kategori</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-border">
                        <td className="p-2 text-foreground border-r border-border">01/01/2025</td>
                        <td className="p-2 text-foreground border-r border-border">Gaji Bulanan</td>
                        <td className="p-2 text-foreground border-r border-border">5000000</td>
                        <td className="p-2 text-emerald-600 dark:text-emerald-400 border-r border-border">income</td>
                        <td className="p-2 text-muted-foreground">Gaji</td>
                      </tr>
                      <tr className="border-t border-border">
                        <td className="p-2 text-foreground border-r border-border">02/01/2025</td>
                        <td className="p-2 text-foreground border-r border-border">Makan Siang</td>
                        <td className="p-2 text-foreground border-r border-border">25000</td>
                        <td className="p-2 text-rose-600 dark:text-rose-400 border-r border-border">expense</td>
                        <td className="p-2 text-muted-foreground">Makanan</td>
                      </tr>
                      <tr className="border-t border-border">
                        <td className="p-2 text-foreground border-r border-border">03/01/2025</td>
                        <td className="p-2 text-foreground border-r border-border">Bensin</td>
                        <td className="p-2 text-foreground border-r border-border">150000</td>
                        <td className="p-2 text-rose-600 dark:text-rose-400 border-r border-border">expense</td>
                        <td className="p-2 text-muted-foreground">Transportasi</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Format Info */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Kolom Wajib:</p>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Check className="w-3 h-3 text-emerald-500" />
                      Tanggal / Date / Tgl
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Check className="w-3 h-3 text-emerald-500" />
                      Deskripsi / Keterangan
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Check className="w-3 h-3 text-emerald-500" />
                      Jumlah / Nominal / Amount
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Kolom Opsional:</p>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Check className="w-3 h-3 text-violet-500" />
                      Tipe (income/expense)
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Check className="w-3 h-3 text-violet-500" />
                      Kategori
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Date Format Info */}
              <div className="bg-violet-500/10 dark:bg-violet-500/20 rounded-lg p-3 border border-violet-500/20">
                <p className="text-xs font-medium text-violet-600 dark:text-violet-400 mb-1">Validasi Import:</p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="bg-muted px-2 py-0.5 rounded">DD/MM/YYYY</span>
                  <span className="bg-muted px-2 py-0.5 rounded">YYYY-MM-DD</span>
                  <span className="bg-muted px-2 py-0.5 rounded">CSV / XLSX / XLSM</span>
                  <span className="bg-muted px-2 py-0.5 rounded">Tanpa formula cell</span>
                  <span className="bg-muted px-2 py-0.5 rounded">Maks 1000 baris</span>
                </div>
              </div>
            </motion.div>
          )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
