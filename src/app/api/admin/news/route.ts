import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取所有新闻（管理员）
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'vip')) {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const offset = (page - 1) * pageSize;

    const { data: news, error, count } = await supabase
      .from('daily_news')
      .select('id, title, content, author, news_date, published, created_at, updated_at', { count: 'exact' })
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

// 保存/更新新闻
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'vip')) {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    const body = await request.json();
    const { id, title, content, author, news_date, published } = body;

    let result;

    if (id) {
      // 更新现有新闻
      const { data, error } = await supabase
        .from('daily_news')
        .update({
          title,
          content,
          author: author || '金查理',
          news_date,
          published: published ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('更新新闻失败:', error);
        return NextResponse.json({ error: '更新新闻失败' }, { status: 500 });
      }
      result = data;
    } else {
      // 创建新新闻
      const { data, error } = await supabase
        .from('daily_news')
        .insert({
          title,
          content,
          author: author || '金查理',
          news_date,
          published: published ?? true,
        })
        .select()
        .single();

      if (error) {
        console.error('创建新闻失败:', error);
        return NextResponse.json({ error: '创建新闻失败' }, { status: 500 });
      }
      result = data;
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('保存新闻错误:', error);
    return NextResponse.json({ error: '保存新闻失败' }, { status: 500 });
  }
}

// 删除新闻
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少新闻ID' }, { status: 400 });
    }

    const { error } = await supabase
      .from('daily_news')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('删除新闻失败:', error);
      return NextResponse.json({ error: '删除新闻失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除新闻错误:', error);
    return NextResponse.json({ error: '删除新闻失败' }, { status: 500 });
  }
}
