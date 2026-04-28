'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import styles from './page.module.css';
import { TrendingUp, TrendingDown, Trophy, Zap, Target, Clock, DollarSign, BarChart3, Star, RefreshCw, X, Wallet, Calculator } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

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

  // 计算订单盈亏（考虑点差）
  const calculatePositionProfit = useCallback((pos: Position, bid?: number, ask?: number) => {
    const currentBid = bid || goldBid;
    const currentAsk = ask || goldAsk;
    if (currentBid === 0 && currentAsk === 0) return { profit: 0, profitPercent: 0, closePrice: 0 };
    
    // 平仓时：做多用买价，做空用卖价
    const closePrice = pos.type === 'long' ? currentBid : currentAsk;
    const priceDiff = closePrice - pos.openPrice;
    // 考虑杠杆：每手每点$1
    const profit = pos.type === 'long' 
      ? priceDiff * pos.amount * CONTRACT_SIZE * LEVERAGE
      : -priceDiff * pos.amount * CONTRACT_SIZE * LEVERAGE;
    // 收益率基于保证金计算
    const marginRequired = pos.openPrice * CONTRACT_SIZE * pos.amount / LEVERAGE;
    const profitPercent = marginRequired > 0 ? (profit / marginRequired) * 100 : 0;
    
    return { profit, profitPercent, closePrice };
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

  // 初始化
  useEffect(() => {
    const init = async () => {
      loadState();
      
      if (status === 'authenticated') {
        await fetchLevelConfigs();
        await fetchUserStatus();
      }
      setLoading(false);
    };
    
    init();
  }, [status, loadState, fetchLevelConfigs, fetchUserStatus]);

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

  // 开多单（买入，用卖价）
  const handleLong = async () => {
    if (!session) {
      showToast('请先登录', 'warning');
      return;
    }
    if (goldAsk === 0) {
      showToast('价格加载中，请稍后', 'warning');
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
    if (goldBid === 0) {
      showToast('价格加载中，请稍后', 'warning');
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
        showToast('报名成功！', 'success');
        setHasRegistered(true);
        // 从配置获取初始净值
        const config = getLevelConfig(1);
        setBalance(config.initialBalance);
        setPositions([]);
        setCurrentLevel(1);
        setEquityHistory([]);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(EQUITY_HISTORY_KEY);
        saveState();
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

  // 格式化历史数据用于图表
  const chartData = useMemo(() => {
    return equityHistory.map((item, index) => ({
      time: index,
      timeLabel: new Date(item.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      equity: item.equity,
      balance: item.balance
    }));
  }, [equityHistory]);

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
              <span className={styles.headerSub}>伦敦金模拟交易 · 杠杆{LEVERAGE}倍</span>
            </div>
          </div>
          <div className={styles.headerRight}>
            {hasRegistered && (
              <div className={styles.levelBadge}>
                <Star className={styles.levelIcon} />
                <span>第{currentLevel}关</span>
              </div>
            )}
            {hasRegistered && (
              <button className={styles.resetBtn} onClick={handleReset}>
                重置
              </button>
            )}
          </div>
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
            {/* 买卖价格 */}
            <div className={styles.bidAsk}>
              <div className={styles.bidAskItem}>
                <span className={styles.bidAskLabel}>买价</span>
                <span className={styles.bidAskValue}>${goldBid.toFixed(2)}</span>
              </div>
              <div className={styles.bidAskItem}>
                <span className={styles.bidAskLabel}>卖价</span>
                <span className={styles.bidAskValue}>${goldAsk.toFixed(2)}</span>
              </div>
              <div className={styles.bidAskSpread}>
                <span>点差</span>
                <span>${(goldAsk - goldBid).toFixed(2)}</span>
              </div>
            </div>
            <div className={styles.priceTime}>
              <Clock className={styles.timeIcon} />
              <span>{new Date().toLocaleTimeString('zh-CN')}</span>
            </div>
          </div>

          {/* 账户卡片 */}
          <div className={styles.accountCardSmall}>
            <h3><DollarSign className={styles.cardIcon} />账户概览</h3>
            
            {hasRegistered ? (
              <>
                {/* 净值和余额显示 */}
                <div className={styles.balanceRow}>
                  <div className={styles.balanceItem}>
                    <span className={styles.balanceItemLabel}>
                      <Wallet className={styles.balanceIcon} />
                      余额
                    </span>
                    <span className={styles.balanceItemValue}>${balance.toFixed(2)}</span>
                  </div>
                  <div className={styles.balanceItem}>
                    <span className={styles.balanceItemLabel}>
                      <BarChart3 className={styles.balanceIcon} />
                      持仓盈亏
                    </span>
                    <span className={`${styles.balanceItemValue} ${totalPositionProfit >= 0 ? styles.profitText : styles.lossText}`}>
                      {totalPositionProfit >= 0 ? '+' : ''}${totalPositionProfit.toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <div className={styles.equityDisplay}>
                  <span className={styles.equityLabel}>净值</span>
                  <span className={styles.equityValue}>${currentEquity.toFixed(2)}</span>
                </div>

                {/* 最大可开仓手数 */}
                <div className={styles.maxLotsInfo}>
                  <Calculator className={styles.maxLotsIcon} />
                  <span>最大可开: <strong>{maxLots.toFixed(2)}手</strong></span>
                  <span className={styles.marginInfo}>保证金 ${(goldAsk * CONTRACT_SIZE * maxLots / LEVERAGE).toFixed(2)}</span>
                </div>
                
                {/* 收益曲线 */}
                {chartData.length >= 2 && (
                  <div className={styles.equityCurve}>
                    <span className={styles.curveLabel}>收益曲线</span>
                    <ResponsiveContainer width="100%" height={80}>
                      <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <defs>
                          <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis 
                          dataKey="timeLabel" 
                          tick={{ fontSize: 10, fill: '#6b7280' }}
                          axisLine={{ stroke: '#333' }}
                          tickLine={false}
                          interval="preserveStartEnd"
                        />
                        <YAxis 
                          tick={{ fontSize: 10, fill: '#6b7280' }}
                          axisLine={{ stroke: '#333' }}
                          tickLine={false}
                          tickFormatter={(v) => `$${v.toFixed(0)}`}
                          width={50}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1e2230', 
                            border: '1px solid #333',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                          formatter={(value: number) => [`$${value.toFixed(2)}`, '净值']}
                        />
                        <ReferenceLine y={initialBalance} stroke="#D4AF37" strokeDasharray="3 3" />
                        <Area 
                          type="monotone" 
                          dataKey="equity" 
                          stroke="#22c55e" 
                          strokeWidth={2}
                          fill="url(#equityGradient)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

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
                    <span>初始 ${initialBalance.toLocaleString()}</span>
                    <span>目标 ${targetBalance.toLocaleString()}</span>
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
        </div>

        {/* 交易面板 */}
        <div className={styles.tradeCard}>
          <div className={styles.tradeHeader}>
            <span>模拟交易</span>
            {positions.length > 0 && (
              <span className={styles.positionBadge}>
                {positions.length}单持仓中
              </span>
            )}
          </div>
          
          {/* 手数选择 */}
          <div className={styles.lotSection}>
            <span className={styles.lotLabel}>交易手数 (1手 = 100盎司)</span>
            <div className={styles.lotButtons}>
              {[0.01, 0.05, 0.1, 0.2, 0.5, 1].map(lot => (
                <button
                  key={lot}
                  className={`${styles.lotBtn} ${lotSize === lot ? styles.lotActive : ''}`}
                  onClick={() => setLotSize(lot)}
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
              disabled={!hasRegistered}
            >
              <TrendingUp className={styles.tradeIcon} />
              <span>买入做多</span>
              <small>开仓价 ${goldAsk.toFixed(2)}</small>
            </button>
            <button 
              className={`${styles.tradeBtn} ${styles.shortBtn}`}
              onClick={handleShort}
              disabled={!hasRegistered}
            >
              <TrendingDown className={styles.tradeIcon} />
              <span>卖出做空</span>
              <small>开仓价 ${goldBid.toFixed(2)}</small>
            </button>
            {positions.length > 0 && (
              <button 
                className={`${styles.tradeBtn} ${styles.closeBtn}`}
                onClick={handleCloseSelected}
                disabled={selectedPositions.size === 0}
              >
                <BarChart3 className={styles.tradeIcon} />
                <span>平仓({selectedPositions.size})</span>
                <small>总盈亏 ${totalPositionProfit >= 0 ? '+' : ''}${totalPositionProfit.toFixed(2)}</small>
              </button>
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
                  onClick={() => {
                    if (hasRegistered && level <= currentLevel) {
                      setCurrentLevel(level);
                      const cfg = getLevelConfig(level);
                      setBalance(cfg.initialBalance);
                      setPositions([]);
                      setEquityHistory([]);
                      saveState();
                      showToast(`切换到第${level}关，初始净值 $${cfg.initialBalance.toLocaleString()}`, 'info');
                    }
                  }}
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
