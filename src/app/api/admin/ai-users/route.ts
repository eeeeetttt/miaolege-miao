import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

// 获取 AI 用户列表
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const [aiUsers] = await pool.query(`
      SELECT ua.user_id, ua.name, ua.email, ua.coin_balance, ua.avatar_url,
             ar.role_name, ar.personality, ar.risk_level, ar.trade_style
      FROM user_accounts ua
      LEFT JOIN ai_roles ar ON ua.user_id = ar.user_id
      WHERE ua.role = 'ai'
      ORDER BY ua.created_at DESC
    `);

    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active
      FROM match_accounts ma
      JOIN user_accounts ua ON ma.user_id = ua.user_id
      WHERE ua.role = 'ai'
    `);

    return NextResponse.json({
      aiUsers,
      stats
    });
  } catch (error: any) {
    console.error('获取AI用户失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 管理 AI 用户
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }

    const body = await request.json();
    const { action, user_id, ...data } = body;

    switch (action) {
      case 'init_ai': {
        // 初始化 AI 用户和角色
        const aiConfigs = [
          { name: '碳凯文', email: 'ai_carbon_kevin@jinhuohuo.ai', role_name: '激进型', personality: '高风险高回报型AI交易员', risk_level: 9, trade_style: '日内高频' },
          { name: '金查理', email: 'ai_gold_charli@jinhuohuo.ai', role_name: '稳健型', personality: '稳健收益型AI交易员', risk_level: 5, trade_style: '趋势跟踪' },
          { name: '钛特蕾莎', email: 'ai_titanium_teresa@jinhuohuo.ai', role_name: '保守型', personality: '低风险稳定型AI交易员', risk_level: 3, trade_style: '波段交易' },
          { name: '钨沃尔特', email: 'ai_tungsten_walter@jinhuohuo.ai', role_name: '激进型', personality: '激进型AI交易员', risk_level: 9, trade_style: '日内高频' },
          { name: '铁托尼', email: 'ai_iron_tony@jinhuohuo.ai', role_name: '稳健型', personality: '稳健型AI交易员', risk_level: 5, trade_style: '趋势跟踪' },
          { name: '铂金斯', email: 'ai_platinum_kins@jinhuohuo.ai', role_name: '保守型', personality: '保守型AI交易员', risk_level: 3, trade_style: '波段交易' },
          { name: '铜麦克', email: 'ai_copper_mike@jinhuohuo.ai', role_name: '激进型', personality: '激进型AI交易员', risk_level: 8, trade_style: '日内高频' },
          { name: '铝亚历克斯', email: 'ai_aluminum_alex@jinhuohuo.ai', role_name: '稳健型', personality: '稳健型AI交易员', risk_level: 6, trade_style: '趋势跟踪' },
          { name: '银威廉', email: 'ai_silver_william@jinhuohuo.ai', role_name: '保守型', personality: '保守型AI交易员', risk_level: 4, trade_style: '波段交易' },
          { name: '锌齐格', email: 'ai_zinc_zig@jinhuohuo.ai', role_name: '激进型', personality: '激进型AI交易员', risk_level: 9, trade_style: '日内高频' },
        ];

        let created = 0;
        let skipped = 0;

        for (const config of aiConfigs) {
          // 检查是否已存在
          const [existing] = await pool.query('SELECT user_id FROM user_accounts WHERE email = ?', [config.email]);
          if ((existing as any).length > 0) {
            skipped++;
            continue;
          }

          const userId = crypto.randomUUID();
          await pool.query(`
            INSERT INTO user_accounts (user_id, email, password_hash, name, role, coin_balance)
            VALUES (?, ?, 'ai-placeholder', ?, 'ai', 100000)
          `, [userId, config.email, config.name]);

          await pool.query(`
            INSERT INTO ai_roles (id, user_id, role_name, personality, risk_level, trade_style)
            VALUES (UUID(), ?, ?, ?, ?, ?)
          `, [userId, config.role_name, config.personality, config.risk_level, config.trade_style]);

          created++;
        }

        return NextResponse.json({ 
          success: true, 
          message: `初始化完成：新建 ${created} 个，跳过 ${skipped} 个（已存在）` 
        });
      }

      case 'delete': {
        // 删除 AI 用户
        if (!user_id) {
          return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
        }
        await pool.query('DELETE FROM ai_roles WHERE user_id = ?', [user_id]);
        await pool.query('DELETE FROM user_accounts WHERE user_id = ? AND role = "ai"', [user_id]);
        return NextResponse.json({ success: true, message: 'AI用户已删除' });
      }

      case 'update': {
        // 更新 AI 配置
        if (!user_id) {
          return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
        }
        const { name, role_name, personality, risk_level, trade_style } = data;
        
        if (name) {
          await pool.query('UPDATE user_accounts SET name = ? WHERE user_id = ?', [name, user_id]);
        }
        
        if (role_name || personality || risk_level !== undefined || trade_style) {
          await pool.query(`
            UPDATE ai_roles SET 
              role_name = COALESCE(?, role_name),
              personality = COALESCE(?, personality),
              risk_level = COALESCE(?, risk_level),
              trade_style = COALESCE(?, trade_style)
            WHERE user_id = ?
          `, [role_name, personality, risk_level, trade_style, user_id]);
        }
        
        return NextResponse.json({ success: true, message: '配置已更新' });
      }

      case 'status': {
        // 获取状态
        const [aiUsers] = await pool.query(`
          SELECT ua.user_id, ua.name, ua.email, ua.coin_balance
          FROM user_accounts ua
          WHERE ua.role = 'ai'
          LIMIT 10
        `);
        return NextResponse.json({ aiUsers });
      }

      default:
        return NextResponse.json({ error: '未知操作' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('AI用户管理失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
