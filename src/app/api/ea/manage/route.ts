import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { eaProducts } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// 获取所有EA产品（包括未上架的）
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 获取所有产品
    const products = await db
      .select()
      .from(eaProducts)
      .orderBy(eaProducts.createdAt);

    return NextResponse.json({ products });
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

    if (productId) {
      // 更新现有产品
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
          updatedAt: new Date(),
        })
        .where(eq(eaProducts.id, productId));

      return NextResponse.json({ success: true, message: '产品更新成功' });
    } else {
      // 创建新产品
      const [newProduct] = await db
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
          status: 'active',
        });

      return NextResponse.json({ 
        success: true, 
        message: '产品创建成功',
        productId: newProduct.insertId,
      });
    }
  } catch (error) {
    console.error('Save EA product error:', error);
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}
