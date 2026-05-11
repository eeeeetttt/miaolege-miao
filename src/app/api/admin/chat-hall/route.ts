import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

// 获取聊天大厅配置和禁言列表
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }

    // 获取配置
    const [configRows] = await pool.query('SELECT * FROM chat_hall_config WHERE id = 1');
    const config = (configRows as any)[0];

    // 获取禁言列表
    const [muteRows] = await pool.query(`
      SELECT m.*, ua.name as user_name, ua.email as user_email
      FROM chat_hall_mutes m
      LEFT JOIN user_accounts ua ON m.user_id = ua.user_id
      ORDER BY m.created_at DESC
    `);

    // 获取消息统计
    const [msgStats] = await pool.query(`
      SELECT COUNT(*) as total, 
             COUNT(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR) THEN 1 END) as last_hour
      FROM chat_hall_messages
    `);

    return NextResponse.json({
      config: config || { enabled: true, cooldown_seconds: 60, max_message_length: 500 },
      mutes: muteRows,
      stats: msgStats
    });
  } catch (error: any) {
    console.error('获取聊天大厅配置失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 更新聊天大厅配置或禁言用户
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'update_config': {
        // 更新配置
        const { enabled, cooldown_seconds, max_message_length } = data;
        await pool.query(`
          INSERT INTO chat_hall_config (id, enabled, cooldown_seconds, max_message_length)
          VALUES (1, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            enabled = VALUES(enabled),
            cooldown_seconds = VALUES(cooldown_seconds),
            max_message_length = VALUES(max_message_length),
            updated_at = NOW()
        `, [enabled ?? true, cooldown_seconds ?? 60, max_message_length ?? 500]);
        return NextResponse.json({ success: true, message: '配置已更新' });
      }

      case 'mute': {
        // 禁言用户
        const { user_id, reason, expires_at } = data;
        if (!user_id) {
          return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
        }
        await pool.query(`
          INSERT INTO chat_hall_mutes (id, user_id, reason, muted_by, expires_at)
          VALUES (UUID(), ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            reason = VALUES(reason),
            muted_by = VALUES(muted_by),
            expires_at = VALUES(expires_at)
        `, [user_id, reason || '违反规定', session.user.id, expires_at || null]);
        return NextResponse.json({ success: true, message: '用户已禁言' });
      }

      case 'unmute': {
        // 解除禁言
        const { user_id } = data;
        if (!user_id) {
          return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
        }
        await pool.query('DELETE FROM chat_hall_mutes WHERE user_id = ?', [user_id]);
        return NextResponse.json({ success: true, message: '用户已解除禁言' });
      }

      case 'clear_messages': {
        // 清除消息
        await pool.query('TRUNCATE TABLE chat_hall_messages');
        return NextResponse.json({ success: true, message: '消息已清除' });
      }

      default:
        return NextResponse.json({ error: '未知操作' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('操作失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
