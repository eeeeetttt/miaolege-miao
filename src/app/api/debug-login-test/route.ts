import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // 该功能已迁移到 MySQL，不再支持 Supabase
  return NextResponse.json({ 
    error: '该功能已停用，请使用 MySQL 登录' 
  }, { status: 410 });
}
