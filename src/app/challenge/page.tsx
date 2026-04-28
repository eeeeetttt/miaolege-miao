'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import styles from './page.module.css';
import { TrendingUp, TrendingDown, Trophy, Users, Zap, Target, Clock, DollarSign, BarChart3, Star, RefreshCw } from 'lucide-react';

interface LevelConfig {
  level: number;
  name: string;
  description: string | null;
  targetBalance: number;
  initialBalance: number;
  failBalance: number;
  reward: string | null;
}

interface Position {
  id: string;
  type: 'long' | 'short';
  openPrice: number;
  amount: number; // 手数
  openTime: string;
  currentPrice: number;
  profit: number;
  profitPercent: number;
}

interface Ranking {
  rank: number;
  userName: string;
  level: number;
  balance: number;
  profitPercent: number;
}

export default function ChallengePage() {
  const { data: session, status } = useSession();
  const [goldPrice, setGoldPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [equity, setEquity] = useState<number>(1000);
  const [position, setPosition] = useState<Position | null>(null);
  const [ranking, setRanking] = useState<Ranking[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [registrationMode, setRegistrationMode] = useState<'free' | 'paid'>('free');
  const [registering, setRegistering] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [hasRegistered, setHasRegistered] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [lotSize, setLotSize] = useState(0.1);
  const priceRef = useRef<number>(0);

  const showToast = useCallback((message: string, type: 'success' | 'warning' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  // 获取实时金价
  const fetchGoldPrice = useCallback(async () => {
    try {
      const res = await fetch('/api/gold-price');
      const data = await res.json();
      if (data.success && data.data) {
        const newPrice = data.data.price;
        setGoldPrice(newPrice);
        if (priceRef.current > 0) {
          setPriceChange(newPrice - priceRef.current);
        }
        priceRef.current = newPrice;
      }
    } catch (e) {
      console.error('获取金价失败:', e);
    }
  }, []);

  // 获取排名数据
  const fetchRanking = useCallback(async () => {
    try {
      const res = await fetch('/api/challenge/ranking');
      if (res.ok) {
        const data = await res.json();
        if (data.rankings) {
          setRanking(data.rankings);
        }
      }
    } catch (e) {
      console.error('获取排名失败:', e);
    }
  }, []);

  // 初始化数据
  useEffect(() => {
    if (status === 'authenticated') {
      // 获取用户挑战状态
      fetch('/api/challenge/register')
        .then(res => res.json())
        .then(data => {
          if (data.registration) {
            setHasRegistered(true);
            setIsActive(data.registration.status === 'active');
            setIsPending(data.registration.status === 'pending');
            if (data.registration.currentLevel) {
              setCurrentLevel(data.registration.currentLevel);
            }
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [status]);

  // 实时价格更新
  useEffect(() => {
    fetchGoldPrice();
    const interval = setInterval(fetchGoldPrice, 5000); // 5秒更新一次
    return () => clearInterval(interval);
  }, [fetchGoldPrice]);

  // 排名数据定期刷新
  useEffect(() => {
    if (hasRegistered) {
      fetchRanking();
      const interval = setInterval(fetchRanking, 30000);
      return () => clearInterval(interval);
    }
  }, [hasRegistered, fetchRanking]);

  // 计算持仓盈亏
  useEffect(() => {
    if (position && goldPrice > 0) {
      const priceDiff = goldPrice - position.openPrice;
      const profit = position.type === 'long' 
        ? priceDiff * position.amount * 100 // 每手每点$1
        : -priceDiff * position.amount * 100;
      const profitPercent = (profit / (position.openPrice * position.amount * 100)) * 100;
      setPosition(prev => prev ? { ...prev, currentPrice: goldPrice, profit, profitPercent } : null);
    }
  }, [goldPrice, position]);

  // 开多单
  const handleLong = () => {
    if (!session) {
      showToast('请先登录', 'warning');
      return;
    }
    if (position) {
      showToast('已有持仓，请先平仓', 'warning');
      return;
    }
    const newPosition: Position = {
      id: Date.now().toString(),
      type: 'long',
      openPrice: goldPrice,
      amount: lotSize,
      openTime: new Date().toISOString(),
      currentPrice: goldPrice,
      profit: 0,
      profitPercent: 0
    };
    setPosition(newPosition);
    showToast(`做多成功，开仓价: $${goldPrice.toFixed(2)}`, 'success');
  };

  // 开空单
  const handleShort = () => {
    if (!session) {
      showToast('请先登录', 'warning');
      return;
    }
    if (position) {
      showToast('已有持仓，请先平仓', 'warning');
      return;
    }
    const newPosition: Position = {
      id: Date.now().toString(),
      type: 'short',
      openPrice: goldPrice,
      amount: lotSize,
      openTime: new Date().toISOString(),
      currentPrice: goldPrice,
      profit: 0,
      profitPercent: 0
    };
    setPosition(newPosition);
    showToast(`做空成功，开仓价: $${goldPrice.toFixed(2)}`, 'success');
  };

  // 平仓
  const handleClose = () => {
    if (!position) {
      showToast('暂无持仓', 'warning');
      return;
    }
    const closedProfit = position.profit;
    setEquity(prev => prev + closedProfit);
    setPosition(null);
    showToast(`平仓完成，${closedProfit >= 0 ? '盈利' : '亏损'} $${Math.abs(closedProfit).toFixed(2)}`, closedProfit >= 0 ? 'success' : 'warning');
  };

  // 报名参赛
  const handleRegister = async () => {
    if (!session) {
      showToast('请先登录', 'warning');
      return;
    }
    setRegistering(true);
    try {
      const res = await fetch('/api/challenge/register', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: registrationMode })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('报名成功！', 'success');
        setHasRegistered(true);
        setIsPending(true);
        // 模拟净值更新
        setEquity(1000);
      } else {
        showToast(data.error || '报名失败', 'warning');
      }
    } catch {
      showToast('网络错误', 'warning');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>加载中...</p>
      </div>
    );
  }

  const isPriceUp = priceChange >= 0;

  // 获取当前关卡配置
  const getLevelConfig = (level: number) => {
    const configs: Record<number, LevelConfig> = {
      1: { level: 1, name: '新手试炼', description: '熟悉交易基础', targetBalance: 1200, initialBalance: 1000, failBalance: 900, reward: null },
      2: { level: 2, name: '趋势认知', description: '判断方向', targetBalance: 1500, initialBalance: 1200, failBalance: 1000, reward: null },
      3: { level: 3, name: '支撑阻力', description: '关键位交易', targetBalance: 2000, initialBalance: 1500, failBalance: 1200, reward: null },
      4: { level: 4, name: '均线战法', description: 'MA均线应用', targetBalance: 2600, initialBalance: 2000, failBalance: 1600, reward: null },
      5: { level: 5, name: 'K线组合', description: '形态识别', targetBalance: 3400, initialBalance: 2600, failBalance: 2100, reward: null },
      6: { level: 6, name: 'MACD实战', description: '指标综合运用', targetBalance: 4400, initialBalance: 3400, failBalance: 2700, reward: null },
      7: { level: 7, name: '布林带策略', description: '波动率交易', targetBalance: 5700, initialBalance: 4400, failBalance: 3500, reward: null },
      8: { level: 8, name: '斐波那契', description: '回撤位交易', targetBalance: 7400, initialBalance: 5700, failBalance: 4600, reward: null },
      9: { level: 9, name: '缠中说禅', description: '中枢与背离', targetBalance: 9600, initialBalance: 7400, failBalance: 5900, reward: null },
      10: { level: 10, name: '黄金猎手', description: '综合实战', targetBalance: 12500, initialBalance: 9600, failBalance: 7700, reward: null },
    };
    return configs[level] || configs[1];
  };

  const currentLevelConfig = getLevelConfig(currentLevel);
  const targetBalance = currentLevelConfig.targetBalance;
  const initialBalance = currentLevelConfig.initialBalance;
  const progressPercent = ((equity - initialBalance) / (targetBalance - initialBalance)) * 100;

  return (
    <div className={styles.pageContainer}>
      {/* Toast 提示 */}
      {toast && (
        <div className={`${styles.toast} ${styles[toast.type]}`}>
          {toast.message}
        </div>
      )}

      <div className={styles.container}>
        {/* 头部 */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Trophy className={styles.headerIcon} />
            <div>
              <h1>K线征途</h1>
              <span className={styles.headerSub}>伦敦金模拟交易挑战</span>
            </div>
          </div>
          {hasRegistered && (
            <div className={styles.levelBadge}>
              <Star className={styles.levelIcon} />
              <span>第{currentLevel}关</span>
            </div>
          )}
        </div>

        {/* 实时行情区域 */}
        <div className={styles.priceSection}>
          <div className={styles.priceCard}>
            <div className={styles.priceHeader}>
              <span className={styles.priceLabel}>伦敦金 XAUUSD</span>
              <RefreshCw className={styles.priceRefresh} />
            </div>
            <div className={styles.priceMain}>
              <span className={styles.priceValue}>${goldPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <div className={`${styles.priceChange} ${isPriceUp ? styles.up : styles.down}`}>
                {isPriceUp ? <TrendingUp className={styles.changeIcon} /> : <TrendingDown className={styles.changeIcon} />}
                <span>{isPriceUp ? '+' : ''}{priceChange.toFixed(2)}</span>
              </div>
            </div>
            <div className={styles.priceTime}>
              <Clock className={styles.timeIcon} />
              <span>{new Date().toLocaleTimeString('zh-CN')}</span>
            </div>
          </div>

          {/* 交易面板 */}
          <div className={styles.tradeCard}>
            <div className={styles.tradeHeader}>
              <span>模拟交易</span>
              {position && (
                <span className={styles.positionBadge}>
                  {position.type === 'long' ? '多' : '空'} ${position.amount}手
                </span>
              )}
            </div>
            
            {/* 手数选择 */}
            <div className={styles.lotSection}>
              <span className={styles.lotLabel}>交易手数</span>
              <div className={styles.lotButtons}>
                {[0.01, 0.05, 0.1, 0.2, 0.5, 1].map(lot => (
                  <button
                    key={lot}
                    className={`${styles.lotBtn} ${lotSize === lot ? styles.lotActive : ''}`}
                    onClick={() => setLotSize(lot)}
                    disabled={!!position}
                  >
                    {lot}
                  </button>
                ))}
              </div>
            </div>

            {/* 交易按钮 */}
            <div className={styles.tradeButtons}>
              <button 
                className={`${styles.tradeBtn} ${styles.longBtn}`}
                onClick={handleLong}
                disabled={!!position}
              >
                <TrendingUp className={styles.tradeIcon} />
                <span>做多</span>
              </button>
              <button 
                className={`${styles.tradeBtn} ${styles.shortBtn}`}
                onClick={handleShort}
                disabled={!!position}
              >
                <TrendingDown className={styles.tradeIcon} />
                <span>做空</span>
              </button>
              <button 
                className={`${styles.tradeBtn} ${styles.closeBtn}`}
                onClick={handleClose}
                disabled={!position}
              >
                <BarChart3 className={styles.tradeIcon} />
                <span>平仓</span>
              </button>
            </div>

            {/* 持仓信息 */}
            {position && (
              <div className={styles.positionInfo}>
                <div className={styles.positionRow}>
                  <span>持仓方向</span>
                  <span className={position.type === 'long' ? styles.longText : styles.shortText}>
                    {position.type === 'long' ? '做多' : '做空'}
                  </span>
                </div>
                <div className={styles.positionRow}>
                  <span>开仓价</span>
                  <span>${position.openPrice.toFixed(2)}</span>
                </div>
                <div className={styles.positionRow}>
                  <span>当前价</span>
                  <span>${position.currentPrice.toFixed(2)}</span>
                </div>
                <div className={styles.positionRow}>
                  <span>持仓盈亏</span>
                  <span className={position.profit >= 0 ? styles.profitText : styles.lossText}>
                    {position.profit >= 0 ? '+' : ''}${position.profit.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 账户与排名区域 */}
        <div className={styles.mainGrid}>
          {/* 左侧：账户信息 */}
          <div className={styles.accountCard}>
            <h3><DollarSign className={styles.cardIcon} />账户概览</h3>
            
            {hasRegistered ? (
              <>
                <div className={styles.accountBalance}>
                  <span className={styles.balanceLabel}>当前净值</span>
                  <span className={styles.balanceValue}>${equity.toFixed(2)}</span>
                </div>
                
                <div className={styles.progressSection}>
                  <div className={styles.progressHeader}>
                    <span>第{currentLevel}关进度</span>
                    <span>{Math.min(Math.max(progressPercent, 0), 100).toFixed(1)}%</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill}
                      style={{ width: `${Math.min(Math.max(progressPercent, 0), 100)}%` }}
                    />
                  </div>
                  <div className={styles.progressLabels}>
                    <span>初始 ${initialBalance}</span>
                    <span>目标 ${targetBalance}</span>
                  </div>
                </div>

                <div className={styles.levelInfo}>
                  <div className={styles.levelInfoItem}>
                    <span>关卡名称</span>
                    <span>{currentLevelConfig.name}</span>
                  </div>
                  <div className={styles.levelInfoItem}>
                    <span>失败底线</span>
                    <span className={styles.failText}>${currentLevelConfig.failBalance}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.registerArea}>
                <p className={styles.registerTitle}>选择参赛模式</p>
                <div className={styles.modeButtons}>
                  <button 
                    className={`${styles.modeBtn} ${registrationMode === 'free' ? styles.modeActive : ''}`}
                    onClick={() => setRegistrationMode('free')}
                  >
                    <Zap className={styles.modeIcon} />
                    <span>免费模式</span>
                    <small>模拟练习</small>
                  </button>
                  <button 
                    className={`${styles.modeBtn} ${registrationMode === 'paid' ? styles.modeActive : ''}`}
                    onClick={() => setRegistrationMode('paid')}
                  >
                    <Trophy className={styles.modeIcon} />
                    <span>付费挑战</span>
                    <small>1000星球币</small>
                  </button>
                </div>
                <button 
                  className={styles.registerBtn}
                  onClick={handleRegister}
                  disabled={registering || !session}
                >
                  {!session ? '请先登录' : registering ? '报名中...' : '立即参赛'}
                </button>
              </div>
            )}
          </div>

          {/* 右侧：排行榜 */}
          <div className={styles.rankingCard}>
            <h3><Trophy className={styles.cardIcon} />收益排行</h3>
            
            {hasRegistered ? (
              <div className={styles.rankingList}>
                {/* 模拟排行数据 */}
                {[
                  { rank: 1, name: '交易高手', level: 8, profit: 285.5 },
                  { rank: 2, name: '黄金猎手', level: 7, profit: 198.2 },
                  { rank: 3, name: '趋势追踪', level: 6, profit: 156.8 },
                  { rank: 4, name: '波段之王', level: 5, profit: 112.3 },
                  { rank: 5, name: '你的昵称', level: currentLevel, profit: ((equity - 1000) / 1000) * 100 },
                ].map((item, idx) => (
                  <div 
                    key={item.rank} 
                    className={`${styles.rankingItem} ${idx < 3 ? styles.topThree : ''}`}
                  >
                    <div className={styles.rankNumber}>
                      {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : item.rank}
                    </div>
                    <div className={styles.rankInfo}>
                      <span className={styles.rankName}>{item.name}</span>
                      <span className={styles.rankLevel}>第{item.level}关</span>
                    </div>
                    <div className={styles.rankProfit}>
                      +{item.profit.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.rankingPlaceholder}>
                <Users className={styles.placeholderIcon} />
                <p>登录后查看排行</p>
              </div>
            )}
          </div>
        </div>

        {/* 关卡展示 */}
        <div className={styles.levelsSection}>
          <h3><Target className={styles.cardIcon} />挑战关卡</h3>
          <div className={styles.levelsGrid}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => {
              const config = getLevelConfig(level);
              const isUnlocked = hasRegistered && level <= currentLevel;
              const isCurrent = hasRegistered && level === currentLevel;
              
              return (
                <div 
                  key={level}
                  className={`${styles.levelCard} ${isCurrent ? styles.currentLevel : ''} ${isUnlocked ? styles.unlocked : ''}`}
                >
                  <div className={styles.levelNum}>{level}</div>
                  <div className={styles.levelName}>{config.name}</div>
                  <div className={styles.levelRange}>
                    ${config.initialBalance} → ${config.targetBalance}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
