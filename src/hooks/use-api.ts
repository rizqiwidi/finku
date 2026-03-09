import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Transaction, Category, Budget } from '@/types';

// API helper functions
async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  return response.json();
}

// Types for API responses
interface SummaryResponse {
  balance: number;
  income: number;
  expenses: number;
  savingsRate: number;
  month: number;
  year: number;
}

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
}

interface CategorySpending {
  category: string;
  amount: number;
  color: string;
  percentage: number;
}

interface BudgetProgress extends Budget {
  id: string;
  categoryId: string;
  category: Category;
  amount: number;
  spent: number;
  period: string;
}

// Categories hooks
export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => fetchApi<Category[]>('/api/categories'),
  });
}

// Transactions hooks
export function useTransactions(month?: number, year?: number) {
  const params = new URLSearchParams();
  if (month) params.append('month', month.toString());
  if (year) params.append('year', year.toString());

  const query = params.toString();
  const url = query ? `/api/transactions?${query}` : '/api/transactions';

  return useQuery<Transaction[]>({
    queryKey: ['transactions', month, year],
    queryFn: () => fetchApi<Transaction[]>(url),
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      amount: number;
      description: string;
      categoryId: string;
      type: string;
      date: Date | string;
      notes?: string;
    }) =>
      fetchApi<Transaction>('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['charts'] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      id: string;
      amount: number;
      description: string;
      categoryId: string;
      date: Date | string;
      notes?: string;
    }) => {
      const { id, ...body } = data;
      return fetchApi<Transaction>(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['charts'] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/api/transactions/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['charts'] });
    },
  });
}

// Summary hooks
export function useSummary(month?: number, year?: number) {
  const params = new URLSearchParams();
  if (month) params.append('month', month.toString());
  if (year) params.append('year', year.toString());

  const query = params.toString();
  const url = query ? `/api/summary?${query}` : '/api/summary';

  return useQuery<SummaryResponse>({
    queryKey: ['summary', month, year],
    queryFn: () => fetchApi<SummaryResponse>(url),
  });
}

// Budget hooks
export function useBudgets(month?: number, year?: number) {
  const params = new URLSearchParams();
  if (month) params.append('month', month.toString());
  if (year) params.append('year', year.toString());

  const query = params.toString();
  const url = query ? `/api/budgets?${query}` : '/api/budgets';

  return useQuery<BudgetProgress[]>({
    queryKey: ['budgets', month, year],
    queryFn: () => fetchApi<BudgetProgress[]>(url),
  });
}

// Chart data hooks
export function useMonthlyChartData() {
  return useQuery<MonthlyData[]>({
    queryKey: ['charts', 'monthly'],
    queryFn: () => fetchApi<MonthlyData[]>('/api/charts?type=monthly'),
  });
}

export function useCategorySpending(month?: number, year?: number) {
  const params = new URLSearchParams();
  params.append('type', 'category');
  if (month) params.append('month', month.toString());
  if (year) params.append('year', year.toString());

  return useQuery<CategorySpending[]>({
    queryKey: ['charts', 'category', month, year],
    queryFn: () => fetchApi<CategorySpending[]>(`/api/charts?${params.toString()}`),
  });
}
