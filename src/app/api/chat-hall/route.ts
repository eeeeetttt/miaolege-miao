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

// 检查当前时间是否在开放时间内
function isWithinOpenHours(openTimeStart: string, openTimeEnd: string, timezone: string): boolean {
  try {
    // 获取当前北京时间
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('zh-CN', {
      timeZone: timezone || 'Asia/Shanghai',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const currentTimeStr = formatter.format(now);
    const currentMinutes = parseInt(currentTimeStr.split(':')[0]) * 60 + parseInt(currentTimeStr.split(':')[1]);
    
    const startParts = openTimeStart.split(':');
    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    
    const endParts = openTimeEnd.split(':');
    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
    
    // 处理跨午夜的情况（如 20:00 到 00:00）
    if (endMinutes < startMinutes) {
      // 开放时间跨午夜
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    } else {
      // 开放时间在同一天
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
  } catch (err) {
    console.error('检查开放时间失败:', err);
    return false;
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
      .select('enabled, max_message_length, hourly_limit, open_time_start, open_time_end, timezone, is_time_limited')
      .eq('id', 1)
      .maybeSingle();

    const enabled = config?.enabled !== 0;
    const maxMessageLength = config?.max_message_length || 200;
    const hourlyLimit = config?.hourly_limit || 30;
    const openTimeStart = config?.open_time_start || '12:00';
    const openTimeEnd = config?.open_time_end || '23:59';
    const timezone = config?.timezone || 'Asia/Shanghai';
    const isTimeLimited = config?.is_time_limited !== false;
    
    // 检查是否在开放时间内
    const isOpen = enabled && (!isTimeLimited || isWithinOpenHours(openTimeStart, openTimeEnd, timezone));

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
        isOpen,
        openTimeStart: isTimeLimited ? openTimeStart : null,
        openTimeEnd: isTimeLimited ? openTimeEnd : null,
        timezone,
        isTimeLimited,
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
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    const body = await request.json();
    const { content, isAIMessage, aiUserId, aiUserName } = body;

    // AI 消息直接插入，不需要验证
    if (isAIMessage && aiUserId && aiUserName) {
      const { data, error } = await supabase
        .from('chat_hall_messages')
        .insert({
          user_id: aiUserId,
          user_name: aiUserName,
          user_avatar: null,
          content: content.trim(),
          is_system: 0,
          is_premium: 1, // AI 使用 VIP 样式
        })
        .select()
        .single();

      if (error) {
        console.error('Insert AI message error:', error);
        return NextResponse.json({ error: '发送消息失败' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data,
      });
    }

    // 普通用户消息需要验证
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 获取聊天配置
    const { data: config } = await supabase
      .from('chat_hall_config')
      .select('enabled, max_message_length, hourly_limit, open_time_start, open_time_end, timezone, is_time_limited')
      .eq('id', 1)
      .maybeSingle();

    const enabled = config?.enabled !== 0;
    const maxMessageLength = config?.max_message_length || 200;
    const hourlyLimit = config?.hourly_limit || 30;
    const openTimeStart = config?.open_time_start || '12:00';
    const openTimeEnd = config?.open_time_end || '23:59';
    const timezone = config?.timezone || 'Asia/Shanghai';
    const isTimeLimited = config?.is_time_limited !== false;

    if (!enabled) {
      return NextResponse.json({ error: '聊天室已关闭' }, { status: 403 });
    }

    // 检查是否在开放时间内
    if (isTimeLimited && !isWithinOpenHours(openTimeStart, openTimeEnd, timezone)) {
      return NextResponse.json({ 
        error: `聊天室仅在 ${openTimeStart} - ${openTimeEnd} 开放` 
      }, { status: 403 });
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
        error: `每小时最多发送${hourlyLimit}条消息，请稍后再试`,
        remainingCount: 0,
        hourlyLimit,
      }, { status: 429 });
    }

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

    // 触发AI角色回复（异步执行，不阻塞主响应）
    triggerAIReply(supabase, session.user.id, userData?.name || session.user.name || '匿名用户', content.trim());

    return NextResponse.json({
      success: true,
      data,
      remainingCount: Math.max(0, hourlyLimit - (recentCount || 0) - 1),
      hourlyLimit,
    });
  } catch (error) {
    console.error('Send chat message error:', error);
    return NextResponse.json({ error: '发送消息失败' }, { status: 500 });
  }
}

// 触发AI角色回复（支持多角色）
async function triggerAIReply(supabase: any, userId: string, userName: string, userMessage: string) {
  try {
    // 获取所有启用的AI角色
    const { data: roles } = await supabase
      .from('chat_hall_ai_roles')
      .select('*')
      .eq('enabled', true)
      .order('sort_order', { ascending: true });

    if (!roles || roles.length === 0) {
      console.log('[AI] 没有启用的角色');
      return;
    }

    // 获取 API Key
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error('[AI] API Key 未配置');
      return;
    }

    // 遍历每个角色，检查是否需要回复
    for (const role of roles) {
      // 检查是否通过触发词匹配
      const triggerKeyword = role.trigger_keyword?.trim();
      let shouldTrigger = false;

      if (triggerKeyword) {
        // 如果有触发词，检查消息是否包含触发词
        shouldTrigger = userMessage.includes(triggerKeyword);
      } else {
        // 如果没有触发词，根据概率随机触发
        const probability = role.reply_probability || 50;
        const random = Math.random() * 100;
        shouldTrigger = random <= probability;
      }

      if (!shouldTrigger) {
        console.log(`[${role.name}] 未触发 (触发词: ${triggerKeyword || '无'}, 概率: ${role.reply_probability}%)`);
        continue;
      }

      console.log(`[${role.name}] 触发回复`);

      // 构建 AI 请求
      const systemPrompt = role.system_prompt || `你是${role.name}，愿意帮助用户解答问题。`;
      const maxLength = role.max_response_length || 200;

      try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
            ],
            max_tokens: maxLength,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[${role.name}] API调用失败:`, errorText);
          continue;
        }

        const aiData = await response.json();
        const aiReply = aiData.choices?.[0]?.message?.content?.trim();

        if (!aiReply) {
          console.error(`[${role.name}] 未获取到有效回复`);
          continue;
        }

        // 保存 AI 回复
        await supabase
          .from('chat_hall_messages')
          .insert({
            user_id: `ai_${role.id}`,
            user_name: role.name,
            user_avatar: role.avatar_url || null,
            content: aiReply,
            is_system: 0,
            is_premium: 1,
          });

        console.log(`[${role.name}] 已发送回复: ${aiReply.substring(0, 50)}...`);
      } catch (error) {
        console.error(`[${role.name}] 回复失败:`, error);
      }
    }
  } catch (error) {
    console.error('[AI] 触发回复失败:', error);
  }
}
