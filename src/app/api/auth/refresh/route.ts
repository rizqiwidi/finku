import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  AUTH_COOKIE_NAME,
  AUTH_SESSION_MAX_AGE_SECONDS,
  createAuthToken,
  isAuthError,
  requireAuthUser,
} from '@/lib/auth-server';

export async function POST() {
  try {
    const user = await requireAuthUser();
    const token = await createAuthToken(user);
    const cookieStore = await cookies();

    cookieStore.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
      path: '/',
    });

    return NextResponse.json({ user });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Refresh session error:', error);
    return NextResponse.json(
      { error: 'Gagal memperbarui sesi login' },
      { status: 500 }
    );
  }
}
