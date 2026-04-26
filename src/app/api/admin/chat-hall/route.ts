import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取聊天大厅配置和禁言列表
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // 详细日志
    console.log('Admin GET session:', {
      exists: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      role: session?.user?.role
    });
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ 
        error: '需要管理员权限',
        debug: { hasSession: !!session, hasUser: !!session?.user }
      }, { status: 403 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 获取配置
    const { data: config } = await supabase
      .from('chat_hall_config')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    // 转换为前端期望的格式
    const configMap: Record<string, { value: string; description: string }> = {};
    if (config) {
      configMap.enabled = {
        value: config.enabled ? 'true' : 'false',
        description: '是否开启聊天大厅',
      };
      configMap.cooldown_seconds = {
        value: String(config.cooldown_seconds || 60),
        description: '普通用户发言冷却时间（秒）',
      };
      configMap.max_message_length = {
        value: String(config.max_message_length || 500),
        description: '消息最大长度',
      };
      configMap.hourly_limit = {
        value: String(config.hourly_limit || 3),
        description: '每小时发言限制',
      };
      configMap.open_time_start = {
        value: config.open_time_start || '20:00',
        description: '开放开始时间（北京时间）',
      };
      configMap.open_time_end = {
        value: config.open_time_end || '00:00',
        description: '开放结束时间（北京时间）',
      };
      configMap.is_time_limited = {
        value: config.is_time_limited !== false ? 'true' : 'false',
        description: '是否启用时间限制',
      };
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
    
    // 详细日志
    console.log('Admin POST session:', {
      exists: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      role: session?.user?.role
    });
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ 
        error: '需要管理员权限',
        debug: { hasSession: !!session, hasUser: !!session?.user }
      }, { status: 403 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    const { action, data } = await request.json();

    if (action === 'update_config') {
      // 更新配置
      const { key, value } = data;

      // 调试：检查当前配置
      const { data: beforeData } = await supabase
        .from('chat_hall_config')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      console.log('Before update:', beforeData);

      // 根据 key 更新对应的配置字段
      const updateData: Record<string, any> = {};
      
      if (key === 'cooldown_seconds') {
        updateData.cooldown_seconds = parseInt(value) || 60;
      } else if (key === 'enabled') {
        updateData.enabled = value === 'true' || value === '1' ? 1 : 0;
      } else if (key === 'max_message_length') {
        updateData.max_message_length = parseInt(value) || 500;
      } else if (key === 'hourly_limit') {
        updateData.hourly_limit = parseInt(value) || 3;
      } else if (key === 'open_time_start') {
        updateData.open_time_start = value;
      } else if (key === 'open_time_end') {
        updateData.open_time_end = value;
      } else if (key === 'is_time_limited') {
        updateData.is_time_limited = value === 'true' || value === '1';
      }

      console.log('Updating config:', { key, value, updateData });

      const { error } = await supabase
        .from('chat_hall_config')
        .update(updateData)
        .eq('id', 1);

      if (error) {
        console.error('Update config error:', error);
        throw new Error(`更新配置失败: ${error.message}`);
      }

      // 调试：检查更新后的配置
      const { data: afterData } = await supabase
        .from('chat_hall_config')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      console.log('After update:', afterData);

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
