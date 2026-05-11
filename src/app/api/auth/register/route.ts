import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db';

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

    // 检查邮箱是否已注册（MySQL）
    const [existingUsers] = await pool.execute(
      `SELECT user_id FROM user_accounts WHERE email = ? LIMIT 1`
    ) as [any[], any];

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json({ error: '该邮箱已被注册' }, { status: 400 });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 生成用户ID（使用统一格式）
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const userName = name || email.split('@')[0];

    // 只在 MySQL 创建用户
    await pool.execute(
      `INSERT INTO user_accounts (user_id, email, password_hash, name, role, gold_balance, coin_balance, total_debt)
       VALUES (?, ?, ?, ?, 'user', 0, 100, '0.00')`,
      [userId, email, hashedPassword, userName]
    );

    console.log('[注册] MySQL 用户创建成功:', userId);

    return NextResponse.json({ 
      success: true, 
      message: '注册成功',
      userId: userId,
    });
  } catch (error: unknown) {
    console.error('注册错误:', error);
    const message = error instanceof Error ? error.message : '注册失败';
    return NextResponse.json({ error: '注册失败', details: message }, { status: 500 });
  }
}
