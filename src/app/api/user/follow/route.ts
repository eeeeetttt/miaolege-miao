import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

// 获取/创建关注关系
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('targetUserId');

    if (targetUserId) {
      // 查询关注状态
      const [rows] = await pool.query(
        'SELECT * FROM user_follows WHERE follower_id = ? AND following_id = ?',
        [userId, targetUserId]
      ) as [any[], any];
      
      return NextResponse.json({ following: rows.length > 0 });
    }

    return NextResponse.json({ error: '缺少目标用户ID' }, { status: 400 });
  } catch (error: any) {
    console.error('获取关注状态失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 添加/取消关注
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const userId = session.user.id;
    const { targetUserId, action } = await request.json();

    if (!targetUserId) {
      return NextResponse.json({ error: '缺少目标用户ID' }, { status: 400 });
    }

    if (action === 'follow') {
      await pool.query(
        'INSERT IGNORE INTO user_follows (id, follower_id, following_id) VALUES (UUID(), ?, ?)',
        [userId, targetUserId]
      );
      return NextResponse.json({ success: true, message: '关注成功' });
    } else {
      await pool.query(
        'DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?',
        [userId, targetUserId]
      );
      return NextResponse.json({ success: true, message: '取消关注成功' });
    }
  } catch (error: any) {
    console.error('关注操作失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
