import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, pool } from '@/lib/db';
import { matchAccounts, matchConfigs, matchRecords, userAccounts } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';
import { RowDataPacket, FieldPacket } from 'mysql2/promise';

// 获取每日挑战赛配置
async function getDailyConfig() {
  const configs = await db
    .select()
    .from(matchConfigs)
    .where(eq(matchConfigs.matchType, 'daily'));
  
  const configMap: Record<string, string> = {};
  configs.forEach(c => {
    configMap[c.configKey] = c.configValue || '';
  });
  
  return {
    entryFeeGold: parseInt(configMap.entry_fee_gold || '50'),
    initialCapitalSilver: parseFloat(configMap.initial_capital_silver || '10000'),
    entryStartHour: parseInt(configMap.entry_start_hour || '0'),
    entryEndHour: parseInt(configMap.entry_end_hour || '20'),
    rewards: JSON.parse(configMap.rewards || '[]'),
    enabled: configMap.enabled === 'true',
  };
}

// 获取当前日期字符串
function getTodayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// 检查是否可以报名
function canRegister(config: {
  entryStartHour: number;
  entryEndHour: number;
}) {
  const now = new Date();
  const currentHour = now.getHours();
  return currentHour >= config.entryStartHour && currentHour < config.entryEndHour;
}

// 获取每日挑战赛状态
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  
  try {
    const config = await getDailyConfig();
    const today = getTodayString();
    
    // 获取排行榜
    if (action === 'ranking') {
      const rankings = await db
        .select({
          userId: matchAccounts.userId,
          currentBalance: matchAccounts.currentBalance,
          initialCapital: matchAccounts.initialCapital,
          userName: userAccounts.name,
        })
        .from(matchAccounts)
        .leftJoin(userAccounts, eq(userAccounts.userId, matchAccounts.userId))
        .where(and(
          eq(matchAccounts.matchType, 'daily'),
          eq(matchAccounts.status, 'active')
        ))
        .orderBy(desc(matchAccounts.currentBalance))
        .limit(10);
      
      // 计算盈利额并排序
      const rankedList = rankings.map((r, index) => ({
        rank: index + 1,
        userId: r.userId,
        userName: r.userName || '神秘用户',
        initialCapital: Number(r.initialCapital),
        currentBalance: Number(r.currentBalance),
        profit: Number(r.currentBalance) - Number(r.initialCapital),
      }));
      
      return NextResponse.json({
        today,
        rankings: rankedList,
      });
    }
    
    // 未登录用户
    if (!session?.user?.id) {
      return NextResponse.json({
        config,
        today,
        canRegister: canRegister(config),
        isRegistered: false,
      });
    }
    
    // 获取用户今日状态
    const myAccount = await db
      .select()
      .from(matchAccounts)
      .where(and(
        eq(matchAccounts.userId, session.user.id),
        eq(matchAccounts.matchType, 'daily'),
        eq(matchAccounts.status, 'active')
      ))
      .limit(1);
    
    return NextResponse.json({
      config,
      today,
      canRegister: canRegister(config),
      isRegistered: myAccount.length > 0,
      myAccount: myAccount[0] ? {
        accountId: myAccount[0].id,
        initialValue: Number(myAccount[0].initialCapital),
        currentValue: Number(myAccount[0].currentBalance),
        balance: Number(myAccount[0].currentBalance),
        returnRate: parseFloat(((Number(myAccount[0].currentBalance) / Number(myAccount[0].initialCapital) - 1) * 100).toFixed(2)),
        profit: Number(myAccount[0].currentBalance) - Number(myAccount[0].initialCapital),
        status: myAccount[0].status,
      } : null,
    });
  } catch (error) {
    console.error('Get daily challenge status error:', error);
    return NextResponse.json({ error: '获取状态失败' }, { status: 500 });
  }
}

