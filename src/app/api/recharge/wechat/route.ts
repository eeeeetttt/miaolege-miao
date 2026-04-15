import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取汇率配置
async function getExchangeRate(supabase: any): Promise<number> {
  try {
    const { data } = await supabase
      .from('challenge_config')
      .select('config_value')
      .eq('config_key', 'exchange_rate')
      .maybeSingle();
    return data ? parseFloat(data.config_value) : 7;
  } catch {
    return 7;
  }
}

// 获取充值配置
async function getRechargeConfig(supabase: any): Promise<{ enabled: boolean; minAmount: number; maxAmount: number }> {
  try {
    const { data: enabledData } = await supabase
      .from('challenge_config')
      .select('config_value')
      .eq('config_key', 'wechat_recharge_enabled')
      .maybeSingle();
    
    const { data: minData } = await supabase
      .from('challenge_config')
      .select('config_value')
      .eq('config_key', 'wechat_min_amount')
      .maybeSingle();
    
    const { data: maxData } = await supabase
      .from('challenge_config')
      .select('config_value')
      .eq('config_key', 'wechat_max_amount')
      .maybeSingle();
    
    return {
      enabled: enabledData?.config_value !== 'false',
      minAmount: minData ? parseFloat(minData.config_value) : 10,
      maxAmount: maxData ? parseFloat(maxData.config_value) : 5000,
    };
  } catch {
    return { enabled: true, minAmount: 10, maxAmount: 5000 };
  }
}

// 创建微信充值订单
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

    // 获取汇率和配置
    const [exchangeRate, config] = await Promise.all([
      getExchangeRate(supabase),
      getRechargeConfig(supabase),
    ]);

    if (!config.enabled) {
      return NextResponse.json({ error: '微信充值已关闭' }, { status: 403 });
    }

    if (amount < config.minAmount) {
      return NextResponse.json({ error: `最低充值金额为 ${config.minAmount} U` }, { status: 400 });
    }

    if (amount > config.maxAmount) {
      return NextResponse.json({ error: `最高充值金额为 ${config.maxAmount} U` }, { status: 400 });
    }

    // 计算人民币金额
    const cnyAmount = Math.ceil(amount * exchangeRate);

    // 生成订单号
    const orderId = `WX${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // 创建充值订单记录
    const { data: order, error: insertError } = await supabase
      .from('wechat_recharge_orders')
      .insert({
        order_id: orderId,
        user_id: session.user.id,
        amount_u: amount,
        amount_cny: cnyAmount,
        exchange_rate: exchangeRate,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('创建微信充值订单失败:', insertError);
      // 如果表不存在，尝试使用备选方案存储到localStorage或返回订单信息
      if (insertError.code === '42P01') {
        // 表不存在，使用内存订单（仅用于演示）
        return NextResponse.json({
          success: true,
          data: {
            orderId: orderId,
            amountU: amount,
            amountCny: cnyAmount,
            exchangeRate: exchangeRate,
            qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(`wechat://pay?orderId=${orderId}&amount=${cnyAmount}`)}`,
            payUrl: `wechat://pay?orderId=${orderId}&amount=${cnyAmount}`,
            demoMode: true,
          },
          message: '演示模式：表未创建，订单信息仅供参考',
        });
      }
      return NextResponse.json({ error: '创建订单失败: ' + insertError.message }, { status: 500 });
    }

    // 生成模拟的微信支付二维码
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(`wechat://pay?orderId=${orderId}&amount=${cnyAmount}`)}`;

    return NextResponse.json({
      success: true,
      data: {
        orderId: orderId,
        amountU: amount,
        amountCny: cnyAmount,
        exchangeRate: exchangeRate,
        qrCodeUrl: qrCodeUrl,
        payUrl: `wechat://pay?orderId=${orderId}&amount=${cnyAmount}`,
      },
    });
  } catch (error) {
    console.error('微信充值订单创建失败:', error);
    return NextResponse.json({ error: '创建订单失败' }, { status: 500 });
  }
}

// 查询订单状态
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ error: '缺少订单号' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 查询订单
    const { data: order, error } = await supabase
      .from('wechat_recharge_orders')
      .select('*')
      .eq('order_id', orderId)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    // 获取汇率
    const exchangeRate = await getExchangeRate(supabase);

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.order_id,
        amountU: order.amount_u,
        amountCny: order.amount_cny,
        exchangeRate: exchangeRate,
        status: order.status,
        createdAt: order.created_at,
        paidAt: order.paid_at,
      },
    });
  } catch (error) {
    console.error('查询订单失败:', error);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}
