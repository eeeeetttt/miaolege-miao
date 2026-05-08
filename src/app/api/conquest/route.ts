import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { lands, weapons, userWeapons, userArmy, userAccounts } from '@/lib/schema';
import { eq, and, sql } from 'drizzle-orm';

// 获取土地列表
export async function GET() {
  try {
    // 获取所有土地
    const allLands = await db
      .select()
      .from(lands)
      .orderBy(lands.landId);

    return NextResponse.json({
      success: true,
      lands: allLands,
    });
  } catch (error) {
    console.error('获取土地列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取土地列表失败' },
      { status: 500 }
    );
  }
}

// 发起征服
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, landId, weaponId, units } = body;
    const userId = session.user.id;

    // 获取用户信息
    const user = await db
      .select()
      .from(userAccounts)
      .where(eq(userAccounts.userId, userId))
      .limit(1);

    if (!user.length) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      );
    }

    // 获取用户军队信息
    let army = await db
      .select()
      .from(userArmy)
      .where(eq(userArmy.userId, userId))
      .limit(1);

    // 如果没有军队记录，创建一条
    if (!army.length) {
      await db.insert(userArmy).values({
        userId,
        units: 0,
        lastMaintenanceDate: new Date(),
        totalPower: 0,
      });
      army = [{ userId, units: 0, totalPower: 0, lastMaintenanceDate: new Date(), id: 0, createdAt: null, updatedAt: null }];
    }

    // 获取用户已研发的武器
    const researchedWeapons = await db
      .select()
      .from(userWeapons)
      .where(eq(userWeapons.userId, userId));

    // 计算总战力加成
    let powerBonus = 0;
    for (const uw of researchedWeapons) {
      const weapon = await db
        .select()
        .from(weapons)
        .where(eq(weapons.weaponId, uw.weaponId))
        .limit(1);
      if (weapon.length) {
        powerBonus += Number(weapon[0].powerBonus || 0);
      }
    }

    // 总军力 = 兵团数 × (10 + 武器战力加成)
    const totalPower = Number(army[0].units) * (10 + powerBonus);

    switch (action) {
      case 'conquer': {
        // 发起征服
        const land = await db
          .select()
          .from(lands)
          .where(eq(lands.landId, landId))
          .limit(1);

        if (!land.length) {
          return NextResponse.json(
            { success: false, message: '土地不存在' },
            { status: 404 }
          );
        }

        if (land[0].ownerUserId) {
          return NextResponse.json(
            { success: false, message: '该土地已被占领' },
            { status: 400 }
          );
        }

        if (land[0].isLocked) {
          return NextResponse.json(
            { success: false, message: '该土地尚未解锁' },
            { status: 400 }
          );
        }

        const requiredPower = Number(land[0].requiredPower);
        if (totalPower < requiredPower) {
          return NextResponse.json(
            { success: false, message: `战力不足！需要 ${requiredPower} 点战力，您当前 ${totalPower} 点` },
            { status: 400 }
          );
        }

        // 占领土地
        await db
          .update(lands)
          .set({
            ownerUserId: userId,
            conqueredAt: new Date(),
          })
          .where(eq(lands.landId, landId));

        // 战斗损失 = 当前兵团数 × min(0.6, 敌方防御 / 我方军力)
        const defense = Number(land[0].defense);
        const lossRate = Math.min(0.6, defense / totalPower);
        const lostUnits = Math.floor(Number(army[0].units) * lossRate);

        // 更新军队
        await db
          .update(userArmy)
          .set({
            units: Math.max(0, Number(army[0].units) - lostUnits),
            totalPower: Math.max(0, totalPower - lostUnits * (10 + powerBonus)),
          })
          .where(eq(userArmy.userId, userId));

        return NextResponse.json({
          success: true,
          message: `恭喜！成功占领【${land[0].name}】！损失 ${lostUnits} 个兵团`,
          lostUnits,
          remainingPower: totalPower - lostUnits * (10 + powerBonus),
        });
      }

      case 'upgrade': {
        // 升级土地
        const land = await db
          .select()
          .from(lands)
          .where(eq(lands.landId, landId))
          .limit(1);

        if (!land.length) {
          return NextResponse.json(
            { success: false, message: '土地不存在' },
            { status: 404 }
          );
        }

        if (land[0].ownerUserId !== userId) {
          return NextResponse.json(
            { success: false, message: '您不是该土地的主人' },
            { status: 403 }
          );
        }

        const upgradeCost = Number(land[0].upgradeCost);
        const userBalance = Number(user[0].coinBalance || 0);

        if (userBalance < upgradeCost) {
          return NextResponse.json(
            { success: false, message: '银两不足' },
            { status: 400 }
          );
        }

        // 升级土地（增加产出和成本）
        const newLevel = Number(land[0].upgradeLevel || 0) + 1;
        const newOutput = Math.floor(Number(land[0].dailyOutput) * 1.5);
        const newUpgradeCost = Math.floor(upgradeCost * 2);

        await db
          .update(userAccounts)
          .set({ coinBalance: String(userBalance - upgradeCost) })
          .where(eq(userAccounts.userId, userId));

        await db
          .update(lands)
          .set({
            upgradeLevel: newLevel,
            dailyOutput: newOutput,
            upgradeCost: String(newUpgradeCost),
          })
          .where(eq(lands.landId, landId));

        return NextResponse.json({
          success: true,
          message: `土地升级成功！当前等级 ${newLevel}，每日产出 ${newOutput} 两`,
        });
      }

      default:
        return NextResponse.json(
          { success: false, message: '未知操作' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('征服操作失败:', error);
    return NextResponse.json(
      { success: false, message: '操作失败，请稍后重试' },
      { status: 500 }
    );
  }
}
