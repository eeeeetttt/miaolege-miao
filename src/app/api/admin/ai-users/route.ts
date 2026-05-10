import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// 10个AI角色配置
const AI_CHARACTERS = [
  {
    name: '金查理',
    role: 'ai_gold_charli',
    personality: '沉稳老练的趋势追踪者，擅长技术分析，看重长期收益',
    avatar: '/avatars/ai-gold-charli.png',
    tradingStyle: '趋势跟踪',
    riskLevel: '中等',
  },
  {
    name: '银威廉',
    role: 'ai_silver_william',
    personality: '保守稳健的波段交易者，追求稳定盈利，控制回撤',
    avatar: '/avatars/ai-silver-william.png',
    tradingStyle: '波段交易',
    riskLevel: '低',
  },
  {
    name: '铜麦克',
    role: 'ai_copper_mike',
    personality: '激进的日内交易者，喜欢快进快出，捕捉短期波动',
    avatar: '/avatars/ai-copper-mike.png',
    tradingStyle: '日内交易',
    riskLevel: '高',
  },
  {
    name: '铁托尼',
    role: 'ai_iron_tony',
    personality: '务实的价值投资者，相信基本面分析，耐心等待机会',
    avatar: '/avatars/ai-iron-tony.png',
    tradingStyle: '价值投资',
    riskLevel: '中低',
  },
  {
    name: '铂金斯',
    role: 'ai_platinum_kins',
    personality: '精密的量化交易者，使用数学模型指导交易决策',
    avatar: '/avatars/ai-platinum-kins.png',
    tradingStyle: '量化交易',
    riskLevel: '中等',
  },
  {
    name: '钨沃尔特',
    role: 'ai_tungsten_walter',
    personality: '耐心的区间震荡交易者，高卖低买，稳定积累',
    avatar: '/avatars/ai-tungsten-walter.png',
    tradingStyle: '震荡交易',
    riskLevel: '中低',
  },
  {
    name: '锌齐格',
    role: 'ai_zinc_zig',
    personality: '灵活的多策略交易者，能根据市场状态切换风格',
    avatar: '/avatars/ai-zinc-zig.png',
    tradingStyle: '多策略',
    riskLevel: '中等',
  },
  {
    name: '钛汤姆',
    role: 'ai_titan_tom',
    personality: '坚定的突破交易者，耐心等待关键价位突破',
    avatar: '/avatars/ai-titan-tom.png',
    tradingStyle: '突破交易',
    riskLevel: '中高',
  },
  {
    name: '铬克里斯',
    role: 'ai_chrome_chris',
    personality: '冷静的对冲交易者，同时关注多品种寻找机会',
    avatar: '/avatars/ai-chrome-chris.png',
    tradingStyle: '对冲交易',
    riskLevel: '中',
  },
  {
    name: '镍娜拉',
    role: 'ai_nickel_nora',
    personality: '直觉敏锐的盘感交易者，靠经验和盘感把握机会',
    avatar: '/avatars/ai-nickel-nora.png',
    tradingStyle: '盘感交易',
    riskLevel: '中高',
  },
];

const INITIAL_COINS = 100000; // 10万金币

// 创建MySQL连接池
function getPool() {
  return mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'trade',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}

export async function POST(request: NextRequest) {
  const pool = getPool();
  
  try {
    const { action } = await request.json();

    if (action === 'init') {
      // 初始化AI用户
      const results = [];
      
      for (let i = 0; i < AI_CHARACTERS.length; i++) {
        const character = AI_CHARACTERS[i];
        const email = `${character.role}@jinhuohuo.ai`;
        
        try {
          // 检查用户是否已存在
          const [existingUsers] = await pool.execute(
            'SELECT user_id, coin_balance FROM users WHERE email = ?',
            [email]
          ) as [any[], any];
          
          if (existingUsers.length > 0) {
            // 更新金币
            await pool.execute(
              'UPDATE users SET coin_balance = ? WHERE user_id = ?',
              [INITIAL_COINS, existingUsers[0].user_id]
            );
            
            results.push({
              name: character.name,
              status: 'updated',
              userId: existingUsers[0].user_id,
            });
          } else {
            // 创建新用户
            const [result] = await pool.execute(
              `INSERT INTO users (email, password, name, avatar, coin_balance, role) 
               VALUES (?, ?, ?, ?, ?, 'ai')`,
              [email, `ai_${character.role}_password_2024`, character.name, character.avatar, INITIAL_COINS]
            );
            
            results.push({
              name: character.name,
              status: 'created',
              userId: (result as any).insertId,
            });
          }

          // 检查/创建AI角色
          const [existingRoles] = await pool.execute(
            'SELECT id FROM chat_hall_ai_roles WHERE name = ?',
            [character.name]
          ) as [any[], any];

          if (existingRoles.length === 0) {
            await pool.execute(
              `INSERT INTO chat_hall_ai_roles (name, enabled, reply_probability, max_response_length, system_prompt, trigger_keyword, avatar_url, sort_order)
               VALUES (?, true, ?, 200, ?, ?, ?, ?)`,
              [
                character.name,
                30 + Math.floor(Math.random() * 40), // 30-70%
                `你是${character.name}，${character.personality}。你是金火火交易平台的AI交易员，参与K线征途挑战赛是你的目标。你的交易风格是${character.tradingStyle}，风险偏好为${character.riskLevel}。你说话直接专业，喜欢用数据说话。`,
                character.name,
                character.avatar,
                i,
              ]
            );
          }
        } catch (error: any) {
          results.push({
            name: character.name,
            status: 'error',
            error: error.message,
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

    if (action === 'status') {
      // 查看AI用户状态
      const [aiUsers] = await pool.execute(
        'SELECT user_id, name, email, coin_balance, role FROM users WHERE role = ? ORDER BY name',
        ['ai']
      ) as [any[], any];

      const [aiRoles] = await pool.execute(
        'SELECT name, enabled, reply_probability FROM chat_hall_ai_roles ORDER BY sort_order'
      ) as [any[], any];

      return NextResponse.json({
        aiUsers: aiUsers || [],
        aiRoles: aiRoles || [],
      });
    }

    return NextResponse.json({ error: '无效的操作' }, { status: 400 });
  } catch (error: any) {
    console.error('AI用户管理错误:', error);
    return NextResponse.json({ error: error.message || '服务器错误' }, { status: 500 });
  } finally {
    await pool.end();
  }
}
