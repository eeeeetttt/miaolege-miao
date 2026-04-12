import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET() {
  try {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    const { data: levelRows, error } = await supabase
      .from('challenge_level_config')
      .select('level, name, description, target_balance, initial_balance, fail_balance, reward, is_active')
      .order('level');

    return NextResponse.json({
      levelRows,
      error,
      count: levelRows?.length || 0
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
