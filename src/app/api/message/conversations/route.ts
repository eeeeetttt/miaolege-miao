import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

// 获取私信会话列表
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ conversations: [] });
    }

    // 获取与当前用户相关的最新私信，按会话分组
    const messages = await query(
      `SELECT 
        CASE 
          WHEN sender_id = ? THEN receiver_id 
          ELSE sender_id 
        END as other_user_id,
        MAX(created_at) as last_time
       FROM private_messages
       WHERE sender_id = ? OR receiver_id = ?
       GROUP BY other_user_id
       ORDER BY last_time DESC`,
      [session.user.id, session.user.id, session.user.id]
    );

    if (!messages || messages.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    // 获取每个会话的详细信息
    const conversations = [];
    for (const msg of messages) {
      const otherUsers = await query(
        'SELECT user_id, name, avatar FROM users WHERE user_id = ?',
        [msg.other_user_id]
      );

      const lastMessages = await query(
        `SELECT content, sender_id, created_at FROM private_messages 
         WHERE (sender_id = ? AND receiver_id = ?) 
            OR (sender_id = ? AND receiver_id = ?)
         ORDER BY created_at DESC LIMIT 1`,
        [session.user.id, msg.other_user_id, msg.other_user_id, session.user.id]
      );

      // 获取未读消息数量
      const unreadCountResult = await query(
        'SELECT COUNT(*) as count FROM private_messages WHERE sender_id = ? AND receiver_id = ? AND is_read = 0',
        [msg.other_user_id, session.user.id]
      );
      const unreadCount = unreadCountResult?.[0]?.count || 0;

      if (otherUsers?.[0]) {
        conversations.push({
          user: otherUsers[0],
          lastMessage: lastMessages?.[0] || null,
          lastTime: msg.last_time,
          unreadCount,
        });
      }
    }

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    return NextResponse.json({ conversations: [] });
  }
}
