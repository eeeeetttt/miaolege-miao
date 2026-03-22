import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { forumLikes, forumPosts, forumComments, planetMembers } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

// 点赞/取消点赞
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { targetType, targetId } = await request.json();

    if (!targetType || !targetId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    if (!['post', 'comment'].includes(targetType)) {
      return NextResponse.json({ error: '无效的目标类型' }, { status: 400 });
    }

    // 检查目标是否存在
    let planetId: number;
    if (targetType === 'post') {
      const [post] = await db
        .select()
        .from(forumPosts)
        .where(eq(forumPosts.id, targetId))
        .limit(1);
      if (!post) {
        return NextResponse.json({ error: '帖子不存在' }, { status: 404 });
      }
      planetId = post.planetId;
    } else {
      const [comment] = await db
        .select()
        .from(forumComments)
        .where(eq(forumComments.id, targetId))
        .limit(1);
      if (!comment) {
        return NextResponse.json({ error: '评论不存在' }, { status: 404 });
      }
      
      // 获取帖子以确定星球ID
      const [post] = await db
        .select()
        .from(forumPosts)
        .where(eq(forumPosts.id, comment.postId))
        .limit(1);
      planetId = post.planetId;
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

    // 检查是否已点赞
    const [existingLike] = await db
      .select()
      .from(forumLikes)
      .where(and(
        eq(forumLikes.userId, session.user.id),
        eq(forumLikes.targetType, targetType),
        eq(forumLikes.targetId, targetId)
      ))
      .limit(1);

    if (existingLike) {
      // 取消点赞
      await db
        .delete(forumLikes)
        .where(eq(forumLikes.id, existingLike.id));

      // 更新点赞数
      if (targetType === 'post') {
        const [post] = await db
          .select({ likeCount: forumPosts.likeCount })
          .from(forumPosts)
          .where(eq(forumPosts.id, targetId))
          .limit(1);
        await db
          .update(forumPosts)
          .set({ likeCount: Math.max(0, (post?.likeCount || 1) - 1) })
          .where(eq(forumPosts.id, targetId));
      } else {
        const [comment] = await db
          .select({ likeCount: forumComments.likeCount })
          .from(forumComments)
          .where(eq(forumComments.id, targetId))
          .limit(1);
        await db
          .update(forumComments)
          .set({ likeCount: Math.max(0, (comment?.likeCount || 1) - 1) })
          .where(eq(forumComments.id, targetId));
      }

      return NextResponse.json({ success: true, liked: false });
    } else {
      // 点赞
      await db.insert(forumLikes).values({
        userId: session.user.id,
        targetType,
        targetId,
      });

      // 更新点赞数
      if (targetType === 'post') {
        const [post] = await db
          .select({ likeCount: forumPosts.likeCount })
          .from(forumPosts)
          .where(eq(forumPosts.id, targetId))
          .limit(1);
        await db
          .update(forumPosts)
          .set({ likeCount: (post?.likeCount || 0) + 1 })
          .where(eq(forumPosts.id, targetId));
      } else {
        const [comment] = await db
          .select({ likeCount: forumComments.likeCount })
          .from(forumComments)
          .where(eq(forumComments.id, targetId))
          .limit(1);
        await db
          .update(forumComments)
          .set({ likeCount: (comment?.likeCount || 0) + 1 })
          .where(eq(forumComments.id, targetId));
      }

      return NextResponse.json({ success: true, liked: true });
    }
  } catch (error) {
    console.error('Toggle like error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
