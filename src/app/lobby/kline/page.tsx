'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, ArrowLeft, Clock, Target, Trophy, Zap } from 'lucide-react';

interface KLineStatus {
  isActive: boolean;
  currentLevel: number;
  currentBalance: number;
  targetBalance: number;
  maxLevel: number;
  hasCompleted: boolean;
  bestLevel: number;
  entryFeeGold: number;
  initialCapitalSilver: number;
  failThreshold: number;
  completionRewardGold: number;
}

interface Trade {
  id: number;
  type: 'buy' | 'sell';
  price: number;
  lots: number;
  profit: number;
  timestamp: string;
}

export default function KLineDetailPage() {
  const { data: session } = useSession();
  const [goldPrice, setGoldPrice] = useState<any>(null);
  const [klineStatus, setKlineStatus] = useState<KLineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedLots, setSelectedLots] = useState(1);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    try {
      const [priceRes, klineRes] = await Promise.all([
        fetch('/api/gold-price').then(r => r.json()),
        fetch('/api/match/kline').then(r => r.json()),
      ]);

      if (priceRes.success) {
        setGoldPrice(priceRes.data);
      }
      if (klineRes.status) {
        setKlineStatus(klineRes.status);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // 每3秒刷新价格
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleTrade = async (type: 'buy' | 'sell') => {
    if (!session) {
      setMessage({ type: 'error', text: '请先登录' });
      return;
    }
    if (!klineStatus?.isActive) {
      setMessage({ type: 'error', text: '请先报名参加挑战' });
      return;
    }

    setTradeLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/match/kline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trade', type, lots: selectedLots }),
      });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '交易失败' });
    } finally {
      setTradeLoading(false);
    }
  };

  const formatNumber = (num: number) => num.toLocaleString('zh-CN');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  const profit = klineStatus ? klineStatus.currentBalance - klineStatus.initialCapitalSilver : 0;
  const profitRate = klineStatus ? ((klineStatus.currentBalance / klineStatus.initialCapitalSilver - 1) * 100).toFixed(2) : '0.00';
  const progress = klineStatus ? ((klineStatus.currentBalance / klineStatus.targetBalance) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-4">
        <div className="flex items-center gap-3">
          <Link href="/lobby" className="p-2 hover:bg-white/10 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">K线征途</h1>
            <p className="text-amber-100 text-sm">
              {klineStatus?.isActive ? `第${klineStatus.currentLevel}关` : '未参加'}
            </p>
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
        {/* 伦敦金实时价格 */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <span className="text-xl">XAU</span>
              </div>
              <div>
                <p className="font-bold">{goldPrice?.name || '伦敦金'}</p>
                <p className="text-gray-400 text-xs">{goldPrice?.code} · {goldPrice?.unit}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">${goldPrice?.price?.toFixed(2)}</p>
              <p className={`text-sm ${(goldPrice?.change || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(goldPrice?.change || 0) >= 0 ? '+' : ''}{goldPrice?.change?.toFixed(2)} ({(goldPrice?.changePercent || 0).toFixed(2)}%)
              </p>
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>买: ${goldPrice?.bid?.toFixed(2)}</span>
            <span>卖: ${goldPrice?.ask?.toFixed(2)}</span>
            <span>点差: ${goldPrice?.spread?.toFixed(2)}</span>
          </div>
        </div>

        {/* 账户状态 */}
        {klineStatus?.isActive ? (
          <>
            {/* 进度卡片 */}
            <div className="bg-gradient-to-r from-green-900 to-green-800 rounded-xl p-4 border border-green-600">
              <div className="flex justify-between items-center mb-3">
                <span className="text-green-400 font-medium">挑战进行中</span>
                <span className="text-sm text-gray-300">
                  第{klineStatus.currentLevel}关 / 共{klineStatus.maxLevel}关
                </span>
              </div>
              <div className="flex justify-between items-end mb-3">
                <div>
                  <p className="text-gray-400 text-sm">当前净值</p>
                  <p className="text-3xl font-bold">{formatNumber(klineStatus.currentBalance)}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">目标</p>
                  <p className="text-xl font-bold text-green-400">{formatNumber(klineStatus.targetBalance)}</p>
                </div>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3 mb-3">
                <div
                  className="bg-gradient-to-r from-green-500 to-green-400 h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm">
                <span className={`font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {profit >= 0 ? '+' : ''}{formatNumber(profit)} ({profitRate}%)
                </span>
                <span className="text-gray-400">底线: {formatNumber(klineStatus.failThreshold)}</span>
              </div>
            </div>

            {/* 交易面板 */}
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                交易
              </h3>
              
              {/* 手数选择 */}
              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-2">选择手数</p>
                <div className="flex gap-2">
                  {[0.1, 0.5, 1, 2, 5].map(lot => (
                    <button
                      key={lot}
                      onClick={() => setSelectedLots(lot)}
                      className={`flex-1 py-2 rounded-lg font-medium transition ${
                        selectedLots === lot
                          ? 'bg-amber-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {lot}手
                    </button>
                  ))}
                </div>
              </div>

              {/* 交易按钮 */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleTrade('buy')}
                  disabled={tradeLoading}
                  className="py-4 bg-green-600 hover:bg-green-500 rounded-xl font-bold disabled:opacity-50 transition"
                >
                  <TrendingUp className="w-5 h-5 mx-auto mb-1" />
                  买涨
                </button>
                <button
                  onClick={() => handleTrade('sell')}
                  disabled={tradeLoading}
                  className="py-4 bg-red-600 hover:bg-red-500 rounded-xl font-bold disabled:opacity-50 transition"
                >
                  <TrendingDown className="w-5 h-5 mx-auto mb-1" />
                  买跌
                </button>
              </div>
              <p className="text-center text-gray-400 text-xs mt-2">
                每手约需 {selectedLots * 100} 银两保证金
              </p>
            </div>

            {/* 通关奖励 */}
            <div className="bg-purple-900/30 border border-purple-600 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-purple-400" />
                <span className="font-bold text-purple-400">通关奖励</span>
              </div>
              <p className="text-2xl font-bold text-yellow-400">
                {formatNumber(klineStatus.completionRewardGold || 3000)} 金币
              </p>
              <p className="text-gray-400 text-sm mt-1">+ K线宗师称号</p>
            </div>
          </>
        ) : (
          /* 未参加 */
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 text-center">
            <Target className="w-12 h-12 mx-auto text-gray-500 mb-3" />
            <h3 className="text-xl font-bold mb-2">尚未参加挑战</h3>
            <p className="text-gray-400 mb-4">
              报名参赛，从第1关开始挑战
            </p>
            <div className="bg-gray-700 rounded-lg p-4 mb-4 text-left">
              <p className="text-sm text-gray-300 mb-2">参赛条件：</p>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• 银两 ≥ {formatNumber(klineStatus?.initialCapitalSilver || 1000)}</li>
                <li>• 金币 ≥ {formatNumber(klineStatus?.entryFeeGold || 200)}</li>
                <li>• 负债 = 0</li>
              </ul>
            </div>
            <Link
              href="/lobby"
              className="inline-block w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl font-bold"
            >
              前往报名
            </Link>
          </div>
        )}

        {/* 关卡目标 */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-500" />
            关卡目标
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map(level => {
              const target = (klineStatus?.initialCapitalSilver || 1000) + level * 100;
              const isCompleted = klineStatus && (klineStatus.currentLevel > level || klineStatus.bestLevel >= level);
              const isCurrent = klineStatus?.currentLevel === level;
              return (
                <div
                  key={level}
                  className={`text-center p-2 rounded-lg ${
                    isCompleted
                      ? 'bg-green-600/30 border border-green-600'
                      : isCurrent
                      ? 'bg-amber-600/30 border border-amber-600'
                      : 'bg-gray-700'
                  }`}
                >
                  <p className="text-xs text-gray-400">第{level}关</p>
                  <p className="font-bold text-sm">{formatNumber(target)}</p>
                  {isCompleted && <p className="text-xs text-green-400">已完成</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
