import { z } from 'zod';
import type { TransactionType } from '@/types';

export interface CategoryOption {
  id: string;
  name: string;
  type: TransactionType;
}

export const suggestedTransactionDraftSchema = z.object({
  type: z.enum(['income', 'expense', 'savings']).default('expense'),
  amount: z.number().positive().nullable().optional(),
  description: z.string().trim().max(120).nullable().optional(),
  categoryName: z.string().trim().max(60).nullable().optional(),
  date: z.string().trim().nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  merchantName: z.string().trim().max(120).nullable().optional(),
  confidence: z.number().min(0).max(100).nullable().optional(),
  reasoning: z.string().trim().max(500).nullable().optional(),
});

export type SuggestedTransactionDraft = z.infer<typeof suggestedTransactionDraftSchema>;

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeCategoryName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function parseReceiptAmount(value: string) {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) {
    return null;
  }

  const amount = Number(digits);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return amount;
}

export function parseFlexibleDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const isoDate = new Date(trimmed);
  if (!Number.isNaN(isoDate.getTime())) {
    return isoDate.toISOString();
  }

  const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  const normalizedYear = year.length === 2 ? `20${year}` : year;
  const parsedDate = new Date(Number(normalizedYear), Number(month) - 1, Number(day));
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
}

function getLargestReceiptAmount(lines: string[]) {
  const totalLinePatterns = [
    /grand\s*total/i,
    /\btotal\b/i,
    /\bjumlah\b/i,
    /\btagihan\b/i,
    /\bsubtotal\b/i,
    /\bdebit\b/i,
    /\bcredit\b/i,
    /\btunai\b/i,
    /\bpayment\b/i,
    /\bamount\b/i,
  ];
  const amountPattern = /(?:rp\s*)?(\d{1,3}(?:[.,]\d{3})+|\d{4,})/gi;

  let bestAmount: number | null = null;

  for (const line of lines) {
    const matches = Array.from(line.matchAll(amountPattern));
    if (matches.length === 0) {
      continue;
    }

    const prioritized = totalLinePatterns.some((pattern) => pattern.test(line));
    for (const match of matches) {
      const parsed = parseReceiptAmount(match[0]);
      if (!parsed) {
        continue;
      }

      if (prioritized) {
        if (!bestAmount || parsed > bestAmount) {
          bestAmount = parsed;
        }
        continue;
      }

      if (!bestAmount || parsed > bestAmount) {
        bestAmount = parsed;
      }
    }
  }

  return bestAmount;
}

function getReceiptMerchant(lines: string[]) {
  for (const line of lines) {
    const cleaned = compactWhitespace(line);
    if (!cleaned || cleaned.length < 3) {
      continue;
    }

    if (/\d/.test(cleaned) && cleaned.length < 8) {
      continue;
    }

    if (/total|subtotal|cash|change|qty|jumlah|harga|item|date|time|invoice/i.test(cleaned)) {
      continue;
    }

    return cleaned.slice(0, 120);
  }

  return null;
}

function getReceiptDate(text: string) {
  const match = text.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})/);
  return match ? parseFlexibleDate(match[1]) : null;
}

function guessTypeFromText(text: string): TransactionType {
  const normalized = normalizeCategoryName(text);

  if (
    normalized.includes('gaji') ||
    normalized.includes('salary') ||
    normalized.includes('bonus') ||
    normalized.includes('komisi') ||
    normalized.includes('dividen') ||
    normalized.includes('income')
  ) {
    return 'income';
  }

  if (
    normalized.includes('tabung') ||
    normalized.includes('saving') ||
    normalized.includes('deposito') ||
    normalized.includes('investasi')
  ) {
    return 'savings';
  }

  return 'expense';
}

