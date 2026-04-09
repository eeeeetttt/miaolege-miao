import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 自动初始化默认配置
async function ensureDefaultConfig(supabase: ReturnType<typeof getSupabaseClient>) {
  try {
    // 检查配置是否存在
    const { data: configRows } = await supabase
      .from('challenge_config')
      .select('config_key')
      .limit(1);

    // 如果没有配置，初始化默认配置
    if (!configRows || configRows.length === 0) {
      const defaultConfigs = [
        { config_key: 'registration_fee', config_value: '1000', description: '报名费（星球币）' },
        { config_key: 'email_notification', config_value: 'true', description: '是否启用邮件通知' },
        { config_key: 'challenge_enabled', config_value: 'true', description: '挑战赛是否启用' },
      ];
      await supabase.from('challenge_config').insert(defaultConfigs);
    }

    // 检查关卡配置是否存在
    const { data: levelRows } = await supabase
      .from('challenge_level_config')
      .select('level')
      .limit(1);

    // 如果没有关卡配置，初始化默认关卡
    if (!levelRows || levelRows.length === 0) {
      const defaultLevels = [
        { level: 1, name: '启念', description: '开始你的交易之旅', target_balance: 2000, initial_balance: 1000, fail_balance: 100, reward: '继续挑战', is_active: true },
        { level: 2, name: '立规', description: '建立交易规则', target_balance: 2000, initial_balance: 1000, fail_balance: 100, reward: '继续挑战', is_active: true },
        { level: 3, name: '守戒', description: '遵守交易纪律', target_balance: 2000, initial_balance: 1000, fail_balance: 100, reward: '继续挑战', is_active: true },
        { level: 4, name: '忍痛', description: '学会止损止盈', target_balance: 2000, initial_balance: 1000, fail_balance: 100, reward: '继续挑战', is_active: true },
        { level: 5, name: '止喜', description: '控制情绪波动', target_balance: 2000, initial_balance: 1000, fail_balance: 100, reward: '继续挑战', is_active: true },
        { level: 6, name: '观己', description: '认识自我弱点', target_balance: 2000, initial_balance: 1000, fail_balance: 100, reward: '继续挑战', is_active: true },
        { level: 7, name: '破执', description: '突破固有思维', target_balance: 2000, initial_balance: 1000, fail_balance: 100, reward: '继续挑战', is_active: true },
        { level: 8, name: '随势', description: '顺势而为', target_balance: 2000, initial_balance: 1000, fail_balance: 100, reward: '继续挑战', is_active: true },
        { level: 9, name: '忘我', description: '达到交易境界', target_balance: 2000, initial_balance: 1000, fail_balance: 100, reward: '继续挑战', is_active: true },
        { level: 10, name: '得道', description: '完成终极挑战', target_balance: 2000, initial_balance: 1000, fail_balance: 100, reward: '通关大奖', is_active: true },
      ];
      await supabase.from('challenge_level_config').insert(defaultLevels);
    }
  } catch (error) {
    console.error('初始化默认配置失败:', error);
  }
}

