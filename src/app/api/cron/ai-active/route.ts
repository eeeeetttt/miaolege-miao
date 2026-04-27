import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// AI主动发言的触发间隔（秒），建议设置为间隔时间的1/3到1/2
// 即如果AI间隔是70秒，这里设置25-35秒
const TRIGGER_INTERVAL = 25;

// 清理消息中的不自然格式
function cleanText(text: string): string {
  if (!text) return text;
  return text
    .replace(/\*[\（\(].*?[\）\)]\*/g, '')
    .replace(/[\（\(][^\）\)]*[\）\)]/g, '')
    .replace(/【[^】]*】/g, '')
    .replace(/^[\u4e00-\u9fa5a-zA-Z]{2,8}[说问道表示称讲答]：[：\s]*/g, '')
    .replace(/^@[\u4e00-\u9fa5a-zA-Z]{2,8}：[：\s]*/g, '')
    .replace(/^[\s,，.。]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 获取发言间隔配置
async function getReplyDelaySeconds(supabase: any): Promise<number> {
  const { data } = await supabase
    .from('chat_hall_config')
    .select('ai_reply_delay_seconds')
    .eq('id', 1)
    .maybeSingle();
  return data?.ai_reply_delay_seconds || 70;
}

// AI主动发言
async function triggerAIActiveReply(supabase: any, role: any, apiKey: string) {
  try {
    console.log(`[主动发言] ${role.name} 开始生成...`);

    // 获取最近的消息作为上下文
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: recentMessages } = await supabase
      .from('chat_hall_messages')
      .select('user_name, content, is_premium, created_at')
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false })
      .limit(10);

    // 构建对话历史
    const chatHistory = recentMessages ? recentMessages.reverse().map((msg: any) => ({
      role: msg.is_premium ? 'assistant' : 'user',
      content: msg.content
    })) : [];

    // 构建系统提示
    let systemPrompt = role.system_prompt || `你是${role.name}，愿意帮助用户解答问题。`;

    const rules = `
## 对话规则（必须严格遵守）
- 你在群聊中发言，像正常人打字聊天一样
- **只输出你的对话内容，不要加任何前缀或动作描述**
- **禁止使用：** *（动作）*、【动作】、（动作）、表情符号
- **发言方式：**
  1. 主动发起话题：直接说观点或提问
     - 示例："今天黄金走势有点意思，你们怎么看？"
     - 示例："非农快到了，大家准备好仓位没"
  2. 延续话题：基于最近的讨论继续说
     - 示例："说到马丁策略，确实要小心"
     - 示例："刚才那个观点我补充一下"
  3. 闲聊互动：轻松的话题
     - 示例："今天美盘估计又是一场硬仗"
     - 示例："各位今天持仓情况如何"
- **注意：** 不要每次都主动发言，保持自然；发言要有内容，不要太频繁
`;

    systemPrompt = systemPrompt + rules;

    // 构建消息
    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.map((msg: any) => ({
        role: msg.role,
        content: cleanText(msg.content)
      }))
    ];

    // 随机决定发言内容
    const topicPrompt = Math.random() > 0.5 
      ? "基于最近的聊天内容，说一句延续性的话或主动发起一个新话题"
      : "随便说一句话，保持自然聊天风格";

    messages.push({ role: 'user', content: topicPrompt });

    const maxLength = Math.max(role.max_response_length || 200, 300);

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
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      console.error(`[主动发言] ${role.name} API失败`);
      return;
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      console.error(`[主动发言] ${role.name} 无内容`);
      return;
    }

    // 清理内容
    content = cleanText(content);

    // 保存消息
    await supabase
      .from('chat_hall_messages')
      .insert({
        user_id: `ai_${role.id}`,
        user_name: role.name,
        user_avatar: role.avatar_url || null,
        content: content,
        is_system: 0,
        is_premium: 1,
      });

    console.log(`[主动发言] ${role.name}: ${content.substring(0, 30)}...`);
  } catch (error) {
    console.error(`[主动发言] ${role.name} 失败:`, error);
  }
}

// 主动发言API
export async function POST(request: NextRequest) {
  try {
    // 验证请求
    const secret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET || 'your-secret-key';
    if (secret !== expectedSecret) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库不可用' }, { status: 503 });
    }

    // 检查聊天室是否开启
    const { data: config } = await supabase
      .from('chat_hall_config')
      .select('enabled, ai_reply_delay_seconds')
      .eq('id', 1)
      .maybeSingle();

    if (!config?.enabled) {
      return NextResponse.json({ message: '聊天室未开启' });
    }

    // 检查是否在开放时间内
    const isTimeLimited = (config as any)?.is_time_limited !== false;
    if (isTimeLimited) {
      const now = new Date();
      const hour = now.getHours();
      const startHour = parseInt((config as any)?.open_time_start?.split(':')[0] || '12');
      const endHour = parseInt((config as any)?.open_time_end?.split(':')[0] || '23');
      if (hour < startHour || hour >= endHour) {
        return NextResponse.json({ message: '不在开放时间内' });
      }
    }

    // 获取API Key
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI服务未配置' }, { status: 500 });
    }

    // 获取所有启用的AI角色
    const { data: roles } = await supabase
      .from('chat_hall_ai_roles')
      .select('*')
      .eq('enabled', true)
      .order('sort_order', { ascending: true });

    if (!roles || roles.length === 0) {
      return NextResponse.json({ message: '没有AI角色' });
    }

    // 随机选择一个角色发言（概率约30%，即大约每3次调用有1次发言）
    if (Math.random() > 0.3) {
      return NextResponse.json({ message: '本次不发言' });
    }

    // 随机选择一个角色
    const randomIndex = Math.floor(Math.random() * roles.length);
    const selectedRole = roles[randomIndex];

    // 发言
    await triggerAIActiveReply(supabase, selectedRole, apiKey);

    return NextResponse.json({ success: true, message: '发言成功' });
  } catch (error) {
    console.error('[主动发言] 失败:', error);
    return NextResponse.json({ error: '执行失败' }, { status: 500 });
  }
}

// GET也允许（用于手动测试）
export async function GET(request: NextRequest) {
  return POST(request);
}
