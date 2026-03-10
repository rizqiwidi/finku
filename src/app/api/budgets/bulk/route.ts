import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isAuthError, requireAuthUser } from '@/lib/auth-server';

// Bulk create/update budgets for a month
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthUser();
    const body = await request.json();
    const { month, year, allocations } = body;
    const normalizedMonth = Number(month);
    const normalizedYear = Number(year);

    // Validate input
    if (
      !normalizedMonth ||
      !normalizedYear ||
      !allocations ||
      !Array.isArray(allocations)
    ) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      );
    }

    const categoryIds = [...new Set(allocations.map((allocation: { categoryId: string }) => allocation.categoryId))];
    const ownedCategories = await prisma.category.findMany({
      where: {
        userId: user.id,
        id: { in: categoryIds },
      },
      select: { id: true },
    });

    if (ownedCategories.length !== categoryIds.length) {
      return NextResponse.json(
        { error: 'One or more categories are invalid' },
        { status: 400 }
      );
    }

    const results = await Promise.all(
      allocations.map(async (allocation: { categoryId: string; amount: number }) => {
        return prisma.budget.upsert({
          where: {
            userId_categoryId_month_year: {
              userId: user.id,
              categoryId: allocation.categoryId,
              month: normalizedMonth,
              year: normalizedYear,
            },
          },
          update: {
            amount: Number(allocation.amount),
            period: 'monthly',
          },
          create: {
            userId: user.id,
            categoryId: allocation.categoryId,
            amount: Number(allocation.amount),
            period: 'monthly',
            month: normalizedMonth,
            year: normalizedYear,
          },
        });
      })
    );

    return NextResponse.json({ 
      message: `Updated ${results.length} budgets`,
      count: results.length 
    });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Error updating budgets:', error);
    return NextResponse.json(
      { error: 'Failed to update budgets' },
      { status: 500 }
    );
  }
}
