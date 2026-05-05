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

  try {
    // 动态导入避免构建时问题
    const { getSupabaseAdmin } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseAdmin();
    
    const { data: userData, error } = await supabase
      .from('users')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (error || !userData) {
      return { isAdmin: false, userId: session.user.id };
    }

    return { isAdmin: userData.role === 'admin', userId: session.user.id };
  } catch (error) {
    console.error('Check admin error:', error);
    return { isAdmin: false, userId: session.user.id };
  }
}

/**
 * 设置用户为管理员
 */
export async function setAdminRole(targetUserId: string): Promise<boolean> {
  try {
    const { getSupabaseAdmin } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseAdmin();
    
    const { error } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('user_id', targetUserId);
    
    return !error;
  } catch (error) {
    console.error('Set admin error:', error);
    return false;
  }
}
