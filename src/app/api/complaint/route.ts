import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { userComplaints } from '@/storage/database/shared/schema';

// 提交投诉
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { title, content } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ error: '标题和内容不能为空' }, { status: 400 });
    }

    if (title.length > 200 || content.length > 2000) {
      return NextResponse.json({ error: '标题或内容超出长度限制' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    const { data, error } = await supabase
      .from('user_complaints')
      .insert({
        user_id: session.user.id,
        title: title.trim(),
        content: content.trim(),
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Insert complaint error:', error);
      return NextResponse.json({ error: '提交投诉失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '投诉提交成功',
      data,
    });
  } catch (error) {
    console.error('Submit complaint error:', error);
    return NextResponse.json({ error: '提交投诉失败' }, { status: 500 });
  }
}

// 获取当前用户的投诉列表
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

    const { data, error } = await supabase
      .from('user_complaints')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get complaints error:', error);
      return NextResponse.json({ error: '获取投诉列表失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error('Get complaints error:', error);
    return NextResponse.json({ error: '获取投诉列表失败' }, { status: 500 });
  }
}
