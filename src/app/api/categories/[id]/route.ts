import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isCategoryIconName } from '@/lib/category-icons';
import { isAuthError, requireAuthUser } from '@/lib/auth-server';
import { getCurrentJakartaMonthYear } from '@/lib/date-input';

const VALID_CATEGORY_TYPES = new Set(['income', 'expense', 'savings']);

function parseNullableNumber(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id } = await params;
    
    const category = await prisma.category.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Error fetching category:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id } = await params;
    const body = await request.json();
    const { name, icon, color, type, budget, allocationPercentage } = body;

    const updateData: {
      name?: string;
      icon?: string;
      color?: string;
      type?: string;
      budget?: number | null;
      allocationPercentage?: number;
    } = {};

    const existingCategory = await prisma.category.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
        type: true,
        budget: true,
        allocationPercentage: true,
      },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Category name is invalid' },
          { status: 400 }
        );
      }

      updateData.name = name.trim();
    }

    if (icon !== undefined) {
      if (typeof icon !== 'string' || !isCategoryIconName(icon)) {
        return NextResponse.json(
          { error: 'Category icon is invalid' },
          { status: 400 }
        );
      }

      updateData.icon = icon;
    }

    if (color !== undefined) {
      if (typeof color !== 'string' || color.trim().length === 0) {
        return NextResponse.json(
          { error: 'Category color is invalid' },
          { status: 400 }
        );
      }

      updateData.color = color.trim();
    }

    if (type !== undefined) {
      if (typeof type !== 'string' || !VALID_CATEGORY_TYPES.has(type)) {
        return NextResponse.json(
          { error: 'Category type is invalid' },
          { status: 400 }
        );
      }

      updateData.type = type;
    }

    const parsedBudget = budget !== undefined ? parseNullableNumber(budget) : undefined;
    const parsedAllocation =
      allocationPercentage !== undefined
        ? parseNullableNumber(allocationPercentage)
        : undefined;

    if (Number.isNaN(parsedBudget) || Number.isNaN(parsedAllocation)) {
      return NextResponse.json(
        { error: 'Budget or allocation percentage is invalid' },
        { status: 400 }
      );
    }

    const nextType = type ?? existingCategory.type;
    const nextBudget =
      nextType === 'expense'
        ? parsedBudget !== undefined
          ? parsedBudget
          : existingCategory.budget
        : null;
    const nextAllocation =
      nextType === 'expense' || nextType === 'savings'
        ? parsedAllocation !== undefined
          ? parsedAllocation ?? 0
          : existingCategory.allocationPercentage ?? 0
        : 0;

    updateData.type = nextType;
    updateData.budget = nextBudget;
    updateData.allocationPercentage = nextAllocation;

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    const now = getCurrentJakartaMonthYear();
    const month = now.month;
    const year = now.year;

    if (nextType === 'expense' && nextBudget !== null) {
      await prisma.budget.upsert({
        where: {
          userId_categoryId_month_year: {
            userId: user.id,
            categoryId: category.id,
            month,
            year,
          },
        },
        update: {
          amount: nextBudget,
          period: 'monthly',
        },
        create: {
          userId: user.id,
          categoryId: category.id,
          amount: nextBudget,
          period: 'monthly',
          month,
          year,
        },
      });
    } else {
      await prisma.budget.deleteMany({
        where: {
          userId: user.id,
          categoryId: category.id,
          month,
          year,
        },
      });
    }

    return NextResponse.json(category);
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id } = await params;

    const existingCategory = await prisma.category.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: { id: true },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }
    
    // Check if category has transactions
    const transactionsCount = await prisma.transaction.count({
      where: {
        categoryId: id,
        userId: user.id,
      },
    });

    if (transactionsCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with existing transactions' },
        { status: 400 }
      );
    }

    await prisma.budget.deleteMany({
      where: {
        categoryId: id,
        userId: user.id,
      },
    });

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
