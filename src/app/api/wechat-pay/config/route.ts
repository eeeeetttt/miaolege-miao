import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

// 获取充值配置（管理员）
export async function GET(request: NextRequest) {
  try {
    const [rows] = await pool.query('SELECT * FROM recharge_config LIMIT 1') as [any[], any];
    
    if (rows.length === 0) {
      return NextResponse.json({
        enabled: true,
        minAmount: 100,
        maxAmount: 50000,
        instructions: '请使用微信支付进行充值'
      });
    }
    
    return NextResponse.json({ config: rows[0] });
  } catch (error: any) {
    console.error('获取配置失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
