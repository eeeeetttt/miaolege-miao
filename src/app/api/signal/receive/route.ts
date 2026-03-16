import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signals, mtAccounts, planetMembers, planets } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      signal_type,
      ticket,
      symbol,
      order_type,
      volume,
      price,
      sl,
      tp,
      deal_profit,
      balance,
      broker,
      sender_account,
      planet_id,
      comment,
    } = body;

    console.log('Received signal:', { signal_type, sender_account, symbol, planet_id });

    if (!signal_type || !sender_account) {
      return NextResponse.json(
        { error: '缺少必要参数: signal_type 和 sender_account' },
        { status: 400 }
      );
    }

    let finalPlanetId = planet_id ? parseInt(planet_id) : null;

    // 如果没有提供planet_id，尝试自动查找
    if (!finalPlanetId) {
      // 查找绑定此MT账号的用户
      const [mtAccount] = await db
        .select()
        .from(mtAccounts)
        .where(eq(mtAccounts.accountNumber, String(sender_account)))
        .limit(1);

      if (mtAccount) {
        console.log('Found MT account binding:', mtAccount.userId);
        
        // 查找该用户作为owner或publisher的星球
        const [memberRecord] = await db
          .select()
          .from(planetMembers)
          .where(and(
            eq(planetMembers.userId, mtAccount.userId),
            eq(planetMembers.role, 'owner') // 或 'publisher'
          ))
          .limit(1);

        if (memberRecord) {
          finalPlanetId = memberRecord.planetId;
          console.log('Auto-linked to planet:', finalPlanetId);
        }

        // 如果用户是owner且开启了owner_as_publisher
        if (!finalPlanetId) {
          const [ownerPlanet] = await db
            .select()
            .from(planets)
            .where(eq(planets.creatorId, mtAccount.userId))
            .limit(1);

          if (ownerPlanet && ownerPlanet.ownerAsPublisher) {
            finalPlanetId = ownerPlanet.id;
            console.log('Owner as publisher, linked to planet:', finalPlanetId);
          }
        }
      }
    }

    // 插入信号
    const insertResult = await db.insert(signals).values({
      signalType: signal_type,
      ticket: ticket ? parseInt(ticket) : null,
      symbol: symbol || null,
      orderType: order_type || null,
      volume: volume || null,
      price: price ? String(price) : null,
      sl: sl ? String(sl) : null,
      tp: tp ? String(tp) : null,
      dealProfit: deal_profit ? String(deal_profit) : null,
      balance: balance ? String(balance) : null,
      broker: broker || null,
      senderAccount: String(sender_account),
      planetId: finalPlanetId,
      comment: comment || null,
      userId: null, // 可以关联到用户
    });

    const signalId = insertResult[0].insertId;

    return NextResponse.json({
      success: true,
      signalId,
      planetId: finalPlanetId,
      message: finalPlanetId 
        ? `信号已关联到星球 ${finalPlanetId}` 
        : '信号已接收但未关联到星球',
    });
  } catch (error) {
    console.error('Receive signal error:', error);
    return NextResponse.json(
      { error: '信号接收失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
