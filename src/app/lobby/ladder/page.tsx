'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Medal, TrendingUp, Calendar, Users, Gift } from 'lucide-react';

interface LadderStatus {
  isRegistered: boolean;
  myRank: number | null;
  season: string;
  myAccount?: {
    initialCapital: number;
    currentBalance: number;
    profitRate: string;
  };
  config: {
    enabled: boolean;
    entryCapitalSilver: number;
    seasonDays: number;
    rewards: Array<{rankFrom: number; rankTo: number; rewardGold: number}>;
  };
  leaderboard: Array<{
    rank: number;
    username: string;
    profitRate: string;
    profit: number;
  }>;
}

export default function LadderDetailPage() {
  const { data: session } = useSession();
  const [ladderStatus, setLadderStatus] = useState<LadderStatus | null>(null);
  const [goldPrice, setGoldPrice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    try {
      const [ladderRes, priceRes] = await Promise.all([
        fetch('/api/match/ladder').then(r => r.json()),
        fetch('/api/gold-price').then(r => r.json()),
      ]);

      if (ladderRes.config) {
        setLadderStatus(ladderRes);
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
      const res = await fetch('/api/match/ladder', {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const profit = ladderStatus?.myAccount
    ? ladderStatus.myAccount.currentBalance - ladderStatus.myAccount.initialCapital
    : 0;
  const profitRate = ladderStatus?.myAccount?.profitRate || '0.00';

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4">
        <div className="flex items-center gap-3">
          <Link href="/lobby" className="p-2 hover:bg-white/10 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">天梯赛</h1>
            <p className="text-blue-100 text-sm">{ladderStatus?.season}</p>
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
        {/* 赛季信息 */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="font-bold">当前赛季</p>
              <p className="text-gray-400 text-sm">{ladderStatus?.season}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-700 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-xs">参赛本金</p>
              <p className="font-bold">{formatNumber(ladderStatus?.config?.entryCapitalSilver || 10000)}</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-xs">赛季时长</p>
              <p className="font-bold">{ladderStatus?.config?.seasonDays || 30}天</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-xs">报名费</p>
              <p className="font-bold text-green-400">免费</p>
            </div>
          </div>
        </div>

        {/* 我的账户 */}
        {ladderStatus?.isRegistered && ladderStatus.myAccount ? (
          <div className="bg-gradient-to-r from-blue-900 to-cyan-900 rounded-xl p-4 border border-blue-600">
            <div className="flex justify-between items-center mb-3">
              <span className="text-blue-400 font-medium">我的账户</span>
              {ladderStatus.myRank && (
                <span className="px-3 py-1 bg-blue-600 rounded-full text-sm font-bold">
                  第{ladderStatus.myRank}名
                </span>
              )}
            </div>
            <div className="flex justify-between items-end mb-3">
              <div>
                <p className="text-gray-400 text-sm">当前净值</p>
                <p className="text-2xl font-bold">{formatNumber(ladderStatus.myAccount.currentBalance)}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm">收益率</p>
                <p className={`text-xl font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {profit >= 0 ? '+' : ''}{profitRate}%
                </p>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">初始: {formatNumber(ladderStatus.myAccount.initialCapital)}</span>
              <span className={profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                {profit >= 0 ? '+' : ''}{formatNumber(profit)}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 text-center">
            <Users className="w-12 h-12 mx-auto text-gray-500 mb-3" />
            <h3 className="text-xl font-bold mb-2">尚未报名</h3>
            <p className="text-gray-400 mb-4">
              报名后从 {formatNumber(ladderStatus?.config?.entryCapitalSilver || 10000)} 银两开始比拼收益率
            </p>
            <button
              onClick={handleRegister}
              disabled={actionLoading || !session || !ladderStatus?.config?.enabled}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl font-bold disabled:opacity-50"
            >
              {actionLoading ? '处理中...' : '立即报名'}
            </button>
          </div>
        )}

        {/* 奖励规则 */}
        <div className="bg-yellow-900/30 border border-yellow-600 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-5 h-5 text-yellow-400" />
            <span className="font-bold text-yellow-400">赛季奖励</span>
          </div>
          <div className="space-y-2">
            {ladderStatus?.config?.rewards?.map((reward, index) => (
              <div key={index} className="flex justify-between items-center bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  {reward.rankFrom === 1 && <Trophy className="w-4 h-4 text-yellow-400" />}
                  {reward.rankFrom === 2 && <Medal className="w-4 h-4 text-gray-300" />}
                  {reward.rankFrom === 3 && <Medal className="w-4 h-4 text-amber-600" />}
                  <span className="font-medium">
                    第{reward.rankFrom}{reward.rankFrom !== reward.rankTo ? `-${reward.rankTo}` : ''}名
                  </span>
                </div>
                <span className="font-bold text-yellow-400">{formatNumber(reward.rewardGold)} 金币</span>
              </div>
            )) || (
              <>
                <div className="flex justify-between items-center bg-gray-700/50 rounded-lg p-3">
                  <span className="flex items-center gap-2"><Trophy className="w-4 h-4 text-yellow-400" /> 第1名</span>
                  <span className="font-bold text-yellow-400">5000 金币</span>
                </div>
                <div className="flex justify-between items-center bg-gray-700/50 rounded-lg p-3">
                  <span className="flex items-center gap-2"><Medal className="w-4 h-4 text-gray-300" /> 第2名</span>
                  <span className="font-bold text-yellow-400">3000 金币</span>
                </div>
                <div className="flex justify-between items-center bg-gray-700/50 rounded-lg p-3">
                  <span className="flex items-center gap-2"><Medal className="w-4 h-4 text-amber-600" /> 第3名</span>
                  <span className="font-bold text-yellow-400">2000 金币</span>
                </div>
                <div className="flex justify-between items-center bg-gray-700/50 rounded-lg p-3">
                  <span>第4-10名</span>
                  <span className="font-bold text-yellow-400">1000 金币</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 排行榜 */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            排行榜
          </h3>
          <div className="space-y-2">
            {ladderStatus?.leaderboard?.slice(0, 10).map((item, index) => (
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
                <span className={`font-bold ${parseFloat(item.profitRate) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {item.profitRate}%
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
