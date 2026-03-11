import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isAuthError, requireAuthUser } from '@/lib/auth-server';
import {
  getJakartaMonthRange,
  getJakartaNowTimestamp,
  parseTransactionDateValue,
} from '@/lib/date-input';

export async function GET(request: Request) {
  try {
    const user = await requireAuthUser();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const type = searchParams.get('type');
    const categoryId = searchParams.get('categoryId');

    // Build filter conditions
    const where: {
      userId: string;
      type?: string;
      categoryId?: string;
      date?: { gte: Date; lte: Date };
    } = {
      userId: user.id,
    };

    if (type) {
      where.type = type;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (month && year) {
      const { start, end } = getJakartaMonthRange(parseInt(year), parseInt(month));
      where.date = {
        gte: start,
        lte: end,
      };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthUser();
    const body = await request.json();
    const { amount, description, categoryId, type, date, notes } = body;
    const parsedDate = parseTransactionDateValue(date);

    // Get category to ensure type matches
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId: user.id,
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

    const nowTimestamp = getJakartaNowTimestamp();

    const transaction = await prisma.transaction.create({
      data: {
        amount: parseFloat(amount),
        description,
        categoryId,
        type: type || category.type,
        date: parsedDate,
        notes: notes || null,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
        userId: user.id,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
