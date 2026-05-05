import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

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
          // 使用 Supabase 查询用户
          const supabaseUrl = process.env.COZE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
          
          if (!supabaseUrl || !supabaseKey) {
            console.error('Supabase configuration missing');
            return null;
          }
          
          const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          });

          const { data: userData, error } = await supabase
            .from('users')
            .select('user_id, email, password, name, role')
            .eq('email', email)
            .single();

          if (error || !userData) {
            return null;
          }

          const passwordMatch = await bcrypt.compare(password, userData.password || '');

          if (!passwordMatch) {
            return null;
          }

          console.log('[Auth] authorize - userData:', userData);

          return {
            id: userData.user_id,
            email: userData.email,
            name: userData.name,
            role: userData.role || 'user',
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
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
      // 每次请求时从 Supabase 获取最新的用户信息（包括角色）
      if (token.id) {
        try {
          const supabaseUrl = process.env.COZE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
          
          if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey, {
              auth: { autoRefreshToken: false, persistSession: false }
            });
            
            const { data: userData } = await supabase
              .from('users')
              .select('user_id, role')
              .eq('user_id', token.id)
              .single();
            
            if (userData) {
              session.user.role = userData.role || 'user';
            }
          }
        } catch (error) {
          console.error('[Auth] Session refresh error:', error);
        }
      }
      
      if (session.user) {
        session.user.id = token.id as string;
        // 如果 Supabase 查询失败，使用 token 中的角色
        if (!session.user.role) {
          session.user.role = token.role as 'user' | 'admin';
        }
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
