import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取公开的EA产品列表（不需要登录）
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    
    if (!supabase) {
      console.error('Supabase client is not initialized');
      return NextResponse.json({ 
        error: '数据库客户端未初始化',
        products: [] 
      }, { status: 500 });
    }
    
    // 获取所有上架的EA产品
    const { data: products, error } = await supabase
      .from('ea_products')
      .select('id, name, description, price, version, platform, category, features, product_type, created_at')
      .eq('status', 'active');

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({ 
        error: '获取产品列表失败: ' + error.message,
        products: [] 
      }, { status: 500 });
    }

    // 转换字段名以匹配前端期望的格式
    const formattedProducts = (products || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      version: p.version,
      platform: p.platform,
      category: p.category,
      features: p.features,
      productType: p.product_type || 'ea',
      createdAt: p.created_at,
    }));

    return NextResponse.json({ products: formattedProducts });
  } catch (error) {
    console.error('Get EA products error:', error);
    return NextResponse.json({ 
      error: '获取产品列表失败',
      products: [] 
    }, { status: 500 });
  }
}
