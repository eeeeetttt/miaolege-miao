import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { forumPosts, forumComments, forumBans, planetMembers } from '@/lib/schema';
import { eq, and, isNull, or, gt } from 'drizzle-orm';

// 创建评论
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { postId, content, parentId } = await request.json();

    if (!postId || !content) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 获取帖子
    const [post] = await db
      .select()
      .from(forumPosts)
      .where(eq(forumPosts.id, postId))
      .limit(1);

    if (!post || post.status !== 'active') {
      return NextResponse.json({ error: '帖子不存在' }, { status: 404 });
    }

    // 检查用户是否是星球成员
    const [member] = await db
      .select()
      .from(planetMembers)
      .where(and(
        eq(planetMembers.planetId, post.planetId),
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
        eq(forumBans.planetId, post.planetId),
        eq(forumBans.userId, session.user.id),
        or(
          isNull(forumBans.expiresAt),
          gt(forumBans.expiresAt, new Date())
        )
      ))
      .limit(1);

    if (ban) {
      return NextResponse.json({ error: '您已被禁言，无法评论' }, { status: 403 });
    }

    // 如果是回复评论，检查父评论是否存在
    if (parentId) {
      const [parentComment] = await db
        .select()
        .from(forumComments)
        .where(eq(forumComments.id, parentId))
        .limit(1);

      if (!parentComment || parentComment.postId !== postId) {
        return NextResponse.json({ error: '父评论不存在' }, { status: 400 });
      }
    }

    // 创建评论
    const [comment] = await db
      .insert(forumComments)
      .values({
        postId,
        userId: session.user.id,
        content,
        parentId: parentId || null,
      })
      .$returningId();

    // 更新帖子评论数
    await db
      .update(forumPosts)
      .set({ 
        commentCount: (post.commentCount || 0) + 1 
      })
      .where(eq(forumPosts.id, postId));

    return NextResponse.json({ success: true, comment });
  } catch (error) {
    console.error('Create forum comment error:', error);
    return NextResponse.json({ error: '创建评论失败' }, { status: 500 });
  }
}

// 删除评论
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json({ error: '缺少评论ID' }, { status: 400 });
    }

    // 获取评论
    const [comment] = await db
      .select()
      .from(forumComments)
      .where(eq(forumComments.id, parseInt(commentId)))
      .limit(1);

    if (!comment) {
      return NextResponse.json({ error: '评论不存在' }, { status: 404 });
    }

    // 获取帖子
    const [post] = await db
      .select()
      .from(forumPosts)
      .where(eq(forumPosts.id, comment.postId))
      .limit(1);

    if (!post) {
      return NextResponse.json({ error: '帖子不存在' }, { status: 404 });
    }

    // 检查权限
    const [member] = await db
      .select()
      .from(planetMembers)
      .where(and(
        eq(planetMembers.planetId, post.planetId),
        eq(planetMembers.userId, session.user.id)
      ))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    if (comment.userId !== session.user.id && member.role !== 'owner') {
      return NextResponse.json({ error: '无权限删除此评论' }, { status: 403 });
    }

    // 软删除评论
    await db
      .update(forumComments)
      .set({ status: 'deleted' })
      .where(eq(forumComments.id, parseInt(commentId)));

    // 更新帖子评论数
    await db
      .update(forumPosts)
      .set({ 
        commentCount: Math.max(0, (post.commentCount || 0) - 1) 
      })
      .where(eq(forumPosts.id, post.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete forum comment error:', error);
    return NextResponse.json({ error: '删除评论失败' }, { status: 500 });
  }
}
