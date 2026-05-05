import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq, or } from 'drizzle-orm';

// 转账
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { toEmail, amount, remark } = await request.json();

    if (!toEmail || !amount) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(toEmail)) {
      return NextResponse.json({ error: '请输入正确的邮箱格式' }, { status: 400 });
    }

    // 获取转账人信息
    const [fromUser] = await db
      .select({ userId: users.userId, name: users.name, email: users.email, coinBalance: users.coinBalance })
      .from(users)
      .where(eq(users.userId, session.user.id))
      .limit(1);

    if (!fromUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 检查是否给自己转账
    if (fromUser.email === toEmail) {
      return NextResponse.json({ error: '不能给自己转账' }, { status: 400 });
    }

    const transferAmount = parseInt(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return NextResponse.json({ error: '转账金额必须大于0' }, { status: 400 });
    }

    if (Number(fromUser.coinBalance || 0) < transferAmount) {
      return NextResponse.json({ 
        error: `余额不足，当前余额: ${fromUser.coinBalance || 0} U` 
      }, { status: 400 });
    }

    // 通过邮箱查找收款人
    const [toUser] = await db
      .select({ userId: users.userId, name: users.name, email: users.email, coinBalance: users.coinBalance })
      .from(users)
      .where(eq(users.email, toEmail.toLowerCase()))
      .limit(1);

    if (!toUser) {
      return NextResponse.json({ error: '收款用户不存在，请确认邮箱是否正确' }, { status: 404 });
    }

    // 创建转账记录
    const { data: transfer, error: insertError } = await supabase
      .from('coin_transfers')
      .insert({
        from_user_id: session.user.id,
        to_user_id: toUser.userId,
        amount: transferAmount,
        remark: remark || null,
        status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .select('id, created_at')
      .single();

    if (insertError) throw new Error(`创建转账记录失败: ${insertError.message}`);

    // 更新转出方余额
    await db
      .update(users)
      .set({ coinBalance: String(Number(fromUser.coinBalance || 0) - transferAmount) })
      .where(eq(users.userId, session.user.id));

    // 更新转入方余额
    await db
      .update(users)
      .set({ coinBalance: String(Number(toUser.coinBalance || 0) + transferAmount) })
      .where(eq(users.userId, toUser.userId));

    return NextResponse.json({
      success: true,
      message: `成功向 ${toUser.name} 转账 ${transferAmount} U`,
      data: {
        transferId: transfer.id,
        amount: transferAmount,
        fromBalance: Number(fromUser.coinBalance || 0) - transferAmount,
        createdAt: transfer.created_at,
      },
    });
  } catch (error) {
    console.error('Transfer error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '转账失败' 
    }, { status: 500 });
  }
}

// 获取转账记录
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
    const type = searchParams.get('type') || 'all'; // all, sent, received
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('coin_transfers')
      .select('id, from_user_id, to_user_id, amount, remark, status, created_at, processed_at');

    if (type === 'sent') {
      query = query.eq('from_user_id', session.user.id);
    } else if (type === 'received') {
      query = query.eq('to_user_id', session.user.id);
    } else {
      query = query.or(`from_user_id.eq.${session.user.id},to_user_id.eq.${session.user.id}`);
    }

    const { data: transfers, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`获取转账记录失败: ${error.message}`);

    // 获取相关用户信息
    const userIds = new Set<string>();
    transfers?.forEach(t => {
      userIds.add(t.from_user_id);
      userIds.add(t.to_user_id);
    });

    const userInfoMap = new Map<string, { name: string; avatar: string | null }>();
    for (const uid of userIds) {
      const [user] = await db
        .select({ name: users.name, avatar: users.avatarUrl })
        .from(users)
        .where(eq(users.userId, uid))
        .limit(1);
      
      if (user) {
        userInfoMap.set(uid, {
          name: user.name || '未知用户',
          avatar: user.avatar || null,
        });
      }
    }

    const result = (transfers || []).map(t => ({
      id: t.id,
      fromUserId: t.from_user_id,
      fromUserName: userInfoMap.get(t.from_user_id)?.name || '未知用户',
      fromUserAvatar: userInfoMap.get(t.from_user_id)?.avatar || null,
      toUserId: t.to_user_id,
      toUserName: userInfoMap.get(t.to_user_id)?.name || '未知用户',
      toUserAvatar: userInfoMap.get(t.to_user_id)?.avatar || null,
      amount: t.amount,
      remark: t.remark,
      status: t.status,
      createdAt: t.created_at,
      isSent: t.from_user_id === session.user.id,
    }));

    return NextResponse.json({
      success: true,
      data: result,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Get transfers error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '获取失败' 
    }, { status: 500 });
  }
}
