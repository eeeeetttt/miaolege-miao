import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// Next.js App Router 需要命名导出
const nextAuthHandler = NextAuth(authOptions);

export const GET = nextAuthHandler;
export const POST = nextAuthHandler;
