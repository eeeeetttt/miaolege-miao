'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { 
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Target,
  Percent,
  DollarSign,
  AlertTriangle,
  PieChart,
  Play,
  Pause,
  CheckCircle2
} from 'lucide-react';

interface SignalDetail {
  account: {
    accountNumber: string;
    broker?: string;
    platform?: string;
  };
  signals: any[];
  stats: {
    totalTrades: number;
    winCount: number;
    lossCount: number;
    totalProfit: string;
    winRate: string;
    returnRate: string;
    maxDrawdown: string;
    maxDrawdownPercent: string;
    profitFactor: string;
    maxProfit: string;
    maxLoss: string;
    avgWin: string;
    avgLoss: string;
    initialBalance: string;
    broker: string;
    profitHistory: { date: string; time: string; profit: number; returnRate: string }[];
    tradeHistory: any[];
    symbolStats: Record<string, { count: number; profit: number; win: number; loss: number }>;
    directionStats: { buy: { count: number; profit: number }; sell: { count: number; profit: number } };
  };
  followStatus: { status: string; id: number } | null;
}

export default function SignalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [data, setData] = useState<SignalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [followLoading, setFollowLoading] = useState(false);

  const accountNumber = searchParams.get('account') || params.account;
  const planetId = searchParams.get('planetId');

  useEffect(() => {
    if (!accountNumber) {
      setError('缺少账号参数');
      setLoading(false);
      return;
    }
    fetchSignalDetail();
  }, [accountNumber]);

  const fetchSignalDetail = async () => {
    try {
      const res = await fetch(`/api/signals/detail?account=${accountNumber}&planetId=${planetId || ''}`);
      const result = await res.json();
      
      if (!res.ok) {
        setError(result.error || '获取数据失败');
      } else {
        setData(result);
      }
    } catch (err) {
      setError('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!session) {
      router.push('/login');
      return;
    }

    if (!planetId) {
      setError('无法跟单：缺少星球信息');
      return;
    }

    setFollowLoading(true);

    try {
      // 找到最近的平仓信号
      const closeSignals = data?.signals.filter(s => 
        s.signalType?.toLowerCase().includes('close')
      ) || [];
      
      if (closeSignals.length === 0) {
        setError('暂无可跟单的信号');
        setFollowLoading(false);
        return;
      }

      const latestSignal = closeSignals[0];

      if (data?.followStatus?.status === 'active') {
        // 暂停跟单
        const res = await fetch('/api/follow/pause', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planetId,
            signalId: latestSignal.id,
          }),
        });

        if (res.ok) {
          setData(prev => prev ? {
            ...prev,
            followStatus: { ...prev.followStatus!, status: 'paused' }
          } : null);
        }
      } else {
        // 开始跟单
        const res = await fetch('/api/follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planetId,
            signalId: latestSignal.id,
          }),
        });

        const result = await res.json();

        if (res.ok) {
          setData(prev => prev ? {
            ...prev,
            followStatus: { status: 'active', id: result.followId }
          } : null);
        } else {
          setError(result.error || '跟单失败');
        }
      }
    } catch (error) {
      console.error('Follow error:', error);
      setError('跟单操作失败');
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Spinner className="w-8 h-8" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error || '数据加载失败'}</AlertDescription>
          </Alert>
          <div className="mt-4">
            <Link href={planetId ? `/planet/${planetId}` : '/planet'}>
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { stats, signals } = data;
  const closeSignals = signals.filter(s => s.signalType?.toLowerCase().includes('close'));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href={planetId ? `/planet/${planetId}` : '/planet'}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回星球
            </Button>
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {data.account.accountNumber?.slice(-4) || '?'}
              </div>
              <div>
                <h1 className="text-3xl font-bold">
                  信号源 {data.account.accountNumber}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {stats.broker} · {data.account.platform || 'MT5'}
                </p>
              </div>
            </div>

            {/* 跟单按钮 */}
            {session && planetId && (
              <div className="md:ml-auto">
                <Button
                  onClick={handleFollow}
                  disabled={followLoading}
                  size="lg"
                  className={`h-12 px-8 ${
                    data.followStatus?.status === 'active'
                      ? 'bg-yellow-500 hover:bg-yellow-600'
                      : data.followStatus?.status === 'paused'
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                  }`}
                >
                  {followLoading ? (
                    <Spinner className="w-5 h-5" />
                  ) : data.followStatus?.status === 'active' ? (
                    <><Pause className="w-5 h-5 mr-2" /> 暂停跟单</>
                  ) : data.followStatus?.status === 'paused' ? (
                    <><Play className="w-5 h-5 mr-2" /> 恢复跟单</>
                  ) : (
                    <><Play className="w-5 h-5 mr-2" /> 开始跟单</>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* 核心指标卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">总盈利</p>
                  <p className="text-2xl font-bold mt-1">${stats.totalProfit}</p>
                </div>
                <DollarSign className="w-8 h-8 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">胜率</p>
                  <p className="text-2xl font-bold mt-1">{stats.winRate}%</p>
                </div>
                <Percent className="w-8 h-8 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">交易笔数</p>
                  <p className="text-2xl font-bold mt-1">{stats.totalTrades}</p>
                </div>
                <Activity className="w-8 h-8 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">收益率</p>
                  <p className="text-2xl font-bold mt-1">{stats.returnRate}%</p>
                </div>
                <TrendingUp className="w-8 h-8 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 详细数据 */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="overview">数据概览</TabsTrigger>
            <TabsTrigger value="history">交易历史</TabsTrigger>
            <TabsTrigger value="analysis">深度分析</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* 风险指标 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    风险指标
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">最大回撤</span>
                    <div className="text-right">
                      <span className="font-bold text-red-500">-${stats.maxDrawdown}</span>
                      <span className="text-sm text-gray-500 ml-2">({stats.maxDrawdownPercent}%)</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">盈亏比</span>
                    <span className="font-bold">{stats.profitFactor}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">最大单笔盈利</span>
                    <span className="font-bold text-green-500">+${stats.maxProfit}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">最大单笔亏损</span>
                    <span className="font-bold text-red-500">${stats.maxLoss}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">平均盈利</span>
                    <span className="font-bold text-green-500">+${stats.avgWin}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">平均亏损</span>
                    <span className="font-bold text-red-500">-${stats.avgLoss}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">初始资金</span>
                    <span className="font-bold">${stats.initialBalance}</span>
                  </div>
                </CardContent>
              </Card>

              {/* 收益曲线 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    累计收益曲线
                  </CardTitle>
                  <CardDescription>横轴：时间 | 纵轴：累计收益($)</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.profitHistory.length > 0 ? (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={stats.profitHistory.map((point, index) => ({
                            name: point.date,
                            profit: point.profit,
                            returnRate: point.returnRate,
                          }))}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 12, fill: '#9ca3af' }}
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                          />
                          <YAxis 
                            tick={{ fontSize: 12, fill: '#9ca3af' }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `$${value}`}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: 'none',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            }}
                            formatter={(value: number) => [`$${value.toFixed(2)}`, '累计收益']}
                            labelFormatter={(label) => `日期: ${label}`}
                          />
                          <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
                          <Area
                            type="monotone"
                            dataKey="profit"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorProfit)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-400">
                      暂无数据
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>平仓历史记录</CardTitle>
                <CardDescription>
                  共 {closeSignals.length} 笔平仓交易
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="text-left py-3 px-4">时间</th>
                        <th className="text-left py-3 px-4">品种</th>
                        <th className="text-left py-3 px-4">类型</th>
                        <th className="text-left py-3 px-4">手数</th>
                        <th className="text-left py-3 px-4">平仓价</th>
                        <th className="text-right py-3 px-4">盈亏</th>
                        <th className="text-right py-3 px-4">余额</th>
                      </tr>
                    </thead>
                    <tbody>
                      {closeSignals.slice(0, 50).map((signal, index) => (
                        <tr key={signal.id || index} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                            <div>{signal.createdAt ? new Date(signal.createdAt).toLocaleDateString() : '-'}</div>
                            <div className="text-xs">{signal.createdAt ? new Date(signal.createdAt).toLocaleTimeString() : ''}</div>
                          </td>
                          <td className="py-3 px-4 font-medium">{signal.symbol || '-'}</td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-xs">
                              {signal.signalType || '-'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">{signal.volume || '-'}</td>
                          <td className="py-3 px-4">{signal.price || '-'}</td>
                          <td className={`py-3 px-4 text-right font-medium ${
                            parseFloat(signal.dealProfit || '0') >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {parseFloat(signal.dealProfit || '0') >= 0 ? '+' : ''}{signal.dealProfit || '0'}
                          </td>
                          <td className="py-3 px-4 text-right text-sm">
                            {signal.balance || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* 品种分布 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-purple-500" />
                    品种分布
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.symbolStats)
                      .sort((a, b) => b[1].count - a[1].count)
                      .slice(0, 10)
                      .map(([symbol, data]) => (
                        <div key={symbol} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-24 truncate font-medium">{symbol}</div>
                            <div className="text-sm text-gray-500">
                              ({data.count}笔)
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-green-500">{data.win}胜</span>
                            <span className="text-sm text-red-500">{data.loss}负</span>
                            <span className={`font-bold ${data.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {data.profit >= 0 ? '+' : ''}{data.profit.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* 方向分布 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-500" />
                    方向分布
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        买入
                      </span>
                      <span>{stats.directionStats.buy.count} 笔</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${(stats.directionStats.buy.count / (stats.totalTrades || 1)) * 100}%` }}
                      />
                    </div>
                    <div className="text-right text-sm">
                      <span className={stats.directionStats.buy.profit >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {stats.directionStats.buy.profit >= 0 ? '+' : ''}{stats.directionStats.buy.profit.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        卖出
                      </span>
                      <span>{stats.directionStats.sell.count} 笔</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full" 
                        style={{ width: `${(stats.directionStats.sell.count / (stats.totalTrades || 1)) * 100}%` }}
                      />
                    </div>
                    <div className="text-right text-sm">
                      <span className={stats.directionStats.sell.profit >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {stats.directionStats.sell.profit >= 0 ? '+' : ''}{stats.directionStats.sell.profit.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
