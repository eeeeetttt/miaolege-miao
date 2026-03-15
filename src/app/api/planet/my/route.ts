import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { planets, planetMembers } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // Get user's planets
    const myPlanets = await db
      .select({
        id: planets.id,
        name: planets.name,
        description: planets.description,
        ticketPrice: planets.ticketPrice,
        status: planets.status,
        createdAt: planets.createdAt,
        role: planetMembers.role,
        joinedAt: planetMembers.joinedAt,
        expiryDate: planetMembers.expiryDate,
      })
      .from(planetMembers)
      .innerJoin(planets, eq(planetMembers.planetId, planets.id))
      .where(eq(planetMembers.userId, session.user.id));

    return NextResponse.json({
      planets: myPlanets,
    });
  } catch (error) {
    console.error('Get my planets error:', error);
    return NextResponse.json({ error: '获取我的星球失败' }, { status: 500 });
  }
}
