import { NextRequest, NextResponse } from 'next/server';
import { db, pool } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  let connection;
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码为必填项' },
        { status: 400 }
      );
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '请输入有效的邮箱地址' },
        { status: 400 }
      );
    }

    // 验证密码长度
    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码长度至少为6位' },
        { status: 400 }
      );
    }

    // 测试数据库连接
    try {
      connection = await pool.getConnection();
    } catch (connError) {
      console.error('Database connection error:', connError);
      return NextResponse.json(
        { error: '数据库连接失败，请检查数据库配置' },
        { status: 500 }
      );
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = uuidv4();
    await db.insert(users).values({
      userId,
      email,
      password: hashedPassword,
      name: name || email.split('@')[0],
      coinBalance: 0,
    });

    return NextResponse.json({
      success: true,
      message: '注册成功',
      userId,
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // 提供更详细的错误信息
    let errorMessage = '注册失败，请稍后重试';
    
    if (error instanceof Error) {
      if (error.message.includes('connect')) {
        errorMessage = '数据库连接失败，请检查数据库配置';
      } else if (error.message.includes('ER_ACCESS_DENIED_ERROR')) {
        errorMessage = '数据库访问被拒绝，请检查数据库用户名和密码';
      } else if (error.message.includes('ER_BAD_DB_ERROR')) {
        errorMessage = '数据库不存在，请先创建数据库';
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