// 获取挑战赛申请列表
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const supabase = getSupabaseClient();

    // 自动初始化默认配置
    await ensureDefaultConfig(supabase);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, approved, active, completed, failed, rejected
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 构建查询
    let query = supabase
      .from('challenge_registrations')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: registrations, error: regError, count } = await query;

    if (regError) {
      console.error('Supabase query error:', regError);
      return NextResponse.json({ 
        error: '获取列表失败', 
        details: regError.message 
      }, { status: 500 });
    }

    // 获取配置
    const { data: configRows, error: configError } = await supabase
      .from('challenge_config')
      .select('config_key, config_value');

    const configMap: Record<string, string> = {};
    if (configRows && !configError) {
      for (const cfg of configRows) {
        configMap[cfg.config_key] = cfg.config_value;
      }
    }

    // 获取关卡配置
    const { data: levelRows, error: levelError } = await supabase
      .from('challenge_level_config')
      .select('level, name, description, target_balance, initial_balance, fail_balance, reward, is_active')
      .eq('is_active', true)
      .order('level');

    const levelConfigs = levelRows?.map(row => ({
      id: row.level,
      level: row.level,
      name: row.name,
      description: row.description,
      targetBalance: row.target_balance,
      initialBalance: row.initial_balance,
      failBalance: row.fail_balance,
      reward: row.reward,
      isActive: row.is_active,
    })) || [];

    // 格式化返回数据 - 匹配前端期望的嵌套结构
    const formattedList = registrations?.map(reg => ({
      registration: {
        id: reg.id,
        userId: reg.user_id,
        status: reg.status,
        currentLevel: reg.current_level,
        completedLevels: reg.completed_levels ? JSON.parse(reg.completed_levels) : [],
        startedAt: reg.started_at,
        completedAt: reg.completed_at,
        failedAt: reg.failed_at,
        failedLevel: reg.failed_level,
        totalDuration: reg.total_duration,
        serverName: reg.server_name,
        tradingAccount: reg.trading_account,
        tradingPassword: reg.trading_password,
        mtAccountId: reg.mt_account_id,
        createdAt: reg.created_at,
      },
      user: null // 用户信息需要单独查询，目前为空
    })) || [];

    return NextResponse.json({
      list: formattedList,
      total: count || 0,
      config: configMap,
      levelConfigs,
    });
  } catch (error) {
    console.error('获取挑战赛列表失败:', error);
    return NextResponse.json({ 
      error: '获取列表失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// 更新挑战赛申请状态
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 检查是否为管理员
    // TODO: 实际生产环境中需要检查用户角色

    const supabase = getSupabaseClient();
    const body = await request.json();
    const { action, registrationId, serverName, tradingAccount, tradingPassword } = body;

    if (!registrationId) {
      return NextResponse.json({ error: '缺少申请ID' }, { status: 400 });
    }

    // 获取申请记录
    const { data: registration, error: getError } = await supabase
      .from('challenge_registrations')
      .select('*')
      .eq('id', registrationId)
      .single();

    if (getError || !registration) {
      return NextResponse.json({ error: '申请记录不存在' }, { status: 404 });
    }

    if (action === 'approve') {
      // 审核通过 - 需要填写服务器和账号信息
      if (!serverName || !tradingAccount || !tradingPassword) {
        return NextResponse.json({ error: '审核通过需要填写服务器、账号和密码' }, { status: 400 });
      }

      // 更新申请状态为approved（待激活）
      const { error: updateError } = await supabase
        .from('challenge_registrations')
        .update({
          status: 'approved',
          server_name: serverName,
          trading_account: tradingAccount,
          trading_password: tradingPassword,
          mt_account_id: null, // 可选：关联MT账户
        })
        .eq('id', registrationId);

      if (updateError) {
        console.error('Update error:', updateError);
        return NextResponse.json({ error: '更新失败' }, { status: 500 });
      }

      // TODO: 发送邮件通知

      return NextResponse.json({ 
        success: true, 
        message: '审核已通过' 
      });

    } else if (action === 'reject') {
      // 审核拒绝
      const { error: updateError } = await supabase
        .from('challenge_registrations')
        .update({
          status: 'rejected',
        })
        .eq('id', registrationId);

      if (updateError) {
        console.error('Update error:', updateError);
        return NextResponse.json({ error: '更新失败' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: '已拒绝申请' });

    } else if (action === 'activate') {
      // 激活挑战（审核通过后，点击激活开始挑战）
      const { error: updateError } = await supabase
        .from('challenge_registrations')
        .update({
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .eq('id', registrationId);

      if (updateError) {
        console.error('Update error:', updateError);
        return NextResponse.json({ error: '更新失败' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: '挑战已激活' });

    } else if (action === 'fail') {
      // 标记挑战失败
      const { error: updateError } = await supabase
        .from('challenge_registrations')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
        })
        .eq('id', registrationId);

      if (updateError) {
        console.error('Update error:', updateError);
        return NextResponse.json({ error: '更新失败' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: '挑战已标记为失败' });

    } else if (action === 'complete') {
      // 标记挑战完成
      const { error: updateError } = await supabase
        .from('challenge_registrations')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', registrationId);

      if (updateError) {
        console.error('Update error:', updateError);
        return NextResponse.json({ error: '更新失败' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: '挑战已标记为完成' });

    } else if (action === 'reset') {
      // 重置挑战（允许重新报名）
      const { error: updateError } = await supabase
        .from('challenge_registrations')
        .update({
          status: 'pending',
          current_level: 1,
          completed_levels: '[]',
          started_at: null,
          completed_at: null,
          failed_at: null,
          failed_level: null,
          total_duration: null,
          server_name: null,
          trading_account: null,
          trading_password: null,
          mt_account_id: null,
        })
        .eq('id', registrationId);

      if (updateError) {
        console.error('Update error:', updateError);
        return NextResponse.json({ error: '更新失败' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: '挑战已重置' });

    } else if (action === 'updateConfig') {
      // 更新配置
      const { configKey, configValue } = body;
      if (!configKey || configValue === undefined) {
        return NextResponse.json({ error: '缺少配置参数' }, { status: 400 });
      }

      // 使用upsert更新配置
      const { error: upsertError } = await supabase
        .from('challenge_config')
        .upsert({
          config_key: configKey,
          config_value: String(configValue),
        }, {
          onConflict: 'config_key',
        });

      if (upsertError) {
        console.error('Upsert error:', upsertError);
        return NextResponse.json({ error: '配置更新失败' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: '配置已更新' });

    } else if (action === 'initConfig') {
      // 初始化默认配置
      const defaultConfigs = [
        { config_key: 'registration_fee', config_value: '1000', description: '报名费（星球币）' },
        { config_key: 'email_notification', config_value: 'true', description: '是否启用邮件通知' },
        { config_key: 'challenge_enabled', config_value: 'true', description: '挑战赛是否启用' },
      ];

      const { error: insertError } = await supabase
        .from('challenge_config')
        .upsert(defaultConfigs, { onConflict: 'config_key' });

      if (insertError) {
        console.error('Init config error:', insertError);
        return NextResponse.json({ error: '配置初始化失败' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: '配置已初始化' });

    } else if (action === 'initLevels') {
      // 初始化关卡配置
      const defaultLevels = [
        { level: 1, name: '启念', description: '开始你的交易之旅', target_balance: 2000, initial_balance: 1000, fail_balance: 100, reward: '继续挑战', is_active: true },
        { level: 2, name: '立规', description: '建立交易规则', target_balance: 2000, initial_balance: 1000, fail_balance: 100, reward: '继续挑战', is_active: true },
        { level: 3, name: '守戒', description: '遵守交易纪律', target_balance: 2000, initial_balance: 1000, fail_balance: 100, reward: '继续挑战', is_active: true },
        { level: 4, name: '忍痛', description: '学会止损止盈', target_balance: 2000, initial_balance: 1000, fail_balance: 100, reward: '继续挑战', is_active: true },
        { level: 5, name: '止喜', description: '控制情绪波动', target_balance: 2000, initial_balance: 1000, fail_balance: 100, reward: '继续挑战', is_active: true },
        { level: 6, name: '观己', description: '认识自我弱点', target_balance: 2000, initial_balance: 1000, fail_balance: 100, reward: '继续挑战', is_active: true },
        { level: 7, name: '破执', description: '突破固有思维', target_balance: 2000, initial_balance: 1000, fail_balance: 100, reward: '继续挑战', is_active: true },
        { level: 8, name: '随势', description: '顺势而为', target_balance: 2000, initial_balance: 1000, fail_balance: 100, reward: '继续挑战', is_active: true },
        { level: 9, name: '忘我', description: '达到交易境界', target_balance: 2000, initial_balance: 1000, fail_balance: 100, reward: '继续挑战', is_active: true },
        { level: 10, name: '得道', description: '完成终极挑战', target_balance: 2000, initial_balance: 1000, fail_balance: 100, reward: '通关大奖', is_active: true },
      ];

      const { error: insertError } = await supabase
        .from('challenge_level_config')
        .upsert(defaultLevels, { onConflict: 'level' });

      if (insertError) {
        console.error('Init levels error:', insertError);
        return NextResponse.json({ error: '关卡配置初始化失败' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: '关卡配置已初始化' });

    } else {
      return NextResponse.json({ error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('更新挑战赛状态失败:', error);
    return NextResponse.json({ 
      error: '操作失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
