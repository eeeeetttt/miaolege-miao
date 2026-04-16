import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { planetApplications, planets } from '@/lib/schema';
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
      .set({ status: 'rejected', handledAt: new Date() })
      .where(and(
        eq(planetApplications.planetId, planetId),
        eq(planetApplications.userId, userId)
      ));

    return NextResponse.json({ success: true, message: '已拒绝申请' });
  } catch (error) {
    console.error('Reject publisher error:', error);
    return NextResponse.json({ error: '拒绝失败' }, { status: 500 });
  }
}
