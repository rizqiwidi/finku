import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isAuthError, requireAuthClaims } from '@/lib/auth-server';
import { getCurrentJakartaMonthYear, getJakartaMonthRange } from '@/lib/date-input';
import { calculateFinancialSummary } from '@/lib/finance-summary';
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

    // Get all transactions for the month
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: auth.userId,
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
        userId: auth.userId,
        type: 'savings',
      },
      _sum: {
        amount: true,
      },
    });

    const summary = calculateFinancialSummary(transactions);

    return createPrivateReadResponse({
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
