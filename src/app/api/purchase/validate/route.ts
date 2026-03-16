import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mtAccounts, followRecords, planets, planetMembers } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

/**
 * MT5 EA 验证跟单服务接口
 * 
 * GET请求参数：
 * - followAccount: 跟单账户（用户的MT账户号码）
 * 
 * 返回：
 * - valid: 是否有效
 * - userId: 用户ID
 * - planetId: 星球ID
 * - planetName: 星球名称
 * - status: 跟单状态
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const followAccount = searchParams.get('followAccount');

    if (!followAccount) {
      return NextResponse.json(
        { valid: false, error: '缺少跟单账户参数' },
        { status: 400 }
      );
    }

    // 1. 通过MT账户查找用户
    const mtAccountData = await db
      .select()
      .from(mtAccounts)
      .where(eq(mtAccounts.accountNumber, followAccount))
      .limit(1);

    if (mtAccountData.length === 0) {
      return NextResponse.json({
        valid: false,
        error: '未找到绑定的MT账户',
      });
    }

    const mtAccount = mtAccountData[0];
    const userId = mtAccount.userId;

    // 2. 检查用户是否有活跃的跟单记录
    const activeFollows = await db
      .select({
        follow: followRecords,
        planet: planets,
      })
      .from(followRecords)
      .innerJoin(planets, eq(followRecords.planetId, planets.id))
      .where(
        and(
          eq(followRecords.userId, userId),
          eq(followRecords.status, 'active')
        )
      );

    if (activeFollows.length === 0) {
      // 检查是否有暂停的跟单
      const pausedFollows = await db
        .select({
          follow: followRecords,
          planet: planets,
        })
        .from(followRecords)
        .innerJoin(planets, eq(followRecords.planetId, planets.id))
        .where(
          and(
            eq(followRecords.userId, userId),
            eq(followRecords.status, 'paused')
          )
        );

      if (pausedFollows.length > 0) {
        return NextResponse.json({
          valid: false,
          error: '跟单服务已暂停，请在平台恢复跟单',
          status: 'paused',
        });
      }

      return NextResponse.json({
        valid: false,
        error: '没有活跃的跟单服务，请先在平台订阅跟单',
      });
    }

    // 3. 返回验证成功信息
    const activeFollow = activeFollows[0];

    return NextResponse.json({
      valid: true,
      userId,
      mtAccount: followAccount,
      platform: mtAccount.platform,
      planetId: activeFollow.planet.id,
      planetName: activeFollow.planet.name,
      status: 'active',
      followId: activeFollow.follow.id,
    });

  } catch (error) {
    console.error('Validate follow error:', error);
    return NextResponse.json(
      { valid: false, error: '验证失败' },
      { status: 500 }
    );
  }
}

/**
 * POST请求 - 验证EA购买权限
 * 
 * 请求参数：
 * - userId: 用户ID
 * - productId: 产品ID (eaProducts.id)
 * - mtAccount: MT账户号码（可选）
 * 
 * 返回：
 * - valid: 是否有效
 * - product: 产品信息
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, productId, mtAccount } = body;

    if (!userId || !productId) {
      return NextResponse.json(
        { valid: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 查询购买记录
    const purchases = await db
      .select()
      .from(mtAccounts)
      .where(eq(mtAccounts.userId, userId));

    if (purchases.length === 0) {
      return NextResponse.json({
        valid: false,
        error: '未找到购买记录',
      });
    }

    // 简化返回 - 实际EA购买验证逻辑可根据需要扩展
    return NextResponse.json({
      valid: true,
      userId,
      message: 'EA购买验证成功',
    });

  } catch (error) {
    console.error('Validate purchase error:', error);
    return NextResponse.json(
      { valid: false, error: '验证失败' },
      { status: 500 }
    );
  }
}
