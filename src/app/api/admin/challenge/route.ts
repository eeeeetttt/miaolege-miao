import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 自动初始化默认配置
async function ensureDefaultConfig(supabase: NonNullable<ReturnType<typeof getSupabaseClient>>) {
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
        { config_key: 'fail_balance', config_value: '100', description: '失败底线净值（低于此值判定失败）' },
        { config_key: 'target_balance', config_value: '2000', description: '通关目标净值' },
        { config_key: 'profit_target', config_value: '1000', description: '通关盈利目标' },
        { config_key: 'show_leaderboard', config_value: 'true', description: '是否显示挑战进度榜' },
        { config_key: 'completion_reward', config_value: '100000', description: '通关奖励金额（星球币）' },
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

    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

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

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }
    
    const body = await request.json();
    const { action, registrationId, serverName, tradingAccount, tradingPassword } = body;

    // 配置操作不需要 registrationId
    const configActions = ['updateConfig', 'initConfig', 'initLevels', 'updateLevelConfig', 'updateDescription'];
    
    if (!configActions.includes(action) && !registrationId) {
      return NextResponse.json({ error: '缺少申请ID' }, { status: 400 });
    }

    // updateConfig - 更新配置
    if (action === 'updateConfig') {
      const { configKey, configValue } = body;
      if (!configKey || configValue === undefined) {
        return NextResponse.json({ error: '缺少配置参数' }, { status: 400 });
      }

      // 检查配置是否存在
      const { data: existingConfig } = await supabase
        .from('challenge_config')
        .select('config_key')
        .eq('config_key', configKey)
        .maybeSingle();

      if (existingConfig) {
        const { error: updateError } = await supabase
          .from('challenge_config')
          .update({ config_value: String(configValue) })
          .eq('config_key', configKey);

        if (updateError) {
          console.error('Update config error:', updateError);
          return NextResponse.json({ error: '配置更新失败' }, { status: 500 });
        }
      } else {
        const { error: insertError } = await supabase
          .from('challenge_config')
          .insert({ config_key: configKey, config_value: String(configValue) });

        if (insertError) {
          console.error('Insert config error:', insertError);
          return NextResponse.json({ error: '配置保存失败' }, { status: 500 });
        }
      }

      return NextResponse.json({ success: true, message: '配置已保存' });
    }

    // updateLevelConfig - 更新关卡配置
    if (action === 'updateLevelConfig') {
      const { level, name, description, targetBalance, initialBalance, failBalance, reward } = body;
      if (!level) {
        return NextResponse.json({ error: '缺少关卡参数' }, { status: 400 });
      }

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (targetBalance !== undefined) updateData.target_balance = targetBalance;
      if (initialBalance !== undefined) updateData.initial_balance = initialBalance;
      if (failBalance !== undefined) updateData.fail_balance = failBalance;
      if (reward !== undefined) updateData.reward = reward;

      const { error: updateError } = await supabase
        .from('challenge_level_config')
        .update(updateData)
        .eq('level', level);

      if (updateError) {
        console.error('Update level config error:', updateError);
        return NextResponse.json({ error: '关卡配置更新失败' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: '关卡配置已保存' });
    }

    // updateDescription - 更新比赛说明
    if (action === 'updateDescription') {
      const { description } = body;

      // 先尝试更新
      const { data: updateData, error: updateError } = await supabase
        .from('challenge_config')
        .update({ config_value: description })
        .eq('config_key', 'description')
        .select();

      // 如果没有找到记录，则插入
      if (updateError || !updateData || updateData.length === 0) {
        const { error: insertError } = await supabase
          .from('challenge_config')
          .insert({ config_key: 'description', config_value: description });

        if (insertError) {
          console.error('Save description error:', insertError);
          return NextResponse.json({ error: '比赛说明保存失败' }, { status: 500 });
        }
      } else if (updateError) {
        console.error('Update description error:', updateError);
        return NextResponse.json({ error: '比赛说明保存失败' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: '比赛说明已保存' });
    }

    // initConfig - 初始化默认配置
    if (action === 'initConfig') {
      const defaultConfigs = [
        { config_key: 'registration_fee', config_value: '1000', description: '报名费（星球币）' },
        { config_key: 'email_notification', config_value: 'true', description: '是否启用邮件通知' },
        { config_key: 'challenge_enabled', config_value: 'true', description: '挑战赛是否启用' },
      ];

      for (const config of defaultConfigs) {
        const { data: existing } = await supabase
          .from('challenge_config')
          .select('config_key')
          .eq('config_key', config.config_key)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('challenge_config')
            .update({ config_value: config.config_value })
            .eq('config_key', config.config_key);
        } else {
          await supabase
            .from('challenge_config')
            .insert(config);
        }
      }

      return NextResponse.json({ success: true, message: '配置已初始化' });
    }

    // initLevels - 初始化关卡配置
    if (action === 'initLevels') {
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

      for (const level of defaultLevels) {
        const { data: existing } = await supabase
          .from('challenge_level_config')
          .select('level')
          .eq('level', level.level)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('challenge_level_config')
            .update(level)
            .eq('level', level.level);
        } else {
          await supabase
            .from('challenge_level_config')
            .insert(level);
        }
      }

      return NextResponse.json({ success: true, message: '关卡配置已初始化' });
    }

    // 以下操作需要 registrationId
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
          mt_account_id: null,
        })
        .eq('id', registrationId);

      if (updateError) {
        console.error('Update error:', updateError);
        return NextResponse.json({ error: '更新失败' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: '审核已通过' });

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

    } else if (action === 'advanceLevel') {
      // 开启下一关
      const currentLevel = registration.current_level;
      const completedLevels = registration.completed_levels 
        ? JSON.parse(registration.completed_levels) 
        : [];
      
      if (!completedLevels.includes(currentLevel)) {
        completedLevels.push(currentLevel);
      }
      
      const nextLevel = currentLevel + 1;
      
      if (nextLevel > 10) {
        const { error: updateError } = await supabase
          .from('challenge_registrations')
          .update({
            status: 'completed',
            completed_levels: JSON.stringify(completedLevels),
            completed_at: new Date().toISOString(),
          })
          .eq('id', registrationId);
  
        if (updateError) {
          console.error('Update error:', updateError);
          return NextResponse.json({ error: '更新失败' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: '恭喜！已完成全部关卡！' });
      }
      
      const { error: updateError } = await supabase
        .from('challenge_registrations')
        .update({
          status: 'active',
          current_level: nextLevel,
          completed_levels: JSON.stringify(completedLevels),
        })
        .eq('id', registrationId);

      if (updateError) {
        console.error('Update error:', updateError);
        return NextResponse.json({ error: '更新失败' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: `已开启第${nextLevel}关` });

    } else if (action === 'rejectLevel') {
      // 拒绝通过当前关卡
      const { error: updateError } = await supabase
        .from('challenge_registrations')
        .update({
          status: 'active',
        })
        .eq('id', registrationId);

      if (updateError) {
        console.error('Update error:', updateError);
        return NextResponse.json({ error: '更新失败' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: '已拒绝，当前关卡继续' });

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
