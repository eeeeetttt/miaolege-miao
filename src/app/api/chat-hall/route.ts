import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 清理消息中的不自然格式
function cleanParentheses(text: string): string {
  if (!text) return text;
  // 移除各种不自然的格式
  return text
    .replace(/\*[\（\(].*?[\）\)]\*/g, '')  // 移除 *（xxx）* 或 *(xxx)*
    .replace(/[\（\(][^\）\)]*[\）\)]/g, '')  // 移除 （xxx） 或 (xxx)
    .replace(/【[^】]*】/g, '')  // 移除 【xxx】
    .replace(/\*\*[^\*]*\*\*/g, (match) => {
      // 保留**加粗**中的实际内容
      const content = match.replace(/\*\*/g, '');
      return content.length > 2 ? match : ''; // 如果内容太短可能是动作描述，移除
    })
    // 移除 "XXX说："、"XXX道："、"XXX表示：" 等前缀
    .replace(/^[\u4e00-\u9fa5a-zA-Z]{2,8}[说问道表示称讲答]：[：\s]*/g, '')
    .replace(/^@[\u4e00-\u9fa5a-zA-Z]{2,8}：[：\s]*/g, '')
    // 移除开头的标点和空格
    .replace(/^[\s,，.。]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 检查消息是否与最近的消息重复
async function checkDuplicateMessage(supabase: any, newMessage: string, similarityThreshold: number = 0.7): Promise<boolean> {
  if (!newMessage || newMessage.length < 10) return false;

  try {
    // 获取最近30分钟的消息
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: recentMessages } = await supabase
      .from('chat_hall_messages')
      .select('content, user_name')
      .gte('created_at', thirtyMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!recentMessages) return false;

    // 标准化新消息
    const normalizedNew = normalizeForComparison(newMessage);

    for (const msg of recentMessages) {
      const normalizedOld = normalizeForComparison(msg.content);

      // 完全相同
      if (normalizedNew === normalizedOld) {
        console.log(`[去重] 消息完全相同: ${msg.user_name}`);
        return true;
      }

      // 相似度检查（主要检查前半部分是否相同）
      const maxLen = Math.min(normalizedNew.length, normalizedOld.length);
      const compareLen = Math.min(maxLen, 30); // 只比较前30个字符
      const newPrefix = normalizedNew.substring(0, compareLen);
      const oldPrefix = normalizedOld.substring(0, compareLen);

      if (newPrefix === oldPrefix && compareLen >= 15) {
        console.log(`[去重] 消息前缀相似 (>15字符相同)`);
        return true;
      }

      // 计算相似度
      const similarity = calculateSimilarity(normalizedNew, normalizedOld);
      if (similarity > similarityThreshold) {
        console.log(`[去重] 消息相似度过高 (${(similarity * 100).toFixed(0)}%)`);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('[去重] 检查失败:', error);
    return false; // 出错时不阻止发送
  }
}

// 标准化消息用于比较
function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '')  // 移除所有空格
    .replace(/[，。！？、；：「」『』【】《》]/g, '')  // 移除标点
    .replace(/[a-z0-9]/gi, '')  // 移除字母数字
    .trim();
}

// 计算字符串相似度（简单版）
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;

  // 使用最长公共子串计算相似度
  const maxLen = Math.max(str1.length, str2.length);
  const lcs = longestCommonSubstring(str1, str2);
  return lcs / maxLen;
}

