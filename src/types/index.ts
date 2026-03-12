// Types for Personal Finance Management App

export type TransactionType = 'income' | 'expense' | 'savings';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  budget?: number | null;
  allocationPercentage?: number | null;
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  categoryId: string;
  category: Category;
  type: TransactionType;
  date: Date;
  notes?: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  category: Category;
  amount: number;
  spent: number;
  period: 'monthly' | 'yearly';
}

export interface FinancialSummary {
  balance: number;
  income: number;
  expenses: number;
  savings: number;
  totalSavings?: number;
  savingsRate: number;
}

export interface SummaryResponse extends FinancialSummary {
  month: number;
  year: number;
}

export interface BudgetProgress {
  id: string;
  categoryId: string;
  category: Category;
  amount: number;
  spent: number;
  period: 'monthly' | 'yearly';
  month: number;
  year: number;
}

export interface TrendDataPoint {
  label: string;
  income: number;
  expenses: number;
}

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
}

export interface CategorySpending {
  category: string;
  amount: number;
  color: string;
  percentage: number;
}

export interface DashboardChartPreview {
  monthly: TrendDataPoint[];
  categoryExpense: CategorySpending[];
}

export interface DashboardResponse {
  summary: SummaryResponse;
  budgets: BudgetProgress[];
  transactions: Transaction[];
  transactionCount: number;
  transactionPreviewLimit: number;
  chartPreview: DashboardChartPreview;
  month: number;
  year: number;
}

export interface TransactionHistoryResponse {
  items: Transaction[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface UserSettings {
  id: string;
  monthlyIncome: number;
  savingsPercentage: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
