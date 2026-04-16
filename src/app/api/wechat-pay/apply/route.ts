import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 提交微信充值申请
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { amount } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: '请输入有效的充值金额' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 获取汇率配置
    const { data: rateConfig } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'wechat_exchange_rate')
      .maybeSingle();

    const exchangeRate = parseFloat(rateConfig?.config_value || '7');
    const cnyAmount = Math.ceil(amount * exchangeRate); // 向上取整

    // 创建微信充值申请记录
    const { data, error } = await supabase
      .from('recharge_applications')
      .insert({
        user_id: session.user.id,
        amount: amount,
        payment_method: 'wechat',
        exchange_rate: exchangeRate,
        cny_amount: cnyAmount,
        status: 'pending',
        screenshot_url: '', // 截图稍后上传
      })
      .select('id')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ 
        error: '充值申请提交失败',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: '充值申请已提交',
      applicationId: data.id,
      exchangeRate,
      cnyAmount,
    });
  } catch (error) {
    console.error('Wechat recharge apply error:', error);
    return NextResponse.json({ 
      error: '充值申请提交失败',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// 获取用户的微信充值记录
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 获取当前用户的微信充值记录
    const { data: records, error } = await supabase
      .from('recharge_applications')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('payment_method', 'wechat')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('获取充值记录失败:', error);
      return NextResponse.json({ error: '获取充值记录失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: records || [],
    });
  } catch (error) {
    console.error('Get wechat recharge records error:', error);
    return NextResponse.json({ error: '获取充值记录失败' }, { status: 500 });
  }
}
