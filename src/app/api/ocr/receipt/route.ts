import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isAuthError, requireAuthUser } from '@/lib/auth-server';
import { getOcrSpaceApiKey } from '@/lib/env';
import { inferTransactionDraftsWithGroq } from '@/lib/transaction-ai';
import { buildHeuristicDraftFromText } from '@/lib/transaction-drafts';
import type { TransactionType } from '@/types';

const OCR_SPACE_URL = 'https://api.ocr.space/parse/image';

interface OcrSpaceResponse {
  OCRExitCode?: number;
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string[] | string;
  ErrorDetails?: string | string[];
  ParsedResults?: Array<{
    ParsedText?: string;
  }>;
}

function toErrorMessage(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(' ');
  }

  return value?.trim() || null;
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthUser();
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File struk wajib diisi.' }, { status: 400 });
    }

    const payload = new FormData();
    payload.append('apikey', getOcrSpaceApiKey());
    payload.append('language', 'eng');
    payload.append('isOverlayRequired', 'false');
    payload.append('scale', 'true');
    payload.append('detectOrientation', 'true');
    payload.append('OCREngine', '2');
    payload.append('file', file, file.name || 'receipt-image');

    const response = await fetch(OCR_SPACE_URL, {
      method: 'POST',
      body: payload,
    });

    if (!response.ok) {
      throw new Error(`OCR.Space request failed: ${response.status}`);
    }

    const data = (await response.json()) as OcrSpaceResponse;
    const parsedText = data.ParsedResults?.map((item) => item.ParsedText?.trim() ?? '')
      .filter(Boolean)
      .join('\n');
    const ocrErrorMessage =
      toErrorMessage(data.ErrorMessage) ??
      toErrorMessage(data.ErrorDetails) ??
      null;

    if (data.IsErroredOnProcessing && !parsedText) {
      return NextResponse.json(
        {
          error:
            ocrErrorMessage ??
            'OCR.Space gagal memproses file struk. Coba gunakan foto yang lebih jelas.',
        },
        { status: 422 }
      );
    }

    if (!parsedText) {
      return NextResponse.json(
        {
          error:
            ocrErrorMessage ??
            'Teks pada struk tidak berhasil dibaca. Coba foto yang lebih jelas.',
        },
        { status: 422 }
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

    const fallbackDraft = buildHeuristicDraftFromText(parsedText, categories);

    try {
      const aiDraftBundle = await inferTransactionDraftsWithGroq({
        sourceText: parsedText,
        categories,
        sourceLabel: 'receipt',
      });

      return NextResponse.json({
        parsedText,
        draft: aiDraftBundle.transactions[0] ?? fallbackDraft,
      });
    } catch {
      return NextResponse.json({
        parsedText,
        draft: fallbackDraft,
      });
    }
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Error scanning receipt:', error);
    const message =
      error instanceof Error && error.message.includes('OCR_SPACE_API_KEY')
        ? 'OCR_SPACE_API_KEY belum diisi di environment runtime.'
        : 'Gagal memproses scan struk.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
