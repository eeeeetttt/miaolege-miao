import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// 获取建议列表（仅管理员）
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 检查管理员权限
    const [adminUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.userId, session.user.id));

    if (adminUser?.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    let query = supabase
      .from('user_suggestions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({ error: '获取建议列表失败' }, { status: 500 });
    }

    // 获取用户信息
    const userIds = [...new Set((data || []).map((r: any) => r.user_id))];
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

    const suggestions = (data || []).map((suggestion: any) => ({
      ...suggestion,
      user: userMap[suggestion.user_id] || null,
    }));

    return NextResponse.json({
      suggestions,
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('Get suggestions error:', error);
    return NextResponse.json({ error: '获取建议列表失败' }, { status: 500 });
  }
}

// 审核建议（仅管理员）
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 检查管理员权限
    const [adminUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.userId, session.user.id));

    if (adminUser?.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { suggestionId, action } = await request.json();

    if (!suggestionId) {
      return NextResponse.json({ error: '缺少建议ID' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: '无效的操作' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 检查建议是否存在
    const { data: suggestion, error: fetchError } = await supabase
      .from('user_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .single();

    if (fetchError || !suggestion) {
      return NextResponse.json({ error: '建议不存在' }, { status: 404 });
    }

    if (suggestion.status !== 'pending') {
      return NextResponse.json({ error: '该建议已审核' }, { status: 400 });
    }

    // 更新建议状态
    const { error: updateError } = await supabase
      .from('user_suggestions')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
      })
      .eq('id', suggestionId);

    if (updateError) {
      console.error('Update suggestion error:', updateError);
      return NextResponse.json({ error: '审核建议失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: action === 'approve' ? '已通过该建议' : '已拒绝该建议',
    });
  } catch (error) {
    console.error('Review suggestion error:', error);
    return NextResponse.json({ error: '审核建议失败' }, { status: 500 });
  }
}
