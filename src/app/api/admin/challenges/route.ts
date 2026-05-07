import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { challengeLevelConfig } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// 获取所有挑战赛关卡配置
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const challenges = await db.select().from(challengeLevelConfig).orderBy(challengeLevelConfig.level);
    return NextResponse.json({ challenges });
  } catch (error) {
    console.error('获取挑战赛配置失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

// 创建/更新挑战赛关卡配置
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const { id, level, name, description, target_balance, initial_balance, fail_balance, reward, is_active } = body;

    if (id) {
      // 更新
      await db.update(challengeLevelConfig)
        .set({
          level: level ? Number(level) : undefined,
          name,
          description,
          targetBalance: target_balance ? Number(target_balance) : undefined,
          initialBalance: initial_balance ? Number(initial_balance) : undefined,
          failBalance: fail_balance ? Number(fail_balance) : undefined,
          reward,
          isActive: is_active !== undefined ? is_active : undefined,
          updatedAt: new Date(),
        })
        .where(eq(challengeLevelConfig.id, Number(id)));
      
      return NextResponse.json({ success: true, message: '更新成功' });
    } else {
      // 创建
      await db.insert(challengeLevelConfig).values({
        level: level ? Number(level) : 1,
        name,
        description,
        targetBalance: target_balance ? Number(target_balance) : 2000,
        initialBalance: initial_balance ? Number(initial_balance) : 1000,
        failBalance: fail_balance ? Number(fail_balance) : 100,
        reward,
        isActive: is_active !== undefined ? is_active : true,
      });

      return NextResponse.json({ success: true, message: '创建成功' });
    }
  } catch (error) {
    console.error('保存挑战赛配置失败:', error);
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}

// 删除挑战赛配置
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少ID' }, { status: 400 });
    }

    await db.delete(challengeLevelConfig).where(eq(challengeLevelConfig.id, Number(id)));

    return NextResponse.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除挑战赛配置失败:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
