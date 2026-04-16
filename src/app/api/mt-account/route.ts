import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { mtAccounts } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// 获取用户的所有MT账号
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const accounts = await db
      .select()
      .from(mtAccounts)
      .where(eq(mtAccounts.userId, session.user.id));

    return NextResponse.json({ accounts: accounts || [] });
  } catch (error) {
    console.error('Get MT account error:', error);
    return NextResponse.json({ error: '获取MT账号失败' }, { status: 500 });
  }
}

// 绑定MT账号
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { accountNumber, platform } = await request.json();

    if (!accountNumber || !platform) {
      return NextResponse.json({ error: '账号和平台为必填项' }, { status: 400 });
    }

    if (platform !== 'MT4' && platform !== 'MT5') {
      return NextResponse.json({ error: '平台必须是MT4或MT5' }, { status: 400 });
    }

    // 检查账号是否已被绑定（不限用户数量）
    const [accountExists] = await db
      .select()
      .from(mtAccounts)
      .where(eq(mtAccounts.accountNumber, accountNumber))
      .limit(1);

    if (accountExists) {
      return NextResponse.json({ error: '该账号已被其他用户绑定' }, { status: 400 });
    }

    // 创建绑定（不设置broker，从信号中自动获取）
    await db.insert(mtAccounts).values({
      userId: session.user.id,
      accountNumber,
      broker: null,
      platform,
      isVerified: false,
    });

    return NextResponse.json({
      success: true,
      message: 'MT账号绑定成功',
    });
  } catch (error) {
    console.error('Bind MT account error:', error);
    return NextResponse.json({ error: '绑定MT账号失败' }, { status: 500 });
  }
}

// 解绑MT账号
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    await db
      .delete(mtAccounts)
      .where(eq(mtAccounts.userId, session.user.id));

    return NextResponse.json({
      success: true,
      message: 'MT账号解绑成功',
    });
  } catch (error) {
    console.error('Unbind MT account error:', error);
    return NextResponse.json({ error: '解绑MT账号失败' }, { status: 500 });
  }
}
