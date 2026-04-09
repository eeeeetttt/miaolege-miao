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

export default function ChallengePage() {
  const { data: session, status } = useSession();
  const [challengeData, setChallengeData] = useState<ChallengeData | null>(null);
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

  const fetchChallengeData = useCallback(async () => {
    try {
      const res = await fetch('/api/challenge/register');
      const data = await res.json();
      if (res.ok) {
        setChallengeData(data);
        if (data.error) setErrorMessage(data.error);
        else setErrorMessage(null);
        
        // 如果有进行中的挑战，获取equity数据
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
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status, fetchChallengeData]);

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
        {/* 左侧 */}
        <div className={styles.leftPanel}>
          <h1 className={styles.pageTitle}>K线征途挑战赛</h1>
          <p className={styles.pageDesc}>通过10关挑战，赢取丰厚奖励！</p>

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

          {/* 未登录 */}
          {!session && (
            <div className={styles.loginPrompt}>
              <p>登录后即可参加挑战赛</p>
            </div>
          )}

          {/* 待审核 */}
          {session && registrationStatus === 'pending' && (
            <div className={styles.statusCard}>
              <h3>申请已提交</h3>
              <p>管理员审核中，请耐心等待...</p>
            </div>
          )}

          {/* 已通过待激活 */}
          {session && registrationStatus === 'approved' && (
            <div className={styles.statusCard}>
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
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 挑战完成/失败 */}
          {session && (registrationStatus === 'completed' || registrationStatus === 'failed') && (
            <div className={styles.startChallengeCard}>
              <h3>{registrationStatus === 'completed' ? '恭喜通关！' : '挑战结束'}</h3>
              <p>{challengeData?.message}</p>
              <div className={styles.reapplySection}>
                <button 
                  className={styles.startButton}
                  onClick={handleApply}
                  disabled={registering}
                >
                  {registering ? '申请中...' : '再次挑战'}
                </button>
                <span className={styles.feeNote}>报名费: {registrationFee} 星球币</span>
              </div>
            </div>
          )}

          {/* 未报名可报名 */}
          {session && !registration && (
            <div className={styles.startChallengeCard}>
              <h3>开始挑战</h3>
              <p>报名费: {registrationFee} 星球币</p>
              <button 
                className={styles.startButton}
                onClick={handleApply}
                disabled={registering}
              >
                {registering ? '申请中...' : '立即报名'}
              </button>
            </div>
          )}
        </div>

        {/* 右侧 */}
        <div className={styles.rightPanel}>
          <h2 className={styles.sectionTitle}>挑战规则</h2>
          <div className={styles.rulesList}>
            <div className={styles.ruleItem}>
              <span className={styles.ruleNum}>1</span>
              <span>报名后扣除 {registrationFee} 星球币</span>
            </div>
            <div className={styles.ruleItem}>
              <span className={styles.ruleNum}>2</span>
              <span>初始净值 $1000</span>
            </div>
            <div className={styles.ruleItem}>
              <span className={styles.ruleNum}>3</span>
              <span>通关目标净值 $2000</span>
            </div>
            <div className={styles.ruleItem}>
              <span className={styles.ruleNum}>4</span>
              <span>失败底线净值 $100</span>
            </div>
            <div className={styles.ruleItem}>
              <span className={styles.ruleNum}>5</span>
              <span>共10关，完成全部关卡即通关</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
