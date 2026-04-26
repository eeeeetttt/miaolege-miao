import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// 获取店小二配置
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 允许所有人读取配置（前台也需要获取）
    const { data, error } = await supabase
      .from('chat_hall_ai_config')
      .select('*')
      .eq('id', 1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // 如果没有配置，返回默认值
    if (!data) {
      return NextResponse.json({
        enabled: true,
        replyProbability: 50,
        maxResponseLength: 200,
        systemPrompt: '你是金火火茶馆的店小二，为来往的客人服务。',
      });
    }

    return NextResponse.json({
      enabled: data.enabled,
      replyProbability: data.reply_probability,
      maxResponseLength: data.max_response_length,
      systemPrompt: data.system_prompt,
    });
  } catch (error) {
    console.error('Get AI config error:', error);
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 });
  }
}

// 更新店小二配置
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

    const { enabled, replyProbability, maxResponseLength, systemPrompt } = await request.json();

    const { error } = await supabase
      .from('chat_hall_ai_config')
      .upsert({
        id: 1,
        enabled: enabled ?? true,
        reply_probability: replyProbability ?? 50,
        max_response_length: maxResponseLength ?? 200,
        system_prompt: systemPrompt ?? '你是金火火茶馆的店小二，为来往的客人服务。',
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;

    return NextResponse.json({ success: true, message: '配置已更新' });
  } catch (error) {
    console.error('Update AI config error:', error);
    return NextResponse.json({ error: '更新配置失败' }, { status: 500 });
  }
}
