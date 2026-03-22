import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { forumPosts, forumComments, users, planetMembers, forumBans, forumLikes, planets } from '@/lib/schema';
import { eq, and, desc, isNull, or, gt } from 'drizzle-orm';

// 获取帖子详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    // 获取帖子
    const [post] = await db
      .select({
        id: forumPosts.id,
        planetId: forumPosts.planetId,
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
      .where(eq(forumPosts.id, parseInt(id)))
      .limit(1);

    if (!post) {
      return NextResponse.json({ error: '帖子不存在' }, { status: 404 });
    }

    // 检查星球是否开启论坛
    const [planet] = await db
      .select()
      .from(planets)
      .where(eq(planets.id, post.planetId))
      .limit(1);

    if (!planet || !planet.forumEnabled) {
      return NextResponse.json({ error: '该星球未开启论坛功能' }, { status: 400 });
    }

    // 检查用户是否是星球成员
    let userRole = null;
    let isLiked = false;
    if (session?.user?.id) {
      const [member] = await db
        .select()
        .from(planetMembers)
        .where(and(
          eq(planetMembers.planetId, post.planetId),
          eq(planetMembers.userId, session.user.id)
        ))
        .limit(1);
      userRole = member?.role || null;

      // 检查是否已点赞
      const [like] = await db
        .select()
        .from(forumLikes)
        .where(and(
          eq(forumLikes.userId, session.user.id),
          eq(forumLikes.targetType, 'post'),
          eq(forumLikes.targetId, parseInt(id))
        ))
        .limit(1);
      isLiked = !!like;
    }

    // 获取评论
    const comments = await db
      .select({
        id: forumComments.id,
        content: forumComments.content,
        likeCount: forumComments.likeCount,
        parentId: forumComments.parentId,
        createdAt: forumComments.createdAt,
        userId: forumComments.userId,
        userName: users.name,
        userAvatar: users.avatar,
      })
      .from(forumComments)
      .innerJoin(users, eq(forumComments.userId, users.userId))
      .where(and(
        eq(forumComments.postId, parseInt(id)),
        eq(forumComments.status, 'active')
      ))
      .orderBy(desc(forumComments.createdAt));

    // 获取评论的点赞状态
    let likedComments: number[] = [];
    if (session?.user?.id && comments.length > 0) {
      const commentIds = comments.map(c => c.id);
      const likes = await db
        .select({ targetId: forumLikes.targetId })
        .from(forumLikes)
        .where(and(
          eq(forumLikes.userId, session.user.id),
          eq(forumLikes.targetType, 'comment')
        ));
      likedComments = likes.map(l => l.targetId);
    }

    // 组织评论结构（楼中楼）
    const commentsMap = new Map();
    const rootComments: any[] = [];

    comments.forEach(comment => {
      commentsMap.set(comment.id, {
        ...comment,
        isLiked: likedComments.includes(comment.id),
        replies: [],
      });
    });

    comments.forEach(comment => {
      const node = commentsMap.get(comment.id);
      if (comment.parentId && commentsMap.has(comment.parentId)) {
        commentsMap.get(comment.parentId).replies.push(node);
      } else {
        rootComments.push(node);
      }
    });

    return NextResponse.json({
      post: {
        ...post,
        isLiked,
      },
      comments: rootComments,
      userRole,
    });
  } catch (error) {
    console.error('Get forum post error:', error);
    return NextResponse.json({ error: '获取帖子详情失败' }, { status: 500 });
  }
}

// 删除帖子
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;

    // 获取帖子
    const [post] = await db
      .select()
      .from(forumPosts)
      .where(eq(forumPosts.id, parseInt(id)))
      .limit(1);

    if (!post) {
      return NextResponse.json({ error: '帖子不存在' }, { status: 404 });
    }

    // 检查权限：帖子作者或星球管理员可以删除
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

    if (post.userId !== session.user.id && member.role !== 'owner') {
      return NextResponse.json({ error: '无权限删除此帖子' }, { status: 403 });
    }

    // 软删除帖子
    await db
      .update(forumPosts)
      .set({ status: 'deleted' })
      .where(eq(forumPosts.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete forum post error:', error);
    return NextResponse.json({ error: '删除帖子失败' }, { status: 500 });
  }
}
