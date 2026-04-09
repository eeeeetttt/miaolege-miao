import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 用户行类型
interface UserRow {
  user_id: string;
  email: string | null;
  name: string | null;
  coin_balance: number | null;
  role: string | null;
}

// 报名记录行类型
interface RegistrationRow {
  id: number;
  user_id: string;
  status: string;
  current_level: number | null;
  completed_levels: string | null;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  failed_level: number | null;
  total_duration: number | null;
  server_name: string | null;
  trading_account: string | null;
  trading_password: string | null;
  mt_account_id: number | null;
  created_at: string | null;
}

// 获取挑战状态
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const userId = session.user.id;
    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ 
        error: '数据库连接不可用' 
      }, { status: 503 });
    }

    // 从Supabase获取用户的挑战申请记录
    const { data: registrations, error: regError } = await supabase
      .from('challenge_registrations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (regError) {
      console.error('Supabase query error:', regError);
      return NextResponse.json({ 
        error: '获取挑战状态失败', 
        details: regError.message 
      }, { status: 500 });
    }

    const latestRegistration = registrations && registrations.length > 0 ? registrations[0] : null;

    // 获取挑战配置（从Supabase）
    const { data: configRows, error: configError } = await supabase
      .from('challenge_config')
      .select('config_key, config_value');

    // 构建配置Map
    const configMap: Record<string, string> = {};
    if (configRows && !configError) {
      for (const cfg of configRows) {
        configMap[cfg.config_key] = cfg.config_value;
      }
    } else {
      // 使用默认值
      configMap.registration_fee = '1000';
      configMap.challenge_enabled = 'true';
      configMap.fail_balance = '100';
      configMap.target_balance = '2000';
      configMap.profit_target = '1000';
      configMap.show_leaderboard = 'true';
      configMap.completion_reward = '100000';
    }

    // 获取关卡配置
    const { data: levelRows, error: levelError } = await supabase
      .from('challenge_level_config')
      .select('level, name, description, target_balance, initial_balance, fail_balance, reward')
      .eq('is_active', true)
      .order('level');

    const levelConfigs = levelRows?.map(row => ({
      level: row.level,
      name: row.name,
      description: row.description,
      targetBalance: row.target_balance,
      initialBalance: row.initial_balance,
      failBalance: row.fail_balance,
      reward: row.reward,
    })) || [];

    if (!latestRegistration) {
      return NextResponse.json({
        hasActiveChallenge: false,
        hasPendingApplication: false,
        registration: null,
        registrationFee: parseInt(configMap.registration_fee || '1000'),
        config: configMap,
        levelConfigs,
        message: '您还未申请挑战赛',
      });
    }

    // 判断状态
    const isActive = latestRegistration.status === 'active' || latestRegistration.status === 'level_passed';
    const isPending = latestRegistration.status === 'pending';
    const isApproved = latestRegistration.status === 'approved';
    const isCompleted = latestRegistration.status === 'completed';
    const isFailed = latestRegistration.status === 'failed';
    const isRejected = latestRegistration.status === 'rejected';

    // 已完成或失败的挑战，可以重新报名
    const canReapply = isCompleted || isFailed || isRejected;

    return NextResponse.json({
      hasActiveChallenge: isActive,
      hasPendingApplication: isPending,
      registration: {
        id: latestRegistration.id,
        status: latestRegistration.status,
        currentLevel: latestRegistration.current_level,
        completedLevels: latestRegistration.completed_levels 
          ? JSON.parse(latestRegistration.completed_levels) 
          : [],
        startedAt: latestRegistration.started_at,
        serverName: latestRegistration.server_name,
        tradingAccount: latestRegistration.trading_account,
        completedAt: latestRegistration.completed_at,
        failedAt: latestRegistration.failed_at,
        failedLevel: latestRegistration.failed_level,
      },
      canReapply,
      registrationFee: parseInt(configMap.registration_fee || '1000'),
      config: configMap,
      levelConfigs,
      message: getStatusMessage(latestRegistration.status),
    });
  } catch (error) {
    console.error('Get challenge status error:', error);
    return NextResponse.json({ 
      error: '获取挑战状态失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// 提交挑战赛申请
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: '请先登录后再报名',
        errorCode: 'NOT_LOGGED_IN'
      }, { status: 401 });
    }

    const userId = session.user.id;
    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ 
        error: '数据库连接不可用',
        errorCode: 'DB_UNAVAILABLE'
      }, { status: 503 });
    }

    // 从Supabase获取挑战配置
    const { data: configRows, error: configError } = await supabase
      .from('challenge_config')
      .select('config_key, config_value');

    const configMap: Record<string, string> = {};
    if (configRows && !configError) {
      for (const cfg of configRows) {
        configMap[cfg.config_key] = cfg.config_value;
      }
    } else {
      configMap.registration_fee = '1000';
      configMap.challenge_enabled = 'true';
    }

    // 检查挑战赛是否启用
    if (configMap.challenge_enabled !== 'true') {
      return NextResponse.json({ 
        error: '挑战赛已关闭，请耐心等待下次开启' 
      }, { status: 400 });
    }

    // 从Supabase获取用户信息（需要从users表）
    // 注意: users表可能在MySQL，我们使用coin_balance字段
    // 暂时使用默认余额1000，实际生产环境需要从用户系统获取
    const currentBalance = 1000; // 假设默认余额足够

    // 检查是否有已完成或失败的挑战记录，如果有则删除旧记录允许重新报名
    // 这个检查优先处理，因为可能出现净值已跌破底线但状态还未更新的情况
    const { data: oldRecords } = await supabase
      .from('challenge_registrations')
      .select('id')
      .eq('user_id', userId)
      .in('status', ['completed', 'failed', 'rejected'])
      .limit(1);

    // 如果有旧的完成/失败记录，先删除它们以允许重新报名
    if (oldRecords && oldRecords.length > 0) {
      await supabase
        .from('challenge_registrations')
        .delete()
        .eq('id', oldRecords[0].id);
    }

    // 检查是否已有未处理的申请
    const { data: existingPending } = await supabase
      .from('challenge_registrations')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .limit(1);

    if (existingPending && existingPending.length > 0) {
      return NextResponse.json({ 
        error: '您已提交过申请，请等待审核' 
      }, { status: 400 });
    }

    // 检查是否有进行中的挑战
    const { data: existingActive } = await supabase
      .from('challenge_registrations')
      .select('id, status')
      .eq('user_id', userId)
      .in('status', ['active', 'approved', 'level_passed'])
      .limit(1);

    if (existingActive && existingActive.length > 0) {
      const status = existingActive[0].status;
      if (status === 'active') {
        return NextResponse.json({ 
          error: '您已有正在进行的挑战' 
        }, { status: 400 });
      } else if (status === 'level_passed') {
        return NextResponse.json({ 
          error: '您的当前关卡已通过，等待管理员审核开启下一关' 
        }, { status: 400 });
      } else {
        return NextResponse.json({ 
          error: '您的申请已通过，请等待激活' 
        }, { status: 400 });
      }
    }

    // 检查星球币余额（使用配置中的报名费）
    const registrationFee = parseInt(configMap.registration_fee || '1000');
    
    // 简化处理：假设余额检查由前端处理，后端直接创建申请记录
    // 在实际生产环境中，这里应该从用户系统扣除星球币

    // 创建申请记录到Supabase
    const { data: insertResult, error: insertError } = await supabase
      .from('challenge_registrations')
      .insert({
        user_id: userId,
        status: 'pending',
        current_level: 1,
        completed_levels: '[]'
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return NextResponse.json({ 
        error: '申请失败', 
        details: insertError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '申请已提交，请等待管理员审核。审核通过后，我们会通过邮件通知您。',
      applicationId: insertResult?.id,
    });
  } catch (error) {
    console.error('Challenge application error:', error);
    return NextResponse.json({ 
      error: '申请失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// 获取状态提示消息
function getStatusMessage(status: string): string {
  const messages: Record<string, string> = {
    pending: '您的申请正在审核中，请耐心等待...',
    approved: '您的申请已通过！账户信息已分配，等待管理员激活...',
    active: '挑战进行中，祝您通关顺利！',
    level_passed: '恭喜通过当前关卡！等待管理员审核后开启下一关...',
    completed: '恭喜通关！您已完成全部10关挑战',
    failed: '挑战失败，但您可以重新申请',
    rejected: '申请被拒绝，您可以重新申请',
  };
  return messages[status] || '未知状态';
}
