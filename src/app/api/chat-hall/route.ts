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

// 触发AI角色回复（支持多角色交错回复）
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

    // 获取最近2小时的消息作为上下文（包含AI之间的对话）
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: recentMessages } = await supabase
      .from('chat_hall_messages')
      .select('user_id, user_name, content, is_premium, created_at')
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false })
      .limit(20);

    // 检查每个角色是否应该触发
    const triggeredRoles: { role: any; delay: number }[] = [];

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

      if (shouldTrigger) {
        // 计算延迟：2-4秒随机延迟，按角色顺序错开
        const delay = 2000 + Math.random() * 2000 + triggeredRoles.length * 1500;
        triggeredRoles.push({ role, delay });
        console.log(`[${role.name}] 将在 ${Math.round(delay / 1000)} 秒后回复`);
      }
    }

    if (triggeredRoles.length === 0) {
      console.log('[AI] 没有角色被触发');
      return;
    }

    // 为每个被触发的角色创建异步回复任务
    for (let i = 0; i < triggeredRoles.length; i++) {
      const { role, delay } = triggeredRoles[i];

      // 使用 setTimeout 延迟执行
      setTimeout(async () => {
        await sendAIReply(supabase, apiKey, role, userName, userMessage);
      }, delay);
    }
  } catch (error) {
    console.error('[AI] 触发回复失败:', error);
  }
}

// 发送AI回复（支持获取最新上下文）
async function sendAIReply(
  supabase: any,
  apiKey: string,
  role: any,
  userName: string,
  userMessage: string
) {
  try {
    console.log(`[${role.name}] 开始生成回复...`);

    // 每次发送前获取最新的上下文（包含之前的AI回复）
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: recentMessages } = await supabase
      .from('chat_hall_messages')
      .select('user_id, user_name, content, is_premium, created_at')
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false })
      .limit(15);

    // 构建对话历史（按时间正序）
    interface ChatMessage {
      role: 'user' | 'assistant';
      name: string;
      content: string;
    }

    const chatHistory: ChatMessage[] = recentMessages ? recentMessages.reverse().map((msg: { user_name: string; content: string; is_premium: number; user_id: string }) => ({
      role: msg.is_premium ? 'assistant' : 'user',
      name: msg.user_name,
      content: msg.content
    })) : [];

    // 添加用户当前消息
    chatHistory.push({
      role: 'user',
      name: userName,
      content: userMessage
    });

    // 构建基础系统提示
    let systemPrompt = role.system_prompt || `你是${role.name}，愿意帮助用户解答问题。`;

    // 添加对话规则
    const rules = `
## 对话规则
- 说话必须自然、口语化，多用短句，不允许使用表情符号
- 当直接回复或引用群内某个成员的发言时，必须使用 @[角色全名] 的格式
- 允许不同角色之间产生意见分歧和争论，但争论必须基于专业逻辑
- 回复时可以不局限于上一条消息，可以回应更早的话题，引用历史对话
- 可以对其他AI角色的观点发表不同意见或补充
`;

    systemPrompt = systemPrompt + rules;

    // 构建消息列表
    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.slice(0, -1).map((msg: ChatMessage) => ({
        role: msg.role,
        content: `${msg.name}说：${msg.content}`
      })),
      { role: 'user', content: `${userName}说：${userMessage}` }
    ];

    const maxLength = role.max_response_length || 200;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        max_tokens: maxLength,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${role.name}] API调用失败:`, errorText);
      return;
    }

    const aiData = await response.json();
    const aiReply = aiData.choices?.[0]?.message?.content?.trim();

    if (!aiReply) {
      console.error(`[${role.name}] 未获取到有效回复`);
      return;
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

    // 如果还有其他AI角色可能会回复，给一个机会让它们看到这条新消息
    // 继续检查是否有其他角色需要回复这条新消息
    await checkAdditionalTriggers(supabase, apiKey, role.name, aiReply);
  } catch (error) {
    console.error(`[${role.name}] 回复失败:`, error);
  }
}

// 检查是否需要对AI的回复触发其他AI
async function checkAdditionalTriggers(
  supabase: any,
  apiKey: string,
  aiName: string,
  aiMessage: string
) {
  try {
    // 获取所有启用的AI角色
    const { data: roles } = await supabase
      .from('chat_hall_ai_roles')
      .select('*')
      .eq('enabled', true)
      .order('sort_order', { ascending: true });

    if (!roles || roles.length === 0) return;

    // 随机决定是否触发后续讨论（较低概率）
    if (Math.random() > 0.3) return;

    // 找一个还没回复的角色
    const availableRole = roles.find((r: any) => r.name !== aiName);
    if (!availableRole) return;

    // 较低的概率触发（15%）
    if (Math.random() > 0.15) return;

    // 1-2秒延迟后触发
    const delay = 1000 + Math.random() * 1000;
    console.log(`[${availableRole.name}] 被AI讨论触发，将在 ${Math.round(delay / 1000)} 秒后回复`);

    setTimeout(async () => {
      await sendAIReply(supabase, apiKey, availableRole, aiName, aiMessage);
    }, delay);
  } catch (error) {
    console.error('[AI] 检查额外触发失败:', error);
  }
}
