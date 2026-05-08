import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { userAccounts } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ goldBalance: 0, coinBalance: 0 });
    }

    const user = await db
      .select({
        goldBalance: userAccounts.goldBalance,
        coinBalance: userAccounts.coinBalance,
      })
      .from(userAccounts)
      .where(eq(userAccounts.email, session.user.email))
      .limit(1);

    if (!user.length) {
      return NextResponse.json({ goldBalance: 0, coinBalance: 0 });
    }

    return NextResponse.json({
      goldBalance: Number(user[0].goldBalance || 0),
      coinBalance: Number(user[0].coinBalance || 0),
    });
  } catch (error) {
    console.error('Get balance error:', error);
    return NextResponse.json({ goldBalance: 0, coinBalance: 0 });
  }
}
