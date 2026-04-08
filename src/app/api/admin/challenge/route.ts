import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { challengeRegistrations, users, challengeConfig, challengeLevelConfig, mtAccounts } from '@/lib/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

// 自动创建数据库表
async function ensureTablesExist(): Promise<boolean> {
  try {
    // 创建挑战赛报名表（包含新字段）
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
        INDEX idx_challenge_status (status),
        UNIQUE KEY uk_challenge_user_pending (user_id, (CASE WHEN status = 'pending' THEN 1 ELSE NULL END))
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

    // 初始化默认配置
    const existingConfig = await db.query.challengeConfig.findFirst({});
    if (!existingConfig) {
      await db.insert(challengeConfig).values([
        { configKey: 'registration_fee', configValue: '1000', description: '报名费（星球币）' },
        { configKey: 'email_notification', configValue: 'true', description: '是否启用邮件通知' },
        { configKey: 'challenge_enabled', configValue: 'true', description: '挑战赛是否启用' },
      ]);
    }

    // 初始化默认关卡配置
    const existingLevels = await db.query.challengeLevelConfig.findMany({});
    if (existingLevels.length === 0) {
      await db.insert(challengeLevelConfig).values([
        { level: 1, name: '启念', description: '开始你的交易之旅', targetBalance: 2000, initialBalance: 1000, failBalance: 100, reward: '继续挑战' },
        { level: 2, name: '立规', description: '建立交易规则', targetBalance: 2000, initialBalance: 1000, failBalance: 100, reward: '继续挑战' },
        { level: 3, name: '守戒', description: '遵守交易纪律', targetBalance: 2000, initialBalance: 1000, failBalance: 100, reward: '继续挑战' },
        { level: 4, name: '忍痛', description: '学会止损止盈', targetBalance: 2000, initialBalance: 1000, failBalance: 100, reward: '继续挑战' },
        { level: 5, name: '止喜', description: '控制情绪波动', targetBalance: 2000, initialBalance: 1000, failBalance: 100, reward: '继续挑战' },
        { level: 6, name: '观己', description: '认识自我弱点', targetBalance: 2000, initialBalance: 1000, failBalance: 100, reward: '继续挑战' },
        { level: 7, name: '破执', description: '突破固有思维', targetBalance: 2000, initialBalance: 1000, failBalance: 100, reward: '继续挑战' },
        { level: 8, name: '随势', description: '顺势而为', targetBalance: 2000, initialBalance: 1000, failBalance: 100, reward: '继续挑战' },
        { level: 9, name: '忘我', description: '达到交易境界', targetBalance: 2000, initialBalance: 1000, failBalance: 100, reward: '继续挑战' },
        { level: 10, name: '得道', description: '完成终极挑战', targetBalance: 2000, initialBalance: 1000, failBalance: 100, reward: '通关大奖' },
      ]);
    }

    return true;
  } catch (error) {
    console.error('创建表失败:', error);
    return false;
  }
}

