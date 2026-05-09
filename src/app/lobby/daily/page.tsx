'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, Clock, Trophy, Gift, TrendingUp, Target } from 'lucide-react';

interface DailyStatus {
  isRegistered: boolean;
  canRegister: boolean;
  today: string;
  myAccount?: {
    initialCapital: number;
    currentBalance: number;
    profit: number;
  };
  config: {
    enabled: boolean;
    entryCapitalSilver: number;
    entryFeeGold: number;
    registerStartHour: number;
    registerEndHour: number;
    rewards: Array<{rank: number; rewardGold: number; rewardSilver?: number}>;
  };
  leaderboard: Array<{
    rank: number;
    username: string;
    profit: number;
  }>;
}

export default function DailyDetailPage() {
  const { data: session } = useSession();
  const [dailyStatus, setDailyStatus] = useState<DailyStatus | null>(null);
  const [goldPrice, setGoldPrice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    try {
      const [dailyRes, priceRes] = await Promise.all([
        fetch('/api/match/daily').then(r => r.json()),
        fetch('/api/gold-price').then(r => r.json()),
      ]);

      if (dailyRes.config) {
        setDailyStatus(dailyRes);
      }
      if (priceRes.success) {
        setGoldPrice(priceRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRegister = async () => {
    if (!session) {
      setMessage({ type: 'error', text: '请先登录' });
      return;
    }

    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/match/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '报名失败' });
    } finally {
      setActionLoading(false);
    }
  };

  const formatNumber = (num: number) => num.toLocaleString('zh-CN');

  // 获取当前小时
  const currentHour = new Date().getHours();
  const registerTimeText = dailyStatus
    ? `${dailyStatus.config.registerStartHour}:00 - ${dailyStatus.config.registerEndHour}:00`
    : '00:00 - 20:00';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const isInRegisterTime = currentHour >= (dailyStatus?.config?.registerStartHour || 0) && 
                           currentHour < (dailyStatus?.config?.registerEndHour || 20);

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4">
        <div className="flex items-center gap-3">
          <Link href="/lobby" className="p-2 hover:bg-white/10 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">每日挑战赛</h1>
            <p className="text-green-100 text-sm">{dailyStatus?.today || new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mx-4 mt-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {message.text}
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* 今日时间 */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="font-bold">今日赛程</p>
              <p className="text-gray-400 text-sm">{registerTimeText} 可报名</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-700 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-xs">参赛本金</p>
              <p className="font-bold">{formatNumber(dailyStatus?.config?.entryCapitalSilver || 10000)}</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-xs">报名费</p>
              <p className="font-bold">{formatNumber(dailyStatus?.config?.entryFeeGold || 50)} 金币</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-xs">报名状态</p>
              <p className={`font-bold ${isInRegisterTime ? 'text-green-400' : 'text-red-400'}`}>
                {isInRegisterTime ? '可报名' : '已截止'}
              </p>
            </div>
          </div>
        </div>

        {/* 我的账户 */}
        {dailyStatus?.isRegistered && dailyStatus.myAccount ? (
          <div className="bg-gradient-to-r from-green-900 to-emerald-900 rounded-xl p-4 border border-green-600">
            <div className="flex justify-between items-center mb-3">
              <span className="text-green-400 font-medium">我的账户</span>
              <span className="px-3 py-1 bg-green-600 rounded-full text-sm">参赛中</span>
            </div>
            <div className="flex justify-between items-end mb-3">
              <div>
                <p className="text-gray-400 text-sm">当前净值</p>
                <p className="text-2xl font-bold">{formatNumber(dailyStatus.myAccount.currentBalance)}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm">盈利额</p>
                <p className={`text-xl font-bold ${dailyStatus.myAccount.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {dailyStatus.myAccount.profit >= 0 ? '+' : ''}{formatNumber(dailyStatus.myAccount.profit)}
                </p>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">初始: {formatNumber(dailyStatus.myAccount.initialCapital)}</span>
              <span className="text-gray-400">23:59 结算</span>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 text-center">
            <Target className="w-12 h-12 mx-auto text-gray-500 mb-3" />
            <h3 className="text-xl font-bold mb-2">尚未报名</h3>
            <p className="text-gray-400 mb-4">
              报名后从 {formatNumber(dailyStatus?.config?.entryCapitalSilver || 10000)} 银两开始比拼盈利额
            </p>
            {isInRegisterTime ? (
              <button
                onClick={handleRegister}
                disabled={actionLoading || !session || !dailyStatus?.config?.enabled || !dailyStatus?.canRegister}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-bold disabled:opacity-50"
              >
                {actionLoading ? '处理中...' : '立即报名'}
              </button>
            ) : (
              <p className="text-red-400">当前不在报名时间段内</p>
            )}
          </div>
        )}

        {/* 奖励规则 */}
        <div className="bg-yellow-900/30 border border-yellow-600 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-5 h-5 text-yellow-400" />
            <span className="font-bold text-yellow-400">今日奖励</span>
          </div>
          <div className="space-y-2">
            {dailyStatus?.config?.rewards?.slice(0, 5).map((reward, index) => (
              <div key={index} className="flex justify-between items-center bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  {reward.rank === 1 && <Trophy className="w-4 h-4 text-yellow-400" />}
                  <span className="font-medium">第{reward.rank}名</span>
                </div>
                <div className="flex gap-3">
                  {reward.rewardSilver && (
                    <span className="text-gray-400">{formatNumber(reward.rewardSilver)} 银两</span>
                  )}
                  <span className="font-bold text-yellow-400">{formatNumber(reward.rewardGold)} 金币</span>
                </div>
              </div>
            )) || (
              <>
                <div className="flex justify-between items-center bg-gray-700/50 rounded-lg p-3">
                  <span className="flex items-center gap-2"><Trophy className="w-4 h-4 text-yellow-400" /> 第1名</span>
                  <span className="font-bold text-yellow-400">1000 金币 + 10000 银两</span>
                </div>
                <div className="flex justify-between items-center bg-gray-700/50 rounded-lg p-3">
                  <span>第2名</span>
                  <span className="font-bold text-yellow-400">500 金币 + 5000 银两</span>
                </div>
                <div className="flex justify-between items-center bg-gray-700/50 rounded-lg p-3">
                  <span>第3名</span>
                  <span className="font-bold text-yellow-400">300 金币 + 3000 银两</span>
                </div>
                <div className="flex justify-between items-center bg-gray-700/50 rounded-lg p-3">
                  <span>第4-5名</span>
                  <span className="font-bold text-yellow-400">100 金币</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 排行榜 */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            实时排行
          </h3>
          <div className="space-y-2">
            {dailyStatus?.leaderboard?.slice(0, 10).map((item, index) => (
              <div
                key={index}
                className={`flex justify-between items-center p-3 rounded-lg ${
                  item.rank <= 3 ? 'bg-yellow-900/20 border border-yellow-600/30' : 'bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                    item.rank === 1 ? 'bg-yellow-500 text-black' :
                    item.rank === 2 ? 'bg-gray-400 text-black' :
                    item.rank === 3 ? 'bg-amber-600 text-white' :
                    'bg-gray-600'
                  }`}>
                    {item.rank}
                  </span>
                  <span className="font-medium">{item.username}</span>
                </div>
                <span className={`font-bold ${item.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {item.profit >= 0 ? '+' : ''}{formatNumber(item.profit)}
                </span>
              </div>
            )) || (
              <p className="text-center text-gray-400 py-4">暂无排行数据</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
