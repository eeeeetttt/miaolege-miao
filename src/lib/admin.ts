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

  try {
    const userData = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.userId, session.user.id))
      .limit(1);

    if (userData.length > 0 && userData[0].role === 'admin') {
      return { isAdmin: true, userId: session.user.id };
    }
    
    return { isAdmin: false, userId: session.user.id };
  } catch (error) {
    console.error('Check admin error:', error);
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
    console.error('Set admin error:', error);
    return false;
  }
}
