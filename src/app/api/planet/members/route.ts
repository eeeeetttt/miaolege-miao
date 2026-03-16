import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { planets, planetMembers, users } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const planetId = searchParams.get('planetId');

    if (!planetId) {
      return NextResponse.json({ error: '星球ID为必填项' }, { status: 400 });
    }

    // Check if user is owner
    const [planet] = await db
      .select()
      .from(planets)
      .where(eq(planets.id, parseInt(planetId)))
      .limit(1);

    if (!planet || planet.creatorId !== session.user.id) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    // Get members
    const members = await db
      .select({
        userId: planetMembers.userId,
        userName: users.name,
        userEmail: users.email,
        role: planetMembers.role,
        joinMethod: planetMembers.joinMethod,
        ticketPaid: planetMembers.ticketPaid,
        joinedAt: planetMembers.joinedAt,
        expiryDate: planetMembers.expiryDate,
      })
      .from(planetMembers)
      .innerJoin(users, eq(planetMembers.userId, users.userId))
      .where(eq(planetMembers.planetId, parseInt(planetId)));

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Get members error:', error);
    return NextResponse.json({ error: '获取成员列表失败' }, { status: 500 });
  }
}
