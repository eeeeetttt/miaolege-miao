import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

// 发送私信
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { receiverId, content, imageUrl } = await request.json();

    if (!receiverId) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    // 检查是否有内容或图片
    if (!content && !imageUrl) {
      return NextResponse.json({ error: '消息内容不能为空' }, { status: 400 });
    }

    // 组合消息内容：如果有图片，将图片URL附加到内容中
    let messageContent = content || '';
    if (imageUrl) {
      messageContent = messageContent 
        ? `${messageContent}\n[图片]${imageUrl}` 
        : `[图片]${imageUrl}`;
    }

    if (messageContent.length > 2000) {
      return NextResponse.json({ error: '私信内容不能超过2000字符' }, { status: 400 });
    }

    // 插入私信
    const result = await query(
      'INSERT INTO private_messages (sender_id, receiver_id, content, is_read, created_at) VALUES (?, ?, ?, 0, NOW())',
      [session.user.id, receiverId, messageContent]
    );

    return NextResponse.json({
      success: true,
      message: '发送成功',
      data: {
        id: (result as any).insertId,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '发送失败' 
    }, { status: 500 });
  }
}

// 获取与某用户的私信会话
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const otherUserId = searchParams.get('userId');

    if (!otherUserId) {
      return NextResponse.json({ error: '缺少用户ID参数' }, { status: 400 });
    }

    // 获取当前用户名称
    const users = await query(
      'SELECT name FROM users WHERE user_id = ?',
      [session.user.id]
    );
    const currentUserName = users?.[0]?.name || '未知用户';

    // 获取私信记录（双方消息）
    const messages = await query(
      `SELECT * FROM private_messages 
       WHERE (sender_id = ? AND receiver_id = ?) 
          OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at ASC`,
      [session.user.id, otherUserId, otherUserId, session.user.id]
    );

    // 获取对方用户信息
    const otherUsers = await query(
      'SELECT user_id, name, avatar FROM users WHERE user_id = ?',
      [otherUserId]
    );

    return NextResponse.json({
      messages: messages || [],
      otherUser: otherUsers?.[0] || null,
      currentUserName,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ messages: [], otherUser: null });
  }
}
