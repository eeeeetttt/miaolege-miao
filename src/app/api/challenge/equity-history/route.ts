import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取指定用户的净值历史数据
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountNumber = searchParams.get('account');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!accountNumber) {
      return NextResponse.json({ 
        error: '缺少账号参数' 
      }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ 
        error: '数据库连接不可用' 
      }, { status: 503 });
    }

    // 获取净值历史数据
    const { data: equityHistory, error: equityError } = await supabase
      .from('mt_account_equity')
      .select('equity, balance, profit, recorded_at')
      .eq('account_number', accountNumber)
      .order('recorded_at', { ascending: true })
      .limit(limit);

    if (equityError) {
      console.error('Get equity history error:', equityError);
      return NextResponse.json({ 
        error: '获取净值历史失败' 
      }, { status: 500 });
    }

    // 转换为图表数据格式
    const chartData = (equityHistory || []).map(record => {
      const date = new Date(record.recorded_at);
      return {
        date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        time: date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        equity: parseFloat(String(record.equity)) || 0,
        balance: parseFloat(String(record.balance)) || 0,
        profit: parseFloat(String(record.profit)) || (parseFloat(String(record.equity)) - 1000),
      };
    });

    return NextResponse.json({
      accountNumber,
      history: chartData,
      count: chartData.length,
    });
  } catch (error) {
    console.error('Get equity history error:', error);
    return NextResponse.json({ 
      error: '获取净值历史失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
