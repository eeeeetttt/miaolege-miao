import { NextRequest, NextResponse } from 'next/server';
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
    const level = searchParams.get('level');

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

    // 获取交易历史
    const { data: trades, error: tradesError, count } = await supabase
      .from('mt_trades')
      .select('*', { count: 'exact' })
      .eq('account_number', tradingAccount)
      .order('open_time', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (tradesError) {
      console.error('Get trades error:', tradesError);
      return NextResponse.json({ error: '获取交易记录失败' }, { status: 500 });
    }

    // 格式化交易数据
    const formattedTrades = trades?.map(trade => ({
      id: trade.id,
      ticket: trade.ticket,
      symbol: trade.symbol,
      type: trade.type,
      volume: trade.volume,
      openPrice: parseFloat(String(trade.open_price)),
      closePrice: trade.close_price ? parseFloat(String(trade.close_price)) : null,
      openTime: trade.open_time,
      closeTime: trade.close_time,
      profit: trade.profit ? parseFloat(String(trade.profit)) : null,
      commission: trade.commission ? parseFloat(String(trade.commission)) : 0,
      swap: trade.swap ? parseFloat(String(trade.swap)) : 0,
      magic: trade.magic,
      comment: trade.comment,
    })) || [];

    return NextResponse.json({
      trades: formattedTrades,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Get player trades error:', error);
    return NextResponse.json({ 
      error: '获取交易记录失败',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
