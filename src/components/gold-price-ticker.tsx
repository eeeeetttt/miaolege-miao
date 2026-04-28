'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface GoldPrice {
  price: number;
  bid?: number;
  ask?: number;
  spread?: number;
  change?: number;
  changePercent?: number;
  name: string;
  code: string;
  time: string;
  unit: string;
  currency: string;
  source?: string;
  estimated?: boolean;
}

export function GoldPriceTicker() {
  const [priceData, setPriceData] = useState<GoldPrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const fetchPrice = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/gold-price');
      const data = await res.json();
      
      if (data.success && data.data) {
        setPriceData(data.data);
        setLastUpdate(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setError(false);
      } else {
        setError(true);
      }
    } catch (e) {
      console.error('获取价格失败:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrice();
    // 每30秒刷新一次
    const interval = setInterval(fetchPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  if (error || !priceData) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>价格加载中...</span>
      </div>
    );
  }

  // 判断涨跌
  const changePercent = priceData.changePercent || 0;
  const isPositive = changePercent > 0;
  const isNegative = changePercent < 0;

  return (
    <div className="flex items-center gap-4">
      {/* 价格标签 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">伦敦金</span>
        <span className="text-xl font-bold text-amber-600">
          ${priceData.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* 涨跌指示 */}
      <div className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${
        isPositive ? 'bg-red-100 text-red-600' : 
        isNegative ? 'bg-green-100 text-green-600' : 
        'bg-gray-100 text-gray-600'
      }`}>
        {isPositive ? <TrendingUp className="w-4 h-4" /> : 
         isNegative ? <TrendingDown className="w-4 h-4" /> : 
         <Minus className="w-4 h-4" />}
        <span>
          {isPositive && '+'}
          {changePercent.toFixed(2)}%
        </span>
      </div>

      {/* 买价/卖价 */}
      {priceData.bid && priceData.ask && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="flex items-center gap-0.5">
            <ArrowDownRight className="w-3 h-3 text-green-500" />
            {priceData.bid.toLocaleString()}
          </span>
          <span className="flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3 text-red-500" />
            {priceData.ask.toLocaleString()}
          </span>
          {priceData.spread && (
            <span className="text-gray-400">(${priceData.spread.toFixed(2)})</span>
          )}
        </div>
      )}

      {/* 数据来源 */}
      {priceData.source && (
        <div className="text-xs text-gray-400">
          {priceData.source}
        </div>
      )}

      {/* 刷新按钮 */}
      <button 
        onClick={fetchPrice}
        className="p-1 hover:bg-gray-100 rounded transition-colors"
        title="刷新价格"
      >
        <RefreshCw className={`w-3 h-3 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}
