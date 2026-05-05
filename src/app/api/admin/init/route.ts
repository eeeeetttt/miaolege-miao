import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

// 获取 Supabase 客户端
const getSupabase = () => {
  const supabaseUrl = process.env.COZE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing');
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

/**
 * 初始化管理员
 * 通过管理员密码验证后将当前用户设置为管理员
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { password } = body;

    // 管理员密码（应从环境变量获取）
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';

    if (password !== adminPassword) {
      return NextResponse.json({ error: '管理员密码错误' }, { status: 403 });
    }

    // 使用 Supabase 更新用户角色
    const supabase = getSupabase();
    const { error } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: '已成功设置为管理员' 
    });
  } catch (error) {
    console.error('Init admin error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}

/**
 * 检查当前用户是否为管理员
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ isAdmin: false });
    }

    // 使用 Supabase 查询用户角色
    const supabase = getSupabase();
    const { data: userData, error } = await supabase
      .from('users')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (error || !userData) {
      return NextResponse.json({ isAdmin: false });
    }

    const isAdmin = userData.role === 'admin';
    
    return NextResponse.json({ isAdmin });
  } catch (error) {
    console.error('Check admin error:', error);
    return NextResponse.json({ isAdmin: false });
  }
}
