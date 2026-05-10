'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import styles from './page.module.css';
import { TrendingUp, TrendingDown, Trophy, Zap, Target, Clock, DollarSign, Medal, Award, Star, Users, Gift, Crown, Calendar, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import TradingPanel from './components/TradingPanel';

type MatchType = 'kline' | 'ladder' | 'daily' | 'master' | 'monthly';

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
  accountId?: string;
  level?: number;
  status?: string;
}

interface MatchInfo {
  id: MatchType;
  name: string;
  icon: React.ReactNode;
  bgColor: string;
  accentColor: string;
  description: string;
  rules: string[];
  rewards: string;
  requirement?: string;
}

const matchInfo: Record<MatchType, MatchInfo> = {
  kline: {
    id: 'kline',
    name: 'K线征途',
    icon: <Target className={styles.matchIcon} />,
    bgColor: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    accentColor: '#3b82f6',
    description: '10关闯关挑战，从1000到2000',
    rules: ['初始净值1000银两', '每关目标增加100', '净值跌破100则失败', '通关奖励3000金币'],
    rewards: '通关: 3000金币 + K线宗师称号',
    requirement: '负债=0，200金币报名'
  },
  ladder: {
    id: 'ladder',
    name: '天梯赛',
    icon: <Trophy className={styles.matchIcon} />,
    bgColor: 'linear-gradient(135deg, #047857 0%, #10b981 100%)',
    accentColor: '#10b981',
    description: '月度收益率排行',
    rules: ['初始本金10000银两', '按收益率排名', '每月1日重置', '前10名获得金币奖励'],
    rewards: '第1名: 5000金币, 第2-5名: 2000金币',
    requirement: '免费报名，扣除10000银两'
  },
  daily: {
    id: 'daily',
    name: '每日挑战',
    icon: <Zap className={styles.matchIcon} />,
    bgColor: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
    accentColor: '#f59e0b',
    description: '每日盈利额排行',
    rules: ['00:00-20:00可报名', '当日盈利额排名', '前10名获得奖励', '每日重置'],
    rewards: '第1名: 500金币 + 500银两',
    requirement: '50金币报名，扣除10000银两'
  },
  master: {
    id: 'master',
    name: '大师邀请',
    icon: <Crown className={styles.matchIcon} />,
    bgColor: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
    accentColor: '#a78bfa',
    description: '淘汰赛制',
    rules: ['需要K线宗师称号', '单败淘汰制', '每周一轮', '冠亚季军获得称号'],
    rewards: '冠军: 20000金币 + 大师称号',
    requirement: '需拥有"K线宗师"称号'
  },
  monthly: {
    id: 'monthly',
    name: '月度决赛',
    icon: <Medal className={styles.matchIcon} />,
    bgColor: 'linear-gradient(135deg, #be185d 0%, #ec4899 100%)',
    accentColor: '#ec4899',
    description: '月底3天收益大赛',
    rules: ['天梯赛前100名参赛', '3天独立比赛', '按收益率排名', '冠军获得称号'],
    rewards: '冠军: 10000金币 + 月度大师称号',
    requirement: '上月天梯赛前100名，负债=0'
  }
};

