import { NextRequest, NextResponse } from 'next/server';

// 定时任务密钥（通过环境变量配置）
const CRON_SECRET = process.env.CRON_SECRET || 'your-secret-key';

/**
 * 定时生成每日新闻
 * 
 * 配置外部 Cron 服务调用此端点：
 * - 推荐: https://cron-job.org 或 https://easycron.com
 * - 调用频率: 每天早上 9:00 (Asia/Shanghai)
 * - URL: https://你的域名/api/cron/daily-news
 * - Header: X-Cron-Secret: 你的密钥
 */

// 验证请求
function validateRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('x-cron-secret');
  return authHeader === CRON_SECRET;
}

// 检查是否是早上9点（北京时区）
function isMorningNine(): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
  });
  const timeStr = formatter.format(now);
  return timeStr === '09:00';
}

export async function POST(request: NextRequest) {
  try {
    // 验证请求
    if (!validateRequest(request)) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 检查时间（仅在9点执行）
    // 注释掉这行以允许手动触发测试
    // if (!isMorningNine()) {
    //   return NextResponse.json({ message: '非执行时间' }, { status: 200 });
    // }

    // 调用新闻生成
    const baseUrl = process.env.NEXTAUTH_URL || 'https://jinhuohuo.coze.site';
    const response = await fetch(`${baseUrl}/api/news/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    if (data.success) {
      console.log(`[Cron] 每日新闻生成成功: ${data.message}`);
      return NextResponse.json({
        success: true,
        message: '新闻生成成功',
        data: data.data,
      });
    } else {
      console.error(`[Cron] 新闻生成失败: ${data.error}`);
      return NextResponse.json({
        success: false,
        error: data.error,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[Cron] 执行失败:', error);
    return NextResponse.json({
      success: false,
      error: '执行失败',
    }, { status: 500 });
  }
}

// GET 请求也允许（用于手动测试）
export async function GET(request: NextRequest) {
  try {
    // GET 请求不验证密钥（仅用于简单测试，生产环境应删除）
    // 建议仅通过 POST 调用

    const baseUrl = process.env.NEXTAUTH_URL || 'https://jinhuohuo.coze.site';
    const response = await fetch(`${baseUrl}/api/news/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: '新闻生成成功',
      data: data.data,
    });
  } catch (error) {
    console.error('[Cron] 执行失败:', error);
    return NextResponse.json({
      success: false,
      error: '执行失败',
    }, { status: 500 });
  }
}
