import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isAuthError, requireAuthClaims } from '@/lib/auth-server';
import {
  getJakartaDateParts,
  getJakartaMonthRange,
  getJakartaNowTimestamp,
  parseTransactionDateValue,
} from '@/lib/date-input';
import { createPrivateReadResponse } from '@/lib/private-read-response';

const VALID_TRANSACTION_TYPES = new Set(['income', 'expense', 'savings']);
const DEFAULT_HISTORY_PAGE_SIZE = 50;
const MAX_HISTORY_PAGE_SIZE = 100;

function toFilterDayBoundary(date: Date, boundary: 'start' | 'end') {
  const { year, month, day } = getJakartaDateParts(date);

  return boundary === 'start'
    ? new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
    : new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuthClaims();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const type = searchParams.get('type');
    const categoryId = searchParams.get('categoryId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = searchParams.get('page');
    const pageSize = searchParams.get('pageSize');
    const fields = searchParams.get('fields');

    // Build filter conditions
    const where: {
      userId: string;
      type?: string;
      categoryId?: string;
      date?: { gte?: Date; lte?: Date };
    } = {
      userId: auth.userId,
    };

    if (type) {
      if (!VALID_TRANSACTION_TYPES.has(type)) {
        return NextResponse.json(
          { error: 'Tipe transaksi tidak valid' },
          { status: 400 }
        );
      }

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

    if (dateFrom) {
      const parsedDateFrom = parseTransactionDateValue(dateFrom);

      if (!parsedDateFrom) {
        return NextResponse.json(
          { error: 'Tanggal mulai filter tidak valid' },
          { status: 400 }
        );
      }

      const normalizedDateFrom = toFilterDayBoundary(parsedDateFrom, 'start');
      where.date = {
        ...where.date,
        gte:
          where.date?.gte && where.date.gte.getTime() > normalizedDateFrom.getTime()
            ? where.date.gte
            : normalizedDateFrom,
      };
    }

    if (dateTo) {
      const parsedDateTo = parseTransactionDateValue(dateTo);

      if (!parsedDateTo) {
        return NextResponse.json(
          { error: 'Tanggal akhir filter tidak valid' },
          { status: 400 }
        );
      }

      const normalizedDateTo = toFilterDayBoundary(parsedDateTo, 'end');
      where.date = {
        ...where.date,
        lte:
          where.date?.lte && where.date.lte.getTime() < normalizedDateTo.getTime()
            ? where.date.lte
            : normalizedDateTo,
      };
    }

    if (
      where.date?.gte &&
      where.date?.lte &&
      where.date.gte.getTime() > where.date.lte.getTime()
    ) {
      if (page || pageSize) {
        return createPrivateReadResponse({
          items: [],
          page: 1,
          pageSize: pageSize ? Number.parseInt(pageSize, 10) : DEFAULT_HISTORY_PAGE_SIZE,
          totalCount: 0,
          totalPages: 0,
        });
      }

      return createPrivateReadResponse([]);
    }

    if (fields === 'ids') {
      const transactionIds = await prisma.transaction.findMany({
        where,
        select: {
          id: true,
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      });

      return createPrivateReadResponse({
        ids: transactionIds.map((transaction) => transaction.id),
      });
    }

    if (page || pageSize) {
      const normalizedPage = page ? Number.parseInt(page, 10) : 1;
      const normalizedPageSize = pageSize
        ? Number.parseInt(pageSize, 10)
        : DEFAULT_HISTORY_PAGE_SIZE;

      if (!Number.isInteger(normalizedPage) || normalizedPage < 1) {
        return NextResponse.json(
          { error: 'Halaman histori tidak valid' },
          { status: 400 }
        );
      }

      if (
        !Number.isInteger(normalizedPageSize) ||
        normalizedPageSize < 1 ||
        normalizedPageSize > MAX_HISTORY_PAGE_SIZE
      ) {
        return NextResponse.json(
          { error: `Ukuran halaman histori harus 1-${MAX_HISTORY_PAGE_SIZE}` },
          { status: 400 }
        );
      }

      const [items, totalCount] = await Promise.all([
        prisma.transaction.findMany({
          where,
          include: {
            category: true,
          },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
          skip: (normalizedPage - 1) * normalizedPageSize,
          take: normalizedPageSize,
        }),
        prisma.transaction.count({ where }),
      ]);

      return createPrivateReadResponse({
        items,
        page: normalizedPage,
        pageSize: normalizedPageSize,
        totalCount,
        totalPages: totalCount === 0 ? 0 : Math.ceil(totalCount / normalizedPageSize),
      });
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    return createPrivateReadResponse(transactions);
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
    const auth = await requireAuthClaims();
    const body = await request.json();
    const { amount, description, categoryId, type, date, notes } = body;
    const parsedDate = parseTransactionDateValue(date);

    // Get category to ensure type matches
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
        userId: auth.userId,
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
