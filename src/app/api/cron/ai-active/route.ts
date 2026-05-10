import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { pool } from '@/lib/db';
import bcrypt from 'bcryptjs';

// AI角色配置
const AI_CHARACTERS = [
  { name: '金查理', role: 'ai_gold_charli', personality: '沉稳老练的趋势追踪者', tradingStyle: '趋势跟踪', riskLevel: 0.6 },
  { name: '银威廉', role: 'ai_silver_william', personality: '保守稳健的波段交易者', tradingStyle: '波段交易', riskLevel: 0.3 },
  { name: '铜麦克', role: 'ai_copper_mike', personality: '激进的日内交易者', tradingStyle: '日内交易', riskLevel: 0.8 },
  { name: '铁托尼', role: 'ai_iron_tony', personality: '务实的价值投资者', tradingStyle: '价值投资', riskLevel: 0.4 },
  { name: '铂金斯', role: 'ai_platinum_kins', personality: '精密的量化交易者', tradingStyle: '量化交易', riskLevel: 0.5 },
  { name: '钨沃尔特', role: 'ai_tungsten_walter', personality: '耐心的区间震荡交易者', tradingStyle: '震荡交易', riskLevel: 0.35 },
  { name: '锌齐格', role: 'ai_zinc_zig', personality: '灵活的多策略交易者', tradingStyle: '多策略', riskLevel: 0.5 },
  { name: '钛汤姆', role: 'ai_titan_tom', personality: '坚定的突破交易者', tradingStyle: '突破交易', riskLevel: 0.7 },
  { name: '铬克里斯', role: 'ai_chrome_chris', personality: '冷静的对冲交易者', tradingStyle: '对冲交易', riskLevel: 0.45 },
  { name: '镍娜拉', role: 'ai_nickel_nora', personality: '直觉敏锐的盘感交易者', tradingStyle: '盘感交易', riskLevel: 0.65 },
];

const INITIAL_COINS = 100000;
const ADMIN_EMAIL = '497209390@qq.com';

// 获取所有AI用户
async function getAllAIUsers(supabase: any) {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'ai');
  return data || [];
}

// AI报告Bug给管理员
async function reportBugToAdmin(supabase: any, aiUser: any, bugContent: string) {
  // 获取管理员用户
  const { data: adminUser } = await supabase
    .from('users')
    .select('user_id')
    .eq('email', ADMIN_EMAIL)
    .single();

  if (!adminUser) {
    console.log(`[${aiUser.name}] 管理员用户不存在，无法发送Bug报告`);
    return false;
  }

  const conversationId = `bug_report_${aiUser.user_id}_${Date.now()}`;

  const { error } = await supabase.from('private_messages').insert({
    sender_id: aiUser.user_id,
    receiver_id: adminUser.user_id,
    sender_name: aiUser.name,
    receiver_name: '管理员',
    content: `【Bug报告】来自 ${aiUser.name}：

${bugContent}

—— 来自 ${aiUser.name} 的自动报告 (${new Date().toLocaleString('zh-CN')})`,
    conversation_id: conversationId,
    is_read: false,
  });

  if (error) {
    console.error(`[${aiUser.name}] 发送Bug报告失败:`, error);
    return false;
  }

  console.log(`[${aiUser.name}] Bug报告已发送给管理员`);
  return true;
}

// 检查并报名挑战赛
async function checkAndJoinChallenge(pool: any, supabase: any, aiUser: any) {
  try {
    // 检查是否已报名K线征途
    const [existingRows] = await pool.query(
      'SELECT * FROM challenge_registrations WHERE user_id = ? AND match_type = ?',
      [aiUser.user_id, 'kline']
    );

    if (existingRows.length > 0) {
      return { joined: false, reason: 'already_joined' };
    }

    // 检查金币是否足够（报名费1000金币）
    if (aiUser.coin_balance < 1000) {
      await reportBugToAdmin(supabase, aiUser, `【金币不足】无法报名挑战赛！当前金币: ${aiUser.coin_balance}，需要: 1000`);
      return { joined: false, reason: 'insufficient_coins' };
    }

    // 报名K线征途
    const [result] = await pool.query(
      `INSERT INTO challenge_registrations 
       (user_id, user_name, match_type, status, registered_at) 
       VALUES (?, ?, ?, ?, NOW())`,
      [aiUser.user_id, aiUser.name, 'kline', 'pending']
    );

    // 扣除报名费
    await pool.query(
      'UPDATE users SET coin_balance = coin_balance - 1000 WHERE user_id = ?',
      [aiUser.user_id]
    );

    console.log(`[${aiUser.name}] 成功报名K线征途`);
    return { joined: true, registrationId: result.insertId };
  } catch (error: any) {
    console.error(`[${aiUser.name}] 报名失败:`, error);
    await reportBugToAdmin(supabase, aiUser, `【报名失败】尝试报名K线征途时出错:\n${error.message}\n\n堆栈:\n${error.stack}`);
    return { joined: false, reason: 'error', error: error.message };
  }
}

