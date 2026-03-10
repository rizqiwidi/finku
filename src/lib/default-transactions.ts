import type { TransactionType } from '../types';

export interface DefaultTransactionTemplate {
  description: string;
  amount: number;
  type: TransactionType;
  categoryName: string;
  daysAgo: number;
}

export const DEFAULT_TEMPLATE_MONTHLY_INCOME = 15_000_000;
export const DEFAULT_TEMPLATE_SAVINGS_PERCENTAGE = 20;

export const DEFAULT_TRANSACTION_TEMPLATES: DefaultTransactionTemplate[] = [
  { description: 'Gaji Bulanan', amount: 15_000_000, type: 'income', categoryName: 'Gaji', daysAgo: 25 },
  { description: 'Project Website', amount: 5_000_000, type: 'income', categoryName: 'Freelance', daysAgo: 15 },
  { description: 'Dividen Saham', amount: 500_000, type: 'income', categoryName: 'Investasi', daysAgo: 10 },
  { description: 'Bonus', amount: 2_000_000, type: 'income', categoryName: 'Lainnya', daysAgo: 5 },
  { description: 'Makan Siang', amount: 45_000, type: 'expense', categoryName: 'Makanan', daysAgo: 0 },
  { description: 'Groceries', amount: 350_000, type: 'expense', categoryName: 'Makanan', daysAgo: 2 },
  { description: 'Gojek ke Kantor', amount: 25_000, type: 'expense', categoryName: 'Transportasi', daysAgo: 1 },
  { description: 'Bensin', amount: 150_000, type: 'expense', categoryName: 'Transportasi', daysAgo: 5 },
  { description: 'Baju Baru', amount: 450_000, type: 'expense', categoryName: 'Belanja', daysAgo: 7 },
  { description: 'Netflix', amount: 54_000, type: 'expense', categoryName: 'Hiburan', daysAgo: 20 },
  { description: 'Spotify', amount: 54_990, type: 'expense', categoryName: 'Hiburan', daysAgo: 20 },
  { description: 'Listrik', amount: 350_000, type: 'expense', categoryName: 'Tagihan', daysAgo: 15 },
  { description: 'Internet', amount: 450_000, type: 'expense', categoryName: 'Tagihan', daysAgo: 12 },
  { description: 'Vitamin', amount: 150_000, type: 'expense', categoryName: 'Kesehatan', daysAgo: 8 },
  { description: 'Kursus Online', amount: 500_000, type: 'expense', categoryName: 'Pendidikan', daysAgo: 18 },
  { description: 'Tabungan Dana Darurat', amount: 1_500_000, type: 'savings', categoryName: 'Dana Darurat', daysAgo: 25 },
  { description: 'Investasi Bulanan', amount: 1_500_000, type: 'savings', categoryName: 'Investasi', daysAgo: 25 },
];
