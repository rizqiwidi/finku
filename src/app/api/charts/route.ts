import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isAuthError, requireAuthUser } from '@/lib/auth-server';

export async function GET(request: Request) {
  try {
    const user = await requireAuthUser();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'monthly', 'category', 'trend'
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const transactionType = searchParams.get('transactionType') === 'income' ? 'income' : 'expense';

    if (type === 'monthly' || type === 'trend') {
      const now = new Date();
      const rangeStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const transactions = await prisma.transaction.findMany({
        where: {
          userId: user.id,
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

      const monthlyData = Array.from({ length: 6 }, (_, index) => {
        const targetDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
        return {
          key: `${targetDate.getFullYear()}-${targetDate.getMonth()}`,
          month: targetDate.toLocaleDateString('id-ID', { month: 'short' }),
          income: 0,
          expenses: 0,
        };
      });

      const monthlyMap = new Map(monthlyData.map((item) => [item.key, item]));

      for (const transaction of transactions) {
        const transactionDate = new Date(transaction.date);
        const key = `${transactionDate.getFullYear()}-${transactionDate.getMonth()}`;
        const bucket = monthlyMap.get(key);

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

      return NextResponse.json(monthlyData.map(({ key, ...item }) => item));
    }

    if (type === 'category') {
      const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
      const targetYear = year ? parseInt(year) : new Date().getFullYear();

      const startDate = new Date(targetYear, targetMonth - 1, 1);
      const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

      const categories = await prisma.category.findMany({
        where: {
          userId: user.id,
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
                userId: user.id,
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

      return NextResponse.json(dataWithPercentage);
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
