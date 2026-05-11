import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

// 获取关注列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'following'; // following 或 followers
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const offset = (page - 1) * pageSize;

    let rows: any[] = [];
    let total = 0;

    if (type === 'following') {
      const [countResult] = await pool.query(
        'SELECT COUNT(*) as cnt FROM user_follows WHERE follower_id = ?',
        [userId]
      ) as [any[], any];
      total = countResult[0]?.cnt || 0;

      [rows] = await pool.query(
        `SELECT uf.created_at, ua.user_id, ua.email, ua.name, ua.avatar_url
         FROM user_follows uf
         JOIN user_accounts ua ON uf.following_id = ua.user_id
         WHERE uf.follower_id = ?
         ORDER BY uf.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, pageSize, offset]
      ) as [any[], any];
    } else {
      const [countResult] = await pool.query(
        'SELECT COUNT(*) as cnt FROM user_follows WHERE following_id = ?',
        [userId]
      ) as [any[], any];
      total = countResult[0]?.cnt || 0;

      [rows] = await pool.query(
        `SELECT uf.created_at, ua.user_id, ua.email, ua.name, ua.avatar_url
         FROM user_follows uf
         JOIN user_accounts ua ON uf.follower_id = ua.user_id
         WHERE uf.following_id = ?
         ORDER BY uf.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, pageSize, offset]
      ) as [any[], any];
    }

    return NextResponse.json({
      list: rows,
      total,
      page,
      pageSize
    });
  } catch (error: any) {
    console.error('获取关注列表失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
