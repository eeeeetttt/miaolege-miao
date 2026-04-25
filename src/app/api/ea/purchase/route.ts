import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, pool } from '@/lib/db';
import { eaProducts, eaPurchases, users } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

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

    // 获取产品信息（原始 SQL）
    const [productRows] = await pool.query(
      'SELECT * FROM ea_products WHERE id = ?',
      [productId]
    );
    const product = (productRows as any[])[0];

    if (!product) {
      return NextResponse.json({ error: '产品不存在' }, { status: 404 });
    }

    if (product.status !== 'active') {
      return NextResponse.json({ error: '该产品已下架' }, { status: 400 });
    }

    // 检查是否已购买（原始 SQL）
    const [purchaseRows] = await pool.query(
      'SELECT id FROM ea_purchases WHERE user_id = ? AND product_id = ?',
      [session.user.id, productId]
    );

    if ((purchaseRows as any[]).length > 0) {
      return NextResponse.json({ error: '您已购买过此产品' }, { status: 400 });
    }

    // 获取用户余额（原始 SQL）
    const [userRows] = await pool.query(
      'SELECT coin_balance FROM users WHERE user_id = ?',
      [session.user.id]
    );
    const user = (userRows as any[])[0];

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    if ((user.coin_balance || 0) < product.price) {
      return NextResponse.json({ error: '星球币余额不足' }, { status: 400 });
    }

    // 扣除用户余额
    await pool.query(
      'UPDATE users SET coin_balance = ? WHERE user_id = ?',
      [(user.coin_balance || 0) - product.price, session.user.id]
    );

    // 创建购买记录
    await pool.query(
      'INSERT INTO ea_purchases (user_id, product_id, price, status) VALUES (?, ?, ?, ?)',
      [session.user.id, productId, product.price, 'completed']
    );

    // 更新产品销量
    await pool.query(
      'UPDATE ea_products SET sales_count = ? WHERE id = ?',
      [(product.sales_count || 0) + 1, productId]
    );

    return NextResponse.json({ 
      success: true, 
      message: '购买成功',
      price: product.price,
      remainingBalance: (user.coin_balance || 0) - product.price,
    });
  } catch (error) {
    console.error('Purchase EA error:', error);
    return NextResponse.json({ error: '购买失败' }, { status: 500 });
  }
}
