import { parseTransactionDateValue } from './date-input';
import type { TransactionType } from '../types';

export const MAX_BULK_IMPORT_ROWS = 1000;
export const MAX_IMPORT_AMOUNT = 1_000_000_000_000;
export const MAX_IMPORT_DESCRIPTION_LENGTH = 120;
export const MAX_IMPORT_CATEGORY_LENGTH = 60;

const DANGEROUS_FORMULA_PREFIX = /^[=+\-@]/;
const VALID_IMPORT_TYPES = new Set<TransactionType>([
  'income',
  'expense',
  'savings',
]);

export const DEFAULT_IMPORT_CATEGORY_META: Record<
  TransactionType,
  { icon: string; color: string }
> = {
  income: {
    icon: 'TrendingUp',
    color: '#10b981',
  },
  expense: {
    icon: 'TrendingDown',
    color: '#ef4444',
  },
  savings: {
    icon: 'PiggyBank',
    color: '#f59e0b',
  },
};

export class FinanceBulkValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FinanceBulkValidationError';
  }
}

export interface NormalizedBulkImportTransaction {
  amount: number;
  category: string;
  date: Date;
  description: string;
  notes: string | null;
  type: TransactionType;
}

export interface NormalizedBulkAllocation {
  amount: number;
  allocationPercentage: number;
  categoryId: string;
}

export interface NormalizedBulkAllocationSavePayload {
  allocations: NormalizedBulkAllocation[];
  month: number;
  monthlyIncome: number;
  year: number;
}

function normalizeSafeText(
  value: unknown,
  fieldLabel: string,
  maxLength: number
) {
  if (typeof value !== 'string') {
    throw new FinanceBulkValidationError(`${fieldLabel} harus berupa teks.`);
  }

  const normalized = value.trim().replace(/\s+/g, ' ');

  if (!normalized) {
    throw new FinanceBulkValidationError(`${fieldLabel} wajib diisi.`);
  }

  if (normalized.length > maxLength) {
    throw new FinanceBulkValidationError(
      `${fieldLabel} melebihi batas ${maxLength} karakter.`
    );
  }

  if (DANGEROUS_FORMULA_PREFIX.test(normalized)) {
    throw new FinanceBulkValidationError(
      `${fieldLabel} mengandung awalan formula yang tidak diizinkan.`
    );
  }

  return normalized;
}

function normalizePositiveAmount(value: unknown, fieldLabel: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new FinanceBulkValidationError(`${fieldLabel} harus berupa angka.`);
  }

  const normalized = Math.abs(value);

  if (normalized <= 0) {
    throw new FinanceBulkValidationError(`${fieldLabel} harus lebih besar dari 0.`);
  }

  if (normalized > MAX_IMPORT_AMOUNT) {
    throw new FinanceBulkValidationError(`${fieldLabel} melebihi batas maksimum.`);
  }

  return normalized;
}

function normalizeTransactionType(value: unknown): TransactionType {
  if (value === undefined) {
    return 'expense';
  }

  if (typeof value !== 'string') {
    throw new FinanceBulkValidationError('Tipe transaksi tidak valid.');
  }

  const normalized = value.trim().toLowerCase() as TransactionType;
  if (!VALID_IMPORT_TYPES.has(normalized)) {
    throw new FinanceBulkValidationError('Tipe transaksi tidak valid.');
  }

  return normalized;
}

function normalizeBasisPoints(value: unknown) {
  const numericValue =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;

  if (!Number.isFinite(numericValue)) {
    throw new FinanceBulkValidationError('Alokasi kategori harus berupa angka.');
  }

  if (numericValue < 0 || numericValue > 100) {
    throw new FinanceBulkValidationError(
      'Alokasi kategori harus berada di antara 0 dan 100.'
    );
  }

  return Math.round(numericValue * 100);
}

function normalizeMonth(value: unknown) {
  const month = typeof value === 'number' ? value : Number(value);

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new FinanceBulkValidationError('Bulan alokasi tidak valid.');
  }

  return month;
}

function normalizeYear(value: unknown) {
  const year = typeof value === 'number' ? value : Number(value);

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new FinanceBulkValidationError('Tahun alokasi tidak valid.');
  }

  return year;
}

