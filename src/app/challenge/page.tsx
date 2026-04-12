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
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'warning' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

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
        if (data.registration?.status === 'active' || data.registration?.status === 'level_passed') {
          fetchEquityData();
        }
      } else {
        showToast(data.error || '获取挑战状态失败', 'warning');
      }
    } catch {
      showToast('网络错误', 'warning');
    } finally {
      setLoading(false);
    }
  }, [fetchEquityData, showToast]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchChallengeData();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status, fetchChallengeData]);

  const handleApply = async () => {
    if (!session) {
      showToast('请先登录', 'warning');
      return;
    }
    setRegistering(true);
    try {
      const res = await fetch('/api/challenge/register', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || '报名成功！', 'success');
        await fetchChallengeData();
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
  const isRejected = registrationStatus === 'rejected';
  const isPending = registrationStatus === 'pending';
  const isApproved = registrationStatus === 'approved';
  const completedCount = completedLevels.length;

  // 获取比赛说明内容
  const descriptionContent = challengeData?.config?.description || '「K线征途」伦敦金挑战赛专为黄金交易爱好者设计，横跨10个难度进阶关卡，涵盖K线形态、技术分析、实战心理。完成所有关卡将获得「黄金猎手」认证荣誉。';

  return (
    <div className={styles.pageContainer}>
      {/* Toast 提示 */}
      {toast && (
        <div className={`${styles.toast} ${styles[toast.type]}`}>
          {toast.message}
        </div>
      )}

      <div className={styles.container}>
        {/* 头部区域 */}
        <div className={styles.hero}>
          <h1>
            <i className="fas fa-chart-line"></i>
            K线征途 · 伦敦金挑战赛
          </h1>
          <div className={styles.heroSub}>10大核心关卡 · 从入门到交易大师</div>
        </div>

        {/* 比赛说明 & 报名区域 */}
        <div className={styles.infoSection}>
          {/* 比赛说明卡片 */}
          <div className={`${styles.card} ${styles.descriptionCard}`}>
            <h2>
              <i className="fas fa-trophy"></i>
              比赛说明
            </h2>
            <div className={styles.descriptionContent}>
              {descriptionContent.split('「黄金猎手」').map((part, idx, arr) => 
                idx === arr.length - 1 ? part : (
                  <span key={idx}>
                    {part}
                    <strong>「黄金猎手」</strong>
                  </span>
                )
              )}
            </div>
            <ul className={styles.ruleList}>
              <li><i className="fas fa-check-circle"></i> 点击【立即报名】解锁第1关，开启征途</li>
              <li><i className="fas fa-unlock-alt"></i> 每完成一关，自动解锁下一关卡</li>
              <li><i className="fas fa-gem"></i> 关卡挑战：净值达标自动通过</li>
              <li><i className="fas fa-chart-simple"></i> 全部通关将获得专属奖杯成就</li>
              <li><i className="fas fa-undo-alt"></i> 可随时重新报名，再次挑战</li>
            </ul>
          </div>

          {/* 报名/状态卡片 */}
          <div className={`${styles.card} ${styles.actionCard}`}>
            {/* 挑战进行中 */}
            {showChallengeActive && (
              <div className={styles.activeChallenge}>
                <div className={styles.activeHeader}>
                  <span className={styles.levelBadge}>第{currentLevel}关</span>
                  <span className={styles.challengeTitle}>挑战进行中</span>
                </div>
                
                <div className={styles.accountInfo}>
                  <i className="fas fa-server"></i>
                  {equityData?.serverName ? `${equityData.serverName} - ` : ''}
                  {equityData?.accountNumber || '待分配'}
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
                  已完成 {completedCount}/10 关
                </div>
              </div>
            )}

            {/* 待审核 */}
            {isPending && (
              <div className={styles.statusCard}>
                <i className="fas fa-clock" style={{fontSize: '2rem', color: '#D4AF37', marginBottom: '0.5rem'}}></i>
                <h3>申请已提交</h3>
                <p>管理员审核中，请耐心等待...</p>
              </div>
            )}

            {/* 已通过待激活 */}
            {isApproved && (
              <div className={styles.statusCard}>
                <i className="fas fa-check-circle" style={{fontSize: '2rem', color: '#4caf50', marginBottom: '0.5rem'}}></i>
                <h3>审核已通过</h3>
                <p>等待管理员分配交易账户并激活挑战</p>
              </div>
            )}

            {/* 挑战结束 */}
            {(isCompleted || isFailed) && (
              <div className={styles.statusCard}>
                <i className={`fas ${isCompleted ? 'fa-trophy' : 'fa-times-circle'}`} style={{fontSize: '2rem', color: isCompleted ? '#D4AF37' : '#ef4444', marginBottom: '0.5rem'}}></i>
                <h3>{isCompleted ? '恭喜通关！' : '挑战结束'}</h3>
                <p>{challengeData?.message}</p>
              </div>
            )}

            {/* 被拒绝 */}
            {isRejected && (
              <div className={styles.statusCard}>
                <i className="fas fa-ban" style={{fontSize: '2rem', color: '#ef4444', marginBottom: '0.5rem'}}></i>
                <h3>申请被拒绝</h3>
                <p>您的报名申请未通过审核，可重新报名</p>
              </div>
            )}

            {/* 未登录 */}
            {!session && (
              <div className={styles.statusCard}>
                <i className="fas fa-user" style={{fontSize: '2rem', color: '#8b5cf6', marginBottom: '0.5rem'}}></i>
                <h3>登录后参加</h3>
                <p>登录后即可参加挑战赛</p>
              </div>
            )}

            {/* 未报名或被拒绝可报名 */}
            {(session && !isRegistered) || isRejected ? (
              <div className={styles.registerSection}>
                <div className={styles.actionIcon}>
                  <i className="fas fa-fire"></i>
                </div>
                <div className={styles.actionText}>征途开启资格</div>
                <button 
                  className={styles.registerBtn}
                  onClick={handleApply}
                  disabled={registering}
                >
                  <i className="fas fa-pen-fancy"></i>
                  {registering ? '申请中...' : isRejected ? '重新报名' : '立即报名'}
                </button>
                <div className={styles.statsBadge}>报名费: {registrationFee} U</div>
              </div>
            ) : null}

            {/* 已报名状态 */}
            {isRegistered && !showChallengeActive && (isPending || isApproved) && (
              <div className={styles.registerSection}>
                <div className={styles.actionIcon}>
                  <i className="fas fa-check-double"></i>
                </div>
                <div className={styles.actionText}>已报名</div>
              </div>
            )}

            {/* 再次挑战按钮 */}
            {(isCompleted || isFailed) && session && (
              <>
                <button 
                  className={styles.registerBtn}
                  onClick={handleApply}
                  disabled={registering}
                >
                  <i className="fas fa-sync-alt"></i>
                  {registering ? '申请中...' : '再次挑战'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* 关卡展示区 */}
        <div className={styles.levelsSection}>
          <div className={styles.levelsHeader}>
            <h2>
              <i className="fas fa-flag-checkered"></i>
              挑战关卡
            </h2>
            <div className={styles.progressBadge}>
              {isRegistered ? (
                <>
                  <i className="fas fa-fire"></i>
                  已完成 {completedCount} 关
                </>
              ) : (
                <>
                  <i className="fas fa-star"></i>
                  报名后开启征途
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
              const levelName = levelConfig?.name || `第${levelNum}关`;
              const levelDesc = levelConfig?.description || '';
              
              return (
                <div 
                  key={levelNum} 
                  className={`${styles.levelCard} ${statusClass}`}
                >
                  <div className={styles.levelNumber}>{levelNum}</div>
                  <div className={styles.levelName}>{levelName}</div>
                  <div className={styles.levelDesc}>
                    {levelDesc.substring(0, 20)}{levelDesc.length > 20 ? '...' : ''}
                  </div>
                  <div className={styles.levelStatus}>
                    <i className={`fas ${statusIcon}`}></i>
                    <span>{statusText}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 脚注 */}
        <div className={styles.footerNote}>
          <i className="fas fa-chart-line"></i>
          伦敦金模拟挑战 | 每一关都贴近真实市场逻辑，完成挑战解锁下一知识领域
        </div>
      </div>

      {/* Font Awesome */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />
    </div>
  );
}
