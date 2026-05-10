'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import styles from './TradingPanel.module.css';

interface MatchAccount {
  id: number;
  initialCapital: number;
  currentCapital: number;
  profit: number;
  profitRate: number;
  position: {
    lots: number;
    direction: 'long' | 'short' | null;
    entryPrice: number;
    leverage?: number;
    margin?: number;
  } | null;
}

interface TradingPanelProps {
  matchType: string;
  // 方式1：传入完整的账户对象
  account?: MatchAccount | null;
  onRefresh?: () => void;
  // 方式2：直接传入初始值和账户ID
  initialBalance?: number;
  matchAccountId?: string;
  // 是否为紧凑模式
  compact?: boolean;
}

export default function TradingPanel({ matchType, account, onRefresh, initialBalance, matchAccountId, compact = false }: TradingPanelProps) {
  // 如果传入的是 initialBalance 和 matchAccountId，构建 account 对象
  const effectiveAccount: MatchAccount | null = account || (initialBalance && matchAccountId ? {
    id: 0,
    initialCapital: initialBalance,
    currentCapital: initialBalance,
    profit: 0,
    profitRate: 0,
    position: null
  } : null);
  
  // 如果没有账户信息，显示提示
  if (!effectiveAccount) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>交易面板</div>
        <div className={styles.noAccount}>暂无可用账户</div>
      </div>
    );
  }
  
  const [goldPrice, setGoldPrice] = useState<number>(0);
  const [goldBid, setGoldBid] = useState<number>(0);
  const [goldAsk, setGoldAsk] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lots, setLots] = useState<number>(0.1);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const priceRef = useRef<number>(0);

  // 获取伦敦金价格
  const fetchGoldPrice = useCallback(async () => {
    try {
      const res = await fetch('/api/gold-price');
      const data = await res.json();
      if (data.success && data.data) {
        const newPrice = data.data.price;
        const bid = data.data.bid || newPrice - 0.5;
        const ask = data.data.ask || newPrice + 0.5;
        if (priceRef.current > 0) {
          setPriceChange(newPrice - priceRef.current);
        }
        priceRef.current = newPrice;
        setGoldPrice(newPrice);
        setGoldBid(bid);
        setGoldAsk(ask);
        setLoading(false);
      }
    } catch (error) {
      console.error('获取金价失败:', error);
    }
  }, []);

  // 开仓
  const handleOpen = async (direction: 'long' | 'short') => {
    if (!account) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/match/${matchType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trade', direction, lots }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: `${direction === 'long' ? '做多' : '做空'}成功！` });
        onRefresh?.();
      } else {
        setMsg({ type: 'error', text: data.error || '交易失败' });
      }
    } catch (error) {
      setMsg({ type: 'error', text: '网络错误' });
    }
    setSubmitting(false);
  };

  // 平仓
  const handleClose = async () => {
    if (!effectiveAccount || !effectiveAccount.position) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/match/${matchType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close' }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: '平仓成功！' });
        onRefresh?.();
      } else {
        setMsg({ type: 'error', text: data.error || '平仓失败' });
      }
    } catch (error) {
      setMsg({ type: 'error', text: '网络错误' });
    }
    setSubmitting(false);
  };

  // 初始加载和定时刷新
  useEffect(() => {
    fetchGoldPrice();
    const interval = setInterval(fetchGoldPrice, 1000);
    return () => clearInterval(interval);
  }, [fetchGoldPrice]);

  // 计算当前持仓盈亏
  const positionProfit = effectiveAccount?.position
    ? (goldPrice - effectiveAccount.position.entryPrice) *
      (effectiveAccount.position.direction === 'long' ? 1 : -1) *
      effectiveAccount.position.lots *
      100
    : 0;

  if (!account) {
    return (
      <div className={styles.container}>
        <div className={styles.noAccount}>请先报名参赛</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* 价格区域 */}
      <div className={styles.priceSection}>
        <div className={styles.priceHeader}>
          <span className={styles.priceLabel}>伦敦金 (XAU/USD)</span>
          <button className={styles.refreshBtn} onClick={fetchGoldPrice} disabled={loading}>
            <RefreshCw className={`${styles.refreshIcon} ${loading ? styles.spinning : ''}`} size={14} />
          </button>
        </div>
        <div className={styles.priceMain}>
          <span className={styles.priceValue}>{goldPrice.toFixed(2)}</span>
          <span className={`${styles.priceChange} ${priceChange >= 0 ? styles.up : styles.down}`}>
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}
          </span>
        </div>
        <div className={styles.bidAsk}>
          <div className={styles.bid}>
            <span>买</span>
            <span>{goldBid.toFixed(2)}</span>
          </div>
          <div className={styles.ask}>
            <span>卖</span>
            <span>{goldAsk.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 账户信息 */}
      <div className={styles.accountSection}>
        <div className={styles.accountRow}>
          <span>净值</span>
          <span className={styles.accountValue}>${effectiveAccount.currentCapital.toFixed(2)}</span>
        </div>
        <div className={styles.accountRow}>
          <span>盈亏</span>
          <span className={`${styles.accountValue} ${effectiveAccount.profit >= 0 ? styles.profit : styles.loss}`}>
            {effectiveAccount.profit >= 0 ? '+' : ''}${effectiveAccount.profit.toFixed(2)} ({effectiveAccount.profitRate.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* 持仓信息 */}
      {effectiveAccount.position && (
        <div className={styles.positionSection}>
          <div className={styles.positionHeader}>当前持仓</div>
          <div className={styles.positionInfo}>
            <span className={effectiveAccount.position.direction === 'long' ? styles.long : styles.short}>
              {effectiveAccount.position.direction === 'long' ? '多' : '空'}
            </span>
            <span>{effectiveAccount.position.lots} 手</span>
            <span>开仓: {effectiveAccount.position.entryPrice.toFixed(2)}</span>
            <span>杠杆: {effectiveAccount.position.leverage || 500}x</span>
          </div>
          <div className={styles.positionMargin}>
            保证金: ${(effectiveAccount.position.margin || effectiveAccount.position.lots * 100).toFixed(2)}
          </div>
          <div className={`${styles.positionProfit} ${positionProfit >= 0 ? styles.profit : styles.loss}`}>
            浮动盈亏: {positionProfit >= 0 ? '+' : ''}${positionProfit.toFixed(2)}
          </div>
        </div>
      )}

      {/* 手数选择 */}
      <div className={styles.lotsSection}>
        <span className={styles.lotsLabel}>手数</span>
        <div className={styles.lotsButtons}>
          {[0.1, 0.5, 1, 2, 5].map((v) => (
            <button
              key={v}
              className={`${styles.lotsBtn} ${lots === v ? styles.active : ''}`}
              onClick={() => setLots(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* 交易按钮 */}
      <div className={styles.tradeSection}>
        {!effectiveAccount.position ? (
          <>
            <button
              className={`${styles.tradeBtn} ${styles.longBtn}`}
              onClick={() => handleOpen('long')}
              disabled={submitting}
            >
              <TrendingUp size={18} />
              <span>做多</span>
            </button>
            <button
              className={`${styles.tradeBtn} ${styles.shortBtn}`}
              onClick={() => handleOpen('short')}
              disabled={submitting}
            >
              <TrendingDown size={18} />
              <span>做空</span>
            </button>
          </>
        ) : (
          <button
            className={`${styles.tradeBtn} ${styles.closeBtn}`}
            onClick={handleClose}
            disabled={submitting}
          >
            <span>平仓</span>
          </button>
        )}
      </div>

      {/* 消息提示 */}
      {msg && (
        <div className={`${styles.msg} ${msg.type === 'success' ? styles.successMsg : styles.errorMsg}`}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
