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

    // 获取净值数据
    let equityMap: Record<string, number> = {};
    if (accountNumbers.length > 0) {
      const { data: equityData } = await supabase
        .from('mt_account_equity')
        .select('account_number, equity')
        .in('account_number', accountNumbers);

      if (equityData) {
        for (const record of equityData) {
          if (!equityMap[record.account_number]) {
            equityMap[record.account_number] = parseFloat(String(record.equity));
          }
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
      // 使用 drizzle 从 MySQL 获取用户信息
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
        console.error('MySQL query error:', dbErr);
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

    // 构建大厅数据
    const participants = (registrations || []).map(reg => {
      const equity = equityMap[reg.trading_account || ''] || 1000;
      const currentLevel = reg.current_level || 1;
      const userInfo = userInfoMap[reg.user_id] || { name: null, avatar: null };
      
      // 获取当前关卡目标
      let targetBalance = 1200;
      if (currentLevel >= 2) targetBalance = 1500;
      if (currentLevel >= 3) targetBalance = 1800;
      if (currentLevel >= 4) targetBalance = 2000;
      
      const progress = Math.min(100, Math.max(0, ((equity - 1000) / (targetBalance - 1000)) * 100));

      return {
        id: reg.id,
        userId: reg.user_id,
        userName: userInfo.name || reg.user_id.substring(0, 8), // 使用昵称或脱敏ID
        userAvatar: userInfo.avatar || null,
        status: reg.status,
        currentLevel,
        equity,
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

    // 按净值排序
    participants.sort((a, b) => b.equity - a.equity);

    // 只取前10名
    const top10 = participants.slice(0, 10).map((p, index) => ({
      ...p,
      rank: index + 1,
    }));

    return NextResponse.json({
      success: true,
      data: top10,
    });
  } catch (error) {
    console.error('Get hall data error:', error);
    return NextResponse.json({ 
      error: '获取大厅数据失败',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