export default function ChallengePage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<MatchType>('kline');
  const [loading, setLoading] = useState(false);
  const [myAccount, setMyAccount] = useState<MatchAccount | null>(null);
  const [enrolledMatches, setEnrolledMatches] = useState<MatchType[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 获取用户报名状态
  const fetchMatchStatus = useCallback(async () => {
    if (!session?.user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const matchType = activeTab;
      const res = await fetch(`/api/match/${matchType}`);
      const data = await res.json();
      
      if (res.ok) {
        // 处理不同的API响应格式
        const isRegistered = data.isRegistered || (data.status && data.status.isActive) || false;
        const accountData = data.myAccount || (data.activeAccounts && data.activeAccounts[0]) || null;
        
        if (isRegistered && accountData) {
          setMyAccount({
            id: accountData.id || accountData.accountId || 0,
            initialCapital: accountData.initialCapital || accountData.initialValue || 0,
            currentCapital: accountData.currentBalance || accountData.currentValue || accountData.balance || 0,
            profit: (accountData.currentBalance || accountData.currentValue || accountData.balance || 0) - (accountData.initialCapital || accountData.initialValue || 0),
            profitRate: accountData.profitRate || accountData.returnRate || 0,
            position: accountData.position || null,
            accountId: accountData.accountId || accountData.id,
            level: accountData.currentLevel || accountData.level || 0,
            status: 'enrolled'
          });
        } else {
          setMyAccount(null);
        }
        
        // 更新已报名赛事列表
        const enrolled: MatchType[] = [];
        for (const type of ['kline', 'ladder', 'daily', 'master', 'monthly'] as MatchType[]) {
          try {
            const r = await fetch(`/api/match/${type}`);
            const d = await r.json();
            if (d.isRegistered || (d.status && d.status.isActive) || (d.activeAccounts && d.activeAccounts.length > 0)) {
              enrolled.push(type);
            }
          } catch (e) {
            // 忽略单个小错误
          }
        }
        setEnrolledMatches(enrolled);
      } else {
        setError(data.error || '获取状态失败');
      }
    } catch (e) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  }, [activeTab, session]);

  useEffect(() => {
    if (session?.user) {
      fetchMatchStatus();
    }
  }, [session, activeTab, fetchMatchStatus]);

  const currentMatch = matchInfo[activeTab];
  const isEnrolled = myAccount !== null;

  return (
    <div className={styles.container}>
      {/* Tab 切换 */}
      <div className={styles.tabContainer}>
        {Object.values(matchInfo).map((match) => (
          <button
            key={match.id}
            className={`${styles.tab} ${activeTab === match.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(match.id)}
            style={activeTab === match.id ? { borderBottomColor: match.accentColor } : {}}
          >
            <span className={styles.tabIconWrapper}>{match.icon}</span>
            <span className={styles.tabName}>{match.name}</span>
            {enrolledMatches.includes(match.id) && (
              <span className={styles.enrolledBadge}>进行中</span>
            )}
          </button>
        ))}
      </div>

      {/* 主内容区 */}
      <div className={styles.content}>
        {/* 比赛信息卡片 */}
        <div className={styles.matchCard} style={{ background: currentMatch.bgColor }}>
          <div className={styles.matchHeader}>
            <div className={styles.matchTitleArea}>
              <span className={styles.matchIconLarge}>{currentMatch.icon}</span>
              <div>
                <h2 className={styles.matchName}>{currentMatch.name}</h2>
                <p className={styles.matchDesc}>{currentMatch.description}</p>
              </div>
            </div>
            {enrolledMatches.includes(activeTab) && (
              <span className={styles.enrolledTag}>已参赛</span>
            )}
          </div>
        </div>

        {/* 我的账户 / 报名区域 */}
        {isEnrolled ? (
          <TradingPanel
            account={myAccount}
            matchType={activeTab}
            onRefresh={fetchMatchStatus}
          />
        ) : (
          <div className={styles.enrollCard}>
            <div className={styles.enrollInfo}>
              <h3 className={styles.enrollTitle}>参赛条件</h3>
              <p className={styles.enrollRequirement}>{currentMatch.requirement}</p>
              
              <h4 className={styles.rulesTitle}>比赛规则</h4>
              <ul className={styles.rulesList}>
                {currentMatch.rules.map((rule, i) => (
                  <li key={i} className={styles.ruleItem}>
                    <ChevronRight className={styles.ruleIcon} />
                    {rule}
                  </li>
                ))}
              </ul>
              
              <div className={styles.rewardBox}>
                <Gift className={styles.rewardIcon} />
                <span>{currentMatch.rewards}</span>
              </div>
            </div>
            
            <button
              className={styles.enrollButton}
              style={{ background: currentMatch.accentColor }}
              onClick={async () => {
                if (!session?.user) {
                  alert('请先登录');
                  return;
                }
                setLoading(true);
                try {
                  const res = await fetch(`/api/match/${activeTab}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'register' })
                  });
                  const data = await res.json();
                  if (res.ok) {
                    fetchMatchStatus();
                  } else {
                    alert(data.error || '报名失败');
                  }
                } catch (e) {
                  alert('网络错误');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              {loading ? '处理中...' : '立即参赛'}
            </button>
            
            {!session?.user && (
              <p className={styles.loginHint}>请先登录后再报名参赛</p>
            )}
          </div>
        )}

        {/* 排行榜预览 */}
        <div className={styles.leaderboardPreview}>
          <div className={styles.leaderboardHeader}>
            <h3 className={styles.leaderboardTitle}>
              <Medal className={styles.leaderboardIcon} />
              {currentMatch.name}排行榜
            </h3>
            <span className={styles.leaderboardMore}>查看全部</span>
          </div>
          <div className={styles.leaderboardList}>
            <div className={styles.leaderboardItem}>
              <span className={styles.rank}>🥇</span>
              <span className={styles.playerName}>玩家***789</span>
              <span className={styles.playerValue}>+23.5%</span>
            </div>
            <div className={styles.leaderboardItem}>
              <span className={styles.rank}>🥈</span>
              <span className={styles.playerName}>玩家***456</span>
              <span className={styles.playerValue}>+18.2%</span>
            </div>
            <div className={styles.leaderboardItem}>
              <span className={styles.rank}>🥉</span>
              <span className={styles.playerName}>玩家***123</span>
              <span className={styles.playerValue}>+15.8%</span>
            </div>
          </div>
        </div>

        {/* 全部赛事概览 */}
        <div className={styles.allMatches}>
          <h3 className={styles.allMatchesTitle}>
            <Star className={styles.allMatchesIcon} />
            全部赛事
          </h3>
          <div className={styles.matchesGrid}>
            {Object.values(matchInfo).map((match) => (
              <button
                key={match.id}
                className={`${styles.matchMiniCard} ${activeTab === match.id ? styles.matchMiniActive : ''}`}
                onClick={() => setActiveTab(match.id)}
                style={activeTab === match.id ? { borderColor: match.accentColor } : {}}
              >
                <div 
                  className={styles.matchMiniIcon}
                  style={{ background: match.bgColor }}
                >
                  {match.icon}
                </div>
                <div className={styles.matchMiniInfo}>
                  <span className={styles.matchMiniName}>{match.name}</span>
                  <span className={styles.matchMiniDesc}>{match.description}</span>
                </div>
                {enrolledMatches.includes(match.id) ? (
                  <span className={styles.matchMiniBadge}>进行中</span>
                ) : (
                  <ChevronRight className={styles.matchMiniArrow} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className={styles.errorToast}>
          {error}
        </div>
      )}
    </div>
  );
}
