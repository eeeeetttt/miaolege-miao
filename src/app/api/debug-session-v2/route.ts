import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // 这是一个诊断接口，用于检查当前会话状态
  const session = await getServerSession(authOptions);
  
  return NextResponse.json({
    hasSession: !!session,
    session: session ? {
      user: {
        id: session.user?.id,
        email: session.user?.email,
        name: session.user?.name,
        role: (session.user as any)?.role,
      },
      expires: session.expires,
    } : null,
  });
}
