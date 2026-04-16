import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { signals } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import { getSupabaseClient } from '@/storage/database/supabase-client';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

// 获取玩家的交易历史单
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 获取用户的挑战注册记录
    const { data: registrations, error: regError } = await supabase
      .from('challenge_registrations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (regError || !registrations || registrations.length === 0) {
      return NextResponse.json({ error: '未找到该玩家的挑战记录' }, { status: 404 });
    }

    const registration = registrations[0];
    const tradingAccount = registration.trading_account;

    if (!tradingAccount) {
      return NextResponse.json({
        trades: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      });
    }

    // 从MySQL的signals表获取交易历史
    const offset = (page - 1) * limit;
    
    // 使用Drizzle查询signals表
    const allSignals = await db
      .select()
      .from(signals)
      .where(eq(signals.senderAccount, tradingAccount))
      .orderBy(desc(signals.createdAt));

    const total = allSignals.length;
    const paginatedSignals = allSignals.slice(offset, offset + limit);

    // 格式化交易数据
    const formattedTrades = paginatedSignals.map(signal => ({
      id: signal.id,
      ticket: signal.ticket,
      symbol: signal.symbol,
      type: signal.signalType === 'buy' ? 'buy' : (signal.signalType === 'sell' ? 'sell' : signal.signalType),
      volume: signal.volume ? parseFloat(String(signal.volume)) : null,
      openPrice: signal.price ? parseFloat(String(signal.price)) : null,
      closePrice: signal.dealProfit ? parseFloat(String(signal.dealProfit)) : null,
      openTime: signal.createdAt,
      closeTime: signal.dealProfit ? signal.createdAt : null,
      profit: signal.dealProfit ? parseFloat(String(signal.dealProfit)) : null,
      comment: signal.comment,
      orderType: signal.orderType,
    }));

    return NextResponse.json({
      trades: formattedTrades,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get player trades error:', error);
    return NextResponse.json({ 
      error: '获取交易记录失败',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
