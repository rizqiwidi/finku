import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Bulk create/update budgets for a month
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { month, year, allocations } = body;

    // Validate input
    if (!month || !year || !allocations || !Array.isArray(allocations)) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      );
    }

    // Create or update budgets for each allocation
    const results = await Promise.all(
      allocations.map(async (allocation: { categoryId: string; amount: number }) => {
        // Check if budget exists
        const existing = await prisma.budget.findUnique({
          where: {
            categoryId_month_year: {
              categoryId: allocation.categoryId,
              month,
              year,
            },
          },
        });

        if (existing) {
          return prisma.budget.update({
            where: { id: existing.id },
            data: { amount: allocation.amount },
          });
        } else {
          return prisma.budget.create({
            data: {
              categoryId: allocation.categoryId,
              amount: allocation.amount,
              period: 'monthly',
              month,
              year,
            },
          });
        }
      })
    );

    return NextResponse.json({ 
      message: `Updated ${results.length} budgets`,
      count: results.length 
    });
  } catch (error) {
    console.error('Error updating budgets:', error);
    return NextResponse.json(
      { error: 'Failed to update budgets' },
      { status: 500 }
    );
  }
}
