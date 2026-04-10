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
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>加载中...</p>
      </div>
    );
  }

  const registration = challengeData?.registration;
  const registrationStatus = registration?.status || 'none';
  const completedLevels = registration?.completedLevels || [];
  const currentLevel = registration?.currentLevel || 1;
  const levels = Array.from({ length: 10 }, (_, i) => ({ level: i + 1 }));
  const registrationFee = challengeData?.registrationFee || 1000;

  // 判断状态
  const showChallengeActive = session && (registrationStatus === 'active' || registrationStatus === 'level_passed');
  const isRegistered = session && registration !== null;
  const isCompleted = registrationStatus === 'completed';
  const isFailed = registrationStatus === 'failed';
  const isPending = registrationStatus === 'pending';
  const isApproved = registrationStatus === 'approved';

  // 获取比赛说明内容
  const descriptionContent = challengeData?.config?.description || '「K线征途」伦敦金挑战赛专为黄金交易爱好者设计，横跨10个难度进阶关卡，涵盖K线形态、技术分析、实战心理。完成所有关卡将获得「黄金猎手」认证荣誉。';

  return (
    <div className={styles.pageContainer}>
      {/* 头部区域 */}
      <div className={styles.hero}>
        <h1>
          <i className="fas fa-chart-line"></i>
          K线征途 · 伦敦金挑战赛
        </h1>
      </div>

      {/* 两列布局 */}
      <div className={styles.twoColumns}>
        {/* 左侧列 */}
        <div className={styles.leftColumn}>
          {/* 比赛说明 */}
          <div className={styles.card}>
            <div className={styles.descCard}>
              <h2>
                <i className="fas fa-trophy"></i>
                比赛说明
              </h2>
              <div className={styles.descContent}>
                <p>{descriptionContent}</p>
              </div>
              <ul className={styles.ruleList}>
                <li><i className="fas fa-check-circle"></i> 点击【立即报名】解锁第1关，开启征途</li>
                <li><i className="fas fa-unlock-alt"></i> 每完成一关，自动解锁下一关卡</li>
                <li><i className="fas fa-gem"></i> 关卡挑战：净值达标自动通过</li>
                <li><i className="fas fa-chart-simple"></i> 全部通关将获得专属奖杯成就</li>
                <li><i className="fas fa-undo-alt"></i> 可随时重新报名，再次挑战</li>
              </ul>
            </div>
          </div>

          {/* 报名/状态区域 */}
          <div className={styles.card}>
            <div className={styles.actionCard}>
              {/* 挑战进行中 */}
              {showChallengeActive && (
                <div className={styles.activeChallenge}>
                  <div className={styles.activeHeader}>
                    <span className={styles.levelBadge}>第{currentLevel}关</span>
                    <span className={styles.challengeTitle}>挑战进行中</span>
                  </div>
                  
                  <div className={styles.accountInfo}>
                    <span>
                      <i className="fas fa-server"></i>
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

                  <div className={styles.progressInfo}>
                    <span>已完成 {completedLevels.length}/10 关</span>
                  </div>
                </div>
              )}

              {/* 待审核 */}
              {isPending && (
                <div className={styles.statusCard}>
                  <i className="fas fa-clock" style={{fontSize: '2.5rem', color: '#D4AF37', marginBottom: '1rem'}}></i>
                  <h3>申请已提交</h3>
                  <p>管理员审核中，请耐心等待...</p>
                </div>
              )}

              {/* 已通过待激活 */}
              {isApproved && (
                <div className={styles.statusCard}>
                  <i className="fas fa-check-circle" style={{fontSize: '2.5rem', color: '#4caf50', marginBottom: '1rem'}}></i>
                  <h3>审核已通过</h3>
                  <p>等待管理员分配交易账户并激活挑战</p>
                </div>
              )}

              {/* 挑战结束 */}
              {(isCompleted || isFailed) && (
                <div className={styles.statusCard}>
                  <i className={`fas ${isCompleted ? 'fa-trophy' : 'fa-times-circle'}`} style={{fontSize: '2.5rem', color: isCompleted ? '#D4AF37' : '#ef4444', marginBottom: '1rem'}}></i>
                  <h3>{isCompleted ? '恭喜通关！' : '挑战结束'}</h3>
                  <p>{challengeData?.message}</p>
                </div>
              )}

              {/* 未登录 */}
              {!session && (
                <div className={styles.statusCard}>
                  <i className="fas fa-user" style={{fontSize: '2.5rem', color: '#8b5cf6', marginBottom: '1rem'}}></i>
                  <h3>登录后参加</h3>
                  <p>登录后即可参加挑战赛</p>
                </div>
              )}

              {/* 未报名可报名 */}
              {session && !isRegistered && (
                <div className={styles.registerSection}>
                  <div className={styles.registerIcon}>
                    <i className="fas fa-fire"></i>
                  </div>
                  <div className={styles.registerText}>征途开启资格</div>
                  <button 
                    className={styles.registerBtn}
                    onClick={handleApply}
                    disabled={registering}
                  >
                    <i className="fas fa-pen-fancy"></i>
                    {registering ? '申请中...' : '立即报名'}
                  </button>
                  <div className={styles.registerFee}>报名费: {registrationFee} 星球币</div>
                </div>
              )}

              {/* 再次挑战按钮 */}
              {(isCompleted || isFailed) && session && (
                <button 
                  className={styles.registerBtn}
                  onClick={handleApply}
                  disabled={registering}
                >
                  <i className="fas fa-sync-alt"></i>
                  {registering ? '申请中...' : '再次挑战'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 右侧列 - 关卡 */}
        <div className={styles.rightColumn}>
          <div className={styles.card}>
            <div className={styles.levelsCard}>
              <div className={styles.levelsHeader}>
                <h2>
                  <i className="fas fa-flag-checkered"></i>
                  挑战关卡
                </h2>
                <div className={styles.progressBadge}>
                  {isRegistered ? (
                    <>
                      <i className="fas fa-fire"></i>
                      已完成 {completedLevels.length} 关
                    </>
                  ) : (
                    <>
                      <i className="fas fa-star"></i>
                      报名后开启
                    </>
                  )}
                </div>
              </div>
              <div className={styles.levelsGrid}>
                {levels.map((item, idx) => {
                  const levelNum = idx + 1;
                  const isCompletedLevel = completedLevels.includes(levelNum);
                  const isCurrentLevel = showChallengeActive && levelNum === currentLevel;
                  const isUnlocked = isRegistered && (isCompletedLevel || isCurrentLevel || levelNum < currentLevel);
                  
                  let statusClass = styles.lockedLevel;
                  let statusIcon = 'fa-lock';
                  let statusText = '未解锁';
                  
                  if (isCompletedLevel) {
                    statusClass = styles.completedLevel;
                    statusIcon = 'fa-check-circle';
                    statusText = '已通关';
                  } else if (isCurrentLevel) {
                    statusClass = styles.currentLevel;
                    statusIcon = 'fa-unlock-alt';
                    statusText = '进行中';
                  } else if (isUnlocked) {
                    statusClass = styles.unlockedLevel;
                    statusIcon = 'fa-unlock-alt';
                    statusText = '可挑战';
                  }
                  
                  const levelConfig = challengeData?.levelConfigs?.find(l => l.level === levelNum);
                  
                  return (
                    <div 
                      key={levelNum} 
                      className={`${styles.levelCard} ${statusClass}`}
                    >
                      <div className={styles.levelNumber}>{levelNum}</div>
                      <div className={styles.levelName}>{levelConfig?.name || `第${levelNum}关`}</div>
                      <div className={styles.levelStatus}>
                        <i className={`fas ${statusIcon}`}></i>
                        <span>{statusText}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Font Awesome */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />
    </div>
  );
}
