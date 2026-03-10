import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const totalUsers = await prisma.user.count();
    const metricEnabled = process.env.ENABLE_ACTIVE_USERS_METRIC === 'true';

    return NextResponse.json({
      activeUsers: metricEnabled ? totalUsers : 0,
      totalUsers,
      metricEnabled,
      source: metricEnabled ? 'user_count_fallback' : 'disabled',
    });
  } catch (error) {
    console.error('Error fetching active users:', error);
    return NextResponse.json({
      activeUsers: 0,
      totalUsers: 0,
      metricEnabled: false,
      source: 'error',
    });
  }
}
