import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// 获取我的关注列表或粉丝列表
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'following'; // following 或 followers
    const userId = searchParams.get('userId') || session.user.id;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('user_follows')
      .select('id, follower_id, followed_id, created_at');

    if (type === 'following') {
      query = query.eq('follower_id', userId);
    } else {
      query = query.eq('followed_id', userId);
    }

    const { data: follows, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`获取关注列表失败: ${error.message}`);

    // 获取相关用户信息
    const relatedUserIds = follows?.map(f => 
      type === 'following' ? f.followed_id : f.follower_id
    ) || [];

    const userInfoMap = new Map<string, { name: string; avatar: string | null }>();
    
    for (const uid of relatedUserIds) {
      const [user] = await db
        .select({ name: users.name, avatar: users.avatarUrl })
        .from(users)
        .where(eq(users.userId, uid))
        .limit(1);
      
      if (user) {
        userInfoMap.set(uid, {
          name: user.name || '未设置昵称',
          avatar: user.avatar || null,
        });
      }
    }

    const result = (follows || []).map(f => {
      const relatedUserId = type === 'following' ? f.followed_id : f.follower_id;
      const info = userInfoMap.get(relatedUserId) || { name: '未知用户', avatar: null };
      
      return {
        userId: relatedUserId,
        name: info.name,
        avatar: info.avatar,
        followedAt: f.created_at,
        isMe: relatedUserId === session.user.id,
      };
    });

    // 获取总数
    const { count } = await supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq(type === 'following' ? 'follower_id' : 'followed_id', userId);

    return NextResponse.json({
      success: true,
      data: result,
      page,
      pageSize,
      total: count || 0,
    });
  } catch (error) {
    console.error('Get follow list error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '获取失败' 
    }, { status: 500 });
  }
}
