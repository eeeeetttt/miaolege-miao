import NextAuth, { User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { userAccounts } from '@/lib/schema';
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
      async authorize(credentials: any): Promise<Omit<User, 'id'> & { id: string; role?: string } | null> {
        if (!credentials?.email) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // 管理员直接使用任意密码登录，从 MySQL 查询真实 user_id
        if (email === '497209390@qq.com') {
          try {
            const result = await db.select().from(userAccounts).where(eq(userAccounts.email, email)).limit(1);
            if (result && result[0]) {
              return {
                id: result[0].userId, // 使用 MySQL 中的真实 user_id
                email: result[0].email,
                name: result[0].name || '管理员',
                role: result[0].role as "admin" | "user",
              };
            }
          } catch (e) {
            console.error('Admin query error:', e);
          }
        }

        try {
          // 使用 MySQL 查询用户
          const result = await db.select().from(userAccounts).where(eq(userAccounts.email, email)).limit(1);

          if (result && result[0]) {
            const user = result[0];
            // 如果密码为空或 placeholder，允许登录
            if (!user.passwordHash || 
                user.passwordHash === 'placeholder' ||
                user.passwordHash.startsWith('$2a$10$placeholder')) {
              return {
                id: user.userId,
                email: user.email,
                name: user.name || '用户',
                role: user.role as "admin" | "user",
              };
            }
            // 验证密码
            const passwordMatch = await bcrypt.compare(password, user.passwordHash);
            if (passwordMatch) {
              return {
                id: user.userId,
                email: user.email,
                name: user.name || '用户',
                role: user.role as "admin" | "user",
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
        sameSite: 'none',
        path: '/',
        secure: true,
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
