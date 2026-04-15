import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 异步清理24小时之前的消息（不阻塞主请求）
async function cleanupOldMessages(supabase: any) {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('chat_hall_messages')
      .delete()
      .lt('created_at', twentyFourHoursAgo);
  } catch (err) {
    console.error('清理旧消息失败:', err);
  }
}

// 获取聊天大厅消息列表
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 异步清理24小时之前的消息（不等待完成，不阻塞主请求）
    cleanupOldMessages(supabase);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const offset = (page - 1) * pageSize;

    // 只获取最近24小时的消息
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: messages, error } = await supabase
      .from('chat_hall_messages')
      .select('id, user_id, user_name, user_avatar, content, is_system, is_premium, created_at')
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`获取消息失败: ${error.message}`);

    // 获取聊天配置
    const { data: config } = await supabase
      .from('chat_hall_config')
      .select('enabled, max_message_length, hourly_limit')
      .eq('id', 1)
      .maybeSingle();

    const enabled = config?.enabled !== 0;
    const maxMessageLength = config?.max_message_length || 200;
    const hourlyLimit = config?.hourly_limit || 3;

    // 获取当前用户是否被禁言，以及剩余发言次数
    const session = await getServerSession(authOptions);
    let isMuted = false;
    let muteExpiresAt: string | null = null;
    let remainingCount = hourlyLimit;

    if (session?.user?.id) {
      // 检查禁言状态
      const { data: muteData } = await supabase
        .from('chat_hall_mutes')
        .select('expires_at')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (muteData) {
        const now = new Date();
        const expiresAt = muteData.expires_at ? new Date(muteData.expires_at) : null;

        if (!expiresAt || expiresAt > now) {
          isMuted = true;
          muteExpiresAt = muteData.expires_at;
        } else {
          // 已过期，删除记录
          await supabase
            .from('chat_hall_mutes')
            .delete()
            .eq('user_id', session.user.id);
        }
      }

      // 计算剩余发言次数
      if (!isMuted) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count: recentCount } = await supabase
          .from('chat_hall_messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
          .eq('is_system', 0)
          .gte('created_at', oneHourAgo);
        
        remainingCount = Math.max(0, hourlyLimit - (recentCount || 0));
      }
    }

    return NextResponse.json({
      success: true,
      data: messages ? messages.reverse() : [],
      page,
      pageSize,
      config: {
        hourlyLimit,
        enabled,
        maxMessageLength,
      },
      userStatus: {
        isMuted,
        muteExpiresAt,
        remainingCount,
      },
    });
  } catch (error) {
    console.error('Get chat hall messages error:', error);
    return NextResponse.json({ error: '获取消息失败' }, { status: 500 });
  }
}

// 发送聊天消息
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 获取聊天配置
    const { data: config } = await supabase
      .from('chat_hall_config')
      .select('enabled, max_message_length, hourly_limit')
      .eq('id', 1)
      .maybeSingle();

    const enabled = config?.enabled !== 0;
    const maxMessageLength = config?.max_message_length || 200;
    const hourlyLimit = config?.hourly_limit || 3;

    if (!enabled) {
      return NextResponse.json({ error: '聊天室已关闭' }, { status: 403 });
    }

    // 检查禁言状态
    const { data: muteData } = await supabase
      .from('chat_hall_mutes')
      .select('expires_at')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (muteData) {
      const now = new Date();
      const expiresAt = muteData.expires_at ? new Date(muteData.expires_at) : null;

      if (!expiresAt || expiresAt > now) {
        return NextResponse.json({ error: '您已被禁言' }, { status: 403 });
      } else {
        // 已过期，删除记录
        await supabase
          .from('chat_hall_mutes')
          .delete()
          .eq('user_id', session.user.id);
      }
    }

    // 检查发言次数限制
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('chat_hall_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('is_system', 0)
      .gte('created_at', oneHourAgo);

    if ((recentCount || 0) >= hourlyLimit) {
      return NextResponse.json({ 
        error: `每小时最多发送${hourlyLimit}条消息，请稍后再试` 
      }, { status: 429 });
    }

    const { content } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: '消息内容不能为空' }, { status: 400 });
    }

    if (content.length > maxMessageLength) {
      return NextResponse.json({ error: `消息超出长度限制（最多${maxMessageLength}字符）` }, { status: 400 });
    }

    // 获取用户信息
    const { data: userData } = await supabase
      .from('users')
      .select('name, avatar')
      .eq('userId', session.user.id)
      .maybeSingle();

    // 检查用户是否为高级会员（premium/vip/admin角色）
    const isPremium = ['premium', 'vip', 'admin'].includes(session.user.role || '');

    const { data, error } = await supabase
      .from('chat_hall_messages')
      .insert({
        user_id: session.user.id,
        user_name: userData?.name || session.user.name || '匿名用户',
        user_avatar: userData?.avatar || null,
        content: content.trim(),
        is_system: 0,
        is_premium: isPremium ? 1 : 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Insert message error:', error);
      return NextResponse.json({ error: '发送消息失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Send chat message error:', error);
    return NextResponse.json({ error: '发送消息失败' }, { status: 500 });
  }
}
