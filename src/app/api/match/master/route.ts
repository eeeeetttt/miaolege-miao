import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, pool } from '@/lib/db';
import { matchAccounts, matchConfigs, userAccounts } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';
import { RowDataPacket, FieldPacket } from 'mysql2/promise';

interface MasterConfig {
  enabled: boolean;
  entryFeeGold: number;
  initialCapitalSilver: number;
  roundDays: number;
  rewards: string;
}

// 获取大师邀请赛配置
async function getMasterConfig(): Promise<MasterConfig> {
  const configs = await db.select().from(matchConfigs).where(eq(matchConfigs.matchType, 'master'));
  if (configs.length === 0 || !configs[0].configValue) {
    return {
      enabled: true,
      entryFeeGold: 500,
      initialCapitalSilver: 100000,
      roundDays: 7,
      rewards: JSON.stringify([
        { rank: 1, gold: 20000, title: '大师' },
        { rank: 2, gold: 10000, title: '宗师' },
        { rank: 3, gold: 5000, title: '宗师' },
      ]),
    };
  }
  try {
    const value = JSON.parse(configs[0].configValue);
    return { ...value, enabled: true };
  } catch {
    return {
      enabled: true,
      entryFeeGold: 500,
      initialCapitalSilver: 100000,
      roundDays: 7,
      rewards: JSON.stringify([
        { rank: 1, gold: 20000, title: '大师' },
        { rank: 2, gold: 10000, title: '宗师' },
        { rank: 3, gold: 5000, title: '宗师' },
      ]),
    };
  }
}

// 获取参赛要求
function getRequirements(config: any) {
  return {
    debtMustBeZero: true,
    requireTitle: 'K线宗师',
    minLadderRank: 10,
  };
}

