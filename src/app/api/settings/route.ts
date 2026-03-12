import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isAuthError, requireAuthClaims } from '@/lib/auth-server';

export async function GET() {
  try {
    const auth = await requireAuthClaims();

    const settings = await prisma.userSettings.findUnique({
      where: { userId: auth.userId },
    });

    if (!settings) {
      // Create default settings if not exists
      const newSettings = await prisma.userSettings.create({
        data: {
          userId: auth.userId,
          monthlyIncome: 0,
          savingsPercentage: 20,
        },
      });
      return NextResponse.json(newSettings);
    }

    return NextResponse.json(settings);
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuthClaims();

    const body = await request.json();
    const { monthlyIncome, savingsPercentage } = body;

    const settings = await prisma.userSettings.upsert({
      where: { userId: auth.userId },
      update: {
        monthlyIncome: monthlyIncome ?? undefined,
        savingsPercentage: savingsPercentage ?? undefined,
      },
      create: {
        userId: auth.userId,
        monthlyIncome: monthlyIncome ?? 0,
        savingsPercentage: savingsPercentage ?? 20,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
