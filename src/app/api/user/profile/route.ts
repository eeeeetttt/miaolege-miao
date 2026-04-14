import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// 获取用户资料
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 });
    }

    // 获取用户信息
    const userRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?userId=eq.${targetUserId}&select=*`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${session.user.accessToken || ''}`,
      },
      cache: 'no-store',
    });

    if (!userRes.ok) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
    }

    const usersData = await userRes.json();
    
    if (!usersData || usersData.length === 0) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
    }

    const user = usersData[0];

    // 获取用户星球币余额
    let coinBalance = 0;
    try {
      const balanceRes = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/coin_balances?userId=eq.${targetUserId}&select=balance`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          },
        }
      );
      if (balanceRes.ok) {
        const balances = await balanceRes.json();
        if (balances && balances.length > 0) {
          coinBalance = balances[0].balance || 0;
        }
      }
    } catch (e) {
      console.error('Failed to get coin balance:', e);
    }

    // 获取用户勋章
    let medals: string[] = [];
    try {
      const medalsRes = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_medals?userId=eq.${targetUserId}&select=*`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          },
        }
      );
      if (medalsRes.ok) {
        const medalsData = await medalsRes.json();
        medals = medalsData?.map((m: any) => m.medalName) || [];
      }
    } catch (e) {
      console.error('Failed to get medals:', e);
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        coinBalance,
        createdAt: user.createdAt,
        medals,
        bio: user.bio || null,
      },
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ success: false, error: '获取用户资料失败' }, { status: 500 });
  }
}

// 更新用户资料（银行卡、钱包等）
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { bankName, bankCardNumber, bankCardName, walletAddress } = body;

    // 更新用户信息
    await db
      .update(users)
      .set({
        bankName: bankName || null,
        bankCardNumber: bankCardNumber || null,
        bankCardName: bankCardName || null,
        walletAddress: walletAddress || null,
      })
      .where(eq(users.userId, session.user.id));

    return NextResponse.json({ success: true, message: '资料更新成功' });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ success: false, error: '更新资料失败' }, { status: 500 });
  }
}
