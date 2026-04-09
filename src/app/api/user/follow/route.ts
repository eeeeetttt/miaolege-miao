import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

const supabase = getSupabaseClient();

// 关注/取消关注用户
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { followedId } = await request.json();

    if (!followedId) {
      return NextResponse.json({ error: '缺少关注用户ID' }, { status: 400 });
    }

    if (followedId === session.user.id) {
      return NextResponse.json({ error: '不能关注自己' }, { status: 400 });
    }

    // 检查目标用户是否存在
    const [targetUser] = await db
      .select({ userId: users.userId })
      .from(users)
      .where(eq(users.userId, followedId))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 检查是否已关注
    const { data: existingFollow } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', session.user.id)
      .eq('followed_id', followedId)
      .maybeSingle();

    if (existingFollow) {
      // 已关注，取消关注
      await supabase
        .from('user_follows')
        .delete()
        .eq('id', existingFollow.id);

      return NextResponse.json({
        success: true,
        message: '已取消关注',
        isFollowing: false,
      });
    } else {
      // 未关注，添加关注
      await supabase
        .from('user_follows')
        .insert({
          follower_id: session.user.id,
          followed_id: followedId,
        });

      return NextResponse.json({
        success: true,
        message: '关注成功',
        isFollowing: true,
      });
    }
  } catch (error) {
    console.error('Follow user error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '操作失败' 
    }, { status: 500 });
  }
}

// 获取关注状态
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const followedId = searchParams.get('followedId');

    if (!followedId) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
    }

    const { data } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', session.user.id)
      .eq('followed_id', followedId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      isFollowing: !!data,
    });
  } catch (error) {
    console.error('Get follow status error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '获取失败' 
    }, { status: 500 });
  }
}
