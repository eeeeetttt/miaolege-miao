import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, pool } from '@/lib/db';
import { matchConfigs } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

// 五大赛事配置模板
const MATCH_CONFIG_TEMPLATES: Record<string, Record<string, { value: string; description: string }>> = {
  kline: {
    enabled: { value: 'true', description: '是否启用' },
    entry_fee_gold: { value: '200', description: '报名费（金币）' },
    initial_capital_silver: { value: '1000', description: '初始银两' },
    fail_threshold: { value: '100', description: '失败底线净值' },
    level_targets: { value: '[1100,1200,1300,1400,1500,1600,1700,1800,1900,2000]', description: '关卡目标净值（JSON数组）' },
    completion_reward_gold: { value: '3000', description: '通关奖励（金币）' },
    completion_title: { value: 'K线宗师', description: '通关称号' },
    description: { value: '10关闯关挑战，从1000到2000', description: '比赛描述' },
  },
  ladder: {
    enabled: { value: 'true', description: '是否启用' },
    entry_capital_silver: { value: '10000', description: '初始银两' },
    season_days: { value: '30', description: '赛季天数' },
    reward_tiers: { value: '[{"rank_from":1,"rank_to":1,"reward_gold":5000},{"rank_from":2,"rank_to":10,"reward_gold":2000}]', description: '奖励档次（JSON）' },
    description: { value: '月度收益率排行', description: '比赛描述' },
  },
  daily: {
    enabled: { value: 'true', description: '是否启用' },
    entry_fee_gold: { value: '50', description: '报名费（金币）' },
    entry_capital_silver: { value: '10000', description: '初始银两' },
    start_hour: { value: '0', description: '报名开始小时(0-23)' },
    end_hour: { value: '20', description: '报名截止小时(0-23)' },
    reward_gold: { value: '500', description: '第一名奖励（金币）' },
    reward_silver: { value: '500', description: '第一名奖励（银两）' },
    description: { value: '每日盈利额排行', description: '比赛描述' },
  },
  master: {
    enabled: { value: 'false', description: '是否启用' },
    required_title: { value: 'K线宗师', description: '参赛所需称号' },
    match_format: { value: 'single_elimination', description: '比赛形式（单败淘汰）' },
    rounds_per_week: { value: '1', description: '每周轮数' },
    champion_reward_gold: { value: '20000', description: '冠军奖励（金币）' },
    champion_title: { value: '大师', description: '冠军称号' },
    description: { value: '淘汰赛制', description: '比赛描述' },
  },
  monthly: {
    enabled: { value: 'false', description: '是否启用' },
    qualifying_top_n: { value: '100', description: '参赛资格（天梯赛前N名）' },
    match_duration_days: { value: '3', description: '比赛天数' },
    champion_reward_gold: { value: '10000', description: '冠军奖励（金币）' },
    champion_title: { value: '月度大师', description: '冠军称号' },
    required_debt_zero: { value: 'true', description: '是否要求负债为0' },
    description: { value: '月底3天收益大赛', description: '比赛描述' },
  },
};

// 获取所有赛事配置
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 获取所有配置
    const allConfigs = await db.select().from(matchConfigs);
    
    // 按赛事类型分组
    const configByMatch: Record<string, Record<string, string>> = {};
    const matchMeta: Record<string, { name: string; icon: string; color: string }> = {
      kline: { name: 'K线征途', icon: 'target', color: '#3b82f6' },
      ladder: { name: '天梯赛', icon: 'trophy', color: '#10b981' },
      daily: { name: '每日挑战', icon: 'zap', color: '#f59e0b' },
      master: { name: '大师邀请', icon: 'crown', color: '#a78bfa' },
      monthly: { name: '月度决赛', icon: 'medal', color: '#ec4899' },
    };
    
    for (const cfg of allConfigs) {
      if (!configByMatch[cfg.matchType]) {
        configByMatch[cfg.matchType] = {};
      }
      configByMatch[cfg.matchType][cfg.configKey] = cfg.configValue || '';
    }
    
    // 补充默认值
    const result: Record<string, any> = {};
    for (const matchType of Object.keys(MATCH_CONFIG_TEMPLATES)) {
      result[matchType] = {
        meta: matchMeta[matchType],
        config: { ...MATCH_CONFIG_TEMPLATES[matchType], ...configByMatch[matchType] },
      };
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('获取赛事配置失败:', error);
    return NextResponse.json({ 
      error: '获取配置失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// 更新赛事配置
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { matchType, configKey, configValue } = body;

    if (!matchType || !configKey) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 验证赛事类型
    if (!MATCH_CONFIG_TEMPLATES[matchType]) {
      return NextResponse.json({ error: '无效的赛事类型' }, { status: 400 });
    }

    // 更新或插入配置
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // 使用 INSERT ... ON DUPLICATE KEY UPDATE
      await connection.execute(
        `INSERT INTO match_configs (match_type, config_key, config_value) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_at = NOW()`,
        [matchType, configKey, String(configValue)]
      );
      
      await connection.commit();
      
      return NextResponse.json({ success: true, message: '配置已保存' });
    } catch (err: any) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('保存赛事配置失败:', error);
    return NextResponse.json({ 
      error: '保存配置失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// 批量更新配置或初始化默认配置
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { action, matchType } = body;

    if (action === 'initDefaults') {
      // 初始化默认配置
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        
        let inserted = 0;
        for (const [type, configs] of Object.entries(MATCH_CONFIG_TEMPLATES)) {
          for (const [key, meta] of Object.entries(configs)) {
            await connection.execute(
              `INSERT INTO match_configs (match_type, config_key, config_value) 
               VALUES (?, ?, ?) 
               ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_at = NOW()`,
              [type, key, meta.value]
            );
            inserted++;
          }
        }
        
        await connection.commit();
        return NextResponse.json({ success: true, message: `已初始化 ${inserted} 项配置` });
      } catch (err: any) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    }

    if (action === 'batchUpdate') {
      // 批量更新配置
      const { configs } = body;
      if (!Array.isArray(configs)) {
        return NextResponse.json({ error: '配置数据格式错误' }, { status: 400 });
      }

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        
        for (const cfg of configs) {
          if (!cfg.matchType || !cfg.configKey) continue;
          await connection.execute(
            `INSERT INTO match_configs (match_type, config_key, config_value) 
             VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_at = NOW()`,
            [cfg.matchType, cfg.configKey, String(cfg.configValue)]
          );
        }
        
        await connection.commit();
        return NextResponse.json({ success: true, message: '批量保存成功' });
      } catch (err: any) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error) {
    console.error('赛事配置操作失败:', error);
    return NextResponse.json({ 
      error: '操作失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
