import {
  useEffect,
  useSyncExternalStore,
} from 'react';
import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { formatDateInputValue } from '@/lib/date-input';
import type {
  Transaction,
  Category,
  DashboardResponse,
  SummaryResponse,
  BudgetProgress,
  TrendDataPoint,
  CategorySpending,
  UserSettings,
  TransactionType,
  TransactionHistoryResponse,
} from '@/types';

// API helper functions
async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  return response.json();
}

type UserScopedQueryOptions = {
  enabled?: boolean;
};

export type TransactionsQueryFilters = {
  categoryId?: string;
  dateFrom?: Date | string;
  dateTo?: Date | string;
  month?: number;
  type?: TransactionType;
  year?: number;
};

type TransactionHistoryQueryOptions = {
  page: number;
  pageSize?: number;
};

const QUERY_STALE_TIME = {
  dashboard: 45 * 1000,
  transactions: 30 * 1000,
  summary: 45 * 1000,
  budgets: 45 * 1000,
  charts: 45 * 1000,
  categories: 10 * 60 * 1000,
  settings: 10 * 60 * 1000,
} as const;

const QUERY_GC_TIME = {
  dashboard: 15 * 60 * 1000,
  reads: 12 * 60 * 1000,
  metadata: 30 * 60 * 1000,
} as const;

type FinanceMutationDomain = 'allocations' | 'categories' | 'transactions';

const FINANCE_DOMAIN_QUERY_KEYS: Record<FinanceMutationDomain, readonly string[][]> = {
  transactions: [
    ['dashboard'],
    ['transactions'],
    ['transactions-history'],
    ['summary'],
    ['budgets'],
    ['charts'],
  ],
  allocations: [
    ['dashboard'],
    ['budgets'],
    ['categories'],
    ['settings'],
  ],
  categories: [
    ['dashboard'],
    ['transactions'],
    ['budgets'],
    ['charts'],
    ['categories'],
  ],
} as const;

const FINANCE_READ_VERSION_STORAGE_KEY = 'finku-finance-read-version';
let financeReadVersion = 0;
let financeReadVersionHydrated = false;
const financeReadVersionListeners = new Set<() => void>();

function hydrateFinanceReadVersion() {
  if (financeReadVersionHydrated || typeof window === 'undefined') {
    return;
  }

  const storedValue = window.localStorage.getItem(FINANCE_READ_VERSION_STORAGE_KEY);
  const parsedValue = storedValue ? Number.parseInt(storedValue, 10) : 0;

  financeReadVersion = Number.isFinite(parsedValue) ? parsedValue : 0;
  financeReadVersionHydrated = true;
}

function notifyFinanceReadVersionListeners() {
  for (const listener of financeReadVersionListeners) {
    listener();
  }
}

function updateFinanceReadVersion(nextVersion: number) {
  financeReadVersion = nextVersion;
  financeReadVersionHydrated = true;

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(
      FINANCE_READ_VERSION_STORAGE_KEY,
      String(nextVersion)
    );
  }

  notifyFinanceReadVersionListeners();
}

function subscribeFinanceReadVersion(listener: () => void) {
  financeReadVersionListeners.add(listener);

  return () => {
    financeReadVersionListeners.delete(listener);
  };
}

function getFinanceReadVersionSnapshot() {
  hydrateFinanceReadVersion();
  return financeReadVersion;
}

function bumpFinanceReadVersion() {
  hydrateFinanceReadVersion();
  updateFinanceReadVersion(financeReadVersion + 1);
}

function appendReadVersionParam(params: URLSearchParams, readVersion: number) {
  params.set('_cv', String(readVersion));
}

function normalizeOptionalDateFilter(value?: Date | string) {
  if (!value) {
    return null;
  }

  return formatDateInputValue(value);
}

function buildTransactionsParams(
  filters: TransactionsQueryFilters,
  readVersion: number
) {
  const params = new URLSearchParams();

  if (filters.month) {
    params.append('month', filters.month.toString());
  }

  if (filters.year) {
    params.append('year', filters.year.toString());
  }

  if (filters.type) {
    params.append('type', filters.type);
  }

  if (filters.categoryId) {
    params.append('categoryId', filters.categoryId);
  }

  const normalizedDateFrom = normalizeOptionalDateFilter(filters.dateFrom);
  const normalizedDateTo = normalizeOptionalDateFilter(filters.dateTo);

  if (normalizedDateFrom) {
    params.append('dateFrom', normalizedDateFrom);
  }

  if (normalizedDateTo) {
    params.append('dateTo', normalizedDateTo);
  }

  appendReadVersionParam(params, readVersion);

  return {
    normalizedDateFrom,
    normalizedDateTo,
    params,
  };
}

