'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import styles from './page.module.css';
import { TrendingUp, TrendingDown, Trophy, Zap, Target, Clock, DollarSign, BarChart3, Star, RefreshCw, X, Calendar, Medal, Award, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';

// 赛事相关组件
import KLineChallenge from './components/KLineChallenge';
import LadderChallenge from './components/LadderChallenge';
import DailyChallenge from './components/DailyChallenge';
import MasterChallenge from './components/MasterChallenge';
import MonthlyChallenge from './components/MonthlyChallenge';

// 通用交易面板
import TradingPanel from './components/TradingPanel';

type MatchType = 'kline' | 'ladder' | 'daily' | 'master' | 'monthly';

// 参赛账户信息
interface MatchAccount {
  matchType: MatchType;
  accountId: string;
  balance: number;
  currentValue: number;
  initialValue: number;
  returnRate: number;
  level?: number; // K线征途关卡
  status: string;
}

// 赛事标签
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
  const [activeAccounts, setActiveAccounts] = useState<MatchAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<MatchAccount | null>(null);
  const [showGlobalPanel, setShowGlobalPanel] = useState(false);

  // 获取所有参赛账户
  const fetchActiveAccounts = useCallback(async () => {
    if (!session?.user?.email) return;
    
    const accounts: MatchAccount[] = [];
    const matchTypes: MatchType[] = ['kline', 'ladder', 'daily', 'master', 'monthly'];
    
    for (const matchType of matchTypes) {
      try {
        const res = await fetch(`/api/match/${matchType}`);
        const data = await res.json();
        
        if (data.isRegistered && data.myAccount) {
          const acc = data.myAccount;
          const initialValue = matchType === 'kline' ? 1000 : 
                              matchType === 'ladder' ? 10000 :
                              matchType === 'daily' ? 10000 :
                              matchType === 'master' ? 100000 : 100000;
          
          accounts.push({
            matchType,
            accountId: acc.accountId || acc.id,
            balance: acc.balance || 0,
            currentValue: acc.currentValue || acc.balance || 0,
            initialValue: acc.initialValue || initialValue,
            returnRate: acc.returnRate || 0,
            level: acc.currentLevel || acc.level,
            status: acc.status || 'active'
          });
        }
      } catch (e) {
        console.error(`${matchType} fetch error:`, e);
      }
    }
    
    setActiveAccounts(accounts);
    
    // 如果当前选中的账户不在列表中，切换到第一个
    if (accounts.length > 0 && !accounts.find(a => a.accountId === activeAccount?.accountId)) {
      setActiveAccount(accounts[0]);
    }
  }, [session?.user?.email, activeAccount?.accountId]);

  useEffect(() => {
    if (session?.user?.email) {
      fetchActiveAccounts();
    }
  }, [session?.user?.email, fetchActiveAccounts]);

  // 切换账户
  const handleSelectAccount = (account: MatchAccount) => {
    setActiveAccount(account);
    setActiveMatch(account.matchType);
    setShowGlobalPanel(false);
  };

  // 刷新回调
  const handleRefresh = () => {
    fetchActiveAccounts();
  };

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

        {/* 全局交易面板入口 */}
        {activeAccounts.length > 0 && (
          <div className={styles.globalPanelEntry} onClick={() => setShowGlobalPanel(!showGlobalPanel)}>
            <div className={styles.globalPanelHeader}>
              <div className={styles.globalPanelTitle}>
                <BarChart3 className={styles.globalPanelIcon} />
                <span>我的参赛账户</span>
                <span className={styles.accountCount}>{activeAccounts.length}个</span>
              </div>
              <ChevronRight className={`${styles.chevron} ${showGlobalPanel ? styles.chevronOpen : ''}`} />
            </div>
            
            {showGlobalPanel && (
              <div className={styles.globalPanelContent}>
                {activeAccounts.map((account) => (
                  <div 
                    key={account.accountId}
                    className={`${styles.accountCard} ${activeAccount?.accountId === account.accountId ? styles.accountCardActive : ''}`}
                    onClick={(e) => { e.stopPropagation(); handleSelectAccount(account); }}
                  >
                    <div className={styles.accountCardHeader}>
                      <span className={styles.matchName} style={{ color: matchTabs.find(t => t.id === account.matchType)?.color }}>
                        {matchTabs.find(t => t.id === account.matchType)?.name}
                      </span>
                      {account.level && (
                        <span className={styles.levelBadge}>第{account.level}关</span>
                      )}
                    </div>
                    <div className={styles.accountCardBody}>
                      <div className={styles.accountBalance}>
                        <span className={styles.balanceLabel}>净值</span>
                        <span className={styles.balanceValue}>{account.currentValue.toLocaleString()}</span>
                      </div>
                      <div className={styles.accountRate}>
                        <span className={`${styles.rateValue} ${account.returnRate >= 0 ? styles.ratePositive : styles.rateNegative}`}>
                          {account.returnRate >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          {account.returnRate >= 0 ? '+' : ''}{account.returnRate.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 活跃账户交易面板 */}
        {activeAccount && (
          <div className={styles.activeTradingPanel}>
            <TradingPanel
              matchType={activeAccount.matchType}
              initialBalance={activeAccount.currentValue}
              matchAccountId={activeAccount.accountId}
              onRefresh={handleRefresh}
              compact
            />
          </div>
        )}

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
