import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isAuthError, requireAuthUser } from '@/lib/auth-server';

export async function GET(request: Request) {
  try {
    const user = await requireAuthUser();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    // Get all budgets with their categories
    const budgets = await prisma.budget.findMany({
      where: {
        userId: user.id,
        month: targetMonth,
        year: targetYear,
      },
      include: {
        category: true,
      },
    });

    const spentByCategory =
      budgets.length === 0
        ? new Map<string, number>()
        : new Map(
            (
              await prisma.transaction.groupBy({
                by: ['categoryId'],
                where: {
                  userId: user.id,
                  type: 'expense',
                  categoryId: {
                    in: budgets.map((budget) => budget.categoryId),
                  },
                  date: {
                    gte: startDate,
                    lte: endDate,
                  },
                },
                _sum: {
                  amount: true,
                },
              })
            ).map((entry) => [entry.categoryId, entry._sum.amount || 0])
          );

    const budgetProgress = budgets.map((budget) => ({
      id: budget.id,
      categoryId: budget.categoryId,
      category: budget.category,
      amount: budget.amount,
      spent: spentByCategory.get(budget.categoryId) || 0,
      period: budget.period,
      month: budget.month,
      year: budget.year,
    }));

    return NextResponse.json(budgetProgress);
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Error fetching budgets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budgets' },
      { status: 500 }
    );
  }
}
