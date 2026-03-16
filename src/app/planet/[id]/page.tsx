'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PlanetDetailSkeleton, SignalCardSkeleton } from '@/components/loading-skeleton';
import { Spinner } from '@/components/ui/spinner';
import { 
  TrendingUp,
  TrendingDown,
  Eye,
  AlertCircle,
  CheckCircle2,
  Coins,
  BarChart3,
  Activity,
  Percent,
  DollarSign,
  ChevronRight,
  Signal
} from 'lucide-react';

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
  userRole: string | null;
  memberCount: number;
}

interface SignalSource {
  id: number;
  accountNumber: string;
  broker: string;
  platform: string;
  isVerified: boolean;
  totalProfit: string;
  winRate: string;
  totalTrades: number;
  returnRate: string;
  maxDrawdown: string;
  profitFactor: string;
}

export default function PlanetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [data, setData] = useState<PlanetDetail | null>(null);
  const [signalSources, setSignalSources] = useState<SignalSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    fetchPlanetDetail();
  }, [params.id]);

  useEffect(() => {
    if (data?.userRole) {
      fetchSignalSources();
    }
  }, [data?.userRole]);

  const fetchPlanetDetail = async () => {
    try {
      const res = await fetch(`/api/planet/${params.id}`);
      const planetData = await res.json();
      setData(planetData);
    } catch (error) {
      console.error('Failed to fetch planet:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSignalSources = async () => {
    try {
      const res = await fetch(`/api/signals/stats?planetId=${params.id}`);
      const result = await res.json();
      setSignalSources(result.signalSources || []);
    } catch (error) {
      console.error('Failed to fetch signal sources:', error);
    } finally {
      setSignalsLoading(false);
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
        setSuccess('成功加入星球！');
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <PlanetDetailSkeleton />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold mb-2">星球不存在</h2>
            <p className="text-gray-500 mb-4">该星球可能已被删除或您没有访问权限</p>
            <Link href="/planet">
              <Button>返回星球列表</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { planet, userRole } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {planet.name}
                </h1>
                <Badge variant={planet.status === 'active' ? 'default' : 'secondary'} className="text-sm">
                  {planet.status === 'active' ? '活跃' : '已关闭'}
                </Badge>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {planet.description || '暂无描述'}
              </p>
            </div>
            {userRole === 'owner' && (
              <Link href={`/planet/manage/${planet.id}`}>
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                  管理星球
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Join Section */}
        {!userRole && (
          <Card className="mb-8 border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
            <CardHeader>
              <CardTitle>加入星球</CardTitle>
              <CardDescription>购买门票或使用邀请码加入星球</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-400">{success}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col md:flex-row gap-4">
                {planet.ticketPrice > 0 && (
                  <Button
                    onClick={() => handleJoin('purchase')}
                    disabled={joining || !session}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 h-12"
                  >
                    {joining ? (
                      <>
                        <Spinner className="mr-2" />
                        处理中...
                      </>
                    ) : (
                      <>
                        <Coins className="w-4 h-4 mr-2" />
                        购买门票加入（{planet.ticketPrice} 星球币）
                      </>
                    )}
                  </Button>
                )}

                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    placeholder="输入邀请码"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:border-gray-700"
                  />
                  <Button
                    variant="outline"
                    onClick={() => handleJoin('invite')}
                    disabled={joining || !session}
                    className="border-purple-300 dark:border-purple-700"
                  >
                    使用邀请码
                  </Button>
                </div>
              </div>

              {!session && (
                <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                  <Link href="/login" className="text-purple-600 hover:underline font-medium">
                    登录
                  </Link>
                  后加入星球
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Member Info */}
        {userRole && (
          <Alert className="mb-8 border-green-200 bg-green-50 dark:bg-green-900/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-400">
              您已是该星球成员（角色：{userRole === 'owner' ? '星主' : userRole === 'publisher' ? '发布者' : '跟单者'}）
            </AlertDescription>
          </Alert>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Signal Sources */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Signal className="w-5 h-5 text-purple-500" />
                  信号展示
                </CardTitle>
                <CardDescription>
                  该星球的信号源列表，点击查看详情
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userRole ? (
                  signalsLoading ? (
                    <div className="space-y-4">
                      <SignalCardSkeleton />
                      <SignalCardSkeleton />
                    </div>
                  ) : signalSources.length > 0 ? (
                    <div className="space-y-4">
                      {signalSources.map((source, index) => (
                        <Link 
                          key={source.id}
                          href={`/signal/${source.accountNumber}?planetId=${planet.id}`}
                          className="block"
                        >
                          <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                            <CardContent className="p-0">
                              <div className="flex items-center p-6">
                                {/* Account Icon */}
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xl font-bold mr-4">
                                  {index + 1}
                                </div>
                                
                                {/* Account Info */}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h3 className="text-lg font-bold">
                                      信号{index + 1}
                                    </h3>
                                    <Badge variant="outline" className="text-xs">
                                      {source.platform}
                                    </Badge>
                                    {source.isVerified && (
                                      <Badge className="bg-green-500 text-xs">已验证</Badge>
                                    )}
                                  </div>
                                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                                    账号: {source.accountNumber} · {source.broker || '未知经纪商'}
                                  </p>
                                  
                                  {/* Stats Grid */}
                                  <div className="grid grid-cols-4 gap-3">
                                    <div className="text-center">
                                      <p className="text-xs text-gray-500">总盈利</p>
                                      <p className={`font-bold ${parseFloat(source.totalProfit) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        ${source.totalProfit}
                                      </p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-xs text-gray-500">胜率</p>
                                      <p className="font-bold text-blue-500">{source.winRate}%</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-xs text-gray-500">交易笔数</p>
                                      <p className="font-bold">{source.totalTrades}</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-xs text-gray-500">收益率</p>
                                      <p className={`font-bold ${parseFloat(source.returnRate) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {source.returnRate}%
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Arrow */}
                                <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-purple-500 transition-colors" />
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="py-16 text-center">
                      <BarChart3 className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                      <p className="text-gray-500 text-lg">暂无信号源</p>
                      <p className="text-gray-400 text-sm mt-2">信号发布者绑定MT账号后，将在此展示</p>
                    </div>
                  )
                ) : (
                  <div className="py-16 text-center">
                    <Eye className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-500 text-lg mb-2">
                      加入星球后可查看信号源
                    </p>
                    <p className="text-gray-400 text-sm">成为会员，获取实时交易信号</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Planet Rules */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">星球规则</CardTitle>
              </CardHeader>
              <CardContent>
                {planet.rules ? (
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
                      {planet.rules}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 text-sm">暂无规则</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
