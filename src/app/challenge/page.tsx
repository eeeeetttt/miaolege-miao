'use client';

import { useState, useEffect, useCallback } from 'react';
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

interface Announcement {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

export default function ChallengePage() {
  const { data: session, status } = useSession();
  const [challengeData, setChallengeData] = useState<ChallengeData | null>(null);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [equityData, setEquityData] = useState<{
    equity: number | null;
    balance: number | null;
    profit: number | null;
    serverName: string | null;
    accountNumber: string | null;
    equitySource: 'database' | 'no_data' | 'no_account';
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchEquityData = useCallback(async () => {
    try {
      const res = await fetch('/api/challenge/balance');
      const data = await res.json();
      if (res.ok) {
        setEquityData({
          equity: data.equity,
          balance: data.balance,
          profit: data.profit,
          serverName: data.serverName,
          accountNumber: data.accountNumber,
          equitySource: data.equitySource || 'no_data'
        });
      }
    } catch {
      // 忽略错误
    }
  }, []);

  const fetchAnnouncement = useCallback(async () => {
    try {
      const res = await fetch('/api/challenge/announcement');
      const data = await res.json();
      if (res.ok && data.announcement) {
        setAnnouncement(data.announcement);
      }
    } catch {
      // 忽略错误
    }
  }, []);

  const fetchChallengeData = useCallback(async () => {
    try {
      const res = await fetch('/api/challenge/register');
      const data = await res.json();
      if (res.ok) {
        setChallengeData(data);
        if (data.error) setErrorMessage(data.error);
        else setErrorMessage(null);
        
        if (data.registration?.status === 'active' || data.registration?.status === 'level_passed') {
          fetchEquityData();
        }
      } else {
        setErrorMessage(data.error || '获取挑战状态失败');
      }
    } catch {
      setErrorMessage('网络错误');
    } finally {
      setLoading(false);
    }
  }, [fetchEquityData]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchChallengeData();
      fetchAnnouncement();
    } else if (status === 'unauthenticated') {
      setLoading(false);
      fetchAnnouncement();
    }
  }, [status, fetchChallengeData, fetchAnnouncement]);

