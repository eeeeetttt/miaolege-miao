import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { challengeRegistrations, users } from '@/lib/schema';
import { eq, and, sql } from 'drizzle-orm';

// 配置行类型
interface ConfigRow {
  config_key: string;
  config_value: string;
}

// 关卡行类型
interface LevelRow {
  level: number;
  name: string;
  description: string | null;
  target_balance: number;
  initial_balance: number;
  fail_balance: number;
  reward: string | null;
}

// 安全获取查询结果
function getResultRows<T>(result: unknown): T[] {
  if (Array.isArray(result) && result.length > 0) {
    return result[0] as T[];
  }
  return [] as T[];
}

// 自动创建数据库表和初始化配置
async function ensureTablesAndConfigExist(): Promise<{ configMap: Record<string, string>; success: boolean; error?: string }> {
  try {
    // 创建挑战赛报名表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS challenge_registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        status ENUM('pending', 'approved', 'rejected', 'active', 'completed', 'failed') DEFAULT 'pending',
        current_level INT DEFAULT 1,
        completed_levels JSON,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        failed_at TIMESTAMP NULL,
        failed_level INT NULL,
        total_duration INT NULL,
        server_name VARCHAR(255),
        trading_account VARCHAR(50),
        trading_password VARCHAR(255),
        mt_account_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_challenge_user (user_id),
        INDEX idx_challenge_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 创建配置表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS challenge_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        config_key VARCHAR(100) NOT NULL UNIQUE,
        config_value TEXT NOT NULL,
        description VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 创建关卡配置表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS challenge_level_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        level INT NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        target_balance INT NOT NULL DEFAULT 2000,
        initial_balance INT NOT NULL DEFAULT 1000,
        fail_balance INT NOT NULL DEFAULT 100,
        reward VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 等待表创建完成后再查询
    await new Promise(resolve => setTimeout(resolve, 100));

    // 使用原生SQL检查配置是否存在
    const result = await db.execute(sql`SELECT config_key, config_value FROM challenge_config`);
    const configRows = getResultRows<ConfigRow>(result);
    
    if (configRows.length === 0) {
      // 插入默认配置
      await db.execute(sql`
        INSERT INTO challenge_config (config_key, config_value, description) VALUES 
        ('registration_fee', '1000', '报名费（星球币）'),
        ('email_notification', 'true', '是否启用邮件通知'),
        ('challenge_enabled', 'true', '挑战赛是否启用')
        ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)
      `);
      
      // 重新获取配置
      const newResult = await db.execute(sql`SELECT config_key, config_value FROM challenge_config`);
      const newConfigRows = getResultRows<ConfigRow>(newResult);
      
      const configMap: Record<string, string> = {};
      for (const cfg of newConfigRows) {
        configMap[cfg.config_key] = cfg.config_value;
      }
      return { configMap, success: true };
    }

    // 构建配置Map
    const configMap: Record<string, string> = {};
    for (const cfg of configRows) {
      configMap[cfg.config_key] = cfg.config_value;
    }

    return { configMap, success: true };
  } catch (error) {
    console.error('初始化数据库失败:', error);
    return { 
      configMap: {}, 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// 获取挑战状态
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const userId = session.user.id;

    // 确保表和配置存在
    const { configMap, success, error } = await ensureTablesAndConfigExist();
    if (!success) {
      return NextResponse.json({ 
        error: '系统初始化失败', 
        details: error 
      }, { status: 500 });
    }

    // 获取用户的挑战申请记录（所有状态的）
    const registrations = await db.query.challengeRegistrations.findMany({
      where: eq(challengeRegistrations.userId, userId),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });

    // 获取最新的一条记录
    const latestRegistration = registrations[0] || null;

    // 获取关卡配置
    const levelResult = await db.execute(sql`
      SELECT level, name, description, target_balance, initial_balance, fail_balance, reward 
      FROM challenge_level_config 
      WHERE is_active = true 
      ORDER BY level
    `);
    const levelRows = getResultRows<LevelRow>(levelResult);

    if (!latestRegistration) {
      return NextResponse.json({
        hasActiveChallenge: false,
        hasPendingApplication: false,
        registration: null,
        registrationFee: parseInt(configMap.registration_fee || '1000'),
        config: configMap,
        levelConfigs: levelRows,
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
      levelConfigs: levelRows,
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
      return NextResponse.json({ 
        error: '请先登录后再报名',
        errorCode: 'NOT_LOGGED_IN'
      }, { status: 401 });
    }

    const userId = session.user.id;

    // 确保表和配置存在
    const { configMap, success, error } = await ensureTablesAndConfigExist();
    if (!success) {
      console.error('初始化失败:', error);
      return NextResponse.json({ 
        error: '系统初始化失败，请稍后重试',
        details: error 
      }, { status: 500 });
    }

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
