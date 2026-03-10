import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isAuthError, requireAuthUser } from '@/lib/auth-server';

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

    if (name !== undefined) updateData.name = name;
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;
    if (type !== undefined) updateData.type = type;
    if (budget !== undefined) updateData.budget = budget;
    if (allocationPercentage !== undefined) updateData.allocationPercentage = allocationPercentage;

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

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
    });

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
