import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { planetApplications, planets, users } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
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

    // Get pending applications
    const applications = await db
      .select({
        id: planetApplications.id,
        userId: planetApplications.userId,
        userName: users.name,
        userEmail: users.email,
        appliedAt: planetApplications.appliedAt,
        status: planetApplications.status,
      })
      .from(planetApplications)
      .innerJoin(users, eq(planetApplications.userId, users.userId))
      .where(eq(planetApplications.planetId, parseInt(planetId)));

    return NextResponse.json({ applications });
  } catch (error) {
    console.error('Get applications error:', error);
    return NextResponse.json({ error: '获取申请列表失败' }, { status: 500 });
  }
}