// 计算最长公共子串
function longestCommonSubstring(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  let maxLen = 0;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        maxLen = Math.max(maxLen, dp[i][j]);
      }
    }
  }

  return maxLen;
}

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

    // 获取AI回复间隔配置
    const { data: configData } = await supabase
      .from('chat_hall_config')
      .select('ai_reply_delay_seconds')
      .eq('id', 1)
      .maybeSingle();
    const aiReplyDelaySeconds = configData?.ai_reply_delay_seconds || 70;

    // 触发AI角色回复（异步执行，不阻塞主响应）
    triggerAIReply(supabase, session.user.id, userData?.name || session.user.name || '匿名用户', content.trim(), aiReplyDelaySeconds);

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
async function triggerAIReply(supabase: any, userId: string, userName: string, userMessage: string, baseDelaySeconds: number = 70) {
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

    // 计算延迟参数
    const baseDelayMs = baseDelaySeconds * 1000; // 将秒转换为毫秒
    const staggerMs = baseDelayMs * 0.25; // 每个角色之间间隔为基础延迟的25%

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
        // 计算延迟：基础延迟 + 随机偏移 + 按角色顺序错开
        const randomOffset = Math.random() * baseDelayMs * 0.3; // 30%的随机偏移
        const delay = baseDelayMs + randomOffset + triggeredRoles.length * staggerMs;
        triggeredRoles.push({ role, delay });
        console.log(`[${role.name}] 将在 ${Math.round(delay / 1000)} 秒后回复 (基础: ${baseDelaySeconds}秒)`);
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
## 对话规则（必须严格遵守）
- 你在群聊中发言，像正常人打字聊天一样
- **只输出你的对话内容，不要加任何前缀或动作描述**
- **绝对禁止使用以下任何格式：**
  - ❌ *（动作）*、【动作】、（动作）等任何括号动作描述
  - ❌ "XXX说："、"@XXX："等前缀，直接说话
  - ❌ 表情符号
- **回复方式（根据情况选择）：**
  1. 回复上一条：直接说你的观点，不用提是谁说的
     - 示例："确实该等等看，非农数据影响太大了"
  2. 回应某人：可以用@提及
     - 示例："@闪电 说得对，我也觉得现在不是好时机"
     - 示例："@Elena ATR怎么看？"
  3. 主动发言：直接说观点
     - 示例："这波行情估计要震荡几天"
     - 示例："黄金还是看多，等回调再进"
- **注意：**
  - 回复上一条消息时不要重复对方说的话，直接说你的观点
  - 不要每次都@人，自然一点
  - 说话简洁，像在手机上打字聊天
`;

    systemPrompt = systemPrompt + rules;

    // 构建消息列表（简化格式，去掉"XXX说："前缀）
    const cleanHistory = chatHistory.slice(0, -1).map((msg: ChatMessage) => ({
      role: msg.role,
      content: cleanParentheses(msg.content)  // 直接用内容，不加前缀
    }));
    const messages = [
      { role: 'system', content: systemPrompt },
      ...cleanHistory,
      { role: 'user', content: cleanParentheses(userMessage) }  // 用户消息也去掉前缀
    ];

    // 提高字数限制到500，确保意思表达完整
    const maxLength = Math.max(role.max_response_length || 200, 500);

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

    // 清理回复中的括号动作描述
    const cleanReply = cleanParentheses(aiReply);

    // 检查是否与最近的消息重复
    const isDuplicate = await checkDuplicateMessage(supabase, cleanReply);
    if (isDuplicate) {
      console.log(`[${role.name}] 回复与近期消息重复，跳过: ${cleanReply.substring(0, 30)}...`);
      return;
    }

    // 保存 AI 回复
    await supabase
      .from('chat_hall_messages')
      .insert({
        user_id: `ai_${role.id}`,
        user_name: role.name,
        user_avatar: role.avatar_url || null,
        content: cleanReply,
        is_system: 0,
        is_premium: 1,
      });

    console.log(`[${role.name}] 已发送回复: ${cleanReply.substring(0, 50)}...`);

    // 如果还有其他AI角色可能会回复，给一个机会让它们看到这条新消息
    // 继续检查是否有其他角色需要回复这条新消息
    await checkAdditionalTriggers(supabase, apiKey, role.name, cleanReply);
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
    // 获取AI回复间隔配置
    const { data: configData } = await supabase
      .from('chat_hall_config')
      .select('ai_reply_delay_seconds')
      .eq('id', 1)
      .maybeSingle();
    const baseDelaySeconds = configData?.ai_reply_delay_seconds || 70;
    const baseDelayMs = baseDelaySeconds * 1000;

    // 获取所有启用的AI角色
    const { data: roles } = await supabase
      .from('chat_hall_ai_roles')
      .select('*')
      .eq('enabled', true)
      .order('sort_order', { ascending: true });

    if (!roles || roles.length === 0) return;

    // 触发后续讨论（较高概率，保持话题热度）
    if (Math.random() > 0.6) return;

    // 找一个还没回复的角色
    const availableRoles = roles.filter((r: any) => r.name !== aiName);
    if (!availableRoles || availableRoles.length === 0) return;

    // 随机选择1-2个角色继续讨论
    const numToTrigger = Math.random() > 0.5 ? 2 : 1;
    const shuffled = availableRoles.sort(() => Math.random() - 0.5);
    const toTrigger = shuffled.slice(0, numToTrigger);

    for (let i = 0; i < toTrigger.length; i++) {
      const availableRole = toTrigger[i];
      // 高概率触发（60%）
      if (Math.random() > 0.6) continue;

      // 基础延迟的50%-80% 作为后续讨论间隔
      const delay = baseDelayMs * (0.5 + Math.random() * 0.3) + i * baseDelayMs * 0.25;
      console.log(`[${availableRole.name}] 被AI讨论触发，将在 ${Math.round(delay / 1000)} 秒后回复 (基础: ${baseDelaySeconds}秒)`);

      setTimeout(async () => {
        await sendAIReply(supabase, apiKey, availableRole, aiName, aiMessage);
      }, delay);
    }
  } catch (error) {
    console.error('[AI] 检查额外触发失败:', error);
  }
}
