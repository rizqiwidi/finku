import { NextResponse } from 'next/server';

const PRIVATE_READ_HEADERS = {
  'Cache-Control': 'private, no-cache, max-age=0, must-revalidate',
  Vary: 'Cookie',
} as const;

export function createPrivateReadResponse<T>(payload: T) {
  return NextResponse.json(payload, {
    headers: PRIVATE_READ_HEADERS,
  });
}