// AI自主交易
async function performTrade(pool: any, supabase: any, aiUser: any, config: any) {
  try {
    // 获取当前活跃账户
    const [accounts] = await pool.query(
      `SELECT * FROM match_accounts 
       WHERE user_id = ? AND match_type = 'kline' AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
      [aiUser.user_id]
    );

    if (accounts.length === 0) {
      return { traded: false, reason: 'no_active_account' };
    }

    const account = accounts[0];
    const currentBalance = account.balance;

    // 根据风险等级决定仓位大小
    const maxLots = Math.floor(currentBalance / 100); // 每手100银两
    const lots = Math.max(1, Math.floor(maxLots * config.riskLevel * (0.5 + Math.random())));

    // 根据交易风格决定方向
    let direction = 'long';
    const rand = Math.random();
    
    if (config.tradingStyle === '趋势跟踪') {
      direction = rand > 0.4 ? 'long' : 'short';
    } else if (config.tradingStyle === '震荡交易') {
      direction = rand > 0.5 ? 'long' : 'short';
    } else if (config.tradingStyle === '日内交易') {
      direction = rand > 0.45 ? 'long' : 'short';
    } else {
      direction = rand > 0.5 ? 'long' : 'short';
    }

    // 计算盈亏 (-1% 到 +1% 之间)
    const profitPercent = (Math.random() - 0.45) * 0.02 * config.riskLevel; // 略微偏向亏损
    const profit = lots * 100 * profitPercent;
    const newBalance = currentBalance + profit;

    // 记录交易
    await pool.query(
      `INSERT INTO match_trade_records 
       (user_id, match_type, match_id, action, direction, lots, profit, balance_after, created_at)
       VALUES (?, 'kline', ?, 'trade', ?, ?, ?, ?, NOW())`,
      [aiUser.user_id, account.id, direction, lots, profit.toFixed(2), newBalance.toFixed(2)]
    );

    // 更新账户余额
    await pool.query(
      'UPDATE match_accounts SET balance = ? WHERE id = ?',
      [newBalance.toFixed(2), account.id]
    );

    const result = profit >= 0 ? '盈利' : '亏损';
    console.log(`[${aiUser.name}] ${direction === 'long' ? '做多' : '做空'} ${lots}手，${result}: ${Math.abs(profit).toFixed(2)}银两，当前余额: ${newBalance.toFixed(2)}`);

    // 检查是否爆仓
    if (newBalance < 100) {
      await pool.query(
        'UPDATE challenge_registrations SET status = ? WHERE user_id = ? AND match_type = ?',
        ['failed', aiUser.user_id, 'kline']
      );
      await reportBugToAdmin(supabase, aiUser, `【挑战失败】账户余额低于底线！\n当前余额: ${newBalance.toFixed(2)}银两\n底线: 100银两\n\n交易风格: ${config.tradingStyle}\n总交易次数: 待统计`);
      console.log(`[${aiUser.name}] 挑战失败，余额低于底线`);
    }

    // 检查是否通关
    if (newBalance >= 2000) {
      await pool.query(
        'UPDATE challenge_registrations SET status = ?, completed_at = NOW() WHERE user_id = ? AND match_type = ?',
        ['completed', aiUser.user_id, 'kline']
      );
      // 奖励金币
      await pool.query(
        'UPDATE users SET coin_balance = coin_balance + 5000 WHERE user_id = ?',
        [aiUser.user_id]
      );
      await reportBugToAdmin(supabase, aiUser, `【🎉 通关成功！】${aiUser.name} 成功通关K线征途！\n最终余额: ${newBalance.toFixed(2)}银两\n获得通关奖励: 5000金币\n\n交易风格: ${config.tradingStyle}`);
      console.log(`[${aiUser.name}] 通关成功！`);
    }

    return { traded: true, direction, lots, profit, newBalance };
  } catch (error: any) {
    console.error(`[${aiUser.name}] 交易失败:`, error);
    await reportBugToAdmin(supabase, aiUser, `【交易失败】执行交易时出错:\n${error.message}`);
    return { traded: false, reason: 'error', error: error.message };
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接失败' }, { status: 500 });
    }
    if (!pool) {
      return NextResponse.json({ error: '数据库连接池初始化失败' }, { status: 500 });
    }
    const { action, aiName, simulate } = await request.json();

    if (action === 'init') {
      // 初始化所有AI用户
      const results = [];

      for (const character of AI_CHARACTERS) {
        const email = `${character.role}@jinhuohuo.ai`;
        const password = `ai_${character.role}_password_2024`;

        // 检查用户是否已存在
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();

        if (existingUser) {
          // 更新金币
          await pool.query(
            'UPDATE users SET coin_balance = ? WHERE user_id = ?',
            [INITIAL_COINS, existingUser.user_id]
          );
          results.push({
            name: character.name,
            status: 'updated',
            userId: existingUser.user_id,
            coins: INITIAL_COINS,
          });
        } else {
          // 创建新用户
          const hashedPassword = await bcrypt.hash(password, 10);
          const { data: newUser, error } = await supabase
            .from('users')
            .insert({
              email,
              name: character.name,
              password: hashedPassword,
              coin_balance: INITIAL_COINS,
              role: 'ai',
            })
            .select('user_id')
            .single();

          if (error) {
            results.push({
              name: character.name,
              status: 'error',
              error: error.message,
            });
          } else {
            results.push({
              name: character.name,
              status: 'created',
              userId: newUser.user_id,
              coins: INITIAL_COINS,
            });
          }
        }

        // 创建/更新AI角色配置
        const { data: existingRole } = await supabase
          .from('chat_hall_ai_roles')
          .select('id')
          .eq('name', character.name)
          .single();

        if (!existingRole) {
          await supabase.from('chat_hall_ai_roles').insert({
            name: character.name,
            enabled: true,
            reply_probability: 30 + Math.floor(Math.random() * 40),
            max_response_length: 200,
            system_prompt: `你是${character.name}，${character.personality}。你是金火火交易平台的AI交易员。你的交易风格是${character.tradingStyle}。你说话直接专业，喜欢用数据说话。`,
            trigger_keyword: character.name,
            sort_order: AI_CHARACTERS.indexOf(character),
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'AI用户初始化完成',
        results,
        summary: {
          total: AI_CHARACTERS.length,
          coinsEach: INITIAL_COINS,
        },
      });
    }

    if (action === 'join_challenge') {
      // 让所有AI报名挑战赛
      const aiUsers = await getAllAIUsers(supabase);
      const results = [];

      for (const aiUser of aiUsers) {
        const config = AI_CHARACTERS.find(c => c.name === aiUser.name);
        const result = await checkAndJoinChallenge(pool, supabase, aiUser);
        results.push({
          name: aiUser.name,
          ...result,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'AI挑战赛报名完成',
        results,
      });
    }

    if (action === 'trade') {
      // AI执行交易
      const aiUsers = await getAllAIUsers(supabase);
      const results = [];

      for (const aiUser of aiUsers) {
        // 随机决定是否交易（70%概率）
        if (!simulate && Math.random() > 0.7) {
          results.push({ name: aiUser.name, traded: false, reason: 'random_skip' });
          continue;
        }

        const config = AI_CHARACTERS.find(c => c.name === aiUser.name) || AI_CHARACTERS[0];
        const result = await performTrade(pool, supabase, aiUser, config);
        results.push({
          name: aiUser.name,
          ...result,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'AI交易完成',
        results,
      });
    }

    if (action === 'status') {
      // 查看AI状态
      const aiUsers = await getAllAIUsers(supabase);
      const aiStatus = [];

      for (const aiUser of aiUsers) {
        const config = AI_CHARACTERS.find(c => c.name === aiUser.name);

        // 检查报名状态
        const registrationsResult = await pool.query(
          'SELECT * FROM challenge_registrations WHERE user_id = ? AND match_type = ? ORDER BY registered_at DESC LIMIT 1',
          [aiUser.user_id, 'kline']
        ) as any;
        const registrations = Array.isArray(registrationsResult) ? registrationsResult[0] : registrationsResult;

        // 检查账户状态
        const accountsResult = await pool.query(
          'SELECT * FROM match_accounts WHERE user_id = ? AND match_type = ? ORDER BY created_at DESC LIMIT 1',
          [aiUser.user_id, 'kline']
        ) as any;
        const accounts = Array.isArray(accountsResult) ? accountsResult[0] : accountsResult;

        aiStatus.push({
          name: aiUser.name,
          coins: aiUser.coin_balance,
          tradingStyle: config?.tradingStyle || '未知',
          registration: registrations[0] || null,
          account: accounts[0] || null,
        });
      }

      return NextResponse.json({
        success: true,
        aiUsers: aiStatus,
      });
    }

    if (action === 'report_bug') {
      // 单个AI报告Bug
      const { aiUserId, content } = await request.json();

      if (!aiUserId || !content) {
        return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
      }

      const { data: aiUser } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', aiUserId)
        .single();

      if (!aiUser) {
        return NextResponse.json({ error: 'AI用户不存在' }, { status: 400 });
      }

      const sent = await reportBugToAdmin(supabase, aiUser, content);

      return NextResponse.json({
        success: sent,
        message: sent ? 'Bug报告已发送' : '发送失败',
      });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error: any) {
    console.error('AI自主行为API错误:', error);
    return NextResponse.json(
      { error: '服务器错误', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接失败' }, { status: 500 });
    }

    // 获取AI状态
    const { data: aiUsers } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'ai');

    return NextResponse.json({
      success: true,
      aiUsers: aiUsers || [],
    });
  } catch (error: any) {
    console.error('AI状态API错误:', error);
    return NextResponse.json(
      { error: '服务器错误', details: error.message },
      { status: 500 }
    );
  }
}
