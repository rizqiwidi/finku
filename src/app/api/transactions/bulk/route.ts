import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isAuthError, requireAuthClaims } from '@/lib/auth-server';
import {
  DEFAULT_IMPORT_CATEGORY_META,
  FinanceBulkValidationError,
  MAX_BULK_IMPORT_ROWS,
  normalizeBulkImportTransactions,
  normalizeCategoryKey,
} from '@/lib/finance-bulk';
import { getJakartaNowTimestamp } from '@/lib/date-input';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthClaims();
    const body = await request.json();
    const normalizedTransactions = normalizeBulkImportTransactions(body?.transactions);

    if (normalizedTransactions.length === 0) {
      return NextResponse.json(
        { error: 'Minimal satu transaksi valid diperlukan untuk import.' },
        { status: 400 }
      );
    }

    if (normalizedTransactions.length > MAX_BULK_IMPORT_ROWS) {
      return NextResponse.json(
        { error: `Maksimal ${MAX_BULK_IMPORT_ROWS} baris transaksi per import.` },
        { status: 400 }
      );
    }

    const transactionTypes = [...new Set(normalizedTransactions.map((item) => item.type))];
    const timestamp = getJakartaNowTimestamp();

    const result = await prisma.$transaction(async (tx) => {
      const existingCategories = await tx.category.findMany({
        where: {
          userId: auth.userId,
          type: { in: transactionTypes },
        },
        select: {
          id: true,
          name: true,
          type: true,
        },
      });

      const categoryMap = new Map(
        existingCategories.map((category) => [
          normalizeCategoryKey(category.type, category.name),
          category,
        ])
      );
      const missingCategories = new Map<
        string,
        {
          name: string;
          type: 'income' | 'expense' | 'savings';
        }
      >();

      for (const transaction of normalizedTransactions) {
        const key = normalizeCategoryKey(transaction.type, transaction.category);

        if (!categoryMap.has(key) && !missingCategories.has(key)) {
          missingCategories.set(key, {
            name: transaction.category,
            type: transaction.type,
          });
        }
      }

      const createdCategories = await Promise.all(
        [...missingCategories.values()].map((category) => {
          const categoryMeta = DEFAULT_IMPORT_CATEGORY_META[category.type];

          return tx.category.create({
            data: {
              name: category.name,
              type: category.type,
              icon: categoryMeta.icon,
              color: categoryMeta.color,
              allocationPercentage: 0,
              budget: category.type === 'expense' ? 0 : null,
              userId: auth.userId,
            },
            select: {
              id: true,
              name: true,
              type: true,
            },
          });
        })
      );

      for (const category of createdCategories) {
        categoryMap.set(normalizeCategoryKey(category.type, category.name), category);
      }

      await tx.transaction.createMany({
        data: normalizedTransactions.map((transaction) => {
          const category = categoryMap.get(
            normalizeCategoryKey(transaction.type, transaction.category)
          );

          if (!category) {
            throw new FinanceBulkValidationError(
              `Kategori ${transaction.category} gagal dipetakan.`
            );
          }

          return {
            amount: transaction.amount,
            description: transaction.description,
            type: transaction.type,
            date: transaction.date,
            notes: transaction.notes,
            categoryId: category.id,
            userId: auth.userId,
            createdAt: timestamp,
            updatedAt: timestamp,
          };
        }),
      });

      return {
        createdCategoryCount: createdCategories.length,
        importedCount: normalizedTransactions.length,
      };
    });

    return NextResponse.json(result, { status: 201 });
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

    console.error('Error importing transactions in bulk:', error);
    return NextResponse.json(
      { error: 'Gagal mengimpor transaksi.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuthClaims();
    const body = await request.json();
    const ids = Array.isArray(body?.ids)
      ? body.ids.filter((id: unknown) => typeof id === 'string')
      : [];

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one transaction id is required' },
        { status: 400 }
      );
    }

    const result = await prisma.transaction.deleteMany({
      where: {
        userId: auth.userId,
        id: { in: ids },
      },
    });

    return NextResponse.json({ deletedCount: result.count });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Error deleting transactions in bulk:', error);
    return NextResponse.json(
      { error: 'Failed to delete transactions' },
      { status: 500 }
    );
  }
}
