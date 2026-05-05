import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // 动态导入避免构建问题
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.COZE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 查询用户
    const { data: users, error } = await supabase
      .from('users')
      .select('user_id, email, name, role, password')
      .eq('email', email)
      .limit(1);

    if (error || !users || users.length === 0) {
      return NextResponse.json({ 
        found: false, 
        error: error?.message || 'User not found',
        email 
      });
    }

    const user = users[0];

    // 检查密码
    const passwordValid = await compare(password, user.password);
    
    return NextResponse.json({
      found: true,
      user: {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        role: user.role,
        passwordHash: user.password?.substring(0, 20) + '...',
      },
      passwordValid,
      email,
      providedPasswordLength: password?.length
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 5)
    }, { status: 500 });
  }
}