export async function GET(request: NextRequest) {
  try {
    const config = await getMasterConfig();
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    // 获取所有进行中的大师赛账户
    const accounts = await db
      .select({
        id: matchAccounts.id,
        userId: matchAccounts.userId,
        currentBalance: matchAccounts.currentBalance,
        initialCapital: matchAccounts.initialCapital,
        status: matchAccounts.status,
      })
      .from(matchAccounts)
      .leftJoin(userAccounts, eq(userAccounts.userId, matchAccounts.userId))
      .where(and(
        eq(matchAccounts.matchType, 'master'),
        eq(matchAccounts.status, 'active')
      ))
      .orderBy(desc(matchAccounts.currentBalance));

    // 计算收益率并获取用户名
    const accountsWithReturn = accounts.map(acc => ({
      ...acc,
      userName: acc.userId?.slice(0, 8) || '神秘用户',
      returnRate: Number(acc.initialCapital) > 0 
        ? Number(((Number(acc.currentBalance) - Number(acc.initialCapital)) / Number(acc.initialCapital) * 100).toFixed(2))
        : 0,
    }));

    // 获取当前用户账户
    let myAccount = null;
    const requirements = getRequirements(config);
    
    if (userId) {
      const [account] = await db
        .select()
        .from(matchAccounts)
        .where(and(
          eq(matchAccounts.userId, userId),
          eq(matchAccounts.matchType, 'master'),
          eq(matchAccounts.status, 'active')
        ));
      myAccount = account;
    }

    // 获取排行榜
    const leaderboard = accountsWithReturn.slice(0, 20).map((acc, index) => ({
      rank: index + 1,
      userName: acc.userName,
      returnRate: acc.returnRate,
    }));

    const myAccountFormatted = myAccount ? {
      accountId: myAccount.id,
      matchType: 'master',
      matchName: '大师邀请赛',
      balance: Number(myAccount.currentBalance),
      initialValue: Number(myAccount.initialCapital),
      returnRate: parseFloat(((Number(myAccount.currentBalance) / Number(myAccount.initialCapital) - 1) * 100).toFixed(2)),
      profit: Number(myAccount.currentBalance) - Number(myAccount.initialCapital),
      status: myAccount.status,
    } : null;
    
    // 格式化活跃账户列表
    const activeAccounts = myAccount ? [myAccountFormatted] : [];
    
    return NextResponse.json({
      config,
      requirements,
      myAccount: myAccountFormatted,
      leaderboard,
      totalParticipants: accounts.length,
      status: myAccount ? 'enrolled' : (config.enabled ? 'open' : 'closed'),
      activeAccounts,
    });
  } catch (error) {
    console.error('Get master challenge error:', error);
    return NextResponse.json({ error: '获取大师邀请赛信息失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;
    
    const config = await getMasterConfig();
    
    if (!config.enabled) {
      return NextResponse.json({ error: '大师邀请赛已关闭' }, { status: 400 });
    }

    // 获取用户信息 - 使用 email 查询
    const userEmail = session.user.email as string;
    console.log('[大师邀请赛] 用户邮箱:', userEmail);
    
    const [user] = await db
      .select()
      .from(userAccounts)
      .where(eq(userAccounts.email, userEmail));
    
    if (!user) {
      console.log('[大师邀请赛] 用户不存在，邮箱:', userEmail);
      return NextResponse.json({ error: '用户账户不存在，请刷新页面重试' }, { status: 404 });
    }

    const requirements = getRequirements(config);

    // 检查报名条件
    if (requirements.debtMustBeZero && Number(user.totalDebt || 0) > 0) {
      return NextResponse.json({ error: '有负债不能参加大师邀请赛' }, { status: 400 });
    }

    if (requirements.requireTitle && user.activeTitle !== requirements.requireTitle) {
      return NextResponse.json({ error: `需要拥有"${requirements.requireTitle}"称号才能参加` }, { status: 400 });
    }

    // 检查是否有活跃账户
    const activeAccount = await db
      .select()
      .from(matchAccounts)
      .where(and(
        eq(matchAccounts.userId, session.user.id as string),
        eq(matchAccounts.matchType, 'master'),
        eq(matchAccounts.status, 'active')
      ));

    if (action === 'enroll') {
      if (activeAccount.length > 0) {
        return NextResponse.json({ error: '您已在大师邀请赛中' }, { status: 400 });
      }

      // 扣除报名费和本金
      const entryFee = config.entryFeeGold || 500;
      const initialCapital = config.initialCapitalSilver || 100000;

      if (Number(user.goldBalance || 0) < entryFee) {
        return NextResponse.json({ error: `金币不足，需要${entryFee}金币` }, { status: 400 });
      }

      if (Number(user.coinBalance || 0) < initialCapital) {
        return NextResponse.json({ error: `银两不足，需要${initialCapital}银两` }, { status: 400 });
      }

      // 创建比赛账户
      const matchId = `master_${session.user.id}_${Date.now()}`;
      await db.insert(matchAccounts).values({
        userId: session.user.id as string,
        matchId,
        matchType: 'master',
        initialCapital: String(initialCapital),
        currentBalance: String(initialCapital),
        status: 'active',
        currentLevel: 1,
      });

      // 扣除费用
      await db.update(userAccounts)
        .set({ 
          goldBalance: Number(user.goldBalance || 0) - entryFee,
          coinBalance: String(Number(user.coinBalance || 0) - initialCapital),
        })
        .where(eq(userAccounts.userId, session.user.id as string));

      return NextResponse.json({ 
        success: true, 
        message: '报名成功',
        matchId,
        initialCapital,
      });
    }

    if (action === 'quit') {
      if (activeAccount.length === 0) {
        return NextResponse.json({ error: '您未参加大师邀请赛' }, { status: 400 });
      }

      const account = activeAccount[0];
      // 退还余额
      await db.update(userAccounts)
        .set({ 
          coinBalance: String(Number(user.coinBalance || 0) + Number(account.currentBalance)),
        })
        .where(eq(userAccounts.userId, session.user.id as string));

      // 删除比赛账户
      await db.delete(matchAccounts)
        .where(eq(matchAccounts.id, account.id));

      return NextResponse.json({ success: true, message: '已退出比赛' });
    }

    // 处理开仓
    if (action === 'trade') {
      if (activeAccount.length === 0) {
        return NextResponse.json({ error: '没有进行中的挑战账户' }, { status: 400 });
      }
      
      // 检查是否有未平仓位
      const [existingPositions] = await pool.execute(
        `SELECT * FROM match_positions WHERE user_id = ? AND match_type = 'master' AND status = 'open'`,
        [session.user.id]
      ) as [RowDataPacket[], FieldPacket[]];
      
      if (existingPositions.length > 0) {
        return NextResponse.json({ error: '已有未平仓位，请先平仓' }, { status: 400 });
      }

      const { direction, lots = 0.1 } = body;
      if (!['long', 'short'].includes(direction)) {
        return NextResponse.json({ error: '无效的交易方向' }, { status: 400 });
      }

      const account = activeAccount[0];
      const leverage = 500;
      const maxLots = Number(account.currentBalance) / 100;
      const actualLots = Math.min(lots, maxLots, 10);
      
      if (actualLots < 0.01) {
        return NextResponse.json({ error: '余额不足，无法开仓' }, { status: 400 });
      }
      
      // 获取当前金价
      let entryPrice = 3300 + Math.random() * 100;
      try {
        const priceRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:5000'}/api/gold-price`);
        const priceData = await priceRes.json();
        if (priceData.success && priceData.data) {
          entryPrice = priceData.data.price;
        }
      } catch {}
      
      const margin = actualLots * 100 * leverage / 100;
      const newBalance = Number(account.currentBalance) - margin;

      await db.update(matchAccounts)
        .set({ currentBalance: String(Math.max(0, newBalance)) })
        .where(eq(matchAccounts.id, account.id));
      
      // 保存持仓
      await pool.execute(
        `INSERT INTO match_positions (user_id, match_type, match_id, direction, lots, leverage, entry_price)
         VALUES (?, 'master', ?, ?, ?, ?, ?)`,
        [session.user.id, account.matchId, direction, actualLots, leverage, entryPrice]
      );
      
      return NextResponse.json({
        success: true,
        message: `${direction === 'long' ? '做多' : '做空'}成功，开仓价：${entryPrice.toFixed(2)}`,
        position: { direction, lots: actualLots, leverage, entryPrice, margin },
        balance: Math.max(0, newBalance)
      });
    }
    
    // 处理平仓
    if (action === 'close') {
      const [positions] = await pool.execute(
        `SELECT * FROM match_positions WHERE user_id = ? AND match_type = 'master' AND status = 'open' ORDER BY id DESC LIMIT 1`,
        [session.user.id]
      ) as [RowDataPacket[], FieldPacket[]];
      
      if (positions.length === 0) {
        return NextResponse.json({ error: '没有未平仓位' }, { status: 400 });
      }
      
      const position = positions[0];
      
      if (activeAccount.length === 0) {
        return NextResponse.json({ error: '没有进行中的挑战账户' }, { status: 400 });
      }
      
      const account = activeAccount[0];
      
      // 获取当前金价
      let currentPrice = 3300 + Math.random() * 100;
      try {
        const priceRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:5000'}/api/gold-price`);
        const priceData = await priceRes.json();
        if (priceData.success && priceData.data) {
          currentPrice = priceData.data.price;
        }
      } catch {}
      
      const priceChange = currentPrice - Number(position.entry_price);
      const profit = position.direction === 'long' ? priceChange : -priceChange;
      const profitAmount = profit * Number(position.lots) * 100;
      
      const margin = Number(position.lots) * 100 * (Number(position.leverage) || 500) / 100;
      const newBalance = Number(account.currentBalance) + margin + profitAmount;
      
      await db.update(matchAccounts)
        .set({ currentBalance: String(Math.max(0, newBalance)) })
        .where(eq(matchAccounts.id, account.id));
      
      await pool.execute(
        `UPDATE match_positions SET status = 'closed', closed_at = NOW() WHERE id = ?`,
        [position.id]
      );
      
      return NextResponse.json({
        success: true,
        message: `平仓成功，盈亏：${profitAmount >= 0 ? '+' : ''}${profitAmount.toFixed(2)}`,
        trade: { direction: position.direction, lots: position.lots, entryPrice: position.entry_price, exitPrice: currentPrice, profit: profitAmount, newBalance: Math.max(0, newBalance) }
      });
    }

    return NextResponse.json({ error: '无效操作' }, { status: 400 });
  } catch (error) {
    console.error('Master challenge action error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
