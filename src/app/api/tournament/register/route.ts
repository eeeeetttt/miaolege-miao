import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

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

    // TODO: 检查用户是否已报名、是否满足参赛条件等
    // TODO: 创建报名记录

    return NextResponse.json({ success: true, message: '报名成功' });
  } catch (error) {
    console.error('报名失败:', error);
    return NextResponse.json({ success: false, message: '报名失败' }, { status: 500 });
  }
}
