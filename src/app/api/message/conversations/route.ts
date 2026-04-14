import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// 获取私信会话列表
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const page = parseInt(new URL(request.url).searchParams.get('page') || '1');
    const pageSize = parseInt(new URL(request.url).searchParams.get('pageSize') || '20');
    const offset = (page - 1) * pageSize;

    // 获取用户发送和接收的所有私信
    const { data: allMessages, error } = await supabase
      .from('private_messages')
      .select('id, sender_id, receiver_id, content, is_read, created_at')
      .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`获取会话失败: ${error.message}`);

    // 按对话分组（每组是和一个用户的全部消息）
    const conversationMap = new Map<string, {
      userId: string;
      lastMessage: typeof allMessages[0];
      unreadCount: number;
    }>();

    for (const msg of allMessages || []) {
      const otherUserId = msg.sender_id === session.user.id ? msg.receiver_id : msg.sender_id;
      
      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, {
          userId: otherUserId,
          lastMessage: msg,
          unreadCount: 0,
        });
      }

      // 计算未读数
      if (msg.receiver_id === session.user.id && msg.is_read === 0) {
        const conv = conversationMap.get(otherUserId)!;
        conv.unreadCount++;
      }
    }

    // 转换为数组并按最后消息时间排序
    const conversations = Array.from(conversationMap.values())
      .sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime())
      .slice(offset, offset + pageSize);

    // 获取对方用户信息
    const userIds = conversations.map(c => c.userId);
    const userInfoMap = new Map<string, { name: string; avatar: string | null; coinBalance: number }>();

    if (userIds.length > 0) {
      // 从MySQL获取用户信息（包含coinBalance）
      for (const uid of userIds) {
        const [user] = await db
          .select({ name: users.name, avatar: users.avatar, coinBalance: users.coinBalance })
          .from(users)
          .where(eq(users.userId, uid))
          .limit(1);
        
        if (user) {
          userInfoMap.set(uid, {
            name: user.name || '未知用户',
            avatar: user.avatar || null,
            coinBalance: user.coinBalance || 0,
          });
        }
      }
    }

    // 组合返回数据
    const result = conversations.map(conv => ({
      userId: conv.userId,
      userName: userInfoMap.get(conv.userId)?.name || '未知用户',
      userAvatar: userInfoMap.get(conv.userId)?.avatar || null,
      uBalance: userInfoMap.get(conv.userId)?.coinBalance || 0,
      lastMessage: {
        id: conv.lastMessage.id,
        content: conv.lastMessage.content,
        senderId: conv.lastMessage.sender_id,
        createdAt: conv.lastMessage.created_at,
      },
      unreadCount: conv.unreadCount,
    }));

    return NextResponse.json({
      success: true,
      data: result,
      page,
      pageSize,
      total: conversationMap.size,
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '获取失败' 
    }, { status: 500 });
  }
}
