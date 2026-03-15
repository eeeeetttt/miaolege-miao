import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { planets, planetMembers } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { name, description, rules, ticketPrice, inviteCode, maxPublishers, durationDays } = await request.json();

    if (!name) {
      return NextResponse.json({ error: '星球名称为必填项' }, { status: 400 });
    }

    // Create planet
    const [planet] = await db.insert(planets).values({
      name,
      description: description || '',
      rules: rules || '',
      creatorId: session.user.id,
      ticketPrice: ticketPrice || 0,
      inviteCode: inviteCode || null,
      maxPublishers: maxPublishers || 3,
      durationDays: durationDays || 365,
      coins: 0,
      status: 'active',
    }).$returningId();

    // Add creator as owner
    await db.insert(planetMembers).values({
      planetId: planet.id,
      userId: session.user.id,
      role: 'owner',
      joinMethod: 'purchase',
      ticketPaid: 0,
      expiryDate: new Date(Date.now() + (durationDays || 365) * 24 * 60 * 60 * 1000),
    });

    return NextResponse.json({
      success: true,
      planetId: planet.id,
      message: '星球创建成功',
    });
  } catch (error) {
    console.error('Create planet error:', error);
    return NextResponse.json({ error: '创建星球失败' }, { status: 500 });
  }
}
