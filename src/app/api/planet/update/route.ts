import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { planets } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// 更新星球信息
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { planetId, name, description, rules, ticketPrice } = await request.json();

    if (!planetId) {
      return NextResponse.json({ error: '缺少星球ID' }, { status: 400 });
    }

    // 检查是否是星主
    const [planet] = await db
      .select()
      .from(planets)
      .where(eq(planets.id, planetId))
      .limit(1);

    if (!planet) {
      return NextResponse.json({ error: '星球不存在' }, { status: 404 });
    }

    if (planet.creatorId !== session.user.id) {
      return NextResponse.json({ error: '只有星主才能修改星球信息' }, { status: 403 });
    }

    // 更新星球信息
    await db
      .update(planets)
      .set({
        name: name?.trim() || planet.name,
        description: description?.trim() || null,
        rules: rules?.trim() || null,
        ticketPrice: ticketPrice !== undefined ? ticketPrice : planet.ticketPrice,
      })
      .where(eq(planets.id, planetId));

    return NextResponse.json({ success: true, message: '星球信息更新成功' });
  } catch (error) {
    console.error('Update planet error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
