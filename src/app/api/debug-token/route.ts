import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(request: Request) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  
  return NextResponse.json({
    hasToken: !!token,
    tokenData: token ? {
      id: token.id,
      email: token.email,
      role: token.role,
      sub: token.sub,
    } : null,
    envCheck: {
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      nextAuthUrl: process.env.NEXTAUTH_URL,
    }
  });
}
