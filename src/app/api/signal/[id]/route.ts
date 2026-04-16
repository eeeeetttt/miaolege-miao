import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signals } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const signalId = parseInt(id);

    // Get signal
    const [signal] = await db
      .select()
      .from(signals)
      .where(eq(signals.id, signalId))
      .limit(1);

    if (!signal) {
      return NextResponse.json({ error: '信号不存在' }, { status: 404 });
    }

    // Get all signals from the same sender
    const senderSignals = await db
      .select()
      .from(signals)
      .where(eq(signals.senderAccount, signal.senderAccount))
      .orderBy(desc(signals.createdAt))
      .limit(100);

    return NextResponse.json({
      signal,
      senderSignals,
    });
  } catch (error) {
    console.error('Get signal error:', error);
    return NextResponse.json({ error: '获取信号失败' }, { status: 500 });
  }
}