function keywordCategoryMap(type: TransactionType) {
  if (type === 'income') {
    return [
      { keywords: ['gaji', 'salary'], category: 'Gaji' },
      { keywords: ['freelance', 'project'], category: 'Freelance' },
      { keywords: ['dividen', 'investasi'], category: 'Investasi' },
    ];
  }

  if (type === 'savings') {
    return [
      { keywords: ['investasi'], category: 'Investasi' },
      { keywords: ['dana darurat', 'emergency'], category: 'Dana Darurat' },
    ];
  }

  return [
    { keywords: ['makan', 'resto', 'warung', 'kopi', 'cafe', 'coffee', 'martabak', 'bakso', 'nasi'], category: 'Makanan' },
    { keywords: ['gojek', 'grab', 'bensin', 'tol', 'parkir', 'transport', 'kereta'], category: 'Transportasi' },
    { keywords: ['belanja', 'alfamart', 'indomaret', 'supermarket', 'shopee', 'tokopedia'], category: 'Belanja' },
    { keywords: ['listrik', 'pln', 'internet', 'wifi', 'tagihan', 'bpjs', 'air'], category: 'Tagihan' },
    { keywords: ['dokter', 'apotek', 'obat', 'vitamin', 'rs'], category: 'Kesehatan' },
    { keywords: ['kursus', 'kelas', 'sekolah', 'buku'], category: 'Pendidikan' },
    { keywords: ['film', 'bioskop', 'game', 'spotify', 'netflix'], category: 'Hiburan' },
  ];
}

export function findMatchingCategoryId(
  categories: CategoryOption[],
  type: TransactionType,
  categoryName?: string | null,
  description?: string | null
) {
  const categoriesOfType = categories.filter((category) => category.type === type);
  if (categoriesOfType.length === 0) {
    return null;
  }

  const normalizedCategoryName = normalizeCategoryName(categoryName ?? '');
  if (normalizedCategoryName) {
    const exactMatch = categoriesOfType.find(
      (category) => normalizeCategoryName(category.name) === normalizedCategoryName
    );

    if (exactMatch) {
      return exactMatch.id;
    }

    const partialMatch = categoriesOfType.find((category) =>
      normalizedCategoryName.includes(normalizeCategoryName(category.name)) ||
      normalizeCategoryName(category.name).includes(normalizedCategoryName)
    );

    if (partialMatch) {
      return partialMatch.id;
    }
  }

  const haystack = normalizeCategoryName(description ?? '');
  if (haystack) {
    for (const item of keywordCategoryMap(type)) {
      if (item.keywords.some((keyword) => haystack.includes(keyword))) {
        const mapped = categoriesOfType.find(
          (category) => normalizeCategoryName(category.name) === normalizeCategoryName(item.category)
        );

        if (mapped) {
          return mapped.id;
        }
      }
    }

    const byDescription = categoriesOfType.find((category) =>
      haystack.includes(normalizeCategoryName(category.name))
    );

    if (byDescription) {
      return byDescription.id;
    }
  }

  return categoriesOfType[0]?.id ?? null;
}

export function buildHeuristicDraftFromText(
  text: string,
  categories: CategoryOption[]
): SuggestedTransactionDraft {
  const normalizedText = compactWhitespace(text);
  const lines = normalizedText
    .split(/\r?\n/)
    .map((line) => compactWhitespace(line))
    .filter(Boolean);
  const type = guessTypeFromText(normalizedText);
  const merchantName = getReceiptMerchant(lines);
  const amount = getLargestReceiptAmount(lines);
  const date = getReceiptDate(normalizedText);
  const categoryName =
    categories.find((category) => category.id === findMatchingCategoryId(categories, type, null, normalizedText))
      ?.name ?? null;

  return suggestedTransactionDraftSchema.parse({
    type,
    amount,
    categoryName,
    description: merchantName ?? lines[0] ?? 'Transaksi dari struk',
    date,
    notes: normalizedText.slice(0, 500),
    merchantName,
    confidence: amount ? 62 : 38,
    reasoning: amount
      ? 'Draft disusun dari pola nominal terbesar dan keyword pada teks struk.'
      : 'Draft disusun dari keyword teks. Periksa kembali nominal sebelum disimpan.',
  });
}
