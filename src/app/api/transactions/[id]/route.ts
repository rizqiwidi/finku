import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isAuthError, requireAuthClaims } from '@/lib/auth-server';
import { getJakartaNowTimestamp, parseTransactionDateValue } from '@/lib/date-input';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuthClaims();
    const { id } = await params;

    const transaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId: auth.userId,
      },
      include: {
        category: true,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transaction);
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Error fetching transaction:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuthClaims();
    const { id } = await params;
    const body = await request.json();
    const { amount, description, categoryId, date, notes } = body;
    const parsedDate = parseTransactionDateValue(date);

    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId: auth.userId,
      },
      select: { id: true },
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId: auth.userId,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 400 }
      );
    }

    if (!parsedDate) {
      return NextResponse.json(
        { error: 'Tanggal transaksi tidak valid' },
        { status: 400 }
      );
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        amount: parseFloat(amount),
        description,
        categoryId,
        type: category.type,
        date: parsedDate,
        notes: notes || null,
        updatedAt: getJakartaNowTimestamp(),
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(transaction);
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuthClaims();
    const { id } = await params;

    const deleted = await prisma.transaction.deleteMany({
      where: {
        id,
        userId: auth.userId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
