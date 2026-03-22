import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { forumPosts, users, planetMembers, forumBans, planets } from '@/lib/schema';
import { eq, and, desc, isNull, or, gt } from 'drizzle-orm';

// 获取帖子列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    const { searchParams } = new URL(request.url);
    const planetId = searchParams.get('planetId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    if (!planetId) {
      return NextResponse.json({ error: '星球ID为必填项' }, { status: 400 });
    }

    // 检查星球是否开启论坛
    const [planet] = await db
      .select()
      .from(planets)
      .where(eq(planets.id, parseInt(planetId)))
      .limit(1);

    if (!planet || !planet.forumEnabled) {
      return NextResponse.json({ error: '该星球未开启论坛功能' }, { status: 400 });
    }

    // 检查用户是否是星球成员
    let userRole = null;
    if (session?.user?.id) {
      const [member] = await db
        .select()
        .from(planetMembers)
        .where(and(
          eq(planetMembers.planetId, parseInt(planetId)),
          eq(planetMembers.userId, session.user.id)
        ))
        .limit(1);
      userRole = member?.role || null;
    }

    // 获取帖子列表
    const posts = await db
      .select({
        id: forumPosts.id,
        title: forumPosts.title,
        content: forumPosts.content,
        likeCount: forumPosts.likeCount,
        commentCount: forumPosts.commentCount,
        isPinned: forumPosts.isPinned,
        createdAt: forumPosts.createdAt,
        userId: forumPosts.userId,
        userName: users.name,
        userAvatar: users.avatar,
      })
      .from(forumPosts)
      .innerJoin(users, eq(forumPosts.userId, users.userId))
      .where(and(
        eq(forumPosts.planetId, parseInt(planetId)),
        eq(forumPosts.status, 'active')
      ))
      .orderBy(desc(forumPosts.isPinned), desc(forumPosts.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    // 获取总数
    const [countResult] = await db
      .select({ count: forumPosts.id })
      .from(forumPosts)
      .where(and(
        eq(forumPosts.planetId, parseInt(planetId)),
        eq(forumPosts.status, 'active')
      ));

    return NextResponse.json({
      posts,
      userRole,
      total: countResult?.count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Get forum posts error:', error);
    return NextResponse.json({ error: '获取帖子列表失败' }, { status: 500 });
  }
}

// 创建帖子
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { planetId, title, content } = await request.json();

    if (!planetId || !title || !content) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 检查星球是否开启论坛
    const [planet] = await db
      .select()
      .from(planets)
      .where(eq(planets.id, planetId))
      .limit(1);

    if (!planet || !planet.forumEnabled) {
      return NextResponse.json({ error: '该星球未开启论坛功能' }, { status: 400 });
    }

    // 检查用户是否是星球成员
    const [member] = await db
      .select()
      .from(planetMembers)
      .where(and(
        eq(planetMembers.planetId, planetId),
        eq(planetMembers.userId, session.user.id)
      ))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: '您不是该星球成员' }, { status: 403 });
    }

    // 检查是否被禁言
    const [ban] = await db
      .select()
      .from(forumBans)
      .where(and(
        eq(forumBans.planetId, planetId),
        eq(forumBans.userId, session.user.id),
        or(
          isNull(forumBans.expiresAt),
          gt(forumBans.expiresAt, new Date())
        )
      ))
      .limit(1);

    if (ban) {
      return NextResponse.json({ error: '您已被禁言，无法发帖' }, { status: 403 });
    }

    // 创建帖子
    const [post] = await db
      .insert(forumPosts)
      .values({
        planetId,
        userId: session.user.id,
        title,
        content,
      })
      .$returningId();

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error('Create forum post error:', error);
    return NextResponse.json({ error: '创建帖子失败' }, { status: 500 });
  }
}
