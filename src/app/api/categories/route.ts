import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isCategoryIconName } from '@/lib/category-icons';
import { isAuthError, requireAuthClaims } from '@/lib/auth-server';
import { getCurrentJakartaMonthYear } from '@/lib/date-input';

const VALID_CATEGORY_TYPES = new Set(['income', 'expense', 'savings']);

function parseNullableNumber(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthClaims();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const where = type
      ? { userId: auth.userId, type }
      : { userId: auth.userId };

    const categories = await prisma.category.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(categories);
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthClaims();
    const body = await request.json();
    const { name, icon, color, type, budget, allocationPercentage } = body;
    const budgetValue = parseNullableNumber(budget);
    const allocationPercentageValue = parseNullableNumber(allocationPercentage);

    if (
      typeof name !== 'string' ||
      name.trim().length === 0 ||
      typeof color !== 'string' ||
      color.trim().length === 0 ||
      typeof icon !== 'string' ||
      !isCategoryIconName(icon) ||
      typeof type !== 'string' ||
      !VALID_CATEGORY_TYPES.has(type)
    ) {
      return NextResponse.json(
        { error: 'Invalid category payload' },
        { status: 400 }
      );
    }

    if (Number.isNaN(budgetValue) || Number.isNaN(allocationPercentageValue)) {
      return NextResponse.json(
        { error: 'Budget or allocation percentage is invalid' },
        { status: 400 }
      );
    }

    const budgetForCategory = type === 'expense' ? budgetValue : null;
    const allocationForCategory =
      type === 'expense' || type === 'savings'
        ? allocationPercentageValue ?? 0
        : 0;

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        icon,
        color: color.trim(),
        type,
        budget: budgetForCategory,
        allocationPercentage: allocationForCategory,
        userId: auth.userId,
      },
    });

    // Keep the current month's budget in sync for budgetable categories.
    if (type === 'expense' && budgetForCategory !== null) {
      const now = getCurrentJakartaMonthYear();
      await prisma.budget.upsert({
        where: {
          userId_categoryId_month_year: {
            userId: auth.userId,
            categoryId: category.id,
            month: now.month,
            year: now.year,
          },
        },
        update: {
          amount: budgetForCategory,
          period: 'monthly',
        },
        create: {
          userId: auth.userId,
          categoryId: category.id,
          amount: budgetForCategory,
          period: 'monthly',
          month: now.month,
          year: now.year,
        },
      });
    }

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
