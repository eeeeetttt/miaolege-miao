import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { planets, planetMembers } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

// 设置星主是否作为发布者
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { planetId, ownerAsPublisher } = await request.json();

    if (typeof planetId !== 'number' || typeof ownerAsPublisher !== 'boolean') {
      return NextResponse.json({ error: '参数无效' }, { status: 400 });
    }

    // 验证用户是否是星主
    const [planet] = await db
      .select()
      .from(planets)
      .where(eq(planets.id, planetId))
      .limit(1);

    if (!planet) {
      return NextResponse.json({ error: '星球不存在' }, { status: 404 });
    }

    if (planet.creatorId !== session.user.id) {
      return NextResponse.json({ error: '只有星主可以设置' }, { status: 403 });
    }

    // 更新星球设置
    await db
      .update(planets)
      .set({ ownerAsPublisher })
      .where(eq(planets.id, planetId));

    // 如果设置为发布者，需要确保星主在成员表中有记录
    if (ownerAsPublisher) {
      // 检查星主是否已在成员表中
      const [existingMember] = await db
        .select()
        .from(planetMembers)
        .where(and(
          eq(planetMembers.planetId, planetId),
          eq(planetMembers.userId, session.user.id)
        ))
        .limit(1);

      if (!existingMember) {
        // 添加星主到成员表
        await db.insert(planetMembers).values({
          planetId,
          userId: session.user.id,
          role: 'owner',
          joinMethod: 'purchase',
          ticketPaid: 0,
        });
      } else if (existingMember.role === 'owner') {
        // 星主角色保持不变
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: ownerAsPublisher ? '已开启发布者权限' : '已关闭发布者权限' 
    });
  } catch (error) {
    console.error('Set owner as publisher error:', error);
    return NextResponse.json({ error: '设置失败，请稍后重试' }, { status: 500 });
  }
}
