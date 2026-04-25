import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, pool } from '@/lib/db';
import { eaProducts, eaPurchases, users } from '@/lib/schema';
import { eq, asc } from 'drizzle-orm';

// 获取所有EA产品（包括未上架的）
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 使用原始 SQL 查询避免 drizzle schema 同步问题
    const [rows] = await pool.query(`
      SELECT id, name, description, price, version, platform, category, 
             product_type, features, download_url, file_name, file_size, 
             image_url, status, creator_id, sales_count, created_at, updated_at
      FROM ea_products 
      ORDER BY created_at ASC
    `);

    // 转换字段名以匹配前端期望的格式
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
    console.error('Get EA products error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `获取产品列表失败: ${errorMessage}` }, { status: 500 });
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
    const { productId, name, description, price, version, platform, category, productType, features, imageUrl } = body;

    if (!name || price === undefined) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 验证产品类型
    const validProductTypes = ['ea', 'indicator', 'script', 'tool'];
    const finalProductType = validProductTypes.includes(productType) ? productType : 'ea';

    if (productId) {
      // 更新现有产品 - 验证权限（使用原始 SQL）
      const [existingRows] = await pool.query(
        'SELECT creator_id FROM ea_products WHERE id = ?',
        [productId]
      );
      const existing = (existingRows as any[])[0];

      if (!existing) {
        return NextResponse.json({ error: '产品不存在' }, { status: 404 });
      }

      // 非管理员只能编辑自己的产品
      if (session.user.role !== 'admin' && existing.creator_id !== session.user.id) {
        return NextResponse.json({ error: '无权编辑此产品' }, { status: 403 });
      }

      // 使用原始 SQL 更新
      await pool.query(`
        UPDATE ea_products 
        SET name = ?, description = ?, price = ?, version = ?, platform = ?, 
            category = ?, product_type = ?, features = ?, image_url = ?
        WHERE id = ?
      `, [name, description || null, price, version || '1.0.0', platform || 'Both', 
          category || null, finalProductType, features || null, imageUrl || null, productId]);

      return NextResponse.json({ success: true, message: '产品更新成功' });
    } else {
      // 创建新产品 - 使用原始 SQL
      const [result] = await pool.query(`
        INSERT INTO ea_products (name, description, price, version, platform, category, product_type, features, image_url, status, creator_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
      `, [name, description || null, price, version || '1.0.0', platform || 'Both', 
          category || null, finalProductType, features || null, imageUrl || null, session.user.id]);

      const newProductId = (result as any).insertId;

      return NextResponse.json({ 
        success: true, 
        message: '产品创建成功',
        productId: newProductId,
      });
    }
  } catch (error) {
    console.error('Save EA product error:', error);
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}

// DELETE - 删除产品
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: '缺少产品ID' }, { status: 400 });
    }

    // 检查产品是否存在以及权限（使用原始 SQL）
    const [rows] = await pool.query(
      'SELECT creator_id FROM ea_products WHERE id = ?',
      [productId]
    );
    const product = (rows as any[])[0];

    if (!product) {
      return NextResponse.json({ error: '产品不存在' }, { status: 404 });
    }

    // 非管理员只能删除自己的产品
    if (session.user.role !== 'admin' && product.creator_id !== session.user.id) {
      return NextResponse.json({ error: '无权删除此产品' }, { status: 403 });
    }

    // 使用原始 SQL 删除
    await pool.query('DELETE FROM ea_products WHERE id = ?', [productId]);

    return NextResponse.json({ success: true, message: '产品已删除' });
  } catch (error) {
    console.error('Delete EA product error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
