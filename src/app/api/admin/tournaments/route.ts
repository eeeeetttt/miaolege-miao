import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { tournamentConfig } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const tournaments = await db.select().from(tournamentConfig).where(eq(tournamentConfig.enabled, true));
    
    if (tournaments.length === 0) {
      // 返回空数组，让前端使用默认数据
      return NextResponse.json({ tournaments: [] });
    }

    return NextResponse.json({ tournaments });
  } catch (error) {
    console.error('获取赛事配置失败:', error);
    return NextResponse.json({ tournaments: [] });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: '请先登录' }, { status: 401 });
    }

    const { tournamentId } = await request.json();
    if (!tournamentId) {
      return NextResponse.json({ success: false, message: '缺少赛事ID' }, { status: 400 });
    }

    // 检查赛事是否存在
    const tournament = await db
      .select()
      .from(tournamentConfig)
      .where(eq(tournamentConfig.id, parseInt(tournamentId)))
      .limit(1);

    if (!tournament.length) {
      return NextResponse.json({ success: false, message: '赛事不存在' }, { status: 404 });
    }

    // TODO: 创建报名记录
    // 这里可以添加报名逻辑

    return NextResponse.json({ success: true, message: '报名成功' });
  } catch (error) {
    console.error('报名失败:', error);
    return NextResponse.json({ success: false, message: '报名失败' }, { status: 500 });
  }
}
