import { NextResponse } from 'next/server';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.COZE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || '';

  // 检查环境变量
  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    COZE_SUPABASE_URL: !!process.env.COZE_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    COZE_SUPABASE_SERVICE_ROLE_KEY: !!process.env.COZE_SUPABASE_SERVICE_ROLE_KEY,
    supabaseUrl,
    supabaseKeyPrefix: supabaseKey ? supabaseKey.substring(0, 20) + '...' : '',
  };

  // 尝试查询用户
  let userCheck = { success: false, error: 'Supabase not configured' };

  if (supabaseUrl && supabaseKey) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase
        .from('users')
        .select('user_id, email, name, role')
        .eq('email', '497209390@qq.com')
        .single();
      
      if (error) {
        userCheck = { success: false, error: error.message };
      } else {
        userCheck = { success: true, user: data };
      }
    } catch (e: any) {
      userCheck = { success: false, error: e.message };
    }
  }

  return NextResponse.json({
    envCheck,
    userCheck,
  });
}
