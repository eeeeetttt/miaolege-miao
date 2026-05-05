import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: '邮箱和密码不能为空' }, { status: 400 });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
    }

    // 验证密码长度
    if (password.length < 6) {
      return NextResponse.json({ error: '密码长度至少6位' }, { status: 400 });
    }

    // 检查邮箱是否已注册
    const existingUser = await db
      .select({ userId: users.userId })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json({ error: '该邮箱已被注册' }, { status: 400 });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 生成用户ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 创建用户
    await db.insert(users).values({
      userId: userId,
      email: email,
      password: hashedPassword,
      name: name || email.split('@')[0],
      role: 'user',
      coinBalance: 100, // 新用户赠送100星球币
    });

    return NextResponse.json({ 
      success: true, 
      message: '注册成功',
      userId: userId,
    });
  } catch (error) {
    console.error('注册错误:', error);
    return NextResponse.json({ error: '注册失败' }, { status: 500 });
  }
}
