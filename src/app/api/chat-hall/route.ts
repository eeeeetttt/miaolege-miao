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
    
    if (endMinutes < startMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    } else {
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

    cleanupOldMessages(supabase);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const offset = (page - 1) * pageSize;

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: messages, error } = await supabase
      .from('chat_hall_messages')
      .select('id, user_id, user_name, user_avatar, content, is_system, is_premium, created_at, parent_id, conversation_id')
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`获取消息失败: ${error.message}`);

    const { data: config } = await supabase
      .from('chat_hall_config')
      .select('enabled, max_message_length, hourly_limit, open_time_start, open_time_end, timezone, is_time_limited')
      .eq('id', 1)
      .maybeSingle();

    const enabled = config?.enabled !== 0;
    const hourlyLimit = config?.hourly_limit || 30;
    const openTimeStart = config?.open_time_start || '12:00';
    const openTimeEnd = config?.open_time_end || '23:59';
    const timezone = config?.timezone || 'Asia/Shanghai';
    const isTimeLimited = config?.is_time_limited !== false;
    const isOpen = enabled && (!isTimeLimited || isWithinOpenHours(openTimeStart, openTimeEnd, timezone));

    const session = await getServerSession(authOptions);
    let isMuted = false;
    let muteExpiresAt: string | null = null;
    let remainingCount = hourlyLimit;

    if (session?.user?.id) {
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
          await supabase.from('chat_hall_mutes').delete().eq('user_id', session.user.id);
        }
      }

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
    const { content, isAIMessage, aiUserId, aiUserName, parentId, conversationId } = body;

    // AI 消息直接插入
    if (isAIMessage && aiUserId && aiUserName) {
      const { data, error } = await supabase
        .from('chat_hall_messages')
        .insert({
          user_id: aiUserId,
          user_name: aiUserName,
          user_avatar: null,
          content: content.trim(),
          is_system: 0,
          is_premium: 1,
          parent_id: parentId || null,
          conversation_id: conversationId || 'default',
        })
        .select()
        .single();

      if (error) {
        console.error('Insert AI message error:', error);
        return NextResponse.json({ error: '发送消息失败' }, { status: 500 });
      }

      return NextResponse.json({ success: true, data });
    }

    // 普通用户消息需要验证
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

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

    if (isTimeLimited && !isWithinOpenHours(openTimeStart, openTimeEnd, timezone)) {
      return NextResponse.json({ error: `聊天室仅在 ${openTimeStart} - ${openTimeEnd} 开放` }, { status: 403 });
    }

    // 检查禁言
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
        await supabase.from('chat_hall_mutes').delete().eq('user_id', session.user.id);
      }
    }

    // 检查发言次数
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('chat_hall_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('is_system', 0)
      .gte('created_at', oneHourAgo);

    if ((recentCount || 0) >= hourlyLimit) {
      return NextResponse.json({ error: `每小时最多发送${hourlyLimit}条消息，请稍后再试`, remainingCount: 0, hourlyLimit }, { status: 429 });
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: '消息内容不能为空' }, { status: 400 });
    }

    if (content.length > maxMessageLength) {
      return NextResponse.json({ error: `消息超出长度限制（最多${maxMessageLength}字符）` }, { status: 400 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('name, avatar')
      .eq('userId', session.user.id)
      .maybeSingle();

    const isPremium = ['premium', 'vip', 'admin'].includes(session.user.role || '');
    const convId = `user_${session.user.id}_${Date.now()}`;

    const { data, error } = await supabase
      .from('chat_hall_messages')
      .insert({
        user_id: session.user.id,
        user_name: userData?.name || session.user.name || '匿名用户',
        user_avatar: userData?.avatar || null,
        content: content.trim(),
        is_system: 0,
        is_premium: isPremium ? 1 : 0,
        conversation_id: convId,
      })
      .select()
      .single();

    if (error) {
      console.error('Insert message error:', error);
      return NextResponse.json({ error: '发送消息失败' }, { status: 500 });
    }

    // 触发AI群聊逻辑
    triggerAIGroupChat(supabase, data, session.user.id, content.trim());

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

// AI群聊逻辑 - 真实群聊效果
async function triggerAIGroupChat(supabase: any, userMessage: any, userId: string, userContent: string) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error('[AI群聊] API Key 未配置');
      return;
    }

    // 获取所有启用的角色
    const { data: roles } = await supabase
      .from('chat_hall_ai_roles')
      .select('*')
      .eq('enabled', true)
      .order('sort_order', { ascending: true });

    if (!roles || roles.length === 0) return;

    // 检查是否有触发词匹配的消息
    let triggeredRole: any = null;
    for (const role of roles) {
      if (role.trigger_keyword && userContent.includes(role.trigger_keyword)) {
        triggeredRole = role;
        break;
      }
    }

    // 如果没有触发词，根据概率决定是否触发
    if (!triggeredRole) {
      const totalProb = roles.reduce((sum: number, r: any) => sum + (r.reply_probability || 0), 0);
      if (totalProb === 0) return;

      const random = Math.random() * totalProb;
      let cumProb = 0;
      for (const role of roles) {
        cumProb += role.reply_probability || 0;
        if (random <= cumProb) {
          triggeredRole = role;
          break;
        }
      }
    }

    if (!triggeredRole) return;

    console.log(`[AI群聊] 触发角色: ${triggeredRole.name}`);

    // 获取对话上下文（最近的AI消息，用于生成连贯对话）
    const { data: recentAI } = await supabase
      .from('chat_hall_messages')
      .select('user_name, content')
      .eq('is_premium', 1)
      .order('created_at', { ascending: false })
      .limit(6);

    // 构建上下文
    let context = '';
    if (recentAI && recentAI.length > 0) {
      context = '\n\n最近对话：\n' + recentAI.map((m: any) => `${m.user_name}: ${m.content}`).join('\n');
    }

    // 生成回复
    const systemPrompt = `${triggeredRole.system_prompt}\n\n你是群聊中的一个成员，请用自然、简洁的方式回复。${context}`;
    const maxLength = triggeredRole.max_response_length || 200;

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
            { role: 'user', content: userContent },
          ],
          max_tokens: maxLength,
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        console.error('[AI群聊] API调用失败');
        return;
      }

      const aiData = await response.json();
      let aiReply = aiData.choices?.[0]?.message?.content?.trim();

      if (!aiReply) return;

      // 清理回复（去掉可能的引号等）
      aiReply = aiReply.replace(/^["']|["']$/g, '');

      // 保存AI回复
      await supabase
        .from('chat_hall_messages')
        .insert({
          user_id: `ai_${triggeredRole.id}`,
          user_name: triggeredRole.name,
          user_avatar: triggeredRole.avatar_url || null,
          content: aiReply,
          is_system: 0,
          is_premium: 1,
          parent_id: userMessage.id,
          conversation_id: userMessage.conversation_id,
        });

      console.log(`[AI群聊] ${triggeredRole.name} 回复: ${aiReply.substring(0, 30)}...`);

      // 更新角色活跃状态
      await supabase
        .from('chat_hall_ai_active')
        .upsert({
          role_id: triggeredRole.id,
          last_reply_at: new Date().toISOString(),
          last_replied_to_id: userMessage.id,
        });

      // 30%概率触发另一个角色跟进回复
      if (Math.random() < 0.3 && roles.length > 1) {
        const otherRoles = roles.filter((r: any) => r.id !== triggeredRole.id);
        if (otherRoles.length > 0) {
          const followUpRole = otherRoles[Math.floor(Math.random() * otherRoles.length)];
          
          // 延迟2-5秒后跟进
          setTimeout(async () => {
            await triggerFollowUp(supabase, followUpRole, userMessage, aiReply, apiKey);
          }, 2000 + Math.random() * 3000);
        }
      }
    } catch (error) {
      console.error('[AI群聊] 回复失败:', error);
    }
  } catch (error) {
    console.error('[AI群聊] 逻辑执行失败:', error);
  }
}

