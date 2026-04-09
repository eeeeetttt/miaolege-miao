import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ 
        announcement: null,
        error: '数据库连接失败' 
      }, { status: 500 });
    }
    
    const { data, error } = await supabase
      .from('challenge_announcement')
      .select('*')
      .eq('is_active', 1)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching announcement:', error);
      return NextResponse.json({ 
        announcement: null,
        error: '获取公告失败' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      announcement: data 
    });
  } catch (error) {
    console.error('Error in GET /api/challenge/announcement:', error);
    return NextResponse.json({ 
      announcement: null,
      error: '服务器错误' 
    }, { status: 500 });
  }
}
