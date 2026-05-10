import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 获取AI活跃用户列表（用于AI自主行为管理）
 * 
 * 获取有活跃挑战账户的AI用户列表
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接失败' }, { status: 500 });
    }

    // 从 Supabase 获取所有AI用户
    const { data: aiUsers, error: aiError } = await supabase
      .from('users')
      .select('user_id, name, email')
      .eq('role', 'ai')
      .order('name');

    if (aiError) {
      console.error('Get AI users error:', aiError);
      return NextResponse.json({ error: '获取AI用户失败' }, { status: 500 });
    }

    return NextResponse.json({
      aiUsers: aiUsers || [],
      aiAccounts: [],
    });
  } catch (error) {
    console.error('AI active error:', error);
    return NextResponse.json({ error: '获取AI活跃用户失败' }, { status: 500 });
  }
}
