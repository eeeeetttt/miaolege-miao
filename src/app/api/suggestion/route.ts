import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';

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
      message: '建议提交成功，等待审核',
      data,
    });
  } catch (error) {
    console.error('Submit suggestion error:', error);
    return NextResponse.json({ error: '提交建议失败' }, { status: 500 });
  }
}

// 获取已通过的建议列表（所有人可见）
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 获取已通过的建议
    const { data: suggestions, error } = await supabase
      .from('user_suggestions')
      .select('*')
      .eq('status', 'approved')
      .order('like_count', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get suggestions error:', error);
      return NextResponse.json({ error: '获取建议列表失败' }, { status: 500 });
    }

    // 获取用户信息
    const userIds = [...new Set((suggestions || []).map((s: any) => s.user_id))];
    let userMap: Record<string, any> = {};

    if (userIds.length > 0) {
      for (const uid of userIds) {
        const [user] = await db
          .select({ userId: users.userId, name: users.name, email: users.email, avatar: users.avatar })
          .from(users)
          .where(eq(users.userId, uid));
        if (user) {
          userMap[uid] = user;
        }
      }
    }

    // 获取用户已点赞的建议
    let likedSuggestionIds: number[] = [];
    if (userId) {
      const { data: likes } = await supabase
        .from('suggestion_likes')
        .select('suggestion_id')
        .eq('user_id', userId);
      likedSuggestionIds = (likes || []).map((l: any) => l.suggestion_id);
    }

    const result = (suggestions || []).map((suggestion: any) => ({
      ...suggestion,
      user: userMap[suggestion.user_id] || null,
      isLiked: likedSuggestionIds.includes(suggestion.id),
    }));

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get suggestions error:', error);
    return NextResponse.json({ error: '获取建议列表失败' }, { status: 500 });
  }
}
