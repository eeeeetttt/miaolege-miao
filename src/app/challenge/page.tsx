'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from './page.module.css';

interface LevelConfig {
  level: number;
  name: string;
  description: string | null;
  targetBalance: number;
  initialBalance: number;
  failBalance: number;
  reward: string | null;
}

interface ChallengeData {
  hasActiveChallenge: boolean;
  hasPendingApplication: boolean;
  canReapply: boolean;
  registration: {
    id: number;
    status: string;
    currentLevel: number;
    completedLevels: number[];
    startedAt: string | null;
    serverName: string | null;
    tradingAccount: string | null;
    completedAt: string | null;
    failedAt: string | null;
    failedLevel: number | null;
  } | null;
  registrationFee: number;
  config: Record<string, string>;
  levelConfigs: LevelConfig[];
  message: string;
}

interface AccountBalance {
  hasActiveChallenge: boolean;
  challengeId: number;
  currentLevel: number;
  completedLevels: number[];
  account: {
    serverName: string | null;
    accountNumber: string | null;
    platform?: string;
    broker?: string;
  };
  balance: number;
  equity: number;
  profit: number;
  startedAt: string | null;
  simulated?: boolean;
}

interface HallOfFameEntry {
  rank: number;
  displayName: string;
  avatar: string | null;
  completedAt: string;
  formattedDuration: string;
}

