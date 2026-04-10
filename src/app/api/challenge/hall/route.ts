import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取挑战赛大厅数据
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ 
        error: '数据库连接不可用' 
      }, { status: 503 });
    }

    // 获取所有进行中的挑战记录
    const { data: registrations, error: regError } = await supabase
      .from('challenge_registrations')
      .select('*')
      .in('status', ['active', 'level_passed', 'approved'])
      .order('created_at', { ascending: false });

    if (regError) {
      console.error('Supabase query error:', regError);
      return NextResponse.json({ 
        error: '获取挑战数据失败', 
        details: regError.message 
      }, { status: 500 });
    }

    // 获取对应的净值数据
    const { data: equityData } = await supabase
      .from('challenge_equity')
      .select('*')
      .order('recorded_at', { ascending: false });

    // 创建净值Map
    const equityMap: Record<number, number> = {};
    if (equityData) {
      // 只保留每个账户的最新净值
      const seen = new Set<number>();
      for (const record of equityData) {
        if (!seen.has(record.registration_id)) {
          equityMap[record.registration_id] = record.equity;
          seen.add(record.registration_id);
        }
      }
    }

    // 构建大厅数据
    const participants = (registrations || []).map(reg => {
      const equity = equityMap[reg.id] || 1000;
      const initialBalance = 1000;
      const profit = equity - initialBalance;
      const profitRate = ((profit / initialBalance) * 100).toFixed(2);
      
      // 获取当前关卡目标
      let targetBalance = 1200;
      if (reg.current_level >= 2) targetBalance = 1500;
      if (reg.current_level >= 3) targetBalance = 1800;
      if (reg.current_level >= 4) targetBalance = 2000;
      
      const progress = Math.min(100, Math.max(0, ((equity - initialBalance) / (targetBalance - initialBalance)) * 100));

      return {
        id: reg.id,
        userId: reg.user_id,
        userName: reg.user_id.substring(0, 8) + '...', // 脱敏处理
        status: reg.status,
        currentLevel: reg.current_level || 1,
        equity,
        profit: parseFloat(profit.toFixed(2)),
        profitRate: parseFloat(profitRate),
        progress: parseFloat(progress.toFixed(1)),
        targetBalance,
        startedAt: reg.started_at,
        completedLevels: (() => {
          const raw = reg.completed_levels;
          if (!raw) return [];
          if (typeof raw === 'string') {
            try { return JSON.parse(raw); } 
            catch { return []; }
          }
          if (Array.isArray(raw)) return raw;
          return [];
        })(),
      };
    });

    // 按收益率排序
    participants.sort((a, b) => b.profitRate - a.profitRate);

    // 添加排名
    const rankedParticipants = participants.map((p, index) => ({
      ...p,
      rank: index + 1,
    }));

    return NextResponse.json({
      success: true,
      data: rankedParticipants,
      totalParticipants: rankedParticipants.length,
    });
  } catch (error) {
    console.error('Get hall data error:', error);
    return NextResponse.json({ 
      error: '获取大厅数据失败',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
