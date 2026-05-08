import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { weapons, userWeapons, userArmy, userAccounts } from '@/lib/schema';
import { eq, and, or } from 'drizzle-orm';

// 获取武器列表和用户研发状态
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // 获取所有武器
    const allWeapons = await db
      .select()
      .from(weapons)
      .orderBy(weapons.sortOrder);

    // 获取用户的武器研发状态
    let researchedWeaponIds: string[] = [];
    if (session?.user?.id) {
      const researched = await db
        .select({ weaponId: userWeapons.weaponId })
        .from(userWeapons)
        .where(eq(userWeapons.userId, session.user.id));
      
      researchedWeaponIds = researched.map(w => w.weaponId);
    }

    // 获取用户军队信息
    let armyInfo = null;
    if (session?.user?.id) {
      const army = await db
        .select()
        .from(userArmy)
        .where(eq(userArmy.userId, session.user.id))
        .limit(1);
      
      if (army.length) {
        // 计算总战力
        let totalPower = Number(army[0].units) * 10;
        for (const weaponId of researchedWeaponIds) {
          const weapon = await db
            .select({ powerBonus: weapons.powerBonus })
            .from(weapons)
            .where(eq(weapons.weaponId, weaponId))
            .limit(1);
          if (weapon.length) {
            totalPower += Number(weapon[0].powerBonus || 0) * Number(army[0].units);
          }
        }
        armyInfo = {
          units: army[0].units,
          totalPower,
          maintenanceFee: Number(army[0].units) * 500, // 每日维护费
        };
      }
    }

    const weaponsWithStatus = allWeapons.map(weapon => ({
      ...weapon,
      isResearched: researchedWeaponIds.includes(weapon.weaponId),
    }));

    return NextResponse.json({
      success: true,
      weapons: weaponsWithStatus,
      armyInfo,
    });
  } catch (error) {
    console.error('获取武器列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取武器列表失败' },
      { status: 500 }
    );
  }
}

