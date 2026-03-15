import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { planets, planetMembers } from '@/lib/schema';
import { eq, count } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Get all planets with member count
    const planetList = await db
      .select({
        id: planets.id,
        name: planets.name,
        description: planets.description,
        creatorId: planets.creatorId,
        ticketPrice: planets.ticketPrice,
        status: planets.status,
        createdAt: planets.createdAt,
        maxPublishers: planets.maxPublishers,
      })
      .from(planets);

    // Get member count for each planet
    const planetsWithStats = await Promise.all(
      planetList.map(async (planet) => {
        const [memberCountResult] = await db
          .select({ count: count() })
          .from(planetMembers)
          .where(eq(planetMembers.planetId, planet.id));

        const [publisherCountResult] = await db
          .select({ count: count() })
          .from(planetMembers)
          .where(eq(planetMembers.planetId, planet.id));

        return {
          ...planet,
          memberCount: memberCountResult?.count || 0,
          publisherCount: publisherCountResult?.count || 0,
        };
      })
    );

    return NextResponse.json({
      planets: planetsWithStats,
    });
  } catch (error) {
    console.error('Get planet list error:', error);
    return NextResponse.json({ error: '获取星球列表失败' }, { status: 500 });
  }
}
