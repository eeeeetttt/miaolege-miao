import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// NextAuth v4 配置
export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: '邮箱', type: 'email' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials: any) {
        if (!credentials?.email) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // 管理员直接使用任意密码登录
        if (email === '497209390@qq.com') {
          return {
            id: 'admin_001',
            email: '497209390@qq.com',
            name: '管理员',
            role: 'admin',
          };
        }

        try {
          // 使用 MySQL 查询用户
          const result = await db.query.users.findFirst({
            where: eq(users.email, email)
          });

          if (result) {
            // 如果密码为空或 placeholder，允许登录
            if (!result.password || 
                result.password === 'placeholder' ||
                result.password.startsWith('$2a$10$placeholder')) {
              return {
                id: result.userId,
                email: result.email,
                name: result.name,
                role: result.role || 'user',
              };
            }
            // 验证密码
            const passwordMatch = await bcrypt.compare(password, result.password);
            if (passwordMatch) {
              return {
                id: result.userId,
                email: result.email,
                name: result.name,
                role: result.role || 'user',
              };
            }
          }
        } catch (error) {
          console.error('Auth error:', error);
        }

        return null;
      },
    }),
  ],
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-dev',
  trustHost: true,
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false, // 允许 HTTP cookie
      },
    },
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
