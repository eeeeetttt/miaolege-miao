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
          // 首先尝试 Supabase 认证
          if (supabase) {
            const { data: supaUser, error } = await supabase
              .from('users')
              .select('user_id, email, name, role, password')
              .eq('email', email)
              .single();

            if (!error && supaUser) {
              // 如果密码是 placeholder 或为空，允许登录
              if (!supaUser.password || 
                  supaUser.password === 'placeholder' ||
                  supaUser.password.startsWith('$2a$10$placeholder')) {
                return {
                  id: supaUser.user_id,
                  email: supaUser.email,
                  name: supaUser.name,
                  role: supaUser.role || 'user',
                };
              }
              // 验证密码
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
