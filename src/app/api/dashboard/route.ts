import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isAuthError, requireAuthClaims } from '@/lib/auth-server';
import {
  getCurrentJakartaMonthYear,
  getJakartaMonthRange,
} from '@/lib/date-input';
import { calculateFinancialSummary } from '@/lib/finance-summary';
import { createPrivateReadResponse } from '@/lib/private-read-response';

const DASHBOARD_TRANSACTION_PREVIEW_LIMIT = 10;

function buildMonthlyTrendData(
  targetYear: number,
  transactions: Array<{ amount: number; type: string; date: Date }>
) {
  const monthlyData = Array.from({ length: 12 }, (_, monthIndex) => ({
    key: monthIndex,
    label: new Date(targetYear, monthIndex, 1).toLocaleDateString('id-ID', {
      month: 'short',
    }),
    income: 0,
    expenses: 0,
  }));
  const monthlyMap = new Map(monthlyData.map((item) => [item.key, item]));

  for (const transaction of transactions) {
    const transactionDate = new Date(transaction.date);
    const bucket = monthlyMap.get(transactionDate.getMonth());

    if (!bucket) {
      continue;
    }

    if (transaction.type === 'income') {
      bucket.income += transaction.amount;
    }

    if (transaction.type === 'expense') {
      bucket.expenses += transaction.amount;
    }
  }

  return monthlyData.map(({ key, ...item }) => item);
}

function buildCategoryExpensePreview(
  transactions: Array<{
    amount: number;
    type: string;
    categoryId: string;
    category: { name: string; color: string };
  }>
) {
  const spendingByCategory = new Map<
    string,
    { category: string; amount: number; color: string }
  >();

  for (const transaction of transactions) {
    if (transaction.type !== 'expense') {
      continue;
    }

    const current = spendingByCategory.get(transaction.categoryId);

    if (current) {
      current.amount += transaction.amount;
      continue;
    }

    spendingByCategory.set(transaction.categoryId, {
      category: transaction.category.name,
      amount: transaction.amount,
      color: transaction.category.color,
    });
  }

  const categorySpending = [...spendingByCategory.values()].sort(
    (left, right) => right.amount - left.amount
  );
  const totalAmount = categorySpending.reduce(
    (sum, category) => sum + category.amount,
    0
  );

  return categorySpending.map((category) => ({
    ...category,
    percentage: totalAmount > 0 ? (category.amount / totalAmount) * 100 : 0,
  }));
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuthClaims();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const jakartaNow = getCurrentJakartaMonthYear();
    const targetMonth = month ? Number.parseInt(month, 10) : jakartaNow.month;
    const targetYear = year ? Number.parseInt(year, 10) : jakartaNow.year;
    const { start, end } = getJakartaMonthRange(targetYear, targetMonth);
    const yearStart = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0, 0));
    const yearEnd = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));

    const [monthlyTransactions, savingsAggregate, budgets, yearlyTransactions] =
      await Promise.all([
        prisma.transaction.findMany({
          where: {
            userId: auth.userId,
            date: {
              gte: start,
              lte: end,
            },
          },
          include: {
            category: true,
          },
          orderBy: {
            date: 'desc',
          },
        }),
        prisma.transaction.aggregate({
          where: {
            userId: auth.userId,
            type: 'savings',
          },
          _sum: {
            amount: true,
          },
        }),
        prisma.budget.findMany({
          where: {
            userId: auth.userId,
            month: targetMonth,
            year: targetYear,
          },
          include: {
            category: true,
          },
        }),
        prisma.transaction.findMany({
          where: {
            userId: auth.userId,
            date: {
              gte: yearStart,
              lte: yearEnd,
            },
          },
          select: {
            amount: true,
            type: true,
            date: true,
          },
        }),
      ]);

    const summary = calculateFinancialSummary(monthlyTransactions);
    const spentByCategory = monthlyTransactions.reduce((map, transaction) => {
      if (transaction.type !== 'expense') {
        return map;
      }

      map.set(
        transaction.categoryId,
        (map.get(transaction.categoryId) ?? 0) + transaction.amount
      );
      return map;
    }, new Map<string, number>());

    const budgetProgress = budgets.map((budget) => ({
      id: budget.id,
      categoryId: budget.categoryId,
      category: budget.category,
      amount: budget.amount,
      spent: spentByCategory.get(budget.categoryId) ?? 0,
      period: budget.period === 'yearly' ? 'yearly' : 'monthly',
      month: budget.month,
      year: budget.year,
    }));

    return createPrivateReadResponse({
      summary: {
        ...summary,
        totalSavings: savingsAggregate._sum.amount ?? 0,
        month: targetMonth,
        year: targetYear,
      },
      budgets: budgetProgress,
      transactionCount: monthlyTransactions.length,
      transactionPreviewLimit: DASHBOARD_TRANSACTION_PREVIEW_LIMIT,
      transactions: monthlyTransactions.slice(0, DASHBOARD_TRANSACTION_PREVIEW_LIMIT),
      chartPreview: {
        monthly: buildMonthlyTrendData(targetYear, yearlyTransactions),
        categoryExpense: buildCategoryExpensePreview(monthlyTransactions),
      },
      month: targetMonth,
      year: targetYear,
    });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Error fetching dashboard aggregate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard aggregate' },
      { status: 500 }
    );
  }
}
