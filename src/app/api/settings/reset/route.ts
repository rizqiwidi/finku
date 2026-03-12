import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isPasswordHash } from '@/lib/user-service';
import { isAuthError, requireAuthClaims } from '@/lib/auth-server';

const VALID_RESET_TARGETS = new Set(['transactions', 'allocations']);

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthClaims();
    const body = await request.json();
    const password =
      typeof body.password === 'string' ? body.password : '';
    const target =
      typeof body.target === 'string' ? body.target : '';

    if (!password || !VALID_RESET_TARGETS.has(target)) {
      return NextResponse.json(
        { error: 'Invalid reset payload' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, password: true },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!isPasswordHash(existingUser.password)) {
      return NextResponse.json(
        { error: 'Password account belum termigrasi dengan benar' },
        { status: 503 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, existingUser.password);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Password verifikasi salah' },
        { status: 401 }
      );
    }

    if (target === 'transactions') {
      const deletedTransactions = await prisma.transaction.deleteMany({
        where: { userId: auth.userId },
      });

      return NextResponse.json({
        success: true,
        deletedCount: deletedTransactions.count,
      });
    }

    const [deletedBudgets, resetCategories] = await prisma.$transaction([
      prisma.budget.deleteMany({
        where: { userId: auth.userId },
      }),
      prisma.category.updateMany({
        where: { userId: auth.userId },
        data: {
          budget: null,
          allocationPercentage: 0,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      deletedBudgetCount: deletedBudgets.count,
      resetCategoryCount: resetCategories.count,
    });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Error resetting finance data:', error);
    return NextResponse.json(
      { error: 'Failed to reset finance data' },
      { status: 500 }
    );
  }
}
