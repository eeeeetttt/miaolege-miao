import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取新闻详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 获取新闻详情
    const { data, error } = await supabase
      .from('daily_news')
      .select('*')
      .eq('id', parseInt(id))
      .single();

    if (error || !data) {
      return NextResponse.json({ error: '新闻不存在' }, { status: 404 });
    }

    // 增加浏览数
    await supabase
      .from('daily_news')
      .update({ views: (data.views || 0) + 1 })
      .eq('id', parseInt(id));

    // 格式化返回数据
    const news = {
      id: data.id,
      title: data.title,
      content: data.content,
      author: data.author,
      category: data.category || 'market',
      newsDate: data.news_date,
      coverImage: data.cover_image,
      tags: data.tags ? JSON.parse(data.tags) : [],
      views: (data.views || 0) + 1,
      createdAt: data.created_at,
    };

    return NextResponse.json({
      success: true,
      data: news,
    });
  } catch (error) {
    console.error('获取新闻详情错误:', error);
    return NextResponse.json({ error: '获取新闻详情失败' }, { status: 500 });
  }
}

// 更新新闻
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    const body = await request.json();
    const { title, content, author, category, tags, coverImage, published } = body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (author !== undefined) updateData.author = author;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = JSON.stringify(tags);
    if (coverImage !== undefined) updateData.cover_image = coverImage;
    if (published !== undefined) updateData.published = published;

    const { data, error } = await supabase
      .from('daily_news')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single();

    if (error) {
      console.error('更新新闻失败:', error);
      return NextResponse.json({ error: '更新新闻失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
      message: '更新成功',
    });
  } catch (error) {
    console.error('更新新闻错误:', error);
    return NextResponse.json({ error: '更新新闻失败' }, { status: 500 });
  }
}

// 删除新闻
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    const { error } = await supabase
      .from('daily_news')
      .delete()
      .eq('id', parseInt(id));

    if (error) {
      console.error('删除新闻失败:', error);
      return NextResponse.json({ error: '删除新闻失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除新闻错误:', error);
    return NextResponse.json({ error: '删除新闻失败' }, { status: 500 });
  }
}
