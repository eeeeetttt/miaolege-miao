import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { matchAccounts, matchConfigs, userAccounts } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';

interface MonthlyConfig {
  enabled: boolean;
  entryFeeGold: number;
  initialCapitalSilver: number;
  duration: number;
  rewards: string;
}

// 获取月度总决赛配置
async function getMonthlyConfig(): Promise<MonthlyConfig> {
  const configs = await db.select().from(matchConfigs).where(eq(matchConfigs.matchType, 'monthly'));
  if (configs.length === 0 || !configs[0].configValue) {
    return {
      enabled: true,
      entryFeeGold: 0,
      initialCapitalSilver: 100000,
      duration: 3,
      rewards: JSON.stringify([
        { rank: 1, gold: 10000, title: '月度冠军' },
        { rank: 2, gold: 5000, title: '月度亚军' },
        { rank: 3, gold: 3000, title: '月度季军' },
        { rank: '4-10', gold: 1000, title: null },
      ]),
    };
  }
  try {
    const value = JSON.parse(configs[0].configValue);
    return { ...value, enabled: true };
  } catch {
    return {
      enabled: true,
      entryFeeGold: 0,
      initialCapitalSilver: 100000,
      duration: 3,
      rewards: JSON.stringify([
        { rank: 1, gold: 10000, title: '月度冠军' },
        { rank: 2, gold: 5000, title: '月度亚军' },
        { rank: 3, gold: 3000, title: '月度季军' },
        { rank: '4-10', gold: 1000, title: null },
      ]),
    };
  }
}

// 获取参赛要求
function getRequirements(config: any) {
  return {
    debtMustBeZero: true,
    requireLadderTop: 100,
  };
}

// 获取本月剩余天数
function getRemainingDays(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.getDate() - now.getDate();
}

export async function GET(request: NextRequest) {
  try {
    const config = await getMonthlyConfig();
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    // 获取所有进行中的月度赛账户
    const accounts = await db
      .select({
        id: matchAccounts.id,
        userId: matchAccounts.userId,
        currentBalance: matchAccounts.currentBalance,
        initialCapital: matchAccounts.initialCapital,
        status: matchAccounts.status,
        createdAt: matchAccounts.createdAt,
      })
      .from(matchAccounts)
      .leftJoin(userAccounts, eq(userAccounts.userId, matchAccounts.userId))
      .where(and(
        eq(matchAccounts.matchType, 'monthly'),
        eq(matchAccounts.status, 'active')
      ))
      .orderBy(desc(matchAccounts.currentBalance));

    // 计算收益率
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
    const remainingDays = getRemainingDays();
    
    if (userId) {
      const [account] = await db
        .select()
        .from(matchAccounts)
        .where(and(
          eq(matchAccounts.userId, userId),
          eq(matchAccounts.matchType, 'monthly'),
          eq(matchAccounts.status, 'active')
        ));
      myAccount = account;
    }

    // 获取排行榜
    const leaderboard = accountsWithReturn.slice(0, 20).map((acc, index) => ({
      rank: index + 1,
      userName: acc.userName,
      returnRate: acc.returnRate,
      currentValue: Number(acc.currentBalance),
    }));

    return NextResponse.json({
      config,
      requirements,
      myAccount: myAccount ? {
        id: myAccount.id,
        currentValue: Number(myAccount.currentBalance),
        initialValue: Number(myAccount.initialCapital),
        status: myAccount.status,
      } : null,
      leaderboard,
      totalParticipants: accounts.length,
      remainingDays,
      status: myAccount ? 'enrolled' : (config.enabled ? 'open' : 'closed'),
    });
  } catch (error) {
    console.error('Get monthly challenge error:', error);
    return NextResponse.json({ error: '获取月度总决赛信息失败' }, { status: 500 });
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
    
    const config = await getMonthlyConfig();
    
    if (!config.enabled) {
      return NextResponse.json({ error: '月度总决赛已关闭' }, { status: 400 });
    }

    // 获取用户信息 - 使用 email 查询
    const userEmail = session.user.email as string;
    console.log('[月度总决赛] 用户邮箱:', userEmail);
    
    const [user] = await db
      .select()
      .from(userAccounts)
      .where(eq(userAccounts.email, userEmail));
    
    if (!user) {
      console.log('[月度总决赛] 用户不存在，邮箱:', userEmail);
      return NextResponse.json({ error: '用户账户不存在，请刷新页面重试' }, { status: 404 });
    }

    const requirements = getRequirements(config);

    // 检查报名条件
    if (requirements.debtMustBeZero && Number(user.totalDebt || 0) > 0) {
      return NextResponse.json({ error: '有负债不能参加月度总决赛' }, { status: 400 });
    }

    // 检查是否有活跃账户
    const activeAccount = await db
      .select()
      .from(matchAccounts)
      .where(and(
        eq(matchAccounts.userId, session.user.id as string),
        eq(matchAccounts.matchType, 'monthly'),
        eq(matchAccounts.status, 'active')
      ));

    if (action === 'enroll') {
      if (activeAccount.length > 0) {
        return NextResponse.json({ error: '您已在月度总决赛中' }, { status: 400 });
      }

      // 扣除本金（免费报名）
      const initialCapital = config.initialCapitalSilver || 100000;

      if (Number(user.coinBalance || 0) < initialCapital) {
        return NextResponse.json({ error: `银两不足，需要${initialCapital}银两` }, { status: 400 });
      }

      // 创建比赛账户
      const matchId = `monthly_${session.user.id}_${Date.now()}`;
      await db.insert(matchAccounts).values({
        userId: session.user.id as string,
        matchId,
        matchType: 'monthly',
        initialCapital: String(initialCapital),
        currentBalance: String(initialCapital),
        status: 'active',
      });

      // 扣除本金
      await db.update(userAccounts)
        .set({ 
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
        return NextResponse.json({ error: '您未参加月度总决赛' }, { status: 400 });
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

    return NextResponse.json({ error: '无效操作' }, { status: 400 });
  } catch (error) {
    console.error('Monthly challenge action error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
