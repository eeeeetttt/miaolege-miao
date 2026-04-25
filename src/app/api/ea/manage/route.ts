import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { eaProducts, eaPurchases, users } from '@/lib/schema';
import { eq, asc } from 'drizzle-orm';

// 获取所有EA产品（包括未上架的）
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const products = await db
      .select()
      .from(eaProducts)
      .orderBy(asc(eaProducts.createdAt));

    // 转换字段名以匹配前端期望的格式
    const formattedProducts = (products || []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      version: p.version,
      platform: p.platform,
      category: p.category,
      productType: p.productType,
      features: p.features,
      status: p.status,
      downloadUrl: p.downloadUrl,
      fileName: p.fileName,
      fileSize: p.fileSize,
      imageUrl: p.imageUrl,
      images: p.images,
      creatorId: p.creatorId,
      salesCount: p.salesCount,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return NextResponse.json({ products: formattedProducts });
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
    const { productId, name, description, price, version, platform, category, productType, features, imageUrl, images } = body;

    if (!name || price === undefined) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 验证产品类型
    const validProductTypes = ['ea', 'indicator', 'script', 'tool'];
    const finalProductType = validProductTypes.includes(productType) ? productType : 'ea';

    if (productId) {
      // 更新现有产品 - 验证权限
      const [existing] = await db
        .select({ creatorId: eaProducts.creatorId })
        .from(eaProducts)
        .where(eq(eaProducts.id, productId))
        .limit(1);

      if (!existing) {
        return NextResponse.json({ error: '产品不存在' }, { status: 404 });
      }

      // 非管理员只能编辑自己的产品
      if (session.user.role !== 'admin' && existing.creatorId !== session.user.id) {
        return NextResponse.json({ error: '无权编辑此产品' }, { status: 403 });
      }

      await db
        .update(eaProducts)
        .set({
          name,
          description: description || null,
          price,
          version: version || '1.0.0',
          platform: platform || 'Both',
          category: category || null,
          productType: finalProductType,
          features: features || null,
          imageUrl: imageUrl || null,
          images: images || null,
        })
        .where(eq(eaProducts.id, productId));

      return NextResponse.json({ success: true, message: '产品更新成功' });
    } else {
      // 创建新产品 - MySQL 不支持 returning，使用 lastInsertId
      const result = await db
        .insert(eaProducts)
        .values({
          name,
          description: description || null,
          price,
          version: version || '1.0.0',
          platform: platform || 'Both',
          category: category || null,
          productType: finalProductType,
          features: features || null,
          imageUrl: imageUrl || null,
          images: images || null,
          status: 'active',
          creatorId: session.user.id, // 自动设置创建者
        });

      // MySQL 返回 lastInsertId
      const newProductId = (result as unknown as { insertId: number }).insertId;

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

    // 检查产品是否存在以及权限
    const [product] = await db
      .select({ creatorId: eaProducts.creatorId })
      .from(eaProducts)
      .where(eq(eaProducts.id, parseInt(productId)))
      .limit(1);

    if (!product) {
      return NextResponse.json({ error: '产品不存在' }, { status: 404 });
    }

    // 非管理员只能删除自己的产品
    if (session.user.role !== 'admin' && product.creatorId !== session.user.id) {
      return NextResponse.json({ error: '无权删除此产品' }, { status: 403 });
    }

    await db
      .delete(eaProducts)
      .where(eq(eaProducts.id, parseInt(productId)));

    return NextResponse.json({ success: true, message: '产品已删除' });
  } catch (error) {
    console.error('Delete EA product error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