// 每日挑战赛报名
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { action, direction, lots = 1 } = body;
    const config = await getDailyConfig();
    
    // 获取用户信息
    const [user] = await db
      .select()
      .from(userAccounts)
      .where(eq(userAccounts.email, session.user.email as string));
    
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }
    
    // 检查是否已报名
    const existingAccount = await db
      .select()
      .from(matchAccounts)
      .where(and(
        eq(matchAccounts.userId, session.user.id),
        eq(matchAccounts.matchType, 'daily'),
        eq(matchAccounts.status, 'active')
      ))
      .limit(1);
    
    // 处理报名
    if (action === 'register') {
      if (!config.enabled) {
        return NextResponse.json({ error: '每日挑战赛已关闭' }, { status: 400 });
      }
      
      if (!canRegister(config)) {
        return NextResponse.json({ error: '当前时间段不能报名' }, { status: 400 });
      }
      
      if (existingAccount.length > 0) {
        return NextResponse.json({ 
          error: '今日已报名',
          account: {
            initialCapital: Number(existingAccount[0].initialCapital),
            currentBalance: Number(existingAccount[0].currentBalance),
          }
        }, { status: 400 });
      }
      
      // 检查金币
      const userGold = user.goldBalance || 0;
      if (userGold < config.entryFeeGold) {
        return NextResponse.json({ error: `金币不足，需要${config.entryFeeGold}金币` }, { status: 400 });
      }
      
      // 检查银两
      const userCoin = Number(user.coinBalance || 0);
      if (userCoin < config.initialCapitalSilver) {
        return NextResponse.json({ error: `银两不足，需要${config.initialCapitalSilver}银两` }, { status: 400 });
      }
      
      // 创建账户
      const matchId = `daily_${getTodayString()}_${session.user.id}`;
      
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        
        await connection.execute(
          `UPDATE user_accounts SET gold_balance = gold_balance - ?, coin_balance = coin_balance - ? WHERE user_id = ?`,
          [config.entryFeeGold, config.initialCapitalSilver, session.user.id]
        );
        
        await connection.execute(
          `INSERT INTO match_accounts (user_id, match_id, match_type, initial_capital, current_balance, status)
           VALUES (?, ?, 'daily', ?, ?, 'active')`,
          [session.user.id, matchId, config.initialCapitalSilver, config.initialCapitalSilver]
        );
        
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
      
      return NextResponse.json({
        success: true,
        message: '报名成功，今日加油！',
        account: {
          initialCapital: config.initialCapitalSilver,
          currentBalance: config.initialCapitalSilver,
        }
      });
    }
    
    // 处理开仓
    if (action === 'trade') {
      if (!config.enabled) {
        return NextResponse.json({ error: '每日挑战赛已关闭' }, { status: 400 });
      }
      
      // 检查是否有未平仓位
      const [existingPositions] = await pool.execute(
        `SELECT * FROM match_positions WHERE user_id = ? AND match_type = 'daily' AND status = 'open'`,
        [session.user.id]
      ) as [RowDataPacket[], FieldPacket[]];
      
      if (existingPositions.length > 0) {
        return NextResponse.json({ error: '已有未平仓位，请先平仓' }, { status: 400 });
      }
      
      if (existingAccount.length === 0) {
        return NextResponse.json({ error: '没有进行中的挑战账户' }, { status: 400 });
      }
      
      if (!['long', 'short'].includes(direction)) {
        return NextResponse.json({ error: '无效的交易方向' }, { status: 400 });
      }
      
      const account = existingAccount[0];
      const leverage = 500;
      const maxLots = Number(account.currentBalance) / 100;
      const actualLots = Math.min(lots || 0.1, maxLots, 10);
      
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
      
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        
        await connection.execute(
          `UPDATE match_accounts SET current_balance = ? WHERE id = ?`,
          [Math.max(0, newBalance), account.id]
        );
        
        await connection.execute(
          `INSERT INTO match_positions (user_id, match_type, match_id, direction, lots, leverage, entry_price)
           VALUES (?, 'daily', ?, ?, ?, ?, ?)`,
          [session.user.id, account.matchId, direction, actualLots, leverage, entryPrice]
        );
        
        await connection.execute(
          `INSERT INTO match_trade_records (user_id, match_type, match_id, action, direction, lots, profit, balance_after)
           VALUES (?, 'daily', ?, 'open', ?, ?, 0, ?)`,
          [session.user.id, account.matchId, direction, actualLots, Math.max(0, newBalance)]
        );
        
        await connection.commit();
        
        return NextResponse.json({
          success: true,
          message: `${direction === 'long' ? '做多' : '做空'}成功，开仓价：${entryPrice.toFixed(2)}`,
          position: { direction, lots: actualLots, leverage, entryPrice, margin },
          balance: Math.max(0, newBalance)
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }
    
    // 处理平仓
    if (action === 'close') {
      const [positions] = await pool.execute(
        `SELECT * FROM match_positions WHERE user_id = ? AND match_type = 'daily' AND status = 'open' ORDER BY id DESC LIMIT 1`,
        [session.user.id]
      ) as [RowDataPacket[], FieldPacket[]];
      
      if (positions.length === 0) {
        return NextResponse.json({ error: '没有未平仓位' }, { status: 400 });
      }
      
      const position = positions[0];
      
      if (existingAccount.length === 0) {
        return NextResponse.json({ error: '没有进行中的挑战账户' }, { status: 400 });
      }
      
      const account = existingAccount[0];
      
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
      
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        
        await connection.execute(
          `UPDATE match_accounts SET current_balance = ? WHERE id = ?`,
          [Math.max(0, newBalance), account.id]
        );
        
        await connection.execute(
          `UPDATE match_positions SET status = 'closed', closed_at = NOW() WHERE id = ?`,
          [position.id]
        );
        
        await connection.execute(
          `INSERT INTO match_trade_records (user_id, match_type, match_id, action, direction, lots, profit, balance_after)
           VALUES (?, 'daily', ?, 'close', ?, ?, ?, ?)`,
          [session.user.id, account.matchId, position.direction, position.lots, profitAmount, Math.max(0, newBalance)]
        );
        
        await connection.commit();
        
        return NextResponse.json({
          success: true,
          message: `平仓成功，盈亏：${profitAmount >= 0 ? '+' : ''}${profitAmount.toFixed(2)}`,
          trade: { direction: position.direction, lots: position.lots, entryPrice: position.entry_price, exitPrice: currentPrice, profit: profitAmount, newBalance: Math.max(0, newBalance) }
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }
    
    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error) {
    console.error('[Daily] Action error:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ error: '操作失败: ' + message }, { status: 500 });
  }
}

// 更新净值
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { newBalance } = body;
    
    if (typeof newBalance !== 'number' || newBalance < 0) {
      return NextResponse.json({ error: '无效的净值' }, { status: 400 });
    }
    
    // 获取账户
    const activeAccount = await db
      .select()
      .from(matchAccounts)
      .where(and(
        eq(matchAccounts.userId, session.user.id),
        eq(matchAccounts.matchType, 'daily'),
        eq(matchAccounts.status, 'active')
      ))
      .limit(1);
    
    if (activeAccount.length === 0) {
      return NextResponse.json({ error: '没有进行中的挑战' }, { status: 400 });
    }
    
    // 更新净值
    await db
      .update(matchAccounts)
      .set({ currentBalance: String(newBalance) })
      .where(eq(matchAccounts.id, activeAccount[0].id));
    
    return NextResponse.json({
      success: true,
      currentBalance: newBalance,
      profit: newBalance - Number(activeAccount[0].initialCapital),
    });
  } catch (error) {
    console.error('Update daily challenge balance error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
