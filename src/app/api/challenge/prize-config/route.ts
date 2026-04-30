'use client';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { challengeConfig } from '@/lib/schema';
import { eq } from 'drizzle-orm';

const PRIZE_CONFIG_KEY = 'prize_config';

export async function GET() {
  try {
    // 查询奖品配置
    const result = await db
      .select()
      .from(challengeConfig)
      .where(eq(challengeConfig.configKey, PRIZE_CONFIG_KEY))
      .limit(1);

    if (result.length > 0 && result[0].configValue) {
      return NextResponse.json({
        success: true,
        config: JSON.parse(result[0].configValue),
      });
    }

    // 返回默认配置
    return NextResponse.json({
      success: true,
      config: null, // 前端会使用默认配置
    });
  } catch (error) {
    console.error('获取奖品配置失败:', error);
    return NextResponse.json(
      { success: false, error: '获取奖品配置失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    // 检查是否为管理员
    const userRole = (session.user as any)?.role;
    if (userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: '只有管理员可以修改奖品配置' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const configValue = JSON.stringify(body);

    // 检查配置是否已存在
    const existing = await db
      .select()
      .from(challengeConfig)
      .where(eq(challengeConfig.configKey, PRIZE_CONFIG_KEY))
      .limit(1);

    if (existing.length > 0) {
      // 更新现有配置
      await db
        .update(challengeConfig)
        .set({ 
          configValue,
          description: 'K线征途奖品配置',
        })
        .where(eq(challengeConfig.configKey, PRIZE_CONFIG_KEY));
    } else {
      // 创建新配置
      await db.insert(challengeConfig).values({
        configKey: PRIZE_CONFIG_KEY,
        configValue,
        description: 'K线征途奖品配置',
      });
    }

    return NextResponse.json({
      success: true,
      message: '奖品配置已保存',
    });
  } catch (error) {
    console.error('保存奖品配置失败:', error);
    return NextResponse.json(
      { success: false, error: '保存奖品配置失败' },
      { status: 500 }
    );
  }
}
