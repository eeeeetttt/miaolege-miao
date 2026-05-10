import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';
import { RowDataPacket, FieldPacket } from 'mysql2';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  // 检查是否是管理员
  if (session.user.email !== '497209390@qq.com' && session.user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    // 获取所有用户和AI的参赛盈利数据
    const [userStats] = await pool.execute(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.avatar,
        u.is_ai,
        COALESCE(ma.match_type, 'total') as match_type,
        COALESCE(ma.total_profit, 0) as total_profit,
        COALESCE(ma.total_trades, 0) as total_trades,
        COALESCE(ma.win_rate, 0) as win_rate,
        COALESCE(ma.best_profit, 0) as best_profit,
        COALESCE(ma.current_balance, 0) as current_balance,
        COALESCE(ma.participated_challenges, 0) as participated_challenges,
        COALESCE(ma.won_challenges, 0) as won_challenges
      FROM users u
      LEFT JOIN (
        SELECT 
          user_id,
          match_type,
          SUM(COALESCE(NULLIF(profit, ''), 0)) as total_profit,
          COUNT(*) as total_trades,
          ROUND(SUM(CASE WHEN COALESCE(NULLIF(profit, ''), 0) > 0 THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as win_rate,
          MAX(COALESCE(NULLIF(profit, ''), 0)) as best_profit,
          SUM(current_balance) as current_balance,
          COUNT(DISTINCT match_id) as participated_challenges,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as won_challenges
        FROM match_accounts
        WHERE status IN ('active', 'completed')
        GROUP BY user_id, match_type
      ) ma ON u.id = ma.user_id
      WHERE u.is_ai = TRUE OR EXISTS (
        SELECT 1 FROM match_accounts WHERE user_id = u.id
      )
      ORDER BY u.is_ai DESC, total_profit DESC
    `) as [RowDataPacket[], FieldPacket[]];

    // 统计总览数据
    const [overviewStats] = await pool.execute(`
      SELECT 
        COUNT(DISTINCT user_id) as total_participants,
        COUNT(*) as total_accounts,
        SUM(COALESCE(NULLIF(current_balance, ''), 0)) as total_balance,
        SUM(COALESCE(NULLIF(current_balance, ''), 0) - COALESCE(NULLIF(initial_capital, ''), 0)) as total_profit
      FROM match_accounts
      WHERE status IN ('active', 'completed')
    `) as [RowDataPacket[], FieldPacket[]];

    // 按赛事分组统计
    const [matchStats] = await pool.execute(`
      SELECT 
        match_type,
        COUNT(*) as participants,
        SUM(COALESCE(NULLIF(current_balance, ''), 0)) as total_balance,
        SUM(COALESCE(NULLIF(current_balance, ''), 0) - COALESCE(NULLIF(initial_capital, ''), 0)) as total_profit,
        MAX(COALESCE(NULLIF(current_balance, ''), 0) - COALESCE(NULLIF(initial_capital, ''), 0)) as best_profit,
        AVG(COALESCE(NULLIF(current_balance, ''), 0) - COALESCE(NULLIF(initial_capital, ''), 0)) as avg_profit
      FROM match_accounts
      WHERE status IN ('active', 'completed')
      GROUP BY match_type
    `) as [RowDataPacket[], FieldPacket[]];

    // AI用户盈利排行榜
    const aiLeaderboard = userStats
      .filter(u => u.is_ai)
      .map((u, index) => ({
        rank: index + 1,
        id: u.id,
        name: u.name,
        matchType: u.match_type,
        totalProfit: Number(u.total_profit) || 0,
        totalTrades: Number(u.total_trades) || 0,
        winRate: Number(u.win_rate) || 0,
        currentBalance: Number(u.current_balance) || 0,
      }))
      .sort((a, b) => b.totalProfit - a.totalProfit);

    // 真实用户盈利排行榜
    const userLeaderboard = userStats
      .filter(u => !u.is_ai)
      .map((u, index) => ({
        rank: index + 1,
        id: u.id,
        name: u.name,
        email: u.email,
        matchType: u.match_type,
        totalProfit: Number(u.total_profit) || 0,
        totalTrades: Number(u.total_trades) || 0,
        winRate: Number(u.win_rate) || 0,
        currentBalance: Number(u.current_balance) || 0,
        participatedChallenges: Number(u.participated_challenges) || 0,
        wonChallenges: Number(u.won_challenges) || 0,
      }))
      .sort((a, b) => b.totalProfit - a.totalProfit);

    return NextResponse.json({
      success: true,
      overview: {
        totalParticipants: Number(overviewStats[0]?.total_participants) || 0,
        totalAccounts: Number(overviewStats[0]?.total_accounts) || 0,
        totalBalance: Number(overviewStats[0]?.total_balance) || 0,
        totalProfit: Number(overviewStats[0]?.total_profit) || 0,
      },
      matchStats: matchStats.map(m => ({
        type: m.match_type,
        participants: Number(m.participants) || 0,
        totalBalance: Number(m.total_balance) || 0,
        totalProfit: Number(m.total_profit) || 0,
        bestProfit: Number(m.best_profit) || 0,
        avgProfit: Number(m.avg_profit) || 0,
      })),
      aiLeaderboard,
      userLeaderboard,
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}
