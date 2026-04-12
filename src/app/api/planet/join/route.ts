import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { planets, planetMembers, users, planetEarnings } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { planetId, method, inviteCode } = await request.json();

    if (!planetId) {
      return NextResponse.json({ error: '星球ID为必填项' }, { status: 400 });
    }

    // Get planet info
    const [planet] = await db
      .select()
      .from(planets)
      .where(eq(planets.id, planetId))
      .limit(1);

    if (!planet) {
      return NextResponse.json({ error: '星球不存在' }, { status: 404 });
    }

    // Check if already a member
    const [existingMember] = await db
      .select()
      .from(planetMembers)
      .where(and(
        eq(planetMembers.planetId, planetId),
        eq(planetMembers.userId, session.user.id)
      ))
      .limit(1);

    if (existingMember) {
      return NextResponse.json({ error: '您已经是该星球成员' }, { status: 400 });
    }

    // Validate join method
    if (method === 'invite') {
      if (!inviteCode || inviteCode !== planet.inviteCode) {
        return NextResponse.json({ error: '邀请码无效' }, { status: 400 });
      }
    } else if (method === 'purchase') {
      // Get user balance
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.userId, session.user.id))
        .limit(1);

      const userBalance = user?.coinBalance ?? 0;
      const ticketPrice = planet.ticketPrice ?? 0;

      if (!user || userBalance < ticketPrice) {
        return NextResponse.json({ error: 'U 余额不足' }, { status: 400 });
      }

      // Deduct balance
      await db
        .update(users)
        .set({ coinBalance: userBalance - ticketPrice })
        .where(eq(users.userId, session.user.id));

      // Add to planet earnings
      await db.insert(planetEarnings).values({
        planetId,
        userId: session.user.id,
        amount: ticketPrice,
        type: 'ticket',
      });
    }

    // Add member
    const durationDays = planet.durationDays ?? 365;
    const expiryDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    
    await db.insert(planetMembers).values({
      planetId,
      userId: session.user.id,
      role: 'follower',
      joinMethod: method,
      ticketPaid: method === 'purchase' ? (planet.ticketPrice ?? 0) : 0,
      expiryDate,
    });

    return NextResponse.json({
      success: true,
      message: '成功加入星球',
      expiryDate,
    });
  } catch (error) {
    console.error('Join planet error:', error);
    return NextResponse.json({ error: '加入星球失败' }, { status: 500 });
  }
}
