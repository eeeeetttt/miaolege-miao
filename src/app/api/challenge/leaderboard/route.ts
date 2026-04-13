import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取排行榜（混合真实用户和虚拟用户）
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 获取真实活跃挑战用户
    const { data: registrations, error: regError } = await supabase
      .from('challenge_registrations')
      .select('id, user_id, current_level, trading_account')
      .eq('status', 'active')
      .order('current_level', { ascending: false });

    if (regError) {
      console.error('Get registrations error:', regError);
      return NextResponse.json({ error: '获取排行榜失败' }, { status: 500 });
    }

    const leaderboard: any[] = [];
    let equityMap: Record<string, number> = {};
    
    if (registrations && registrations.length > 0) {
      // 获取净值数据
      const accountNumbers = registrations
        ?.filter(r => r.trading_account)
        .map(r => r.trading_account) || [];
      
      for (const accountNumber of accountNumbers) {
        const { data: equityData } = await supabase
          .from('mt_account_equity')
          .select('account_number, equity')
          .eq('account_number', accountNumber)
          .order('recorded_at', { ascending: false })
          .limit(1);
        
        if (equityData && equityData.length > 0) {
          equityMap[accountNumber] = parseFloat(String(equityData[0].equity));
        }
      }

      // 构建真实用户排行榜数据
      for (const reg of registrations) {
        const equity = equityMap[reg.trading_account] || 1000;
        const progress = Math.round(((equity - 1000) / (2000 - 1000)) * 100);
        
        leaderboard.push({
          id: reg.id,
          userId: reg.user_id,
          name: '用户' + reg.user_id.slice(0, 6),
          avatar: null,
          level: reg.current_level || 1,
          equity,
          progress: Math.max(0, Math.min(100, progress)),
          isVirtual: 0,
        });
      }
    }

    // 从Supabase获取虚拟用户
    try {
      const { data: virtualUsers } = await supabase
        .from('virtual_participants')
        .select('*')
        .eq('is_active', 1)
        .order('level', { ascending: false });

      if (virtualUsers) {
        for (const v of virtualUsers) {
          const progress = Math.round(((Number(v.equity) - 1000) / (2000 - 1000)) * 100);
          leaderboard.push({
            id: v.id,
            userId: `virtual_${v.id}`,
            name: v.name,
            avatar: v.avatar || null,
            level: v.level,
            equity: Number(v.equity),
            progress: Math.max(0, Math.min(100, progress)),
            isVirtual: 1,
          });
        }
      }
    } catch (e) {
      console.error('Get virtual users error:', e);
    }

    // 获取缓存更新时间
    try {
      const { data: cacheData } = await supabase
        .from('leaderboard_cache')
        .select('updated_at')
        .limit(1);
      
      leaderboard.lastUpdated = cacheData?.[0]?.updated_at || null;
    } catch (e) {
      console.error('Get cache time error:', e);
    }

    // 排序：真实用户优先，然后按关卡降序、净值降序
    leaderboard.sort((a, b) => {
      if (a.isVirtual !== b.isVirtual) {
        return a.isVirtual - b.isVirtual;
      }
      if (a.level !== b.level) {
        return b.level - a.level;
      }
      return b.equity - a.equity;
    });

    // 只取前10名
    const top10 = leaderboard.slice(0, 10);

    return NextResponse.json({
      success: true,
      data: top10,
      lastUpdated: leaderboard.lastUpdated || null,
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return NextResponse.json({ error: '获取排行榜失败' }, { status: 500 });
  }
}

// 更新排行榜缓存（每日晚上8点自动调用）
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (secret !== process.env.CRON_SECRET && secret !== 'admin-secret') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 获取所有活跃真实用户
    const { data: registrations, error: regError } = await supabase
      .from('challenge_registrations')
      .select('id, user_id, current_level, trading_account')
      .eq('status', 'active');

    if (regError) {
      console.error('Get registrations error:', regError);
      return NextResponse.json({ error: '获取真实用户失败' }, { status: 500 });
    }

    // 获取净值数据
    const accountNumbers = registrations?.map(r => r.trading_account).filter(Boolean) || [];
    let equityMap: Record<string, number> = {};
    for (const accountNumber of accountNumbers) {
      const { data: equityData } = await supabase
        .from('mt_account_equity')
        .select('account_number, equity')
        .eq('account_number', accountNumber)
        .order('recorded_at', { ascending: false })
        .limit(1);
      
      if (equityData && equityData.length > 0) {
        equityMap[accountNumber] = parseFloat(String(equityData[0].equity));
      }
    }

    // 获取虚拟用户
    const { data: virtualUsers } = await supabase
      .from('virtual_participants')
      .select('*')
      .eq('is_active', 1);

    // 构建缓存数据
    const cacheEntries: any[] = [];
    const now = new Date().toISOString();

    // 添加真实用户
    if (registrations) {
      for (const reg of registrations) {
        const equity = equityMap[reg.trading_account] || 1000;
        const progress = Math.round(((equity - 1000) / (2000 - 1000)) * 100);
        
        cacheEntries.push({
          user_id: reg.user_id,
          user_name: '用户' + reg.user_id.slice(0, 6),
          user_avatar: null,
          level: reg.current_level || 1,
          equity,
          progress: Math.max(0, Math.min(100, progress)),
          is_virtual: 0,
          updated_at: now,
        });
      }
    }

    // 添加虚拟用户
    if (virtualUsers) {
      for (const v of virtualUsers) {
        const equity = Number(v.equity);
        const progress = Math.round(((equity - 1000) / (2000 - 1000)) * 100);
        cacheEntries.push({
          user_id: `virtual_${v.id}`,
          user_name: v.name,
          user_avatar: v.avatar || null,
          level: v.level,
          equity,
          progress: Math.max(0, Math.min(100, progress)),
          is_virtual: 1,
          updated_at: now,
        });
      }
    }

    // 清空旧缓存并插入新数据
    await supabase.from('leaderboard_cache').delete().neq('id', 0);
    await supabase.from('leaderboard_cache').insert(cacheEntries);

    return NextResponse.json({
      success: true,
      message: '排行榜已更新',
      count: cacheEntries.length,
      updatedAt: now,
    });
  } catch (error) {
    console.error('Update leaderboard cache error:', error);
    return NextResponse.json({ error: '更新排行榜缓存失败' }, { status: 500 });
  }
}
