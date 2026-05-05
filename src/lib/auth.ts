import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

// Supabase 客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.COZE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

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
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        try {
          // 首先尝试 Supabase 认证（用户账户在 Supabase 中）
          if (supabase) {
            const { data: supaUser, error } = await supabase
              .from('users')
              .select('user_id, email, name, role, password')
              .eq('email', email)
              .single();

            if (!error && supaUser) {
              // 验证密码
              if (supaUser.password) {
                const passwordMatch = await bcrypt.compare(password, supaUser.password);
                if (passwordMatch) {
                  return {
                    id: supaUser.user_id,
                    email: supaUser.email,
                    name: supaUser.name,
                    role: supaUser.role || 'user',
                  };
                }
              }
              // 如果密码哈希是 placeholder 或验证失败
              if (supaUser.password === 'placeholder' || !supaUser.password) {
                // 允许使用任意密码登录（仅用于测试）
                return {
                  id: supaUser.user_id,
                  email: supaUser.email,
                  name: supaUser.name,
                  role: supaUser.role || 'user',
                };
              }
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
  },
  pages: {
    signIn: '/login',
  },
  trustHost: true,
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'user' | 'admin';
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
