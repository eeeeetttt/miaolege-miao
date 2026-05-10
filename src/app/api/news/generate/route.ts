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

// 获取热点消息（使用网络搜索获取真实财经日历）
async function getHotTopics(): Promise<{ title: string; impact: string; date: string }[]> {
  try {
    const { Config, SearchClient } = await import('coze-coding-dev-sdk');
    const config = new Config();
    const client = new SearchClient(config);
    
    // 获取当前日期信息
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=周日, 6=周六
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // 搜索本周/今日重要财经事件
    const searchQuery = isWeekend 
      ? '本周重要财经事件 黄金市场'
      : '今日财经日历 重要数据 黄金';
    
    const response = await client.webSearch(searchQuery, 5, true);
    
    const topics: { title: string; impact: string; date: string }[] = [];
    
    // 解析搜索结果
    if (response.web_items && response.web_items.length > 0) {
      for (const item of response.web_items) {
        // 提取热点标题和影响说明
        const title = item.title || item.snippet || '';
        const snippet = item.snippet || '';
        
        // 识别是否包含重要财经事件关键词
        const eventKeywords = ['CPI', '通胀', '利率', '美联储', '非农', 'GDP', '零售'];
        const hasEvent = eventKeywords.some(keyword => 
          title.toLowerCase().includes(keyword.toLowerCase()) || 
          snippet.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (hasEvent && topics.length < 4) {
          // 根据事件类型确定对黄金的影响
          let impact = '';
          if (title.includes('CPI') || title.includes('通胀')) {
            impact = '高于预期利空黄金，低于预期利好黄金';
          } else if (title.includes('利率') || title.includes('美联储')) {
            impact = '鹰派立场利空黄金，鸽派立场利好黄金';
          } else if (title.includes('非农')) {
            impact = '就业数据强劲利空黄金，疲软利好黄金';
          } else if (title.includes('GDP') || title.includes('经济')) {
            impact = '经济强劲利空黄金，衰退风险利好黄金';
          } else {
            impact = '需关注数据结果对市场情绪的影响';
          }
          
          topics.push({
            title: title.substring(0, 50),
            impact,
            date: isWeekend ? '本周' : '今日'
          });
        }
      }
    }
    
    // 如果没有找到具体事件，返回通用市场因素
    if (topics.length === 0) {
      // 检查是否是周末
      if (isWeekend) {
        topics.push({
          title: '周末市场清淡',
          impact: '周末流动性降低，价格波动可能收窄',
          date: '周末'
        });
        topics.push({
          title: '等待下周数据指引',
          impact: '基本面清淡，市场关注下周财经数据',
          date: '周末'
        });
      } else {
        // 工作日但无特殊事件
        topics.push({
          title: '美元指数走势',
          impact: '美元走强压制黄金，走弱利好黄金',
          date: '今日'
        });
        topics.push({
          title: '地缘政治动态',
          impact: '避险情绪影响黄金短期走势',
          date: '今日'
        });
      }
    }
    
    return topics;
  } catch (e) {
    console.error('获取热点消息失败:', e);
    // 返回默认值
    const now = new Date();
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    return [
      { 
        title: isWeekend ? '周末市场清淡' : '市场观望情绪', 
        impact: '消息面清淡，价格维持震荡',
        date: isWeekend ? '周末' : '今日'
      }
    ];
  }
}

// 金查理的系统提示词
function getSystemPrompt(isWeekend: boolean): string {
  const weekendInstruction = `
## 周末分析要点
- 周末市场流动性较低，主要金融 markets休市
- 分析上周走势总结和本周展望
- 关注周一开盘可能出现的跳空缺口
- 可回顾地缘政治等中长期影响因素`;

  const weekdayInstruction = `
## 工作日分析要点
- 关注当日重要财经数据和事件（如果有）
- 分析美元指数、实际利率等核心驱动因素
- 关注市场风险情绪变化`;

  return `你是金查理，一位资深黄金交易分析师，为金火火茶馆撰写每日伦敦金市场分析。

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

## 关键原则
- 只分析实际存在的财经事件，不要假设或虚构"今晚"或"今日"有重大数据发布
- 如果当日没有重要财经事件，应以"基本面清淡"或"市场观望情绪"为切入点
- 如实反映当前市场状态，不要编造不存在的CPI、美联储利率决议等事件
${isWeekend ? weekendInstruction : weekdayInstruction}

## 注意事项
- 只输出分析内容，不要加标题符号
- 语言简洁有力，像专业交易员交流
- 不要使用表情符号`;
}

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

    // 判断是否周末
    const dayOfWeek = today.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dayName = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dayOfWeek];

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
      topicsInfo = '当日热点: ' + hotTopics.map(t => `${t.title}(${t.impact})`).join('；');
    }

    const userMessage = `今天是${newsDate}，${dayName}。

${goldPriceInfo}

${topicsInfo}

${eventsInfo}

请根据以上真实信息，撰写今日伦敦金市场分析。注意：只分析实际存在的财经事件，不要虚构任何"今晚"或"今日"的数据发布。`;

    // 调用AI生成内容
    const config = new Config();
    const client = new LLMClient(config);

    const title = `${newsDate} ${dayName}伦敦金市场日报`;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: getSystemPrompt(isWeekend) },
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
        news_date: newsDate,
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

    // 判断是否周末
    const today = new Date(newsDate);
    const dayOfWeek = today.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dayName = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dayOfWeek];

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
      topicsInfo = '当日热点: ' + hotTopics.map(t => `${t.title}(${t.impact})`).join('；');
    }

    const userMessage = `今天是${newsDate}，${dayName}。

${goldPriceInfo}

${topicsInfo}

${eventsInfo}

请根据以上真实信息，撰写今日伦敦金市场分析。注意：只分析实际存在的财经事件，不要虚构任何"今晚"或"今日"的数据发布。`;

    // 调用AI生成内容
    const config = new Config();
    const client = new LLMClient(config);

    const title = `${newsDate} ${dayName}伦敦金市场日报`;

    const messages2: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: getSystemPrompt(isWeekend) },
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
