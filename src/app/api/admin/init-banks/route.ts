import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { banks, exchanges } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// 初始化金融系统数据（钱庄和交易所）
// 开发环境使用，任何登录用户都可调用
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 初始化5个钱庄
    const bankData = [
      { bankId: 'bank1', name: '聚宝庄', price: '300000', interestRate: '0.005', maxLoan: '1000000' },
      { bankId: 'bank2', name: '通宝庄', price: '600000', interestRate: '0.005', maxLoan: '1000000' },
      { bankId: 'bank3', name: '万利庄', price: '1200000', interestRate: '0.005', maxLoan: '1000000' },
      { bankId: 'bank4', name: '汇源庄', price: '2000000', interestRate: '0.005', maxLoan: '1000000' },
      { bankId: 'bank5', name: '瑞丰庄', price: '3500000', interestRate: '0.005', maxLoan: '1000000' },
    ];

    let banksInitialized = 0;
    for (const bank of bankData) {
      try {
        const existing = await db.select().from(banks).where(eq(banks.bankId, bank.bankId)).limit(1);
        if (existing.length === 0) {
          await db.insert(banks).values({
            bankId: bank.bankId,
            name: bank.name,
            price: bank.price,
            interestRate: bank.interestRate,
            maxLoan: bank.maxLoan,
            dailyOutput: 0,
            status: 'active',
          });
          banksInitialized++;
        }
      } catch (e) {
        console.error(`Bank ${bank.bankId} error:`, e);
      }
    }

    // 初始化3个交易所
    const exchangeData = [
      { exchangeId: 'ex1', name: '太白交易所', price: '500000', feeRate: '0.002' },
      { exchangeId: 'ex2', name: '金源交易所', price: '800000', feeRate: '0.002' },
      { exchangeId: 'ex3', name: '洪武交易所', price: '1200000', feeRate: '0.002' },
    ];

    let exchangesInitialized = 0;
    for (const ex of exchangeData) {
      try {
        const existing = await db.select().from(exchanges).where(eq(exchanges.exchangeId, ex.exchangeId)).limit(1);
        if (existing.length === 0) {
          await db.insert(exchanges).values({
            exchangeId: ex.exchangeId,
            name: ex.name,
            price: ex.price,
            feeRate: ex.feeRate,
            totalFeeEarned: '0',
            status: 'active',
          });
          exchangesInitialized++;
        }
      } catch (e) {
        console.error(`Exchange ${ex.exchangeId} error:`, e);
      }
    }

    return NextResponse.json({
      success: true,
      message: `初始化完成：新增 ${banksInitialized} 个钱庄，${exchangesInitialized} 个交易所`,
      banksCount: banksInitialized,
      exchangesCount: exchangesInitialized,
    });
  } catch (error) {
    console.error('Init banks error:', error);
    return NextResponse.json({ error: '初始化失败', detail: String(error) }, { status: 500 });
  }
}
