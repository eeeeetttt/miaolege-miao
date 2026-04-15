import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取充值配置信息
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 获取汇率
    const { data: rateData } = await supabase
      .from('challenge_config')
      .select('config_value')
      .eq('config_key', 'exchange_rate')
      .maybeSingle();
    const exchangeRate = rateData ? parseFloat(rateData.config_value) : 7;

    // 获取微信充值开关
    const { data: enabledData } = await supabase
      .from('challenge_config')
      .select('config_value')
      .eq('config_key', 'wechat_recharge_enabled')
      .maybeSingle();
    const wechatEnabled = enabledData?.config_value !== 'false';

    // 获取最低最高充值限额
    const { data: minData } = await supabase
      .from('challenge_config')
      .select('config_value')
      .eq('config_key', 'wechat_min_amount')
      .maybeSingle();
    const minAmount = minData ? parseFloat(minData.config_value) : 10;

    const { data: maxData } = await supabase
      .from('challenge_config')
      .select('config_value')
      .eq('config_key', 'wechat_max_amount')
      .maybeSingle();
    const maxAmount = maxData ? parseFloat(maxData.config_value) : 5000;

    return NextResponse.json({
      success: true,
      data: {
        exchangeRate,
        wechatEnabled,
        minAmount,
        maxAmount,
      },
    });
  } catch (error) {
    console.error('获取充值配置失败:', error);
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 });
  }
}
