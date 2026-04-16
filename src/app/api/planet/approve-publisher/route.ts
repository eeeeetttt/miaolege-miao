import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { planetApplications, planets, planetMembers } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { planetId, userId } = await request.json();

    if (!planetId || !userId) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
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

    // Update application status
    await db
      .update(planetApplications)
      .set({ status: 'approved', handledAt: new Date() })
      .where(and(
        eq(planetApplications.planetId, planetId),
        eq(planetApplications.userId, userId)
      ));

    // Update member role
    await db
      .update(planetMembers)
      .set({ role: 'publisher' })
      .where(and(
        eq(planetMembers.planetId, planetId),
        eq(planetMembers.userId, userId)
      ));

    return NextResponse.json({ success: true, message: '已批准申请' });
  } catch (error) {
    console.error('Approve publisher error:', error);
    return NextResponse.json({ error: '批准失败' }, { status: 500 });
  }
}
