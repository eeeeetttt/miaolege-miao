import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, pool } from '@/lib/db';
import { eaProducts, eaPurchases } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

// 获取EA产品列表
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 使用原始 SQL 查询产品
    const [productRows] = await pool.query(`
      SELECT id, name, description, price, version, platform, category, 
             product_type, features, download_url, file_name, file_size, 
             image_url, status, creator_id, sales_count, created_at, updated_at
      FROM ea_products 
      WHERE status = 'active'
    `);

    // 转换字段名
    const products = (productRows as any[]).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      version: p.version,
      platform: p.platform,
      category: p.category,
      productType: p.product_type,
      features: p.features,
      status: p.status,
      downloadUrl: p.download_url,
      fileName: p.file_name,
      fileSize: p.file_size,
      imageUrl: p.image_url,
      creatorId: p.creator_id,
      salesCount: p.sales_count,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    // 获取用户已购买的产品ID
    const [purchaseRows] = await pool.query(
      'SELECT product_id FROM ea_purchases WHERE user_id = ? AND status = ?',
      [session.user.id, 'completed']
    );

    const purchasedIds = new Set((purchaseRows as any[]).map(p => p.product_id));

    // 标记已购买的产品
    const productsWithPurchaseStatus = products.map(product => ({
      ...product,
      purchased: purchasedIds.has(product.id),
    }));

    return NextResponse.json({ products: productsWithPurchaseStatus });
  } catch (error) {
    console.error('Get EA products error:', error);
    return NextResponse.json({ error: '获取产品列表失败' }, { status: 500 });
  }
}
