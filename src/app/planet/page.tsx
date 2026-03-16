'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket, Mail, Users } from 'lucide-react';

interface Planet {
  id: number;
  name: string;
  description: string;
  ticketPrice: number;
  status: string;
  memberCount: number;
  createdAt: string;
}

export default function PlanetListPage() {
  const { data: session } = useSession();
  const [planets, setPlanets] = useState<Planet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlanets();
  }, []);

  const fetchPlanets = async () => {
    try {
      const res = await fetch('/api/planet/list');
      const data = await res.json();
      setPlanets(data.planets || []);
    } catch (error) {
      console.error('Failed to fetch planets:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              星球列表
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              发现并加入您感兴趣的星球
            </p>
          </div>
          {session && (
            <Link href="/planet/create">
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                创建星球
              </Button>
            </Link>
          )}
        </div>

        {planets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600 dark:text-gray-400">暂无星球</p>
              {session && (
                <Link href="/planet/create">
                  <Button className="mt-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                    创建第一个星球
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {planets.map((planet) => (
              <Card key={planet.id} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{planet.name}</CardTitle>
                    <Badge variant={planet.status === 'active' ? 'default' : 'secondary'}>
                      {planet.status === 'active' ? '活跃' : '已关闭'}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {planet.description || '暂无描述'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* 进入方式说明 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Ticket className="w-4 h-4 text-purple-500" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {planet.ticketPrice > 0 
                          ? `门票进入：${planet.ticketPrice} 星球币` 
                          : '门票进入：免费'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-blue-500" />
                      <span className="text-gray-600 dark:text-gray-400">
                        邀请码进入
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Link href={`/planet/${planet.id}`} className="w-full">
                    <Button variant="outline" className="w-full border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20">
                      进入星球
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
