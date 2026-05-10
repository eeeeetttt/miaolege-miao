import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

// 伦敦金价格API - 获取实时价格
async function getGoldPrice() {
  try {
    // 从Swissquote获取实时价格
    const response = await fetch('https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        const quote = data[0];
        const prices = quote.spreadProfilePrices;
        const premiumPrice = prices.find((p: any) => p.spreadProfile === 'premium') || prices[0];
        
        if (premiumPrice) {
          return {
            bid: premiumPrice.bid,
            ask: premiumPrice.ask,
            mid: (premiumPrice.bid + premiumPrice.ask) / 2,
            time: new Date(quote.ts).toLocaleString('zh-CN'),
          };
        }
      }
    }
  } catch (e) {
    console.error('获取金价失败:', e);
  }
  return null;
}

// 获取平台大事件
async function getPlatformEvents(supabase: any) {
  try {
    // 获取最近的比赛冠军
    const champions: string[] = [];
    
    // 获取K线征途通关记录
    const { data: klineRecords } = await supabase
      .from('match_records')
      .select('user_id, profit, completed_at')
      .eq('match_type', 'kline')
      .not('rank', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(3);
    
    // 获取名人堂成员
    const { data: hallOfFame } = await supabase
      .from('challenge_hall_of_fame')
      .select('user_name, title, achieved_at')
      .order('achieved_at', { ascending: false })
      .limit(5);
    
    if (hallOfFame && hallOfFame.length > 0) {
      hallOfFame.forEach((item: any) => {
        if (item.title) {
          champions.push(`${item.user_name}获得了"${item.title}"称号`);
        }
      });
    }
    
    return champions;
  } catch (e) {
    console.error('获取平台事件失败:', e);
    return [];
  }
}

// 获取热点消息（模拟，实际可接入新闻API）
async function getHotTopics(): Promise<{ title: string; impact: string }[]> {
  try {
    // 这里可以接入真实的新闻API获取黄金相关热点
    // 目前返回常见的影响因素
    return [
      { title: '美国CPI数据', impact: '高于预期利空黄金，低于预期利好黄金' },
      { title: '美联储利率决议', impact: '鹰派立场利空黄金，鸽派立场利好黄金' },
      { title: '地缘政治风险', impact: '冲突升级避险需求上升，利好黄金' },
      { title: '美元指数走势', impact: '美元走强压制黄金，走弱利好黄金' },
    ];
  } catch (e) {
    return [];
  }
}

// 金查理的系统提示词
const SYSTEM_PROMPT = `你是金查理，一位资深黄金交易分析师，为金火火茶馆撰写每日伦敦金市场分析。

## 基本信息
- 你要分析的是真实伦敦金(XAU/USD)价格
- 当前日期和实时价格会在用户消息中提供
- 参考当日影响黄金的热点因素

## 分析风格
- 简洁专业，口语化表达
- 分析影响伦敦金走势的关键因素
- 给出操作建议
- 篇幅300-500字

## 分析结构
1. 行情回顾：根据提供的买价和卖价，分析当前市场状态
2. 热点影响：结合当日热点消息，分析对金价的影响
3. 技术参考：基于价格给出简单的技术面参考
4. 操作建议：给出当日操作参考

## 注意事项
- 只输出分析内容，不要加标题符号
- 语言简洁有力，像专业交易员交流
- 不要使用表情符号`;

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 获取今天的日期
    const today = new Date();
    const newsDate = today.toISOString().split('T')[0];

    // 检查今天是否已有新闻
    const { data: existingNews } = await supabase
      .from('daily_news')
      .select('id')
      .eq('news_date', newsDate)
      .eq('category', 'market')
      .maybeSingle();

    if (existingNews) {
      return NextResponse.json({ 
        success: true, 
        message: '今日市场分析已存在',
        data: existingNews 
      });
    }

    // 获取数据
    const goldPrice = await getGoldPrice();
    const platformEvents = await getPlatformEvents(supabase);
    const hotTopics = await getHotTopics();

    // 构建提示词
    let goldPriceInfo = '价格数据获取失败';
    if (goldPrice) {
      goldPriceInfo = `当前伦敦金买价: $${goldPrice.bid.toFixed(2)}，卖价: $${goldPrice.ask.toFixed(2)}，中间价: $${goldPrice.mid.toFixed(2)}，更新时间: ${goldPrice.time}`;
    }

    let eventsInfo = '';
    if (platformEvents.length > 0) {
      eventsInfo = '平台大事件: ' + platformEvents.join('；');
    }

    let topicsInfo = '';
    if (hotTopics.length > 0) {
      topicsInfo = '今日热点: ' + hotTopics.map(t => `${t.title}(${t.impact})`).join('；');
    }

    const userMessage = `今天是${newsDate}。

${goldPriceInfo}

${topicsInfo}

${eventsInfo}

请根据以上信息，撰写今日伦敦金市场分析。`;

    // 调用AI生成内容
    const config = new Config();
    const client = new LLMClient(config);

    const title = `${newsDate} 伦敦金市场日报`;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ];

    let content = '暂无分析内容';
    
    try {
      const response = await client.invoke(messages, { 
        temperature: 0.7,
        model: 'deepseek-v3-2-251201',
      });
      content = response.content || content;
    } catch (llmError) {
      console.error('LLM调用失败:', llmError);
      content = `${goldPriceInfo}\n\n今日暂无详细分析，请关注市场动态。`;
    }

    // 保存到数据库
    const { data, error } = await supabase
      .from('daily_news')
      .insert({
        title,
        content,
        author: '金查理',
        category: 'market',
        news_date: newsDate,
        tags: JSON.stringify(['伦敦金', '市场分析', '每日日报']),
        published: true,
      })
      .select()
      .single();

    if (error) {
      console.error('保存新闻失败:', error);
      return NextResponse.json({ error: '保存新闻失败' }, { status: 500 });
    }

    console.log(`[金查理] 已生成市场日报: ${title}`);

    return NextResponse.json({ 
      success: true, 
      data,
      message: '市场分析生成成功' 
    });
  } catch (error) {
    console.error('生成新闻错误:', error);
    return NextResponse.json({ error: '生成新闻失败' }, { status: 500 });
  }
}

