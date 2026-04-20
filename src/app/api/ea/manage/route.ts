import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取所有EA产品（包括未上架的）
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    const { data: products, error } = await supabase
      .from('ea_products')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({ error: '获取产品列表失败' }, { status: 500 });
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
      productType: p.product_type || 'ea',
      features: p.features,
      status: p.status,
      downloadUrl: p.download_url,
      fileName: p.file_name,
      fileSize: p.file_size,
      salesCount: p.sales_count,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    return NextResponse.json({ products: formattedProducts });
  } catch (error) {
    console.error('Get EA products error:', error);
    return NextResponse.json({ error: '获取产品列表失败' }, { status: 500 });
  }
}

// 创建或更新EA产品
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, name, description, price, version, platform, category, productType, features } = body;

    if (!name || price === undefined) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 验证产品类型
    const validProductTypes = ['ea', 'indicator', 'script', 'tool'];
    const finalProductType = validProductTypes.includes(productType) ? productType : 'ea';

    const supabase = getSupabaseClient();

    if (productId) {
      // 更新现有产品
      const { error } = await supabase
        .from('ea_products')
        .update({
          name,
          description: description || null,
          price,
          version: version || '1.0.0',
          platform: platform || 'Both',
          category: category || null,
          product_type: finalProductType,
          features: features || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (error) {
        console.error('Supabase update error:', error);
        return NextResponse.json({ error: '更新失败' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: '产品更新成功' });
    } else {
      // 创建新产品
      const { data, error } = await supabase
        .from('ea_products')
        .insert({
          name,
          description: description || null,
          price,
          version: version || '1.0.0',
          platform: platform || 'Both',
          category: category || null,
          product_type: finalProductType,
          features: features || null,
          status: 'active',
        })
        .select('id')
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        return NextResponse.json({ error: '创建失败' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: '产品创建成功',
        productId: data?.id,
      });
    }
  } catch (error) {
    console.error('Save EA product error:', error);
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}
