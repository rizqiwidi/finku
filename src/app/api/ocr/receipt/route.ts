import { Buffer } from 'node:buffer';
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isAuthError, requireAuthUser } from '@/lib/auth-server';
import { getOcrSpaceApiKey } from '@/lib/env';
import { inferTransactionDraftsWithGroq } from '@/lib/transaction-ai';
import { buildHeuristicDraftFromText } from '@/lib/transaction-drafts';
import type { TransactionType } from '@/types';

const OCR_SPACE_URL = 'https://api.ocr.space/parse/image';
export const runtime = 'nodejs';
export const maxDuration = 60;

interface OcrSpaceResponse {
  OCRExitCode?: number;
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string[] | string;
  ErrorDetails?: string | string[];
  ParsedResults?: Array<{
    ParsedText?: string;
  }>;
}

interface ParsedOcrResponse {
  ok: boolean;
  status: number;
  data: OcrSpaceResponse | null;
  rawText: string;
}

function toErrorMessage(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(' ');
  }

  return value?.trim() || null;
}

function buildOcrPayload(apiKey: string) {
  const payload = new FormData();
  payload.append('apikey', apiKey);
  payload.append('language', 'eng');
  payload.append('isOverlayRequired', 'false');
  payload.append('scale', 'true');
  payload.append('detectOrientation', 'true');
  payload.append('OCREngine', '2');
  return payload;
}

async function sendOcrRequest(payload: FormData): Promise<ParsedOcrResponse> {
  const response = await fetch(OCR_SPACE_URL, {
    method: 'POST',
    body: payload,
  });

  const rawText = await response.text();

  try {
    return {
      ok: response.ok,
      status: response.status,
      data: JSON.parse(rawText) as OcrSpaceResponse,
      rawText,
    };
  } catch {
    return {
      ok: response.ok,
      status: response.status,
      data: null,
      rawText,
    };
  }
}

function extractParsedText(data: OcrSpaceResponse | null) {
  return data?.ParsedResults?.map((item) => item.ParsedText?.trim() ?? '').filter(Boolean).join('\n') ?? '';
}

async function convertFileToDataUri(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type || 'image/jpeg'};base64,${buffer.toString('base64')}`;
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthUser();
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File struk wajib diisi.' }, { status: 400 });
    }

    const apiKey = getOcrSpaceApiKey();
    const filePayload = buildOcrPayload(apiKey);
    filePayload.append('file', file, file.name || 'receipt-image');

    let ocrResponse = await sendOcrRequest(filePayload);
    let data = ocrResponse.data;
    let parsedText = extractParsedText(data);

    const shouldRetryWithBase64 =
      file.type.startsWith('image/') &&
      (!ocrResponse.ok || !parsedText || Boolean(data?.IsErroredOnProcessing));

    if (shouldRetryWithBase64) {
      console.warn('OCR receipt retrying with base64 payload', {
        fileName: file.name,
        fileType: file.type,
        status: ocrResponse.status,
      });
      const base64Payload = buildOcrPayload(apiKey);
      base64Payload.append('base64Image', await convertFileToDataUri(file));

      const base64Response = await sendOcrRequest(base64Payload);
      const base64ParsedText = extractParsedText(base64Response.data);

      if (base64ParsedText || !ocrResponse.ok || !data) {
        ocrResponse = base64Response;
        data = base64Response.data;
        parsedText = base64ParsedText;
      }
    }

    if (!ocrResponse.ok) {
      const upstreamMessage =
        toErrorMessage(data?.ErrorMessage) ??
        toErrorMessage(data?.ErrorDetails) ??
        (ocrResponse.rawText.trim().slice(0, 200) || null);

      console.error('OCR.Space upstream request failed', {
        status: ocrResponse.status,
        upstreamMessage,
        hasJson: Boolean(data),
      });

      return NextResponse.json(
        {
          error:
            upstreamMessage ??
            `OCR.Space request gagal dengan status ${ocrResponse.status}.`,
        },
        { status: 502 }
      );
    }

    if (!data) {
      console.error('OCR.Space returned invalid JSON payload', {
        status: ocrResponse.status,
        rawPreview: ocrResponse.rawText.slice(0, 200),
      });
      return NextResponse.json(
        {
          error: 'OCR.Space mengembalikan respons yang tidak valid. Coba lagi dengan file lain.',
        },
        { status: 502 }
      );
    }

    const ocrErrorMessage =
      toErrorMessage(data.ErrorMessage) ??
      toErrorMessage(data.ErrorDetails) ??
      null;

    if (data.IsErroredOnProcessing && !parsedText) {
      console.warn('OCR.Space processing error without parsed text', {
        ocrErrorMessage,
        fileName: file.name,
      });
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
      console.warn('OCR receipt returned empty parsed text', {
        fileName: file.name,
        ocrErrorMessage,
      });
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
