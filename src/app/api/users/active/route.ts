import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    // Get total users count as "active users" for demo
    // In production, you would track actual active sessions
    const totalUsers = await prisma.user.count();
    
    // Generate a random "online" count (between 60-80% of total users)
    // This simulates real-time active users
    const activePercentage = 0.6 + Math.random() * 0.2;
    const activeCount = Math.max(1, Math.floor(totalUsers * activePercentage));
    
    // Add some random fluctuation for demo effect
    const displayCount = activeCount + Math.floor(Math.random() * 5);
    
    return NextResponse.json({ 
      activeUsers: displayCount,
      totalUsers 
    });
  } catch (error) {
    console.error('Error fetching active users:', error);
    return NextResponse.json({ 
      activeUsers: 1,
      totalUsers: 1 
    });
  }
}
