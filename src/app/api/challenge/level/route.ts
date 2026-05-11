import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM challenge_level_config ORDER BY level_order ASC'
    ) as [any[], any];
    
    return NextResponse.json({ levels: rows });
  } catch (error: any) {
    console.error('获取关卡配置失败:', error);
    return NextResponse.json({ 
      levels: [],
      error: error.message 
    }, { status: 500 });
  }
}
