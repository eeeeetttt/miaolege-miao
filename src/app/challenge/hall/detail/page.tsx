'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
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
  Target,
  AlertTriangle,
  BarChart3,
  List,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface EquityRecord {
  recorded_at: string;
  equity: number;
  balance: number;
  profit: number;
}

interface TradeRecord {
  ticket: number;
  symbol: string;
  type: string;
  volume: number;
  open_price: number;
  close_price: number;
  profit: number;
  open_time: string;
  close_time: string;
}

interface LevelConfig {
  name: string;
  initialBalance: number;
  targetBalance: number;
  failBalance: number;
}

interface LevelEquityData {
  level: number;
  name: string;
  initialBalance: number;
  targetBalance: number;
  failBalance: number;
  equityHistory: EquityRecord[];
}

interface ParticipantDetail {
  registration: {
    id: number;
    userId: string;
    userName: string;
    userAvatar: string | null;
    status: string;
    currentLevel: number;
    completedLevels: number[];
    startedAt: string | null;
    completedAt: string | null;
    failedAt: string | null;
    serverName: string | null;
    tradingAccount: string | null;
  };
  levelConfigs: Record<number, LevelConfig>;
  levelEquityData: LevelEquityData[];
  tradeHistory: TradeRecord[];
  totalEquityRecords: number;
}

function DetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registrationId = searchParams.get('id');
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ParticipantDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  useEffect(() => {
    if (registrationId) {
      fetchDetail();
    }
  }, [registrationId]);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/challenge/hall/detail?id=${registrationId}`);
      const result = await res.json();
      if (result.success) {
        setData(result.data);
        if (result.data.registration.currentLevel) {
          setSelectedLevel(result.data.registration.currentLevel);
        }
      } else {
        setError(result.error || '获取详情失败');
      }
    } catch (err) {
      setError('网络错误');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatProfit = (profit: number) => {
    const color = profit >= 0 ? 'text-green-600' : 'text-red-600';
    return `<span class="${color}">${profit >= 0 ? '+' : ''}${profit.toFixed(2)}</span>`;
  };

  const getTradeTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      'buy': '买入',
      'sell': '卖出',
      'buy_limit': '买入限价',
      'sell_limit': '卖出限价',
      'buy_stop': '买入止损',
      'sell_stop': '卖出止损',
    };
    return typeMap[type.toLowerCase()] || type;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error || '未找到数据'}</p>
            <Button onClick={() => router.push('/challenge/hall')}>
              返回排行榜
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { registration, levelEquityData, tradeHistory, levelConfigs } = data;
  const currentEquityData = levelEquityData.find(l => l.level === selectedLevel) || levelEquityData[0];
  const chartData = currentEquityData?.equityHistory.map((record, idx) => ({
    time: formatDate(record.recorded_at),
    equity: record.equity,
    balance: record.balance,
    profit: record.profit,
    index: idx,
  })) || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/challenge/hall">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-lg">
                {registration.userName[0]?.toUpperCase() || '?'}
              </AvatarFallback>
              {registration.userAvatar && <AvatarImage src={registration.userAvatar} />}
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {registration.userName}
              </h1>
              <p className="text-sm text-gray-500">
                挑战进度：第{registration.currentLevel}关
              </p>
            </div>
          </div>
          <Badge className={registration.status === 'active' ? 'bg-green-500' : 'bg-purple-500'}>
            {registration.status === 'active' ? '挑战中' : '待审核'}
          </Badge>
        </div>

        {/* Account Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">服务器</p>
                  <p className="font-medium">{registration.serverName || '-'}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">交易账号</p>
                  <p className="font-mono font-medium">{registration.tradingAccount || '-'}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">已通关关卡</p>
                  <p className="font-bold text-purple-600">
                    {registration.completedLevels?.length || 0} 关
                  </p>
                </div>
                <Target className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="chart" className="space-y-4">
          <TabsList>
            <TabsTrigger value="chart">
              <BarChart3 className="w-4 h-4 mr-2" />
              收益曲线
            </TabsTrigger>
            <TabsTrigger value="trades">
              <List className="w-4 h-4 mr-2" />
              历史单子 ({tradeHistory.length})
            </TabsTrigger>
          </TabsList>

          {/* 收益曲线 Tab */}
          <TabsContent value="chart">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>净值走势</CardTitle>
                  <div className="flex gap-2">
                    {levelEquityData.map((level) => (
                      <Button
                        key={level.level}
                        size="sm"
                        variant={selectedLevel === level.level ? 'default' : 'outline'}
                        onClick={() => setSelectedLevel(level.level)}
                        className={selectedLevel === level.level ? 'bg-amber-500' : ''}
                      >
                        第{level.level}关
                      </Button>
                    ))}
                  </div>
                </div>
                {currentEquityData && (
                  <div className="flex gap-4 text-sm mt-2">
                    <span className="text-green-600">
                      <TrendingUp className="w-4 h-4 inline mr-1" />
                      初始: ${currentEquityData.initialBalance}
                    </span>
                    <span className="text-amber-600">
                      <Target className="w-4 h-4 inline mr-1" />
                      目标: ${currentEquityData.targetBalance}
                    </span>
                    <span className="text-red-500">
                      <AlertTriangle className="w-4 h-4 inline mr-1" />
                      底线: ${currentEquityData.failBalance}
                    </span>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="time" 
                          tick={{ fontSize: 12 }}
                          interval="preserveStartEnd"
                        />
                        <YAxis 
                          domain={['auto', 'auto']}
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `$${value}`}
                        />
                        <Tooltip 
                          formatter={(value: number) => [`$${value.toFixed(2)}`, '净值']}
                          labelFormatter={(label) => `时间: ${label}`}
                        />
                        {currentEquityData && (
                          <>
                            <ReferenceLine 
                              y={currentEquityData.initialBalance} 
                              stroke="#22c55e" 
                              strokeDasharray="5 5"
                              label={{ value: '初始', fill: '#22c55e', fontSize: 12 }}
                            />
                            <ReferenceLine 
                              y={currentEquityData.targetBalance} 
                              stroke="#f59e0b" 
                              strokeDasharray="5 5"
                              label={{ value: '目标', fill: '#f59e0b', fontSize: 12 }}
                            />
                            <ReferenceLine 
                              y={currentEquityData.failBalance} 
                              stroke="#ef4444" 
                              strokeDasharray="5 5"
                              label={{ value: '底线', fill: '#ef4444', fontSize: 12 }}
                            />
                          </>
                        )}
                        <Line 
                          type="monotone" 
                          dataKey="equity" 
                          stroke="#f59e0b" 
                          strokeWidth={2}
                          dot={false}
                          name="净值"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center text-gray-500">
                    暂无净值数据
                  </div>
                )}
                
                {/* 统计信息 */}
                {chartData.length > 0 && (
                  <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-sm text-gray-500">起始净值</p>
                      <p className="font-bold text-green-600">
                        ${chartData[0]?.equity.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">当前净值</p>
                      <p className={`font-bold ${
                        (chartData[chartData.length - 1]?.equity || 0) >= (chartData[0]?.equity || 0) 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        ${chartData[chartData.length - 1]?.equity.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">收益率</p>
                      <p className={`font-bold ${
                        ((chartData[chartData.length - 1]?.equity || 0) - (chartData[0]?.equity || 0)) >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {(((
                          (chartData[chartData.length - 1]?.equity || 0) - (chartData[0]?.equity || 0)
                        ) / (chartData[0]?.equity || 1)) * 100).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 历史单子 Tab */}
          <TabsContent value="trades">
            <Card>
              <CardHeader>
                <CardTitle>交易历史 ({tradeHistory.length}笔)</CardTitle>
              </CardHeader>
              <CardContent>
                {tradeHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2">单号</th>
                          <th className="text-left py-2 px-2">品种</th>
                          <th className="text-left py-2 px-2">类型</th>
                          <th className="text-right py-2 px-2">手数</th>
                          <th className="text-right py-2 px-2">开仓价</th>
                          <th className="text-right py-2 px-2">平仓价</th>
                          <th className="text-right py-2 px-2">盈亏</th>
                          <th className="text-left py-2 px-2">平仓时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tradeHistory.map((trade) => (
                          <tr key={trade.ticket} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="py-2 px-2 font-mono">{trade.ticket}</td>
                            <td className="py-2 px-2">{trade.symbol}</td>
                            <td className="py-2 px-2">
                              <Badge variant={trade.type.toLowerCase().includes('buy') ? 'default' : 'secondary'}>
                                {getTradeTypeName(trade.type)}
                              </Badge>
                            </td>
                            <td className="py-2 px-2 text-right">{trade.volume.toFixed(2)}</td>
                            <td className="py-2 px-2 text-right">{trade.open_price.toFixed(2)}</td>
                            <td className="py-2 px-2 text-right">{trade.close_price.toFixed(2)}</td>
                            <td className={`py-2 px-2 text-right font-bold ${
                              trade.profit >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}
                            </td>
                            <td className="py-2 px-2">{formatDate(trade.close_time)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    暂无交易记录
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function ParticipantDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen">
        <Spinner className="w-8 h-8" />
      </div>
    }>
      <DetailContent />
    </Suspense>
  );
}
