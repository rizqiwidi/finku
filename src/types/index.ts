// Types for Personal Finance Management App

export type TransactionType = 'income' | 'expense' | 'savings';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  budget?: number;
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
  savingsRate: number;
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
