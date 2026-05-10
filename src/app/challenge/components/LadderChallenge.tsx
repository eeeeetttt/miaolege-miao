'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trophy, Medal, TrendingUp, Calendar, Star, BarChart3 } from 'lucide-react';
import TradingPanel from './TradingPanel';
import styles from '../page.module.css';

interface LadderChallengeProps {
  session: any;
}

interface SeasonInfo {
  seasonStart: string;
  seasonEnd: string;
  daysLeft: number;
  participantCount: number;
  myRank: number | null;
  myYield: number;
  myBalance: number;
  initialCapital: number;
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
  yield: number;
  balance: number;
  isMe: boolean;
}

const REWARD_TIERS = [
  { rank: 1, reward: 5000, name: '冠军' },
  { rank: 2, reward: 3000, name: '亚军' },
  { rank: 3, reward: 2000, name: '季军' },
  { rank: 4, reward: 1000, name: '殿军' },
  { rank: 5, reward: 500, name: '第五名' },
  { rank: 6, reward: 300, name: '第六名' },
  { rank: 7, reward: 200, name: '第七名' },
  { rank: 8, reward: 150, name: '第八名' },
  { rank: 9, reward: 100, name: '第九名' },
  { rank: 10, reward: 50, name: '第十名' },
];

export default function LadderChallenge({ session }: LadderChallengeProps) {
  const [seasonInfo, setSeasonInfo] = useState<SeasonInfo | null>(null);
  const [ranking, setRanking] = useState<RankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [registering, setRegistering] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [myAccount, setMyAccount] = useState<MatchAccount | null>(null);
  const [showTrading, setShowTrading] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'warning' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const fetchSeasonInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/match/ladder');
      const data = await res.json();
      if (data.season) {
        const now = new Date();
        const seasonEnd = new Date(data.season.seasonEnd || now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const daysLeft = Math.max(0, Math.ceil((seasonEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
        
        setSeasonInfo({
          seasonStart: data.season.seasonStart || now.toISOString().split('T')[0],
          seasonEnd: data.season.seasonEnd || seasonEnd.toISOString().split('T')[0],
          daysLeft,
          participantCount: data.season.participantCount || 0,
          myRank: data.season.myRank,
          myYield: data.season.myYield || 0,
          myBalance: data.season.myBalance || 0,
          initialCapital: data.season.initialCapital || 10000
        });
        setHasJoined(data.isRegistered || (data.account && data.account.id) || false);
        
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
        const now = new Date();
        const seasonEnd = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
        setSeasonInfo({
          seasonStart: now.toISOString().split('T')[0],
          seasonEnd: seasonEnd.toISOString().split('T')[0],
          daysLeft: 15,
          participantCount: 0,
          myRank: null,
          myYield: 0,
          myBalance: 10000,
          initialCapital: 10000
        });
      }

      // 模拟排行榜
      setRanking([
        { rank: 1, username: '交易大师', yield: 25.6, balance: 12560, isMe: false },
        { rank: 2, username: '金油猎人', yield: 22.3, balance: 12230, isMe: false },
        { rank: 3, username: '趋势追踪', yield: 18.9, balance: 11890, isMe: false },
        { rank: 4, username: '稳健投资', yield: 15.2, balance: 11520, isMe: false },
        { rank: 5, username: '短线高手', yield: 12.8, balance: 11280, isMe: false },
      ]);
    } catch (e) {
      console.error('获取天梯赛信息失败:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSeasonInfo();
  }, [fetchSeasonInfo]);

  const handleJoin = async () => {
    if (!session) { showToast('请先登录', 'warning'); return; }
    setRegistering(true);
    try {
      const res = await fetch('/api/match/ladder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register' })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('报名成功！', 'success');
        setHasJoined(true);
        setShowTrading(true);
        fetchSeasonInfo();
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

  return (
    <div className={styles.matchContainer}>
      {toast && (
        <div className={`${styles.toast} ${styles[toast.type]}`}>{toast.message}</div>
      )}

      {/* 赛季信息卡片 */}
      <div className={styles.seasonInfoCard}>
        <div className={styles.seasonHeader}>
          <Trophy className={styles.seasonIcon} />
          <div className={styles.seasonTitle}>
            <h2>天梯赛</h2>
            <p>月度收益率排行赛</p>
          </div>
        </div>
        
        <div className={styles.seasonStats}>
          <div className={styles.seasonStat}>
            <Calendar className={styles.seasonStatIcon} />
            <div className={styles.seasonStatInfo}>
              <span className={styles.seasonStatValue}>{seasonInfo?.daysLeft || 0}天</span>
              <span className={styles.seasonStatLabel}>剩余时间</span>
            </div>
          </div>
          <div className={styles.seasonStat}>
            <Star className={styles.seasonStatIcon} />
            <div className={styles.seasonStatInfo}>
              <span className={styles.seasonStatValue}>{seasonInfo?.participantCount || 0}</span>
              <span className={styles.seasonStatLabel}>参赛人数</span>
            </div>
          </div>
        </div>

        <div className={styles.seasonDate}>
          <span>{seasonInfo?.seasonStart || '-'}</span>
          <span>至</span>
          <span>{seasonInfo?.seasonEnd || '-'}</span>
        </div>
      </div>

      {/* 交易面板或报名入口 */}
      {hasJoined ? (
        <>
          <div className={styles.tradingHeader}>
            <BarChart3 size={18} />
            <span>交易面板</span>
            <button className={styles.toggleTrading} onClick={() => setShowTrading(!showTrading)}>
              {showTrading ? '收起' : '展开'}
            </button>
          </div>
          {showTrading && (
            <TradingPanel
              matchType="ladder"
              account={myAccount}
              onRefresh={fetchSeasonInfo}
            />
          )}
          
          {/* 我的账户概览 */}
          <div className={styles.ladderMyAccount}>
            <h3><TrendingUp className={styles.cardIcon} />我的账户</h3>
            <div className={styles.ladderMyStats}>
              <div className={styles.ladderMyStat}>
                <span className={styles.ladderMyLabel}>排名</span>
                <span className={styles.ladderMyValue}>
                  {seasonInfo?.myRank ? `#${seasonInfo.myRank}` : '-'}
                </span>
              </div>
              <div className={styles.ladderMyStat}>
                <span className={styles.ladderMyLabel}>收益率</span>
                <span className={`${styles.ladderMyValue} ${(seasonInfo?.myYield || 0) >= 0 ? styles.positive : styles.negative}`}>
                  {(seasonInfo?.myYield || 0) >= 0 ? '+' : ''}{seasonInfo?.myYield?.toFixed(2) || '0.00'}%
                </span>
              </div>
              <div className={styles.ladderMyStat}>
                <span className={styles.ladderMyLabel}>当前净值</span>
                <span className={styles.ladderMyValue}>
                  ${(seasonInfo?.myBalance || 0).toLocaleString()}
                </span>
              </div>
              <div className={styles.ladderMyStat}>
                <span className={styles.ladderMyLabel}>初始本金</span>
                <span className={styles.ladderMyValue}>
                  ${(seasonInfo?.initialCapital || 10000).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className={styles.ladderMyAccount}>
          <h3><Trophy className={styles.cardIcon} />天梯赛</h3>
          <p className={styles.matchDesc}>月度收益率排行，赢取丰厚奖励！</p>
          <div className={styles.matchRules}>
            <div className={styles.ruleItem}><span>参赛本金</span><span>10,000 银两</span></div>
            <div className={styles.ruleItem}><span>报名费</span><span>免费</span></div>
            <div className={styles.ruleItem}><span>赛季时长</span><span>30天</span></div>
          </div>
          <button className={styles.registerBtn} onClick={handleJoin} disabled={registering || !session}>
            {!session ? '请先登录' : registering ? '报名中...' : '立即报名'}
          </button>
        </div>
      )}

      {/* 奖励规则 */}
      <div className={styles.rewardSection}>
        <h3><Medal className={styles.cardIcon} />赛季奖励</h3>
        <div className={styles.rewardList}>
          {REWARD_TIERS.map(tier => (
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
                <span className={styles.goldIcon}>🪙</span>
                <span>{tier.reward} 金币</span>
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
                <span className={styles.rankingBalance}>净值 ${item.balance.toLocaleString()}</span>
              </div>
              <div className={styles.rankingYield}>
                <span className={styles.yieldValue}>+{item.yield}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
