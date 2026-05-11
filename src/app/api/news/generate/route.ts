import { NextRequest, NextResponse } from 'next/server';

// AI 生成新闻内容
export async function POST(request: NextRequest) {
  try {
    const { topic } = await request.json();

    // 简化实现，实际应该调用 AI API
    const generatedContent = {
      title: `关于${topic}的最新资讯`,
      content: `本文探讨了${topic}的相关内容...`,
      summary: `${topic}是一个重要的话题...`
    };

    return NextResponse.json({
      success: true,
      data: generatedContent
    });
  } catch (error: any) {
    console.error('生成新闻失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
