import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 发送私信
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }
    
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

    if (content && content.length > 2000) {
      return NextResponse.json({ error: '私信内容不能超过2000字符' }, { status: 400 });
    }

    // 插入私信
    const { data, error } = await supabase
      .from('private_messages')
      .insert({
        sender_id: session.user.id,
        receiver_id: receiverId,
        content: content || '[图片]',
        image_url: imageUrl || null,
        is_read: 0,
      })
      .select('id, created_at')
      .single();

    if (error) throw new Error(`发送私信失败: ${error.message}`);

    return NextResponse.json({
      success: true,
      message: '发送成功',
      data: {
        id: data.id,
        createdAt: data.created_at,
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
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationUserId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    if (!conversationUserId) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
    }

    const offset = (page - 1) * pageSize;

    // 获取与该用户的私信记录（双方消息）
    const { data, error } = await supabase
      .from('private_messages')
      .select('id, sender_id, receiver_id, content, is_read, read_at, created_at')
      .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${conversationUserId}),and(sender_id.eq.${conversationUserId},receiver_id.eq.${session.user.id})`)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`获取私信失败: ${error.message}`);

    // 将未读消息标记为已读
    const unreadIds = data
      ?.filter(m => m.sender_id === conversationUserId && m.is_read === 0)
      .map(m => m.id) || [];

    if (unreadIds.length > 0) {
      await supabase
        .from('private_messages')
        .update({ is_read: 1, read_at: new Date().toISOString() })
        .in('id', unreadIds);
    }

    return NextResponse.json({
      success: true,
      data: data?.reverse() || [],
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '获取失败' 
    }, { status: 500 });
  }
}
