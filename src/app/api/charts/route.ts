import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'monthly', 'category', 'trend'
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (type === 'monthly' || type === 'trend') {
      // Get last 6 months data
      const now = new Date();
      const monthlyData = [];

      for (let i = 5; i >= 0; i--) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);

        const transactions = await prisma.transaction.findMany({
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        const income = transactions
          .filter((t) => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);

        const expenses = transactions
          .filter((t) => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        monthlyData.push({
          month: targetDate.toLocaleDateString('id-ID', { month: 'short' }),
          income,
          expenses,
        });
      }

      return NextResponse.json(monthlyData);
    }

    if (type === 'category') {
      // Category spending for current month
      const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
      const targetYear = year ? parseInt(year) : new Date().getFullYear();

      const startDate = new Date(targetYear, targetMonth - 1, 1);
      const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

      // Get all expense categories
      const categories = await prisma.category.findMany({
        where: { type: 'expense' },
      });

      // Get spending per category
      const categorySpending = await Promise.all(
        categories.map(async (category) => {
          const result = await prisma.transaction.aggregate({
            where: {
              categoryId: category.id,
              type: 'expense',
              date: {
                gte: startDate,
                lte: endDate,
              },
            },
            _sum: {
              amount: true,
            },
          });

          return {
            category: category.name,
            amount: result._sum.amount || 0,
            color: category.color,
          };
        })
      );

      // Calculate total and percentages
      const totalExpenses = categorySpending.reduce((sum, c) => sum + c.amount, 0);
      const dataWithPercentage = categorySpending
        .filter((c) => c.amount > 0)
        .map((c) => ({
          ...c,
          percentage: totalExpenses > 0 ? (c.amount / totalExpenses) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      return NextResponse.json(dataWithPercentage);
    }

    return NextResponse.json({ error: 'Invalid chart type' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}
