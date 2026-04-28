'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';

interface GoldPrice {
  price: number;
  change: number;
  changePercent: number;
  name: string;
  code: string;
  time: string;
  unit: string;
  currency: string;
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
        setLastUpdate(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
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

  const isPositive = priceData.change > 0;
  const isNegative = priceData.change < 0;
  const isZero = priceData.change === 0;

  return (
    <div className="flex items-center gap-3">
      {/* 价格 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">伦敦金</span>
        <span className="text-lg font-bold text-amber-600">
          ${priceData.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* 涨跌幅 */}
      <div className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${
        isPositive ? 'bg-red-100 text-red-600' : 
        isNegative ? 'bg-green-100 text-green-600' : 
        'bg-gray-100 text-gray-600'
      }`}>
        {isPositive && <TrendingUp className="w-4 h-4" />}
        {isNegative && <TrendingDown className="w-4 h-4" />}
        {isZero && <Minus className="w-4 h-4" />}
        <span>
          {isPositive && '+'}
          {priceData.changePercent.toFixed(2)}%
        </span>
      </div>

      {/* 更新时间 */}
      <div className="text-xs text-gray-400 flex items-center gap-1">
        <span>{lastUpdate}</span>
        {priceData.estimated && (
          <span className="text-amber-500">(估)</span>
        )}
      </div>

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
