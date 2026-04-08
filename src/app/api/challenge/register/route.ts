import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { challengeRegistrations, users, challengeConfig, challengeLevelConfig } from '@/lib/schema';
import { eq, and, sql } from 'drizzle-orm';

// 获取挑战状态
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const userId = session.user.id;

    // 获取用户的挑战申请记录（所有状态的）
    const registrations = await db.query.challengeRegistrations.findMany({
      where: eq(challengeRegistrations.userId, userId),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });

    // 获取最新的一条记录
    const latestRegistration = registrations[0] || null;

    // 获取配置
    const configs = await db.query.challengeConfig.findMany({});
    const configMap = configs.reduce((acc, cfg) => {
      acc[cfg.configKey] = cfg.configValue;
      return acc;
    }, {} as Record<string, string>);

    // 获取关卡配置
    const levelConfigs = await db.query.challengeLevelConfig.findMany({
      where: eq(challengeLevelConfig.isActive, true),
      orderBy: (t, { asc }) => [asc(t.level)],
    });

    if (!latestRegistration) {
      return NextResponse.json({
        hasActiveChallenge: false,
        hasPendingApplication: false,
        registration: null,
        registrationFee: parseInt(configMap.registration_fee || '1000'),
        config: configMap,
        levelConfigs,
        message: '您还未申请挑战赛',
      });
    }

    // 判断状态
    const isActive = latestRegistration.status === 'active';
    const isPending = latestRegistration.status === 'pending';
    const isApproved = latestRegistration.status === 'approved';
    const isCompleted = latestRegistration.status === 'completed';
    const isFailed = latestRegistration.status === 'failed';
    const isRejected = latestRegistration.status === 'rejected';

    // 已完成或失败的挑战，可以重新报名
    const canReapply = isCompleted || isFailed || isRejected;

    return NextResponse.json({
      hasActiveChallenge: isActive,
      hasPendingApplication: isPending,
      registration: {
        id: latestRegistration.id,
        status: latestRegistration.status,
        currentLevel: latestRegistration.currentLevel,
        completedLevels: latestRegistration.completedLevels 
          ? JSON.parse(latestRegistration.completedLevels) 
          : [],
        startedAt: latestRegistration.startedAt,
        serverName: latestRegistration.serverName,
        tradingAccount: latestRegistration.tradingAccount,
        completedAt: latestRegistration.completedAt,
        failedAt: latestRegistration.failedAt,
        failedLevel: latestRegistration.failedLevel,
      },
      canReapply,
      registrationFee: parseInt(configMap.registration_fee || '1000'),
      config: configMap,
      levelConfigs,
      message: getStatusMessage(latestRegistration.status || 'pending'),
    });
  } catch (error) {
    console.error('Get challenge status error:', error);
    return NextResponse.json({ 
      error: '获取挑战状态失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// 提交挑战赛申请
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const userId = session.user.id;

    // 获取配置
    const configs = await db.query.challengeConfig.findMany({});
    const configMap = configs.reduce((acc, cfg) => {
      acc[cfg.configKey] = cfg.configValue;
      return acc;
    }, {} as Record<string, string>);

    // 检查挑战赛是否启用
    if (configMap.challenge_enabled !== 'true') {
      return NextResponse.json({ 
        error: '挑战赛已关闭，请耐心等待下次开启' 
      }, { status: 400 });
    }

    // 获取用户信息
    const user = await db.query.users.findFirst({
      where: eq(users.userId, userId),
    });

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 检查是否已有未处理的申请
    const existingPending = await db.query.challengeRegistrations.findFirst({
      where: and(
        eq(challengeRegistrations.userId, userId),
        eq(challengeRegistrations.status, 'pending')
      ),
    });

    if (existingPending) {
      return NextResponse.json({ 
        error: '您已提交过申请，请等待审核' 
      }, { status: 400 });
    }

    // 检查是否已有进行中的挑战
    const existingActive = await db.query.challengeRegistrations.findFirst({
      where: and(
        eq(challengeRegistrations.userId, userId),
        eq(challengeRegistrations.status, 'active')
      ),
    });

    if (existingActive) {
      return NextResponse.json({ 
        error: '您已有正在进行的挑战' 
      }, { status: 400 });
    }

    // 检查是否有待激活的申请
    const existingApproved = await db.query.challengeRegistrations.findFirst({
      where: and(
        eq(challengeRegistrations.userId, userId),
        eq(challengeRegistrations.status, 'approved')
      ),
    });

    if (existingApproved) {
      return NextResponse.json({ 
        error: '您的申请已通过，请等待激活' 
      }, { status: 400 });
    }

    // 检查星球币余额
    const registrationFee = parseInt(configMap.registration_fee || '1000');
    const currentBalance = user.coinBalance ?? 0;
    
    if (currentBalance < registrationFee) {
      return NextResponse.json({ 
        error: `星球币不足，需要 ${registrationFee} 星球币，当前余额 ${currentBalance} 星球币` 
      }, { status: 400 });
    }

    // 扣除报名费
    await db
      .update(users)
      .set({ 
        coinBalance: sql`coin_balance - ${registrationFee}`,
        updatedAt: new Date()
      })
      .where(eq(users.userId, userId));

    // 创建申请记录
    const [insertResult] = await db.insert(challengeRegistrations).values({
      userId,
      status: 'pending',
      currentLevel: 1,
      completedLevels: JSON.stringify([]),
    }).$returningId();

    return NextResponse.json({
      success: true,
      message: '申请已提交，请等待管理员审核。审核通过后，我们会通过邮件通知您。',
      applicationId: insertResult.id,
    });
  } catch (error) {
    console.error('Challenge application error:', error);
    return NextResponse.json({ 
      error: '申请失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// 获取状态提示消息
function getStatusMessage(status: string): string {
  const messages: Record<string, string> = {
    pending: '您的申请正在审核中，请耐心等待...',
    approved: '您的申请已通过！账户信息已分配，等待管理员激活...',
    active: '挑战进行中，祝您通关顺利！',
    completed: '恭喜通关！您已完成全部10关挑战',
    failed: '挑战失败，但您可以重新申请',
    rejected: '申请被拒绝，您可以重新申请',
  };
  return messages[status] || '未知状态';
}
