import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// 获取 Supabase 客户端
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.COZE_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.COZE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
}

export async function GET() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ 
      title: 'K线征途挑战赛',
      description: '挑战自我，赢取丰厚奖品！',
      image: '/prize-default.png',
      enabled: true 
    });
  }

  try {
    const { data, error } = await supabase
      .from('challenge_prize_config')
      .select('*')
      .order('id', { ascending: true })
      .limit(1);

    if (error) {
      // 返回默认配置
      return NextResponse.json({ 
        title: 'K线征途挑战赛',
        description: '挑战自我，赢取丰厚奖品！',
        image: '/prize-default.png',
        enabled: true 
      });
    }

    // 如果没有配置，返回默认配置
    if (!data || data.length === 0) {
      return NextResponse.json({ 
        title: 'K线征途挑战赛',
        description: '挑战自我，赢取丰厚奖品！',
        image: '/prize-default.png',
        enabled: true 
      });
    }

    return NextResponse.json(data[0]);
  } catch (err) {
    console.error('Error fetching prize config:', err);
    return NextResponse.json({ 
      title: 'K线征途挑战赛',
      description: '挑战自我，赢取丰厚奖品！',
      image: '/prize-default.png',
      enabled: true 
    });
  }
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { title, description, image, enabled } = body;

    // 获取当前配置
    const { data: existing } = await supabase
      .from('challenge_prize_config')
      .select('id')
      .limit(1);

    let result;
    if (existing && existing.length > 0) {
      // 更新现有配置
      const { data, error } = await supabase
        .from('challenge_prize_config')
        .update({ title, description, image, enabled })
        .eq('id', existing[0].id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      result = data;
    } else {
      // 创建新配置
      const { data, error } = await supabase
        .from('challenge_prize_config')
        .insert({ title, description, image, enabled })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      result = data;
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Error saving prize config:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
