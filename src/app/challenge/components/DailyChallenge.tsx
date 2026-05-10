'use client';

import { useState, useEffect, useCallback } from 'react';
import { Zap, Clock, Trophy, TrendingUp, Medal, BarChart3 } from 'lucide-react';
import styles from '../page.module.css';

interface DailyChallengeProps {
  session: any;
}

interface DailyInfo {
  status: 'registering' | 'trading' | 'ended';
  timeLeft: string;
  participantCount: number;
  myRank: number | null;
  myProfit: number;
  myBalance: number;
  initialCapital: number;
  entryFee: number;
  startTime: string;
  endTime: string;
}

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
  } | null;
}

interface RankItem {
  rank: number;
  username: string;
  profit: number;
  balance: number;
  isMe: boolean;
}

const DAILY_REWARDS = [
  { rank: 1, profit: 1000, name: '冠军' },
  { rank: 2, profit: 500, name: '亚军' },
  { rank: 3, profit: 300, name: '季军' },
  { rank: 4, profit: 200, name: '殿军' },
  { rank: 5, profit: 100, name: '第五名' },
  { rank: 6, profit: 80, name: '第六名' },
  { rank: 7, profit: 60, name: '第七名' },
  { rank: 8, profit: 40, name: '第八名' },
  { rank: 9, profit: 30, name: '第九名' },
  { rank: 10, profit: 20, name: '第十名' },
];

