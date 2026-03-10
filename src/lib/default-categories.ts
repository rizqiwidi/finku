import type { TransactionType } from '../types';

export interface DefaultCategoryTemplate {
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  budget?: number;
  allocationPercentage?: number;
}

export const DEFAULT_CATEGORY_TEMPLATES: DefaultCategoryTemplate[] = [
  { name: 'Gaji', icon: 'Wallet', color: '#10b981', type: 'income' },
  { name: 'Freelance', icon: 'Laptop', color: '#06b6d4', type: 'income' },
  { name: 'Investasi', icon: 'TrendingUp', color: '#8b5cf6', type: 'income' },
  { name: 'Lainnya', icon: 'Plus', color: '#6b7280', type: 'income' },
  { name: 'Makanan', icon: 'Utensils', color: '#f97316', type: 'expense', budget: 3000000, allocationPercentage: 15 },
  { name: 'Transportasi', icon: 'Car', color: '#3b82f6', type: 'expense', budget: 1500000, allocationPercentage: 10 },
  { name: 'Belanja', icon: 'ShoppingBag', color: '#ec4899', type: 'expense', budget: 2000000, allocationPercentage: 12 },
  { name: 'Hiburan', icon: 'Gamepad2', color: '#14b8a6', type: 'expense', budget: 1000000, allocationPercentage: 8 },
  { name: 'Tagihan', icon: 'Receipt', color: '#ef4444', type: 'expense', budget: 2500000, allocationPercentage: 15 },
  { name: 'Kesehatan', icon: 'Heart', color: '#f43f5e', type: 'expense', budget: 500000, allocationPercentage: 5 },
  { name: 'Pendidikan', icon: 'GraduationCap', color: '#6366f1', type: 'expense', budget: 1000000, allocationPercentage: 10 },
  { name: 'Lainnya', icon: 'MoreHorizontal', color: '#9ca3af', type: 'expense', budget: 500000, allocationPercentage: 5 },
  { name: 'Dana Darurat', icon: 'Shield', color: '#0ea5e9', type: 'savings', allocationPercentage: 10 },
  { name: 'Investasi', icon: 'TrendingUp', color: '#22c55e', type: 'savings', allocationPercentage: 10 },
];