export default function ChallengePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [challengeData, setChallengeData] = useState<ChallengeData | null>(null);
  const [accountBalance, setAccountBalance] = useState<AccountBalance | null>(null);
  const [hallOfFame, setHallOfFame] = useState<HallOfFameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchChallengeData();
      fetchHallOfFame();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status]);

  // 定期刷新余额
  useEffect(() => {
    if (challengeData?.hasActiveChallenge) {
      fetchAccountBalance();
      const interval = setInterval(fetchAccountBalance, 30000); // 每30秒刷新
      return () => clearInterval(interval);
    }
  }, [challengeData?.hasActiveChallenge]);

  const fetchChallengeData = async () => {
    try {
      const res = await fetch('/api/challenge/register');
      const data = await res.json();
      setChallengeData(data);
      if (data.error) {
        setErrorMessage(data.error);
      } else {
        setErrorMessage(null);
      }
      setLoading(false);
    } catch (error) {
      console.error('获取挑战状态失败:', error);
      setErrorMessage('网络错误，请刷新页面重试');
      setLoading(false);
    }
  };

  const fetchAccountBalance = async () => {
    if (!challengeData?.hasActiveChallenge) return;
    
    setBalanceLoading(true);
    try {
      const res = await fetch('/api/challenge/balance');
      const data = await res.json();
      if (res.ok) {
        setAccountBalance(data);
      }
    } catch (error) {
      console.error('获取账户余额失败:', error);
    } finally {
      setBalanceLoading(false);
    }
  };

  const fetchHallOfFame = async () => {
    try {
      const res = await fetch('/api/challenge/hall-of-fame?limit=10');
      const data = await res.json();
      setHallOfFame(data.list || []);
    } catch (error) {
      console.error('获取名人堂失败:', error);
    }
  };

  const handleApply = async () => {
    setRegistering(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/challenge/register', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        setSuccessMessage(data.message || '申请已提交，请等待审核');
        fetchChallengeData();
      } else {
        setErrorMessage(data.error || data.details || '申请失败，请稍后重试');
      }
    } catch (error) {
      console.error('申请失败:', error);
      setErrorMessage('网络错误，请检查网络连接后重试');
    } finally {
      setRegistering(false);
    }
  };

  const getLevels = (): LevelConfig[] => {
    if (challengeData?.levelConfigs && challengeData.levelConfigs.length > 0) {
      return challengeData.levelConfigs;
    }
    // 默认关卡配置
    return [
      { level: 1, name: '启念', description: '开始你的交易之旅', targetBalance: 2000, initialBalance: 1000, failBalance: 100, reward: '继续挑战' },
      { level: 2, name: '立规', description: '建立交易规则', targetBalance: 2000, initialBalance: 1000, failBalance: 100, reward: '继续挑战' },
      { level: 3, name: '守戒', description: '遵守交易纪律', targetBalance: 2000, initialBalance: 1000, failBalance: 100, reward: '继续挑战' },
      { level: 4, name: '忍痛', description: '学会止损止盈', targetBalance: 2000, initialBalance: 1000, failBalance: 100, reward: '继续挑战' },
      { level: 5, name: '止喜', description: '控制情绪波动', targetBalance: 2000, initialBalance: 1000, failBalance: 100, reward: '继续挑战' },
      { level: 6, name: '观己', description: '认识自我弱点', targetBalance: 2000, initialBalance: 1000, failBalance: 100, reward: '继续挑战' },
      { level: 7, name: '破执', description: '突破固有思维', targetBalance: 2000, initialBalance: 1000, failBalance: 100, reward: '继续挑战' },
      { level: 8, name: '随势', description: '顺势而为', targetBalance: 2000, initialBalance: 1000, failBalance: 100, reward: '继续挑战' },
      { level: 9, name: '忘我', description: '达到交易境界', targetBalance: 2000, initialBalance: 1000, failBalance: 100, reward: '继续挑战' },
      { level: 10, name: '得道', description: '完成终极挑战', targetBalance: 2000, initialBalance: 1000, failBalance: 100, reward: '通关大奖' },
    ];
  };

  if (status === 'loading' || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  const levels = getLevels();
  const currentLevel = challengeData?.registration?.currentLevel || 1;
  const completedLevels = challengeData?.registration?.completedLevels || [];
  const registrationStatus = challengeData?.registration?.status;

  return (
    <div className={styles.container}>
      {/* 背景装饰 */}
      <div className={styles.bgDecoration}>
        <div className={styles.grid}></div>
      </div>

      <main className={styles.main}>
        {/* 头部标题 */}
        <header className={styles.header}>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
              </svg>
            </span>
            K线征途
          </h1>
          <p className={styles.subtitle}>踏上交易巅峰之路，10关挑战等你来战</p>
        </header>

        {/* 左右布局 */}
        <div className={styles.layoutContainer}>
          {/* 左侧：报名和信息区域 */}
          <div className={styles.leftPanel}>
            {/* 挑战状态卡片 */}
            <section className={styles.statusSection}>
              {session?.user ? (
                <>
                  {/* 挑战进行中 */}
                  {challengeData?.hasActiveChallenge && accountBalance && (
                    <div className={styles.activeChallengeCard}>
                      <div className={styles.challengeHeader}>
                        <h3>挑战进行中</h3>
                        <span className={styles.levelBadge}>第{currentLevel}关</span>
                      </div>
                      
                      {/* 账户信息 */}
                      <div className={styles.accountInfo}>
                        <div className={styles.accountTitle}>
                          <svg viewBox="0 0 24 24" fill="currentColor" className={styles.accountIcon}>
                            <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                          </svg>
                          {accountBalance.account.serverName} - {accountBalance.account.accountNumber}
                        </div>
                        {accountBalance.simulated && (
                          <span className={styles.simulatedBadge}>模拟数据</span>
                        )}
                      </div>

                      {/* 净值显示 */}
                      <div className={styles.balanceDisplay}>
                        <div className={styles.balanceMain}>
                          <span className={styles.balanceLabel}>当前净值</span>
                          <span className={`${styles.balanceValue} ${accountBalance.profit >= 0 ? styles.profit : styles.loss}`}>
                            ${accountBalance.balance.toFixed(2)}
                          </span>
                        </div>
                        <div className={styles.balanceSub}>
                          <span>余额: ${accountBalance.balance.toFixed(2)}</span>
                          <span className={accountBalance.profit >= 0 ? styles.profitText : styles.lossText}>
                            {accountBalance.profit >= 0 ? '+' : ''}{accountBalance.profit.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* 进度 */}
                      <div className={styles.progressSection}>
                        <p className={styles.progressText}>已完成 {completedLevels.length}/10 关</p>
                        <div className={styles.levelDots}>
                          {levels.map((level) => (
                            <span
                              key={level.level}
                              className={`${styles.levelDot} ${
                                completedLevels.includes(level.level) ? styles.completed : ''
                              } ${currentLevel === level.level ? styles.current : ''}`}
                            />
                          ))}
                        </div>
                      </div>

                      {balanceLoading && (
                        <div className={styles.refreshing}>数据刷新中...</div>
                      )}
                    </div>
                  )}

                  {/* 待审核状态 */}
                  {registrationStatus === 'pending' && (
                    <div className={styles.pendingCard}>
                      <div className={styles.pendingIcon}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      </div>
                      <h3>申请已提交</h3>
                      <p>{challengeData?.message}</p>
                      <div className={styles.pendingHint}>
                        审核通过后，我们会通过邮件告知您
                      </div>
                    </div>
                  )}

                  {/* 待激活状态 */}
                  {registrationStatus === 'approved' && (
                    <div className={styles.pendingCard}>
                      <div className={styles.pendingIcon}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      </div>
                      <h3>申请已通过</h3>
                      <p>您的账户已分配，等待管理员激活后即可开始挑战</p>
                      <div className={styles.accountPreview}>
                        <span>服务器: {challengeData?.registration?.serverName || '-'}</span>
                        <span>账号: {challengeData?.registration?.tradingAccount || '-'}</span>
                      </div>
                    </div>
                  )}

                  {/* 已完成/失败状态 */}
                  {(registrationStatus === 'completed' || registrationStatus === 'failed') && (
                    <div className={styles.startChallengeCard}>
                      <h3>
                        {registrationStatus === 'completed' ? '恭喜通关！' : '挑战结束'}
                      </h3>
                      <p>{challengeData?.message}</p>
                      <div className={styles.reapplySection}>
                        <button 
                          className={styles.startButton}
                          onClick={handleApply}
                          disabled={registering}
                        >
                          {registering ? '申请中...' : '再次挑战'}
                        </button>
                        <span className={styles.feeNote}>报名费: {challengeData?.registrationFee || 1000} 星球币</span>
                      </div>
                    </div>
                  )}

                  {/* 无申请记录 - 显示报名按钮 */}
                  {!challengeData?.registration && (
                    <div className={styles.startChallengeCard}>
                      <h3>开始你的K线征途</h3>
                      <p>10关挑战，从启念到得道</p>
                      <div className={styles.rewards}>
                        <span className={styles.rewardIcon}>
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
                          </svg>
                        </span>
                        报名费：{challengeData?.registrationFee || 1000} 星球币 | 通关大奖：10万元 + 冠军奖杯
                      </div>
                      <div className={styles.rules}>
                        <div className={styles.ruleItem}>
                          <span className={styles.ruleLabel}>通关条件</span>
                          <span className={styles.ruleText}>每关账户净值达到 2000（盈利≥1000）</span>
                        </div>
                        <div className={styles.ruleItem}>
                          <span className={styles.ruleLabel}>失败条件</span>
                          <span className={styles.ruleText}>账户净值低于 100</span>
                        </div>
                      </div>
                      <button 
                        className={styles.startButton}
                        onClick={handleApply}
                        disabled={registering}
                      >
                        {registering ? '申请中...' : '立即报名'}
                      </button>
                    </div>
                  )}

                  {/* 消息提示 */}
                  {errorMessage && (
                    <div className={styles.errorMessage}>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                      </svg>
                      {errorMessage}
                    </div>
                  )}
                  {successMessage && (
                    <div className={styles.successMessage}>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                      {successMessage}
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.loginPrompt}>
                  <p>登录后即可参与挑战</p>
                  <button 
                    className={styles.loginButton}
                    onClick={() => router.push('/login')}
                  >
                    前往登录
                  </button>
                </div>
              )}
            </section>

            {/* 名人堂 */}
            {hallOfFame.length > 0 && (
              <section className={styles.hallOfFameSection}>
                <h2 className={styles.sectionTitle}>
                  <svg viewBox="0 0 24 24" fill="currentColor" className={styles.sectionIcon}>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  通关名人堂
                </h2>
                <div className={styles.hallOfFameList}>
                  {hallOfFame.map((entry) => (
                    <div key={entry.rank} className={styles.hallOfFameItem}>
                      <span className={styles.hallRank}>#{entry.rank}</span>
                      <span className={styles.hallName}>{entry.displayName}</span>
                      <span className={styles.hallDuration}>{entry.formattedDuration}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* 右侧：关卡列表 */}
          <div className={styles.rightPanel}>
            <h2 className={styles.sectionTitle}>
              <svg viewBox="0 0 24 24" fill="currentColor" className={styles.sectionIcon}>
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
              挑战关卡
            </h2>
            <div className={styles.levelsList}>
              {levels.map((level) => {
                const isCompleted = completedLevels.includes(level.level);
                const isCurrent = currentLevel === level.level && challengeData?.hasActiveChallenge;
                const isLocked = !completedLevels.includes(level.level - 1) && 
                                !(level.level === 1 || completedLevels.includes(level.level));
                
                return (
                  <div 
                    key={level.level}
                    className={`${styles.levelCard} ${isCompleted ? styles.completed : ''} ${isCurrent ? styles.current : ''} ${isLocked && !challengeData?.hasActiveChallenge ? styles.locked : ''}`}
                  >
                    <div className={styles.levelHeader}>
                      <span className={styles.levelNumber}>第{level.level}关</span>
                      <span className={styles.levelName}>{level.name}</span>
                      {isCompleted && (
                        <span className={styles.completedBadge}>
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                          </svg>
                        </span>
                      )}
                      {!isCompleted && !isLocked && (
                        <span className={styles.unlockedBadge}>
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"/>
                          </svg>
                        </span>
                      )}
                      {isLocked && !challengeData?.hasActiveChallenge && (
                        <span className={styles.lockedBadge}>
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
                          </svg>
                        </span>
                      )}
                    </div>
                    <p className={styles.levelDescription}>{level.description}</p>
                    <div className={styles.levelStats}>
                      <span>目标: ${level.targetBalance.toLocaleString()}</span>
                      <span>失败线: ${level.failBalance}</span>
                      {level.reward && <span className={styles.levelReward}>{level.reward}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
