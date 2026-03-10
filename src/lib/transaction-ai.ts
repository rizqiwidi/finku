import { getGroqApiKey } from '@/lib/env';
import {
  buildHeuristicDraftFromText,
  suggestedTransactionDraftSchema,
  type CategoryOption,
  type SuggestedTransactionDraft,
} from '@/lib/transaction-drafts';

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';

function buildCategoryContext(categories: CategoryOption[]) {
  return ['expense', 'income', 'savings']
    .map((type) => {
      const labels = categories
        .filter((category) => category.type === type)
        .map((category) => category.name)
        .join(', ');

      return `${type}: ${labels || '-'}`;
    })
    .join('\n');
}

function extractJsonObject(content: string) {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI response did not contain a JSON object');
  }

  return content.slice(start, end + 1);
}

export async function inferTransactionDraftWithGroq(params: {
  sourceText: string;
  categories: CategoryOption[];
  sourceLabel: 'chat' | 'voice' | 'receipt';
}) {
  const apiKey = getGroqApiKey();
  const fallbackDraft = buildHeuristicDraftFromText(params.sourceText, params.categories);

  const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'Anda adalah extractor transaksi keuangan pribadi berbahasa Indonesia.',
            'Balas hanya dengan JSON object yang valid.',
            'Field wajib: type, amount, description, categoryName, date, notes, merchantName, confidence, reasoning.',
            'type harus salah satu: income, expense, savings.',
            'amount adalah angka bulat rupiah tanpa simbol mata uang.',
            'date gunakan ISO 8601 jika jelas, jika tidak null.',
            'Gunakan categoryName yang paling dekat dari daftar kategori user bila memungkinkan.',
            'Jika ini struk, default type = expense kecuali sangat jelas income atau tabungan.',
          ].join(' '),
        },
        {
          role: 'user',
          content: [
            `Sumber input: ${params.sourceLabel}.`,
            'Kategori user yang tersedia:',
            buildCategoryContext(params.categories),
            'Teks yang harus dipahami:',
            params.sourceText,
            'Susun draft transaksi yang paling mungkin dan sertakan reasoning singkat.',
          ].join('\n\n'),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq request failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (typeof content !== 'string' || content.trim().length === 0) {
    return fallbackDraft;
  }

  try {
    return suggestedTransactionDraftSchema.parse(JSON.parse(extractJsonObject(content)));
  } catch {
    return fallbackDraft;
  }
}

export function mergeDraftWithFallback(
  draft: SuggestedTransactionDraft,
  fallback: SuggestedTransactionDraft
) {
  return suggestedTransactionDraftSchema.parse({
    type: draft.type ?? fallback.type,
    amount: draft.amount ?? fallback.amount ?? null,
    description: draft.description ?? fallback.description ?? null,
    categoryName: draft.categoryName ?? fallback.categoryName ?? null,
    date: draft.date ?? fallback.date ?? null,
    notes: draft.notes ?? fallback.notes ?? null,
    merchantName: draft.merchantName ?? fallback.merchantName ?? null,
    confidence: draft.confidence ?? fallback.confidence ?? null,
    reasoning: draft.reasoning ?? fallback.reasoning ?? null,
  });
}
