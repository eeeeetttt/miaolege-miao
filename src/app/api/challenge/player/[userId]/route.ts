import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;

    const [accounts] = await pool.query(
      `SELECT ma.*, ua.name as user_name, ua.avatar_url 
       FROM match_accounts ma
       JOIN user_accounts ua ON ma.user_id = ua.user_id
       WHERE ma.user_id = ?`,
      [userId]
    ) as [any[], any];

    const [positions] = await pool.query(
      'SELECT * FROM match_positions WHERE user_id = ?',
      [userId]
    ) as [any[], any];

    const [levels] = await pool.query(
      'SELECT * FROM challenge_level_config ORDER BY level_order ASC'
    ) as [any[], any];

    return NextResponse.json({
      accounts,
      positions,
      levels
    });
  } catch (error: any) {
    console.error('获取玩家信息失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
