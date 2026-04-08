import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { challengeRegistrations, users } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

// 参与挑战赛报名
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const userId = session.user.id;

    // 检查是否已有活跃的挑战
    const existingRegistration = await db.query.challengeRegistrations.findFirst({
      where: and(
        eq(challengeRegistrations.userId, userId),
        eq(challengeRegistrations.status, 'active')
      ),
    });

    if (existingRegistration) {
      return NextResponse.json({ 
        error: '你已有一个正在进行中的挑战，请先完成或放弃当前挑战' 
      }, { status: 400 });
    }

    // 获取用户信息验证
    const user = await db.query.users.findFirst({
      where: eq(users.userId, userId),
    });

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 创建新报名记录
    const [insertResult] = await db.insert(challengeRegistrations).values({
      userId,
      status: 'active',
      currentLevel: 1,
      completedLevels: JSON.stringify([]),
      startedAt: new Date(),
    }).$returningId();

    // 查询完整记录
    const registration = await db.query.challengeRegistrations.findFirst({
      where: eq(challengeRegistrations.id, insertResult.id),
    });

    return NextResponse.json({
      success: true,
      message: '挑战赛报名成功',
      registration: {
        id: registration!.id,
        currentLevel: registration!.currentLevel,
        startedAt: registration!.startedAt,
      }
    });
  } catch (error) {
    console.error('Challenge registration error:', error);
    return NextResponse.json({ 
      error: '报名失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// 获取当前挑战状态
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const userId = session.user.id;

    // 获取活跃挑战
    const activeRegistration = await db.query.challengeRegistrations.findFirst({
      where: and(
        eq(challengeRegistrations.userId, userId),
        eq(challengeRegistrations.status, 'active')
      ),
    });

    if (!activeRegistration) {
      return NextResponse.json({
        hasActiveChallenge: false,
        registration: null,
      });
    }

    // 获取已通关记录
    const completedRegistrations = await db.query.challengeRegistrations.findMany({
      where: and(
        eq(challengeRegistrations.userId, userId),
        eq(challengeRegistrations.status, 'completed')
      ),
      orderBy: (registrations, { desc }) => [desc(registrations.completedAt)],
    });

    return NextResponse.json({
      hasActiveChallenge: true,
      registration: {
        id: activeRegistration.id,
        currentLevel: activeRegistration.currentLevel,
        completedLevels: JSON.parse(activeRegistration.completedLevels || '[]'),
        startedAt: activeRegistration.startedAt,
      },
      completedCount: completedRegistrations.length,
      bestRecord: completedRegistrations[0] ? {
        completedAt: completedRegistrations[0].completedAt,
        totalDuration: completedRegistrations[0].totalDuration,
      } : null,
    });
  } catch (error) {
    console.error('Get challenge status error:', error);
    return NextResponse.json({ 
      error: '获取挑战状态失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
