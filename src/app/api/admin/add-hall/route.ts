import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// 添加用户到名人堂
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminPassword = searchParams.get('password');
    
    // 简单验证
    if (adminPassword !== 'admin123') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { email, completedAt } = await request.json();

    if (!email) {
      return NextResponse.json({ error: '邮箱不能为空' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 尝试从 PostgreSQL 获取用户信息
    let userId: string | null = null;
    let userName: string | null = null;
    
    try {
      const pgUsers = await db
        .select({ userId: users.userId, name: users.name })
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);
      
      if (pgUsers && pgUsers.length > 0) {
        userId = pgUsers[0].userId;
        userName = pgUsers[0].name;
      }
    } catch (e) {
      console.error('PostgreSQL query error:', e);
    }

    // 如果 PostgreSQL 没有，从 Supabase 获取
    if (!userId) {
      const { data: supabaseUsers } = await supabase
        .from('users')
        .select('user_id, name')
        .eq('email', email.toLowerCase())
        .limit(1);
      
      if (supabaseUsers && supabaseUsers.length > 0) {
        userId = supabaseUsers[0].user_id;
        userName = supabaseUsers[0].name;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: `未找到邮箱为 ${email} 的用户` }, { status: 404 });
    }

    // 检查是否已有进行中的挑战记录
    const { data: existingReg } = await supabase
      .from('challenge_registrations')
      .select('id, status')
      .eq('user_id', userId)
      .in('status', ['active', 'approved', 'pending', 'level_passed'])
      .limit(1);

    let result;

    if (existingReg && existingReg.length > 0) {
      // 更新现有记录为已完成
      const updateData: Record<string, any> = {
        status: 'completed',
        completed_at: completedAt || new Date().toISOString(),
        total_duration: 30 * 24 * 60 * 60, // 假设30天
        completed_levels: JSON.stringify([1, 2, 3, 4]), // 所有4关
      };

      const { data, error } = await supabase
        .from('challenge_registrations')
        .update(updateData)
        .eq('id', existingReg[0].id)
        .select('id')
        .single();

      if (error) {
        return NextResponse.json({ error: `更新失败: ${error.message}` }, { status: 500 });
      }
      result = data;
    } else {
      // 创建新的完成记录
      const insertData = {
        user_id: userId,
        status: 'completed',
        current_level: 4,
        completed_levels: JSON.stringify([1, 2, 3, 4]),
        started_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30天前
        completed_at: completedAt || new Date().toISOString(),
        total_duration: 30 * 24 * 60 * 60,
      };

      const { data, error } = await supabase
        .from('challenge_registrations')
        .insert(insertData)
        .select('id')
        .single();

      if (error) {
        return NextResponse.json({ error: `添加失败: ${error.message}` }, { status: 500 });
      }
      result = data;
    }

    return NextResponse.json({
      success: true,
      message: `用户 ${userName || email} 已成功添加到名人堂`,
      data: {
        userId,
        userName,
        completedAt: completedAt || new Date().toISOString(),
        registrationId: result?.id,
      },
    });
  } catch (error) {
    console.error('Add to hall of fame error:', error);
    return NextResponse.json({ 
      error: '操作失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
