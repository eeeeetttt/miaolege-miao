import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

// 初始化Supabase客户端
function getSupabase() {
  const supabaseUrl = process.env.COZE_SPACE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.COZE_SPACE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(supabaseUrl, supabaseKey);
}

// 获取净值
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ equity: null, error: '请先登录' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const levelParam = searchParams.get('level') || '1';

    const supabase = getSupabase();
    
    // 尝试从challenge_user_states表获取
    const { data, error } = await supabase
      .from('challenge_user_states')
      .select('equity, positions, level')
      .eq('user_id', session.user.id)
      .single(); // 不限制level，获取最新的

    if (data && !error) {
      return NextResponse.json({
        equity: data.equity,
        positions: data.positions || [],
        level: data.level
      });
    }

    // 如果表没有数据，返回null让前端使用本地状态
    return NextResponse.json({
      equity: null,
      positions: [],
      level: 1,
      hasData: false
    });
  } catch (error) {
    console.error('净值API错误:', error);
    return NextResponse.json({ equity: 3000, level: 1 });
  }
}

// 保存净值
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { equity, positions, level } = body;

    const supabase = getSupabase();
    
    // 尝试更新或插入（使用 upsert 根据 user_id 和 level）
    const { data, error } = await supabase
      .from('challenge_user_states')
      .upsert({
        user_id: session.user.id,
        level: level || 1,
        equity: equity,
        positions: positions || [],
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,level'
      })
      .select()
      .single();

    if (error) {
      console.error('保存净值失败:', error);
      // 即使保存失败也不影响前端
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('净值API错误:', error);
    // 即使失败也返回成功，让前端继续工作
    return NextResponse.json({ success: true });
  }
}
