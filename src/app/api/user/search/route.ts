import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq, like, or } from 'drizzle-orm';

// 搜索用户
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    if (!keyword || keyword.trim().length < 1) {
      return NextResponse.json({ error: '请输入搜索关键词' }, { status: 400 });
    }

    const offset = (page - 1) * pageSize;
    const searchPattern = `%${keyword.trim()}%`;

    // 搜索用户（按昵称、邮箱、用户ID搜索）
    const searchResults = await db
      .select({
        userId: users.userId,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      })
      .from(users)
      .where(
        or(
          like(users.name, searchPattern),
          like(users.email, searchPattern),
          like(users.userId, searchPattern)
        )
      )
      .limit(pageSize)
      .offset(offset);

    // 过滤掉自己
    const filteredResults = searchResults.filter(u => u.userId !== session.user.id);

    return NextResponse.json({
      success: true,
      data: filteredResults.map(u => ({
        userId: u.userId,
        name: u.name || '未设置昵称',
        email: u.email || null,
        avatar: u.avatar || null,
      })),
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Search users error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '搜索失败' 
    }, { status: 500 });
  }
}
