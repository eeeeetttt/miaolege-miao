import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * 检查当前用户是否为管理员
 */
export async function isAdmin(): Promise<{ isAdmin: boolean; userId?: string }> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { isAdmin: false };
  }

  // 管理员邮箱直接允许访问
  if (session.user.email === '497209390@qq.com') {
    return { isAdmin: true, userId: session.user.id };
  }

  // 从 Supabase 查询用户角色
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.COZE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('email', session.user.email)
        .single();
      
      return { isAdmin: data?.role === 'admin', userId: session.user.id };
    } catch (e) {
      console.error('Check admin from Supabase error:', e);
    }
  }

  return { isAdmin: false, userId: session.user.id };
}

/**
 * 设置用户为管理员
 */
export async function setAdminRole(targetUserId: string): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.COZE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return false;
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('user_id', targetUserId);
    
    return !error;
  } catch (e) {
    console.error('Set admin role error:', e);
    return false;
  }
}
