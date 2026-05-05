import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 使用动态导入
    const { getSupabaseAdmin } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseAdmin();
    
    // 从 Supabase 查询用户信息
    const { data: user, error } = await supabase
      .from('users')
      .select('user_id, email, name, avatar, coin_balance, created_at, name_updated_at')
      .eq('user_id', session.user.id)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        userId: user.user_id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        coinBalance: user.coin_balance,
        createdAt: user.created_at,
        nameUpdatedAt: user.name_updated_at,
      },
    });
  } catch (error) {
    console.error('Get user info error:', error);
    return NextResponse.json({ error: '获取用户信息失败', details: String(error) }, { status: 500 });
  }
}
