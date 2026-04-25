import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, pool } from '@/lib/db';
import { eaProducts } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

// 获取当前用户的产品列表
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 使用原始 SQL 查询
    const [rows] = await pool.query(`
      SELECT id, name, description, price, version, platform, category, 
             product_type, features, download_url, file_name, file_size, 
             image_url, status, creator_id, sales_count, created_at, updated_at
      FROM ea_products 
      WHERE creator_id = ?
      ORDER BY created_at DESC
    `, [session.user.id]);

    // 转换字段名
    const products = (rows as any[]).map((p) => ({
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

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Get my products error:', error);
    return NextResponse.json({ error: '获取产品列表失败' }, { status: 500 });
  }
}
