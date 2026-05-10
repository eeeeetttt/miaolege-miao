import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

// AI角色配置
const AI_CHARACTERS = [
  { name: '金查理', email: 'ai_gold_charli@jinhuohuo.ai', personality: '沉稳老练的趋势追踪者', tradingStyle: '趋势跟踪', riskLevel: 0.6 },
  { name: '银威廉', email: 'ai_silver_william@jinhuohuo.ai', personality: '保守稳健的波段交易者', tradingStyle: '波段交易', riskLevel: 0.3 },
  { name: '铜麦克', email: 'ai_copper_mike@jinhuohuo.ai', personality: '激进的日内交易者', tradingStyle: '日内交易', riskLevel: 0.8 },
  { name: '铁托尼', email: 'ai_iron_tony@jinhuohuo.ai', personality: '务实的价值投资者', tradingStyle: '价值投资', riskLevel: 0.4 },
  { name: '铂金斯', email: 'ai_platinum_kins@jinhuohuo.ai', personality: '精密的量化交易者', tradingStyle: '量化交易', riskLevel: 0.5 },
  { name: '钨沃尔特', email: 'ai_tungsten_walter@jinhuohuo.ai', personality: '耐心的区间震荡交易者', tradingStyle: '震荡交易', riskLevel: 0.35 },
  { name: '锌齐格', email: 'ai_zinc_zig@jinhuohuo.ai', personality: '灵活的多策略交易者', tradingStyle: '多策略', riskLevel: 0.5 },
  { name: '铝亚历克斯', email: 'ai_aluminum_alex@jinhuohuo.ai', personality: '活跃的社区互动者', tradingStyle: '社区互动', riskLevel: 0.5 },
  { name: '钛特蕾莎', email: 'ai_titanium_teresa@jinhuohuo.ai', personality: '谨慎的对冲交易者', tradingStyle: '对冲交易', riskLevel: 0.45 },
  { name: '碳凯文', email: 'ai_carbon_kevin@jinhuohuo.ai', personality: '灵活的多策略交易者', tradingStyle: '多策略', riskLevel: 0.55 },
];

const INITIAL_COINS = 100000;
const ADMIN_EMAIL = '497209390@qq.com';

// 获取所有AI用户
async function getAllAIUsers() {
  const rows = await query('SELECT * FROM users WHERE role = ?', ['ai']);
  return rows || [];
}

