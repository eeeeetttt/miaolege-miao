'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MyPlanet {
  id: number;
  name: string;
  description: string;
  ticketPrice: number;
  status: string;
  role: string;
  joinedAt: string;
  expiryDate: string;
}

export default function MyPlanetsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [planets, setPlanets] = useState<MyPlanet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchMyPlanets();
    }
  }, [status]);

  const fetchMyPlanets = async () => {
    try {
      const res = await fetch('/api/planet/my');
      const data = await res.json();
      setPlanets(data.planets || []);
    } catch (error) {
      console.error('Failed to fetch planets:', error);
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

  const getRoleName = (role: string) => {
    switch (role) {
      case 'owner':
        return '星主';
      case 'publisher':
        return '发布者';
      case 'follower':
        return '跟单者';
      default:
        return role;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">我的星球</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              管理您加入的星球
            </p>
          </div>
          <Link href="/planet/create">
            <Button>创建星球</Button>
          </Link>
        </div>

        {planets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">您还没有加入任何星球</p>
              <Link href="/planet">
                <Button>浏览星球</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {planets.map((planet) => (
              <Card key={planet.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{planet.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {planet.description || '暂无描述'}
                      </CardDescription>
                    </div>
                    <Badge>{getRoleName(planet.role)}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">加入时间</span>
                      <span>{new Date(planet.joinedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">到期时间</span>
                      <span>{new Date(planet.expiryDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/planet/${planet.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">查看</Button>
                    </Link>
                    {planet.role === 'owner' && (
                      <Link href={`/planet/manage/${planet.id}`} className="flex-1">
                        <Button className="w-full">管理</Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
