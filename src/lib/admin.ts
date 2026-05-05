import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

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

  // 从 MySQL 查询用户角色
  try {
    const result = await db.query.users.findFirst({
      where: eq(users.email, session.user.email || '')
    });
    
    if (result && result.role === 'admin') {
      return { isAdmin: true, userId: result.userId };
    }
  } catch (e) {
    console.error('Check admin from MySQL error:', e);
  }

  return { isAdmin: false, userId: session.user.id };
}

/**
 * 设置用户为管理员
 */
export async function setAdminRole(targetUserId: string): Promise<boolean> {
  try {
    await db.update(users)
      .set({ role: 'admin' })
      .where(eq(users.userId, targetUserId));
    return true;
  } catch (e) {
    console.error('Set admin role error:', e);
    return false;
  }
}

/**
 * 获取当前用户ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id || null;
}

/**
 * 获取当前用户邮箱
 */
export async function getCurrentUserEmail(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.email || null;
}
