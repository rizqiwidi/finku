'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  FileScan,
  Loader2,
  PiggyBank,
  ReceiptText,
  Save,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateInput } from '@/components/ui/date-input';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useCategories, useCreateTransaction } from '@/hooks/use-api';
import { useToast } from '@/hooks/use-toast';
import { getCategoryIconComponent } from '@/lib/category-icons';
import { formatDateInputValue, parseTransactionDateValue } from '@/lib/date-input';
import {
  findCategoryIdFromDescription,
  findMatchingCategoryId,
  parseReceiptAmount,
  sanitizeSuggestedTransactionDraftInput,
  suggestedTransactionDraftSchema,
  type SuggestedTransactionDraft,
} from '@/lib/transaction-drafts';
import { cn } from '@/lib/utils';
import type { Category, TransactionType } from '@/types';

const MAX_OCR_UPLOAD_BYTES = 6 * 1024 * 1024;
const MAX_RECEIPT_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_RECEIPT_EDGE = 1800;
const MAX_RECEIPT_FILES = 5;

interface PreparedReceiptFile {
  id: string;
  file: File;
  fallbackFile?: File | null;
  originalName: string;
  uploadSize: number;
  mode: 'image-optimized' | 'image-original' | 'pdf';
}

interface LocalReceiptDraft extends SuggestedTransactionDraft {
  categoryId?: string | null;
  receiptId: string;
  receiptLabel: string;
  itemIndex: number;
  itemCount: number;
  parsedText?: string | null;
  detectedDate?: string | null;
}

interface ReceiptScanResponse {
  error?: string;
  draft?: SuggestedTransactionDraft | null;
  drafts?: SuggestedTransactionDraft[];
  parsedText?: string;
  summary?: string | null;
}

