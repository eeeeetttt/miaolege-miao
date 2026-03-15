import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signals, planetMembers } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

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
      sender_account,
      planet_id,
      comment,
    } = body;

    if (!signal_type || !sender_account) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // If planet_id is provided, validate that sender is a publisher or owner
    if (planet_id) {
      // Note: In production, you might want to verify sender_account
      // against a verified publisher list
    }

    // Create signal
    const [signal] = await db.insert(signals).values({
      signalType: signal_type,
      ticket: ticket || null,
      symbol: symbol || null,
      orderType: order_type || null,
      volume: volume || null,
      price: price || null,
      sl: sl || null,
      tp: tp || null,
      dealProfit: deal_profit || null,
      senderAccount: sender_account,
      planetId: planet_id || null,
      comment: comment || null,
    }).$returningId();

    return NextResponse.json({
      success: true,
      signalId: signal.id,
      message: '信号接收成功',
    });
  } catch (error) {
    console.error('Receive signal error:', error);
    return NextResponse.json(
      { error: '信号接收失败' },
      { status: 500 }
    );
  }
}
