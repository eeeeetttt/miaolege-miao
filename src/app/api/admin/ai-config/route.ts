import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  return NextResponse.json({ message: '管理员功能已迁移到 MySQL', data: [] });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ success: true, message: '操作成功' });
}
