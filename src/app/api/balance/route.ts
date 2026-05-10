import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ goldBalance: 0, coinBalance: 0 });
    }

    const users = await query(
      'SELECT gold_balance, coin_balance FROM users WHERE email = ?',
      [session.user.email]
    );

    if (!users || users.length === 0) {
      return NextResponse.json({ goldBalance: 0, coinBalance: 0 });
    }

    return NextResponse.json({
      goldBalance: Number(users[0].gold_balance || 0),
      coinBalance: Number(users[0].coin_balance || 0),
    });
  } catch (error) {
    console.error('Get balance error:', error);
    return NextResponse.json({ goldBalance: 0, coinBalance: 0 });
  }
}
