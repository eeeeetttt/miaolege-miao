import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq, inArray } from 'drizzle-orm';

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
      .in('status', ['active', 'level_passed'])
      .order('created_at', { ascending: false });

    if (regError) {
      console.error('Supabase query error:', regError);
      return NextResponse.json({ 
        error: '获取挑战数据失败', 
        details: regError.message 
      }, { status: 500 });
    }

    // 收集所有交易账号
    const accountNumbers = registrations
      ?.filter(r => r.trading_account)
      .map(r => r.trading_account) || [];

    // 获取净值数据 - 为每个账号获取最新一条
    let equityMap: Record<string, number> = {};
    if (accountNumbers.length > 0) {
      // 为每个账号单独查询最新净值
      for (const accountNumber of accountNumbers) {
        const { data: equityData } = await supabase
          .from('mt_account_equity')
          .select('account_number, equity, recorded_at')
          .eq('account_number', accountNumber)
          .order('recorded_at', { ascending: false })
          .limit(1);
        
        if (equityData && equityData.length > 0) {
          equityMap[accountNumber] = parseFloat(String(equityData[0].equity));
        }
      }
    }

    // 收集所有用户ID
    const userIds = registrations
      ?.map(r => r.user_id)
      .filter(id => id) || [];

    // 获取用户头像和昵称信息
    let userInfoMap: Record<string, { name: string | null; avatar: string | null }> = {};
    if (userIds.length > 0) {
      // 使用 drizzle 从 PostgreSQL 获取用户信息
      try {
        const usersData = await db
          .select({ 
            userId: users.userId, 
            name: users.name,
            avatar: users.avatar 
          })
          .from(users)
          .where(inArray(users.userId, userIds));

        for (const user of usersData) {
          userInfoMap[user.userId] = {
            name: user.name,
            avatar: user.avatar,
          };
        }
      } catch (dbErr) {
        console.error('PostgreSQL query error:', dbErr);
        // 尝试从 Supabase 获取
        const { data: supabaseUsers } = await supabase
          .from('users')
          .select('userId, name, avatar')
          .in('userId', userIds);

        if (supabaseUsers) {
          for (const user of supabaseUsers) {
            userInfoMap[user.userId] = {
              name: user.name,
              avatar: user.avatar,
            };
          }
        }
      }
    }

    // 获取所有活跃关卡配置
    const { data: levelConfigsData } = await supabase
      .from('challenge_level_config')
      .select('level, initial_balance, target_balance, fail_balance')
      .eq('is_active', 1)
      .order('level');

    // 构建关卡配置映射
    const levelConfigMap: Record<number, { initialBalance: number; targetBalance: number; failBalance: number }> = {};
    if (levelConfigsData) {
      for (const lc of levelConfigsData) {
        levelConfigMap[lc.level] = {
          initialBalance: parseFloat(String(lc.initial_balance)) || 1000,
          targetBalance: parseFloat(String(lc.target_balance)) || 2000,
          failBalance: parseFloat(String(lc.fail_balance)) || 100,
        };
      }
    }

    // 构建大厅数据
    const participants = (registrations || []).map(reg => {
      const equity = equityMap[reg.trading_account || ''] || 1000;
      const currentLevel = reg.current_level || 1;
      const userInfo = userInfoMap[reg.user_id] || { name: null, avatar: null };
      
      // 获取当前关卡配置
      const levelConfig = levelConfigMap[currentLevel] || { initialBalance: 1000, targetBalance: 2000, failBalance: 100 };
      const initialBalance = levelConfig.initialBalance;
      const targetBalance = levelConfig.targetBalance;
      const failBalance = levelConfig.failBalance;
      
      // 根据每关配置计算进度
      const progress = Math.min(100, Math.max(0, ((equity - initialBalance) / (targetBalance - initialBalance)) * 100));

      return {
        id: reg.id,
        userId: reg.user_id,
        userName: userInfo.name || reg.user_id.substring(0, 8),
        userAvatar: userInfo.avatar || null,
        status: reg.status,
        currentLevel,
        equity,
        progress: parseFloat(progress.toFixed(1)),
        targetBalance,
        initialBalance,
        failBalance,
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

    // 按通关数排名，通关数相同则按净值降序
    participants.sort((a, b) => {
      const aCompletedCount = a.completedLevels.length;
      const bCompletedCount = b.completedLevels.length;
      // 优先按通关数降序
      if (bCompletedCount !== aCompletedCount) {
        return bCompletedCount - aCompletedCount;
      }
      // 通关数相同时按当前关卡进度降序
      if (b.currentLevel !== a.currentLevel) {
        return b.currentLevel - a.currentLevel;
      }
      // 关卡相同时按净值降序
      return b.equity - a.equity;
    });

    // 只取前10名
    const top10 = participants.slice(0, 10).map((p, index) => ({
      ...p,
      rank: index + 1,
    }));

    // 获取配置
    const { data: configData } = await supabase
      .from('challenge_config')
      .select('config_key, config_value')
      .in('config_key', ['allow_view_detail', 'show_leaderboard']);

    const configMap: Record<string, string> = {};
    if (configData) {
      for (const c of configData) {
        configMap[c.config_key] = c.config_value;
      }
    }

    // 获取名人堂数据（已完成挑战的用户）
    const { data: completedRegistrations } = await supabase
      .from('challenge_registrations')
      .select('*')
      .eq('status', 'completed')
      .order('completed_at', { ascending: true });

    // 获取已通关用户的头像和昵称
    const completedUserIds = completedRegistrations
      ?.filter(r => r.user_id)
      .map(r => r.user_id) || [];

    let completedUserInfoMap: Record<string, { name: string | null; avatar: string | null }> = {};
    if (completedUserIds.length > 0) {
      try {
        const completedUsersData = await db
          .select({
            userId: users.userId,
            name: users.name,
            avatar: users.avatar,
          })
          .from(users)
          .where(inArray(users.userId, completedUserIds));

        for (const user of completedUsersData) {
          completedUserInfoMap[user.userId] = {
            name: user.name,
            avatar: user.avatar,
          };
        }
      } catch (dbErr) {
        console.error('PostgreSQL query error for completed users:', dbErr);
      }
    }

    // 构建名人堂数据
    const hallOfFame = (completedRegistrations || []).map((reg, index) => {
      const userInfo = completedUserInfoMap[reg.user_id] || { name: null, avatar: null };
      return {
        rank: index + 1,
        userId: reg.user_id,
        userName: userInfo.name || reg.user_id.substring(0, 8),
        userAvatar: userInfo.avatar || null,
        completedAt: reg.completed_at,
        totalDuration: reg.total_duration,
      };
    });

    return NextResponse.json({
      success: true,
      data: top10,
      hallOfFame,
      config: configMap,
    });
  } catch (error) {
    console.error('Get hall data error:', error);
    return NextResponse.json({ 
      error: '获取大厅数据失败',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
