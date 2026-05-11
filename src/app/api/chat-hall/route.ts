import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// 获取聊天大厅消息列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const offset = (page - 1) * pageSize;

    // 只获取最近24小时的消息
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [messages] = await pool.execute(
      `SELECT id, user_id, user_name, user_avatar, content, is_system, is_premium, created_at
       FROM chat_hall_messages
       WHERE created_at >= ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [twentyFourHoursAgo, pageSize, offset]
    ) as [any[], any];

    // 获取聊天配置
    const [configs] = await pool.execute(
      `SELECT enabled, cooldown_seconds, max_message_length FROM chat_hall_config WHERE id = 1 LIMIT 1`
    ) as [any[], any];

    const config = configs?.[0] || {};
    const enabled = config.enabled !== 0;
    const maxMessageLength = config.max_message_length || 200;
    const cooldownSeconds = config.cooldown_seconds || 60;

    // 获取当前用户状态
    const session = await getServerSession(authOptions);
    let isMuted = false;
    let muteExpiresAt: string | null = null;
    let remainingCount = 30;

    if (session?.user?.id) {
      // 检查禁言状态
      const [muteData] = await pool.execute(
        `SELECT expires_at FROM chat_hall_mutes WHERE user_id = ? LIMIT 1`,
        [session.user.id]
      ) as [any[], any];

      if (muteData && muteData.length > 0) {
        const now = new Date();
        const expiresAt = muteData[0].expires_at ? new Date(muteData[0].expires_at) : null;

        if (!expiresAt || expiresAt > now) {
          isMuted = true;
          muteExpiresAt = muteData[0].expires_at;
        }
      }

      // 计算剩余发言次数
      if (!isMuted) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const [countResult] = await pool.execute(
          `SELECT COUNT(*) as cnt FROM chat_hall_messages WHERE user_id = ? AND created_at >= ?`,
          [session.user.id, oneHourAgo]
        ) as [any[], any];
        remainingCount = Math.max(0, 30 - (countResult?.[0]?.cnt || 0));
      }
    }

    return NextResponse.json({
      success: true,
      data: messages || [],
      page,
      pageSize,
      config: {
        enabled,
        maxMessageLength,
        cooldownSeconds,
        isMuted,
        muteExpiresAt,
        remainingCount,
      }
    });
  } catch (error) {
    console.error('获取聊天消息错误:', error);
    return NextResponse.json({ error: '获取消息失败' }, { status: 500 });
  }
}

// 发送聊天消息
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { content } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: '消息内容不能为空' }, { status: 400 });
    }

    // 获取配置
    const [configs] = await pool.execute(
      `SELECT enabled, cooldown_seconds, max_message_length FROM chat_hall_config WHERE id = 1 LIMIT 1`
    ) as [any[], any];

    const config = configs?.[0] || {};
    if (config.enabled === 0) {
      return NextResponse.json({ error: '聊天室已关闭' }, { status: 403 });
    }

    if (content.length > (config.max_message_length || 200)) {
      return NextResponse.json({ error: `消息长度不能超过${config.max_message_length || 200}字符` }, { status: 400 });
    }

    // 检查禁言
    const [muteData] = await pool.execute(
      `SELECT expires_at FROM chat_hall_mutes WHERE user_id = ? LIMIT 1`,
      [session.user.id]
    ) as [any[], any];

    if (muteData && muteData.length > 0) {
      const expiresAt = muteData[0].expires_at ? new Date(muteData[0].expires_at) : null;
      if (!expiresAt || expiresAt > new Date()) {
        return NextResponse.json({ error: '您已被禁言' }, { status: 403 });
      }
    }

    // 检查冷却时间
    const cooldownSeconds = config.cooldown_seconds || 60;
    const cooldownAgo = new Date(Date.now() - cooldownSeconds * 1000);
    const [recentMsg] = await pool.execute(
      `SELECT id FROM chat_hall_messages WHERE user_id = ? AND created_at >= ? ORDER BY created_at DESC LIMIT 1`,
      [session.user.id, cooldownAgo]
    ) as [any[], any];

    if (recentMsg && recentMsg.length > 0) {
      return NextResponse.json({ error: `发言太频繁，请${cooldownSeconds}秒后再试` }, { status: 429 });
    }

    // 检查发言频率
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as cnt FROM chat_hall_messages WHERE user_id = ? AND created_at >= ?`,
      [session.user.id, oneHourAgo]
    ) as [any[], any];

    if ((countResult?.[0]?.cnt || 0) >= 30) {
      return NextResponse.json({ error: '每小时最多发言30次' }, { status: 429 });
    }

    // 插入消息
    const messageId = uuidv4();
    await pool.execute(
      `INSERT INTO chat_hall_messages (id, user_id, user_name, content, is_system, is_premium)
       VALUES (?, ?, ?, ?, false, false)`,
      [messageId, session.user.id, session.user.name || '用户', content.trim()]
    );

    return NextResponse.json({ success: true, messageId });
  } catch (error) {
    console.error('发送消息错误:', error);
    return NextResponse.json({ error: '发送失败' }, { status: 500 });
  }
}
