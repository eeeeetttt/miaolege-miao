import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { createClient } from '@supabase/supabase-js';

// 初始化服务角色客户端用于写入操作
function getSupabaseAdmin() {
  // 使用服务角色密钥来绕过RLS
  const supabaseUrl = process.env.COZE_SUPABASE_URL;
  const supabaseServiceKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;
  return createClient(supabaseUrl!, supabaseServiceKey!, { auth: { persistSession: false } });
}

// 购买EA产品
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: '缺少产品ID' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const supabaseAdmin = getSupabaseAdmin();

    // 获取产品信息
    const { data: product, error: productError } = await supabase
      .from('ea_products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: '产品不存在' }, { status: 404 });
    }

    if (product.status !== 'active') {
      return NextResponse.json({ error: '该产品已下架' }, { status: 400 });
    }

    // 检查是否已购买
    const { data: existingPurchase } = await supabase
      .from('ea_purchases')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('product_id', productId)
      .single();

    if (existingPurchase) {
      return NextResponse.json({ error: '您已购买过此产品' }, { status: 400 });
    }

    // 获取用户余额 - 使用用户表
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('coin_balance')
      .eq('user_id', session.user.id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    if ((user.coin_balance || 0) < product.price) {
      return NextResponse.json({ error: 'U 余额不足' }, { status: 400 });
    }

    // 扣除用户余额
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        coin_balance: (user.coin_balance || 0) - product.price,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', session.user.id);

    if (updateError) {
      console.error('Failed to update balance:', updateError);
      return NextResponse.json({ error: '余额扣除失败' }, { status: 500 });
    }

    // 创建购买记录
    const { error: insertError } = await supabaseAdmin
      .from('ea_purchases')
      .insert({
        user_id: session.user.id,
        product_id: productId,
        price: product.price,
        status: 'completed',
      });

    if (insertError) {
      console.error('Failed to create purchase record:', insertError);
      // 回滚余额
      await supabaseAdmin
        .from('users')
        .update({ coin_balance: user.coin_balance })
        .eq('user_id', session.user.id);
      return NextResponse.json({ error: '购买记录创建失败' }, { status: 500 });
    }

    // 更新产品销量
    await supabaseAdmin
      .from('ea_products')
      .update({ 
        sales_count: (product.sales_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId);

    return NextResponse.json({ 
      success: true, 
      message: '购买成功',
      price: product.price,
    });
  } catch (error) {
    console.error('Purchase EA error:', error);
    return NextResponse.json({ error: '购买失败' }, { status: 500 });
  }
}
