'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PlanetDetail {
  planet: {
    id: number;
    name: string;
    description: string;
    rules: string;
    ticketPrice: number;
    status: string;
    inviteCode: string;
    createdAt: string;
  };
  members: Array<{
    userId: string;
    role: string;
    joinedAt: string;
  }>;
  recentSignals: Array<any>;
  userRole: string | null;
  memberCount: number;
}

export default function PlanetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [data, setData] = useState<PlanetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    fetchPlanetDetail();
  }, [params.id]);

  const fetchPlanetDetail = async () => {
    try {
      const res = await fetch(`/api/planet/${params.id}`);
      const data = await res.json();
      setData(data);
    } catch (error) {
      console.error('Failed to fetch planet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (method: 'purchase' | 'invite') => {
    if (!session) {
      router.push('/login');
      return;
    }

    if (method === 'invite' && !inviteCode) {
      setError('请输入邀请码');
      return;
    }

    setJoining(true);
    setError('');

    try {
      const res = await fetch('/api/planet/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planetId: data?.planet.id,
          method,
          inviteCode: method === 'invite' ? inviteCode : undefined,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || '加入失败');
      } else {
        fetchPlanetDetail();
      }
    } catch (err) {
      setError('加入失败，请稍后重试');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>加载中...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>星球不存在</p>
      </div>
    );
  }

  const { planet, members, recentSignals, userRole, memberCount } = data;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{planet.name}</h1>
                <Badge variant={planet.status === 'active' ? 'default' : 'secondary'}>
                  {planet.status === 'active' ? '活跃' : '已关闭'}
                </Badge>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                {planet.description || '暂无描述'}
              </p>
            </div>
            {userRole === 'owner' && (
              <Link href={`/planet/manage/${planet.id}`}>
                <Button>管理星球</Button>
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>成员数</CardDescription>
              <CardTitle className="text-3xl">{memberCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>门票价格</CardDescription>
              <CardTitle className="text-3xl">
                {planet.ticketPrice > 0 ? `${planet.ticketPrice} 星球币` : '免费'}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>创建时间</CardDescription>
              <CardTitle className="text-lg">
                {new Date(planet.createdAt).toLocaleDateString()}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {!userRole && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>加入星球</CardTitle>
              <CardDescription>购买门票或使用邀请码加入星球</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {planet.ticketPrice > 0 && (
                <Button
                  onClick={() => handleJoin('purchase')}
                  disabled={joining || !session}
                  className="w-full"
                >
                  购买门票加入（{planet.ticketPrice} 星球币）
                </Button>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="输入邀请码"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md"
                />
                <Button
                  variant="outline"
                  onClick={() => handleJoin('invite')}
                  disabled={joining || !session}
                >
                  使用邀请码
                </Button>
              </div>

              {!session && (
                <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                  <Link href="/login" className="text-blue-600 hover:underline">
                    登录
                  </Link>
                  后加入星球
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {userRole && (
          <Card className="mb-8">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <span>您已是该星球成员（角色：{userRole === 'owner' ? '星主' : userRole === 'publisher' ? '发布者' : '跟单者'}）</span>
                {userRole === 'follower' && (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/planet/apply-publisher', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ planetId: planet.id }),
                        });
                        const data = await res.json();
                        if (res.ok) {
                          alert('申请已提交，请等待星主审核');
                        } else {
                          alert(data.error || '申请失败');
                        }
                      } catch (err) {
                        alert('申请失败');
                      }
                    }}
                  >
                    申请成为发布者
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="signals">
          <TabsList>
            <TabsTrigger value="signals">最新信号</TabsTrigger>
            <TabsTrigger value="rules">星球规则</TabsTrigger>
          </TabsList>
          <TabsContent value="signals">
            {userRole ? (
              <Card>
                <CardContent className="py-6">
                  {recentSignals.length > 0 ? (
                    <div className="space-y-4">
                      {recentSignals.map((signal) => (
                        <div key={signal.id} className="border-b pb-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{signal.symbol}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {signal.orderType} · {signal.volume}手
                              </p>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(signal.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-600 dark:text-gray-400">
                      暂无信号
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-6 text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    加入星球后可查看信号
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="rules">
            <Card>
              <CardContent className="py-6">
                <p className="whitespace-pre-wrap">{planet.rules || '暂无规则'}</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
