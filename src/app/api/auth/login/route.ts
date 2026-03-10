import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { AUTH_COOKIE_NAME, createAuthToken } from '@/lib/auth-server';
import { isPasswordHash } from '@/lib/user-service';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    const normalizedUsername = typeof username === 'string' ? username.trim() : '';

    if (!normalizedUsername || !password) {
      return NextResponse.json(
        { error: 'Username dan password harus diisi' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Username atau password salah' },
        { status: 401 }
      );
    }

    if (!isPasswordHash(user.password)) {
      console.error(`User ${user.username} still has a plaintext password. Run scripts/migrate-password-hash.ts.`);
      return NextResponse.json(
        { error: 'Akun belum siap login. Hubungi admin untuk migrasi password.' },
        { status: 503 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Username atau password salah' },
        { status: 401 }
      );
    }

    const token = await createAuthToken(user);

    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat login' },
      { status: 500 }
    );
  }
}
