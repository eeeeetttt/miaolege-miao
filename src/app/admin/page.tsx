'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Shield, Users, Globe, TrendingUp, BarChart3, Coins } from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [initialized, setInitialized] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    const userRole = session?.user?.role;
    const userEmail = session?.user?.email;
    
    if (userRole === 'admin' || userEmail === '497209390@qq.com') {
      setHasAccess(true);
      
      // 获取统计数据
      fetch('/api/admin/stats')
        .then(res => res.json())
        .then(data => {
          if (data.stats) {
            setStats(data.stats);
          }
        })
        .catch(err => {
          console.error('Stats fetch error:', err);
        })
        .finally(() => {
          setLoading(false);
          setInitialized(true);
        });
    } else {
      setLoading(false);
      setInitialized(true);
      setHasAccess(false);
    }
  }, [status, session, router]);

  // 加载中
  if (status === 'loading' || loading || !initialized) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center h-64">
          <Spinner className="w-8 h-8" />
          <span className="ml-3 text-gray-600">加载中...</span>
        </div>
      </div>
    );
  }

  // 无权限
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <Shield className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <CardTitle>无权限访问</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-4">您没有管理员权限</p>
              <Button onClick={() => router.push('/')}>返回首页</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 渲染统计数据
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
          <Shield className="w-8 h-8 text-purple-500" />
          后台管理
        </h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">用户总数</p>
                  <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">星球总数</p>
                  <p className="text-2xl font-bold">{stats?.totalPlanets || 0}</p>
                </div>
                <Globe className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">信号源总数</p>
                  <p className="text-2xl font-bold">{stats?.totalSignalSources || 0}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">活跃跟单</p>
                  <p className="text-2xl font-bold">{stats?.activeFollows || 0}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">总星球币</p>
                  <p className="text-2xl font-bold">{stats?.totalCoins || 0}</p>
                </div>
                <Coins className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>管理功能</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">完整后台管理功能正在加载中...</p>
            <p className="text-sm text-gray-500 mt-2">当前显示简化版本以诊断问题。</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
