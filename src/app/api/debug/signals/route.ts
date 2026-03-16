import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signals, mtAccounts, planets, planetMembers, users } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

// 调试API：检查信号和账号关联情况
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountNumber = searchParams.get('account');
    
    const result: {
      timestamp: string;
      signals: any[];
      mtAccounts: any[];
      planets: any[];
      signalCount: number;
      analysis: string[];
    } = {
      timestamp: new Date().toISOString(),
      signals: [],
      mtAccounts: [],
      planets: [],
      signalCount: 0,
      analysis: [],
    };

    // 获取最近的所有信号
    const allSignals = await db
      .select()
      .from(signals)
      .orderBy(desc(signals.createdAt))
      .limit(50);
    
    result.signalCount = allSignals.length;
    result.signals = allSignals.map(s => ({
      id: s.id,
      senderAccount: s.senderAccount,
      planetId: s.planetId,
      symbol: s.symbol,
      orderType: s.orderType,
      dealProfit: s.dealProfit,
      createdAt: s.createdAt,
    }));

    // 如果指定了账号，过滤显示
    if (accountNumber) {
      result.signals = allSignals.filter(s => s.senderAccount === accountNumber);
    }

    // 获取所有MT账号绑定
    const allMtAccounts = await db.select().from(mtAccounts);
    result.mtAccounts = allMtAccounts.map(a => ({
      id: a.id,
      userId: a.userId,
      accountNumber: a.accountNumber,
      platform: a.platform,
      isVerified: a.isVerified,
    }));

    // 获取所有星球
    const allPlanets = await db.select().from(planets);
    result.planets = allPlanets.map(p => ({
      id: p.id,
      name: p.name,
      creatorId: p.creatorId,
      ownerAsPublisher: p.ownerAsPublisher,
    }));

    // 分析问题
    if (allSignals.length === 0) {
      result.analysis.push('❌ 数据库中没有任何信号数据');
    } else {
      result.analysis.push(`✅ 数据库中有 ${allSignals.length} 条信号`);
    }

    // 检查信号的planet_id
    const signalsWithPlanet = allSignals.filter(s => s.planetId !== null);
    const signalsWithoutPlanet = allSignals.filter(s => s.planetId === null);
    
    if (signalsWithoutPlanet.length > 0) {
      result.analysis.push(`⚠️ 有 ${signalsWithoutPlanet.length} 条信号没有关联星球(planet_id为空)`);
      result.analysis.push('这些信号需要在发送时传入正确的planet_id');
    }
    
    if (signalsWithPlanet.length > 0) {
      result.analysis.push(`✅ 有 ${signalsWithPlanet.length} 条信号已关联星球`);
    }

    // 检查MT账号绑定情况
    if (allMtAccounts.length === 0) {
      result.analysis.push('❌ 没有任何MT账号绑定');
    } else {
      result.analysis.push(`✅ 有 ${allMtAccounts.length} 个MT账号已绑定`);
    }

    // 检查星球设置
    const planetsWithPublisher = allPlanets.filter(p => p.ownerAsPublisher);
    if (planetsWithPublisher.length === 0) {
      result.analysis.push('⚠️ 没有星球开启"星主作为发布者"功能');
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Debug signals error:', error);
    return NextResponse.json({ 
      error: '调试失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