// AI报告Bug给管理员
async function reportBugToAdmin(aiUser: any, bugContent: string) {
  try {
    // 获取管理员用户
    const adminUsers = await query(
      'SELECT user_id FROM users WHERE email = ?',
      [ADMIN_EMAIL]
    );
    const adminUser = adminUsers?.[0];

    if (!adminUser) {
      console.log(`[${aiUser.name}] 管理员用户不存在，无法发送Bug报告`);
      return false;
    }

    const conversationId = `bug_report_${aiUser.user_id}_${Date.now()}`;
    const content = `【Bug报告】来自 ${aiUser.name}：

${bugContent}

—— 来自 ${aiUser.name} 的自动报告 (${new Date().toLocaleString('zh-CN')})`;

    await query(
      `INSERT INTO private_messages (sender_id, receiver_id, sender_name, receiver_name, content, conversation_id, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
      [aiUser.user_id, adminUser.user_id, aiUser.name, '管理员', content, conversationId]
    );

    console.log(`[${aiUser.name}] Bug报告已发送给管理员`);
    return true;
  } catch (error) {
    console.error(`[${aiUser.name}] 发送Bug报告失败:`, error);
    return false;
  }
}

// 检查并报名挑战赛
async function checkAndJoinChallenge(aiUser: any) {
  try {
    // 检查是否已报名K线征途
    const existingRows = await query(
      'SELECT * FROM challenge_registrations WHERE user_id = ? AND match_type = ?',
      [aiUser.user_id, 'kline']
    );

    if (existingRows && existingRows.length > 0) {
      return { joined: false, reason: '已报名' };
    }

    // 检查是否有足够的星球币
    if (aiUser.coin_balance < 1000) {
      return { joined: false, reason: '星球币不足' };
    }

    // 扣除报名费并报名
    await query(
      'UPDATE users SET coin_balance = coin_balance - 1000 WHERE user_id = ?',
      [aiUser.user_id]
    );

    await query(
      `INSERT INTO challenge_registrations (user_id, match_type, entry_fee, status, created_at)
       VALUES (?, ?, ?, 'pending', NOW())`,
      [aiUser.user_id, 'kline', 1000]
    );

    return { joined: true };
  } catch (error) {
    console.error(`[${aiUser.name}] 报名挑战赛失败:`, error);
    return { joined: false, reason: '报名失败' };
  }
}

// 初始化AI用户
async function initializeAIUsers() {
  const results = [];
  const hashedPassword = await bcrypt.hash('ai123456', 10);

  for (const char of AI_CHARACTERS) {
    try {
      // 检查是否已存在
      const existing = await query(
        'SELECT * FROM users WHERE email = ?',
        [char.email]
      );

      if (existing && existing.length > 0) {
        // 更新已有用户
        await query(
          `UPDATE users SET name = ?, role = 'ai', coin_balance = ? WHERE email = ?`,
          [char.name, INITIAL_COINS, char.email]
        );
        results.push({ name: char.name, status: 'updated' });
      } else {
        // 创建新用户
        await query(
          `INSERT INTO users (user_id, email, password, name, avatar, coin_balance, role, created_at)
           VALUES (UUID(), ?, ?, ?, '/avatars/ai-default.png', ?, 'ai', NOW())`,
          [char.email, hashedPassword, char.name, INITIAL_COINS]
        );
        results.push({ name: char.name, status: 'created' });
      }
    } catch (error) {
      console.error(`初始化AI用户 ${char.name} 失败:`, error);
      results.push({ name: char.name, status: 'failed', error: String(error) });
    }
  }

  return results;
}

// 获取AI用户状态
async function getAIUsersStatus() {
  const aiUsers = await getAllAIUsers();
  const statusList = [];

  for (const user of aiUsers) {
    // 获取交易风格
    const roleRows = await query(
      'SELECT * FROM chat_hall_ai_roles WHERE name = ?',
      [user.name]
    );
    const role = roleRows?.[0] || null;

    // 获取挑战状态
    const challengeRows = await query(
      'SELECT * FROM challenge_registrations WHERE user_id = ? AND match_type = ? ORDER BY created_at DESC LIMIT 1',
      [user.user_id, 'kline']
    );
    const challenge = challengeRows?.[0] || null;

    // 获取账户余额
    const accountRows = await query(
      'SELECT current_balance FROM match_accounts WHERE user_id = ? AND match_type = ? AND status = ? ORDER BY created_at DESC LIMIT 1',
      [user.user_id, 'kline', 'active']
    );
    const accountBalance = accountRows?.[0]?.current_balance || 0;

    statusList.push({
      userId: user.user_id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      coinBalance: user.coin_balance,
      tradingStyle: role?.trading_style || role?.system_prompt?.substring(0, 20) || '未设置',
      challengeStatus: challenge?.status || '未报名',
      accountBalance,
    });
  }

  return statusList;
}

// API路由
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'init') {
      // 初始化AI用户
      const results = await initializeAIUsers();
      return NextResponse.json({
        success: true,
        message: `初始化完成`,
        results,
      });
    }

    if (action === 'join') {
      // AI报名挑战
      const aiUsers = await getAllAIUsers();
      const results = [];

      for (const user of aiUsers) {
        const result = await checkAndJoinChallenge(user);
        results.push({
          name: user.name,
          ...result,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'AI报名完成',
        results,
      });
    }

    if (action === 'report') {
      // AI报告Bug
      const { aiUserId, bugContent } = await request.json();
      const aiUsers = await getAllAIUsers();
      const aiUser = aiUsers.find((u: any) => u.user_id === aiUserId);

      if (!aiUser) {
        return NextResponse.json({ success: false, error: 'AI用户不存在' });
      }

      const result = await reportBugToAdmin(aiUser, bugContent);
      return NextResponse.json({
        success: result,
        message: result ? 'Bug报告已发送' : '发送失败',
      });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error) {
    console.error('AI Active error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// 获取AI用户状态
export async function GET() {
  try {
    const status = await getAIUsersStatus();
    // 转换格式以匹配前端期望
    const aiUsers = status.map((user: any) => ({
      name: user.name,
      coins: user.coinBalance,
      tradingStyle: user.tradingStyle,
      registration: user.challengeStatus ? { status: user.challengeStatus } : null,
      account: user.accountBalance ? { balance: user.accountBalance } : null,
    }));
    return NextResponse.json({ success: true, aiUsers });
  } catch (error) {
    console.error('Get AI status error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
