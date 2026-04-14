import { NextRequest, NextResponse } from 'next/server';

// 验证码存储（生产环境应使用Redis）
const verificationCodes = new Map<string, { code: string; expiresAt: Date; type: string }>();

// 生成6位验证码
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 发送验证码
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, type } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: '请输入邮箱地址' }, { status: 400 });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: '请输入有效的邮箱地址' }, { status: 400 });
    }

    if (!['register', 'reset', 'change'].includes(type)) {
      return NextResponse.json({ success: false, error: '无效的验证码类型' }, { status: 400 });
    }

    // 生成验证码
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分钟后过期

    // 存储验证码
    verificationCodes.set(email, { code, expiresAt, type });

    // 实际项目中这里应该调用邮件发送服务
    // 现在直接返回验证码（仅用于测试）
    console.log(`[验证码] ${type} - 邮箱: ${email}, 验证码: ${code}`);

    // 返回验证码（生产环境中不应该返回）
    return NextResponse.json({ 
      success: true, 
      message: '验证码已发送',
      // 生产环境应该移除这行
      code: code,
      expiresIn: 600 // 10分钟
    });
  } catch (error) {
    console.error('Send verification code error:', error);
    return NextResponse.json({ success: false, error: '发送验证码失败' }, { status: 500 });
  }
}

// 验证验证码
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code, type } = body;

    if (!email || !code) {
      return NextResponse.json({ success: false, error: '缺少参数' }, { status: 400 });
    }

    const stored = verificationCodes.get(email);

    if (!stored) {
      return NextResponse.json({ success: false, error: '验证码已过期，请重新获取' }, { status: 400 });
    }

    if (stored.type !== type) {
      return NextResponse.json({ success: false, error: '验证码类型不匹配' }, { status: 400 });
    }

    if (new Date() > stored.expiresAt) {
      verificationCodes.delete(email);
      return NextResponse.json({ success: false, error: '验证码已过期，请重新获取' }, { status: 400 });
    }

    if (stored.code !== code) {
      return NextResponse.json({ success: false, error: '验证码错误' }, { status: 400 });
    }

    // 验证成功后删除验证码
    verificationCodes.delete(email);

    return NextResponse.json({ success: true, message: '验证成功' });
  } catch (error) {
    console.error('Verify code error:', error);
    return NextResponse.json({ success: false, error: '验证失败' }, { status: 500 });
  }
}
