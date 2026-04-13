import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// 获取投诉列表（仅管理员）
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
      .from('user_complaints')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({ error: '获取投诉列表失败' }, { status: 500 });
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

    const complaints = (data || []).map((complaint: any) => ({
      ...complaint,
      user: userMap[complaint.user_id] || null,
    }));

    return NextResponse.json({
      complaints,
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('Get complaints error:', error);
    return NextResponse.json({ error: '获取投诉列表失败' }, { status: 500 });
  }
}

// 回复投诉（仅管理员）
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

    const { complaintId, reply } = await request.json();

    if (!complaintId) {
      return NextResponse.json({ error: '缺少投诉ID' }, { status: 400 });
    }

    if (!reply || reply.trim().length === 0) {
      return NextResponse.json({ error: '回复内容不能为空' }, { status: 400 });
    }

    if (reply.length > 2000) {
      return NextResponse.json({ error: '回复内容超出长度限制' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 检查投诉是否存在
    const { data: complaint, error: fetchError } = await supabase
      .from('user_complaints')
      .select('*')
      .eq('id', complaintId)
      .single();

    if (fetchError || !complaint) {
      return NextResponse.json({ error: '投诉不存在' }, { status: 404 });
    }

    // 更新投诉状态和回复
    const { error: updateError } = await supabase
      .from('user_complaints')
      .update({
        status: 'replied',
        admin_reply: reply.trim(),
        replied_at: new Date().toISOString(),
      })
      .eq('id', complaintId);

    if (updateError) {
      console.error('Update complaint error:', updateError);
      return NextResponse.json({ error: '回复投诉失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '回复成功',
    });
  } catch (error) {
    console.error('Reply complaint error:', error);
    return NextResponse.json({ error: '回复投诉失败' }, { status: 500 });
  }
}
