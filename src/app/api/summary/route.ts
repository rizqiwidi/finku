import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isAuthError, requireAuthUser } from '@/lib/auth-server';
import { getCurrentJakartaMonthYear, getJakartaMonthRange } from '@/lib/date-input';
import { calculateFinancialSummary } from '@/lib/finance-summary';

export async function GET(request: Request) {
  try {
    const user = await requireAuthUser();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const jakartaNow = getCurrentJakartaMonthYear();
    const targetMonth = month ? parseInt(month) : jakartaNow.month;
    const targetYear = year ? parseInt(year) : jakartaNow.year;

    const { start, end } = getJakartaMonthRange(targetYear, targetMonth);

    // Get all transactions for the month
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: {
          gte: start,
          lte: end,
        },
      },
      select: {
        amount: true,
        type: true,
      },
    });

    const savingsAggregate = await prisma.transaction.aggregate({
      where: {
        userId: user.id,
        type: 'savings',
      },
      _sum: {
        amount: true,
      },
    });

    const summary = calculateFinancialSummary(transactions);

    return NextResponse.json({
      ...summary,
      totalSavings: savingsAggregate._sum.amount || 0,
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

    console.error('Error fetching summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch summary' },
      { status: 500 }
    );
  }
}
