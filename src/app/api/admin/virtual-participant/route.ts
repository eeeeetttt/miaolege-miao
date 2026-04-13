import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// 获取虚拟用户列表
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

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    const { data, error } = await supabase
      .from('virtual_participants')
      .select('*')
      .order('level', { ascending: false });

    if (error) {
      console.error('Get virtual participants error:', error);
      return NextResponse.json({ error: '获取虚拟用户列表失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error('Get virtual participants error:', error);
    return NextResponse.json({ error: '获取虚拟用户列表失败' }, { status: 500 });
  }
}

// 添加虚拟用户
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

    const body = await request.json();
    const { name, avatar, level, equity, progress, isActive } = body;

    if (!name || !level || !equity) {
      return NextResponse.json({ error: '名称、关卡和净值为必填项' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    const { data, error } = await supabase
      .from('virtual_participants')
      .insert({
        name,
        avatar: avatar || null,
        level: parseInt(level),
        equity: parseFloat(equity),
        progress: parseInt(progress) || 0,
        is_active: isActive !== undefined ? (isActive ? 1 : 0) : 1,
      })
      .select()
      .single();

    if (error) {
      console.error('Add virtual participant error:', error);
      return NextResponse.json({ error: '添加虚拟用户失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '添加成功',
      data,
    });
  } catch (error) {
    console.error('Add virtual participant error:', error);
    return NextResponse.json({ error: '添加虚拟用户失败' }, { status: 500 });
  }
}

// 更新虚拟用户
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { id, name, avatar, level, equity, progress, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少ID' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (level !== undefined) updateData.level = parseInt(level);
    if (equity !== undefined) updateData.equity = parseFloat(equity);
    if (progress !== undefined) updateData.progress = parseInt(progress);
    if (isActive !== undefined) updateData.is_active = isActive ? 1 : 0;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('virtual_participants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update virtual participant error:', error);
      return NextResponse.json({ error: '更新虚拟用户失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '更新成功',
      data,
    });
  } catch (error) {
    console.error('Update virtual participant error:', error);
    return NextResponse.json({ error: '更新虚拟用户失败' }, { status: 500 });
  }
}

// 删除虚拟用户
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少ID' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    const { error } = await supabase
      .from('virtual_participants')
      .delete()
      .eq('id', parseInt(id));

    if (error) {
      console.error('Delete virtual participant error:', error);
      return NextResponse.json({ error: '删除虚拟用户失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('Delete virtual participant error:', error);
    return NextResponse.json({ error: '删除虚拟用户失败' }, { status: 500 });
  }
}
