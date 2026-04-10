'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { 
  Trophy,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Target,
  Medal,
  Crown,
  ArrowLeft,
  RefreshCw,
  BarChart3
} from 'lucide-react';

interface Participant {
  id: number;
  userId: string;
  userName: string;
  status: string;
  currentLevel: number;
  equity: number;
  profit: number;
  profitRate: number;
  progress: number;
  targetBalance: number;
  startedAt: string;
  completedLevels: number[];
  rank: number;
}

export default function ChallengeHallPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/challenge/hall');
      const data = await res.json();
      if (data.success) {
        setParticipants(data.data || []);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch hall data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // 每30秒自动刷新
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getLevelName = (level: number) => {
    const names = ['', '初出茅庐', '小试牛刀', '渐入佳境', '炉火纯青'];
    return names[level] || `第${level}关`;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="font-bold text-gray-500">#{rank}</span>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">挑战中</Badge>;
      case 'level_passed':
        return <Badge className="bg-amber-500">待审核</Badge>;
      case 'approved':
        return <Badge className="bg-blue-500">待激活</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const stats = {
    total: participants.length,
    active: participants.filter(p => p.status === 'active').length,
    avgProfit: participants.length > 0 
      ? (participants.reduce((sum, p) => sum + p.profitRate, 0) / participants.length).toFixed(2)
      : '0.00',
    topProfit: participants.length > 0 
      ? Math.max(...participants.map(p => p.profitRate)).toFixed(2)
      : '0.00',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/challenge">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回挑战
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">挑战赛大厅</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">实时展示所有参赛选手战绩</p>
              </div>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                  <p className="text-sm text-gray-500">参赛人数</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                  <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
                  <p className="text-sm text-gray-500">进行中</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avgProfit}%</p>
                  <p className="text-sm text-gray-500">平均收益率</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.topProfit}%</p>
                  <p className="text-sm text-gray-500">最高收益率</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Medal className="w-5 h-5 text-amber-500" />
                  实时排行榜
                </CardTitle>
                <CardDescription>
                  数据每30秒自动刷新
                  {lastUpdate && (
                    <span className="ml-2">
                      · 最后更新: {lastUpdate.toLocaleTimeString()}
                    </span>
                  )}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-green-500 border-green-500">
                {stats.active} 人挑战中
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading && participants.length === 0 ? (
              <div className="flex justify-center py-12">
                <Spinner className="w-8 h-8" />
              </div>
            ) : participants.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  暂未有参赛选手
                </p>
                <Link href="/challenge">
                  <Button className="bg-amber-600 hover:bg-amber-700">
                    成为第一个参赛者
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 border-b">
                  <div className="col-span-1">排名</div>
                  <div className="col-span-3">选手</div>
                  <div className="col-span-2 text-right">当前净值</div>
                  <div className="col-span-2 text-right">收益率</div>
                  <div className="col-span-2 text-center">当前关卡</div>
                  <div className="col-span-2 text-center">状态</div>
                </div>

                {/* Participants */}
                {participants.map((p) => (
                  <div 
                    key={p.id}
                    className={`grid grid-cols-12 gap-4 px-4 py-4 rounded-lg border items-center ${
                      p.rank <= 3 
                        ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800' 
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {/* Rank */}
                    <div className="col-span-1 flex items-center justify-center">
                      {getRankIcon(p.rank)}
                    </div>

                    {/* User Info */}
                    <div className="col-span-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold">
                        {p.userName[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{p.userName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          开始于 {p.startedAt ? new Date(p.startedAt).toLocaleDateString() : '-'}
                        </p>
                      </div>
                    </div>

                    {/* Equity */}
                    <div className="col-span-2 text-right">
                      <p className="font-bold text-gray-900 dark:text-white">
                        ${p.equity.toLocaleString()}
                      </p>
                      <div className="flex items-center justify-end gap-1 text-xs">
                        {p.profit >= 0 ? (
                          <TrendingUp className="w-3 h-3 text-green-500" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-red-500" />
                        )}
                        <span className={p.profit >= 0 ? 'text-green-500' : 'text-red-500'}>
                          ${Math.abs(p.profit).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Profit Rate */}
                    <div className="col-span-2 text-right">
                      <p className={`font-bold ${p.profitRate >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {p.profitRate >= 0 ? '+' : ''}{p.profitRate}%
                      </p>
                      {/* Progress Bar */}
                      <div className="mt-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${p.profitRate >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(100, Math.max(0, p.progress))}%` }}
                        />
                      </div>
                    </div>

                    {/* Level */}
                    <div className="col-span-2 text-center">
                      <Badge className="bg-amber-500">
                        第{p.currentLevel}关
                      </Badge>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {getLevelName(p.currentLevel)}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="col-span-2 text-center">
                      {getStatusBadge(p.status)}
                      {p.completedLevels.length > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          已通关: {p.completedLevels.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer CTA */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            想和他们一较高下吗？
          </p>
          <Link href="/challenge">
            <Button size="lg" className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700">
              <Trophy className="mr-2 w-5 h-5" />
              立即报名参赛
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
