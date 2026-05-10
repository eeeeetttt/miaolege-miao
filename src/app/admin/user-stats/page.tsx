'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Users, Trophy, Target, Activity, Crown, Bot, BarChart3, PieChart } from 'lucide-react';
import styles from './page.module.css';

interface UserStats {
  rank: number;
  id: string;
  name: string;
  email?: string;
  matchType: string;
  totalProfit: number;
  totalTrades: number;
  winRate: number;
  currentBalance: number;
  participatedChallenges?: number;
  wonChallenges?: number;
}

interface MatchStat {
  type: string;
  participants: number;
  totalBalance: number;
  totalProfit: number;
  bestProfit: number;
  avgProfit: number;
}

export default function UserStatsPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState({ totalParticipants: 0, totalAccounts: 0, totalBalance: 0, totalProfit: 0 });
  const [matchStats, setMatchStats] = useState<MatchStat[]>([]);
  const [aiLeaderboard, setAiLeaderboard] = useState<UserStats[]>([]);
  const [userLeaderboard, setUserLeaderboard] = useState<UserStats[]>([]);
  const [activeTab, setActiveTab] = useState<'ai' | 'user'>('ai');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/user-stats');
      const data = await res.json();
      
      if (data.success) {
        setOverview(data.overview);
        setMatchStats(data.matchStats);
        setAiLeaderboard(data.aiLeaderboard);
        setUserLeaderboard(data.userLeaderboard);
      } else {
        setError(data.error || '获取数据失败');
      }
    } catch (err) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const matchTypeNames: Record<string, string> = {
    kline: 'K线征途',
    ladder: '天梯赛',
    daily: '每日挑战',
    master: '大师邀请',
    monthly: '月度决赛',
    total: '总计',
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>用户参赛盈利统计</h1>
      
      {/* 总览卡片 */}
      <div className={styles.overviewGrid}>
        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon}>
            <Users size={24} />
          </div>
          <div className={styles.overviewContent}>
            <div className={styles.overviewValue}>{overview.totalParticipants}</div>
            <div className={styles.overviewLabel}>参赛人数</div>
          </div>
        </div>
        
        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon}>
            <Activity size={24} />
          </div>
          <div className={styles.overviewContent}>
            <div className={styles.overviewValue}>{overview.totalAccounts}</div>
            <div className={styles.overviewLabel}>参赛账户</div>
          </div>
        </div>
        
        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon}>
            <BarChart3 size={24} />
          </div>
          <div className={styles.overviewContent}>
            <div className={styles.overviewValue}>${overview.totalBalance.toFixed(2)}</div>
            <div className={styles.overviewLabel}>总账户净值</div>
          </div>
        </div>
        
        <div className={`${styles.overviewCard} ${overview.totalProfit >= 0 ? styles.profitCard : styles.lossCard}`}>
          <div className={styles.overviewIcon}>
            {overview.totalProfit >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
          </div>
          <div className={styles.overviewContent}>
            <div className={styles.overviewValue}>
              {overview.totalProfit >= 0 ? '+' : ''}{overview.totalProfit.toFixed(2)}
            </div>
            <div className={styles.overviewLabel}>总盈亏</div>
          </div>
        </div>
      </div>

      {/* 赛事统计 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <PieChart size={20} />
          各赛事统计
        </h2>
        <div className={styles.matchStatsGrid}>
          {matchStats.map((stat) => (
            <div key={stat.type} className={styles.matchStatCard}>
              <div className={styles.matchStatHeader}>
                <span className={styles.matchTypeName}>{matchTypeNames[stat.type] || stat.type}</span>
                <span className={styles.participantCount}>{stat.participants}人</span>
              </div>
              <div className={styles.matchStatBody}>
                <div className={styles.statItem}>
                  <span>总净值</span>
                  <span className={styles.statValue}>${stat.totalBalance.toFixed(2)}</span>
                </div>
                <div className={styles.statItem}>
                  <span>总盈亏</span>
                  <span className={`${styles.statValue} ${stat.totalProfit >= 0 ? styles.profit : styles.loss}`}>
                    {stat.totalProfit >= 0 ? '+' : ''}{stat.totalProfit.toFixed(2)}
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span>最佳盈利</span>
                  <span className={`${styles.statValue} ${styles.bestProfit}`}>
                    +{stat.bestProfit.toFixed(2)}
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span>人均盈利</span>
                  <span className={styles.statValue}>{stat.avgProfit.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 排行榜切换 */}
      <div className={styles.section}>
        <div className={styles.tabHeader}>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'ai' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            <Bot size={18} />
            AI交易员
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'user' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('user')}
          >
            <Users size={18} />
            真实用户
          </button>
        </div>

        {activeTab === 'ai' && (
          <div className={styles.leaderboard}>
            <div className={styles.leaderboardHeader}>
              <span className={styles.rankCol}>#</span>
              <span className={styles.nameCol}>交易员</span>
              <span className={styles.matchCol}>赛事</span>
              <span className={styles.profitCol}>总盈亏</span>
              <span className={styles.tradesCol}>交易次数</span>
              <span className={styles.rateCol}>胜率</span>
              <span className={styles.balanceCol}>当前净值</span>
            </div>
            {aiLeaderboard.length === 0 ? (
              <div className={styles.emptyState}>暂无AI数据</div>
            ) : (
              aiLeaderboard.map((user, index) => (
                <div key={`${user.id}-${index}`} className={styles.leaderboardRow}>
                  <span className={styles.rankCol}>
                    {index < 3 ? (
                      <Crown size={16} className={index === 0 ? styles.gold : index === 1 ? styles.silver : styles.bronze} />
                    ) : (
                      user.rank
                    )}
                  </span>
                  <span className={styles.nameCol}>
                    <Bot size={16} className={styles.botIcon} />
                    {user.name}
                  </span>
                  <span className={styles.matchCol}>{matchTypeNames[user.matchType] || user.matchType}</span>
                  <span className={`${styles.profitCol} ${user.totalProfit >= 0 ? styles.profit : styles.loss}`}>
                    {user.totalProfit >= 0 ? '+' : ''}{user.totalProfit.toFixed(2)}
                  </span>
                  <span className={styles.tradesCol}>{user.totalTrades}</span>
                  <span className={styles.rateCol}>{user.winRate.toFixed(1)}%</span>
                  <span className={styles.balanceCol}>${user.currentBalance.toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'user' && (
          <div className={styles.leaderboard}>
            <div className={styles.leaderboardHeader}>
              <span className={styles.rankCol}>#</span>
              <span className={styles.nameCol}>用户</span>
              <span className={styles.matchCol}>赛事</span>
              <span className={styles.profitCol}>总盈亏</span>
              <span className={styles.tradesCol}>交易次数</span>
              <span className={styles.rateCol}>胜率</span>
              <span className={styles.balanceCol}>当前净值</span>
            </div>
            {userLeaderboard.length === 0 ? (
              <div className={styles.emptyState}>暂无用户数据</div>
            ) : (
              userLeaderboard.map((user, index) => (
                <div key={`${user.id}-${index}`} className={styles.leaderboardRow}>
                  <span className={styles.rankCol}>
                    {index < 3 ? (
                      <Trophy size={16} className={index === 0 ? styles.gold : index === 1 ? styles.silver : styles.bronze} />
                    ) : (
                      user.rank
                    )}
                  </span>
                  <span className={styles.nameCol}>
                    {user.name}
                    <span className={styles.userEmail}>{user.email}</span>
                  </span>
                  <span className={styles.matchCol}>{matchTypeNames[user.matchType] || user.matchType}</span>
                  <span className={`${styles.profitCol} ${user.totalProfit >= 0 ? styles.profit : styles.loss}`}>
                    {user.totalProfit >= 0 ? '+' : ''}{user.totalProfit.toFixed(2)}
                  </span>
                  <span className={styles.tradesCol}>{user.totalTrades}</span>
                  <span className={styles.rateCol}>{user.winRate.toFixed(1)}%</span>
                  <span className={styles.balanceCol}>${user.currentBalance.toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
