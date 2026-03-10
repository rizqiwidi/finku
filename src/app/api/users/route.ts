import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isAuthError, requireAdminUser } from '@/lib/auth-server';
import { createUserWithDefaults, normalizeOptionalText } from '@/lib/user-service';

export async function GET() {
  try {
    await requireAdminUser();

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser();

    const body = await request.json();
    const { username, password, name, email, role } = body;
    const normalizedUsername = typeof username === 'string' ? username.trim() : '';

    if (!normalizedUsername || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Check if username exists
    const existingUser = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }

    const user = await createUserWithDefaults({
      username: normalizedUsername,
      password,
      name: normalizeOptionalText(name),
      email: normalizeOptionalText(email),
      role: role || 'user',
    });

    return NextResponse.json(
      {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
