import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { userItems, items, titles, userTitles, userAccounts, userArmy, weapons, userWeapons, lands, bankLoans, banks, exchanges } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// 获取背包
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 获取背包中的道具
    const backpackItems = await db
      .select({
        id: userItems.id,
        itemId: userItems.itemId,
        quantity: userItems.quantity,
        obtainedAt: userItems.obtainedAt,
        expiresAt: userItems.expiresAt,
      })
      .from(userItems)
      .where(eq(userItems.userId, userId));

    // 获取道具详情
    const itemIds = backpackItems.map(i => i.itemId);
    const itemDetails = await db
      .select()
      .from(items);

    const itemsMap = new Map(itemDetails.map(i => [i.itemId, i]));

    const backpackWithDetails = backpackItems
      .filter(i => itemsMap.has(i.itemId))
      .map(i => ({
        ...i,
        item: itemsMap.get(i.itemId),
      }));

    // 获取用户称号
    const userTitlesList = await db
      .select({
        titleId: userTitles.titleId,
        obtainedAt: userTitles.obtainedAt,
        isActive: userTitles.isActive,
      })
      .from(userTitles)
      .where(eq(userTitles.userId, userId));

    const titleIds = userTitlesList.map(t => t.titleId);
    const titleDetails = await db
      .select()
      .from(titles);

    const titlesMap = new Map(titleDetails.map(t => [t.titleId, t]));

    const titlesWithDetails = userTitlesList.map(t => ({
      ...t,
      title: titlesMap.get(t.titleId),
    }));

    return NextResponse.json({
      success: true,
      backpack: backpackWithDetails,
      titles: titlesWithDetails,
    });
  } catch (error) {
    console.error('获取背包失败:', error);
    return NextResponse.json(
      { success: false, message: '获取背包失败' },
      { status: 500 }
    );
  }
}
