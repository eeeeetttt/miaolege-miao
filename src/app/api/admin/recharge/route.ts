import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { users } from '@/lib/schema';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { S3Storage } from 'coze-coding-dev-sdk';

const storage = new S3Storage({
  bucketName: process.env.COZE_BUCKET_NAME,
});

// 获取充值申请列表
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
      .from('recharge_applications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
    }

    // 获取用户信息
    const userIds = [...new Set((data || []).map((r: any) => r.user_id))];
    let userMap: Record<string, any> = {};

    if (userIds.length > 0) {
      const usersData = await db
        .select({ userId: users.userId, name: users.name, email: users.email, avatar: users.avatarUrl })
        .from(users)
        .where(eq(users.userId, userIds[0])); // 简化处理，实际应该用 in

      // 重新查询所有用户
      for (const uid of userIds) {
        const [user] = await db
          .select({ userId: users.userId, name: users.name, email: users.email, avatar: users.avatarUrl })
          .from(users)
          .where(eq(users.userId, uid));
        if (user) {
          userMap[uid] = user;
        }
      }
    }

    // 生成截图URL
    const applications = await Promise.all(
      (data || []).map(async (app: any) => {
        let screenshotUrl = null;
        if (app.screenshot_url) {
          try {
            screenshotUrl = await storage.generatePresignedUrl({
              key: app.screenshot_url,
              expireTime: 3600,
            });
          } catch (e) {
            console.error('Generate URL error:', e);
          }
        }
        return {
          ...app,
          screenshot_url: screenshotUrl,
          user: userMap[app.user_id] || null,
        };
      })
    );

    return NextResponse.json({
      applications,
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('Get recharge applications error:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}

// 处理充值申请
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

    const { applicationId, action, adminNote } = await request.json();

    if (!applicationId) {
      return NextResponse.json({ error: '缺少申请ID' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: '无效的操作' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 获取申请详情
    const { data: application, error: fetchError } = await supabase
      .from('recharge_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      return NextResponse.json({ error: '申请不存在' }, { status: 404 });
    }

    if (application.status !== 'pending') {
      return NextResponse.json({ error: '该申请已处理' }, { status: 400 });
    }

    if (action === 'approve') {
      // 审批通过：更新状态，增加用户余额
      await db.transaction(async (tx) => {
        // 更新申请状态
        await supabase
          .from('recharge_applications')
          .update({
            status: 'completed',
            admin_note: adminNote || '',
            processed_at: new Date().toISOString(),
          })
          .eq('id', applicationId);

        // 增加用户余额
        const [user] = await tx
          .select({ coinBalance: users.coinBalance })
          .from(users)
          .where(eq(users.userId, application.user_id));

        await tx
          .update(users)
          .set({
            coinBalance: (user?.coinBalance || 0) + application.amount,
            updatedAt: new Date(),
          })
          .where(eq(users.userId, application.user_id));
      });

      return NextResponse.json({
        success: true,
        message: '审批通过，已增加用户余额',
      });
    } else {
      // 审批拒绝
      await supabase
        .from('recharge_applications')
        .update({
          status: 'rejected',
          admin_note: adminNote || '',
          processed_at: new Date().toISOString(),
        })
        .eq('id', applicationId);

      return NextResponse.json({
        success: true,
        message: '已拒绝该申请',
      });
    }
  } catch (error) {
    console.error('Process recharge application error:', error);
    return NextResponse.json({ error: '处理失败' }, { status: 500 });
  }
}
