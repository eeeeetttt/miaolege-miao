import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { userAccounts } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

// 获取挑战状态
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const userId = session.user.id;

    // 查询用户的挑战账户
    const accounts = await db.query(
      `SELECT * FROM match_accounts WHERE user_id = ? AND match_type = 'kline' AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    // 查询未平仓位
    const positions = await db.query(
      `SELECT * FROM match_positions WHERE user_id = ? AND match_type = 'kline' AND status = 'open'`,
      [userId]
    );

    const hasActiveChallenge = accounts && accounts.length > 0;
    const account = hasActiveChallenge ? accounts[0] : null;

    // 默认挑战配置
    const config = {
      registration_fee: 1000,
      challenge_enabled: true,
      fail_balance: 100,
      target_balance: 2000,
      profit_target: 1000,
      show_leaderboard: true,
      completion_reward: 100000,
    };

    // 默认10关配置
    const levelConfigs = [
      { level: 1, name: '初出茅庐', targetBalance: 1100, initialBalance: 1000, failBalance: 100, reward: 500 },
      { level: 2, name: '小试牛刀', targetBalance: 1200, initialBalance: 1100, failBalance: 100, reward: 800 },
      { level: 3, name: '稳扎稳打', targetBalance: 1300, initialBalance: 1200, failBalance: 100, reward: 1200 },
      { level: 4, name: '步步为营', targetBalance: 1400, initialBalance: 1300, failBalance: 100, reward: 1600 },
      { level: 5, name: '胸有成竹', targetBalance: 1500, initialBalance: 1400, failBalance: 100, reward: 2000 },
      { level: 6, name: '游刃有余', targetBalance: 1600, initialBalance: 1500, failBalance: 100, reward: 2500 },
      { level: 7, name: '势如破竹', targetBalance: 1700, initialBalance: 1600, failBalance: 100, reward: 3000 },
      { level: 8, name: '登堂入室', targetBalance: 1800, initialBalance: 1700, failBalance: 100, reward: 4000 },
      { level: 9, name: '出神入化', targetBalance: 1900, initialBalance: 1800, failBalance: 100, reward: 5000 },
      { level: 10, name: 'K线王者', targetBalance: 2000, initialBalance: 1900, failBalance: 100, reward: 10000 },
    ];

    return NextResponse.json({
      hasActiveChallenge,
      hasPendingApplication: false,
      account,
      hasOpenPosition: positions && positions.length > 0,
      registration: null,
      registrationFee: config.registration_fee,
      config,
      levelConfigs,
      message: hasActiveChallenge ? '您已有进行中的挑战' : '您还未申请挑战赛',
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
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        error: '请先登录后再报名',
        errorCode: 'NOT_LOGGED_IN'
      }, { status: 401 });
    }

    const userId = session.user.id;

    // 获取用户信息（包括负债）
    const userResult = await db
      .select()
      .from(userAccounts)
      .where(eq(userAccounts.email, session.user.email))
      .limit(1);

    if (!userResult || userResult.length === 0) {
      return NextResponse.json({ 
        error: '用户不存在',
        errorCode: 'USER_NOT_FOUND'
      }, { status: 404 });
    }

    const user = userResult[0];
    const totalDebt = Number(user.totalDebt || 0);

    // 核心规则：总负债 > 0 不能报名
    if (totalDebt > 0) {
      return NextResponse.json({ 
        error: `您有未还清的债务（${totalDebt}银两），请先还清债务后再报名挑战赛`,
        errorCode: 'HAS_DEBT',
        totalDebt,
      }, { status: 400 });
    }

    const registrationFee = 1000;
    const coinBalance = Number(user.coinBalance || 0);

    // 检查银两余额
    if (coinBalance < registrationFee) {
      return NextResponse.json({ 
        error: `报名费不足，需要${registrationFee}银两，当前${coinBalance}银两`,
        errorCode: 'INSUFFICIENT_BALANCE'
      }, { status: 400 });
    }

    // 扣除报名费
    await db
      .update(userAccounts)
      .set({ 
        coinBalance: String(Number(coinBalance) - registrationFee),
        updatedAt: new Date()
      })
      .where(eq(userAccounts.email, session.user.email));

    // 创建挑战账户记录
    const matchId = `kline_${userId}_${Date.now()}`;
    await db.query(
      `INSERT INTO match_accounts (user_id, match_id, match_type, initial_capital, current_balance, status, current_level, started_at) VALUES (?, ?, 'kline', ?, ?, 'active', 1, NOW())`,
      [userId, matchId, registrationFee, registrationFee]
    );

    return NextResponse.json({
      success: true,
      message: `报名成功！已扣除${registrationFee}银两报名费`,
      registrationFee,
      remainingBalance: coinBalance - registrationFee,
    });

  } catch (error) {
    console.error('Register challenge error:', error);
    return NextResponse.json({ 
      error: '报名失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
