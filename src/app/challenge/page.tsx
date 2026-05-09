'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import styles from './page.module.css';
import { TrendingUp, TrendingDown, Trophy, Zap, Target, Medal, Award, RefreshCw } from 'lucide-react';

// 赛事相关组件
import KLineChallenge from './components/KLineChallenge';
import LadderChallenge from './components/LadderChallenge';
import DailyChallenge from './components/DailyChallenge';
import MasterChallenge from './components/MasterChallenge';
import MonthlyChallenge from './components/MonthlyChallenge';

type MatchType = 'kline' | 'ladder' | 'daily' | 'master' | 'monthly';

interface MatchTab {
  id: MatchType;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

interface GoldPrice {
  bid: number;
  ask: number;
  spread: number;
  change: number;
  changePercent: number;
}

const matchTabs: MatchTab[] = [
  { id: 'kline', name: 'K线征途', icon: <Target className={styles.tabIcon} />, color: '#3b82f6', description: '10关闯关' },
  { id: 'ladder', name: '天梯赛', icon: <Trophy className={styles.tabIcon} />, color: '#10b981', description: '月度排行' },
  { id: 'daily', name: '每日挑战', icon: <Zap className={styles.tabIcon} />, color: '#f59e0b', description: '每日排行' },
  { id: 'master', name: '大师邀请', icon: <Award className={styles.tabIcon} />, color: '#8b5cf6', description: '淘汰赛' },
  { id: 'monthly', name: '月度决赛', icon: <Medal className={styles.tabIcon} />, color: '#ef4444', description: '巅峰对决' }
];

function ChallengeContent() {
  const { data: session } = useSession();
  const [activeMatch, setActiveMatch] = useState<MatchType>('kline');
  const [goldPrice, setGoldPrice] = useState<GoldPrice | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);
  const [positionType, setPositionType] = useState<'long' | 'short' | null>(null);

  // 获取伦敦金价格
  const fetchGoldPrice = useCallback(async () => {
    try {
      const res = await fetch('/api/gold-price');
      if (res.ok) {
        const data = await res.json();
        if (data.bid && data.ask) {
          const spread = (data.ask - data.bid).toFixed(2);
          setGoldPrice({
            bid: Number(data.bid),
            ask: Number(data.ask),
            spread: Number(spread),
            change: data.change || 0,
            changePercent: data.changePercent || 0
          });
        }
      }
    } catch (e) {
      console.error('获取金价失败', e);
    } finally {
      setPriceLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoldPrice();
    const interval = setInterval(fetchGoldPrice, 1000);
    return () => clearInterval(interval);
  }, [fetchGoldPrice]);

  // 做多/做空
  const handleTrade = async (type: 'long' | 'short') => {
    if (!goldPrice) return;
    setPositionType(type);
    alert(`已提交${type === 'long' ? '做多' : '做空'}请求！\n价格: ${type === 'long' ? goldPrice.ask : goldPrice.bid}`);
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        {/* 伦敦金价格区域 */}
        <div className={styles.priceHeader}>
          <div className={styles.priceTitle}>
            <span className={styles.priceLabel}>伦敦金 XAU/USD</span>
            <button className={styles.refreshBtn} onClick={fetchGoldPrice} disabled={priceLoading}>
              <RefreshCw className={`${styles.refreshIcon} ${priceLoading ? styles.spinning : ''}`} />
            </button>
          </div>
          
          {goldPrice ? (
            <div className={styles.priceInfo}>
              <div className={styles.priceMain}>
                <span className={styles.priceValue}>{goldPrice.bid.toFixed(2)}</span>
                <span className={styles.priceUnit}>USD</span>
              </div>
              <div className={styles.priceDetails}>
                <span className={styles.detailItem}>
                  <span className={styles.detailLabel}>卖价:</span>
                  <span className={styles.priceAsk}>{goldPrice.ask.toFixed(2)}</span>
                </span>
                <span className={styles.detailItem}>
                  <span className={styles.detailLabel}>点差:</span>
                  <span className={styles.priceSpread}>{goldPrice.spread}</span>
                </span>
              </div>
            </div>
          ) : (
            <div className={styles.priceLoading}>加载中...</div>
          )}

          {/* 快捷交易按钮 */}
          <div className={styles.tradeButtons}>
            <button 
              className={`${styles.tradeBtn} ${styles.longBtn}`}
              onClick={() => handleTrade('long')}
              disabled={!goldPrice}
            >
              <TrendingUp className={styles.tradeIcon} />
              <span className={styles.tradeText}>做多</span>
              {goldPrice && <span className={styles.tradePrice}>{goldPrice.ask.toFixed(2)}</span>}
            </button>
            <button 
              className={`${styles.tradeBtn} ${styles.shortBtn}`}
              onClick={() => handleTrade('short')}
              disabled={!goldPrice}
            >
              <TrendingDown className={styles.tradeIcon} />
              <span className={styles.tradeText}>做空</span>
              {goldPrice && <span className={styles.tradePrice}>{goldPrice.bid.toFixed(2)}</span>}
            </button>
          </div>
        </div>

        {/* 赛事切换标签 */}
        <div className={styles.matchTabs}>
          {matchTabs.map(tab => (
            <button
              key={tab.id}
              className={`${styles.matchTab} ${activeMatch === tab.id ? styles.matchTabActive : ''}`}
              onClick={() => setActiveMatch(tab.id)}
              style={{
                '--tab-color': tab.color,
                '--tab-color-light': `${tab.color}20`
              } as React.CSSProperties}
            >
              {tab.icon}
              <span className={styles.tabName}>{tab.name}</span>
              <span className={styles.tabDesc}>{tab.description}</span>
            </button>
          ))}
        </div>

        {/* 赛事内容区域 */}
        <div className={styles.matchContent}>
          {activeMatch === 'kline' && <KLineChallenge session={session} />}
          {activeMatch === 'ladder' && <LadderChallenge session={session} />}
          {activeMatch === 'daily' && <DailyChallenge session={session} />}
          {activeMatch === 'master' && <MasterChallenge />}
          {activeMatch === 'monthly' && <MonthlyChallenge />}
        </div>
      </div>
    </div>
  );
}

export default function ChallengePage() {
  return (
    <Suspense fallback={<div className={styles.loading}>加载中...</div>}>
      <ChallengeContent />
    </Suspense>
  );
}
