import { NextRequest, NextResponse } from 'next/server';
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
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const category = searchParams.get('category'); // market | platform | hotspot

    let query = supabase
      .from('daily_news')
      .select('*', { count: 'exact' })
      .eq('published', true)
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('获取新闻列表失败:', error);
      return NextResponse.json({ error: '获取新闻列表失败' }, { status: 500 });
    }

    // 格式化数据
    const newsList = (data || []).map(item => ({
      id: item.id,
      title: item.title,
      content: item.content,
      author: item.author,
      category: item.category || 'market',
      newsDate: item.news_date,
      coverImage: item.cover_image,
      tags: item.tags ? JSON.parse(item.tags) : [],
      views: item.views || 0,
      createdAt: item.created_at,
    }));

    return NextResponse.json({
      success: true,
      data: {
        list: newsList,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error('获取新闻列表错误:', error);
    return NextResponse.json({ error: '获取新闻列表失败' }, { status: 500 });
  }
}

// 发布平台新闻（管理员）
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    const body = await request.json();
    const { title, content, author, category, tags, coverImage } = body;

    if (!title || !content) {
      return NextResponse.json({ error: '标题和内容不能为空' }, { status: 400 });
    }

    const newsDate = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('daily_news')
      .insert({
        title,
        content,
        author: author || '金火火编辑部',
        category: category || 'platform',
        news_date: newsDate,
        tags: tags ? JSON.stringify(tags) : null,
        cover_image: coverImage,
        published: true,
      })
      .select()
      .single();

    if (error) {
      console.error('发布新闻失败:', error);
      return NextResponse.json({ error: '发布新闻失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
      message: '发布成功',
    });
  } catch (error) {
    console.error('发布新闻错误:', error);
    return NextResponse.json({ error: '发布新闻失败' }, { status: 500 });
  }
}