// 角色跟进回复
async function triggerFollowUp(supabase: any, role: any, originalMessage: any, previousReply: string, apiKey: string) {
  try {
    const { data: recentAI } = await supabase
      .from('chat_hall_messages')
      .select('user_name, content')
      .eq('is_premium', 1)
      .order('created_at', { ascending: false })
      .limit(4);

    let context = '';
    if (recentAI && recentAI.length > 0) {
      context = '\n\n最近对话：\n' + recentAI.map((m: any) => `${m.user_name}: ${m.content}`).join('\n');
    }

    const systemPrompt = `${role.system_prompt}\n\n你是群聊中的一个成员，看到其他人的对话，自然地插话或回应。请用简洁、口语化的方式。${context}`;
    const maxLength = role.max_response_length || 200;

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
          { role: 'user', content: `刚才有人说: "${previousReply}", 请简短回应或补充观点` },
        ],
        max_tokens: maxLength,
        temperature: 0.8,
      }),
    });

    if (!response.ok) return;

    const aiData = await response.json();
    let aiReply = aiData.choices?.[0]?.message?.content?.trim();

    if (!aiReply) return;

    aiReply = aiReply.replace(/^["']|["']$/g, '');

    await supabase
      .from('chat_hall_messages')
      .insert({
        user_id: `ai_${role.id}`,
        user_name: role.name,
        user_avatar: role.avatar_url || null,
        content: aiReply,
        is_system: 0,
        is_premium: 1,
        parent_id: originalMessage.id,
        conversation_id: originalMessage.conversation_id,
      });

    console.log(`[AI群聊] ${role.name} 跟进: ${aiReply.substring(0, 30)}...`);

    // 更新活跃状态
    await supabase
      .from('chat_hall_ai_active')
      .upsert({
        role_id: role.id,
        last_reply_at: new Date().toISOString(),
        last_replied_to_id: originalMessage.id,
      });
  } catch (error) {
    console.error('[AI群聊] 跟进失败:', error);
  }
}
