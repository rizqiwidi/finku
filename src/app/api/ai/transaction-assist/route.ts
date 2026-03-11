import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isAuthError, requireAuthUser } from '@/lib/auth-server';
import { buildHeuristicDraftsFromText } from '@/lib/transaction-drafts';
import { inferTransactionDraftsWithGroq } from '@/lib/transaction-ai';
import type { TransactionType } from '@/types';

export async function POST(request: Request) {
  try {
    const user = await requireAuthUser();
    const body = await request.json();
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const sourceLabel =
      body.sourceLabel === 'voice' || body.sourceLabel === 'receipt' ? body.sourceLabel : 'chat';

    if (prompt.length < 5) {
      return NextResponse.json(
        { error: 'Prompt terlalu singkat untuk dianalisis.' },
        { status: 400 }
      );
    }

    const rawCategories = await prisma.category.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        type: true,
      },
    });
    const categories = rawCategories.map((category) => ({
      ...category,
      type: category.type as TransactionType,
    }));

    const fallbackDrafts = buildHeuristicDraftsFromText(prompt, categories);
    const aiDraftBundle = await inferTransactionDraftsWithGroq({
      sourceText: prompt,
      categories,
      sourceLabel,
    });

    return NextResponse.json({
      drafts: aiDraftBundle.transactions.length > 0 ? aiDraftBundle.transactions : fallbackDrafts,
      summary: aiDraftBundle.summary ?? null,
    });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Error assisting transaction draft:', error);
    return NextResponse.json(
      { error: 'Gagal menganalisis transaksi dengan AI.' },
      { status: 500 }
    );
  }
}
