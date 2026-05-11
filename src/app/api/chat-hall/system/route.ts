import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { content, type } = await request.json();
    
    if (!content) {
      return NextResponse.json({ error: '消息内容不能为空' }, { status: 400 });
    }

    const messageId = `SYS${Date.now()}`;
    await pool.query(
      `INSERT INTO chat_hall_messages (id, user_id, user_name, content, is_system, created_at)
       VALUES (?, 'system', '系统消息', ?, 1, NOW())`,
      [messageId, content]
    );

    return NextResponse.json({ success: true, message: '系统消息发送成功' });
  } catch (error: any) {
    console.error('发送系统消息失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