// 研发武器 / 招募军队
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
    const { action, weaponId, units } = body;
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

    const userBalance = Number(user[0].coinBalance || 0);

    switch (action) {
      case 'research': {
        // 研发武器
        const weapon = await db
          .select()
          .from(weapons)
          .where(eq(weapons.weaponId, weaponId))
          .limit(1);

        if (!weapon.length) {
          return NextResponse.json(
            { success: false, message: '武器不存在' },
            { status: 404 }
          );
        }

        // 检查是否已研发
        const existing = await db
          .select()
          .from(userWeapons)
          .where(and(eq(userWeapons.weaponId, weaponId), eq(userWeapons.userId, userId)))
          .limit(1);

        if (existing.length) {
          return NextResponse.json(
            { success: false, message: '该武器已研发完成' },
            { status: 400 }
          );
        }

        const cost = Number(weapon[0].cost);
        if (userBalance < cost) {
          return NextResponse.json(
            { success: false, message: '银两不足' },
            { status: 400 }
          );
        }

        // 扣除银两，添加研发记录
        await db
          .update(userAccounts)
          .set({ coinBalance: String(userBalance - cost) })
          .where(eq(userAccounts.userId, userId));

        await db
          .insert(userWeapons)
          .values({
            userId,
            weaponId,
            researchedAt: new Date(),
          });

        // 计算新的总战力
        const army = await db
          .select()
          .from(userArmy)
          .where(eq(userArmy.userId, userId))
          .limit(1);

        let newPower = 0;
        if (army.length && Number(army[0].units) > 0) {
          const researched = await db
            .select()
            .from(userWeapons)
            .where(eq(userWeapons.userId, userId));
          
          let basePower = 10;
          for (const w of researched) {
            const wData = await db
              .select({ powerBonus: weapons.powerBonus })
              .from(weapons)
              .where(eq(weapons.weaponId, w.weaponId))
              .limit(1);
            if (wData.length) {
              basePower += Number(wData[0].powerBonus || 0);
            }
          }
          newPower = Number(army[0].units) * basePower;
        }

        return NextResponse.json({
          success: true,
          message: `恭喜！成功研发【${weapon[0].name}】！战力加成 +${weapon[0].powerBonus}`,
          newPower,
        });
      }

      case 'recruit': {
        // 招募兵团
        const recruitUnits = units || 1;
        const costPerUnit = 10000; // 每个兵团1万银两
        const totalCost = recruitUnits * costPerUnit;

        if (userBalance < totalCost) {
          return NextResponse.json(
            { success: false, message: `银两不足！招募 ${recruitUnits} 个兵团需要 ${totalCost.toLocaleString()} 两` },
            { status: 400 }
          );
        }

        // 获取或创建军队记录
        let army = await db
          .select()
          .from(userArmy)
          .where(eq(userArmy.userId, userId))
          .limit(1);

        if (!army.length) {
          await db.insert(userArmy).values({
            userId,
            units: 0,
            lastMaintenanceDate: new Date(),
            totalPower: 0,
          });
          army = [{ userId, units: 0, totalPower: 0, lastMaintenanceDate: new Date(), id: 0, createdAt: new Date(), updatedAt: new Date() }];
        }

        // 扣除银两，增加兵团
        const newUnits = Number(army[0].units) + recruitUnits;

        // 计算新战力
        const researched = await db
          .select()
          .from(userWeapons)
          .where(eq(userWeapons.userId, userId));

        let basePower = 10;
        for (const w of researched) {
          const wData = await db
            .select({ powerBonus: weapons.powerBonus })
            .from(weapons)
            .where(eq(weapons.weaponId, w.weaponId))
            .limit(1);
          if (wData.length) {
            basePower += Number(wData[0].powerBonus || 0);
          }
        }

        await db
          .update(userAccounts)
          .set({ coinBalance: String(userBalance - totalCost) })
          .where(eq(userAccounts.userId, userId));

        await db
          .update(userArmy)
          .set({
            units: newUnits,
            totalPower: newUnits * basePower,
          })
          .where(eq(userArmy.userId, userId));

        return NextResponse.json({
          success: true,
          message: `成功招募 ${recruitUnits} 个兵团！`,
          totalUnits: newUnits,
          totalPower: newUnits * basePower,
          dailyMaintenance: newUnits * 500,
        });
      }

      case 'disband': {
        // 解散部分兵团
        const disbandUnits = units || 1;

        const army = await db
          .select()
          .from(userArmy)
          .where(eq(userArmy.userId, userId))
          .limit(1);

        if (!army.length || Number(army[0].units) < disbandUnits) {
          return NextResponse.json(
            { success: false, message: '兵团数量不足' },
            { status: 400 }
          );
        }

        const newUnits = Number(army[0].units) - disbandUnits;

        // 重新计算战力
        const researched = await db
          .select()
          .from(userWeapons)
          .where(eq(userWeapons.userId, userId));

        let basePower = 10;
        for (const w of researched) {
          const wData = await db
            .select({ powerBonus: weapons.powerBonus })
            .from(weapons)
            .where(eq(weapons.weaponId, w.weaponId))
            .limit(1);
          if (wData.length) {
            basePower += Number(wData[0].powerBonus || 0);
          }
        }

        await db
          .update(userArmy)
          .set({
            units: newUnits,
            totalPower: newUnits * basePower,
          })
          .where(eq(userArmy.userId, userId));

        return NextResponse.json({
          success: true,
          message: `解散 ${disbandUnits} 个兵团`,
          totalUnits: newUnits,
          totalPower: newUnits * basePower,
        });
      }

      default:
        return NextResponse.json(
          { success: false, message: '未知操作' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('军事操作失败:', error);
    return NextResponse.json(
      { success: false, message: '操作失败，请稍后重试' },
      { status: 500 }
    );
  }
}
