import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { planets } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { planetId, ticketPrice } = await request.json();

    if (!planetId) {
      return NextResponse.json({ error: '星球ID为必填项' }, { status: 400 });
    }

    // Check if user is owner
    const [planet] = await db
      .select()
      .from(planets)
      .where(eq(planets.id, planetId))
      .limit(1);

    if (!planet || planet.creatorId !== session.user.id) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    // Update ticket price
    await db
      .update(planets)
      .set({ ticketPrice: ticketPrice || 0 })
      .where(eq(planets.id, planetId));

    return NextResponse.json({ success: true, message: '门票价格已更新' });
  } catch (error) {
    console.error('Set ticket price error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
