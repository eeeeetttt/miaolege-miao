import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eaProducts } from '@/lib/schema';
import { sql } from 'drizzle-orm';

// 初始化EA产品表并添加示例数据
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (password !== 'admin123') {
      return NextResponse.json({ error: '密码错误' }, { status: 403 });
    }

    const results: string[] = [];

    // 创建 ea_products 表
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS ea_products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price INT NOT NULL,
          version VARCHAR(50) DEFAULT '1.0.0',
          platform ENUM('MT4', 'MT5', 'Both') DEFAULT 'Both',
          category VARCHAR(100),
          features TEXT,
          download_url VARCHAR(500),
          file_name VARCHAR(255),
          file_size INT,
          image_url VARCHAR(500),
          status ENUM('active', 'inactive') DEFAULT 'active',
          sales_count INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      results.push('✅ ea_products 表创建成功');
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        results.push('ℹ️ ea_products 表已存在');
      } else {
        results.push(`⚠️ ea_products 表创建失败: ${e.message?.substring(0, 100)}`);
      }
    }

    // 创建 ea_purchases 表
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS ea_purchases (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          product_id INT NOT NULL,
          price INT NOT NULL,
          status ENUM('completed', 'refunded') DEFAULT 'completed',
          purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uk_user_ea_product (user_id, product_id),
          INDEX idx_user_ea_purchase (user_id),
          INDEX idx_ea_product_purchase (product_id)
        )
      `);
      results.push('✅ ea_purchases 表创建成功');
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        results.push('ℹ️ ea_purchases 表已存在');
      } else {
        results.push(`⚠️ ea_purchases 表创建失败: ${e.message?.substring(0, 100)}`);
      }
    }

    // 检查是否已有产品数据
    const [existingProducts] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(eaProducts);

    if (existingProducts && Number(existingProducts.count) > 0) {
      results.push(`ℹ️ 已有 ${existingProducts.count} 个产品，跳过示例数据添加`);
    } else {
      // 添加示例EA产品
      const sampleProducts: {
        name: string;
        description: string;
        price: number;
        version: string;
        platform: 'MT4' | 'MT5' | 'Both';
        category: string;
        features: string;
        status: 'active' | 'inactive';
      }[] = [
        {
          name: '趋势追踪大师',
          description: '基于多周期趋势分析的趋势跟踪型EA，适合中长线交易。采用动态止损和移动止盈策略，在趋势行情中表现优异。',
          price: 500,
          version: '2.1.0',
          platform: 'Both',
          category: '趋势',
          features: JSON.stringify([
            '多周期趋势确认',
            '动态止损止盈',
            '智能仓位管理',
            '支持多货币对',
            '实时风险监控'
          ]),
          status: 'active',
        },
        {
          name: '网格交易王',
          description: '经典的网格交易策略EA，适合震荡行情。可自定义网格间距和手数递增比例，支持双向网格。',
          price: 300,
          version: '1.5.0',
          platform: 'Both',
          category: '震荡',
          features: JSON.stringify([
            '可调网格间距',
            '双向网格模式',
            '马丁格尔选项',
            '自动风控保护',
            '支持任意品种'
          ]),
          status: 'active',
        },
        {
          name: '智能马丁EA',
          description: '优化的马丁格尔策略EA，结合趋势过滤和智能加仓逻辑，有效控制风险的同时追求稳定收益。',
          price: 800,
          version: '3.0.0',
          platform: 'MT5',
          category: '马丁',
          features: JSON.stringify([
            '趋势方向过滤',
            '智能加仓逻辑',
            '最大层数限制',
            '账户余额保护',
            '一键平仓功能',
            '详细交易日志'
          ]),
          status: 'active',
        },
        {
          name: '剥头皮高手',
          description: '专为短线交易设计的剥头皮EA，利用微小波动快速进出，适合高流动性品种。',
          price: 600,
          version: '1.2.0',
          platform: 'Both',
          category: '趋势',
          features: JSON.stringify([
            '毫秒级执行',
            '点差过滤',
            '智能止盈',
            '支持ECN账户',
            '低延迟优化'
          ]),
          status: 'active',
        },
      ];

      for (const product of sampleProducts) {
        await db.insert(eaProducts).values(product);
      }

      results.push('✅ 已添加 4 个示例EA产品');
    }

    // 返回当前产品列表
    const products = await db.select().from(eaProducts);

    return NextResponse.json({
      success: true,
      results,
      products,
      message: 'EA产品模块初始化完成',
    });
  } catch (error: any) {
    console.error('Init EA error:', error);
    return NextResponse.json({ 
      error: '初始化失败', 
      details: error.message 
    }, { status: 500 });
  }
}
