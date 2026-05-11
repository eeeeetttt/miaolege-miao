import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

// 点赞建议
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { suggestionId } = await request.json();
    const userId = session.user.id;

    // 检查是否已点赞
    const [existing] = await pool.query(
      'SELECT * FROM suggestion_likes WHERE suggestion_id = ? AND user_id = ?',
      [suggestionId, userId]
    ) as [any[], any];

    if (existing.length > 0) {
      // 取消点赞
      await pool.query(
        'DELETE FROM suggestion_likes WHERE suggestion_id = ? AND user_id = ?',
        [suggestionId, userId]
      );
      await pool.query(
        'UPDATE suggestions SET like_count = like_count - 1 WHERE id = ?',
        [suggestionId]
      );
      return NextResponse.json({ success: true, liked: false });
    } else {
      // 添加点赞
      await pool.query(
        'INSERT INTO suggestion_likes (id, suggestion_id, user_id, created_at) VALUES (UUID(), ?, ?, NOW())',
        [suggestionId, userId]
      );
      await pool.query(
        'UPDATE suggestions SET like_count = like_count + 1 WHERE id = ?',
        [suggestionId]
      );
      return NextResponse.json({ success: true, liked: true });
    }
  } catch (error: any) {
    console.error('点赞失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