function buildTransactionsQueryKey(
  userId: string | null,
  filters: TransactionsQueryFilters,
  readVersion: number
) {
  const { normalizedDateFrom, normalizedDateTo } = buildTransactionsParams(
    filters,
    readVersion
  );

  return [
    'transactions',
    userId,
    filters.month ?? null,
    filters.year ?? null,
    filters.type ?? null,
    filters.categoryId ?? null,
    normalizedDateFrom,
    normalizedDateTo,
    readVersion,
  ] as const;
}

function useFinanceReadVersion() {
  const readVersion = useSyncExternalStore(
    subscribeFinanceReadVersion,
    getFinanceReadVersionSnapshot,
    () => 0
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== FINANCE_READ_VERSION_STORAGE_KEY) {
        return;
      }

      const nextValue = event.newValue ? Number.parseInt(event.newValue, 10) : 0;
      if (!Number.isFinite(nextValue) || nextValue === financeReadVersion) {
        return;
      }

      financeReadVersionHydrated = true;
      financeReadVersion = nextValue;
      notifyFinanceReadVersionListeners();
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return readVersion;
}

function collectFinanceDomainQueryKeys(domains: FinanceMutationDomain[]) {
  const seen = new Set<string>();
  const queryKeys: string[][] = [];

  for (const domain of domains) {
    for (const queryKey of FINANCE_DOMAIN_QUERY_KEYS[domain]) {
      const serializedKey = queryKey.join(':');
      if (seen.has(serializedKey)) {
        continue;
      }

      seen.add(serializedKey);
      queryKeys.push([...queryKey]);
    }
  }

  return queryKeys;
}

async function invalidateFinanceDomains(
  queryClient: QueryClient,
  domains: FinanceMutationDomain[]
) {
  bumpFinanceReadVersion();
  const queryKeys = collectFinanceDomainQueryKeys(domains);

  await Promise.all(
    queryKeys.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey })
    )
  );
}

async function refreshFinanceDomains(
  queryClient: QueryClient,
  domains: FinanceMutationDomain[]
) {
  await invalidateFinanceDomains(queryClient, domains);

  await new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });

  const queryKeys = collectFinanceDomainQueryKeys(domains);

  await Promise.all(
    queryKeys.map((queryKey) =>
      queryClient.refetchQueries({ queryKey, type: 'active' })
    )
  );
}

export function invalidateFinanceQueries(queryClient: QueryClient) {
  return invalidateFinanceDomains(queryClient, [
    'transactions',
    'allocations',
    'categories',
  ]);
}

export async function refreshFinanceQueries(queryClient: QueryClient) {
  await refreshFinanceDomains(queryClient, [
    'transactions',
    'allocations',
    'categories',
  ]);
}

export function invalidateTransactionQueries(
  queryClient: QueryClient,
  options?: { includeCategories?: boolean }
) {
  return invalidateFinanceDomains(
    queryClient,
    options?.includeCategories ? ['transactions', 'categories'] : ['transactions']
  );
}

export function refreshTransactionQueries(
  queryClient: QueryClient,
  options?: { includeCategories?: boolean }
) {
  return refreshFinanceDomains(
    queryClient,
    options?.includeCategories ? ['transactions', 'categories'] : ['transactions']
  );
}

export function invalidateAllocationQueries(queryClient: QueryClient) {
  return invalidateFinanceDomains(queryClient, ['allocations']);
}

export function refreshAllocationQueries(queryClient: QueryClient) {
  return refreshFinanceDomains(queryClient, ['allocations']);
}

export function invalidateCategoryQueries(queryClient: QueryClient) {
  return invalidateFinanceDomains(queryClient, ['categories']);
}

export function refreshCategoryQueries(queryClient: QueryClient) {
  return refreshFinanceDomains(queryClient, ['categories']);
}

function useUserScopedQueryOptions(options?: UserScopedQueryOptions) {
  const { user, isLoading } = useAuth();
  const authEnabled = Boolean(user) && !isLoading;

  return {
    userId: user?.id ?? null,
    enabled: authEnabled && (options?.enabled ?? true),
  };
}

