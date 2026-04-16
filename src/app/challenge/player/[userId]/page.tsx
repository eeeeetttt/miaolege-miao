'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './page.module.css';

interface EquityPoint {
  time: string;
  equity: number;
  balance: number;
  profit: number;
}

interface Trade {
  id: number;
  ticket: number;
  symbol: string;
  type: string;
  volume: number | null;
  openPrice: number | null;
  closePrice: number | null;
  openTime: string | Date;
  closeTime: string | Date | null;
  profit: number | null;
  comment: string | null;
  orderType: string | null;
}

interface LevelStat {
  level: number;
  name: string;
  description: string | null;
  initialBalance: number;
  targetBalance: number;
  failBalance: number;
  reward: string | null;
  isCompleted: boolean;
  isCurrent: boolean;
  entryEquity: number;
  exitEquity: number;
  maxEquity: number;
  minEquity: number;
  profit: number;
  equityCurve: EquityPoint[];
}

interface PlayerData {
  player: {
    userId: string;
    displayName: string;
    registrationId: number;
    status: string;
    currentLevel: number;
    completedLevels: number[];
    startedAt: string;
    completedAt: string | null;
    totalDuration: number | null;
    serverName: string | null;
    tradingAccount: string | null;
  };
  currentEquity: number | null;
  currentBalance: number | null;
  currentProfit: number | null;
  levelStats: LevelStat[];
  equityHistory: EquityPoint[];
  totalEquityHistory: number;
}

