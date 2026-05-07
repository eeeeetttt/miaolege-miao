import { NextResponse } from 'next/server';

/**
 * 获取导航栏按钮配置（公众接口）
 * 默认返回所有导航都显示
 */
export async function GET() {
  return NextResponse.json({ 
    config: {
      nav_show_challenge_hall: true,
      nav_show_kline_challenge: true,
      nav_show_social: true,
      nav_show_docs: true,
      nav_show_suggestion: true,
      nav_show_complaint: true,
      nav_show_download: true,
      nav_show_app_download: true,
    }
  });
}