// 手动触发生成
export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    const body = await request.json();
    const { date } = body;
    const newsDate = date || new Date().toISOString().split('T')[0];

    // 删除旧新闻
    await supabase
      .from('daily_news')
      .delete()
      .eq('news_date', newsDate)
      .eq('category', 'market');

    // 重新生成（调用上面的逻辑）
    const originalUrl = request.url;
    
    // 获取数据
    const goldPrice = await getGoldPrice();
    const platformEvents = await getPlatformEvents(supabase);
    const hotTopics = await getHotTopics();

    // 构建提示词
    let goldPriceInfo = '价格数据获取失败';
    if (goldPrice) {
      goldPriceInfo = `当前伦敦金买价: $${goldPrice.bid.toFixed(2)}，卖价: $${goldPrice.ask.toFixed(2)}，中间价: $${goldPrice.mid.toFixed(2)}，更新时间: ${goldPrice.time}`;
    }

    let eventsInfo = '';
    if (platformEvents.length > 0) {
      eventsInfo = '平台大事件: ' + platformEvents.join('；');
    }

    let topicsInfo = '';
    if (hotTopics.length > 0) {
      topicsInfo = '今日热点: ' + hotTopics.map(t => `${t.title}(${t.impact})`).join('；');
    }

    const userMessage = `今天是${newsDate}。

${goldPriceInfo}

${topicsInfo}

${eventsInfo}

请根据以上信息，撰写今日伦敦金市场分析。`;

    // 调用AI生成内容
    const config = new Config();
    const client = new LLMClient(config);

    const title = `${newsDate} 伦敦金市场日报`;

    const messages2: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ];

    let content = '暂无分析内容';
    
    try {
      const response = await client.invoke(messages2, { 
        temperature: 0.7,
        model: 'deepseek-v3-2-251201',
      });
      content = response.content || content;
    } catch (llmError) {
      console.error('LLM调用失败:', llmError);
      content = `${goldPriceInfo}\n\n今日暂无详细分析，请关注市场动态。`;
    }

    // 保存到数据库
    const { data, error } = await supabase
      .from('daily_news')
      .insert({
        title,
        content,
        author: '金查理',
        category: 'market',
        news_date: newsDate,
        tags: JSON.stringify(['伦敦金', '市场分析', '每日日报']),
        published: true,
      })
      .select()
      .single();

    if (error) {
      console.error('保存新闻失败:', error);
      return NextResponse.json({ error: '保存新闻失败' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: '重新生成成功' 
    });
  } catch (error) {
    console.error('重新生成新闻错误:', error);
    return NextResponse.json({ error: '重新生成失败' }, { status: 500 });
  }
}
