import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// 获取微信充值申请列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'all';

    let query = supabase
      .from('recharge_applications')
      .select('*')
      .eq('payment_method', 'wechat')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data: records, error } = await query.limit(100);

    if (error) {
      console.error('获取充值申请失败:', error);
      return NextResponse.json({ error: '获取充值申请失败' }, { status: 500 });
    }

    // 获取用户信息
    const userIds = [...new Set((records || []).map(r => r.user_id))];
    let userMap: Record<string, any> = {};

    if (userIds.length > 0) {
      try {
        const usersData = await db
          .select({ userId: users.userId, name: users.name, email: users.email })
          .from(users)
          .where(eq(users.userId, userIds[0]));

        for (const user of usersData) {
          userMap[user.userId] = user;
        }
      } catch (dbErr) {
        console.error('MySQL查询用户失败:', dbErr);
      }
    }

    const result = (records || []).map(record => ({
      ...record,
      user: userMap[record.user_id] || null,
    }));

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('获取微信充值申请错误:', error);
    return NextResponse.json({ error: '获取充值申请失败' }, { status: 500 });
  }
}

// 审核微信充值申请
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { action, applicationId, adminNote } = await request.json();

    if (!applicationId) {
      return NextResponse.json({ error: '缺少申请ID' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 获取充值申请
    const { data: application, error: fetchError } = await supabase
      .from('recharge_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      return NextResponse.json({ error: '申请不存在' }, { status: 404 });
    }

    if (application.payment_method !== 'wechat') {
      return NextResponse.json({ error: '不是微信充值申请' }, { status: 400 });
    }

    if (application.status !== 'pending') {
      return NextResponse.json({ error: '该申请已处理' }, { status: 400 });
    }

    if (action === 'approve') {
      // 审核通过，添加U到用户账户
      await db.transaction(async (tx) => {
        // 获取用户
        const [user] = await tx
          .select({ coinBalance: users.coinBalance })
          .from(users)
          .where(eq(users.userId, application.user_id));

        // 更新用户余额
        await tx
          .update(users)
          .set({
            coinBalance: (user?.coinBalance || 0) + application.amount,
            updatedAt: new Date(),
          })
          .where(eq(users.userId, application.user_id));

        // 更新充值申请状态
        await supabase
          .from('recharge_applications')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString(),
            admin_note: adminNote || '审核通过',
          })
          .eq('id', applicationId);
      });

      return NextResponse.json({
        success: true,
        message: '审核通过，已充值到用户账户',
      });
    } else if (action === 'reject') {
      // 审核拒绝
      await supabase
        .from('recharge_applications')
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString(),
          admin_note: adminNote || '审核拒绝',
        })
        .eq('id', applicationId);

      return NextResponse.json({
        success: true,
        message: '已拒绝该申请',
      });
    } else {
      return NextResponse.json({ error: '无效的操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('审核微信充值申请错误:', error);
    return NextResponse.json({ error: '审核失败' }, { status: 500 });
  }
}
