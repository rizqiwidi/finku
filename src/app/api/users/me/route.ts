import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isAuthError, requireAuthUser } from '@/lib/auth-server';
import { hashPassword, normalizeOptionalText } from '@/lib/user-service';

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

    console.error('Error fetching self profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authUser = await requireAuthUser();
    const body = await request.json();
    const { name, email, password } = body;

    const updateData: {
      name?: string | null;
      email?: string | null;
      password?: string;
    } = {};

    if (name !== undefined) {
      updateData.name = normalizeOptionalText(name);
    }

    if (email !== undefined) {
      updateData.email = normalizeOptionalText(email);
    }

    if (password) {
      updateData.password = await hashPassword(password);
    }

    const user = await prisma.user.update({
      where: { id: authUser.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Error updating self profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
