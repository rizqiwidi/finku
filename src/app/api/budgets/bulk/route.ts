import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isAuthError, requireAuthClaims } from '@/lib/auth-server';
import {
  FinanceBulkValidationError,
  normalizeBulkAllocationSavePayload,
} from '@/lib/finance-bulk';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthClaims();
    const body = await request.json();
    const payload = normalizeBulkAllocationSavePayload(body);

    const result = await prisma.$transaction(async (tx) => {
      const categoryIds = payload.allocations.map((allocation) => allocation.categoryId);
      const ownedCategories = categoryIds.length
        ? await tx.category.findMany({
            where: {
              userId: auth.userId,
              id: { in: categoryIds },
            },
            select: {
              id: true,
              type: true,
            },
          })
        : [];

      if (ownedCategories.length !== categoryIds.length) {
        throw new FinanceBulkValidationError('Satu atau lebih kategori tidak valid.');
      }

      const categoryById = new Map(
        ownedCategories.map((category) => [category.id, category])
      );

      await tx.userSettings.upsert({
        where: { userId: auth.userId },
        update: {
          monthlyIncome: payload.monthlyIncome,
        },
        create: {
          userId: auth.userId,
          monthlyIncome: payload.monthlyIncome,
          savingsPercentage: 20,
        },
      });

      await Promise.all(
        payload.allocations.map((allocation) => {
          const category = categoryById.get(allocation.categoryId);

          if (!category) {
            throw new FinanceBulkValidationError(
              'Satu atau lebih kategori tidak valid.'
            );
          }

          return tx.category.update({
            where: {
              id: allocation.categoryId,
            },
            data: {
              allocationPercentage: allocation.allocationPercentage,
              budget: category.type === 'expense' ? allocation.amount : null,
            },
          });
        })
      );

      if (categoryIds.length > 0) {
        await tx.budget.deleteMany({
          where: {
            userId: auth.userId,
            month: payload.month,
            year: payload.year,
            categoryId: { in: categoryIds },
          },
        });

        await tx.budget.createMany({
          data: payload.allocations.map((allocation) => ({
            userId: auth.userId,
            categoryId: allocation.categoryId,
            amount: allocation.amount,
            period: 'monthly',
            month: payload.month,
            year: payload.year,
          })),
        });
      }

      return {
        count: payload.allocations.length,
      };
    });

    return NextResponse.json({
      message: `Updated ${result.count} budgets`,
      count: result.count,
    });
  } catch (error) {
    if (error instanceof FinanceBulkValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

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
