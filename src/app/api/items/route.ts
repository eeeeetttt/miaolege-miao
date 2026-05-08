import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
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