  const handleApply = async () => {
    if (!session) {
      setErrorMessage('请先登录');
      return;
    }
    setRegistering(true);
    try {
      const res = await fetch('/api/challenge/register', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(data.message || '报名成功！');
        await fetchChallengeData();
      } else {
        setErrorMessage(data.error || '报名失败');
      }
    } catch {
      setErrorMessage('网络错误');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.pageLoading}>
          <div className={styles.pageSpinner}></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  const registration = challengeData?.registration;
  const registrationStatus = registration?.status || 'none';
  const completedLevels = registration?.completedLevels || [];
  const currentLevel = registration?.currentLevel || 1;
  const levels = Array.from({ length: 10 }, (_, i) => ({ level: i + 1 }));
  const registrationFee = challengeData?.registrationFee || 1000;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.layoutContainer}>
        {/* 页面标题 */}
        <div className={styles.headerSection}>
          <h1 className={styles.pageTitle}>
            <svg className={styles.pageTitleIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
            K线征途挑战赛
          </h1>
          <p className={styles.pageDesc}>通过10关挑战，赢取丰厚星球币奖励</p>
        </div>

        <div className={styles.mainContent}>
          {/* 左侧 - 挑战状态 */}
          <div className={styles.leftSection}>
            {errorMessage && (
              <div className={styles.errorMessage}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className={styles.successMessage}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                {successMessage}
              </div>
            )}

            {/* 未登录 */}
            {!session && (
              <div className={styles.loginPrompt}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '2.5rem', height: '2.5rem', marginBottom: '1rem', color: '#8b5cf6'}}>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <p>登录后即可参加挑战赛</p>
              </div>
            )}

            {/* 待审核 */}
            {session && registrationStatus === 'pending' && (
              <div className={styles.statusCard}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '3rem', height: '3rem', marginBottom: '1rem', color: '#fbbf24'}}>
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <h3>申请已提交</h3>
                <p>管理员审核中，请耐心等待...</p>
              </div>
            )}

            {/* 已通过待激活 */}
            {session && registrationStatus === 'approved' && (
              <div className={styles.statusCard}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '3rem', height: '3rem', marginBottom: '1rem', color: '#22c55e'}}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <h3>审核已通过</h3>
                <p>等待管理员分配交易账户并激活挑战</p>
              </div>
            )}

            {/* 挑战中 */}
            {session && (registrationStatus === 'active' || registrationStatus === 'level_passed') && (
              <div className={styles.activeCard}>
                <div className={styles.activeHeader}>
                  <h3>挑战进行中</h3>
                  <span className={styles.levelBadge}>第{currentLevel}关</span>
                </div>
                
                <div className={styles.accountInfo}>
                  <span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '1.25rem', height: '1.25rem'}}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    {equityData?.serverName ? `${equityData.serverName} - ` : ''}
                    {equityData?.accountNumber || '待分配'}
                  </span>
                </div>
                
                <div className={styles.balanceDisplay}>
                  <span className={styles.balanceLabel}>当前净值</span>
                  <span className={styles.balanceValue}>
                    {equityData?.equity !== null && equityData?.equity !== undefined ? (
                      `$${equityData.equity.toFixed(2)}`
                    ) : (
                      equityData?.equitySource === 'no_account' ? '待分配' : '加载中...'
                    )}
                  </span>
                </div>
                
                <div className={styles.progressSection}>
                  <p>已完成 {completedLevels.length}/10 关</p>
                  <div className={styles.levelDots}>
                    {levels.map((level) => (
                      <span
                        key={level.level}
                        className={`${styles.levelDot} ${
                          completedLevels.includes(level.level) ? styles.completedDot : ''
                        } ${currentLevel === level.level ? styles.currentDot : ''}`}
                        title={`第${level.level}关`}
                      >
                        {level.level}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 挑战完成/失败 */}
            {session && (registrationStatus === 'completed' || registrationStatus === 'failed') && (
              <div className={styles.startChallengeCard}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '3rem', height: '3rem', marginBottom: '1rem', color: registrationStatus === 'completed' ? '#22c55e' : '#ef4444'}}>
                  {registrationStatus === 'completed' ? (
                    <>
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </>
                  ) : (
                    <>
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="15" y1="9" x2="9" y2="15"/>
                      <line x1="9" y1="9" x2="15" y2="15"/>
                    </>
                  )}
                </svg>
                <h3>{registrationStatus === 'completed' ? '恭喜通关！' : '挑战结束'}</h3>
                <p>{challengeData?.message}</p>
                <button 
                  className={styles.startButton}
                  onClick={handleApply}
                  disabled={registering}
                >
                  {registering ? '申请中...' : '再次挑战'}
                </button>
                <span className={styles.feeNote}>报名费: {registrationFee} 星球币</span>
              </div>
            )}

            {/* 未报名可报名 */}
            {session && !registration && (
              <div className={styles.startChallengeCard}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '3rem', height: '3rem', marginBottom: '1rem', color: '#8b5cf6'}}>
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                <h3>开始挑战</h3>
                <p>准备好接受10关考验了吗？</p>
                <button 
                  className={styles.startButton}
                  onClick={handleApply}
                  disabled={registering}
                >
                  {registering ? '申请中...' : '立即报名'}
                </button>
                <span className={styles.feeNote}>报名费: {registrationFee} 星球币</span>
              </div>
            )}
          </div>

          {/* 右侧 - 规则和公告 */}
          <div className={styles.rightSection}>
            {/* 挑战规则 */}
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '1.5rem', height: '1.5rem', color: '#8b5cf6'}}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                挑战规则
              </h2>
              <div className={styles.rulesList}>
                <div className={styles.ruleItem}>
                  <span className={styles.ruleNum}>1</span>
                  <span className={styles.ruleText}>报名后扣除 {registrationFee} 星球币</span>
                </div>
                <div className={styles.ruleItem}>
                  <span className={styles.ruleNum}>2</span>
                  <span className={styles.ruleText}>初始净值 $1000</span>
                </div>
                <div className={styles.ruleItem}>
                  <span className={styles.ruleNum}>3</span>
                  <span className={styles.ruleText}>通关目标净值 $2000</span>
                </div>
                <div className={styles.ruleItem}>
                  <span className={styles.ruleNum}>4</span>
                  <span className={styles.ruleText}>失败底线净值 $100</span>
                </div>
                <div className={styles.ruleItem}>
                  <span className={styles.ruleNum}>5</span>
                  <span className={styles.ruleText}>共10关，完成全部即通关</span>
                </div>
              </div>
            </div>

            {/* 公告栏 */}
            {announcement && (
              <div className={styles.announcementCard}>
                <div className={styles.announcementHeader}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '1.25rem', height: '1.25rem'}}>
                    <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/>
                  </svg>
                  <h3>{announcement.title || '活动公告'}</h3>
                </div>
                <div className={styles.announcementContent}>
                  <p>{announcement.content}</p>
                </div>
                {announcement.created_at && (
                  <div className={styles.announcementTime}>
                    {new Date(announcement.created_at).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
