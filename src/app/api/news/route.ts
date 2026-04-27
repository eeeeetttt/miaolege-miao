import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取新闻列表
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const offset = (page - 1) * pageSize;

    const { data: news, error, count } = await supabase
      .from('daily_news')
      .select('id, title, content, author, news_date, created_at, updated_at', { count: 'exact' })
      .eq('published', true)
      .order('news_date', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('获取新闻失败:', error);
      return NextResponse.json({ error: '获取新闻失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: news,
      page,
      pageSize,
      total: count || 0,
    });
  } catch (error) {
    console.error('获取新闻错误:', error);
    return NextResponse.json({ error: '获取新闻失败' }, { status: 500 });
  }
}
