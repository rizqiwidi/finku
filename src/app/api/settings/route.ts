import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isAuthError, requireAuthUser } from '@/lib/auth-server';

export async function GET() {
  try {
    const user = await requireAuthUser();

    const settings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    });

    if (!settings) {
      // Create default settings if not exists
      const newSettings = await prisma.userSettings.create({
        data: {
          userId: user.id,
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
    const user = await requireAuthUser();

    const body = await request.json();
    const { monthlyIncome, savingsPercentage } = body;

    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {
        monthlyIncome: monthlyIncome ?? undefined,
        savingsPercentage: savingsPercentage ?? undefined,
      },
      create: {
        userId: user.id,
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
