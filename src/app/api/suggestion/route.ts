import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 提交建议
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { content } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: '建议内容不能为空' }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: '建议内容超出长度限制' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    const { data, error } = await supabase
      .from('user_suggestions')
      .insert({
        user_id: session.user.id,
        content: content.trim(),
        status: 'pending',
        like_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Insert suggestion error:', error);
      return NextResponse.json({ error: '提交建议失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '建议提交成功',
      data,
    });
  } catch (error) {
    console.error('Submit suggestion error:', error);
    return NextResponse.json({ error: '提交建议失败' }, { status: 500 });
  }
}

// 获取当前用户的建议列表（仅自己可见）
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 获取当前用户的建议（仅自己可见）
    const { data: suggestions, error } = await supabase
      .from('user_suggestions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get suggestions error:', error);
      return NextResponse.json({ error: '获取建议列表失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: suggestions || [],
    });
  } catch (error) {
    console.error('Get suggestions error:', error);
    return NextResponse.json({ error: '获取建议列表失败' }, { status: 500 });
  }
}
