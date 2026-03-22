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
  Signal,
  UserPlus,
  Clock,
  MessageSquare
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
    forumEnabled: boolean;
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
  const [applyingPublisher, setApplyingPublisher] = useState(false);
  const [publisherApplicationStatus, setPublisherApplicationStatus] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    fetchPlanetDetail();
  }, [params.id]);

  useEffect(() => {
    if (data?.userRole) {
      fetchSignalSources();
      fetchPublisherApplicationStatus();
    }
  }, [data?.userRole]);

  const fetchPublisherApplicationStatus = async () => {
    try {
      const res = await fetch(`/api/planet/applications?planetId=${params.id}`);
      const result = await res.json();
      if (result.application) {
        setPublisherApplicationStatus(result.application.status);
      }
    } catch (error) {
      console.error('Failed to fetch application status:', error);
    }
  };

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

  const handleApplyPublisher = async () => {
    if (!session) {
      router.push('/login');
      return;
    }

    setApplyingPublisher(true);
    setError('');

    try {
      const res = await fetch('/api/planet/apply-publisher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planetId: data?.planet.id }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || '申请失败');
      } else {
        setSuccess('申请已提交，请等待星主审核');
        setPublisherApplicationStatus('pending');
      }
    } catch (err) {
      setError('申请失败，请稍后重试');
    } finally {
      setApplyingPublisher(false);
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
          <div className="mb-8 space-y-4">
            <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                您已是该星球成员（角色：{userRole === 'owner' ? '星主' : userRole === 'publisher' ? '发布者' : '跟单者'}）
              </AlertDescription>
            </Alert>
            
            {/* 申请成为发布者按钮 - 仅对跟单者显示 */}
            {userRole === 'follower' && (
              <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                        <UserPlus className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-blue-800 dark:text-blue-300">申请成为信号发布者</h3>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          成为发布者后可绑定MT账号分享交易信号
                        </p>
                      </div>
                    </div>
                    {publisherApplicationStatus === 'pending' ? (
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <Clock className="w-5 h-5" />
                        <span className="text-sm font-medium">申请审核中</span>
                      </div>
                    ) : publisherApplicationStatus === 'rejected' ? (
                      <Button
                        onClick={handleApplyPublisher}
                        disabled={applyingPublisher}
                        variant="outline"
                        className="border-blue-300 dark:border-blue-700"
                      >
                        {applyingPublisher ? (
                          <>
                            <Spinner className="mr-2" />
                            申请中...
                          </>
                        ) : (
                          '重新申请'
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleApplyPublisher}
                        disabled={applyingPublisher}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      >
                        {applyingPublisher ? (
                          <>
                            <Spinner className="mr-2" />
                            申请中...
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-2" />
                            申请成为发布者
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* 论坛入口 */}
            {planet.forumEnabled === true && (
              <Link href={`/planet/${planet.id}/forum`}>
                <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <MessageSquare className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-purple-800 dark:text-purple-300">星球论坛</h3>
                          <p className="text-sm text-purple-600 dark:text-purple-400">
                            与成员交流讨论，分享见解
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-6 h-6 text-purple-400" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
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
                                  
                                  {/* Stats Grid - 只显示总盈利和收益率 */}
                                  <div className="grid grid-cols-2 gap-6">
                                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                      <p className="text-xs text-gray-500 mb-1">总盈利</p>
                                      <p className={`text-xl font-bold ${parseFloat(source.totalProfit) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        ${source.totalProfit}
                                      </p>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                      <p className="text-xs text-gray-500 mb-1">收益率</p>
                                      <p className={`text-xl font-bold ${parseFloat(source.returnRate) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
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
                <CardTitle className="text-lg">星球公告</CardTitle>
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
