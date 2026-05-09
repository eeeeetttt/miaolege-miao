'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface MatchConfig {
  enabled: boolean;
  [key: string]: any;
}

interface KLineStatus {
  isActive: boolean;
  currentLevel: number;
  currentBalance: number;
  targetBalance: number;
  maxLevel: number;
  hasCompleted: boolean;
  bestLevel: number;
}

interface LadderStatus {
  isRegistered: boolean;
  myRank: number | null;
  season: string;
  myAccount?: {
    initialCapital: number;
    currentBalance: number;
    profitRate: string;
  };
  config: MatchConfig;
}

interface DailyStatus {
  isRegistered: boolean;
  canRegister: boolean;
  today: string;
  myAccount?: {
    initialCapital: number;
    currentBalance: number;
    profit: number;
  };
  config: MatchConfig;
}

export default function LobbyPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'kline' | 'ladder' | 'daily'>('kline');
  const [klineStatus, setKlineStatus] = useState<KLineStatus | null>(null);
  const [klineConfig, setKlineConfig] = useState<any>(null);
  const [ladderStatus, setLadderStatus] = useState<LadderStatus | null>(null);
  const [dailyStatus, setDailyStatus] = useState<DailyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchMatchData();
  }, [session]);

  const fetchMatchData = async () => {
    setLoading(true);
    try {
      const [klineRes, ladderRes, dailyRes] = await Promise.all([
        fetch('/api/match/kline').then(r => r.json()),
        fetch('/api/match/ladder').then(r => r.json()),
        fetch('/api/match/daily').then(r => r.json()),
      ]);

      if (klineRes.status) {
        setKlineStatus(klineRes.status);
        setKlineConfig(klineRes.config);
      }
      if (ladderRes.config) {
        setLadderStatus(ladderRes);
      }
      if (dailyRes.config) {
        setDailyStatus(dailyRes);
      }
    } catch (error) {
      console.error('Failed to fetch match data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (type: string) => {
    if (!session) {
      setMessage({ type: 'error', text: '请先登录' });
      return;
    }

    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/match/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        fetchMatchData();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '操作失败' });
    } finally {
      setActionLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-6">
        <h1 className="text-2xl font-bold">赛事大厅</h1>
        <p className="text-amber-100 mt-1">挑战自我，赢取丰厚奖励</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`mx-4 mt-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-700 mt-4">
        <button
          onClick={() => setActiveTab('kline')}
          className={`flex-1 py-3 text-center font-medium transition-colors ${
            activeTab === 'kline'
              ? 'text-amber-500 border-b-2 border-amber-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          K线征途
        </button>
        <button
          onClick={() => setActiveTab('ladder')}
          className={`flex-1 py-3 text-center font-medium transition-colors ${
            activeTab === 'ladder'
              ? 'text-amber-500 border-b-2 border-amber-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          天梯赛
        </button>
        <button
          onClick={() => setActiveTab('daily')}
          className={`flex-1 py-3 text-center font-medium transition-colors ${
            activeTab === 'daily'
              ? 'text-amber-500 border-b-2 border-amber-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          每日挑战
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* K线征途 */}
        {activeTab === 'kline' && klineConfig && (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-amber-500">K线征途</h2>
                  <p className="text-gray-400 text-sm">通关挑战，赢取称号</p>
                </div>
                {klineStatus?.hasCompleted && (
                  <span className="px-3 py-1 bg-purple-600 rounded-full text-sm">已通关</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">参赛本金</p>
                  <p className="text-xl font-bold">{formatNumber(klineConfig.initialCapitalSilver)} 银两</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">报名费</p>
                  <p className="text-xl font-bold">{formatNumber(klineConfig.entryFeeGold)} 金币</p>
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4 mb-6">
                <p className="text-gray-400 text-sm mb-2">通关奖励</p>
                <p className="text-lg font-bold text-yellow-400">
                  {formatNumber(klineConfig.completionRewardGold)} 金币 + "{klineConfig.completionTitle}"
                </p>
              </div>

              {klineStatus?.isActive ? (
                <div className="bg-gradient-to-r from-green-900 to-green-800 rounded-xl p-6 border border-green-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-green-400">进行中</span>
                    <span className="text-sm text-gray-300">第{klineStatus.currentLevel}关 / 共{klineStatus.maxLevel}关</span>
                  </div>
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <p className="text-gray-400 text-sm">当前净值</p>
                      <p className="text-2xl font-bold">{formatNumber(klineStatus.currentBalance)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-sm">目标净值</p>
                      <p className="text-2xl font-bold text-green-400">{formatNumber(klineStatus.targetBalance)}</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-3 mt-4">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-400 h-3 rounded-full transition-all"
                      style={{ width: `${(klineStatus.currentBalance / klineStatus.targetBalance) * 100}%` }}
                    ></div>
                  </div>
                  <div className="mt-4 p-3 bg-green-800/50 rounded-lg">
                    <p className="text-sm text-gray-300">
                      💡 净值达到目标自动通关，跌破 {formatNumber(klineConfig.failThreshold)} 则挑战失败
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {klineStatus && klineStatus.bestLevel > 0 && (
                    <div className="text-center text-gray-400">
                      历史最佳：第{klineStatus.bestLevel}关
                    </div>
                  )}
                  <button
                    onClick={() => handleRegister('kline')}
                    disabled={actionLoading || !session || !klineConfig.enabled}
                    className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? '处理中...' : '立即报名'}
                  </button>
                  {!session && <p className="text-center text-gray-400 text-sm">登录后可报名</p>}
                  {!klineConfig.enabled && <p className="text-center text-red-400 text-sm">赛事已关闭</p>}
                </div>
              )}
            </div>

            {/* 规则说明 */}
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h3 className="font-bold mb-3">规则说明</h3>
              <ul className="text-gray-400 text-sm space-y-2">
                <li>• 报名后获得初始净值 {formatNumber(klineConfig.initialCapitalSilver)} 银两</li>
                <li>• 共10关，每关目标净值递增100</li>
                <li>• 净值达到目标自动进入下一关</li>
                <li>• 净值跌破 {formatNumber(klineConfig.failThreshold)} 挑战失败</li>
                <li>• 负债必须为0才能报名</li>
                <li>• 通关可获得 {formatNumber(klineConfig.completionRewardGold)} 金币和称号</li>
              </ul>
            </div>
          </div>
        )}

        {/* 天梯赛 */}
        {activeTab === 'ladder' && ladderStatus && (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-blue-500">天梯赛</h2>
                  <p className="text-gray-400 text-sm">本月赛季 · {ladderStatus.season}</p>
                </div>
                {ladderStatus.myRank && (
                  <span className="px-3 py-1 bg-blue-600 rounded-full text-sm">
                    第{ladderStatus.myRank}名
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">参赛本金</p>
                  <p className="text-xl font-bold">{formatNumber(ladderStatus.config.entryCapitalSilver)} 银两</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">报名费</p>
                  <p className="text-xl font-bold text-green-400">免费</p>
                </div>
              </div>

              {ladderStatus.isRegistered && ladderStatus.myAccount ? (
                <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-xl p-6 border border-blue-600">
                  <p className="text-blue-400 mb-4">进行中</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">当前净值</p>
                      <p className="text-2xl font-bold">{formatNumber(ladderStatus.myAccount.currentBalance)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">收益率</p>
                      <p className="text-2xl font-bold text-green-400">
                        {parseFloat(ladderStatus.myAccount.profitRate) > 0 ? '+' : ''}
                        {ladderStatus.myAccount.profitRate}%
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleRegister('ladder')}
                  disabled={actionLoading || !session || !ladderStatus.config.enabled}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? '处理中...' : '报名参赛'}
                </button>
              )}
            </div>

            {/* 排行榜入口 */}
            <Link
              href="/lobby/ladder-ranking"
              className="block bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-blue-500 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">查看排行榜</h3>
                  <p className="text-gray-400 text-sm">查看本月排名和奖励</p>
                </div>
                <span className="text-gray-400">›</span>
              </div>
            </Link>

            {/* 规则 */}
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h3 className="font-bold mb-3">规则说明</h3>
              <ul className="text-gray-400 text-sm space-y-2">
                <li>• 每月1日开启新赛季</li>
                <li>• 按收益率排名</li>
                <li>• 前100名可获得金币奖励</li>
                <li>• 赛季结束时退还账户余额</li>
              </ul>
            </div>
          </div>
        )}

        {/* 每日挑战赛 */}
        {activeTab === 'daily' && dailyStatus && (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-green-500">每日挑战赛</h2>
                  <p className="text-gray-400 text-sm">今日 · {dailyStatus.today}</p>
                </div>
                {dailyStatus.isRegistered && (
                  <span className="px-3 py-1 bg-green-600 rounded-full text-sm">已报名</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">参赛本金</p>
                  <p className="text-xl font-bold">{formatNumber(dailyStatus.config.initialCapitalSilver)} 银两</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">报名费</p>
                  <p className="text-xl font-bold">{formatNumber(dailyStatus.config.entryFeeGold)} 金币</p>
                </div>
              </div>

              {dailyStatus.isRegistered && dailyStatus.myAccount ? (
                <div className="bg-gradient-to-r from-green-900 to-green-800 rounded-xl p-6 border border-green-600">
                  <p className="text-green-400 mb-4">进行中</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">当前净值</p>
                      <p className="text-2xl font-bold">{formatNumber(dailyStatus.myAccount.currentBalance)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">当前盈利</p>
                      <p className="text-2xl font-bold text-yellow-400">
                        {dailyStatus.myAccount.profit > 0 ? '+' : ''}
                        {formatNumber(dailyStatus.myAccount.profit)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleRegister('daily')}
                  disabled={actionLoading || !session || !dailyStatus.canRegister}
                  className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? '处理中...' : dailyStatus.canRegister ? '立即报名' : '报名已截止'}
                </button>
              )}

              <p className="text-center text-gray-500 text-sm mt-3">
                报名时间: {dailyStatus.config.entryStartHour}:00 - {dailyStatus.config.entryEndHour}:00
              </p>
            </div>

            {/* 排行榜入口 */}
            <Link
              href="/lobby/daily-ranking"
              className="block bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-green-500 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">查看排行榜</h3>
                  <p className="text-gray-400 text-sm">按盈利额排名，前10名获奖</p>
                </div>
                <span className="text-gray-400">›</span>
              </div>
            </Link>

            {/* 奖励 */}
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h3 className="font-bold mb-3">奖励规则</h3>
              <div className="space-y-2">
                {dailyStatus.config.rewards?.slice(0, 4).map((r: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-400">第{r.rank}{r.rank_to ? `-${r.rank_to}` : ''}名</span>
                    <span className="text-yellow-400">{r.gold}金币 + {r.silver}银两</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
