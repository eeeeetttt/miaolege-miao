'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface UserInfo {
  userId: string;
  email: string;
  name: string;
  coinBalance: number;
  createdAt: string;
}

export default function UserCenterPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchUserInfo();
    }
  }, [status]);

  const fetchUserInfo = async () => {
    try {
      const res = await fetch('/api/user/info');
      const data = await res.json();
      setUser(data.user);
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">个人中心</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle>账户信息</CardTitle>
              <CardDescription>您的基本账户信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>邮箱</Label>
                <Input value={user?.email || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>昵称</Label>
                <Input value={user?.name || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>注册时间</Label>
                <Input
                  value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''}
                  disabled
                />
              </div>
            </CardContent>
          </Card>

          {/* Balance */}
          <Card>
            <CardHeader>
              <CardTitle>星球币余额</CardTitle>
              <CardDescription>用于购买星球门票</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-center py-8">
                {user?.coinBalance || 0}
                <span className="text-lg font-normal ml-2">星球币</span>
              </div>
              <Button className="w-full" disabled>
                充值（功能开发中）
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>快捷操作</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/planet')}
            >
              浏览星球
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/planet/my')}
            >
              我的星球
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/planet/create')}
            >
              创建星球
            </Button>
            <Button
              variant="destructive"
              onClick={() => signOut({ callbackUrl: '/' })}
            >
              退出登录
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
