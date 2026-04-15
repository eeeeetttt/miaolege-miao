import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 初始化微信充值相关的数据表
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 创建微信充值订单表
    const { error: createOrdersTable } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS wechat_recharge_orders (
          id SERIAL PRIMARY KEY,
          order_id VARCHAR(50) UNIQUE NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          amount_u DECIMAL(10, 2) NOT NULL,
          amount_cny DECIMAL(10, 2) NOT NULL,
          exchange_rate DECIMAL(5, 2) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          paid_at TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(userId)
        );
      `
    });

    // 如果rpc方式不行，尝试直接插入测试数据
    if (createOrdersTable) {
      console.log('尝试创建表失败:', createOrdersTable);
    }

    // 确保默认配置存在
    const configs = [
      { config_key: 'wechat_recharge_enabled', config_value: 'true', description: '微信充值是否启用' },
      { config_key: 'exchange_rate', config_value: '7', description: '充值汇率（1 U = X 元）' },
      { config_key: 'wechat_min_amount', config_value: '10', description: '微信充值最低金额（U）' },
      { config_key: 'wechat_max_amount', config_value: '5000', description: '微信充值最高金额（U）' },
    ];

    for (const cfg of configs) {
      const { data: existing } = await supabase
        .from('challenge_config')
        .select('config_key')
        .eq('config_key', cfg.config_key)
        .maybeSingle();
      
      if (!existing) {
        await supabase.from('challenge_config').insert(cfg);
      }
    }

    return NextResponse.json({
      success: true,
      message: '初始化成功',
    });
  } catch (error) {
    console.error('初始化微信充值配置失败:', error);
    return NextResponse.json({ error: '初始化失败' }, { status: 500 });
  }
}
