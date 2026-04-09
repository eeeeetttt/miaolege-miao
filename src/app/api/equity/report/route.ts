import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 固定的API密钥（与EA代码中的 EquityReportKey 一致）
const VALID_API_KEY = 'ea_equity_report_secure_key_2024';

// EA净值上报接口
// 该接口用于EA程序定时上报账户净值数据
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountNumber, equity, balance, profit, apiKey } = body;

    // API密钥验证
    if (!apiKey || apiKey !== VALID_API_KEY) {
      return NextResponse.json({ error: '无效的API密钥' }, { status: 401 });
    }

    if (!accountNumber) {
      return NextResponse.json({ error: '缺少账号' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 插入净值记录
    const { data, error } = await supabase
      .from('mt_account_equity')
      .insert({
        account_number: accountNumber,
        equity: Number(equity) || 0,
        balance: Number(balance) || 0,
        profit: Number(profit) || 0,
        recorded_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Equity report error:', error);
      return NextResponse.json({ 
        success: false, 
        error: '上报失败', 
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '净值上报成功',
      recordId: data?.id,
    });
  } catch (error) {
    console.error('Equity report error:', error);
    return NextResponse.json({ 
      error: '上报失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// 批量净值上报
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { accounts, apiKey } = body;

    // API密钥验证
    if (!apiKey || apiKey !== VALID_API_KEY) {
      return NextResponse.json({ error: '无效的API密钥' }, { status: 401 });
    }

    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      return NextResponse.json({ error: '缺少账号数据' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }
    
    const now = new Date().toISOString();

    // 批量插入净值记录
    const records = accounts.map((account: { accountNumber: string; equity: number; balance: number; profit: number }) => ({
      account_number: account.accountNumber,
      equity: Number(account.equity) || 0,
      balance: Number(account.balance) || 0,
      profit: Number(account.profit) || 0,
      recorded_at: now,
    }));

    const { error } = await supabase
      .from('mt_account_equity')
      .insert(records);

    if (error) {
      console.error('Batch equity report error:', error);
      return NextResponse.json({ 
        success: false, 
        error: '批量上报失败', 
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `成功上报 ${accounts.length} 个账户的净值`,
      count: accounts.length,
    });
  } catch (error) {
    console.error('Batch equity report error:', error);
    return NextResponse.json({ 
      error: '批量上报失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
