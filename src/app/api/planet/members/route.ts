import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { planets, planetMembers, users, followRecords } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';

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

    // Get follow status for each member
    const membersWithFollowStatus = await Promise.all(
      members.map(async (member) => {
        // 查询该成员在此星球的跟单记录，按时间倒序取最新的一条
        const follows = await db
          .select({
            status: followRecords.status,
          })
          .from(followRecords)
          .where(and(
            eq(followRecords.userId, member.userId),
            eq(followRecords.planetId, parseInt(planetId))
          ))
          .orderBy(desc(followRecords.createdAt))
          .limit(1);

        return {
          ...member,
          followStatus: follows[0]?.status || null,
        };
      })
    );

    return NextResponse.json({ members: membersWithFollowStatus });
  } catch (error) {
    console.error('Get members error:', error);
    return NextResponse.json({ error: '获取成员列表失败' }, { status: 500 });
  }
}
