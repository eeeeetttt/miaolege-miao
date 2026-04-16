import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { challengeRegistrations, challengeLevelRecords, challengeHallOfFame, users } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 通关目标净值
const TARGET_BALANCE = 2000;
// 失败底线净值
const FAIL_BALANCE = 100;

// 发送系统消息到聊天大厅
async function sendSystemMessage(type: string, userName: string, level: number, balance?: number) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.error('Supabase client not available');
      return;
    }

    let content = '';
    if (type === 'level_passed') {
      content = `🎉 恭喜 ${userName} 用户净值达到${balance}，顺利通过第${level}关！`;
    } else if (type === 'challenge_failed') {
      content = `😢 遗憾！${userName} 在第${level}关净值跌破底线，挑战失败。没关系，重新振作再来一次！`;
    } else if (type === 'challenge_completed') {
      content = `🏆 太厉害了！${userName} 完成全部挑战，成功通关K线征途！`;
    }

    if (content) {
      await supabase.from('chat_hall_messages').insert({
        user_id: 'system',
        user_name: '系统通知',
        user_avatar: null,
        content,
        is_system: 1,
        is_premium: 0,
      });
    }
  } catch (error) {
    console.error('Failed to send system message:', error);
  }
}

// 获取用户名
async function getUserName(userId: string): Promise<string> {
  try {
    const user = await db.select({ name: users.name }).from(users).where(eq(users.userId, userId)).limit(1);
    return user[0]?.name || '神秘玩家';
  } catch {
    return '神秘玩家';
  }
}

// 更新账户净值（模拟）
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const userId = session.user.id;
    const { balance } = await request.json();

    if (typeof balance !== 'number' || balance < 0) {
      return NextResponse.json({ error: '无效的账户净值' }, { status: 400 });
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

    const currentLevel = registration.currentLevel ?? 1;

    // 检查是否通关（净值达到2000）
    if (balance >= TARGET_BALANCE) {
      // 检查是否已通关但余额未重置（需要等待余额重置为1000才能进入下一关）
      // 这里先记录通关状态，等待余额重置
      
      return NextResponse.json({
        success: true,
        levelCompleted: true,
        message: `恭喜完成第${currentLevel}关！请将账户余额重置为1000后继续挑战`,
        nextStep: 'reset_balance',
        targetBalance: TARGET_BALANCE,
        resetBalance: 1000,
      });
    }

    // 检查是否失败（净值低于100）
    if (balance < FAIL_BALANCE) {
      const userName = await getUserName(userId);
      
      // 创建关卡记录
      await db.insert(challengeLevelRecords).values({
        registrationId: registration.id,
        level: currentLevel,
        startedAt: new Date(),
        completedAt: new Date(),
        duration: Math.floor((Date.now() - new Date(registration.startedAt!).getTime()) / 1000),
        status: 'failed',
      });

      // 更新为失败状态
      await db.update(challengeRegistrations)
        .set({
          status: 'failed',
          failedAt: new Date(),
          failedLevel: currentLevel,
        })
        .where(eq(challengeRegistrations.id, registration.id));

      // 发送系统消息到聊天大厅
      await sendSystemMessage('challenge_failed', userName, currentLevel);

      return NextResponse.json({
        success: true,
        failed: true,
        message: `挑战失败！账户净值低于${FAIL_BALANCE}`,
        currentBalance: balance,
        failBalance: FAIL_BALANCE,
      });
    }

    // 继续挑战
    return NextResponse.json({
      success: true,
      levelCompleted: false,
      failed: false,
      currentBalance: balance,
      targetBalance: TARGET_BALANCE,
      failBalance: FAIL_BALANCE,
      progress: ((balance - 1000) / 1000 * 100).toFixed(1), // 距离通关的进度百分比
    });
  } catch (error) {
    console.error('Update balance error:', error);
    return NextResponse.json({ 
      error: '操作失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// 完成关卡（余额已重置）
export async function POST(request: NextRequest) {
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

    const currentLevel = registration.currentLevel ?? 1;
    const userName = await getUserName(userId);

    // 创建关卡记录
    await db.insert(challengeLevelRecords).values({
      registrationId: registration.id,
      level: currentLevel,
      startedAt: new Date(),
      completedAt: new Date(),
      duration: 0,
      status: 'completed',
    });

    // 更新已完成的关卡列表
    const completedLevels = JSON.parse(registration.completedLevels || '[]');
    completedLevels.push(currentLevel);

    // 检查是否通关（第10关）
    const isCompleted = currentLevel === 10;
    
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
        displayName: '通关大师',
      });

      // 发送通关系统消息到聊天大厅
      await sendSystemMessage('challenge_completed', userName, currentLevel);

      return NextResponse.json({
        success: true,
        completed: true,
        message: '恭喜通关！你是真正的交易大师！',
        totalDuration,
        completedLevels,
        rewards: {
          cash: '100,000元人民币',
          trophy: '「K线征途冠军」定制奖杯',
        },
      });
    } else {
      // 进入下一关
      await db.update(challengeRegistrations)
        .set({
          currentLevel: currentLevel + 1,
          completedLevels: JSON.stringify(completedLevels),
          startedAt: new Date(), // 重置开始时间
        })
        .where(eq(challengeRegistrations.id, registration.id));

      // 发送关卡通过系统消息到聊天大厅（余额已重置为1000）
      await sendSystemMessage('level_passed', userName, currentLevel, 1000);

      return NextResponse.json({
        success: true,
        completed: false,
        levelCompleted: true,
        nextLevel: currentLevel + 1,
        completedLevels,
        message: `恭喜完成第${currentLevel}关！已解锁第${currentLevel + 1}关`,
        nextStep: 'start_next_level',
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

    const currentLevel = registration.currentLevel ?? 1;
    const userName = await getUserName(userId);

    // 更新为失败状态（主动放弃）
    await db.update(challengeRegistrations)
      .set({
        status: 'failed',
        failedAt: new Date(),
        failedLevel: currentLevel,
      })
      .where(eq(challengeRegistrations.id, registration.id));

    // 发送系统消息到聊天大厅
    await sendSystemMessage('challenge_failed', userName, currentLevel);

    return NextResponse.json({
      success: true,
      message: '已放弃挑战，报名费不予退还',
      failedLevel: currentLevel,
      note: '重新开始需再次支付1000星球币',
    });
  } catch (error) {
    console.error('Abandon challenge error:', error);
    return NextResponse.json({ 
      error: '操作失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
