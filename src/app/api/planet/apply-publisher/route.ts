import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { planetMembers, planetApplications } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { planetId } = await request.json();

    if (!planetId) {
      return NextResponse.json({ error: '星球ID为必填项' }, { status: 400 });
    }

    // Check if user is a member
    const [member] = await db
      .select()
      .from(planetMembers)
      .where(and(
        eq(planetMembers.planetId, planetId),
        eq(planetMembers.userId, session.user.id)
      ))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: '您还不是该星球成员' }, { status: 400 });
    }

    // Check if already a publisher
    if (member.role === 'publisher' || member.role === 'owner') {
      return NextResponse.json({ error: '您已经是发布者' }, { status: 400 });
    }

    // Check if already applied
    const [existingApplication] = await db
      .select()
      .from(planetApplications)
      .where(and(
        eq(planetApplications.planetId, planetId),
        eq(planetApplications.userId, session.user.id)
      ))
      .limit(1);

    if (existingApplication && existingApplication.status === 'pending') {
      return NextResponse.json({ error: '您已提交申请，请等待审核' }, { status: 400 });
    }

    // Create or update application
    if (existingApplication) {
      await db
        .update(planetApplications)
        .set({ status: 'pending', appliedAt: new Date() })
        .where(eq(planetApplications.id, existingApplication.id));
    } else {
      await db.insert(planetApplications).values({
        planetId,
        userId: session.user.id,
        status: 'pending',
      });
    }

    return NextResponse.json({
      success: true,
      message: '申请已提交，请等待星主审核',
    });
  } catch (error) {
    console.error('Apply publisher error:', error);
    return NextResponse.json({ error: '申请失败' }, { status: 500 });
  }
}
