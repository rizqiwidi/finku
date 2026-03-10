import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isAuthError, requireAuthUser } from '@/lib/auth-server';

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuthUser();
    const body = await request.json();
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown) => typeof id === 'string') : [];

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one transaction id is required' },
        { status: 400 }
      );
    }

    const result = await prisma.transaction.deleteMany({
      where: {
        userId: user.id,
        id: { in: ids },
      },
    });

    return NextResponse.json({ deletedCount: result.count });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Error deleting transactions in bulk:', error);
    return NextResponse.json(
      { error: 'Failed to delete transactions' },
      { status: 500 }
    );
  }
}
