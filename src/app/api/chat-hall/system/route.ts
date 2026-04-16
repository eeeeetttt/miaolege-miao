import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 发送系统消息到聊天大厅（用于推送通关/失败通知）
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    const { type, userName, level, message } = await request.json();

    // 只有系统消息才能调用此接口
    const authHeader = request.headers.get('authorization');
    const systemToken = process.env.CHAT_HALL_SYSTEM_TOKEN || 'system-trigger-token';

    if (authHeader !== `Bearer ${systemToken}`) {
      // 简单验证，如果配置了 token 则验证
      if (process.env.CHAT_HALL_SYSTEM_TOKEN) {
        return NextResponse.json({ error: '无权限' }, { status: 403 });
      }
    }

    let content = '';

    if (type === 'level_passed') {
      content = `🎉 恭喜 ${userName} 通过了第 ${level} 关！`;
    } else if (type === 'challenge_failed') {
      content = `😢 ${userName} 在第 ${level} 关挑战失败，但可以重新申请挑战！`;
    } else if (type === 'challenge_completed') {
      content = `🏆 太厉害了！${userName} 完成了全部挑战，成功通关！`;
    } else if (message) {
      content = message;
    } else {
      return NextResponse.json({ error: '无效的消息类型' }, { status: 400 });
    }

    // 插入系统消息
    const { data: newMessage, error } = await supabase
      .from('chat_hall_messages')
      .insert({
        user_id: 'system',
        user_name: '系统通知',
        user_avatar: null,
        content,
        is_system: 1,
        is_premium: 0,
      })
      .select('id, created_at')
      .single();

    if (error) throw new Error(`发送系统消息失败: ${error.message}`);

    return NextResponse.json({
      success: true,
      data: {
        id: newMessage.id,
        createdAt: newMessage.created_at,
      },
    });
  } catch (error) {
    console.error('Send system message error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '发送失败'
    }, { status: 500 });
  }
}
