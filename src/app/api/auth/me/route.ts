import { NextResponse } from 'next/server';
import { isAuthError, requireAuthUser } from '@/lib/auth-server';

export async function GET() {
  try {
    const user = await requireAuthUser();
    return NextResponse.json({ user });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Failed to verify auth session' },
      { status: 500 }
    );
  }
}
