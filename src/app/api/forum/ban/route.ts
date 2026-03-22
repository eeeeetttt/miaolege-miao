import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { forumBans, planetMembers, users } from '@/lib/schema';
import { eq, and, isNull, or, gt } from 'drizzle-orm';

// 获取禁言列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const planetId = searchParams.get('planetId');

    if (!planetId) {
      return NextResponse.json({ error: '星球ID为必填项' }, { status: 400 });
    }

    // 检查是否是星球管理员
    const [member] = await db
      .select()
      .from(planetMembers)
      .where(and(
        eq(planetMembers.planetId, parseInt(planetId)),
        eq(planetMembers.userId, session.user.id)
      ))
      .limit(1);

    if (!member || member.role !== 'owner') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    // 获取禁言列表
    const bans = await db
      .select({
        id: forumBans.id,
        userId: forumBans.userId,
        userName: users.name,
        userEmail: users.email,
        reason: forumBans.reason,
        expiresAt: forumBans.expiresAt,
        createdAt: forumBans.createdAt,
        bannedBy: forumBans.bannedBy,
      })
      .from(forumBans)
      .innerJoin(users, eq(forumBans.userId, users.userId))
      .where(eq(forumBans.planetId, parseInt(planetId)));

    return NextResponse.json({ bans });
  } catch (error) {
    console.error('Get bans error:', error);
    return NextResponse.json({ error: '获取禁言列表失败' }, { status: 500 });
  }
}

// 禁言用户
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { planetId, userId, reason, durationDays } = await request.json();

    if (!planetId || !userId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 检查是否是星球管理员
    const [member] = await db
      .select()
      .from(planetMembers)
      .where(and(
        eq(planetMembers.planetId, planetId),
        eq(planetMembers.userId, session.user.id)
      ))
      .limit(1);

    if (!member || member.role !== 'owner') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    // 不能禁言自己和星主
    const [targetMember] = await db
      .select()
      .from(planetMembers)
      .where(and(
        eq(planetMembers.planetId, planetId),
        eq(planetMembers.userId, userId)
      ))
      .limit(1);

    if (!targetMember) {
      return NextResponse.json({ error: '该用户不是星球成员' }, { status: 400 });
    }

    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: '不能禁言星主' }, { status: 400 });
    }

    // 计算过期时间
    let expiresAt: Date | null = null;
    if (durationDays && durationDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);
    }

    // 检查是否已被禁言
    const [existingBan] = await db
      .select()
      .from(forumBans)
      .where(and(
        eq(forumBans.planetId, planetId),
        eq(forumBans.userId, userId)
      ))
      .limit(1);

    if (existingBan) {
      // 更新禁言
      await db
        .update(forumBans)
        .set({
          reason: reason || null,
          expiresAt,
          bannedBy: session.user.id,
          createdAt: new Date(),
        })
        .where(eq(forumBans.id, existingBan.id));
    } else {
      // 创建禁言
      await db.insert(forumBans).values({
        planetId,
        userId,
        reason: reason || null,
        expiresAt,
        bannedBy: session.user.id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ban user error:', error);
    return NextResponse.json({ error: '禁言失败' }, { status: 500 });
  }
}

// 解除禁言
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const planetId = searchParams.get('planetId');
    const userId = searchParams.get('userId');

    if (!planetId || !userId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 检查是否是星球管理员
    const [member] = await db
      .select()
      .from(planetMembers)
      .where(and(
        eq(planetMembers.planetId, parseInt(planetId)),
        eq(planetMembers.userId, session.user.id)
      ))
      .limit(1);

    if (!member || member.role !== 'owner') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    // 删除禁言记录
    await db
      .delete(forumBans)
      .where(and(
        eq(forumBans.planetId, parseInt(planetId)),
        eq(forumBans.userId, userId)
      ));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unban user error:', error);
    return NextResponse.json({ error: '解除禁言失败' }, { status: 500 });
  }
}
