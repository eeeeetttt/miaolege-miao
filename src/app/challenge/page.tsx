'use client';

import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import styles from './page.module.css';
import { TrendingUp, TrendingDown, Trophy, Zap, Target, Clock, DollarSign, BarChart3, Star, RefreshCw, X, Calendar, Medal, Award, ChevronRight } from 'lucide-react';

// 赛事相关组件
import KLineChallenge from './components/KLineChallenge';
import LadderChallenge from './components/LadderChallenge';
import DailyChallenge from './components/DailyChallenge';
import MasterChallenge from './components/MasterChallenge';
import MonthlyChallenge from './components/MonthlyChallenge';

type MatchType = 'kline' | 'ladder' | 'daily' | 'master' | 'monthly';

interface MatchTab {
  id: MatchType;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  badge?: string;
}

const matchTabs: MatchTab[] = [
  {
    id: 'kline',
    name: 'K线征途',
    icon: <Target className={styles.tabIcon} />,
    color: '#3b82f6',
    description: '10关闯关'
  },
  {
    id: 'ladder',
    name: '天梯赛',
    icon: <Trophy className={styles.tabIcon} />,
    color: '#10b981',
    description: '月度排行'
  },
  {
    id: 'daily',
    name: '每日挑战',
    icon: <Zap className={styles.tabIcon} />,
    color: '#f59e0b',
    description: '每日排行'
  },
  {
    id: 'master',
    name: '大师邀请',
    icon: <Award className={styles.tabIcon} />,
    color: '#8b5cf6',
    description: '淘汰赛'
  },
  {
    id: 'monthly',
    name: '月度决赛',
    icon: <Medal className={styles.tabIcon} />,
    color: '#ef4444',
    description: '巅峰对决'
  }
];

function ChallengeContent() {
  const { data: session } = useSession();
  const [activeMatch, setActiveMatch] = useState<MatchType>('kline');

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        {/* 页面标题 */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>
            <Trophy className={styles.titleIcon} />
            赛事中心
          </h1>
          <p className={styles.pageSubtitle}>选择赛事，挑战自我！</p>
        </div>

        {/* 赛事切换标签 */}
        <div className={styles.matchTabs}>
          {matchTabs.map(tab => (
            <button
              key={tab.id}
              className={`${styles.matchTab} ${activeMatch === tab.id ? styles.matchTabActive : ''}`}
              onClick={() => setActiveMatch(tab.id)}
              style={{
                '--tab-color': tab.color,
                '--tab-color-light': `${tab.color}20`
              } as React.CSSProperties}
            >
              {tab.icon}
              <span className={styles.tabName}>{tab.name}</span>
              <span className={styles.tabDesc}>{tab.description}</span>
              {activeMatch === tab.id && (
                <ChevronRight className={styles.tabArrow} />
              )}
            </button>
          ))}
        </div>

        {/* 赛事内容区域 */}
        <div className={styles.matchContent}>
          {activeMatch === 'kline' && (
            <KLineChallenge session={session} />
          )}
          {activeMatch === 'ladder' && (
            <LadderChallenge session={session} />
          )}
          {activeMatch === 'daily' && (
            <DailyChallenge session={session} />
          )}
          {activeMatch === 'master' && (
            <MasterChallenge />
          )}
          {activeMatch === 'monthly' && (
            <MonthlyChallenge />
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChallengePage() {
  return (
    <Suspense fallback={<div className={styles.loading}>加载中...</div>}>
      <ChallengeContent />
    </Suspense>
  );
}
