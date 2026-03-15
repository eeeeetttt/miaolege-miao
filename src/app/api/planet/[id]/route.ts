import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { planets, planetMembers, signals } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    const planetId = parseInt(id);

    // Get planet info
    const [planet] = await db
      .select()
      .from(planets)
      .where(eq(planets.id, planetId))
      .limit(1);

    if (!planet) {
      return NextResponse.json({ error: '星球不存在' }, { status: 404 });
    }

    // Get members
    const members = await db
      .select({
        userId: planetMembers.userId,
        role: planetMembers.role,
        joinedAt: planetMembers.joinedAt,
      })
      .from(planetMembers)
      .where(eq(planetMembers.planetId, planetId));

    // Get recent signals
    const recentSignals = await db
      .select()
      .from(signals)
      .where(eq(signals.planetId, planetId))
      .orderBy(desc(signals.createdAt))
      .limit(10);

    // Check user's role if logged in
    let userRole = null;
    if (session?.user?.id) {
      const [member] = await db
        .select({ role: planetMembers.role })
        .from(planetMembers)
        .where(and(
          eq(planetMembers.planetId, planetId),
          eq(planetMembers.userId, session.user.id)
        ))
        .limit(1);
      
      userRole = member?.role || null;
    }

    return NextResponse.json({
      planet,
      members,
      recentSignals,
      userRole,
      memberCount: members.length,
    });
  } catch (error) {
    console.error('Get planet detail error:', error);
    return NextResponse.json({ error: '获取星球详情失败' }, { status: 500 });
  }
}