export default function PlayerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  
  const [loading, setLoading] = useState(true);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [tradesPage, setTradesPage] = useState(1);
  const [tradesTotalPages, setTradesTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState<'overview' | 'trades'>('overview');

  useEffect(() => {
    fetchPlayerData();
  }, [userId]);

  useEffect(() => {
    if (selectedLevel !== null) {
      fetchTrades(1);
    }
  }, [selectedLevel]);

  const fetchPlayerData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/challenge/player/${userId}`);
      const data = await res.json();
      
      if (res.ok) {
        setPlayerData(data);
        // 默认选中当前或第一关
        if (data.levelStats && data.levelStats.length > 0) {
          const currentOrFirst = data.levelStats.find((l: LevelStat) => l.isCurrent) || data.levelStats[0];
          setSelectedLevel(currentOrFirst.level);
        }
      } else {
        setError(data.error || '获取玩家数据失败');
      }
    } catch (err) {
      setError('网络错误');
    }
    setLoading(false);
  };

  const fetchTrades = async (page: number) => {
    setTradesLoading(true);
    try {
      const res = await fetch(`/api/challenge/player/${userId}/trades?page=${page}`);
      const data = await res.json();
      
      if (res.ok) {
        setTrades(data.trades || []);
        setTradesPage(page);
        setTradesTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('获取交易记录失败', err);
    }
    setTradesLoading(false);
  };

  const formatTime = (time: string | Date | null): string => {
    if (!time) return '-';
    const date = typeof time === 'string' ? new Date(time) : time;
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatProfit = (profit: number | null): string => {
    if (profit === null) return '-';
    const sign = profit >= 0 ? '+' : '';
    return `${sign}$${profit.toFixed(2)}`;
  };

  const getProfitClass = (profit: number | null): string => {
    if (profit === null) return '';
    return profit >= 0 ? styles.profit : styles.loss;
  };

  const selectedLevelData = playerData?.levelStats?.find(l => l.level === selectedLevel);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !playerData) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{error || '数据加载失败'}</p>
          <button onClick={() => router.push('/challenge/hall-of-fame')}>
            返回排行榜
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        {/* 头部 */}
        <header className={styles.header}>
          <button className={styles.backButton} onClick={() => router.push('/challenge/hall-of-fame')}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
            返回
          </button>
          <h1 className={styles.title}>
            <svg viewBox="0 0 24 24" fill="currentColor" className={styles.titleIcon}>
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
            选手详情
          </h1>
        </header>

        {/* 玩家信息卡片 */}
        <section className={styles.playerCard}>
          <div className={styles.playerInfo}>
            <div className={styles.playerAvatar}>
              {playerData.player.displayName.charAt(0)}
            </div>
            <div className={styles.playerDetails}>
              <h2 className={styles.playerName}>{playerData.player.displayName}</h2>
              <p className={styles.playerMeta}>
                挑战账号: {playerData.player.tradingAccount || '未分配'}
              </p>
              <p className={styles.playerMeta}>
                服务器: {playerData.player.serverName || '-'}
              </p>
            </div>
          </div>
          
          {/* 当前净值显示 */}
          {playerData.currentEquity !== null && (
            <div className={styles.equityDisplay}>
              <div className={styles.equityItem}>
                <span className={styles.equityLabel}>当前净值</span>
                <span className={styles.equityValue}>${playerData.currentEquity.toFixed(2)}</span>
              </div>
              {playerData.currentProfit !== null && (
                <div className={`${styles.equityItem} ${getProfitClass(playerData.currentProfit)}`}>
                  <span className={styles.equityLabel}>当前盈亏</span>
                  <span className={styles.equityValue}>{formatProfit(playerData.currentProfit)}</span>
                </div>
              )}
            </div>
          )}
          
          <div className={styles.playerStats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{playerData.player.completedLevels.length}</span>
              <span className={styles.statLabel}>通关关卡</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {playerData.totalEquityHistory > 0 ? playerData.equityHistory.length : '-'}
              </span>
              <span className={styles.statLabel}>净值记录</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {playerData.player.totalDuration 
                  ? `${Math.floor(playerData.player.totalDuration / 3600)}h`
                  : '-'}
              </span>
              <span className={styles.statLabel}>总时长</span>
            </div>
          </div>
        </section>

        {/* Tab切换 */}
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'overview' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            关卡概览
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'trades' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('trades')}
          >
            交易记录
          </button>
        </div>

        {/* Tab内容 */}
        {activeTab === 'overview' && (
          <>
            {/* 关卡选择器 */}
            <section className={styles.levelSelector}>
              {playerData.levelStats?.map(level => (
                <button
                  key={level.level}
                  className={`${styles.levelButton} ${selectedLevel === level.level ? styles.selectedLevel : ''} ${level.isCompleted ? styles.completedLevel : ''}`}
                  onClick={() => setSelectedLevel(level.level)}
                >
                  <span className={styles.levelNum}>第{level.level}关</span>
                  <span className={styles.levelName}>{level.name}</span>
                  {level.isCompleted && (
                    <svg viewBox="0 0 24 24" fill="currentColor" className={styles.checkIcon}>
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  )}
                  {level.isCurrent && <span className={styles.currentBadge}>进行中</span>}
                </button>
              ))}
            </section>

            {/* 选中关卡详情 */}
            {selectedLevelData && (
              <section className={styles.levelDetail}>
                <div className={styles.levelHeader}>
                  <h3>第{selectedLevelData.level}关: {selectedLevelData.name}</h3>
                  {selectedLevelData.isCompleted && (
                    <span className={styles.completedBadge}>已通关</span>
                  )}
                </div>
                
                {selectedLevelData.description && (
                  <p className={styles.levelDesc}>{selectedLevelData.description}</p>
                )}

                {/* 关卡目标 */}
                <div className={styles.levelGoals}>
                  <div className={styles.goalItem}>
                    <span className={styles.goalLabel}>初始净值</span>
                    <span className={styles.goalValue}>${selectedLevelData.initialBalance.toLocaleString()}</span>
                  </div>
                  <div className={styles.goalArrow}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
                    </svg>
                  </div>
                  <div className={styles.goalItem}>
                    <span className={styles.goalLabel}>目标净值</span>
                    <span className={`${styles.goalValue} ${styles.target}`}>
                      ${selectedLevelData.targetBalance.toLocaleString()}
                    </span>
                  </div>
                  <div className={styles.goalDivider}>/</div>
                  <div className={styles.goalItem}>
                    <span className={styles.goalLabel}>失败底线</span>
                    <span className={`${styles.goalValue} ${styles.fail}`}>
                      ${selectedLevelData.failBalance.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 收益统计 */}
                <div className={styles.profitStats}>
                  <div className={styles.profitItem}>
                    <span className={styles.profitLabel}>入场净值</span>
                    <span className={styles.profitValue}>
                      ${selectedLevelData.entryEquity.toFixed(2)}
                    </span>
                  </div>
                  <div className={styles.profitItem}>
                    <span className={styles.profitLabel}>当前净值</span>
                    <span className={styles.profitValue}>
                      ${selectedLevelData.exitEquity.toFixed(2)}
                    </span>
                  </div>
                  <div className={styles.profitItem}>
                    <span className={styles.profitLabel}>关卡收益</span>
                    <span className={`${styles.profitValue} ${selectedLevelData.profit >= 0 ? styles.profit : styles.loss}`}>
                      {formatProfit(selectedLevelData.profit)}
                    </span>
                  </div>
                  <div className={styles.profitItem}>
                    <span className={styles.profitLabel}>最大净值</span>
                    <span className={`${styles.profitValue} ${styles.max}`}>
                      ${selectedLevelData.maxEquity.toFixed(2)}
                    </span>
                  </div>
                  <div className={styles.profitItem}>
                    <span className={styles.profitLabel}>最小净值</span>
                    <span className={`${styles.profitValue} ${styles.min}`}>
                      ${selectedLevelData.minEquity.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* 收益曲线 */}
                {selectedLevelData.equityCurve && selectedLevelData.equityCurve.length > 0 && (
                  <div className={styles.chartSection}>
                    <h4>净值曲线</h4>
                    <div className={styles.chart}>
                      <svg viewBox="0 0 400 150" className={styles.chartSvg}>
                        {/* 动态计算Y轴范围 */}
                        {(() => {
                          const minVal = Math.min(selectedLevelData.failBalance, selectedLevelData.equityCurve.map(p => p.equity).reduce((a, b) => Math.min(a, b), Infinity));
                          const maxVal = Math.max(selectedLevelData.targetBalance, selectedLevelData.equityCurve.map(p => p.equity).reduce((a, b) => Math.max(a, b), -Infinity));
                          const range = maxVal - minVal || 1;
                          
                          const getY = (val: number) => 150 - ((val - minVal) / range) * 140 - 5;
                          
                          return (
                            <>
                              {/* 目标线 */}
                              <line 
                                x1="0" 
                                y1={getY(selectedLevelData.targetBalance)} 
                                x2="400" 
                                y2={getY(selectedLevelData.targetBalance)} 
                                stroke="#22c55e" 
                                strokeWidth="1" 
                                strokeDasharray="4,4"
                              />
                              {/* 初始净值线 */}
                              <line 
                                x1="0" 
                                y1={getY(selectedLevelData.initialBalance)} 
                                x2="400" 
                                y2={getY(selectedLevelData.initialBalance)} 
                                stroke="#a1a1aa" 
                                strokeWidth="1"
                              />
                              {/* 失败底线 */}
                              <line 
                                x1="0" 
                                y1={getY(selectedLevelData.failBalance)} 
                                x2="400" 
                                y2={getY(selectedLevelData.failBalance)} 
                                stroke="#ef4444" 
                                strokeWidth="1" 
                                strokeDasharray="4,4"
                              />
                              
                              {/* 连接线 */}
                              {selectedLevelData.equityCurve.length > 1 && (
                                <polyline
                                  points={selectedLevelData.equityCurve.map((point, index) => {
                                    const x = (index / (selectedLevelData.equityCurve.length - 1 || 1)) * 400;
                                    const y = getY(point.equity);
                                    return `${x},${y}`;
                                  }).join(' ')}
                                  fill="none"
                                  stroke="#fbbf24"
                                  strokeWidth="2"
                                />
                              )}
                              
                              {/* 数据点 */}
                              {selectedLevelData.equityCurve.map((point, index) => {
                                const x = (index / (selectedLevelData.equityCurve.length - 1 || 1)) * 400;
                                const y = getY(point.equity);
                                return (
                                  <circle 
                                    key={index} 
                                    cx={x} 
                                    cy={y} 
                                    r="3" 
                                    fill={point.equity >= selectedLevelData.targetBalance ? '#22c55e' : 
                                          point.equity < selectedLevelData.failBalance ? '#ef4444' : '#fbbf24'}
                                  />
                                );
                              })}
                            </>
                          );
                        })()}
                      </svg>
                      <div className={styles.chartLegend}>
                        <span className={styles.legendItem}>
                          <span className={styles.legendDot} style={{background: '#22c55e'}}></span>
                          目标线
                        </span>
                        <span className={styles.legendItem}>
                          <span className={styles.legendDot} style={{background: '#a1a1aa'}}></span>
                          初始净值
                        </span>
                        <span className={styles.legendItem}>
                          <span className={styles.legendDot} style={{background: '#ef4444'}}></span>
                          失败底线
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedLevelData.reward && (
                  <div className={styles.reward}>
                    <span className={styles.rewardLabel}>通关奖励</span>
                    <span className={styles.rewardValue}>{selectedLevelData.reward}</span>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {activeTab === 'trades' && (
          <section className={styles.tradesSection}>
            {tradesLoading ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>加载交易记录...</p>
              </div>
            ) : trades.length > 0 ? (
              <>
                <div className={styles.tradesList}>
                  {trades.map(trade => (
                    <div key={trade.id} className={styles.tradeCard}>
                      <div className={styles.tradeHeader}>
                        <span className={styles.tradeSymbol}>{trade.symbol || '未知'}</span>
                        <span className={`${styles.tradeType} ${trade.type === 'buy' ? styles.buy : styles.sell}`}>
                          {trade.type === 'buy' ? '多' : '空'}
                        </span>
                        {trade.volume !== null && (
                          <span className={styles.tradeVolume}>{trade.volume.toFixed(2)}手</span>
                        )}
                        {trade.orderType && (
                          <span className={styles.orderType}>{trade.orderType}</span>
                        )}
                      </div>
                      <div className={styles.tradePrices}>
                        <div className={styles.priceItem}>
                          <span className={styles.priceLabel}>价格</span>
                          <span className={styles.priceValue}>
                            {trade.openPrice !== null ? trade.openPrice.toFixed(5) : '-'}
                          </span>
                        </div>
                        {trade.profit !== null && (
                          <div className={`${styles.priceItem} ${getProfitClass(trade.profit)}`}>
                            <span className={styles.priceLabel}>盈亏</span>
                            <span className={styles.priceValue}>{formatProfit(trade.profit)}</span>
                          </div>
                        )}
                      </div>
                      <div className={styles.tradeTimes}>
                        <span>时间: {formatTime(trade.openTime)}</span>
                        {trade.ticket && <span>票据: #{trade.ticket}</span>}
                      </div>
                      {trade.comment && (
                        <div className={styles.tradeComment}>{trade.comment}</div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* 交易分页 */}
                {tradesTotalPages > 1 && (
                  <div className={styles.pagination}>
                    <button 
                      disabled={tradesPage === 1}
                      onClick={() => fetchTrades(tradesPage - 1)}
                    >
                      上一页
                    </button>
                    <span>{tradesPage} / {tradesTotalPages}</span>
                    <button 
                      disabled={tradesPage === tradesTotalPages}
                      onClick={() => fetchTrades(tradesPage + 1)}
                    >
                      下一页
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.empty}>
                <p>暂无交易记录</p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
