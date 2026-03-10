import { NextResponse } from 'next/server';
import { isAuthError, requireAuthUser } from '@/lib/auth-server';
import { getGroqApiKey } from '@/lib/env';

const GROQ_TRANSCRIPT_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

export async function POST(request: Request) {
  try {
    await requireAuthUser();
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File audio wajib diisi.' }, { status: 400 });
    }

    const payload = new FormData();
    payload.append('file', file, file.name || 'voice-note.webm');
    payload.append('model', 'whisper-large-v3-turbo');
    payload.append('language', 'id');
    payload.append('response_format', 'json');
    payload.append('temperature', '0');

    const response = await fetch(GROQ_TRANSCRIPT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getGroqApiKey()}`,
      },
      body: payload,
    });

    if (!response.ok) {
      throw new Error(`Groq transcription failed: ${response.status}`);
    }

    const data = await response.json();
    const text = typeof data.text === 'string' ? data.text.trim() : '';

    if (!text) {
      return NextResponse.json({ error: 'Transkrip suara kosong.' }, { status: 422 });
    }

    return NextResponse.json({ text });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Error transcribing audio:', error);
    return NextResponse.json({ error: 'Gagal mentranskrip suara.' }, { status: 500 });
  }
}
