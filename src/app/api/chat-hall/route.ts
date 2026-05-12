import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// 获取聊天消息
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');

    // 获取消息
    const [messages] = await pool.execute(
      `SELECT m.id, m.user_id, m.user_name, m.content, m.is_system, m.is_premium, m.created_at,
              u.role as user_role
       FROM chat_hall_messages m
       LEFT JOIN users u ON m.user_id = u.id
       ORDER BY m.created_at DESC
       LIMIT ?`,
      [limit]
    );

    // 获取配置
    const [configRows] = await pool.execute(
      `SELECT * FROM chat_hall_config LIMIT 1`
    );
    
    const config = (configRows as any[])[0] || {
      enabled: true,
      cooldown_seconds: 60,
      max_message_length: 500
    };

    return NextResponse.json({
      success: true,
      messages: (messages as any[]).reverse(),
      config
    });
  } catch (error) {
    console.error('获取聊天消息失败:', error);
    return NextResponse.json({ 
      success: false, 
      error: '获取消息失败',
      messages: [],
      config: { enabled: true, cooldown_seconds: 60, max_message_length: 500 }
    });
  }
}

// 发送消息
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '请先登录' });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ success: false, error: '消息内容不能为空' });
    }

    // 检查是否被禁言
    const [muteRows] = await pool.execute(
      `SELECT * FROM chat_hall_mutes WHERE user_id = ? AND (expires_at IS NULL OR expires_at > NOW())`,
      [session.user.id]
    );
    
    if ((muteRows as any[]).length > 0) {
      return NextResponse.json({ success: false, error: '你已被禁言' });
    }

    // 检查消息长度
    const [configRows] = await pool.execute(
      `SELECT max_message_length FROM chat_hall_config LIMIT 1`
    );
    const maxLength = (configRows as any[])[0]?.max_message_length || 500;
    
    if (content.length > maxLength) {
      return NextResponse.json({ success: false, error: `消息长度不能超过${maxLength}字` });
    }

    // 获取用户信息
    const [userRows] = await pool.execute(
      `SELECT name, role FROM users WHERE id = ?`,
      [session.user.id]
    );
    const user = (userRows as any[])[0];
    const isPremium = user?.role === 'premium' || user?.role === 'vip' || user?.role === 'admin';

    // 保存消息
    await pool.execute(
      `INSERT INTO chat_hall_messages (user_id, user_name, content, is_system, is_premium, created_at) 
       VALUES (?, ?, ?, false, ?, NOW())`,
      [session.user.id, user?.name || session.user.name || '用户', content, isPremium]
    );

    return NextResponse.json({ success: true, message: '发送成功' });
  } catch (error) {
    console.error('发送消息失败:', error);
    return NextResponse.json({ success: false, error: '发送失败' });
  }
}
