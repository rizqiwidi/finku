import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isAuthError, requireAuthClaims } from '@/lib/auth-server';
import { getCurrentJakartaMonthYear, getJakartaMonthRange } from '@/lib/date-input';
import { createPrivateReadResponse } from '@/lib/private-read-response';

export async function GET(request: Request) {
  try {
    const auth = await requireAuthClaims();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const jakartaNow = getCurrentJakartaMonthYear();
    const targetMonth = month ? parseInt(month) : jakartaNow.month;
    const targetYear = year ? parseInt(year) : jakartaNow.year;

    const { start, end } = getJakartaMonthRange(targetYear, targetMonth);

    // Get all budgets with their categories
    const budgets = await prisma.budget.findMany({
      where: {
        userId: auth.userId,
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
                  userId: auth.userId,
                  type: 'expense',
                  categoryId: {
                    in: budgets.map((budget) => budget.categoryId),
                  },
                  date: {
                    gte: start,
                    lte: end,
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

    return createPrivateReadResponse(budgetProgress);
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