// Categories hooks
export function useCategories(options?: UserScopedQueryOptions) {
  const { userId, enabled } = useUserScopedQueryOptions(options);

  return useQuery<Category[]>({
    queryKey: ['categories', userId],
    queryFn: () => fetchApi<Category[]>('/api/categories'),
    enabled,
    staleTime: QUERY_STALE_TIME.categories,
    gcTime: QUERY_GC_TIME.metadata,
  });
}

export function useSettings(options?: UserScopedQueryOptions) {
  const { userId, enabled } = useUserScopedQueryOptions(options);

  return useQuery<UserSettings>({
    queryKey: ['settings', userId],
    queryFn: () => fetchApi<UserSettings>('/api/settings'),
    enabled,
    staleTime: QUERY_STALE_TIME.settings,
    gcTime: QUERY_GC_TIME.metadata,
  });
}

export function useDashboard(
  month?: number,
  year?: number,
  options?: UserScopedQueryOptions
) {
  const queryClient = useQueryClient();
  const { userId, enabled } = useUserScopedQueryOptions(options);
  const readVersion = useFinanceReadVersion();
  const params = new URLSearchParams();
  if (month) params.append('month', month.toString());
  if (year) params.append('year', year.toString());
  appendReadVersionParam(params, readVersion);

  const query = params.toString();
  const url = query ? `/api/dashboard?${query}` : '/api/dashboard';

  const dashboardQuery = useQuery<DashboardResponse>({
    queryKey: ['dashboard', userId, month, year, readVersion],
    queryFn: () => fetchApi<DashboardResponse>(url),
    enabled,
    staleTime: QUERY_STALE_TIME.dashboard,
    gcTime: QUERY_GC_TIME.dashboard,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!dashboardQuery.data || !userId) {
      return;
    }

    queryClient.setQueryData(
      ['summary', userId, month, year, readVersion],
      dashboardQuery.data.summary
    );
    queryClient.setQueryData(
      ['budgets', userId, month, year, readVersion],
      dashboardQuery.data.budgets
    );

    if (dashboardQuery.data.transactionCount === dashboardQuery.data.transactions.length) {
      queryClient.setQueryData(
        buildTransactionsQueryKey(
          userId,
          { month, year },
          readVersion
        ),
        dashboardQuery.data.transactions
      );
    }

    queryClient.setQueryData(
      ['charts', userId, 'monthly', 'month', month, year, readVersion],
      dashboardQuery.data.chartPreview.monthly
    );
    queryClient.setQueryData(
      ['charts', userId, 'category', 'expense', month, year, readVersion],
      dashboardQuery.data.chartPreview.categoryExpense
    );
  }, [dashboardQuery.data, month, queryClient, readVersion, userId, year]);

  return dashboardQuery;
}

// Transactions hooks
export function useTransactions(
  filters: TransactionsQueryFilters = {},
  options?: UserScopedQueryOptions
) {
  const { userId, enabled } = useUserScopedQueryOptions(options);
  const readVersion = useFinanceReadVersion();
  const { params } = buildTransactionsParams(filters, readVersion);

  const query = params.toString();
  const url = query ? `/api/transactions?${query}` : '/api/transactions';

  return useQuery<Transaction[]>({
    queryKey: buildTransactionsQueryKey(userId, filters, readVersion),
    queryFn: () => fetchApi<Transaction[]>(url),
    enabled,
    staleTime: QUERY_STALE_TIME.transactions,
    gcTime: QUERY_GC_TIME.reads,
    refetchOnWindowFocus: true,
  });
}

export function useTransactionHistory(
  filters: TransactionsQueryFilters,
  historyOptions: TransactionHistoryQueryOptions,
  options?: UserScopedQueryOptions
) {
  const { userId, enabled } = useUserScopedQueryOptions(options);
  const readVersion = useFinanceReadVersion();
  const { params, normalizedDateFrom, normalizedDateTo } = buildTransactionsParams(
    filters,
    readVersion
  );
  const pageSize = historyOptions.pageSize ?? 50;

  params.append('page', historyOptions.page.toString());
  params.append('pageSize', pageSize.toString());

  return useQuery<TransactionHistoryResponse>({
    queryKey: [
      'transactions-history',
      userId,
      filters.month ?? null,
      filters.year ?? null,
      filters.type ?? null,
      filters.categoryId ?? null,
      normalizedDateFrom,
      normalizedDateTo,
      historyOptions.page,
      pageSize,
      readVersion,
    ],
    queryFn: () => fetchApi<TransactionHistoryResponse>(`/api/transactions?${params.toString()}`),
    enabled,
    staleTime: QUERY_STALE_TIME.transactions,
    gcTime: QUERY_GC_TIME.reads,
    refetchOnWindowFocus: true,
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
      return refreshTransactionQueries(queryClient);
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
      return refreshTransactionQueries(queryClient);
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
      return refreshTransactionQueries(queryClient);
    },
  });
}

