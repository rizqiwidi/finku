import { create } from 'zustand';
import type { Transaction, Category, Budget, TransactionType } from '@/types';

// Default categories
const defaultCategories: Category[] = [
  { id: '1', name: 'Gaji', icon: 'Wallet', color: '#10b981', type: 'income' },
  { id: '2', name: 'Freelance', icon: 'Laptop', color: '#06b6d4', type: 'income' },
  { id: '3', name: 'Investasi', icon: 'TrendingUp', color: '#8b5cf6', type: 'income' },
  { id: '4', name: 'Lainnya', icon: 'Plus', color: '#6b7280', type: 'income' },
  { id: '5', name: 'Makanan', icon: 'Utensils', color: '#f97316', type: 'expense', budget: 3000000 },
  { id: '6', name: 'Transportasi', icon: 'Car', color: '#3b82f6', type: 'expense', budget: 1500000 },
  { id: '7', name: 'Belanja', icon: 'ShoppingBag', color: '#ec4899', type: 'expense', budget: 2000000 },
  { id: '8', name: 'Hiburan', icon: 'Gamepad2', color: '#14b8a6', type: 'expense', budget: 1000000 },
  { id: '9', name: 'Tagihan', icon: 'Receipt', color: '#ef4444', type: 'expense', budget: 2500000 },
  { id: '10', name: 'Kesehatan', icon: 'Heart', color: '#f43f5e', type: 'expense', budget: 500000 },
  { id: '11', name: 'Pendidikan', icon: 'GraduationCap', color: '#6366f1', type: 'expense', budget: 1000000 },
  { id: '12', name: 'Lainnya', icon: 'MoreHorizontal', color: '#9ca3af', type: 'expense', budget: 500000 },
];

// Generate sample transactions
const generateSampleTransactions = (categories: Category[]): Transaction[] => {
  const transactions: Transaction[] = [];
  const now = new Date();
  
  // Income transactions
  const incomeTransactions = [
    { desc: 'Gaji Bulanan', amount: 15000000, categoryId: '1', daysAgo: 25 },
    { desc: 'Project Website', amount: 5000000, categoryId: '2', daysAgo: 15 },
    { desc: 'Dividen Saham', amount: 500000, categoryId: '3', daysAgo: 10 },
    { desc: 'Bonus', amount: 2000000, categoryId: '4', daysAgo: 5 },
  ];
  
  // Expense transactions
  const expenseTransactions = [
    { desc: 'Makan Siang', amount: 45000, categoryId: '5', daysAgo: 0 },
    { desc: 'Groceries', amount: 350000, categoryId: '5', daysAgo: 2 },
    { desc: 'Gojek ke Kantor', amount: 25000, categoryId: '6', daysAgo: 1 },
    { desc: 'Bensin', amount: 150000, categoryId: '6', daysAgo: 5 },
    { desc: 'Baju Baru', amount: 450000, categoryId: '7', daysAgo: 7 },
    { desc: 'Netflix', amount: 54000, categoryId: '8', daysAgo: 20 },
    { desc: 'Spotify', amount: 54990, categoryId: '8', daysAgo: 20 },
    { desc: 'Listrik', amount: 350000, categoryId: '9', daysAgo: 15 },
    { desc: 'Internet', amount: 450000, categoryId: '9', daysAgo: 12 },
    { desc: 'Vitamin', amount: 150000, categoryId: '10', daysAgo: 8 },
    { desc: 'Kursus Online', amount: 500000, categoryId: '11', daysAgo: 18 },
  ];
  
  [...incomeTransactions, ...expenseTransactions].forEach((t, index) => {
    const category = categories.find(c => c.id === t.categoryId)!;
    transactions.push({
      id: `t-${index}`,
      amount: t.amount,
      description: t.desc,
      categoryId: t.categoryId,
      category,
      type: category.type,
      date: new Date(now.getTime() - t.daysAgo * 24 * 60 * 60 * 1000),
    });
  });
  
  return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
};

interface FinanceState {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  selectedMonth: Date;
  
