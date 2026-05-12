import { NextRequest, NextResponse } from 'next/server';

// AI 生成新闻内容
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { topic } = body;

    // 生成今日日期
    const today = new Date();
    const dateStr = today.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // 简化实现，实际应该调用 AI API
    const generatedContent = {
      title: topic ? `关于${topic}的最新资讯` : `金查理伦敦金日报 - ${dateStr}`,
      content: topic 
        ? `本文探讨了${topic}的相关内容...` 
        : `【今日行情分析】\n\n黄金市场今日表现活跃，投资者需关注以下几点：\n\n1. 美联储政策动向\n2. 全球经济形势\n3. 地缘政治影响\n\n【操作建议】\n\n建议投资者保持谨慎，合理控制仓位。`,
      summary: topic ? `${topic}是一个重要的话题...` : '今日黄金市场分析报告'
    };

    return NextResponse.json({
      success: true,
      data: generatedContent,
      message: '新闻内容生成成功'
    });
  } catch (error: any) {
    console.error('生成新闻失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
