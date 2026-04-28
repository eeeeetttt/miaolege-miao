'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import styles from './page.module.css';
import { TrendingUp, TrendingDown, Trophy, Users, Zap, Target, Clock, DollarSign, BarChart3, Star, RefreshCw, X } from 'lucide-react';

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
  amount: number;
  openTime: string;
}

interface Ranking {
  rank: number;
  userName: string;
  level: number;
  balance: number;
  profitPercent: number;
}

const STORAGE_KEY = 'challenge_state';

export default function ChallengePage() {
  const { data: session, status } = useSession();
  const [goldPrice, setGoldPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [equity, setEquity] = useState<number>(1000);
  const [positions, setPositions] = useState<Position[]>([]);
  const [ranking, setRanking] = useState<Ranking[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [levelConfigs, setLevelConfigs] = useState<LevelConfig[]>([]);
  const [registrationMode, setRegistrationMode] = useState<'free' | 'paid'>('free');
  const [registering, setRegistering] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [hasRegistered, setHasRegistered] = useState(false);
  const [lotSize, setLotSize] = useState(0.1);
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set());
  const priceRef = useRef<number>(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'warning' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  // 从localStorage加载状态
  const loadState = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.equity !== undefined) setEquity(state.equity);
        if (state.positions !== undefined) setPositions(state.positions);
        if (state.currentLevel !== undefined) setCurrentLevel(state.currentLevel);
        if (state.hasRegistered !== undefined) setHasRegistered(state.hasRegistered);
      } catch (e) {
        console.error('加载状态失败:', e);
      }
    }
  }, []);

  // 保存状态到localStorage
  const saveState = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const state = {
      equity,
      positions,
      currentLevel,
      hasRegistered
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    // 同步到后端
    if (session?.user?.id) {
      fetch('/api/challenge/equity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equity, positions, level: currentLevel })
      }).catch(console.error);
    }
  }, [equity, positions, currentLevel, hasRegistered, session]);

  // 防抖保存
  useEffect(() => {
    if (!hasRegistered) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(saveState, 500);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [equity, positions, saveState, hasRegistered]);

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

  // 获取关卡配置
  const fetchLevelConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/challenge/register');
      if (res.ok) {
        const data = await res.json();
        if (data.levelConfigs && data.levelConfigs.length > 0) {
          setLevelConfigs(data.levelConfigs);
        }
      }
    } catch (e) {
      console.error('获取关卡配置失败:', e);
    }
  }, []);

  // 获取净值和订单数据
  const fetchUserData = useCallback(async () => {
    if (!session?.user?.id) return;
    
    try {
      // 获取净值
      const equityRes = await fetch(`/api/challenge/equity?level=${currentLevel}`);
      if (equityRes.ok) {
        const equityData = await equityRes.json();
        if (equityData.equity !== null) {
          setEquity(equityData.equity);
        }
      }

      // 获取订单
      const tradesRes = await fetch(`/api/challenge/trades?level=${currentLevel}`);
      if (tradesRes.ok) {
        const tradesData = await tradesRes.json();
        if (tradesData.trades && tradesData.trades.length > 0) {
          // 过滤出未平仓的订单
          const openTrades = tradesData.trades
            .filter((t: any) => t.status === 'open')
            .map((t: any) => ({
              id: t.id,
              type: t.type,
              openPrice: t.open_price,
              amount: t.amount,
              openTime: t.open_time
            }));
          if (openTrades.length > 0) {
            setPositions(openTrades);
          }
        }
      }
    } catch (e) {
      console.error('获取用户数据失败:', e);
    }
  }, [session, currentLevel]);

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

  // 初始化
  useEffect(() => {
    loadState();
    
    if (status === 'authenticated') {
      fetchLevelConfigs().then(() => {
        // 获取用户挑战状态
        fetch('/api/challenge/register')
          .then(res => res.json())
          .then(data => {
            if (data.registration) {
              setHasRegistered(true);
              if (data.registration.currentLevel) {
                setCurrentLevel(data.registration.currentLevel);
              }
            }
            // 获取用户数据
            fetchUserData();
            setLoading(false);
          })
          .catch(() => setLoading(false));
      });
    } else {
      setLoading(false);
    }
  }, [status, loadState, fetchLevelConfigs, fetchUserData]);

  // 实时价格更新
  useEffect(() => {
    fetchGoldPrice();
    const interval = setInterval(fetchGoldPrice, 3000);
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

  // 计算订单盈亏
  const calculatePositionProfit = (pos: Position) => {
    if (goldPrice === 0) return { profit: 0, profitPercent: 0 };
    const priceDiff = goldPrice - pos.openPrice;
    const profit = pos.type === 'long' 
      ? priceDiff * pos.amount * 100
      : -priceDiff * pos.amount * 100;
    const profitPercent = (profit / (pos.openPrice * pos.amount * 100)) * 100;
    return { profit, profitPercent };
  };

  // 计算总盈亏
  const totalProfit = positions.reduce((sum, pos) => {
    const { profit } = calculatePositionProfit(pos);
    return sum + profit;
  }, 0);

  // 开多单
  const handleLong = async () => {
    if (!session) {
      showToast('请先登录', 'warning');
      return;
    }
    const newPosition: Position = {
      id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'long',
      openPrice: goldPrice,
      amount: lotSize,
      openTime: new Date().toISOString()
    };

    // 保存到后端
    try {
      await fetch('/api/challenge/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'long',
          openPrice: goldPrice,
          amount: lotSize,
          level: currentLevel
        })
      });
    } catch (e) {
      console.error('保存订单失败:', e);
    }

    setPositions(prev => [...prev, newPosition]);
    showToast(`做多成功，开仓价: $${goldPrice.toFixed(2)}`, 'success');
  };

  // 开空单
  const handleShort = async () => {
    if (!session) {
      showToast('请先登录', 'warning');
      return;
    }
    const newPosition: Position = {
      id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'short',
      openPrice: goldPrice,
      amount: lotSize,
      openTime: new Date().toISOString()
    };

    // 保存到后端
    try {
      await fetch('/api/challenge/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'short',
          openPrice: goldPrice,
          amount: lotSize,
          level: currentLevel
        })
      });
    } catch (e) {
      console.error('保存订单失败:', e);
    }

    setPositions(prev => [...prev, newPosition]);
    showToast(`做空成功，开仓价: $${goldPrice.toFixed(2)}`, 'success');
  };

  // 平仓单个订单
  const handleClosePosition = async (posId: string) => {
    const pos = positions.find(p => p.id === posId);
    if (!pos) return;

    const { profit } = calculatePositionProfit(pos);
    
    // 更新净值
    setEquity(prev => prev + profit);

    // 从列表中移除
    setPositions(prev => prev.filter(p => p.id !== posId));

    // 更新后端
    try {
      await fetch('/api/challenge/trades', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: posId,
          closePrice: goldPrice,
          profit
        })
      });
    } catch (e) {
      console.error('更新订单失败:', e);
    }

    showToast(
      `平仓完成，${profit >= 0 ? '盈利' : '亏损'} $${Math.abs(profit).toFixed(2)}`,
      profit >= 0 ? 'success' : 'warning'
    );
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

    // 更新净值
    setEquity(prev => prev + totalClosedProfit);

    // 移除已平仓的订单
    setPositions(prev => prev.filter(p => !selectedPositions.has(p.id)));
    setSelectedPositions(new Set());

    // 更新后端
    try {
      await fetch('/api/challenge/trades', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeIds: closedIds,
          closePrice: goldPrice
        })
      });
    } catch (e) {
      console.error('批量平仓失败:', e);
    }

    showToast(
      `已平仓${closedIds.length}单，${totalClosedProfit >= 0 ? '盈利' : '亏损'} $${Math.abs(totalClosedProfit).toFixed(2)}`,
      totalClosedProfit >= 0 ? 'success' : 'warning'
    );
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
        const initialBalance = levelConfigs.find(c => c.level === 1)?.initialBalance || 1000;
        setEquity(initialBalance);
        setPositions([]);
        setCurrentLevel(1);
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

  // 获取当前关卡配置
  const getLevelConfig = (level: number): LevelConfig => {
    if (levelConfigs.length > 0) {
      const config = levelConfigs.find(c => c.level === level);
      if (config) return config;
    }
    // 默认配置
    return {
      level,
      name: `第${level}关`,
      description: '',
      targetBalance: 1000 * Math.pow(1.5, level - 1),
      initialBalance: 1000 * Math.pow(1.3, level - 2) || 1000,
      failBalance: 100,
      reward: null
    };
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
              {positions.length > 0 && (
                <span className={styles.positionBadge}>
                  {positions.length}单持仓中
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
                  onClick={handleCloseSelected}
                  disabled={selectedPositions.size === 0}
                >
                  <BarChart3 className={styles.tradeIcon} />
                  <span>平仓({selectedPositions.size})</span>
                </button>
              )}
            </div>
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
                <span className={styles.totalProfit}>
                  总浮动盈亏: 
                  <span className={totalProfit >= 0 ? styles.profitText : styles.lossText}>
                    {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
                  </span>
                </span>
              </div>
            </div>
            <div className={styles.positionsList}>
              {positions.map(pos => {
                const { profit, profitPercent } = calculatePositionProfit(pos);
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
                      <span>开仓价: ${pos.openPrice.toFixed(2)}</span>
                      <span>手数: {pos.amount}</span>
                    </div>
                    <div className={styles.positionProfit}>
                      <span className={profit >= 0 ? styles.profitText : styles.lossText}>
                        {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
                      </span>
                      <span className={profitPercent >= 0 ? styles.profitText : styles.lossText}>
                        {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
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

          {/* 右侧：排行榜 */}
          <div className={styles.rankingCard}>
            <h3><Trophy className={styles.cardIcon} />收益排行</h3>
            
            {hasRegistered ? (
              <div className={styles.rankingList}>
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
