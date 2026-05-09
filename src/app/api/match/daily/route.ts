import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, pool } from '@/lib/db';
import { users, matchAccounts, matchConfigs, matchRecords } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';

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
          userName: users.name,
        })
        .from(matchAccounts)
        .leftJoin(users, eq(users.userId, matchAccounts.userId))
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
        initialCapital: Number(myAccount[0].initialCapital),
        currentBalance: Number(myAccount[0].currentBalance),
        profit: Number(myAccount[0].currentBalance) - Number(myAccount[0].initialCapital),
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
    const config = await getDailyConfig();
    
    if (!config.enabled) {
      return NextResponse.json({ error: '每日挑战赛已关闭' }, { status: 400 });
    }
    
    if (!canRegister(config)) {
      return NextResponse.json({ error: '当前时间段不能报名' }, { status: 400 });
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
    
    if (existingAccount.length > 0) {
      return NextResponse.json({ 
        error: '今日已报名',
        account: {
          initialCapital: Number(existingAccount[0].initialCapital),
          currentBalance: Number(existingAccount[0].currentBalance),
          profit: Number(existingAccount[0].currentBalance) - Number(existingAccount[0].initialCapital),
        }
      }, { status: 400 });
    }
    
    // 获取用户信息
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.userId, session.user.id));
    
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
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
      
      // 扣除费用
      await connection.execute(
        `UPDATE user_accounts SET gold_balance = gold_balance - ?, coin_balance = coin_balance - ? WHERE user_id = ?`,
        [config.entryFeeGold, config.initialCapitalSilver, session.user.id]
      );
      
      // 创建赛事账户
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
        profit: 0,
      }
    });
  } catch (error) {
    console.error('Daily challenge register error:', error);
    return NextResponse.json({ error: '报名失败' }, { status: 500 });
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
