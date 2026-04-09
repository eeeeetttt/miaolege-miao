'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
  balance: number | null;
  equity: number | null;
  profit: number | null;
  startedAt: string | null;
  equitySource?: 'database' | 'no_data' | 'no_account';
  message?: string;
}

interface HallOfFameEntry {
  rank: number;
  displayName: string;
  avatar: string | null;
  completedAt: string;
  formattedDuration: string;
}

interface Participant {
  userId: string;
  rank: number;
  status: string;
  startedAt: string | null;
  currentLevel: number;
  completedLevels: number[];
  equity: number | null;
  profit: number | null;
  lastUpdate: string | null;
}

interface EquityChartData {
  date: string;
  time: string;
  equity: number;
  profit: number;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  is_active: number;
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
  
  // 参赛者数据
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [equityHistory, setEquityHistory] = useState<EquityChartData[]>([]);
  const [equityHistoryLoading, setEquityHistoryLoading] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchChallengeData();
      fetchHallOfFame();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
    fetchAnnouncement();
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
      console.log('获取挑战数据:', res.status, data);
      
      if (res.ok) {
        setChallengeData(data);
        if (data.error) {
          setErrorMessage(data.error);
        } else {
          setErrorMessage(null);
        }
      } else {
        // 处理401等错误
        setErrorMessage(data.error || data.details || '获取挑战状态失败');
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

  // 获取公告
  const fetchAnnouncement = async () => {
    try {
      const res = await fetch('/api/challenge/announcement');
      const data = await res.json();
      if (res.ok && data.announcement) {
        setAnnouncement(data.announcement);
      }
    } catch (error) {
      console.error('获取公告失败:', error);
    }
  };

  // 获取所有参赛者数据
  const fetchParticipants = async () => {
    setParticipantsLoading(true);
    try {
      const res = await fetch('/api/challenge/participants');
      const data = await res.json();
      if (res.ok && data.participants) {
        setParticipants(data.participants);
      }
    } catch (error) {
      console.error('获取参赛者失败:', error);
    } finally {
      setParticipantsLoading(false);
    }
  };

  // 获取指定参赛者的净值历史
  const fetchEquityHistory = async (accountNumber: string) => {
    setEquityHistoryLoading(true);
    try {
      const res = await fetch(`/api/challenge/equity-history?account=${encodeURIComponent(accountNumber)}&limit=50`);
      const data = await res.json();
      if (res.ok && data.history) {
        setEquityHistory(data.history);
      }
    } catch (error) {
      console.error('获取净值历史失败:', error);
    } finally {
      setEquityHistoryLoading(false);
    }
  };

  // 查看参赛者详情
  const handleViewParticipant = (participant: Participant) => {
    setSelectedParticipant(participant);
    if (accountBalance?.account?.accountNumber) {
      fetchEquityHistory(accountBalance.account.accountNumber);
    }
  };

  // 初始化时获取参赛者数据
  useEffect(() => {
    fetchParticipants();
    const interval = setInterval(fetchParticipants, 60000); // 每分钟刷新
    return () => clearInterval(interval);
  }, []);

  const handleApply = async () => {
    setRegistering(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/challenge/register', { method: 'POST' });
      const data = await res.json();
      console.log('报名响应:', res.status, data);
      
      if (data.success) {
        setSuccessMessage(data.message || '申请已提交，请等待审核');
        fetchChallengeData();
      } else {
        // 优先显示具体错误原因
        const errorMsg = data.details || data.error || '申请失败，请稍后重试';
        console.log('报名失败原因:', errorMsg);
        setErrorMessage(errorMsg);
        
        // 如果是未登录，提示用户去登录
        if (data.errorCode === 'NOT_LOGGED_IN') {
          // 可以添加一个跳转到登录页的提示
          setErrorMessage('请先登录后再报名');
        }
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
            {/* 公告栏 */}
            {announcement && announcement.content && (
              <div className={styles.announcementBanner}>
                <svg viewBox="0 0 24 24" fill="currentColor" className={styles.announcementIcon}>
                  <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-6 5c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm6 12H6v-1c0-2 4-3.1 6-3.1s6 1.1 6 3.1v1z"/>
                </svg>
                <div className={styles.announcementContent}>
                  <p className={styles.announcementTitle}>{announcement.title || '公告'}</p>
                  <p className={styles.announcementText}>{announcement.content}</p>
                </div>
              </div>
            )}
            
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
                          {accountBalance.account.serverName ? `${accountBalance.account.serverName} - ` : ''}{accountBalance.account.accountNumber || '待分配'}
                        </div>
                        {accountBalance.equitySource === 'no_data' && (
                          <span className={styles.simulatedBadge}>数据同步中</span>
                        )}
                        {accountBalance.equitySource === 'no_account' && (
                          <span className={styles.simulatedBadge}>等待分配账户</span>
                        )}
                      </div>

                      {/* 净值显示 */}
                      <div className={styles.balanceDisplay}>
                        <div className={styles.balanceMain}>
                          <span className={styles.balanceLabel}>当前净值</span>
                          {accountBalance.equity !== null ? (
                            <>
                              {(() => {
                                const failBalance = parseInt(challengeData?.config?.fail_balance || '100');
                                const targetBalance = parseInt(challengeData?.config?.target_balance || '2000');
                                const isFailed = accountBalance.equity < failBalance;
                                const isPassed = accountBalance.equity >= targetBalance;
                                return (
                                  <>
                                    <span className={`${styles.balanceValue} ${isFailed ? styles.loss : isPassed ? styles.profit : ''}`}>
                                      ${accountBalance.equity.toFixed(2)}
                                      {isFailed && <span className={styles.failedBadge}> 失败</span>}
                                    </span>
                                    {isFailed && (
                                      <div className={styles.failActions}>
                                        <p className={styles.failMessage}>净值低于{challengeData?.config?.fail_balance || 100}，挑战失败</p>
                                        <button
                                          className={styles.reapplyButton}
                                          onClick={handleApply}
                                          disabled={registering}
                                        >
                                          {registering ? '申请中...' : '重新挑战'}
                                        </button>
                                      </div>
                                    )}
                                    {!isFailed && (
                                      <div className={styles.balanceSub}>
                                        <span>余额: ${(accountBalance.balance || 0).toFixed(2)}</span>
                                        <span className={(accountBalance.profit || 0) >= 0 ? styles.profitText : styles.lossText}>
                                          {(accountBalance.profit || 0) >= 0 ? '+' : ''}{(accountBalance.profit || 0).toFixed(2)}
                                        </span>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </>
                          ) : (
                            <span className={styles.balanceValue}>
                              {accountBalance.equitySource === 'no_account' ? '待分配' : '加载中...'}
                            </span>
                          )}
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
                        报名费：{challengeData?.registrationFee || 1000} 星球币 | 通关大奖：{parseInt(challengeData?.config?.completion_reward || '100000').toLocaleString()}星球币 + 冠军奖杯
                      </div>
                      <div className={styles.rules}>
                        <div className={styles.ruleItem}>
                          <span className={styles.ruleLabel}>通关条件</span>
                          <span className={styles.ruleText}>每关账户净值达到 {challengeData?.config?.target_balance || 2000}（盈利≥{challengeData?.config?.profit_target || 1000}）</span>
                        </div>
                        <div className={styles.ruleItem}>
                          <span className={styles.ruleLabel}>失败条件</span>
                          <span className={styles.ruleText}>账户净值低于 {challengeData?.config?.fail_balance || 100}</span>
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

            {/* 参赛者排行榜 */}
            {challengeData?.config?.show_leaderboard !== 'false' && (
              <section className={styles.hallOfFameSection}>
                <h2 className={styles.sectionTitle}>
                  <svg viewBox="0 0 24 24" fill="currentColor" className={styles.sectionIcon}>
                    <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
                  </svg>
                  挑战进度榜
                  <span className={styles.participantCount}>{participants.length}人参与</span>
                </h2>
                
                {participantsLoading && participants.length === 0 ? (
                  <div className={styles.loadingText}>加载中...</div>
                ) : participants.length === 0 ? (
                  <div className={styles.loadingText}>暂无参赛者</div>
                ) : (
                  <div>
                    <div className={styles.participantsList}>
                      {participants.slice(0, 10).map((p) => (
                        <div 
                          key={p.userId} 
                          className={`${styles.participantItem} ${selectedParticipant?.userId === p.userId ? styles.selected : ''}`}
                          onClick={() => handleViewParticipant(p)}
                        >
                          <span className={`${styles.participantRank} ${p.rank <= 3 ? styles.topRank : ''}`}>
                            #{p.rank}
                          </span>
                          <div className={styles.participantInfo}>
                            <span className={styles.participantLevel}>第{p.currentLevel}关</span>
                            <div className={styles.levelProgress}>
                              {Array.from({ length: 10 }, (_, i) => (
                                <span 
                                  key={i} 
                                  className={`${styles.progressDot} ${p.completedLevels.includes(i + 1) ? styles.completedDot : ''} ${p.currentLevel === i + 1 ? styles.currentDot : ''}`}
                                />
                              ))}
                            </div>
                          </div>
                          <div className={styles.participantEquity}>
                            {p.equity !== null ? (
                              <>
                                <span className={`${styles.equityValue} ${(p.profit || 0) >= 0 ? styles.profit : styles.loss}`}>
                                  ${p.equity.toFixed(2)}
                                </span>
                                <span className={`${styles.profitValue} ${(p.profit || 0) >= 0 ? styles.profitText : styles.lossText}`}>
                                  {(p.profit || 0) >= 0 ? '+' : ''}{(p.profit || 0).toFixed(2)}
                                </span>
                              </>
                            ) : (
                              <span className={styles.equityValue}>--</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* 选中参赛者的净值曲线 */}
                    {selectedParticipant && equityHistory.length > 0 && (
                      <div className={styles.equityChartCard}>
                        <h3 className={styles.chartTitle}>
                          #{selectedParticipant.rank} 第{selectedParticipant.currentLevel}关 净值曲线
                        </h3>
                        {equityHistoryLoading ? (
                          <div className={styles.loadingText}>加载中...</div>
                        ) : (
                          <div className={styles.chartContainer}>
                            <ResponsiveContainer width="100%" height={200}>
                              <AreaChart data={equityHistory}>
                                <defs>
                                  <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                <XAxis 
                                  dataKey="date" 
                                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                                  tickLine={false}
                                  axisLine={false}
                                  interval="preserveStartEnd"
                                />
                                <YAxis 
                                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                                  tickLine={false}
                                  axisLine={false}
                                  tickFormatter={(value) => `$${value}`}
                                  domain={['auto', 'auto']}
                                />
                                <Tooltip 
                                  contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                  }}
                                  formatter={(value: number) => [`$${value.toFixed(2)}`, '净值']}
                                  labelFormatter={(label) => `日期: ${label}`}
                                />
                                <ReferenceLine y={1000} stroke="#9ca3af" strokeDasharray="3 3" label="起始净值" />
                                <Area
                                  type="monotone"
                                  dataKey="equity"
                                  stroke="#8b5cf6"
                                  strokeWidth={2}
                                  fillOpacity={1}
                                  fill="url(#colorEquity)"
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                        <button 
                          className={styles.closeChartBtn}
                          onClick={() => setSelectedParticipant(null)}
                        >
                          关闭
                        </button>
                      </div>
                    )}
                  </div>
                )}
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
                      {level.reward && <span className={styles.levelReward}>奖励: {level.reward}星球币</span>}
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
