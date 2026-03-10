import type { TransactionType } from '../types';

interface SummaryTransactionLike {
  amount: number;
  type: TransactionType | string;
}

export interface CalculatedFinancialSummary {
  income: number;
  expenses: number;
  savings: number;
  balance: number;
  savingsRate: number;
}

export function calculateFinancialSummary(
  transactions: SummaryTransactionLike[]
): CalculatedFinancialSummary {
  const income = transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const expenses = transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const savings = transactions
    .filter((transaction) => transaction.type === 'savings')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return {
    income,
    expenses,
    savings,
    balance: income - expenses - savings,
    savingsRate: income > 0 ? (savings / income) * 100 : 0,
  };
}
