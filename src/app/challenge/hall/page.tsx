'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { 
  Trophy,
  TrendingUp,
  TrendingDown,
  Crown,
  Medal,
  RefreshCw
} from 'lucide-react';

interface Participant {
  id: number;
  userId: string;
  userName: string;
  status: string;
  currentLevel: number;
  equity: number;
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
    return <span className="font-bold text-gray-500 w-5 inline-block text-center">#{rank}</span>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">挑战中</Badge>;
      case 'level_passed':
        return <Badge className="bg-amber-500">待审核</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/challenge">
              <Button variant="ghost" size="sm">
                ← 返回挑战
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">挑战赛排行榜</h1>
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

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Medal className="w-5 h-5 text-amber-500" />
                实时排行榜 TOP 10
              </CardTitle>
              {lastUpdate && (
                <span className="text-sm text-gray-500">
                  更新于 {lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading && participants.length === 0 ? (
              <div className="flex justify-center py-12">
                <Spinner className="w-8 h-8" />
              </div>
            ) : participants.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  暂无参赛选手
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
                  <div className="col-span-1 text-center">排名</div>
                  <div className="col-span-4">选手</div>
                  <div className="col-span-3 text-center">关卡</div>
                  <div className="col-span-2 text-center">进度</div>
                  <div className="col-span-2 text-right">净值</div>
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
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold">
                        {p.userName[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{p.userName}</p>
                      </div>
                    </div>

                    {/* Level */}
                    <div className="col-span-3 text-center">
                      <Badge className="bg-amber-500">
                        第{p.currentLevel}关
                      </Badge>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {getLevelName(p.currentLevel)}
                      </p>
                    </div>

                    {/* Progress */}
                    <div className="col-span-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${p.progress >= 50 ? 'bg-green-500' : 'bg-amber-500'}`}
                            style={{ width: `${p.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{p.progress}%</span>
                      </div>
                    </div>

                    {/* Equity */}
                    <div className="col-span-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {p.equity >= 1000 ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <span className={`font-bold ${p.equity >= 1000 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          ${p.equity.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
