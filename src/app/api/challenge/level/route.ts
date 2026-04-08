import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { challengeRegistrations, challengeLevelRecords, challengeHallOfFame } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

// 完成关卡
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const userId = session.user.id;
    const { level, duration } = await request.json();

    if (!level || level < 1 || level > 10) {
      return NextResponse.json({ error: '无效的关卡号' }, { status: 400 });
    }

    // 获取当前挑战
    const registration = await db.query.challengeRegistrations.findFirst({
      where: and(
        eq(challengeRegistrations.userId, userId),
        eq(challengeRegistrations.status, 'active')
      ),
    });

    if (!registration) {
      return NextResponse.json({ error: '没有进行中的挑战' }, { status: 400 });
    }

    // 验证关卡顺序
    if (level !== registration.currentLevel) {
      return NextResponse.json({ 
        error: `请先完成第${registration.currentLevel}关` 
      }, { status: 400 });
    }

    // 创建关卡记录
    await db.insert(challengeLevelRecords).values({
      registrationId: registration.id,
      level,
      startedAt: new Date(Date.now() - (duration || 0) * 1000),
      completedAt: new Date(),
      duration: duration || 0,
      status: 'completed',
    });

    // 更新已完成的关卡列表
    const completedLevels = JSON.parse(registration.completedLevels || '[]');
    completedLevels.push(level);

    // 检查是否通关
    const isCompleted = level === 10;
    
    if (isCompleted) {
      // 计算总耗时
      const startedAt = new Date(registration.startedAt!).getTime();
      const totalDuration = Math.floor((Date.now() - startedAt) / 1000);

      // 更新为完成状态
      await db.update(challengeRegistrations)
        .set({
          currentLevel: 11,
          completedLevels: JSON.stringify(completedLevels),
          status: 'completed',
          completedAt: new Date(),
          totalDuration,
        })
        .where(eq(challengeRegistrations.id, registration.id));

      // 添加到名人堂
      await db.insert(challengeHallOfFame).values({
        userId,
        registrationId: registration.id,
        completedAt: new Date(),
        totalDuration,
        isAnonymous: false,
        displayName: '匿名用户',
      });

      return NextResponse.json({
        success: true,
        completed: true,
        message: '恭喜通关！',
        totalDuration,
        completedLevels,
      });
    } else {
      // 继续下一关
      await db.update(challengeRegistrations)
        .set({
          currentLevel: level + 1,
          completedLevels: JSON.stringify(completedLevels),
        })
        .where(eq(challengeRegistrations.id, registration.id));

      return NextResponse.json({
        success: true,
        completed: false,
        nextLevel: level + 1,
        completedLevels,
      });
    }
  } catch (error) {
    console.error('Complete level error:', error);
    return NextResponse.json({ 
      error: '操作失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// 放弃挑战
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const userId = session.user.id;

    // 获取当前挑战
    const registration = await db.query.challengeRegistrations.findFirst({
      where: and(
        eq(challengeRegistrations.userId, userId),
        eq(challengeRegistrations.status, 'active')
      ),
    });

    if (!registration) {
      return NextResponse.json({ error: '没有进行中的挑战' }, { status: 400 });
    }

    // 更新为失败状态
    await db.update(challengeRegistrations)
      .set({
        status: 'failed',
        failedAt: new Date(),
        failedLevel: registration.currentLevel,
      })
      .where(eq(challengeRegistrations.id, registration.id));

    return NextResponse.json({
      success: true,
      message: '已放弃挑战',
      failedLevel: registration.currentLevel,
    });
  } catch (error) {
    console.error('Abandon challenge error:', error);
    return NextResponse.json({ 
      error: '操作失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
