'use client';

import { useState, useEffect, useCallback, useRef, Suspense, useMemo } from 'react';
import { TrendingUp, TrendingDown, Zap, Target, DollarSign, BarChart3, X, RefreshCw } from 'lucide-react';
import styles from '../page.module.css';

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
  closePrice: number;
  amount: number;
  openTime: string;
  profit: number;
}

interface EquityHistory {
  time: string;
  equity: number;
  balance: number;
}

interface KLineChallengeProps {
  session: any;
}

const STORAGE_KEY = 'kline_challenge_state';
const EQUITY_HISTORY_KEY = 'kline_equity_history';
const LEVERAGE = 500;
const CONTRACT_SIZE = 100;

export default function KLineChallenge({ session }: KLineChallengeProps) {
  const [goldPrice, setGoldPrice] = useState<number>(0);
  const [goldBid, setGoldBid] = useState<number>(0);
  const [goldAsk, setGoldAsk] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number>(0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [equityHistory, setEquityHistory] = useState<EquityHistory[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [levelConfigs, setLevelConfigs] = useState<LevelConfig[]>([]);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [hasRegistered, setHasRegistered] = useState(false);
  const [lotSize, setLotSize] = useState(0.1);
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set());
  const [canChallenge, setCanChallenge] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [registering, setRegistering] = useState(false);
  const priceRef = useRef<number>(0);
  const positionsRef = useRef<Position[]>([]);
  const isResettingRef = useRef(false);

  const showToast = useCallback((message: string, type: 'success' | 'warning' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const getLevelConfig = useCallback((level: number): LevelConfig => {
    if (levelConfigs.length > 0) {
      const config = levelConfigs.find((c: LevelConfig) => c.level === level);
      if (config) return config;
    }
    return {
      level,
      name: `第${level}关`,
      description: '',
      targetBalance: 1000 + level * 100,
      initialBalance: level === 1 ? 1000 : 1000 + (level - 1) * 100,
      failBalance: 100,
      reward: null
    };
  }, [levelConfigs]);

  const calculatePositionProfit = useCallback((pos: Position, closePrice?: number) => {
    const currentPrice = closePrice || goldPrice;
    if (currentPrice === 0) return { profit: 0 };
    const priceDiff = currentPrice - pos.openPrice;
    const profit = pos.type === 'long'
      ? priceDiff * pos.amount * CONTRACT_SIZE
      : -priceDiff * pos.amount * CONTRACT_SIZE;
    return { profit };
  }, [goldPrice]);

  const totalPositionProfit = useMemo(() => {
    return positions.reduce((sum, pos) => {
      const { profit } = calculatePositionProfit(pos);
      return sum + profit;
    }, 0);
  }, [positions, calculatePositionProfit]);

  const currentEquity = useMemo(() => balance + totalPositionProfit, [balance, totalPositionProfit]);

  // 保存状态到 localStorage
  const saveState = useCallback((state: {
    balance: number;
    positions: Position[];
    currentLevel: number;
    hasRegistered: boolean;
  }) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(EQUITY_HISTORY_KEY, JSON.stringify(equityHistory));
  }, [equityHistory]);

  const maxLots = useMemo(() => {
    if (goldAsk === 0 || balance <= 0) return 0;
    const marginPerLot = goldAsk * CONTRACT_SIZE / LEVERAGE;
    return Math.floor(balance / marginPerLot * 100) / 100;
  }, [goldAsk, balance]);

  const fetchGoldPrice = useCallback(async () => {
    try {
      const res = await fetch('/api/gold-price');
      const data = await res.json();
      if (data.success && data.data) {
        const newPrice = data.data.price;
        const bid = data.data.bid || newPrice - 0.3;
        const ask = data.data.ask || newPrice + 0.3;
        setGoldPrice(newPrice);
        setGoldBid(bid);
        setGoldAsk(ask);
        if (priceRef.current > 0) {
          setPriceChange(newPrice - priceRef.current);
        }
        priceRef.current = newPrice;
      }
    } catch (e) {
      console.error('获取金价失败:', e);
    }
  }, []);

  const fetchLevelConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/match/kline');
      if (res.ok) {
        const data = await res.json();
        if (data.config?.levelTargets) {
          const configs = JSON.parse(data.config.levelTargets);
          setLevelConfigs(configs);
        }
      }
    } catch (e) {
      console.error('获取关卡配置失败:', e);
    }
  }, []);

  // 初始化
  useEffect(() => {
    const init = async () => {
      // 从localStorage加载状态
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const state = JSON.parse(saved);
          if (state.hasRegistered) {
            setBalance(state.balance || 1000);
            setPositions(state.positions || []);
            setCurrentLevel(state.currentLevel || 1);
            setHasRegistered(true);
          }
        } catch (e) {
          console.error('加载状态失败:', e);
        }
      }

      // 加载历史记录
      const historySaved = localStorage.getItem(EQUITY_HISTORY_KEY);
      if (historySaved) {
        try {
          setEquityHistory(JSON.parse(historySaved));
        } catch (e) {
          console.error('加载历史失败:', e);
        }
      }

      await fetchLevelConfigs();
      await fetchGoldPrice();
      setLoading(false);
    };

    init();
  }, [fetchLevelConfigs, fetchGoldPrice]);

  // 实时价格更新 - 每1秒
  useEffect(() => {
    fetchGoldPrice();
    const interval = setInterval(fetchGoldPrice, 1000);
    return () => clearInterval(interval);
  }, [fetchGoldPrice]);

  // 自动保存状态
  useEffect(() => {
    if (isResettingRef.current) return;
    if (!hasRegistered) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      balance, positions, currentLevel, hasRegistered
    }));
  }, [balance, positions, currentLevel, hasRegistered]);

  // 检查净值是否低于失败底线
  useEffect(() => {
    if (!hasRegistered || currentEquity <= 0) return;
    const failBalance = getLevelConfig(currentLevel).failBalance;
    if (currentEquity < failBalance) {
      isResettingRef.current = true;
      showToast(`净值低于底线 $${failBalance}，挑战失败！`, 'warning');
      setPositions([]);
      positionsRef.current = [];
      setCurrentLevel(1);
      setBalance(getLevelConfig(1).initialBalance);
      setEquityHistory([]);
      setHasRegistered(false);
      setCanChallenge(false);
      setIsCompleted(false);
      localStorage.removeItem(STORAGE_KEY);
      setTimeout(() => { isResettingRef.current = false; }, 100);
    }
  }, [currentEquity, hasRegistered, currentLevel, showToast, getLevelConfig]);

  // 检查通关
  const checkAndLevelUp = useCallback(() => {
    if (!hasRegistered || currentEquity <= 0) return;
    const cfg = getLevelConfig(currentLevel);
    if (currentEquity < cfg.targetBalance) return;

    const currentPositions = positionsRef.current;
    const currentBalance = balance;
    const currentLev = currentLevel;

    if (currentPositions.length > 0) {
      const closePrice = goldPrice || priceRef.current;
      let totalProfit = 0;
      currentPositions.forEach(p => {
        const { profit } = calculatePositionProfit(p, closePrice);
        totalProfit += profit;
      });
      const newBalance = currentBalance + totalProfit;
      setPositions([]);
      positionsRef.current = [];
      setBalance(newBalance);
      setEquityHistory([]);
      showToast(`净值达标！自动平仓所有单子，平仓盈亏 $${totalProfit.toFixed(2)}`, 'success');

      setTimeout(() => {
        const nextLevel = currentLev + 1;
        const nextCfg = getLevelConfig(nextLevel);
        if (nextCfg) {
          setBalance(nextCfg.initialBalance);
          setCurrentLevel(nextLevel);
          showToast(`恭喜通关第${currentLev}关！进入第${nextLevel}关`, 'success');
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            balance: nextCfg.initialBalance,
            positions: [],
            currentLevel: nextLevel,
            hasRegistered: true
          }));
        } else {
          setIsCompleted(true);
          setHasRegistered(false);
          localStorage.removeItem(STORAGE_KEY);
          showToast(`🎉 恭喜通关所有关卡！最终净值 $${newBalance.toFixed(2)}`, 'success');
        }
      }, 1000);
      return;
    }

    const nextLevel = currentLev + 1;
    const nextCfg = getLevelConfig(nextLevel);
    if (nextCfg) {
      setBalance(nextCfg.initialBalance);
      setCurrentLevel(nextLevel);
      showToast(`恭喜通关第${currentLev}关！进入第${nextLevel}关`, 'success');
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        balance: nextCfg.initialBalance,
        positions: [],
        currentLevel: nextLevel,
        hasRegistered: true
      }));
    }
  }, [hasRegistered, currentEquity, balance, currentLevel, getLevelConfig, showToast, calculatePositionProfit]);

  useEffect(() => {
    const timer = setTimeout(checkAndLevelUp, 1000);
    return () => clearTimeout(timer);
  }, [checkAndLevelUp]);

  // 开多单 - 支持加仓
  const handleLong = async () => {
    if (!session) { showToast('请先登录', 'warning'); return; }
    if (!canChallenge) { showToast('今日挑战次数已用完', 'warning'); return; }
    if (goldAsk === 0) { showToast('价格加载中', 'warning'); return; }
    
    const currentTotalLots = positions.reduce((sum, pos) => sum + pos.amount, 0);
    if (currentTotalLots + lotSize > maxLots) {
      showToast(`超过最大可开${maxLots.toFixed(2)}手`, 'warning'); return;
    }
    
    const marginRequired = goldAsk * CONTRACT_SIZE * lotSize / LEVERAGE;
    if (marginRequired > balance) {
      showToast(`余额不足，保证金$${marginRequired.toFixed(2)}`, 'warning'); return;
    }

    setPositions(prev => {
      // 检查是否有未平的多单仓位（用于加仓）
      const existingLongPosition = prev.find(pos => pos.type === 'long');
      
      if (existingLongPosition) {
        // 加仓：追加到现有仓位
        const oldTotalLots = existingLongPosition.amount;
        const newTotalLots = oldTotalLots + lotSize;
        const newAvgPrice = (existingLongPosition.openPrice * oldTotalLots + goldAsk * lotSize) / newTotalLots;
        const addMargin = lotSize * 100 * goldAsk / LEVERAGE;
        
        const updated = prev.map(pos => 
          pos.type === 'long' 
            ? { ...pos, amount: newTotalLots, openPrice: newAvgPrice }
            : pos
        );
        positionsRef.current = updated;
        
        setBalance(b => Math.max(0, b - addMargin));
        showToast(`加仓成功！当前持仓${newTotalLots.toFixed(2)}手，均价$${newAvgPrice.toFixed(2)}，消耗保证金$${addMargin.toFixed(2)}`, 'success');
        saveState({ balance: Math.max(0, balance - addMargin), positions: updated, currentLevel, hasRegistered });
        return updated;
      }
      
      // 新开仓位
      const newPosition: Position = {
        id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'long',
        openPrice: goldAsk,
        closePrice: goldAsk,
        amount: lotSize,
        openTime: new Date().toISOString(),
        profit: 0
      };
      
      const updated = [...prev, newPosition];
      positionsRef.current = updated;
      setBalance(b => Math.max(0, b - marginRequired));
      showToast(`做多成功！开仓价: $${goldAsk.toFixed(2)}，手数: ${lotSize}，保证金: $${marginRequired.toFixed(2)}`, 'success');
      saveState({ balance: Math.max(0, balance - marginRequired), positions: updated, currentLevel, hasRegistered });
      return updated;
    });
  };

  // 开空单 - 支持加仓
  const handleShort = async () => {
    if (!session) { showToast('请先登录', 'warning'); return; }
    if (!canChallenge) { showToast('今日挑战次数已用完', 'warning'); return; }
    if (goldBid === 0) { showToast('价格加载中', 'warning'); return; }
    
    const currentTotalLots = positions.reduce((sum, pos) => sum + pos.amount, 0);
    if (currentTotalLots + lotSize > maxLots) {
      showToast(`超过最大可开${maxLots.toFixed(2)}手`, 'warning'); return;
    }
    
    const marginRequired = goldBid * CONTRACT_SIZE * lotSize / LEVERAGE;
    if (marginRequired > balance) {
      showToast(`余额不足，保证金$${marginRequired.toFixed(2)}`, 'warning'); return;
    }

    setPositions(prev => {
      // 检查是否有未平的空单仓位（用于加仓）
      const existingShortPosition = prev.find(pos => pos.type === 'short');
      
      if (existingShortPosition) {
        // 加仓：追加到现有仓位
        const oldTotalLots = existingShortPosition.amount;
        const newTotalLots = oldTotalLots + lotSize;
        const newAvgPrice = (existingShortPosition.openPrice * oldTotalLots + goldBid * lotSize) / newTotalLots;
        const addMargin = lotSize * 100 * goldBid / LEVERAGE;
        
        const updated = prev.map(pos => 
          pos.type === 'short' 
            ? { ...pos, amount: newTotalLots, openPrice: newAvgPrice }
            : pos
        );
        positionsRef.current = updated;
        
        setBalance(b => Math.max(0, b - addMargin));
        showToast(`加仓成功！当前持仓${newTotalLots.toFixed(2)}手，均价$${newAvgPrice.toFixed(2)}，消耗保证金$${addMargin.toFixed(2)}`, 'success');
        saveState({ balance: Math.max(0, balance - addMargin), positions: updated, currentLevel, hasRegistered });
        return updated;
      }
      
      // 新开仓位
      const newPosition: Position = {
        id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'short',
        openPrice: goldBid,
        closePrice: goldBid,
        amount: lotSize,
        openTime: new Date().toISOString(),
        profit: 0
      };
      
      const updated = [...prev, newPosition];
      positionsRef.current = updated;
      setBalance(b => Math.max(0, b - marginRequired));
      showToast(`做空成功！开仓价: $${goldBid.toFixed(2)}，手数: ${lotSize}，保证金: $${marginRequired.toFixed(2)}`, 'success');
      saveState({ balance: Math.max(0, balance - marginRequired), positions: updated, currentLevel, hasRegistered });
      return updated;
    });
  };

  // 平仓
  const handleClosePosition = async (posId: string) => {
    const pos = positions.find(p => p.id === posId);
    if (!pos) return;
    const { profit } = calculatePositionProfit(pos);
    setBalance(prev => prev + profit);
    setPositions(prev => {
      const updated = prev.filter(p => p.id !== posId);
      positionsRef.current = updated;
      return updated;
    });
    showToast(`平仓完成，${profit >= 0 ? '盈利' : '亏损'} $${Math.abs(profit).toFixed(2)}`, profit >= 0 ? 'success' : 'warning');
  };

  // 全部平仓
  const handleCloseAll = async () => {
    if (positions.length === 0) { showToast('当前没有持仓', 'warning'); return; }
    let totalProfit = 0;
    positions.forEach(pos => {
      const { profit } = calculatePositionProfit(pos);
      totalProfit += profit;
    });
    setBalance(prev => prev + totalProfit);
    setPositions([]);
    positionsRef.current = [];
    setSelectedPositions(new Set());
    showToast(`已全部平仓${positions.length}单，${totalProfit >= 0 ? '盈利' : '亏损'} $${Math.abs(totalProfit).toFixed(2)}`, totalProfit >= 0 ? 'success' : 'warning');
  };

  // 报名参赛
  const handleRegister = async () => {
    if (!session) { showToast('请先登录', 'warning'); return; }
    setRegistering(true);
    try {
      const res = await fetch('/api/match/kline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register' })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('报名成功！', 'success');
        setHasRegistered(true);
        setBalance(1000);
        setCurrentLevel(1);
        setPositions([]);
        setCanChallenge(true);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          balance: 1000, positions: [], currentLevel: 1, hasRegistered: true
        }));
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
    return <div className={styles.loadingContainer}><div className={styles.loadingSpinner}></div><p>加载中...</p></div>;
  }

  const isPriceUp = priceChange >= 0;
  const currentLevelConfig = getLevelConfig(currentLevel);
  const targetBalance = currentLevelConfig.targetBalance;
  const initialBalance = currentLevelConfig.initialBalance;
  const progressPercent = currentEquity > 0 ? ((currentEquity - initialBalance) / (targetBalance - initialBalance)) * 100 : 0;

  return (
    <div className={styles.matchContainer}>
      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${styles[toast.type]}`}>{toast.message}</div>
      )}

      {/* 通关成功 */}
      {isCompleted && (
        <div className={styles.victoryContainer}>
          <div className={styles.victoryOverlay}></div>
          <div className={styles.victoryContent}>
            <div className={styles.trophyIcon}>
              <svg viewBox="0 0 24 24" fill="none"><path d="M12 15C15.866 15 19 12.538 19 9.5V4H5V9.5C5 12.538 8.134 15 12 15Z" fill="#FFD700" stroke="#FFA500" strokeWidth="1.5"/><path d="M8 21H16M12 15V11" stroke="#FFA500" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <h1 className={styles.victoryTitle}>恭喜通关！</h1>
            <p className={styles.victorySubtitle}>您已成功挑战全部10关</p>
            <button className={styles.victoryBtn} onClick={() => window.location.reload()}>页面刷新</button>
          </div>
        </div>
      )}

      {/* 实时行情 */}
      <div className={styles.priceSection}>
        <div className={styles.priceCard}>
          <div className={styles.priceHeader}>
            <span className={styles.priceLabel}>伦敦金 XAUUSD</span>
            <span className={styles.priceTime}>{new Date().toLocaleTimeString('zh-CN')}</span>
          </div>
          <div className={styles.priceMain}>
            <span className={styles.priceValue}>${goldPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <div className={`${styles.priceChange} ${isPriceUp ? styles.up : styles.down}`}>
              {isPriceUp ? <TrendingUp className={styles.changeIcon} /> : <TrendingDown className={styles.changeIcon} />}
              <span>{isPriceUp ? '+' : ''}{priceChange.toFixed(2)}</span>
            </div>
          </div>
          <div className={styles.bidAskRow}>
            <div className={styles.bidAskItem}>
              <span className={styles.bidAskLabel}>买价</span>
              <span className={styles.bidAskValue}>${goldBid.toFixed(2)}</span>
            </div>
            <div className={styles.bidAskItem}>
              <span className={styles.bidAskLabel}>卖价</span>
              <span className={styles.bidAskValue}>${goldAsk.toFixed(2)}</span>
            </div>
            <div className={styles.bidAskItem}>
              <span className={styles.bidAskLabel}>点差</span>
              <span className={styles.bidAskValue}>${(goldAsk - goldBid).toFixed(2)}</span>
            </div>
          </div>

          {/* 手数选择 */}
          {hasRegistered && (
            <div className={styles.lotSection}>
              <span className={styles.lotLabel}>手数 (最大{maxLots.toFixed(2)}手)</span>
              <div className={styles.lotButtons}>
                {[0.01, 0.05, 0.1, 0.5, 1].map(lot => (
                  <button key={lot} className={`${styles.lotBtn} ${lotSize === lot ? styles.lotActive : ''}`} onClick={() => setLotSize(lot)} disabled={lot > maxLots}>{lot}</button>
                ))}
              </div>
            </div>
          )}

          {/* 交易按钮 */}
          {hasRegistered && (
            <div className={styles.tradeButtons}>
              <button className={`${styles.tradeBtn} ${styles.longBtn}`} onClick={handleLong}>
                <TrendingUp className={styles.tradeIcon} /><span>做多</span>
              </button>
              <button className={`${styles.tradeBtn} ${styles.shortBtn}`} onClick={handleShort}>
                <TrendingDown className={styles.tradeIcon} /><span>做空</span>
              </button>
              {positions.length > 0 && (
                <button className={`${styles.tradeBtn} ${styles.closeBtn}`} onClick={handleCloseAll}>
                  <BarChart3 className={styles.tradeIcon} /><span>全部平仓</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* 账户卡片 */}
        <div className={styles.accountCardSmall}>
          {hasRegistered ? (
            <>
              <div className={styles.equityRow}>
                <div className={styles.equityItem}>
                  <span className={styles.equityLabel}>净值</span>
                  <span className={currentEquity < currentLevelConfig.failBalance ? styles.equityFailed : styles.equityValue}>${currentEquity.toFixed(2)}</span>
                </div>
                <div className={styles.equityItem}>
                  <span className={styles.equityLabel}>盈亏</span>
                  <span className={totalPositionProfit >= 0 ? styles.profitText : styles.lossText}>{totalPositionProfit >= 0 ? '+' : ''}${totalPositionProfit.toFixed(2)}</span>
                </div>
              </div>
              <div className={styles.balanceRow}>
                <div className={styles.balanceItem}>
                  <span className={styles.balanceItemLabel}>余额</span>
                  <span className={styles.balanceItemValue}>${balance.toFixed(2)}</span>
                </div>
                <div className={styles.balanceItem}>
                  <span className={styles.balanceItemLabel}>底线</span>
                  <span className={styles.balanceItemValue}>${currentLevelConfig.failBalance}</span>
                </div>
              </div>
              <div className={styles.progressSection}>
                <div className={styles.progressHeader}>
                  <span>第{currentLevel}关</span>
                  <span>{Math.min(Math.max(progressPercent, 0), 100).toFixed(1)}%</span>
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${Math.min(Math.max(progressPercent, 0), 100)}%` }} />
                </div>
                <div className={styles.progressLabels}>
                  <span>${initialBalance.toLocaleString()}</span>
                  <span>${targetBalance.toLocaleString()}</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <h3><DollarSign className={styles.cardIcon} />K线征途</h3>
              <p className={styles.matchDesc}>挑战10关，从1000到2000！</p>
              <div className={styles.matchRules}>
                <div className={styles.ruleItem}><span>初始净值</span><span>1000</span></div>
                <div className={styles.ruleItem}><span>目标净值</span><span>2000</span></div>
                <div className={styles.ruleItem}><span>失败底线</span><span>100</span></div>
                <div className={styles.ruleItem}><span>通关奖励</span><span>3000金币</span></div>
              </div>
              <button className={styles.registerBtn} onClick={handleRegister} disabled={registering || !session}>
                {!session ? '请先登录' : registering ? '报名中...' : '立即参赛'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 持仓列表 */}
      {positions.length > 0 && (
        <div className={styles.positionsSection}>
          <div className={styles.positionsHeader}>
            <h3><BarChart3 className={styles.cardIcon} />当前持仓 ({positions.length})</h3>
          </div>
          <div className={styles.positionsList}>
            {positions.map(pos => {
              const { profit } = calculatePositionProfit(pos);
              return (
                <div key={pos.id} className={styles.positionItem}>
                  <div className={styles.positionType}>
                    <span className={pos.type === 'long' ? styles.longBadge : styles.shortBadge}>{pos.type === 'long' ? '多' : '空'}</span>
                  </div>
                  <div className={styles.positionInfo}>
                    <span>开仓: ${pos.openPrice.toFixed(2)}</span>
                    <span>现价: ${goldPrice.toFixed(2)}</span>
                    <span>{pos.amount}手</span>
                  </div>
                  <div className={styles.positionProfit}>
                    <span className={profit >= 0 ? styles.profitText : styles.lossText}>{profit >= 0 ? '+' : ''}${profit.toFixed(2)}</span>
                  </div>
                  <button className={styles.closeSingleBtn} onClick={() => handleClosePosition(pos.id)}>
                    <X className={styles.closeIcon} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 关卡展示 */}
      <div className={styles.levelsSection}>
        <h3><Target className={styles.cardIcon} />挑战关卡</h3>
        <div className={styles.levelsGrid}>
          {(levelConfigs.length > 0 ? levelConfigs : Array.from({ length: 10 }, (_, i) => getLevelConfig(i + 1))).map(config => {
            const level = config.level;
            const isCurrent = hasRegistered && level === currentLevel;
            const isUnlocked = hasRegistered && level <= currentLevel;
            return (
              <div key={level} className={`${styles.levelCard} ${isCurrent ? styles.currentLevel : ''} ${isUnlocked ? styles.unlocked : ''}`}>
                <div className={styles.levelNum}>{level}</div>
                <div className={styles.levelName}>{config.name}</div>
                <div className={styles.levelRange}>${config.initialBalance} → ${config.targetBalance}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
