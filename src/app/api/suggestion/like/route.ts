import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 点赞/取消点赞建议
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { suggestionId } = await request.json();

    if (!suggestionId) {
      return NextResponse.json({ error: '缺少建议ID' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 检查建议是否存在且已通过
    const { data: suggestion, error: fetchError } = await supabase
      .from('user_suggestions')
      .select('id, status, like_count')
      .eq('id', suggestionId)
      .single();

    if (fetchError || !suggestion) {
      return NextResponse.json({ error: '建议不存在' }, { status: 404 });
    }

    if (suggestion.status !== 'approved') {
      return NextResponse.json({ error: '只能点赞已通过的建议' }, { status: 400 });
    }

    // 检查是否已点赞
    const { data: existingLike } = await supabase
      .from('suggestion_likes')
      .select('id')
      .eq('suggestion_id', suggestionId)
      .eq('user_id', session.user.id)
      .single();

    if (existingLike) {
      // 取消点赞
      await supabase
        .from('suggestion_likes')
        .delete()
        .eq('id', existingLike.id);

      // 减少点赞数
      await supabase
        .from('user_suggestions')
        .update({ like_count: Math.max(0, suggestion.like_count - 1) })
        .eq('id', suggestionId);

      return NextResponse.json({
        success: true,
        message: '已取消点赞',
        liked: false,
      });
    } else {
      // 添加点赞
      await supabase
        .from('suggestion_likes')
        .insert({
          suggestion_id: suggestionId,
          user_id: session.user.id,
        });

      // 增加点赞数
      await supabase
        .from('user_suggestions')
        .update({ like_count: suggestion.like_count + 1 })
        .eq('id', suggestionId);

      return NextResponse.json({
        success: true,
        message: '点赞成功',
        liked: true,
      });
    }
  } catch (error) {
    console.error('Like suggestion error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
