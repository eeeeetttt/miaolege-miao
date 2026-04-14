import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { followRecords, planetMembers } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

// 开始跟单
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { planetId, signalId, copyVolume, copyRatio } = await request.json();

    if (!planetId || !signalId) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    // 检查用户是否是该星球成员
    const [member] = await db
      .select()
      .from(planetMembers)
      .where(and(
        eq(planetMembers.planetId, planetId),
        eq(planetMembers.userId, session.user.id)
      ))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: '您还不是该星球成员' }, { status: 403 });
    }

    // 检查是否已经跟单
    const [existingFollow] = await db
      .select()
      .from(followRecords)
      .where(and(
        eq(followRecords.planetId, planetId),
        eq(followRecords.userId, session.user.id),
        eq(followRecords.signalId, signalId)
      ))
      .limit(1);

    if (existingFollow) {
      // 如果已存在但已暂停，则恢复
      if (existingFollow.status === 'paused') {
        await db
          .update(followRecords)
          .set({ status: 'active', pausedAt: null })
          .where(eq(followRecords.id, existingFollow.id));
        
        return NextResponse.json({
          success: true,
          message: '已恢复跟单',
          followId: existingFollow.id,
        });
      }
      
      return NextResponse.json({ error: '您已经跟单了该信号' }, { status: 400 });
    }

    // 创建跟单记录
    const [follow] = await db.insert(followRecords).values({
      planetId,
      userId: session.user.id,
      signalId,
      copyVolume: copyVolume || null,
      copyRatio: copyRatio || '1.00',
      status: 'active',
    }).$returningId();

    return NextResponse.json({
      success: true,
      message: '开始跟单成功',
      followId: follow.id,
    });
  } catch (error) {
    console.error('Follow signal error:', error);
    return NextResponse.json({ error: '跟单失败' }, { status: 500 });
  }
}

// 查询跟单状态
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const planetId = searchParams.get('planetId');
    const signalId = searchParams.get('signalId');

    if (!planetId) {
      return NextResponse.json({ error: '星球ID为必填项' }, { status: 400 });
    }

    if (signalId) {
      // 查询特定信号的跟单状态
      const [follow] = await db
        .select()
        .from(followRecords)
        .where(and(
          eq(followRecords.planetId, parseInt(planetId)),
          eq(followRecords.userId, session.user.id),
          eq(followRecords.signalId, parseInt(signalId))
        ))
        .limit(1);

      return NextResponse.json({ follow: follow || null });
    } else {
      // 查询用户在该星球的所有跟单
      const follows = await db
        .select()
        .from(followRecords)
        .where(and(
          eq(followRecords.planetId, parseInt(planetId)),
          eq(followRecords.userId, session.user.id)
        ));

      return NextResponse.json({ follows });
    }
  } catch (error) {
    console.error('Get follow status error:', error);
    return NextResponse.json({ error: '获取跟单状态失败' }, { status: 500 });
  }
}
