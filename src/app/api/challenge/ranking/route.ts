import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

// 获取排名数据
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // 获取所有活跃挑战者的排名
    const registrations = await query(`
      SELECT cr.id, cr.user_id, cr.current_level, cr.status, cr.created_at,
             u.name as user_name, u.avatar
      FROM challenge_registrations cr
      JOIN users u ON cr.user_id = u.user_id
      WHERE cr.status IN ('active', 'level_passed')
      ORDER BY cr.created_at DESC
    `);

    // 获取每个用户的最新净值
    const rankings = await Promise.all(
      (registrations || []).map(async (reg: any, index: number) => {
        // 获取该用户当前关卡的初始净值
        const levelConfig = await query(
          'SELECT initial_balance FROM challenge_level_config WHERE level = ?',
          [reg.current_level || 1]
        );
        const initialBalance = levelConfig?.[0]?.initial_balance || 1000;

        // 获取最新净值 (使用MySQL)
        const equityHistory = await query(
          'SELECT equity FROM challenge_equity_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
          [reg.user_id]
        );
        const latestEquity = equityHistory?.[0]?.equity;

        const currentEquity = latestEquity || initialBalance;
        const profitPercent = ((currentEquity - initialBalance) / initialBalance) * 100;

        return {
          rank: index + 1,
          userId: reg.user_id,
          userName: reg.user_name || '匿名用户',
          level: reg.current_level || 1,
          balance: currentEquity,
          profitPercent: profitPercent
        };
      })
    );

    // 按收益率排序
    rankings.sort((a, b) => b.profitPercent - a.profitPercent);

    // 重新分配排名
    rankings.forEach((item, index) => {
      item.rank = index + 1;
    });

    // 如果用户已登录，标记用户自己的排名
    if (session?.user?.id) {
      const userRankIndex = rankings.findIndex(r => r.userId === session.user.id);
      if (userRankIndex !== -1) {
        rankings[userRankIndex].userName = rankings[userRankIndex].userName + ' (你)';
      }
    }

    // 如果没有数据，返回默认排名
    if (rankings.length === 0) {
      return NextResponse.json({
        rankings: getDefaultRankings(),
        totalParticipants: 0
      });
    }

    return NextResponse.json({
      rankings,
      totalParticipants: rankings.length
    });

  } catch (error) {
    console.error('排名API错误:', error);
    // 返回默认排名数据
    return NextResponse.json({
      rankings: getDefaultRankings(),
      totalParticipants: 0
    });
  }
}

// 默认排名数据（用于没有数据时展示）
function getDefaultRankings() {
  return [
    { rank: 1, userName: '交易高手', level: 8, balance: 2850, profitPercent: 185.0 },
    { rank: 2, userName: '黄金猎手', level: 7, balance: 2100, profitPercent: 110.0 },
    { rank: 3, userName: '趋势追踪', level: 6, balance: 1850, profitPercent: 85.0 },
    { rank: 4, userName: '波段之王', level: 5, balance: 1650, profitPercent: 65.0 },
    { rank: 5, userName: '突破交易', level: 4, balance: 1520, profitPercent: 52.0 },
  ];
}
