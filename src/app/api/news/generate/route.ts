import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 金查理的系统提示词
const SYSTEM_PROMPT = `你是金查理，一位资深黄金交易分析师，为金火火茶馆撰写每日伦敦金市场分析。

## 分析风格
- 简洁专业，口语化表达
- 分析当天影响伦敦金走势的关键因素
- 给出操作建议
- 篇幅300-500字

## 分析结构
1. 昨日回顾：简要总结前一天行情
2. 今日关注：列出当天重要数据发布时间和预期影响
3. 技术分析：简述关键技术位
4. 操作建议：给出当日操作参考

## 注意事项
- 只输出分析内容，不要加标题符号
- 语言简洁有力，像专业交易员交流
- 不要使用表情符号
`;

// 生成新闻标题
const TITLE_PROMPT = `根据今天的日期和黄金市场，写一个新闻标题。要求：
- 简洁醒目，15-30字
- 体现当日行情重点
- 不要加引号或其他符号`;

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 获取 API Key
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI服务未配置' }, { status: 500 });
    }

    // 获取今天的日期
    const today = new Date();
    const newsDate = today.toISOString().split('T')[0];

    // 检查今天是否已有新闻
    const { data: existingNews } = await supabase
      .from('daily_news')
      .select('id')
      .eq('news_date', newsDate)
      .maybeSingle();

    if (existingNews) {
      return NextResponse.json({ 
        success: true, 
        message: '今日新闻已存在',
        data: existingNews 
      });
    }

    // 获取昨天的日期
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // 生成标题
    const titleResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: TITLE_PROMPT },
          { role: 'user', content: `今天是${newsDate}，请给出今日伦敦金分析标题` }
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    let title = `伦敦金日报 - ${newsDate}`;
    if (titleResponse.ok) {
      const titleData = await titleResponse.json();
      const generatedTitle = titleData.choices?.[0]?.message?.content?.trim();
      if (generatedTitle) {
        title = generatedTitle;
      }
    }

    // 生成内容
    const contentResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `请撰写${newsDate}的伦敦金日报，昨天是${yesterdayStr}` }
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    let content = '暂无分析内容';
    if (contentResponse.ok) {
      const contentData = await contentResponse.json();
      content = contentData.choices?.[0]?.message?.content?.trim() || content;
    }

    // 保存到数据库
    const { data, error } = await supabase
      .from('daily_news')
      .insert({
        title,
        content,
        author: '金查理',
        news_date: newsDate,
        published: true,
      })
      .select()
      .single();

    if (error) {
      console.error('保存新闻失败:', error);
      return NextResponse.json({ error: '保存新闻失败' }, { status: 500 });
    }

    console.log(`[金查理] 已生成日报: ${title}`);

    return NextResponse.json({ 
      success: true, 
      data,
      message: '新闻生成成功' 
    });
  } catch (error) {
    console.error('生成新闻错误:', error);
    return NextResponse.json({ error: '生成新闻失败' }, { status: 500 });
  }
}

// 手动触发生成（支持指定日期）
export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI服务未配置' }, { status: 500 });
    }

    const body = await request.json();
    const { date } = body;
    const newsDate = date || new Date().toISOString().split('T')[0];

    // 删除旧新闻
    await supabase
      .from('daily_news')
      .delete()
      .eq('news_date', newsDate);

    // 生成标题
    const titleResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: TITLE_PROMPT },
          { role: 'user', content: `请给出${newsDate}伦敦金分析标题` }
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    let title = `伦敦金日报 - ${newsDate}`;
    if (titleResponse.ok) {
      const titleData = await titleResponse.json();
      const generatedTitle = titleData.choices?.[0]?.message?.content?.trim();
      if (generatedTitle) {
        title = generatedTitle;
      }
    }

    // 生成内容
    const contentResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `请撰写${newsDate}的伦敦金日报` }
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    let content = '暂无分析内容';
    if (contentResponse.ok) {
      const contentData = await contentResponse.json();
      content = contentData.choices?.[0]?.message?.content?.trim() || content;
    }

    // 保存
    const { data, error } = await supabase
      .from('daily_news')
      .insert({
        title,
        content,
        author: '金查理',
        news_date: newsDate,
        published: true,
      })
      .select()
      .single();

    if (error) {
      console.error('保存新闻失败:', error);
      return NextResponse.json({ error: '保存新闻失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('生成新闻错误:', error);
    return NextResponse.json({ error: '生成新闻失败' }, { status: 500 });
  }
}