  // Actions
  addTransaction: (transaction: Omit<Transaction, 'id' | 'category'>) => void;
  deleteTransaction: (id: string) => void;
  updateTransaction: (id: string, data: Partial<Transaction>) => void;
  setSelectedMonth: (date: Date) => void;
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, data: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  
  // Computed
  getFinancialSummary: () => { balance: number; income: number; expenses: number; savingsRate: number };
  getMonthlyData: () => { month: string; income: number; expenses: number }[];
  getCategorySpending: () => { category: string; amount: number; color: string; percentage: number }[];
  getBudgetProgress: () => Budget[];
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  transactions: generateSampleTransactions(defaultCategories),
  categories: defaultCategories,
  budgets: [],
  selectedMonth: new Date(),
  
  addTransaction: (transactionData) => {
    const category = get().categories.find(c => c.id === transactionData.categoryId);
    if (!category) return;
    
    const newTransaction: Transaction = {
      ...transactionData,
      id: `t-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category,
    };
    
    set((state) => ({
      transactions: [newTransaction, ...state.transactions].sort(
        (a, b) => b.date.getTime() - a.date.getTime()
      ),
    }));
  },
  
  deleteTransaction: (id) => {
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    }));
  },
  
  updateTransaction: (id, data) => {
    set((state) => ({
      transactions: state.transactions.map((t) => {
        if (t.id !== id) return t;
        
        const updatedTransaction = { ...t, ...data };
        if (data.categoryId) {
          const category = state.categories.find(c => c.id === data.categoryId);
          if (category) {
            updatedTransaction.category = category;
            updatedTransaction.type = category.type;
          }
        }
        return updatedTransaction;
      }),
    }));
  },
  
  setSelectedMonth: (date) => set({ selectedMonth: date }),
  
  addCategory: (categoryData) => {
    const newCategory: Category = {
      ...categoryData,
      id: `c-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    set((state) => ({
      categories: [...state.categories, newCategory],
    }));
  },
  
  updateCategory: (id, data) => {
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, ...data } : c
      ),
      transactions: state.transactions.map((t) =>
        t.categoryId === id ? { ...t, category: { ...t.category, ...data } } : t
      ),
    }));
  },
  
  deleteCategory: (id) => {
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
      transactions: state.transactions.filter((t) => t.categoryId !== id),
    }));
  },
  
  getFinancialSummary: () => {
    const { transactions, selectedMonth } = get();
    const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
    
    const monthTransactions = transactions.filter(
      (t) => t.date >= monthStart && t.date <= monthEnd
    );
    
    const income = monthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = income - expenses;
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
    
    return { balance, income, expenses, savingsRate };
  },
  
  getMonthlyData: () => {
    const { transactions } = get();
    const months: { [key: string]: { income: number; expenses: number } } = {};
    
    // Get last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('id-ID', { month: 'short' });
      months[key] = { income: 0, expenses: 0 };
    }
    
    transactions.forEach((t) => {
      const month = t.date.toLocaleDateString('id-ID', { month: 'short' });
      if (months[month]) {
        if (t.type === 'income') {
          months[month].income += t.amount;
        } else {
          months[month].expenses += t.amount;
        }
      }
    });
    
    return Object.entries(months).map(([month, data]) => ({
      month,
      ...data,
    }));
  },
  
  getCategorySpending: () => {
    const { transactions, selectedMonth, categories } = get();
    const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
    
    const expenseTransactions = transactions.filter(
      (t) => t.type === 'expense' && t.date >= monthStart && t.date <= monthEnd
    );
    
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    const categoryTotals: { [key: string]: { amount: number; color: string } } = {};
    
    expenseTransactions.forEach((t) => {
      const cat = categories.find(c => c.id === t.categoryId);
      if (cat) {
        if (!categoryTotals[cat.name]) {
          categoryTotals[cat.name] = { amount: 0, color: cat.color };
        }
        categoryTotals[cat.name].amount += t.amount;
      }
    });
    
    return Object.entries(categoryTotals)
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        color: data.color,
        percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  },
  
  getBudgetProgress: () => {
    const { categories, transactions, selectedMonth } = get();
    const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
    
    const expenseCategories = categories.filter(c => c.type === 'expense' && c.budget);
    
    return expenseCategories.map(category => {
      const spent = transactions
        .filter(t => 
          t.categoryId === category.id && 
          t.date >= monthStart && 
          t.date <= monthEnd
        )
        .reduce((sum, t) => sum + t.amount, 0);
      
      return {
        id: category.id,
        categoryId: category.id,
        category,
        amount: category.budget || 0,
        spent,
        period: 'monthly' as const,
      };
    });
  },
}));
