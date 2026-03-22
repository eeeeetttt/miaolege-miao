import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { planets, planetMembers, users, systemConfig } from '@/lib/schema';
import { eq, and, sql } from 'drizzle-orm';

// 获取系统配置
async function getSystemConfig() {
  try {
    const configs = await db.select().from(systemConfig);
    const config: Record<string, string> = {};
    for (const c of configs) {
      config[c.configKey] = c.configValue;
    }
    return {
      planet_price_7days: parseInt(config.planet_price_7days || '0'),
      planet_price_1year: parseInt(config.planet_price_1year || '1999'),
      planet_price_3years: parseInt(config.planet_price_3years || '2999'),
      planet_price_permanent: parseInt(config.planet_price_permanent || '4999'),
    };
  } catch (error) {
    console.error('Failed to get system config:', error);
    // 返回默认值
    return {
      planet_price_7days: 0,
      planet_price_1year: 1999,
      planet_price_3years: 2999,
      planet_price_permanent: 4999,
    };
  }
}

// 系统配置类型
type SystemConfig = {
  planet_price_7days: number;
  planet_price_1year: number;
  planet_price_3years: number;
  planet_price_permanent: number;
};

// 获取时长对应的价格
function getDurationPrice(durationDays: number, config: SystemConfig): number {
  if (durationDays === 7) return config.planet_price_7days;
  if (durationDays === 365) return config.planet_price_1year;
  if (durationDays === 1095) return config.planet_price_3years;
  if (durationDays === 0) return config.planet_price_permanent;
  return config.planet_price_1year; // 默认一年
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { name, description, rules, ticketPrice, inviteCode, maxPublishers, durationDays, forumEnabled } = await request.json();

    if (!name) {
      return NextResponse.json({ error: '星球名称为必填项' }, { status: 400 });
    }

    // 获取系统配置
    const config = await getSystemConfig();
    const price = getDurationPrice(durationDays, config);

    // 检查用户余额
    const [user] = await db
      .select({ coinBalance: users.coinBalance })
      .from(users)
      .where(eq(users.userId, session.user.id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    if ((user.coinBalance ?? 0) < price) {
      return NextResponse.json({ 
        error: `星球币不足，需要 ${price} 星球币，当前余额 ${user.coinBalance} 星球币` 
      }, { status: 400 });
    }

    // 计算过期时间
    let expireAt: Date | null = null;
    if (durationDays > 0) {
      expireAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    }
    // durationDays === 0 表示永久，expireAt 为 null

    // 扣除星球币
    if (price > 0) {
      await db
        .update(users)
        .set({ 
          coinBalance: sql`coin_balance - ${price}`,
          updatedAt: new Date()
        })
        .where(eq(users.userId, session.user.id));
    }

    // 创建星球
    const [planet] = await db.insert(planets).values({
      name,
      description: description || '',
      rules: rules || '',
      creatorId: session.user.id,
      ticketPrice: ticketPrice || 0,
      inviteCode: inviteCode || null,
      maxPublishers: maxPublishers || 3,
      durationDays: durationDays === 0 ? 0 : durationDays, // 0表示永久
      expireAt: expireAt,
      coins: 0,
      status: 'active',
      forumEnabled: forumEnabled || false,
    }).$returningId();

    // 添加创建者为星球所有者
    await db.insert(planetMembers).values({
      planetId: planet.id,
      userId: session.user.id,
      role: 'owner',
      joinMethod: 'purchase',
      ticketPaid: 0,
      expiryDate: expireAt, // 成员的有效期与星球相同
    });

    return NextResponse.json({
      success: true,
      planetId: planet.id,
      message: price > 0 ? `星球创建成功，已扣除 ${price} 星球币` : '星球创建成功',
      price: price,
    });
  } catch (error) {
    console.error('Create planet error:', error);
    return NextResponse.json({ error: '创建星球失败' }, { status: 500 });
  }
}