export function useDeleteTransactionsBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) =>
      fetchApi<{ deletedCount: number }>('/api/transactions/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      }),
    onSuccess: () => {
      return refreshTransactionQueries(queryClient);
    },
  });
}

// Summary hooks
export function useSummary(
  month?: number,
  year?: number,
  options?: UserScopedQueryOptions
) {
  const { userId, enabled } = useUserScopedQueryOptions(options);
  const readVersion = useFinanceReadVersion();
  const params = new URLSearchParams();
  if (month) params.append('month', month.toString());
  if (year) params.append('year', year.toString());
  appendReadVersionParam(params, readVersion);

  const query = params.toString();
  const url = query ? `/api/summary?${query}` : '/api/summary';

  return useQuery<SummaryResponse>({
    queryKey: ['summary', userId, month, year, readVersion],
    queryFn: () => fetchApi<SummaryResponse>(url),
    enabled,
    staleTime: QUERY_STALE_TIME.summary,
    gcTime: QUERY_GC_TIME.reads,
    refetchOnWindowFocus: true,
  });
}

// Budget hooks
export function useBudgets(
  month?: number,
  year?: number,
  options?: UserScopedQueryOptions
) {
  const { userId, enabled } = useUserScopedQueryOptions(options);
  const readVersion = useFinanceReadVersion();
  const params = new URLSearchParams();
  if (month) params.append('month', month.toString());
  if (year) params.append('year', year.toString());
  appendReadVersionParam(params, readVersion);

  const query = params.toString();
  const url = query ? `/api/budgets?${query}` : '/api/budgets';

  return useQuery<BudgetProgress[]>({
    queryKey: ['budgets', userId, month, year, readVersion],
    queryFn: () => fetchApi<BudgetProgress[]>(url),
    enabled,
    staleTime: QUERY_STALE_TIME.budgets,
    gcTime: QUERY_GC_TIME.reads,
    refetchOnWindowFocus: true,
  });
}

// Chart data hooks
export function useMonthlyChartData(
  month?: number,
  year?: number,
  granularity: 'hour' | 'day' | 'month' = 'month',
  options?: UserScopedQueryOptions
) {
  const { userId, enabled } = useUserScopedQueryOptions(options);
  const readVersion = useFinanceReadVersion();
  const params = new URLSearchParams();
  params.append('type', 'monthly');
  if (month) params.append('month', month.toString());
  if (year) params.append('year', year.toString());
  params.append('granularity', granularity);
  appendReadVersionParam(params, readVersion);

  return useQuery<TrendDataPoint[]>({
    queryKey: ['charts', userId, 'monthly', granularity, month, year, readVersion],
    queryFn: () => fetchApi<TrendDataPoint[]>(`/api/charts?${params.toString()}`),
    enabled,
    staleTime: QUERY_STALE_TIME.charts,
    gcTime: QUERY_GC_TIME.reads,
    refetchOnWindowFocus: true,
  });
}

export function useCategorySpending(
  month?: number,
  year?: number,
  transactionType: 'expense' | 'income' = 'expense',
  options?: UserScopedQueryOptions
) {
  const { userId, enabled } = useUserScopedQueryOptions(options);
  const readVersion = useFinanceReadVersion();
  const params = new URLSearchParams();
  params.append('type', 'category');
  if (month) params.append('month', month.toString());
  if (year) params.append('year', year.toString());
  params.append('transactionType', transactionType);
  appendReadVersionParam(params, readVersion);

  return useQuery<CategorySpending[]>({
    queryKey: ['charts', userId, 'category', transactionType, month, year, readVersion],
    queryFn: () => fetchApi<CategorySpending[]>(`/api/charts?${params.toString()}`),
    enabled,
    staleTime: QUERY_STALE_TIME.charts,
    gcTime: QUERY_GC_TIME.reads,
    refetchOnWindowFocus: true,
  });
}
