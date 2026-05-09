import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, pool } from '@/lib/db';
import { matchConfigs } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

// 获取赛事配置
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const matchType = searchParams.get('type');
  
  try {
    if (matchType) {
      const configs = await db
        .select()
        .from(matchConfigs)
        .where(eq(matchConfigs.matchType, matchType));
      
      // 转换为键值对
      const configMap: Record<string, string> = {};
      configs.forEach(c => {
        configMap[c.configKey] = c.configValue || '';
      });
      
      return NextResponse.json({ config: configMap });
    }
    
    // 获取所有配置
    const allConfigs = await db.select().from(matchConfigs);
    
    // 按类型分组
    const groupedConfig: Record<string, Record<string, string>> = {};
    allConfigs.forEach(c => {
      if (!groupedConfig[c.matchType]) {
        groupedConfig[c.matchType] = {};
      }
      groupedConfig[c.matchType][c.configKey] = c.configValue || '';
    });
    
    return NextResponse.json({ configs: groupedConfig });
  } catch (error) {
    console.error('Get match config error:', error);
    return NextResponse.json({ error: '获取赛事配置失败' }, { status: 500 });
  }
}

// 更新赛事配置（仅管理员）
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
  }
  
  try {
    const body = await request.json();
    const { matchType, configKey, configValue } = body;
    
    if (!matchType || !configKey) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }
    
    // 使用原生 SQL 进行 upsert
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        `INSERT INTO match_configs (match_type, config_key, config_value) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
        [matchType, configKey, configValue]
      );
    } finally {
      connection.release();
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update match config error:', error);
    return NextResponse.json({ error: '更新配置失败' }, { status: 500 });
  }
}
