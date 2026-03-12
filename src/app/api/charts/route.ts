import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isAuthError, requireAuthClaims } from '@/lib/auth-server';
import { createPrivateReadResponse } from '@/lib/private-read-response';

export async function GET(request: Request) {
  try {
    const auth = await requireAuthClaims();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'monthly', 'category', 'trend'
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const granularity = searchParams.get('granularity');
    const transactionType = searchParams.get('transactionType') === 'income' ? 'income' : 'expense';

    if (type === 'monthly' || type === 'trend') {
      const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
      const targetYear = year ? parseInt(year) : new Date().getFullYear();
      const normalizedGranularity =
        granularity === 'hour' || granularity === 'day' ? granularity : 'month';

      if (normalizedGranularity === 'hour') {
        const periodStart = new Date(targetYear, targetMonth - 1, 1);
        const periodEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59);
        const latestTransaction = await prisma.transaction.findFirst({
          where: {
            userId: auth.userId,
            date: {
              gte: periodStart,
              lte: periodEnd,
            },
          },
          orderBy: {
            date: 'desc',
          },
          select: {
            date: true,
          },
        });

        const focusDate = latestTransaction
          ? new Date(latestTransaction.date)
          : new Date(targetYear, targetMonth - 1, 1, 12, 0, 0);
        const rangeStart = new Date(
          focusDate.getFullYear(),
          focusDate.getMonth(),
          focusDate.getDate(),
          0,
          0,
          0
        );
        const rangeEnd = new Date(
          focusDate.getFullYear(),
          focusDate.getMonth(),
          focusDate.getDate(),
          23,
          59,
          59
        );

        const transactions = await prisma.transaction.findMany({
          where: {
            userId: auth.userId,
            date: {
              gte: rangeStart,
              lte: rangeEnd,
            },
          },
          select: {
            amount: true,
            type: true,
            date: true,
          },
        });

        const hourlyData = Array.from({ length: 24 }, (_, hourIndex) => ({
          key: hourIndex,
          label: `${hourIndex.toString().padStart(2, '0')}:00`,
          income: 0,
          expenses: 0,
        }));
        const hourlyMap = new Map(hourlyData.map((item) => [item.key, item]));

        for (const transaction of transactions) {
          const transactionDate = new Date(transaction.date);
          const bucket = hourlyMap.get(transactionDate.getHours());

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

        return createPrivateReadResponse(
          hourlyData.map(({ key, ...item }) => item)
        );
      }

      if (normalizedGranularity === 'day') {
        const rangeStart = new Date(targetYear, targetMonth - 1, 1);
        const rangeEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59);
        const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
        const transactions = await prisma.transaction.findMany({
          where: {
            userId: auth.userId,
            date: {
              gte: rangeStart,
              lte: rangeEnd,
            },
          },
          select: {
            amount: true,
            type: true,
            date: true,
          },
        });

        const dailyData = Array.from({ length: daysInMonth }, (_, dayIndex) => ({
          key: dayIndex + 1,
          label: `${dayIndex + 1}`,
          income: 0,
          expenses: 0,
        }));
        const dailyMap = new Map(dailyData.map((item) => [item.key, item]));

        for (const transaction of transactions) {
          const transactionDate = new Date(transaction.date);
          const bucket = dailyMap.get(transactionDate.getDate());

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

        return createPrivateReadResponse(
          dailyData.map(({ key, ...item }) => item)
        );
      }

      const rangeStart = new Date(targetYear, 0, 1);
      const rangeEnd = new Date(targetYear, 11, 31, 23, 59, 59);
      const transactions = await prisma.transaction.findMany({
        where: {
          userId: auth.userId,
          date: {
            gte: rangeStart,
            lte: rangeEnd,
          },
        },
        select: {
          amount: true,
          type: true,
          date: true,
        },
      });

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

      return createPrivateReadResponse(
        monthlyData.map(({ key, ...item }) => item)
      );
    }

    if (type === 'category') {
      const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
      const targetYear = year ? parseInt(year) : new Date().getFullYear();

      const startDate = new Date(targetYear, targetMonth - 1, 1);
      const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

      const categories = await prisma.category.findMany({
        where: {
          userId: auth.userId,
          type: transactionType,
        },
        select: {
          id: true,
          name: true,
          color: true,
        },
      });

      const spendGroups =
        categories.length === 0
          ? []
          : await prisma.transaction.groupBy({
              by: ['categoryId'],
              where: {
                userId: auth.userId,
                type: transactionType,
                categoryId: {
                  in: categories.map((category) => category.id),
                },
                date: {
                  gte: startDate,
                  lte: endDate,
                },
              },
              _sum: {
                amount: true,
              },
            });

      const spendMap = new Map(
        spendGroups.map((group) => [group.categoryId, group._sum.amount || 0])
      );

      const categorySpending = categories.map((category) => ({
        category: category.name,
        amount: spendMap.get(category.id) || 0,
        color: category.color,
      }));

      // Calculate total and percentages
      const totalAmount = categorySpending.reduce((sum, c) => sum + c.amount, 0);
      const dataWithPercentage = categorySpending
        .filter((c) => c.amount > 0)
        .map((c) => ({
          ...c,
          percentage: totalAmount > 0 ? (c.amount / totalAmount) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      return createPrivateReadResponse(dataWithPercentage);
    }

    return NextResponse.json({ error: 'Invalid chart type' }, { status: 400 });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Error fetching chart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}
