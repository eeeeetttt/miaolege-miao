import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { challengeRegistrations, users } from '@/lib/schema';
import { eq, and, sql } from 'drizzle-orm';

// 报名费
const REGISTRATION_FEE = 1000;

// 初始账户净值
const INITIAL_BALANCE = 1000;

// 通关目标净值
const TARGET_BALANCE = 2000;

// 失败底线净值
const FAIL_BALANCE = 100;

// 自动创建数据库表
async function ensureTablesExist(): Promise<boolean> {
  try {
    // 创建挑战赛报名表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS challenge_registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        status ENUM('active', 'completed', 'failed') DEFAULT 'active',
        current_level INT DEFAULT 1,
        completed_levels JSON,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        failed_at TIMESTAMP NULL,
        failed_level INT NULL,
        total_duration INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_challenge_user (user_id),
        INDEX idx_challenge_status (status),
        UNIQUE KEY uk_challenge_user_active (user_id, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 创建名人堂表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS challenge_hall_of_fame (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        registration_id INT NOT NULL,
        display_name VARCHAR(255) DEFAULT '通关大师',
        is_anonymous BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP NOT NULL,
        total_duration INT NOT NULL,
        reward_claimed BOOLEAN DEFAULT FALSE,
        reward_claimed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_hall_user (user_id),
        INDEX idx_hall_completed_at (completed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 创建关卡记录表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS challenge_level_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        registration_id INT NOT NULL,
        level INT NOT NULL,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        duration INT NULL,
        status ENUM('active', 'completed', 'failed') DEFAULT 'active'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    return true;
  } catch (error) {
    console.error('创建表失败:', error);
    return false;
  }
}

// 参与挑战赛报名
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const userId = session.user.id;

    // 自动确保表存在
    const tablesExist = await ensureTablesExist();
    if (!tablesExist) {
      return NextResponse.json({ 
        error: '系统初始化失败，请稍后重试或联系管理员' 
      }, { status: 500 });
    }

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

    // 检查星球币余额
    const currentBalance = user.coinBalance ?? 0;
    if (currentBalance < REGISTRATION_FEE) {
      return NextResponse.json({ 
        error: `星球币不足，需要 ${REGISTRATION_FEE} 星球币，当前余额 ${currentBalance} 星球币` 
      }, { status: 400 });
    }

    // 扣除报名费
    await db
      .update(users)
      .set({ 
        coinBalance: sql`coin_balance - ${REGISTRATION_FEE}`,
        updatedAt: new Date()
      })
      .where(eq(users.userId, userId));

    // 创建新报名记录，初始账户净值为1000
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
      message: `挑战赛报名成功，已扣除 ${REGISTRATION_FEE} 星球币`,
      registration: {
        id: registration!.id,
        currentLevel: registration!.currentLevel,
        startedAt: registration!.startedAt,
        initialBalance: INITIAL_BALANCE,
        targetBalance: TARGET_BALANCE,
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
        registrationFee: REGISTRATION_FEE,
        initialBalance: INITIAL_BALANCE,
        targetBalance: TARGET_BALANCE,
        failBalance: FAIL_BALANCE,
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
        initialBalance: INITIAL_BALANCE,
        targetBalance: TARGET_BALANCE,
        failBalance: FAIL_BALANCE,
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
