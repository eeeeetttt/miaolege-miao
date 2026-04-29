'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import styles from './page.module.css';
import { TrendingUp, TrendingDown, Trophy, Zap, Target, Clock, DollarSign, BarChart3, Star, RefreshCw, X, Wallet, Calculator, AlertCircle } from 'lucide-react';

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

const STORAGE_KEY = 'challenge_state';
const EQUITY_HISTORY_KEY = 'challenge_equity_history';
const LEVERAGE = 500; // 杠杆500倍
const CONTRACT_SIZE = 100; // 每手100盎司

export default function ChallengePage() {
  const { data: session, status } = useSession();
  const [goldPrice, setGoldPrice] = useState<number>(0);
  const [goldBid, setGoldBid] = useState<number>(0);
  const [goldAsk, setGoldAsk] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number>(0); // 余额（可用于交易的资金）
  const [positions, setPositions] = useState<Position[]>([]);
  const [equityHistory, setEquityHistory] = useState<EquityHistory[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [levelConfigs, setLevelConfigs] = useState<LevelConfig[]>([]);
  const [registrationMode, setRegistrationMode] = useState<'free' | 'paid'>('free');
  const [registering, setRegistering] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [hasRegistered, setHasRegistered] = useState(false);
  const [lotSize, setLotSize] = useState(0.1);
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set());
  const [canChallenge, setCanChallenge] = useState(true); // 每天只能挑战一次
  const priceRef = useRef<number>(0);

  const showToast = useCallback((message: string, type: 'success' | 'warning' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  // 获取当前关卡配置
  const getLevelConfig = useCallback((level: number): LevelConfig => {
    if (levelConfigs.length > 0) {
      const config = levelConfigs.find(c => c.level === level);
      if (config) return config;
    }
    // 默认配置
    return {
      level,
      name: `第${level}关`,
      description: '',
      targetBalance: 3000 * Math.pow(1.3, level - 1),
      initialBalance: level === 1 ? 3000 : 3000 * Math.pow(1.3, level - 2),
      failBalance: 100,
      reward: null
    };
  }, [levelConfigs]);

  // 计算订单盈亏（不考虑杠杆，按实际合约价值计算）
  // 盈亏 = 价格差 × 手数 × 合约单位(100盎司)
  const calculatePositionProfit = useCallback((pos: Position, bid?: number, ask?: number) => {
    const currentBid = bid || goldBid;
    const currentAsk = ask || goldAsk;
    if (currentBid === 0 && currentAsk === 0) return { profit: 0, profitPercent: 0, closePrice: 0 };
    
    // 平仓时：做多用买价，做空用卖价
    const closePrice = pos.type === 'long' ? currentBid : currentAsk;
    const priceDiff = closePrice - pos.openPrice;
    // 盈亏 = 价格差 × 手数 × 合约单位(100盎司)
    // 不再乘以杠杆，杠杆只影响保证金
    const profit = pos.type === 'long' 
      ? priceDiff * pos.amount * CONTRACT_SIZE
      : -priceDiff * pos.amount * CONTRACT_SIZE;
    
    return { profit, profitPercent: 0, closePrice };
  }, [goldBid, goldAsk]);

  // 计算总持仓盈亏
  const totalPositionProfit = useMemo(() => {
    return positions.reduce((sum, pos) => {
      const { profit } = calculatePositionProfit(pos);
      return sum + profit;
    }, 0);
  }, [positions, calculatePositionProfit]);

  // 计算当前净值 = 余额 + 持仓盈亏
  const currentEquity = useMemo(() => {
    return balance + totalPositionProfit;
  }, [balance, totalPositionProfit]);

  // 计算最大可开仓手数
  // 公式：保证金 = 开仓价 × 合约单位(100盎司) × 手数 ÷ 杠杆倍数
  // 最大手数 = 余额 ÷ (当前价 × 100 ÷ 500)
  const maxLots = useMemo(() => {
    if (goldAsk === 0 || balance <= 0) return 0;
    const marginPerLot = goldAsk * CONTRACT_SIZE / LEVERAGE;
    return Math.floor(balance / marginPerLot * 100) / 100; // 保留2位小数
  }, [goldAsk, balance]);

  // 从localStorage加载状态
  const loadState = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.hasRegistered && state.balance !== undefined) {
          setBalance(state.balance);
          setPositions(state.positions || []);
          setCurrentLevel(state.currentLevel || 1);
          setHasRegistered(state.hasRegistered);
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
  }, []);

  // 保存状态到localStorage
  const saveState = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!hasRegistered) return;
    
    const state = {
      balance,
      positions,
      currentLevel,
      hasRegistered
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [balance, positions, currentLevel, hasRegistered]);

  // 记录净值变化到历史
  const recordEquity = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!hasRegistered) return;
    
    const history = equityHistory.slice(-99);
    history.push({
      time: new Date().toISOString(),
      equity: currentEquity,
      balance
    });
    setEquityHistory(history);
    localStorage.setItem(EQUITY_HISTORY_KEY, JSON.stringify(history));
  }, [hasRegistered, currentEquity, balance, equityHistory]);

  // 获取实时金价
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

  // 获取关卡配置
  const fetchLevelConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/challenge/register');
      if (res.ok) {
        const data = await res.json();
        if (data.levelConfigs && data.levelConfigs.length > 0) {
          setLevelConfigs(data.levelConfigs);
        }
        return data;
      }
    } catch (e) {
      console.error('获取关卡配置失败:', e);
    }
    return null;
  }, []);

  // 获取用户挑战状态
  const fetchUserStatus = useCallback(async () => {
    if (!session?.user?.id) return null;
    
    try {
      const res = await fetch('/api/challenge/register');
      if (res.ok) {
        const data = await res.json();
        if (data.registration) {
          setHasRegistered(true);
          if (data.registration.currentLevel) {
            setCurrentLevel(data.registration.currentLevel);
          }
          // 初始净值从关卡配置获取
          const level = data.registration.currentLevel || 1;
          const config = data.levelConfigs?.find((c: LevelConfig) => c.level === level);
          if (config && config.initialBalance) {
            // 只有在未从localStorage加载到有效数据时才使用配置值
            const saved = localStorage.getItem(STORAGE_KEY);
            if (!saved || !JSON.parse(saved).hasRegistered) {
              setBalance(config.initialBalance);
            }
          }
        }
        return data;
      }
    } catch (e) {
      console.error('获取用户状态失败:', e);
    }
    return null;
  }, [session]);

  // 检查今天是否已挑战过
  const checkDailyLimit = useCallback(() => {
    if (typeof window === 'undefined') return { canChallenge: true, lastDate: null };
    
    const lastChallenge = localStorage.getItem('challenge_last_date');
    const today = new Date().toDateString();
    
    if (lastChallenge === today) {
      return { canChallenge: false, lastDate: today };
    }
    return { canChallenge: true, lastDate: today };
  }, []);

  // 设置今天已挑战
  const setTodayChallenged = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('challenge_last_date', new Date().toDateString());
  }, []);

  // 自动保存状态到localStorage（当余额或持仓变化时）
  useEffect(() => {
    if (!hasRegistered) return;
    if (typeof window === 'undefined') return;
    
    const state = {
      balance,
      positions,
      currentLevel,
      hasRegistered
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [balance, positions, currentLevel, hasRegistered]);

  // 初始化
  useEffect(() => {
    const init = async () => {
      loadState();
      
      // 检查今天是否已挑战过
      const { canChallenge: canCh } = checkDailyLimit();
      setCanChallenge(canCh);
      
      if (status === 'authenticated') {
        await fetchLevelConfigs();
        await fetchUserStatus();
      }
      setLoading(false);
    };
    
    init();
  }, [status, loadState, fetchLevelConfigs, fetchUserStatus, checkDailyLimit]);

  // 实时价格更新
  useEffect(() => {
    fetchGoldPrice();
    const interval = setInterval(fetchGoldPrice, 3000);
    return () => clearInterval(interval);
  }, [fetchGoldPrice]);

  // 定期记录净值
  useEffect(() => {
    if (!hasRegistered) return;
    
    recordEquity();
    const interval = setInterval(recordEquity, 10000); // 每10秒记录一次
    return () => clearInterval(interval);
  }, [hasRegistered, recordEquity]);

  // 检查净值是否低于失败底线，如果低于则挑战失败并重置
  useEffect(() => {
    if (!hasRegistered || currentEquity <= 0) return;
    
    const failBalance = getLevelConfig(currentLevel).failBalance;
    if (currentEquity < failBalance) {
      showToast(`净值低于底线 $${failBalance}，挑战失败！`, 'warning');
      
      // 强行平仓所有单子
      setPositions([]);
      // 重置到第一关
      setCurrentLevel(1);
      // 设置余额为第一关初始净值
      const firstLevelConfig = getLevelConfig(1);
      setBalance(firstLevelConfig.initialBalance);
      // 清除历史记录
      setEquityHistory([]);
      // 重置挑战状态，需要重新报名
      setHasRegistered(false);
      // 清除localStorage中的挑战状态
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [currentEquity, hasRegistered, currentLevel, showToast, getLevelConfig]);

  // 检查净值是否达标，自动通关下一关
  const checkAndLevelUp = useCallback(() => {
    if (!hasRegistered || currentEquity <= 0 || positions.length > 0) return;
    
    const cfg = getLevelConfig(currentLevel);
    // 净值达到目标值
    if (currentEquity >= cfg.targetBalance) {
      const nextLevel = currentLevel + 1;
      const nextCfg = getLevelConfig(nextLevel);
      
      // 如果有下一关
      if (nextCfg) {
        // 重置余额为下一关初始净值
        setBalance(nextCfg.initialBalance);
        // 清空历史记录
        setEquityHistory([]);
        // 进入下一关
        setCurrentLevel(nextLevel);
        showToast(`恭喜通关第${currentLevel}关！自动进入第${nextLevel}关，初始净值 $${nextCfg.initialBalance}`, 'success');
        // 保存状态
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          balance: nextCfg.initialBalance,
          positions: [],
          currentLevel: nextLevel,
          hasRegistered: true
        }));
        localStorage.setItem(EQUITY_HISTORY_KEY, JSON.stringify([]));
      } else {
        showToast(`恭喜通关所有关卡！最终净值 $${currentEquity.toFixed(2)}`, 'success');
      }
    }
  }, [hasRegistered, currentEquity, positions.length, currentLevel, getLevelConfig, showToast]);

  useEffect(() => {
    const timer = setTimeout(checkAndLevelUp, 1000);
    return () => clearTimeout(timer);
  }, [checkAndLevelUp]);

  // 开多单（买入，用卖价）
  const handleLong = async () => {
    if (!session) {
      showToast('请先登录', 'warning');
      return;
    }
    if (!canChallenge) {
      showToast('今日挑战次数已用完，请明天再来', 'warning');
      return;
    }
    if (currentEquity < currentLevelConfig.failBalance) {
      showToast(`净值已低于失败底线 $${currentLevelConfig.failBalance}，挑战失败！`, 'warning');
      return;
    }
    if (goldAsk === 0) {
      showToast('价格加载中，请稍后', 'warning');
      return;
    }
    
    // 检查所有持仓总手数是否超过最大可开仓手数
    const currentTotalLots = positions.reduce((sum, pos) => sum + pos.amount, 0);
    const newTotalLots = currentTotalLots + lotSize;
    if (newTotalLots > maxLots) {
      showToast(`总持仓${newTotalLots.toFixed(2)}手超过最大可开${maxLots.toFixed(2)}手`, 'warning');
      return;
    }
    
    // 检查余额是否足够开仓
    const marginRequired = goldAsk * CONTRACT_SIZE * lotSize / LEVERAGE;
    if (marginRequired > balance) {
      showToast(`余额不足，开仓需要$${marginRequired.toFixed(2)}保证金`, 'warning');
      return;
    }
    
    const openPrice = goldAsk; // 买入用卖价
    const newPosition: Position = {
      id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'long',
      openPrice,
      closePrice: openPrice,
      amount: lotSize,
      openTime: new Date().toISOString(),
      profit: 0
    };

    setPositions(prev => [...prev, newPosition]);
    showToast(`做多成功，开仓价: $${openPrice.toFixed(2)} (卖价)`, 'success');
    saveState();
  };

  // 开空单（卖出，用买价）
  const handleShort = async () => {
    if (!session) {
      showToast('请先登录', 'warning');
      return;
    }
    if (!canChallenge) {
      showToast('今日挑战次数已用完，请明天再来', 'warning');
      return;
    }
    if (currentEquity < currentLevelConfig.failBalance) {
      showToast(`净值已低于失败底线 $${currentLevelConfig.failBalance}，挑战失败！`, 'warning');
      return;
    }
    if (goldBid === 0) {
      showToast('价格加载中，请稍后', 'warning');
      return;
    }
    
    // 检查所有持仓总手数是否超过最大可开仓手数
    const currentTotalLots = positions.reduce((sum, pos) => sum + pos.amount, 0);
    const newTotalLots = currentTotalLots + lotSize;
    if (newTotalLots > maxLots) {
      showToast(`总持仓${newTotalLots.toFixed(2)}手超过最大可开${maxLots.toFixed(2)}手`, 'warning');
      return;
    }
    
    // 检查余额是否足够开仓
    const marginRequired = goldBid * CONTRACT_SIZE * lotSize / LEVERAGE;
    if (marginRequired > balance) {
      showToast(`余额不足，开仓需要$${marginRequired.toFixed(2)}保证金`, 'warning');
      return;
    }
    
    const openPrice = goldBid; // 卖出用买价
    const newPosition: Position = {
      id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'short',
      openPrice,
      closePrice: openPrice,
      amount: lotSize,
      openTime: new Date().toISOString(),
      profit: 0
    };

    setPositions(prev => [...prev, newPosition]);
    showToast(`做空成功，开仓价: $${openPrice.toFixed(2)} (买价)`, 'success');
    saveState();
  };

  // 平仓单个订单
  const handleClosePosition = async (posId: string) => {
    const pos = positions.find(p => p.id === posId);
    if (!pos) return;

    const { profit } = calculatePositionProfit(pos);
    
    // 更新余额
    setBalance(prev => prev + profit);

    // 从列表中移除
    setPositions(prev => prev.filter(p => p.id !== posId));
    setSelectedPositions(prev => {
      const newSet = new Set(prev);
      newSet.delete(posId);
      return newSet;
    });

    showToast(
      `平仓完成，${profit >= 0 ? '盈利' : '亏损'} $${Math.abs(profit).toFixed(2)}`,
      profit >= 0 ? 'success' : 'warning'
    );
    saveState();
    recordEquity();
  };

  // 全部平仓
  const handleCloseAll = async () => {
    if (positions.length === 0) {
      showToast('当前没有持仓', 'warning');
      return;
    }

    let totalClosedProfit = 0;

    positions.forEach(pos => {
      const { profit } = calculatePositionProfit(pos);
      totalClosedProfit += profit;
    });

    // 更新余额
    setBalance(prev => prev + totalClosedProfit);

    // 清空所有订单
    setPositions([]);
    setSelectedPositions(new Set());

    showToast(
      `已全部平仓${positions.length}单，${totalClosedProfit >= 0 ? '盈利' : '亏损'} $${Math.abs(totalClosedProfit).toFixed(2)}`,
      totalClosedProfit >= 0 ? 'success' : 'warning'
    );
    saveState();
    recordEquity();
  };

  // 平仓所有选中订单
  const handleCloseSelected = async () => {
    if (selectedPositions.size === 0) {
      showToast('请先选择要平仓的订单', 'warning');
      return;
    }

    let totalClosedProfit = 0;
    const closedIds: string[] = [];

    positions.forEach(pos => {
      if (selectedPositions.has(pos.id)) {
        const { profit } = calculatePositionProfit(pos);
        totalClosedProfit += profit;
        closedIds.push(pos.id);
      }
    });

    // 更新余额
    setBalance(prev => prev + totalClosedProfit);

    // 移除已平仓的订单
    setPositions(prev => prev.filter(p => !selectedPositions.has(p.id)));
    setSelectedPositions(new Set());

    showToast(
      `已平仓${closedIds.length}单，${totalClosedProfit >= 0 ? '盈利' : '亏损'} $${Math.abs(totalClosedProfit).toFixed(2)}`,
      totalClosedProfit >= 0 ? 'success' : 'warning'
    );
    saveState();
    recordEquity();
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedPositions.size === positions.length) {
      setSelectedPositions(new Set());
    } else {
      setSelectedPositions(new Set(positions.map(p => p.id)));
    }
  };

  // 切换选中
  const toggleSelect = (id: string) => {
    setSelectedPositions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 重置挑战
  const handleReset = () => {
    const config = getLevelConfig(currentLevel);
    setBalance(config.initialBalance);
    setPositions([]);
    setEquityHistory([]);
    setSelectedPositions(new Set());
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(EQUITY_HISTORY_KEY);
    showToast(`已重置到第${currentLevel}关初始状态`, 'info');
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
        showToast(registrationMode === 'paid' ? '付费报名成功！1000星球币已扣除' : '报名成功！', 'success');
        setHasRegistered(true);
        // 只有免费模式才设置每日限制
        if (registrationMode === 'free') {
          setCanChallenge(true);
          setTodayChallenged();
        }
        // 从配置获取初始净值
        const config = getLevelConfig(1);
        setBalance(config.initialBalance);
        setPositions([]);
        setCurrentLevel(1);
        setEquityHistory([]);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(EQUITY_HISTORY_KEY);
        saveState();
        
        // 如果是付费模式，刷新用户状态以更新星球币余额
        if (registrationMode === 'paid') {
          fetchUserStatus();
        }
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
  const currentLevelConfig = getLevelConfig(currentLevel);
  const targetBalance = currentLevelConfig.targetBalance;
  const initialBalance = currentLevelConfig.initialBalance;
  const progressPercent = currentEquity > 0 ? ((currentEquity - initialBalance) / (targetBalance - initialBalance)) * 100 : 0;

  return (
    <div className={styles.pageContainer}>
      {/* Toast 提示 */}
      {toast && (
        <div className={`${styles.toast} ${styles[toast.type]}`}>
          {toast.message}
        </div>
      )}

      <div className={styles.container}>
        {/* 实时行情与交易区域 */}
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
            
            {/* 手数选择 */}
            {hasRegistered && (
              <div className={styles.lotSection}>
                <span className={styles.lotLabel}>手数 (最大{maxLots.toFixed(2)}手)</span>
                <div className={styles.lotButtons}>
                  {[0.01, 0.05, 0.1, 0.2, 0.5, 1].map(lot => (
                    <button
                      key={lot}
                      className={`${styles.lotBtn} ${lotSize === lot ? styles.lotActive : ''}`}
                      onClick={() => setLotSize(lot)}
                      disabled={lot > maxLots}
                    >
                      {lot}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* 交易按钮 */}
            {hasRegistered && (
              <div className={styles.tradeButtons}>
                <button 
                  className={`${styles.tradeBtn} ${styles.longBtn}`}
                  onClick={handleLong}
                >
                  <TrendingUp className={styles.tradeIcon} />
                  <span>做多</span>
                </button>
                <button 
                  className={`${styles.tradeBtn} ${styles.shortBtn}`}
                  onClick={handleShort}
                >
                  <TrendingDown className={styles.tradeIcon} />
                  <span>做空</span>
                </button>
                {positions.length > 0 && (
                  <button 
                    className={`${styles.tradeBtn} ${styles.closeBtn}`}
                    onClick={handleCloseAll}
                  >
                    <BarChart3 className={styles.tradeIcon} />
                    <span>全部平仓</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 账户卡片 */}
          <div className={styles.accountCardSmall}>
            {hasRegistered ? (
              <>
                {/* 净值和盈亏 */}
                <div className={styles.equityRow}>
                  <div className={styles.equityItem}>
                    <span className={styles.equityLabel}>净值</span>
                    <span className={currentEquity < currentLevelConfig.failBalance ? styles.equityFailed : styles.equityValue}>
                      ${currentEquity.toFixed(2)}
                    </span>
                  </div>
                  <div className={styles.equityItem}>
                    <span className={styles.equityLabel}>盈亏</span>
                    <span className={totalPositionProfit >= 0 ? styles.profitText : styles.lossText}>
                      {totalPositionProfit >= 0 ? '+' : ''}${totalPositionProfit.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* 余额和底线 */}
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
                    <div 
                      className={styles.progressFill}
                      style={{ width: `${Math.min(Math.max(progressPercent, 0), 100)}%` }}
                    />
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
                    disabled={registering || !session || (registrationMode === 'free' && !canChallenge)}
                  >
                    {!session ? '请先登录' : registering ? '报名中...' : registrationMode === 'free' && !canChallenge ? '今日已用完' : '立即参赛'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 持仓列表 */}
        {positions.length > 0 && (
          <div className={styles.positionsSection}>
            <div className={styles.positionsHeader}>
              <h3><BarChart3 className={styles.cardIcon} />当前持仓 ({positions.length})</h3>
              <div className={styles.positionsActions}>
                <button 
                  className={styles.selectAllBtn}
                  onClick={toggleSelectAll}
                >
                  {selectedPositions.size === positions.length ? '取消全选' : '全选'}
                </button>
              </div>
            </div>
            <div className={styles.positionsList}>
              {positions.map(pos => {
                const { profit, closePrice } = calculatePositionProfit(pos);
                const isSelected = selectedPositions.has(pos.id);
                
                return (
                  <div 
                    key={pos.id} 
                    className={`${styles.positionItem} ${isSelected ? styles.selected : ''}`}
                    onClick={() => toggleSelect(pos.id)}
                  >
                    <div className={styles.positionCheck}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => toggleSelect(pos.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className={styles.positionType}>
                      <span className={pos.type === 'long' ? styles.longBadge : styles.shortBadge}>
                        {pos.type === 'long' ? '多' : '空'}
                      </span>
                    </div>
                    <div className={styles.positionInfo}>
                      <span>开仓: ${pos.openPrice.toFixed(2)}</span>
                      <span>现价: ${(closePrice || 0).toFixed(2)}</span>
                      <span>{pos.amount}手</span>
                    </div>
                    <div className={styles.positionProfit}>
                      <span className={profit >= 0 ? styles.profitText : styles.lossText}>
                        {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
                      </span>
                    </div>
                    <button 
                      className={styles.closeSingleBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClosePosition(pos.id);
                      }}
                    >
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
                    ${config.initialBalance.toLocaleString()} → ${config.targetBalance.toLocaleString()}
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