function createReceiptAssetId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`;
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

function resolveDraftCategoryId(categories: Category[], draft: SuggestedTransactionDraft) {
  const descriptionContext = [draft.description, draft.merchantName, draft.notes].filter(Boolean).join(' ');
  const descriptionMatch = findCategoryIdFromDescription(categories, draft.type, descriptionContext);
  const categoryNameMatch = draft.categoryName?.trim()
    ? findMatchingCategoryId(categories, draft.type, draft.categoryName, null)
    : null;

  if (descriptionMatch && categoryNameMatch && descriptionMatch !== categoryNameMatch) {
    return descriptionMatch;
  }

  return (
    descriptionMatch ??
    categoryNameMatch ??
    findMatchingCategoryId(categories, draft.type, draft.categoryName, descriptionContext)
  );
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeInlineText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeReceiptDraftNotes(notes?: string | null, parsedText?: string | null) {
  const trimmedNotes = notes?.trim();
  if (!trimmedNotes) {
    return null;
  }

  if (parsedText && normalizeInlineText(trimmedNotes) === normalizeInlineText(parsedText)) {
    return null;
  }

  const wordCount = trimmedNotes.split(/\s+/).length;
  if (wordCount > 25 && /(qty|subtotal|total|cash|change|invoice|receipt)/i.test(trimmedNotes)) {
    return null;
  }

  return trimmedNotes;
}

function getDescriptionTokens(description?: string | null) {
  if (!description) {
    return [];
  }

  const stopWords = new Set([
    'dan',
    'yang',
    'untuk',
    'dengan',
    'pada',
    'dari',
    'the',
    'item',
    'items',
    'transaksi',
    'pembelian',
    'belanja',
    'struk',
    'receipt',
  ]);

  return Array.from(
    new Set(
      description
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !stopWords.has(token))
    )
  );
}

function normalizeQuantityValue(rawValue: string) {
  const parsed = Number.parseFloat(rawValue.replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 99) {
    return null;
  }

  return Number.isInteger(parsed)
    ? parsed.toString()
    : parsed.toLocaleString('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
}

function parseQuantityNumber(rawValue?: string | null) {
  if (!rawValue) {
    return null;
  }

  const parsed = Number.parseFloat(rawValue.replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 99) {
    return null;
  }

  return parsed;
}

function normalizeReceiptItemLabel(description: string) {
  return description
    .replace(/^(?:pembelian|belanja|item|transaksi)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractQuantityFromLine(line: string, tokens: string[], targetAmount?: number | null) {
  const quantityByMultiplier = Array.from(
    line.matchAll(/(\d+(?:[.,]\d+)?)\s*[xX]\s*(?:rp\s*)?(\d{1,3}(?:[.,]\d{3})+|\d{3,})/gi)
  );

  for (const match of quantityByMultiplier) {
    const quantityNumber = parseQuantityNumber(match[1]);
    const unitAmount = parseReceiptAmount(match[2] ?? '');
    if (!quantityNumber || !unitAmount) {
      continue;
    }

    if (!targetAmount || Math.round(quantityNumber * unitAmount) === Math.round(targetAmount)) {
      return normalizeQuantityValue(match[1]);
    }
  }

  const patterns = [
    /(?:qty|jumlah|jml)\s*[:x-]?\s*(\d+(?:[.,]\d+)?)/i,
    /\b(\d+(?:[.,]\d+)?)\s*(?:x|pcs|pc|item|items|porsi|pack|botol|gelas|cup|sachet|ltr|liter|kg|gr|g)\b/i,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    const quantity = match?.[1] ? normalizeQuantityValue(match[1]) : null;
    if (quantity) {
      return quantity;
    }
  }

  if (tokens.length === 0) {
    return null;
  }

  const tokenPattern = tokens.map(escapeRegex).join('|');
  const beforeMatch = line.match(new RegExp(`\\b(\\d{1,2})(?:[.,]0+)?\\s+(?:${tokenPattern})\\b`, 'i'));
  const afterMatch = line.match(
    new RegExp(`\\b(?:${tokenPattern})\\b(?:\\s*(?:x|qty|jumlah|pcs|pc|item|items|-)\\s*)?(\\d{1,2})(?:[.,]0+)?\\b`, 'i')
  );

  return normalizeQuantityValue(beforeMatch?.[1] ?? afterMatch?.[1] ?? '');
}

function extractReceiptQuantity(
  description?: string | null,
  targetAmount?: number | null,
  ...sources: Array<string | null | undefined>
) {
  if (!description) {
    return null;
  }

  const tokens = getDescriptionTokens(description);
  const candidateLines = sources
    .flatMap((source) => (source ? source.split(/\r?\n/) : []))
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of candidateLines) {
    const normalizedLine = normalizeInlineText(line);
    const hasTokenMatch =
      tokens.length === 0 || tokens.some((token) => normalizedLine.includes(token));
    if (!hasTokenMatch && !targetAmount) {
      continue;
    }

    const quantity = extractQuantityFromLine(line, tokens, targetAmount);
    if (quantity) {
      return quantity;
    }
  }

  return null;
}

function extractReceiptExtraNotes(notes?: string | null, parsedText?: string | null) {
  const trimmedNotes = notes?.trim();
  if (!trimmedNotes) {
    return null;
  }

  if (parsedText && normalizeInlineText(trimmedNotes) === normalizeInlineText(parsedText)) {
    return null;
  }

  if (trimmedNotes.split(/\s+/).length > 25 && /(rp|qty|jumlah|subtotal|total|cash|change|invoice)/i.test(trimmedNotes)) {
    return null;
  }

  return trimmedNotes;
}

function toLocalReceiptDraft(
  draft: SuggestedTransactionDraft,
  categories: Category[],
  metadata: Pick<
    LocalReceiptDraft,
    'receiptId' | 'receiptLabel' | 'itemIndex' | 'itemCount' | 'parsedText' | 'detectedDate'
  >
) {
  const normalizedDraft = suggestedTransactionDraftSchema.parse(
    sanitizeSuggestedTransactionDraftInput(draft)
  );

  return {
    ...normalizedDraft,
    notes: sanitizeReceiptDraftNotes(normalizedDraft.notes, metadata.parsedText),
    categoryId: resolveDraftCategoryId(categories, normalizedDraft),
    ...metadata,
  } satisfies LocalReceiptDraft;
}

function resolveDetectedReceiptDate(drafts: SuggestedTransactionDraft[]) {
  const firstValidDate = drafts.find((draft) => parseTransactionDateValue(draft.date))?.date;
  return firstValidDate ? formatDateInputValue(firstValidDate) : null;
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

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.68));
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
      uploadSize: optimizedFile.size,
      mode: 'image-optimized',
    } satisfies Omit<PreparedReceiptFile, 'id'>;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

async function prepareReceiptFile(file: File) {
  const receiptId = createReceiptAssetId(file);
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    if (file.size > MAX_OCR_UPLOAD_BYTES) {
      throw new Error('Gunakan file PDF dengan ukuran maksimal 6MB.');
    }

    return {
      id: receiptId,
      file,
      fallbackFile: file,
      originalName: file.name,
      uploadSize: file.size,
      mode: 'pdf',
    } satisfies PreparedReceiptFile;
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Gunakan gambar struk atau PDF.');
  }

  if (file.size > MAX_RECEIPT_IMAGE_BYTES) {
    throw new Error('Gunakan gambar struk dengan ukuran maksimal 15MB sebelum optimasi.');
  }

  try {
    const optimizedFile = await optimizeReceiptImage(file);

    if (optimizedFile.uploadSize > MAX_OCR_UPLOAD_BYTES) {
      if (file.size <= MAX_OCR_UPLOAD_BYTES) {
        return {
          id: receiptId,
          file,
          fallbackFile: file,
          originalName: file.name,
          uploadSize: file.size,
          mode: 'image-original',
        } satisfies PreparedReceiptFile;
      }

      throw new Error('Gunakan foto struk yang lebih fokus atau potong area yang tidak perlu.');
    }

    return {
      id: receiptId,
      ...optimizedFile,
    } satisfies PreparedReceiptFile;
  } catch (error) {
    if (file.size <= MAX_OCR_UPLOAD_BYTES) {
      return {
        id: receiptId,
        file,
        fallbackFile: file,
        originalName: file.name,
        uploadSize: file.size,
        mode: 'image-original',
      } satisfies PreparedReceiptFile;
    }

    throw error;
  }
}

export interface ReceiptScanDialogProps {
  openOnMount?: boolean;
}

export function ReceiptScanDialog({
  openOnMount = false,
}: ReceiptScanDialogProps) {
  const [open, setOpen] = useState(Boolean(openOnMount));
  const [preparedFiles, setPreparedFiles] = useState<PreparedReceiptFile[]>([]);
  const [prepareLoading, setPrepareLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [drafts, setDrafts] = useState<LocalReceiptDraft[]>([]);
  const [activeDraftIndex, setActiveDraftIndex] = useState(0);
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(formatDateInputValue());
  const [notes, setNotes] = useState('');
  const { data: categories } = useCategories();
  const createMutation = useCreateTransaction();
  const { toast } = useToast();

  const activeDraft = drafts[activeDraftIndex] ?? null;
  const filteredCategories = useMemo(
    () => (categories ?? []).filter((category) => category.type === type),
    [categories, type]
  );
  const isBusy = prepareLoading || scanLoading || createMutation.isPending || isSavingAll;

  const resetEditor = () => {
    setType('expense');
    setAmount('');
    setDescription('');
    setCategoryId('');
    setDate(formatDateInputValue());
    setNotes('');
  };

  const resetState = () => {
    setPreparedFiles([]);
    setPrepareLoading(false);
    setScanLoading(false);
    setIsSavingAll(false);
    setDrafts([]);
    setActiveDraftIndex(0);
    resetEditor();
  };

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  useEffect(() => {
    if (!activeDraft || !(categories && categories.length > 0)) {
      return;
    }

    if (categoryId && filteredCategories.some((category) => category.id === categoryId)) {
      return;
    }

    const matchedCategoryId =
      resolveDraftCategoryId(categories, {
        ...activeDraft,
        type,
        description,
        notes,
      }) ??
      filteredCategories[0]?.id ??
      '';

    if (matchedCategoryId) {
      setCategoryId(matchedCategoryId);
    }
  }, [activeDraft, categories, categoryId, description, filteredCategories, notes, type]);

  const applyDraft = (index: number, nextDrafts = drafts) => {
    const draft = nextDrafts[index];
    if (!draft) {
      return;
    }

    setActiveDraftIndex(index);
    setType(draft.type ?? 'expense');
    setAmount(draft.amount ? String(draft.amount) : '');
    setDescription(draft.description ?? draft.merchantName ?? '');
    setCategoryId(draft.categoryId ?? resolveDraftCategoryId(categories ?? [], draft) ?? '');
    setDate(formatDateInputValue(draft.date));
    setNotes(draft.notes ?? '');
  };

  const buildActiveDraft = (currentDraft: LocalReceiptDraft) => {
    const selectedCategory = (categories ?? []).find((category) => category.id === categoryId);
    const parsedAmount = Number(amount.replace(/[^\d]/g, ''));

    const nextDraft = suggestedTransactionDraftSchema.parse(
      sanitizeSuggestedTransactionDraftInput({
        type,
        amount: parsedAmount > 0 ? parsedAmount : null,
        description: description.trim() || currentDraft?.merchantName || null,
        categoryName: selectedCategory?.name ?? currentDraft?.categoryName ?? null,
        date,
        notes: notes.trim() || null,
        merchantName: currentDraft?.merchantName ?? null,
        confidence: currentDraft?.confidence ?? null,
        reasoning: currentDraft?.reasoning ?? null,
      })
    );

    return {
      ...currentDraft,
      ...nextDraft,
      categoryId: categoryId || null,
    } satisfies LocalReceiptDraft;
  };

  const syncDraftsFromEditor = () => {
    if (!activeDraft) {
      return drafts;
    }

    const nextDraft = buildActiveDraft(activeDraft);
    const sharedReceiptDate = formatDateInputValue(nextDraft.date);
    const snapshot = drafts.map((draft, index) => {
      if (index === activeDraftIndex) {
        return {
          ...nextDraft,
          date: sharedReceiptDate,
        };
      }

      if (draft.receiptId === nextDraft.receiptId) {
        return {
          ...draft,
          date: sharedReceiptDate,
        };
      }

      return draft;
    });
    setDrafts(snapshot);
    return snapshot;
  };

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);

    const isCurrentCategoryValid = (categories ?? []).some(
      (category) => category.id === categoryId && category.type === nextType
    );
    if (isCurrentCategoryValid) {
      return;
    }

    const currentDraft = activeDraft ? buildActiveDraft(activeDraft) : null;
    const nextCategoryId =
      (currentDraft
        ? resolveDraftCategoryId(categories ?? [], {
            ...currentDraft,
            type: nextType,
          })
        : null) ??
      (categories ?? []).find((category) => category.type === nextType)?.id ??
      '';

    setCategoryId(nextCategoryId);
  };

  const handleFilesChange = async (selectedFiles: FileList | null) => {
    if (!selectedFiles?.length) {
      return;
    }

    const remainingSlots = MAX_RECEIPT_FILES - preparedFiles.length;
    if (remainingSlots <= 0) {
      toast({
        title: 'Batas file tercapai',
        description: `Maksimal ${MAX_RECEIPT_FILES} struk per proses scan.`,
        variant: 'destructive',
      });
      return;
    }

    const incomingFiles = Array.from(selectedFiles).slice(0, remainingSlots);
    if (selectedFiles.length > remainingSlots) {
      toast({
        title: 'Sebagian file dilewati',
        description: `Hanya ${remainingSlots} file tambahan yang bisa dimasukkan.`,
      });
    }

    setPrepareLoading(true);
    try {
      const nextPreparedFiles: PreparedReceiptFile[] = [];

      for (const file of incomingFiles) {
        try {
          nextPreparedFiles.push(await prepareReceiptFile(file));
        } catch (error) {
          toast({
            title: `Gagal menyiapkan ${file.name}`,
            description:
              error instanceof Error ? error.message : 'Gunakan file lain yang lebih jelas.',
            variant: 'destructive',
          });
        }
      }

      if (nextPreparedFiles.length > 0) {
        setPreparedFiles((current) => [...current, ...nextPreparedFiles]);
      }
    } finally {
      setPrepareLoading(false);
    }
  };

  const removePreparedFile = (fileId: string) => {
    setPreparedFiles((current) => current.filter((item) => item.id !== fileId));
  };

  const submitReceiptScan = async (scanFile: File) => {
    const formData = new FormData();
    formData.append('file', scanFile);

    const response = await fetch('/api/ocr/receipt', {
      method: 'POST',
      body: formData,
    });

    const rawText = await response.text();
    let data: ReceiptScanResponse = {};

    try {
      data = rawText ? (JSON.parse(rawText) as ReceiptScanResponse) : {};
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
          (rawText.includes('<!DOCTYPE') || rawText.includes('<html')
            ? 'Server scan struk gagal sebelum mengirim respons JSON. Cek env OCR dan log deployment.'
            : 'Gagal memindai struk.')
      );
    }

    return data;
  };

  const scanPreparedFile = async (preparedFile: PreparedReceiptFile) => {
    try {
      return await submitReceiptScan(preparedFile.file);
    } catch (primaryError) {
      if (preparedFile.mode !== 'image-optimized' || !preparedFile.fallbackFile) {
        throw primaryError;
      }

      const fallbackResponse = await submitReceiptScan(preparedFile.fallbackFile);
      setPreparedFiles((current) =>
        current.map((item) =>
          item.id === preparedFile.id
            ? {
                ...item,
                file: preparedFile.fallbackFile as File,
                fallbackFile: preparedFile.fallbackFile,
                uploadSize: preparedFile.fallbackFile?.size ?? item.uploadSize,
                mode: 'image-original',
              }
            : item
        )
      );
      return fallbackResponse;
    }
  };

  const handleScan = async () => {
    if (preparedFiles.length === 0) {
      toast({
        title: 'Struk belum dipilih',
        description: 'Pilih minimal satu struk sebelum memulai scan.',
        variant: 'destructive',
      });
      return;
    }

    setScanLoading(true);
    try {
      const collectedDrafts: LocalReceiptDraft[] = [];
      const failedFiles: string[] = [];

      for (const preparedFile of preparedFiles) {
        try {
          const response = await scanPreparedFile(preparedFile);
          const responseDrafts =
            Array.isArray(response.drafts) && response.drafts.length > 0
              ? response.drafts
              : response.draft
                ? [response.draft]
                : [];
          const detectedReceiptDate = resolveDetectedReceiptDate(responseDrafts);
          const sharedReceiptDate = formatDateInputValue();

          const mappedDrafts = responseDrafts.map((draft, index) =>
            toLocalReceiptDraft(
              {
                ...draft,
                date: sharedReceiptDate,
              },
              categories ?? [],
              {
              receiptId: preparedFile.id,
              receiptLabel: preparedFile.originalName,
              itemIndex: index,
              itemCount: responseDrafts.length,
              parsedText: response.parsedText ?? null,
              detectedDate: detectedReceiptDate,
              }
            )
          );

          if (mappedDrafts.length > 0) {
            collectedDrafts.push(...mappedDrafts);
          }
        } catch (error) {
          console.error('Receipt scan failed:', error);
          failedFiles.push(preparedFile.originalName);
        }
      }

      if (collectedDrafts.length === 0) {
        throw new Error('Tidak ada draft transaksi yang berhasil dihasilkan dari struk.');
      }

      setDrafts(collectedDrafts);
      applyDraft(0, collectedDrafts);

      toast({
        title: 'Scan selesai',
        description:
          failedFiles.length > 0
            ? `${collectedDrafts.length} draft siap direview. ${failedFiles.length} file gagal diproses.`
            : `${collectedDrafts.length} draft siap direview.`,
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

  const buildReceiptNotes = (draft: LocalReceiptDraft) => {
    const resolvedCategoryName =
      (categories ?? []).find((category) => category.id === draft.categoryId)?.name ??
      draft.categoryName ??
      'Tanpa kategori';
    const resolvedDescription = draft.description ?? draft.merchantName ?? 'Tanpa deskripsi';
    const itemLabel = normalizeReceiptItemLabel(resolvedDescription) || resolvedDescription;
    const quantity = extractReceiptQuantity(
      resolvedDescription,
      draft.amount ?? null,
      draft.notes,
      draft.parsedText
    );
    const purchaseLine = quantity
      ? `Pembelian ${quantity} ${itemLabel}`
      : `Pembelian ${itemLabel}`;
    const baseLine = `${draft.receiptLabel} • ${resolvedCategoryName} • ${purchaseLine}`;
    const extraNotes = extractReceiptExtraNotes(draft.notes, draft.parsedText);
    const detectedDateNote =
      draft.detectedDate && draft.detectedDate !== formatDateInputValue(draft.date)
        ? `Tanggal struk: ${draft.detectedDate}`
        : null;
    const noteLines = [detectedDateNote, extraNotes].filter(Boolean).join('\n');

    return noteLines ? `${baseLine}\n${noteLines}` : baseLine;
  };

  const preparePayload = (draft: LocalReceiptDraft) => {
    const resolvedCategoryId = draft.categoryId ?? resolveDraftCategoryId(categories ?? [], draft);
    const resolvedDescription = draft.description?.trim() || draft.merchantName?.trim() || '';
    const resolvedAmount = draft.amount ?? 0;

    if (!(resolvedAmount > 0)) {
      return { error: 'Nominal draft masih kosong atau belum valid.' };
    }

    if (!resolvedDescription) {
      return { error: 'Deskripsi draft masih kosong.' };
    }

    if (!resolvedCategoryId) {
      return { error: 'Kategori draft belum berhasil dipetakan.' };
    }

    return {
      data: {
        amount: resolvedAmount,
        description: resolvedDescription,
        categoryId: resolvedCategoryId,
        type: draft.type,
        date: formatDateInputValue(draft.date),
        notes: buildReceiptNotes(draft),
      },
    };
  };

  const handleDraftSelect = (index: number) => {
    const snapshot = syncDraftsFromEditor();
    applyDraft(index, snapshot);
  };

  const handleSaveActive = async () => {
    const snapshot = syncDraftsFromEditor();
    const currentDraft = snapshot[activeDraftIndex];
    if (!currentDraft) {
      return;
    }

    const preparedPayload = preparePayload(currentDraft);
    if ('error' in preparedPayload) {
      toast({
        title: 'Draft perlu diperbaiki',
        description: preparedPayload.error,
        variant: 'destructive',
      });
      return;
    }

    try {
      await createMutation.mutateAsync(preparedPayload.data);

      if (snapshot.length > 1) {
        const remainingDrafts = snapshot.filter((_, index) => index !== activeDraftIndex);
        setDrafts(remainingDrafts);
        const nextIndex = Math.min(activeDraftIndex, remainingDrafts.length - 1);
        applyDraft(nextIndex, remainingDrafts);
        toast({
          title: 'Draft tersimpan',
          description: `${remainingDrafts.length} draft masih menunggu review.`,
        });
        return;
      }

      toast({
        title: 'Transaksi ditambahkan',
        description: 'Hasil scan struk berhasil disimpan.',
      });
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Gagal menyimpan transaksi',
        description:
          error instanceof Error ? error.message : 'Coba lagi setelah memeriksa draft hasil scan.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveAllDrafts = async () => {
    const snapshot = syncDraftsFromEditor();
    if (snapshot.length === 0) {
      return;
    }

    const preparedDrafts = snapshot.map((draft, index) => ({
      index,
      prepared: preparePayload(draft),
    }));

    const invalidDraft = preparedDrafts.find(
      (
        item
      ): item is {
        index: number;
        prepared: { error: string };
      } => 'error' in item.prepared
    );

    if (invalidDraft) {
      applyDraft(invalidDraft.index, snapshot);
      toast({
        title: `Draft ${invalidDraft.index + 1} perlu diperbaiki`,
        description: invalidDraft.prepared.error,
        variant: 'destructive',
      });
      return;
    }

    setIsSavingAll(true);
    let successCount = 0;

    try {
      for (const item of preparedDrafts) {
        if ('error' in item.prepared) {
          continue;
        }

        await createMutation.mutateAsync(item.prepared.data);
        successCount += 1;
      }

      toast({
        title: 'Semua hasil scan tersimpan',
        description: `${successCount} transaksi berhasil ditambahkan sekaligus.`,
      });
      setOpen(false);
    } catch (error) {
      const remainingDrafts = snapshot.slice(successCount);
      setDrafts(remainingDrafts);
      applyDraft(0, remainingDrafts);
      toast({
        title: successCount > 0 ? 'Sebagian hasil sudah tersimpan' : 'Gagal menyimpan hasil scan',
        description:
          successCount > 0
            ? `${successCount} transaksi sudah masuk. Review draft sisanya lalu coba lagi.`
            : error instanceof Error
              ? error.message
              : 'Terjadi kegagalan saat menyimpan hasil scan.',
        variant: successCount > 0 ? 'default' : 'destructive',
      });
    } finally {
      setIsSavingAll(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-11 w-full border-0 bg-gradient-to-r from-amber-500 to-orange-500 px-4 text-sm text-white shadow-lg shadow-amber-500/25 transition-all duration-300 hover:scale-105 hover:from-amber-600 hover:to-orange-600 sm:w-auto"
        >
          <FileScan className="mr-2 h-4 w-4" />
          Scan Struk
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[760px]">
        <DialogHeader className="shrink-0 border-b border-border bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-5">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ReceiptText className="h-4 w-4 text-amber-500" />
            Scan Struk
          </DialogTitle>
          <DialogDescription>
            Tambahkan sampai {MAX_RECEIPT_FILES} struk, lalu review hasil per item sebelum disimpan.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5">
          {drafts.length === 0 ? (
            <div className="space-y-4">
              <div className="rounded-3xl border border-dashed border-border bg-muted/30 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Unggah struk</p>
                    <p className="text-xs text-muted-foreground">
                      Maksimal {MAX_RECEIPT_FILES} file gambar atau PDF.
                    </p>
                  </div>
                </div>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  className="h-11"
                  onChange={(event) => {
                    void handleFilesChange(event.target.files);
                    event.currentTarget.value = '';
                  }}
                />
                {prepareLoading ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-background px-3 py-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Menyiapkan file struk...</span>
                  </div>
                ) : null}
              </div>

              {preparedFiles.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{preparedFiles.length} struk dipilih</Badge>
                    <Badge variant="outline">Maks {MAX_RECEIPT_FILES} struk</Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {preparedFiles.map((preparedFile) => (
                      <div
                        key={preparedFile.id}
                        className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card/80 p-4"
                      >
                        <div className="min-w-0 space-y-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {preparedFile.originalName}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline">{formatFileSize(preparedFile.uploadSize)}</Badge>
                            <span>
                              {preparedFile.mode === 'image-optimized'
                                ? 'Gambar teroptimasi'
                                : preparedFile.mode === 'image-original'
                                  ? 'Gambar asli'
                                  : 'PDF'}
                            </span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                          onClick={() => removePreparedFile(preparedFile.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3 rounded-3xl border border-border bg-card/75 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{drafts.length} draft OCR</Badge>
                  <Badge variant="outline">{preparedFiles.length} struk</Badge>
                  <Badge variant="outline">
                    Draft aktif {activeDraftIndex + 1}/{drafts.length}
                  </Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {drafts.map((draft, index) => {
                    const isActive = index === activeDraftIndex;
                    const draftTypeLabel =
                      draft.type === 'income'
                        ? 'Pemasukan'
                        : draft.type === 'savings'
                          ? 'Tabungan'
                          : 'Pengeluaran';

                    return (
                      <button
                        key={`${draft.receiptId}-${index}`}
                        type="button"
                        onClick={() => handleDraftSelect(index)}
                        className={
                          isActive
                            ? 'rounded-2xl border border-primary bg-primary/6 p-3 text-left shadow-sm transition-all'
                            : 'rounded-2xl border border-border bg-card/60 p-3 text-left transition-all hover:border-primary/30'
                        }
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <Badge variant={isActive ? 'default' : 'outline'}>{draftTypeLabel}</Badge>
                        </div>
                        <p className="line-clamp-1 text-sm font-semibold text-foreground">
                          {draft.description ?? draft.merchantName ?? `Draft ${index + 1}`}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {draft.amount ? `Rp ${draft.amount.toLocaleString('id-ID')}` : 'Nominal perlu dicek'}
                        </p>
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                          {draft.receiptLabel}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Tipe Transaksi</Label>
                  <ToggleGroup
                    type="single"
                    value={type}
                    onValueChange={(value) => {
                      if (value === 'expense' || value === 'income' || value === 'savings') {
                        handleTypeChange(value);
                      }
                    }}
                    className="w-full justify-start gap-1.5"
                  >
                    <ToggleGroupItem
                      value="expense"
                      className={cn(
                        'flex-1 rounded-lg border-2 px-3 text-xs data-[state=on]:bg-rose-500 data-[state=on]:text-white',
                        'data-[state=off]:border-rose-200 data-[state=off]:hover:border-rose-300'
                      )}
                    >
                      <TrendingDown className="mr-1 h-3.5 w-3.5" />
                      Pengeluaran
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="income"
                      className={cn(
                        'flex-1 rounded-lg border-2 px-3 text-xs data-[state=on]:bg-emerald-500 data-[state=on]:text-white',
                        'data-[state=off]:border-emerald-200 data-[state=off]:hover:border-emerald-300'
                      )}
                    >
                      <TrendingUp className="mr-1 h-3.5 w-3.5" />
                      Pemasukan
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="savings"
                      className={cn(
                        'flex-1 rounded-lg border-2 px-3 text-xs data-[state=on]:bg-amber-500 data-[state=on]:text-white',
                        'data-[state=off]:border-amber-200 data-[state=off]:hover:border-amber-300'
                      )}
                    >
                      <PiggyBank className="mr-1 h-3.5 w-3.5" />
                      Tabungan
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Jumlah (Rp)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                      Rp
                    </span>
                    <Input
                      inputMode="numeric"
                      value={amount ? Number(amount).toLocaleString('id-ID') : ''}
                      onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ''))}
                      placeholder="0"
                      className="h-11 pl-10 text-base font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Deskripsi</Label>
                  <Input
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Deskripsi transaksi"
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Tanggal</Label>
                  <DateInput
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Kategori</Label>
                  {filteredCategories.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {filteredCategories.map((category: Category) => {
                        const IconComponent = getCategoryIconComponent(category.icon);
                        const isSelected = categoryId === category.id;

                        return (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => setCategoryId(category.id)}
                            className={cn(
                              'flex flex-col items-center gap-1 rounded-2xl border-2 p-2.5 transition-all',
                              isSelected
                                ? 'border-primary bg-primary/5 shadow-sm'
                                : 'border-border bg-card/60 hover:border-primary/30'
                            )}
                          >
                            <div
                              className="rounded-xl p-2"
                              style={{ backgroundColor: `${category.color}20` }}
                            >
                              <IconComponent className="h-4 w-4" style={{ color: category.color }} />
                            </div>
                            <span className="w-full truncate text-center text-[11px] font-medium">
                              {category.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                      Belum ada kategori untuk tipe transaksi ini.
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Catatan</Label>
                  <Textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Tambahkan catatan bila perlu"
                    className="min-h-[88px] resize-none sm:min-h-[44px]"
                  />
                </div>
              </div>

            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-background p-4 sm:flex-row">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={isBusy}>
            <X className="mr-2 h-4 w-4 text-rose-500" />
            Batal
          </Button>

          {drafts.length === 0 ? (
            <Button
              type="button"
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
              onClick={handleScan}
              disabled={scanLoading || prepareLoading || preparedFiles.length === 0}
            >
              {scanLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileScan className="mr-2 h-4 w-4" />
              )}
              Proses Scan
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant={drafts.length > 1 ? 'outline' : 'default'}
                className={
                  drafts.length > 1
                    ? 'flex-1'
                    : 'flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600'
                }
                onClick={handleSaveActive}
                disabled={createMutation.isPending || isSavingAll}
              >
                {createMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {drafts.length > 1 ? 'Tambah Draft Aktif' : 'Tambah Transaksi'}
              </Button>

              {drafts.length > 1 ? (
                <Button
                  type="button"
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-600"
                  onClick={handleSaveAllDrafts}
                  disabled={createMutation.isPending || isSavingAll}
                >
                  {isSavingAll ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Tambah Semua Hasil
                </Button>
              ) : null}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
