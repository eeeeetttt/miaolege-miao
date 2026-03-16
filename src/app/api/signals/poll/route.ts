import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signals, planets, planetMembers } from '@/lib/schema';
import { eq, and, gt, desc, inArray } from 'drizzle-orm';

/**
 * MT5 EA 信号轮询接口
 * 
 * 请求参数：
 * - userId: 用户ID
 * - planetId: 星球ID（可选，不传则获取所有订阅的星球信号）
 * - lastSignalId: 上次获取的信号ID（用于增量更新）
 * - limit: 返回数量限制（默认50）
 * 
 * 返回：
 * - signals: 信号列表
 * - hasMore: 是否有更多信号
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const planetId = searchParams.get('planetId');
    const lastSignalId = searchParams.get('lastSignalId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!userId) {
      return NextResponse.json(
        { error: '缺少用户ID' },
        { status: 400 }
      );
    }

    // 获取用户加入的星球列表
    const memberPlanets = await db
      .select({ planetId: planetMembers.planetId })
      .from(planetMembers)
      .where(eq(planetMembers.userId, userId));

    let planetIds = memberPlanets.map(m => m.planetId);

    // 如果指定了星球ID，只获取该星球的信号
    if (planetId) {
      const targetPlanetId = parseInt(planetId);
      if (!planetIds.includes(targetPlanetId)) {
        // 如果不在会员列表中，检查是否为星球创建者
        const planetData = await db
          .select({ creatorId: planets.creatorId })
          .from(planets)
          .where(eq(planets.id, targetPlanetId))
          .limit(1);
        
        if (planetData.length === 0 || planetData[0].creatorId !== userId) {
          return NextResponse.json(
            { error: '您未加入该星球' },
            { status: 403 }
          );
        }
      }
      planetIds = [targetPlanetId];
    }

    if (planetIds.length === 0) {
      return NextResponse.json({
        signals: [],
        hasMore: false,
      });
    }

    // 构建查询
    let query = db
      .select({
        id: signals.id,
        planetId: signals.planetId,
        senderAccount: signals.senderAccount,
        signalType: signals.signalType,
        ticket: signals.ticket,
        symbol: signals.symbol,
        orderType: signals.orderType,
        volume: signals.volume,
        price: signals.price,
        sl: signals.sl,
        tp: signals.tp,
        comment: signals.comment,
        dealProfit: signals.dealProfit,
        balance: signals.balance,
        broker: signals.broker,
        createdAt: signals.createdAt,
      })
      .from(signals)
      .where(inArray(signals.planetId, planetIds))
      .orderBy(desc(signals.createdAt))
      .limit(limit + 1);

    // 如果有 lastSignalId，添加条件
    if (lastSignalId) {
      query = db
        .select({
          id: signals.id,
          planetId: signals.planetId,
          senderAccount: signals.senderAccount,
          signalType: signals.signalType,
          ticket: signals.ticket,
          symbol: signals.symbol,
          orderType: signals.orderType,
          volume: signals.volume,
          price: signals.price,
          sl: signals.sl,
          tp: signals.tp,
          comment: signals.comment,
          dealProfit: signals.dealProfit,
          balance: signals.balance,
          broker: signals.broker,
          createdAt: signals.createdAt,
        })
        .from(signals)
        .where(
          and(
            inArray(signals.planetId, planetIds),
            gt(signals.id, parseInt(lastSignalId))
          )
        )
        .orderBy(desc(signals.createdAt))
        .limit(limit + 1);
    }

    const result = await query;
    const hasMore = result.length > limit;
    const returnSignals = result.slice(0, limit);

    // 获取星球名称
    const planetIdsInResult = [...new Set(returnSignals.map(s => s.planetId).filter((id): id is number => id !== null))];
    const planetData = planetIdsInResult.length > 0 
      ? await db
          .select({ id: planets.id, name: planets.name })
          .from(planets)
          .where(inArray(planets.id, planetIdsInResult))
      : [];
    
    const planetNameMap = new Map(planetData.map(p => [p.id, p.name]));

    return NextResponse.json({
      signals: returnSignals.map(s => ({
        ...s,
        planetName: s.planetId ? planetNameMap.get(s.planetId) : undefined,
        createdAt: s.createdAt?.toISOString(),
      })),
      hasMore,
    });

  } catch (error) {
    console.error('Poll signals error:', error);
    return NextResponse.json(
      { error: '获取信号失败' },
      { status: 500 }
    );
  }
}