function normalizeMonthlyIncome(value: unknown) {
  const monthlyIncome =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;

  if (!Number.isFinite(monthlyIncome) || monthlyIncome < 0) {
    throw new FinanceBulkValidationError('Pemasukan bulanan tidak valid.');
  }

  if (monthlyIncome > MAX_IMPORT_AMOUNT) {
    throw new FinanceBulkValidationError(
      'Pemasukan bulanan melebihi batas maksimum.'
    );
  }

  return monthlyIncome;
}

export function normalizeCategoryKey(type: string, name: string) {
  return `${type}:${name.trim().replace(/\s+/g, ' ').toLowerCase()}`;
}

export function normalizeBulkImportTransactions(
  value: unknown
): NormalizedBulkImportTransaction[] {
  if (!Array.isArray(value)) {
    throw new FinanceBulkValidationError('Transaksi import harus berupa array.');
  }

  if (value.length > MAX_BULK_IMPORT_ROWS) {
    throw new FinanceBulkValidationError(
      `Maksimal ${MAX_BULK_IMPORT_ROWS} baris transaksi per import.`
    );
  }

  return value.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new FinanceBulkValidationError(
        `Transaksi import baris ${index + 1} tidak valid.`
      );
    }

    const record = item as Record<string, unknown>;
    const type = normalizeTransactionType(record.type);
    const date = parseTransactionDateValue(record.date);

    if (!date) {
      throw new FinanceBulkValidationError(
        `Transaksi import baris ${index + 1}: tanggal tidak valid.`
      );
    }

    return {
      amount: normalizePositiveAmount(
        record.amount,
        `Transaksi import baris ${index + 1}: jumlah`
      ),
      category: normalizeSafeText(
        record.category,
        `Transaksi import baris ${index + 1}: kategori`,
        MAX_IMPORT_CATEGORY_LENGTH
      ),
      date,
      description: normalizeSafeText(
        record.description,
        `Transaksi import baris ${index + 1}: deskripsi`,
        MAX_IMPORT_DESCRIPTION_LENGTH
      ),
      notes:
        typeof record.notes === 'string' && record.notes.trim().length > 0
          ? record.notes.trim()
          : null,
      type,
    };
  });
}

export function normalizeBulkAllocationSavePayload(
  value: unknown
): NormalizedBulkAllocationSavePayload {
  if (!value || typeof value !== 'object') {
    throw new FinanceBulkValidationError('Payload alokasi tidak valid.');
  }

  const record = value as Record<string, unknown>;
  const allocations = Array.isArray(record.allocations) ? record.allocations : null;

  if (!allocations) {
    throw new FinanceBulkValidationError('Payload alokasi tidak valid.');
  }

  const month = normalizeMonth(record.month);
  const year = normalizeYear(record.year);
  const monthlyIncome = normalizeMonthlyIncome(record.monthlyIncome);
  const seenCategoryIds = new Set<string>();
  let totalBasisPoints = 0;

  const normalizedAllocations = allocations.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new FinanceBulkValidationError(
        `Alokasi kategori baris ${index + 1} tidak valid.`
      );
    }

    const allocation = item as Record<string, unknown>;
    const categoryId =
      typeof allocation.categoryId === 'string' ? allocation.categoryId.trim() : '';

    if (!categoryId) {
      throw new FinanceBulkValidationError(
        `Alokasi kategori baris ${index + 1}: categoryId wajib diisi.`
      );
    }

    if (seenCategoryIds.has(categoryId)) {
      throw new FinanceBulkValidationError(
        'Terdapat categoryId duplikat pada payload alokasi.'
      );
    }

    seenCategoryIds.add(categoryId);

    const basisPoints = normalizeBasisPoints(allocation.allocationPercentage);
    totalBasisPoints += basisPoints;

    return {
      amount: Math.round((monthlyIncome * basisPoints) / 10_000),
      allocationPercentage: basisPoints / 100,
      categoryId,
    };
  });

  if (totalBasisPoints > 10_000) {
    throw new FinanceBulkValidationError(
      'Alokasi total tidak boleh melebihi 100%.'
    );
  }

  return {
    allocations: normalizedAllocations,
    month,
    monthlyIncome,
    year,
  };
}
