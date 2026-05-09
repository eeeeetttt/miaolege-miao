import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, pool } from '@/lib/db';
import { matchAccounts, matchConfigs, matchRecords, userAccounts } from '@/lib/schema';
import { eq, and, desc, asc } from 'drizzle-orm';

// 获取天梯赛配置
async function getLadderConfig() {
  const configs = await db
    .select()
    .from(matchConfigs)
    .where(eq(matchConfigs.matchType, 'ladder'));
  
  const configMap: Record<string, string> = {};
  configs.forEach(c => {
    configMap[c.configKey] = c.configValue || '';
  });
  
  return {
    entryCapitalSilver: parseFloat(configMap.entry_capital_silver || '10000'),
    seasonDays: parseInt(configMap.season_days || '30'),
    rewardTiers: JSON.parse(configMap.reward_tiers || '[]'),
    enabled: configMap.enabled === 'true',
  };
}

// 获取当前赛季
function getCurrentSeason() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// 获取天梯赛状态
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  
  try {
    const config = await getLadderConfig();
    const currentSeason = getCurrentSeason();
    
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
          eq(matchAccounts.matchType, 'ladder'),
          eq(matchAccounts.status, 'active'),
          eq(matchAccounts.seasonMonth, currentSeason)
        ))
        .orderBy(desc(matchAccounts.currentBalance))
        .limit(100);
      
      // 计算收益率并排序
      const rankedList = rankings.map((r, index) => ({
        rank: index + 1,
        userId: r.userId,
        userName: r.userName || '神秘用户',
        initialCapital: Number(r.initialCapital),
        currentBalance: Number(r.currentBalance),
        profitRate: ((Number(r.currentBalance) / Number(r.initialCapital) - 1) * 100).toFixed(2),
      }));
      
      return NextResponse.json({
        season: currentSeason,
        rankings: rankedList,
      });
    }
    
    // 未登录用户
    if (!session?.user?.id) {
      return NextResponse.json({
        config,
        season: currentSeason,
        isRegistered: false,
        myRank: null,
      });
    }
    
    // 获取用户当前赛季状态
    const myAccount = await db
      .select()
      .from(matchAccounts)
      .where(and(
        eq(matchAccounts.userId, session.user.id),
        eq(matchAccounts.matchType, 'ladder'),
        eq(matchAccounts.seasonMonth, currentSeason)
      ))
      .limit(1);
    
    // 获取我的排名
    let myRank = null;
    if (myAccount.length > 0) {
      const rankCount = await db
        .select()
        .from(matchAccounts)
        .where(and(
          eq(matchAccounts.matchType, 'ladder'),
          eq(matchAccounts.status, 'active'),
          eq(matchAccounts.seasonMonth, currentSeason),
        ));
      
      const higherRank = rankCount.filter(a => 
        Number(a.currentBalance) > Number(myAccount[0].currentBalance)
      );
      myRank = higherRank.length + 1;
    }
    
    return NextResponse.json({
      config,
      season: currentSeason,
      isRegistered: myAccount.length > 0,
      myAccount: myAccount[0] ? {
        initialCapital: Number(myAccount[0].initialCapital),
        currentBalance: Number(myAccount[0].currentBalance),
        profitRate: ((Number(myAccount[0].currentBalance) / Number(myAccount[0].initialCapital) - 1) * 100).toFixed(2),
      } : null,
      myRank,
    });
  } catch (error) {
    console.error('Get ladder status error:', error);
    return NextResponse.json({ error: '获取状态失败' }, { status: 500 });
  }
}

// 天梯赛报名
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  
  try {
    const config = await getLadderConfig();
    const currentSeason = getCurrentSeason();
    
    if (!config.enabled) {
      return NextResponse.json({ error: '天梯赛已关闭' }, { status: 400 });
    }
    
    // 检查是否已报名
    const existingAccount = await db
      .select()
      .from(matchAccounts)
      .where(and(
        eq(matchAccounts.userId, session.user.id),
        eq(matchAccounts.matchType, 'ladder'),
        eq(matchAccounts.seasonMonth, currentSeason)
      ))
      .limit(1);
    
    if (existingAccount.length > 0) {
      return NextResponse.json({ 
        error: '本月已报名',
        account: {
          initialCapital: Number(existingAccount[0].initialCapital),
          currentBalance: Number(existingAccount[0].currentBalance),
        }
      }, { status: 400 });
    }
    
    // 获取用户信息
    const userId = session.user.id as string;
    console.log('[天梯赛] 用户ID:', userId);
    
    const [user] = await db
      .select()
      .from(userAccounts)
      .where(eq(userAccounts.userId, userId));
    
    if (!user) {
      console.log('[天梯赛] 用户不存在，userId:', userId);
      return NextResponse.json({ error: '用户账户不存在，请刷新页面重试' }, { status: 404 });
    }
    
    // 检查银两
    const userCoin = Number(user.coinBalance || 0);
    if (userCoin < config.entryCapitalSilver) {
      return NextResponse.json({ error: `银两不足，需要${config.entryCapitalSilver}银两` }, { status: 400 });
    }
    
    // 创建账户
    const matchId = `ladder_${currentSeason}_${session.user.id}`;
    
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // 扣除银两
      await connection.execute(
        `UPDATE user_accounts SET coin_balance = coin_balance - ? WHERE user_id = ?`,
        [config.entryCapitalSilver, session.user.id]
      );
      
      // 创建赛事账户
      await connection.execute(
        `INSERT INTO match_accounts (user_id, match_id, match_type, initial_capital, current_balance, season_month, status)
         VALUES (?, ?, 'ladder', ?, ?, ?, 'active')`,
        [session.user.id, matchId, config.entryCapitalSilver, config.entryCapitalSilver, currentSeason]
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
      message: `报名成功，本赛季加油！`,
      account: {
        initialCapital: config.entryCapitalSilver,
        currentBalance: config.entryCapitalSilver,
      }
    });
  } catch (error) {
    console.error('Ladder register error:', error);
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
    
    const currentSeason = getCurrentSeason();
    
    // 获取账户
    const activeAccount = await db
      .select()
      .from(matchAccounts)
      .where(and(
        eq(matchAccounts.userId, session.user.id),
        eq(matchAccounts.matchType, 'ladder'),
        eq(matchAccounts.seasonMonth, currentSeason),
        eq(matchAccounts.status, 'active')
      ))
      .limit(1);
    
    if (activeAccount.length === 0) {
      return NextResponse.json({ error: '没有进行中的赛季' }, { status: 400 });
    }
    
    // 更新净值
    await db
      .update(matchAccounts)
      .set({ currentBalance: String(newBalance) })
      .where(eq(matchAccounts.id, activeAccount[0].id));
    
    return NextResponse.json({
      success: true,
      currentBalance: newBalance,
    });
  } catch (error) {
    console.error('Update ladder balance error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
