import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

// 获取当前挑战账户的净值
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const userId = session.user.id;

    // 从 MySQL 获取用户进行中的挑战
    const [challenges] = await pool.execute(
      `SELECT * FROM challenge_registrations WHERE user_id = ? AND status = 'active' LIMIT 1`
    ) as [any[], any];

    if (!challenges || challenges.length === 0) {
      return NextResponse.json({ 
        hasActiveChallenge: false,
        balance: null,
        error: '没有进行中的挑战',
      });
    }

    const activeChallenge = challenges[0];

    // 获取账户净值
    const [accounts] = await pool.execute(
      `SELECT * FROM match_accounts WHERE user_id = ? AND status = 'active' LIMIT 1`
    ) as [any[], any];

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        hasActiveChallenge: true,
        challengeId: activeChallenge.id,
        currentLevel: activeChallenge.current_level,
        balance: null,
        error: '账户未激活',
      });
    }

    const account = accounts[0];

    return NextResponse.json({
      hasActiveChallenge: true,
      challengeId: activeChallenge.id,
      currentLevel: activeChallenge.current_level,
      completedLevels: activeChallenge.completed_levels,
      balance: {
        equity: account.current_equity || 0,
        balance: account.balance || 0,
        profit: account.profit || 0,
      },
      account: {
        id: account.account_id,
        type: account.match_type,
        status: account.status,
      }
    });
  } catch (error) {
    console.error('获取净值错误:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
