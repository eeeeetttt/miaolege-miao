import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, userAccounts, userItems } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const allItems = await db
      .select()
      .from(items)
      .orderBy(items.sortOrder);

    return NextResponse.json({
      items: allItems.map(item => ({
        ...item,
        priceGold: Number(item.priceGold || 0),
        priceSilver: Number(item.priceSilver || 0),
      })),
    });
  } catch (error) {
    console.error('Get items error:', error);
    return NextResponse.json({ error: '获取道具列表失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { itemId, quantity = 1 } = body;

    if (!itemId) {
      return NextResponse.json({ error: '请选择要购买的道具' }, { status: 400 });
    }

    // 获取道具信息
    const item = await db
      .select()
      .from(items)
      .where(eq(items.itemId, itemId))
      .limit(1);

    if (!item || item.length === 0) {
      return NextResponse.json({ error: '道具不存在' }, { status: 404 });
    }

    const itemInfo = item[0];
    const priceGold = Number(itemInfo.priceGold || 0);
    const priceSilver = Number(itemInfo.priceSilver || 0);

    // 获取用户信息
    const user = await db
      .select()
      .from(userAccounts)
      .where(eq(userAccounts.email, session.user.email))
      .limit(1);

    if (!user || user.length === 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const userInfo = user[0];
    const userGoldBalance = Number(userInfo.goldBalance || 0);
    const userCoinBalance = Number(userInfo.coinBalance || 0);

    // 检查金币余额
    if (priceGold > 0 && userGoldBalance < priceGold * quantity) {
      return NextResponse.json({ 
        error: `金币不足，需要 ${(priceGold * quantity).toLocaleString()} 金币`,
        errorCode: 'INSUFFICIENT_GOLD'
      }, { status: 400 });
    }

    // 检查银两余额
    if (priceSilver > 0 && userCoinBalance < priceSilver * quantity) {
      return NextResponse.json({ 
        error: `银两不足，需要 ${(priceSilver * quantity).toLocaleString()} 两`,
        errorCode: 'INSUFFICIENT_COIN'
      }, { status: 400 });
    }

    // 扣除费用
    if (priceGold > 0) {
      await db
        .update(userAccounts)
        .set({ 
          goldBalance: userGoldBalance - priceGold * quantity,
          updatedAt: new Date()
        })
        .where(eq(userAccounts.email, session.user.email));
    }

    if (priceSilver > 0) {
      await db
        .update(userAccounts)
        .set({ 
          coinBalance: String(userCoinBalance - priceSilver * quantity),
          updatedAt: new Date()
        })
        .where(eq(userAccounts.email, session.user.email));
    }

    // 检查背包中是否已有该道具
    const existingItem = await db
      .select()
      .from(userItems)
      .where(and(
        eq(userItems.userId, userInfo.userId),
        eq(userItems.itemId, itemId)
      ))
      .limit(1);

    if (existingItem && existingItem.length > 0) {
      // 叠加数量
      await db
        .update(userItems)
        .set({ 
          quantity: existingItem[0].quantity + quantity,
          obtainedAt: new Date()
        })
        .where(eq(userItems.id, existingItem[0].id));
    } else {
      // 新增道具
      await db.insert(userItems).values({
        userId: userInfo.userId,
        itemId,
        quantity,
      });
    }

    return NextResponse.json({
      success: true,
      message: `成功购买 ${itemInfo.name} x${quantity}！`,
      item: {
        ...itemInfo,
        priceGold,
        priceSilver,
      },
    });

  } catch (error) {
    console.error('Purchase item error:', error);
    return NextResponse.json({ error: '购买失败' }, { status: 500 });
  }
}
