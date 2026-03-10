import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const where = type ? { type } : {};

    const categories = await prisma.category.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, icon, color, type, budget } = body;

    const category = await prisma.category.create({
      data: {
        name,
        icon,
        color,
        type,
        budget: budget || null,
      },
    });

    // If it's an expense category with a budget, create a budget entry
    if (type === 'expense' && budget) {
      const now = new Date();
      await prisma.budget.create({
        data: {
          categoryId: category.id,
          amount: budget,
          period: 'monthly',
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
      });
    }

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
