import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取聊天大厅配置和禁言列表
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 获取配置
    const { data: configs } = await supabase
      .from('chat_hall_config')
      .select('*');

    const configMap: Record<string, { value: string; description: string }> = {};
    if (configs) {
      configs.forEach(c => {
        configMap[c.config_key] = {
          value: c.config_value,
          description: c.description || '',
        };
      });
    }

    // 获取禁言列表
    const { data: mutes } = await supabase
      .from('chat_hall_mutes')
      .select('*')
      .order('created_at', { ascending: false });

    // 获取被禁言用户的信息
    const mutedUserIds = mutes?.map(m => m.user_id) || [];
    let userInfoMap: Record<string, { name: string; email: string }> = {};

    if (mutedUserIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('user_id, name, email')
        .in('user_id', mutedUserIds);

      if (usersData) {
        usersData.forEach(u => {
          userInfoMap[u.user_id] = {
            name: u.name || '未知用户',
            email: u.email || '',
          };
        });
      }
    }

    const muteList = (mutes || []).map(m => ({
      ...m,
      userName: userInfoMap[m.user_id]?.name || m.user_id,
      userEmail: userInfoMap[m.user_id]?.email || '',
    }));

    return NextResponse.json({
      success: true,
      config: configMap,
      mutes: muteList,
    });
  } catch (error) {
    console.error('Get chat hall admin error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '获取失败'
    }, { status: 500 });
  }
}

// 更新聊天大厅配置或管理禁言
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    const { action, data } = await request.json();

    if (action === 'update_config') {
      // 更新配置
      const { key, value, description } = data;

      const { error } = await supabase
        .from('chat_hall_config')
        .upsert({
          config_key: key,
          config_value: value,
          description: description || null,
          updated_at: new Date().toISOString(),
        });

      if (error) throw new Error(`更新配置失败: ${error.message}`);

      return NextResponse.json({ success: true, message: '配置已更新' });
    }

    if (action === 'mute_user') {
      // 禁言用户
      const { userId, reason, durationMinutes } = data;

      if (!userId) {
        return NextResponse.json({ error: '用户ID不能为空' }, { status: 400 });
      }

      const expiresAt = durationMinutes && durationMinutes > 0
        ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase
        .from('chat_hall_mutes')
        .insert({
          user_id: userId,
          muted_by: session.user.id,
          reason: reason || null,
          expires_at: expiresAt,
        });

      if (error) throw new Error(`禁言失败: ${error.message}`);

      return NextResponse.json({
        success: true,
        message: durationMinutes ? `已禁言 ${durationMinutes} 分钟` : '已永久禁言'
      });
    }

    if (action === 'unmute_user') {
      // 解禁用户
      const { userId } = data;

      if (!userId) {
        return NextResponse.json({ error: '用户ID不能为空' }, { status: 400 });
      }

      const { error } = await supabase
        .from('chat_hall_mutes')
        .delete()
        .eq('user_id', userId);

      if (error) throw new Error(`解禁失败: ${error.message}`);

      return NextResponse.json({ success: true, message: '已解除禁言' });
    }

    return NextResponse.json({ error: '无效的操作' }, { status: 400 });
  } catch (error) {
    console.error('Chat hall admin error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '操作失败'
    }, { status: 500 });
  }
}