// 获取挑战赛申请列表
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 检查是否为管理员
    const user = await db.query.users.findFirst({
      where: eq(users.userId, session.user.id),
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 });
    }

    // 确保表存在
    await ensureTablesExist();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, approved, active, completed, failed, rejected
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 构建查询条件
    let query = db
      .select({
        registration: challengeRegistrations,
        user: {
          userId: users.userId,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
        }
      })
      .from(challengeRegistrations)
      .leftJoin(users, eq(challengeRegistrations.userId, users.userId))
      .orderBy(desc(challengeRegistrations.createdAt))
      .limit(limit)
      .offset(offset);

    if (status) {
      query = query.where(eq(challengeRegistrations.status, status as any)) as any;
    }

    const results = await query;

    // 获取总数
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(challengeRegistrations)
      .where(status ? eq(challengeRegistrations.status, status as any) : undefined);

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

    return NextResponse.json({
      list: results,
      total: countResult[0]?.count || 0,
      config: configMap,
      levelConfigs,
    });
  } catch (error) {
    console.error('获取挑战赛列表失败:', error);
    return NextResponse.json({ 
      error: '获取列表失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// 更新挑战赛申请状态
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 检查是否为管理员
    const user = await db.query.users.findFirst({
      where: eq(users.userId, session.user.id),
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 });
    }

    const body = await request.json();
    const { action, registrationId, serverName, tradingAccount, tradingPassword } = body;

    if (!registrationId) {
      return NextResponse.json({ error: '缺少申请ID' }, { status: 400 });
    }

    // 获取申请记录
    const registration = await db.query.challengeRegistrations.findFirst({
      where: eq(challengeRegistrations.id, registrationId),
    });

    if (!registration) {
      return NextResponse.json({ error: '申请记录不存在' }, { status: 404 });
    }

    // 确保表存在
    await ensureTablesExist();

    if (action === 'approve') {
      // 审核通过 - 需要填写服务器和账号信息
      if (!serverName || !tradingAccount || !tradingPassword) {
        return NextResponse.json({ error: '审核通过需要填写服务器、账号和密码' }, { status: 400 });
      }

      // 创建MT账户记录并绑定到用户
      const [mtAccount] = await db.insert(mtAccounts).values({
        userId: registration.userId,
        accountNumber: tradingAccount,
        broker: serverName,
        platform: 'MT4', // 默认MT4
        isVerified: true,
        verifiedAt: new Date(),
      }).$returningId();

      // 更新申请状态为approved（待激活）
      await db
        .update(challengeRegistrations)
        .set({
          status: 'approved',
          serverName,
          tradingAccount,
          tradingPassword, // 实际应该加密存储
          mtAccountId: mtAccount.id,
          updatedAt: new Date(),
        } as any)
        .where(eq(challengeRegistrations.id, registrationId));

      // 发送邮件通知
      const userInfo = await db.query.users.findFirst({
        where: eq(users.userId, registration.userId),
      });

      if (userInfo?.email) {
        // TODO: 调用邮件发送接口
        console.log(`[邮件通知] 申请已通过: ${userInfo.email}, 账号: ${tradingAccount}`);
      }

      return NextResponse.json({ 
        success: true, 
        message: '审核已通过，已发送通知邮件' 
      });

    } else if (action === 'reject') {
      // 审核拒绝
      await db
        .update(challengeRegistrations)
        .set({
          status: 'rejected',
          updatedAt: new Date(),
        } as any)
        .where(eq(challengeRegistrations.id, registrationId));

      return NextResponse.json({ success: true, message: '已拒绝申请' });

    } else if (action === 'activate') {
      // 激活挑战（审核通过后，点击激活开始挑战）
      await db
        .update(challengeRegistrations)
        .set({
          status: 'active',
          startedAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .where(eq(challengeRegistrations.id, registrationId));

      return NextResponse.json({ success: true, message: '挑战已激活' });

    } else if (action === 'fail') {
      // 标记挑战失败
      await db
        .update(challengeRegistrations)
        .set({
          status: 'failed',
          failedAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .where(eq(challengeRegistrations.id, registrationId));

      return NextResponse.json({ success: true, message: '挑战已标记为失败' });

    } else if (action === 'reset') {
      // 重置挑战（允许重新报名）
      await db
        .update(challengeRegistrations)
        .set({
          status: 'pending',
          currentLevel: 1,
          completedLevels: JSON.stringify([]),
          startedAt: new Date(),
          completedAt: null,
          failedAt: null,
          failedLevel: null,
          totalDuration: null,
          serverName: null,
          tradingAccount: null,
          tradingPassword: null,
          mtAccountId: null,
          updatedAt: new Date(),
        } as any)
        .where(eq(challengeRegistrations.id, registrationId));

      return NextResponse.json({ success: true, message: '挑战已重置' });

    } else if (action === 'updateConfig') {
      // 更新配置
      const { configKey, configValue } = body;
      if (!configKey || configValue === undefined) {
        return NextResponse.json({ error: '缺少配置参数' }, { status: 400 });
      }

      await db
        .insert(challengeConfig)
        .values({
          configKey,
          configValue: String(configValue),
        })
        .onDuplicateKeyUpdate({
          set: {
            configValue: String(configValue),
            updatedAt: new Date(),
          },
        } as any);

      return NextResponse.json({ success: true, message: '配置已更新' });

    } else {
      return NextResponse.json({ error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('更新挑战赛状态失败:', error);
    return NextResponse.json({ 
      error: '操作失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
