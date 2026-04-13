import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';

/**
 * 检查当前用户是否为管理员
 */
export async function isAdmin(): Promise<{ isAdmin: boolean; userId?: string }> {
  const session = await getServerSession(authOptions);
  
  console.log('[isAdmin] Session:', JSON.stringify({
    hasSession: !!session,
    hasUser: !!session?.user,
    userId: session?.user?.id,
    role: (session?.user as any)?.role,
  }));

  if (!session?.user?.id) {
    console.log('[isAdmin] No session user ID');
    return { isAdmin: false };
  }

  try {
    // 从 MySQL 的 users 表检查管理员权限
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.userId, session.user.id))
      .limit(1);

    console.log('[isAdmin] MySQL user:', JSON.stringify(user));

    if (!user) {
      // 如果 MySQL 用户表没有记录，检查 NextAuth session 中的 role
      if ((session.user as any).role === 'admin') {
        console.log('[isAdmin] User found in session as admin');
        return { isAdmin: true, userId: session.user.id };
      }
      console.log('[isAdmin] User not found in MySQL and not admin in session');
      return { isAdmin: false };
    }

    const isAdminUser = user.role === 'admin';
    console.log('[isAdmin] Is admin:', isAdminUser);

    if (isAdminUser) {
      return { isAdmin: true, userId: session.user.id };
    }
    
    return { isAdmin: false };
  } catch (error) {
    console.error('[isAdmin] Error:', error);
    return { isAdmin: false };
  }
}

/**
 * 设置用户为管理员（仅限已存在的管理员调用）
 */
export async function setAdminRole(targetUserId: string): Promise<boolean> {
  try {
    await db
      .update(users)
      .set({ role: 'admin' })
      .where(eq(users.userId, targetUserId));
    
    return true;
  } catch (error) {
    console.error('Set admin role error:', error);
    return false;
  }
}