export default function DailyChallenge({ session }: DailyChallengeProps) {
  const [dailyInfo, setDailyInfo] = useState<DailyInfo | null>(null);
  const [ranking, setRanking] = useState<RankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [registering, setRegistering] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [showTrading, setShowTrading] = useState(false);
  const [myAccount, setMyAccount] = useState<MatchAccount | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'warning' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const getStatusInfo = useCallback((): { status: 'registering' | 'trading' | 'ended'; timeLeft: string; startTime: string; endTime: string } => {
    const now = new Date();
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const hour = beijingTime.getUTCHours();
    
    // 北京时间 00:00-20:00 可报名，20:00-24:00 交易
    if (hour < 20) {
      const endHour = 20;
      const remainingHours = endHour - hour - 1;
      const remainingMinutes = 59 - beijingTime.getUTCMinutes();
      return {
        status: 'registering',
        timeLeft: `${remainingHours}小时${remainingMinutes}分钟`,
        startTime: '00:00',
        endTime: '20:00'
      };
    } else {
      const remainingHours = 23 - hour;
      const remainingMinutes = 59 - beijingTime.getUTCMinutes();
      return {
        status: 'trading',
        timeLeft: `${remainingHours}小时${remainingMinutes}分钟`,
        startTime: '00:00',
        endTime: '20:00'
      };
    }
  }, []);

  const fetchDailyInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/match/daily');
      const data = await res.json();
      const statusInfo = getStatusInfo();
      
      if (data.daily) {
        setDailyInfo({
          ...statusInfo,
          participantCount: data.daily.participantCount || 0,
          myRank: data.daily.myRank,
          myProfit: data.daily.myProfit || 0,
          myBalance: data.daily.myBalance || 0,
          initialCapital: data.daily.initialCapital || 10000,
          entryFee: data.daily.entryFee || 50
        });
        setHasJoined(data.isRegistered || false);
        
        if (data.account) {
          setMyAccount({
            id: data.account.id,
            initialCapital: data.account.initialCapital || 10000,
            currentCapital: data.account.currentCapital || 10000,
            profit: data.account.profit || 0,
            profitRate: data.account.profitRate || 0,
            position: data.account.position || null
          });
        }
      } else {
        setDailyInfo({
          ...statusInfo,
          participantCount: 0,
          myRank: null,
          myProfit: 0,
          myBalance: 10000,
          initialCapital: 10000,
          entryFee: 50
        });
      }

      // 模拟排行榜
      setRanking([
        { rank: 1, username: '短线精灵', profit: 2500, balance: 12500, isMe: false },
        { rank: 2, username: '波段王', profit: 1800, balance: 11800, isMe: false },
        { rank: 3, username: '趋势交易', profit: 1200, balance: 11200, isMe: false },
        { rank: 4, username: '黄金猎手', profit: 800, balance: 10800, isMe: false },
        { rank: 5, username: '稳健派', profit: 500, balance: 10500, isMe: false },
      ]);
    } catch (e) {
      console.error('获取每日挑战信息失败:', e);
    } finally {
      setLoading(false);
    }
  }, [getStatusInfo]);

  useEffect(() => {
    fetchDailyInfo();
    // 每分钟刷新
    const interval = setInterval(fetchDailyInfo, 60000);
    return () => clearInterval(interval);
  }, [fetchDailyInfo]);

  const handleJoin = async () => {
    if (!session) { showToast('请先登录', 'warning'); return; }
    const statusInfo = getStatusInfo();
    if (statusInfo.status !== 'registering') {
      showToast('报名时间已结束，请在00:00-20:00报名', 'warning');
      return;
    }
    
    setRegistering(true);
    try {
      const res = await fetch('/api/match/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register' })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('报名成功！', 'success');
        setHasJoined(true);
        setShowTrading(true);
        fetchDailyInfo();
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

  const statusInfo = getStatusInfo();
  const statusColor = statusInfo.status === 'registering' ? '#10b981' : statusInfo.status === 'trading' ? '#f59e0b' : '#ef4444';
  const statusText = statusInfo.status === 'registering' ? '报名中' : statusInfo.status === 'trading' ? '交易中' : '已结束';

  return (
    <div className={styles.matchContainer}>
      {toast && (
        <div className={`${styles.toast} ${styles[toast.type]}`}>{toast.message}</div>
      )}

      {/* 每日挑战信息卡片 */}
      <div className={styles.dailyInfoCard} style={{ borderColor: statusColor }}>
        <div className={styles.dailyHeader}>
          <div className={styles.dailyStatus} style={{ backgroundColor: statusColor }}>
            <Clock className={styles.dailyStatusIcon} />
            <span>{statusText}</span>
          </div>
          <div className={styles.dailyTitle}>
            <h2>每日挑战赛</h2>
            <p>每日盈利排行赛</p>
          </div>
        </div>
        
        <div className={styles.dailyTimeLeft}>
          <Clock className={styles.dailyTimeIcon} />
          <span>剩余时间: {dailyInfo?.timeLeft || statusInfo.timeLeft}</span>
        </div>

        <div className={styles.dailyStats}>
          <div className={styles.dailyStat}>
            <span className={styles.dailyStatValue}>{dailyInfo?.participantCount || 0}</span>
            <span className={styles.dailyStatLabel}>参赛人数</span>
          </div>
          <div className={styles.dailyStat}>
            <span className={styles.dailyStatValue}>{statusInfo.startTime}</span>
            <span className={styles.dailyStatLabel}>报名时间</span>
          </div>
          <div className={styles.dailyStat}>
            <span className={styles.dailyStatValue}>{statusInfo.endTime}</span>
            <span className={styles.dailyStatLabel}>结束时间</span>
          </div>
        </div>
      </div>

      {/* 交易面板或报名入口 */}
      {hasJoined ? (
        <>
          {/* 我的账户概览 */}
          <div className={styles.dailyMyAccount}>
            <h3><TrendingUp className={styles.cardIcon} />我的账户</h3>
            <div className={styles.dailyMyStats}>
              <div className={styles.dailyMyStat}>
                <span className={styles.dailyMyLabel}>排名</span>
                <span className={styles.dailyMyValue}>
                  {dailyInfo?.myRank ? `#${dailyInfo.myRank}` : '-'}
                </span>
              </div>
              <div className={styles.dailyMyStat}>
                <span className={styles.dailyMyLabel}>盈利额</span>
                <span className={`${styles.dailyMyValue} ${(dailyInfo?.myProfit || 0) > 0 ? styles.positive : styles.negative}`}>
                  {(dailyInfo?.myProfit || 0) > 0 ? '+' : ''}{(dailyInfo?.myProfit || 0).toFixed(0)} 银两
                </span>
              </div>
              <div className={styles.dailyMyStat}>
                <span className={styles.dailyMyLabel}>当前净值</span>
                <span className={styles.dailyMyValue}>
                  ${(dailyInfo?.myBalance || 0).toLocaleString()}
                </span>
              </div>
              <div className={styles.dailyMyStat}>
                <span className={styles.dailyMyLabel}>初始本金</span>
                <span className={styles.dailyMyValue}>
                  ${(dailyInfo?.initialCapital || 10000).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className={styles.dailyMyAccount}>
          <h3><Zap className={styles.cardIcon} />每日挑战</h3>
          <p className={styles.matchDesc}>每日盈利排行，00:00-20:00可报名！</p>
          <div className={styles.matchRules}>
            <div className={styles.ruleItem}><span>参赛本金</span><span>10,000 银两</span></div>
            <div className={styles.ruleItem}><span>报名费</span><span>50 金币</span></div>
            <div className={styles.ruleItem}><span>比赛时间</span><span>当日</span></div>
          </div>
          <button 
            className={styles.registerBtn} 
            onClick={handleJoin} 
            disabled={registering || !session || statusInfo.status !== 'registering'}
          >
            {!session ? '请先登录' : registering ? '报名中...' : statusInfo.status !== 'registering' ? '报名已结束' : '立即报名'}
          </button>
        </div>
      )}

      {/* 奖励规则 */}
      <div className={styles.rewardSection}>
        <h3><Medal className={styles.cardIcon} />今日奖励</h3>
        <div className={styles.rewardList}>
          {DAILY_REWARDS.map(tier => (
            <div key={tier.rank} className={styles.rewardItem}>
              <div className={styles.rewardRank}>
                {tier.rank <= 3 ? (
                  <span className={`${styles.medalIcon} ${tier.rank === 1 ? styles.gold : tier.rank === 2 ? styles.silver : styles.bronze}`}>
                    {tier.rank === 1 ? '🥇' : tier.rank === 2 ? '🥈' : '🥉'}
                  </span>
                ) : (
                  <span className={styles.rankNumber}>{tier.rank}</span>
                )}
                <span className={styles.rankName}>{tier.name}</span>
              </div>
              <div className={styles.rewardAmount}>
                <span className={styles.coinIcon}>🪙</span>
                <span>{tier.profit} 金币</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 排行榜 */}
      <div className={styles.rankingSection}>
        <h3><Trophy className={styles.cardIcon} />实时排行</h3>
        <div className={styles.rankingList}>
          {ranking.map(item => (
            <div key={item.rank} className={`${styles.rankingItem} ${item.isMe ? styles.myRanking : ''}`}>
              <div className={styles.rankingPosition}>
                {item.rank <= 3 ? (
                  <span className={`${styles.topThree} ${item.rank === 1 ? styles.first : item.rank === 2 ? styles.second : styles.third}`}>
                    {item.rank}
                  </span>
                ) : (
                  <span className={styles.normalRank}>{item.rank}</span>
                )}
              </div>
              <div className={styles.rankingInfo}>
                <span className={styles.rankingName}>{item.username}</span>
                <span className={styles.rankingBalance}>盈利 {(item.profit).toLocaleString()} 银两</span>
              </div>
              <div className={styles.rankingYield}>
                <span className={styles.yieldValue}>+{((item.profit / 10000) * 100).toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
