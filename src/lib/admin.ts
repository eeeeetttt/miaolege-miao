import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';

/**
 * 检查当前用户是否为管理员
 */
export async function isAdmin(): Promise<{ isAdmin: boolean; userId?: string }> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { isAdmin: false };
  }

  try {
    // 从 Supabase 获取用户角色
    const { data: userData, error } = await getSupabaseAdmin()
      .from('users')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      console.error('Supabase query error:', error);
      // 对于管理员邮箱，直接允许访问
      if (session.user.email === '497209390@qq.com') {
        return { isAdmin: true, userId: session.user.id };
      }
      return { isAdmin: false };
    }

    if (userData?.role === 'admin') {
      return { isAdmin: true, userId: session.user.id };
    }
    
    // 对于管理员邮箱，即使 Supabase 没有记录，也允许访问
    if (session.user.email === '497209390@qq.com') {
      return { isAdmin: true, userId: session.user.id };
    }
    
    return { isAdmin: false, userId: session.user.id };
  } catch (error) {
    console.error('Check admin error:', error);
    // 对于管理员邮箱，即使出错也允许访问
    if (session.user.email === '497209390@qq.com') {
      return { isAdmin: true, userId: session.user.id };
    }
    return { isAdmin: false };
  }
}

/**
 * 设置用户为管理员（仅限已存在的管理员调用）
 */
export async function setAdminRole(targetUserId: string): Promise<boolean> {
  try {
    const { error } = await getSupabaseAdmin()
      .from('users')
      .update({ role: 'admin' })
      .eq('user_id', targetUserId);
    
    if (error) {
      console.error('Set admin error:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Set admin error:', error);
    return false;
  }
}
