import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { db } from '@/lib/db';
import { systemConfig } from '@/lib/schema';
import { eq } from 'drizzle-orm';

/**
 * 获取系统配置
 */
export async function GET() {
  try {
    const configs = await db.select().from(systemConfig);
    const config: Record<string, string> = {};
    for (const c of configs) {
      config[c.configKey] = c.configValue;
    }
    return NextResponse.json({ config });
  } catch (error) {
    console.error('Get config error:', error);
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 });
  }
}

/**
 * 保存系统配置
 */
export async function POST(request: NextRequest) {
  try {
    const { isAdmin: admin } = await isAdmin();
    
    if (!admin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const {
      planet_price_7days,
      planet_price_1year,
      planet_price_3years,
      planet_price_permanent,
      planet_creation_threshold,
      recharge_enabled,
      default_ticket_price,
      max_publishers,
    } = body;

    // 更新或插入配置
    const configs = [
      { key: 'planet_price_7days', value: String(planet_price_7days ?? 0) },
      { key: 'planet_price_1year', value: String(planet_price_1year ?? 1999) },
      { key: 'planet_price_3years', value: String(planet_price_3years ?? 2999) },
      { key: 'planet_price_permanent', value: String(planet_price_permanent ?? 4999) },
      { key: 'planet_creation_threshold', value: String(planet_creation_threshold ?? 0) },
      { key: 'recharge_enabled', value: String(recharge_enabled ?? true) },
      { key: 'default_ticket_price', value: String(default_ticket_price ?? 100) },
      { key: 'max_publishers', value: String(max_publishers ?? 3) },
    ];

    for (const { key, value } of configs) {
      // 检查是否存在
      const [existing] = await db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.configKey, key))
        .limit(1);

      if (existing) {
        await db
          .update(systemConfig)
          .set({ configValue: value, updatedAt: new Date() })
          .where(eq(systemConfig.configKey, key));
      } else {
        await db.insert(systemConfig).values({
          configKey: key,
          configValue: value,
        });
      }
    }

    return NextResponse.json({ 
      success: true,
      message: '配置已保存',
    });
  } catch (error) {
    console.error('Save config error:', error);
    return NextResponse.json({ error: '保存配置失败' }, { status: 500 });
  }
}
