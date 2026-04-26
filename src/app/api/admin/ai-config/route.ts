import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// 获取所有AI角色列表
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    const { data, error } = await supabase
      .from('chat_hall_ai_roles')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    // 如果没有配置，返回默认值
    if (!data || data.length === 0) {
      return NextResponse.json([
        {
          id: 1,
          name: '店小二',
          enabled: true,
          replyProbability: 50,
          maxResponseLength: 200,
          systemPrompt: '你是金火火茶馆的店小二，为来往的客人服务。',
          triggerKeyword: '@店小二',
          avatarUrl: '',
          sortOrder: 1,
        }
      ]);
    }

    return NextResponse.json(
      data.map(role => ({
        id: role.id,
        name: role.name,
        enabled: role.enabled,
        replyProbability: role.reply_probability,
        maxResponseLength: role.max_response_length,
        systemPrompt: role.system_prompt,
        triggerKeyword: role.trigger_keyword,
        avatarUrl: role.avatar_url,
        sortOrder: role.sort_order,
      }))
    );
  } catch (error) {
    console.error('Get AI roles error:', error);
    return NextResponse.json({ error: '获取角色列表失败' }, { status: 500 });
  }
}

// 创建或更新AI角色
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

    const { action, ...payload } = await request.json();

    // 创建角色
    if (action === 'create') {
      const { name, enabled, replyProbability, maxResponseLength, systemPrompt, triggerKeyword, avatarUrl } = payload;

      const { error } = await supabase
        .from('chat_hall_ai_roles')
        .insert({
          name: name || '新角色',
          enabled: enabled ?? true,
          reply_probability: replyProbability ?? 50,
          max_response_length: maxResponseLength ?? 200,
          system_prompt: systemPrompt || '你是茶馆的工作人员。',
          trigger_keyword: triggerKeyword || '',
          avatar_url: avatarUrl || '',
        });

      if (error) throw error;
      return NextResponse.json({ success: true, message: '角色已创建' });
    }

    // 更新角色
    if (action === 'update') {
      const { id, name, enabled, replyProbability, maxResponseLength, systemPrompt, triggerKeyword, avatarUrl, sortOrder } = payload;

      const { error } = await supabase
        .from('chat_hall_ai_roles')
        .update({
          name: name,
          enabled: enabled,
          reply_probability: replyProbability,
          max_response_length: maxResponseLength,
          system_prompt: systemPrompt,
          trigger_keyword: triggerKeyword,
          avatar_url: avatarUrl,
          sort_order: sortOrder,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      return NextResponse.json({ success: true, message: '角色已更新' });
    }

    // 删除角色
    if (action === 'delete') {
      const { id } = payload;

      const { error } = await supabase
        .from('chat_hall_ai_roles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return NextResponse.json({ success: true, message: '角色已删除' });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error) {
    console.error('AI role operation error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
