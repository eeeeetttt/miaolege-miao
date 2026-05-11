import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// 获取挑战赛大厅数据
export async function GET() {
  try {
    // 获取所有进行中的挑战记录
    const [registrations] = await pool.execute(
      `SELECT cr.*, ma.current_equity 
       FROM challenge_registrations cr
       LEFT JOIN match_accounts ma ON cr.user_id = ma.user_id AND ma.status = 'active'
       WHERE cr.status IN ('active', 'level_passed')
       ORDER BY cr.created_at DESC`
    ) as [any[], any];

    // 获取用户信息
    const userIds = registrations?.map((r: any) => r.user_id) || [];
    let userMap: Record<string, any> = {};

    if (userIds.length > 0) {
      const placeholders = userIds.map(() => '?').join(',');
      const [users] = await pool.execute(
        `SELECT user_id, name, avatar_url FROM user_accounts WHERE user_id IN (${placeholders})`,
        userIds
      ) as [any[], any];
      
      users?.forEach((u: any) => {
        userMap[u.user_id] = u;
      });
    }

    const data = registrations?.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      userName: userMap[r.user_id]?.name || '匿名用户',
      userAvatar: userMap[r.user_id]?.avatar_url,
      status: r.status,
      currentLevel: r.current_level,
      completedLevels: r.completed_levels,
      equity: r.current_equity || 0,
      createdAt: r.created_at,
    })) || [];

    return NextResponse.json({
      success: true,
      data,
      total: data.length,
    });
  } catch (error) {
    console.error('获取大厅数据错误:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
