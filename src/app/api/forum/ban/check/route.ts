import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { forumBans } from '@/lib/schema';
import { eq, and, isNull, or, gt } from 'drizzle-orm';

// 检查用户是否被禁言
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ isBanned: false });
    }

    const { searchParams } = new URL(request.url);
    const planetId = searchParams.get('planetId');

    if (!planetId) {
      return NextResponse.json({ error: '星球ID为必填项' }, { status: 400 });
    }

    // 检查是否有有效的禁言记录
    const [ban] = await db
      .select()
      .from(forumBans)
      .where(and(
        eq(forumBans.planetId, parseInt(planetId)),
        eq(forumBans.userId, session.user.id),
        or(
          isNull(forumBans.expiresAt),
          gt(forumBans.expiresAt, new Date())
        )
      ))
      .limit(1);

    return NextResponse.json({ 
      isBanned: !!ban,
      ban: ban || null
    });
  } catch (error) {
    console.error('Check ban error:', error);
    return NextResponse.json({ isBanned: false });
  }
}
