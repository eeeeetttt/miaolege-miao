import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 提交充值申请
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { amount, walletAddress, currency, type } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: '请输入有效的充值金额' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 创建充值申请记录
    const { data, error } = await supabase
      .from('recharge_applications')
      .insert({
        user_id: session.user.id,
        amount: amount,
        currency: currency || 'USDC',
        wallet_address: walletAddress || '',
        network_type: type || 'TRC20',
        status: 'pending',
        screenshot_url: '', // 截图暂不上传，简化处理
      })
      .select('id')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ 
        error: '充值申请提交失败',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: '充值申请已提交',
      applicationId: data.id,
    });
  } catch (error) {
    console.error('Recharge apply error:', error);
    return NextResponse.json({ 
      error: '充值申请提交失败',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
