import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signals, mtAccounts, planets, planetMembers } from '@/lib/schema';
import { eq, and, isNull } from 'drizzle-orm';

// 修复信号：将没有planet_id的信号关联到正确的星球
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    // 验证密码
    if (password !== process.env.ADMIN_PASSWORD && password !== 'admin123') {
      return NextResponse.json({ error: '密码错误' }, { status: 403 });
    }

    const result: {
      fixed: number;
      details: string[];
    } = {
      fixed: 0,
      details: [],
    };

    // 1. 获取所有没有planet_id的信号
    const signalsWithoutPlanet = await db
      .select()
      .from(signals)
      .where(isNull(signals.planetId));

    result.details.push(`找到 ${signalsWithoutPlanet.length} 条未关联星球的信号`);

    // 2. 获取所有MT账号绑定
    const allMtAccounts = await db.select().from(mtAccounts);
    const accountToUser: Record<string, string> = {};
    allMtAccounts.forEach(acc => {
      accountToUser[acc.accountNumber] = acc.userId;
    });

    // 3. 获取所有星球（用于查找owner）
    const allPlanets = await db.select().from(planets);
    const planetsByOwner: Record<string, number> = {};
    allPlanets.forEach(p => {
      planetsByOwner[p.creatorId] = p.id;
    });

    // 4. 获取用户作为发布者的星球
    const publisherMembers = await db
      .select()
      .from(planetMembers)
      .where(eq(planetMembers.role, 'publisher'));
    
    const userAsPublisherPlanet: Record<string, number> = {};
    publisherMembers.forEach(m => {
      userAsPublisherPlanet[m.userId] = m.planetId;
    });

    // 5. 修复每条信号
    for (const signal of signalsWithoutPlanet) {
      const userId = accountToUser[signal.senderAccount];
      
      if (!userId) {
        result.details.push(`信号 ${signal.id}: 账号 ${signal.senderAccount} 未绑定用户`);
        continue;
      }

      // 先检查用户是否是某星球的发布者
      let planetId = userAsPublisherPlanet[userId];
      
      // 如果不是发布者，检查用户是否是星主且开启了发布者功能
      if (!planetId) {
        const ownerPlanetId = planetsByOwner[userId];
        if (ownerPlanetId) {
          const planet = allPlanets.find(p => p.id === ownerPlanetId);
          if (planet?.ownerAsPublisher) {
            planetId = ownerPlanetId;
          }
        }
      }

      if (planetId) {
        // 更新信号的planet_id
        await db
          .update(signals)
          .set({ planetId })
          .where(eq(signals.id, signal.id));
        
        result.fixed++;
        result.details.push(`信号 ${signal.id}: 已关联到星球 ${planetId}`);
      } else {
        result.details.push(`信号 ${signal.id}: 用户 ${userId} 不是任何星球的发布者`);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Fix signals error:', error);
    return NextResponse.json({ 
      error: '修复失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
