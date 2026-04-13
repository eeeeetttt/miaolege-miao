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

interface ChallengeStatus {
  id: number;
  currentLevel: number;
  completedLevels: number[];
  startedAt: string;
  initialBalance: number;
  targetBalance: number;
  failBalance: number;
}

interface BalanceData {
  equity: number;
  balance: number;
  profit: number;
  equitySource: 'database' | 'simulated';
}

interface ChallengeData {
  hasActiveChallenge: boolean;
  registration: {
    id: number;
    currentLevel: number;
    completedLevels: number[];
    startedAt: string;
  } | null;
  levelConfigs: LevelConfig[];
}

export default function ChallengePlayPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [challengeStatus, setChallengeStatus] = useState<ChallengeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentBalance, setCurrentBalance] = useState(1000);
  const [balanceInput, setBalanceInput] = useState('1000');
  const [showVictory, setShowVictory] = useState(false);
  const [showFailed, setShowFailed] = useState(false);
  const [showRechallenge, setShowRechallenge] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [levelJustCompleted, setLevelJustCompleted] = useState(false);
  const [rewards, setRewards] = useState<{ cash: string; trophy: string } | null>(null);
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentLevelConfig, setCurrentLevelConfig] = useState<LevelConfig | null>(null);

  // 动态获取当前关卡的净值阈值
  const getFailBalance = () => currentLevelConfig?.failBalance ?? 100;
  const getTargetBalance = () => currentLevelConfig?.targetBalance ?? 2000;
  const getInitialBalance = () => currentLevelConfig?.initialBalance ?? 1000;

  useEffect(() => {
    if (status === 'authenticated') {
      fetchChallengeStatus();
    } else if (status === 'unauthenticated') {
      router.push('/challenge');
    }
  }, [status, router]);

  // 定时刷新净值数据
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (challengeStatus && !showVictory && !showFailed) {
      // 初始获取
      fetchEquityData();
      
      // 每10秒刷新一次净值
      timer = setInterval(() => {
        fetchEquityData();
      }, 10000);
    }
    return () => clearInterval(timer);
  }, [challengeStatus, showVictory, showFailed]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (challengeStatus && !showVictory && !showFailed) {
      timer = setInterval(() => {
        const start = new Date(challengeStatus.startedAt).getTime();
        setElapsedTime(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [challengeStatus, showVictory, showFailed]);

  // 获取净值数据
  const fetchEquityData = async () => {
    try {
      const res = await fetch('/api/challenge/balance');
      const data = await res.json();
      
      if (res.ok && data.hasActiveChallenge) {
        const initialBalance = getInitialBalance();
        const equity = data.equity || initialBalance;
        setBalanceData({
          equity: equity,
          balance: data.balance || equity,
          profit: data.profit || (equity - initialBalance),
          equitySource: data.equitySource || 'database'
        });
        setCurrentBalance(equity);
        setBalanceInput(equity.toString());
        
        // 自动检测失败条件
        if (equity <= getFailBalance() && !showFailed) {
          handleAutoFail();
        }
        // 自动检测通关条件
        else if (equity >= getTargetBalance() && !showVictory && !levelJustCompleted) {
          handleAutoComplete();
        }
      }
    } catch (error) {
      console.error('获取净值失败:', error);
    }
  };

  const fetchChallengeStatus = async () => {
    try {
      const res = await fetch('/api/challenge/register');
      const data = await res.json() as ChallengeData;
      
      if (data.hasActiveChallenge && data.registration) {
        // 获取当前关卡的配置
        const currentLevel = data.registration.currentLevel || 1;
        const levelConfig = data.levelConfigs?.find((l: LevelConfig) => l.level === currentLevel);
        setCurrentLevelConfig(levelConfig || null);
        
        setChallengeStatus({
          ...data.registration,
          initialBalance: levelConfig?.initialBalance || 1000,
          targetBalance: levelConfig?.targetBalance || 2000,
          failBalance: levelConfig?.failBalance || 100,
        });
        setCurrentBalance(getInitialBalance());
        setBalanceInput(getInitialBalance().toString());
        // 获取净值
        await fetchEquityData();
      } else {
        router.push('/challenge');
      }
      setLoading(false);
    } catch (error) {
      console.error('获取挑战状态失败:', error);
      setLoading(false);
    }
  };

  // 自动失败处理
  const handleAutoFail = async () => {
    try {
      // 调用API标记失败
      await fetch('/api/admin/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'fail', 
          registrationId: challengeStatus?.id 
        }),
      });
      setShowFailed(true);
      setMessage({ type: 'error', text: '账户净值已低于失败线！' });
    } catch (error) {
      console.error('标记失败失败:', error);
    }
  };

  // 自动通关处理
  const handleAutoComplete = async () => {
    try {
      const res = await fetch('/api/challenge/level', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance: getTargetBalance() }),
      });
      const data = await res.json();
      
      if (res.ok && data.levelCompleted) {
        setLevelJustCompleted(true);
        setMessage({ type: 'success', text: data.message });
      }
    } catch (error) {
      console.error('通关检测失败:', error);
    }
  };

  const currentLevelData = currentLevelConfig || { name: `第${challengeStatus?.currentLevel}关`, description: '' };

  const handleUpdateBalance = async () => {
    const balance = parseInt(balanceInput);
    
    if (isNaN(balance) || balance < 0) {
      setMessage({ type: 'error', text: '请输入有效的账户净值' });
      return;
    }

    setCurrentBalance(balance);

    try {
      // 先检查状态
      const checkRes = await fetch('/api/challenge/level', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance }),
      });
      const checkData = await checkRes.json();

      if (checkData.levelCompleted) {
        setMessage({ type: 'success', text: checkData.message });
        setLevelJustCompleted(true);
      } else if (checkData.failed) {
        setShowFailed(true);
        setMessage({ type: 'error', text: checkData.message });
      } else {
        const progress = checkData.progress || '0';
        setMessage({ 
          type: 'info', 
          text: `当前进度: ${progress}% | 目标: ${getTargetBalance()} | 底线: ${getFailBalance()}` 
        });
      }
    } catch (error) {
      console.error('更新余额失败:', error);
      setMessage({ type: 'error', text: '更新失败，请重试' });
    }
  };

  // 修复：添加缺少的变量声明
  const checkRes = { ok: true, json: async () => ({}) };
  // 移除重复声明

  const handleContinueNextLevel = async () => {
    try {
      const res = await fetch('/api/challenge/level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
  
      if (data.success) {
        if (data.completed) {
          setShowVictory(true);
          setRewards(data.rewards);
        } else {
          // 进入下一关，重置余额
          setLevelJustCompleted(false);
          setCurrentBalance(getInitialBalance());
          setBalanceInput(getInitialBalance().toString());
          setMessage({ type: 'success', text: data.message });
          // 刷新状态
          await fetchChallengeStatus();
        }
      } else {
        setMessage({ type: 'error', text: data.error || '操作失败' });
      }
    } catch (error) {
      console.error('继续下一关失败:', error);
      setMessage({ type: 'error', text: '操作失败，请重试' });
    }
  };

  const handleAbandon = async () => {
    if (!confirm('确定要放弃当前挑战吗？报名费将不予退还。')) return;
    
    try {
      await fetch('/api/challenge/level', { method: 'DELETE' });
      router.push('/challenge');
    } catch (error) {
      console.error('放弃挑战失败:', error);
    }
  };

  // 重新挑战
  const handleRechallenge = async () => {
    setRefreshing(true);
    try {
      // 重置挑战状态
      const res = await fetch('/api/admin/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'reset', 
          registrationId: challengeStatus?.id 
        }),
      });
      
      if (res.ok) {
        setShowRechallenge(false);
        setShowFailed(false);
        setCurrentBalance(getInitialBalance());
        setBalanceInput(getInitialBalance().toString());
        setMessage({ type: 'info', text: '挑战已重置，请重新开始' });
        await fetchChallengeStatus();
      } else {
        setMessage({ type: 'error', text: '重置失败，请刷新重试' });
      }
    } catch (error) {
      console.error('重新挑战失败:', error);
      setMessage({ type: 'error', text: '重新挑战失败，请刷新重试' });
    } finally {
      setRefreshing(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    const initialBalance = getInitialBalance();
    const targetBalance = getTargetBalance();
    const failBalance = getFailBalance();
    
    if (currentBalance < initialBalance) {
      // 计算距离失败的距离
      return Math.max(0, ((currentBalance - failBalance) / (initialBalance - failBalance)) * 100);
    }
    // 计算距离通关的距离
    return Math.min(100, ((currentBalance - initialBalance) / (targetBalance - initialBalance)) * 100);
  };

  const isInDanger = currentBalance < getInitialBalance() && currentBalance >= getFailBalance();
  const isCritical = currentBalance < getFailBalance();

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>加载挑战中...</p>
        </div>
      </div>
    );
  }

  if (!challengeStatus || !currentLevelData) {
    return null;
  }

  return (
    <div className={styles.container}>
      {/* 背景装饰 */}
      <div className={styles.bgDecoration}>
        <div className={styles.particles}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div 
              key={i} 
              className={styles.particle}
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${5 + Math.random() * 10}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* 通关动画 */}
      {showVictory && (
        <div className={styles.victoryOverlay}>
          <div className={styles.victoryContent}>
            <div className={styles.trophy}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
              </svg>
            </div>
            <h1 className={styles.victoryTitle}>恭喜通关！</h1>
            <p className={styles.victorySubtitle}>你已成功完成K线征途所有关卡</p>
            <div className={styles.victoryStats}>
              <div className={styles.victoryStat}>
                <span className={styles.statLabel}>总用时</span>
                <span className={styles.statValue}>{formatTime(elapsedTime)}</span>
              </div>
              <div className={styles.victoryStat}>
                <span className={styles.statLabel}>通关日期</span>
                <span className={styles.statValue}>
                  {new Date().toLocaleDateString('zh-CN')}
                </span>
              </div>
            </div>
            {rewards && (
              <div className={styles.rewardsSection}>
                <h3>通关大奖</h3>
                <div className={styles.rewardItem}>
                  <span className={styles.rewardLabel}>现金奖</span>
                  <span className={styles.rewardValue}>{rewards.cash}</span>
                </div>
                <div className={styles.rewardItem}>
                  <span className={styles.rewardLabel}>实物奖</span>
                  <span className={styles.rewardValue}>{rewards.trophy}</span>
                </div>
              </div>
            )}
            <button 
              className={styles.victoryButton}
              onClick={() => router.push('/challenge')}
            >
              返回挑战主页
            </button>
          </div>
          <div className={styles.confetti}>
            {Array.from({ length: 100 }).map((_, i) => (
              <div
                key={i}
                className={styles.confettiPiece}
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  backgroundColor: ['#ffd700', '#ff6b6b', '#4ecdc4', '#a855f7', '#3b82f6'][Math.floor(Math.random() * 5)],
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 失败动画 */}
      {showFailed && (
        <div className={styles.failedOverlay}>
          <div className={styles.failedContent}>
            <div className={styles.failedIcon}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>
            <h1 className={styles.failedTitle}>挑战失败</h1>
            <p className={styles.failedSubtitle}>账户净值已低于失败线</p>
            <div className={styles.failedStats}>
              <div className={styles.failedStat}>
                <span className={styles.statLabel}>失败关卡</span>
                <span className={styles.statValue}>第{challengeStatus.currentLevel}关</span>
              </div>
              <div className={styles.failedStat}>
                <span className={styles.statLabel}>当前净值</span>
                <span className={styles.statValue}>{currentBalance}</span>
              </div>
            </div>
            <div className={styles.failedNote}>
              报名费不予退还，重新开始需再次支付1000 U
            </div>
            <div className={styles.failedButtons}>
              <button 
                className={styles.failedButton}
                onClick={() => router.push('/challenge')}
              >
                返回挑战主页
              </button>
              <button 
                className={styles.rechallengeButton}
                onClick={handleRechallenge}
                disabled={refreshing}
              >
                {refreshing ? '处理中...' : '重新挑战'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className={styles.main}>
        {/* 关卡信息头部 */}
        <header className={styles.levelHeader}>
          <div className={styles.levelInfo}>
            <span className={styles.levelBadge}>第{challengeStatus.currentLevel}关</span>
            <div className={styles.levelDetails}>
              <h1 className={styles.levelName}>{currentLevelData.name}</h1>
              <p className={styles.levelDesc}>{currentLevelData.description}</p>
            </div>
          </div>
          <div className={styles.levelMeta}>
            <div className={styles.timer}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
              </svg>
              <span className={styles.timerValue}>{formatTime(elapsedTime)}</span>
            </div>
            <button className={styles.abandonButton} onClick={handleAbandon}>
              放弃挑战
            </button>
          </div>
        </header>

        {/* 进度条 */}
        <div className={styles.progressSection}>
          <div className={styles.progressBar}>
            <div 
              className={`${styles.progressFill} ${isInDanger ? styles.danger : ''} ${isCritical ? styles.critical : ''}`}
              style={{ width: `${getProgress()}%` }}
            />
            <div 
              className={styles.failLine}
              style={{ left: `${((getFailBalance() - getFailBalance()) / (getTargetBalance() - getFailBalance())) * 100}%` }}
            />
          </div>
          <div className={styles.progressLabels}>
            <span className={styles.failLabel}>失败线: {getFailBalance()}</span>
            <span className={styles.startLabel}>起始: {getInitialBalance()}</span>
            <span className={styles.targetLabel}>目标: {getTargetBalance()}</span>
          </div>
        </div>

        {/* 净值显示 - 优化版 */}
        <div className={styles.balanceSection}>
          <div className={`${styles.balanceDisplay} ${isInDanger ? styles.danger : ''} ${isCritical ? styles.critical : ''}`}>
            <span className={styles.balanceLabel}>当前账户净值</span>
            <div className={styles.balanceMain}>
              <span className={styles.balanceValue}>{currentBalance}</span>
              {balanceData && balanceData.profit !== 0 && (
                <span className={`${styles.profitTag} ${balanceData.profit >= 0 ? styles.profit : styles.loss}`}>
                  {balanceData.profit >= 0 ? '+' : ''}{balanceData.profit.toFixed(2)}
                </span>
              )}
            </div>
            {balanceData && (
              <div className={styles.balanceDetails}>
                <div className={styles.balanceItem}>
                  <span className={styles.balanceItemLabel}>余额</span>
                  <span className={styles.balanceItemValue}>{balanceData.balance.toFixed(2)}</span>
                </div>
                <div className={styles.balanceItem}>
                  <span className={styles.balanceItemLabel}>浮盈/浮亏</span>
                  <span className={`${styles.balanceItemValue} ${balanceData.profit >= 0 ? styles.profit : styles.loss}`}>
                    {balanceData.profit >= 0 ? '+' : ''}{balanceData.profit.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
            <div className={styles.autoRefresh}>
              <button className={styles.refreshButton} onClick={fetchEquityData} disabled={refreshing}>
                <svg viewBox="0 0 24 24" fill="currentColor" className={refreshing ? styles.spinning : ''}>
                  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                </svg>
                {refreshing ? '刷新中...' : '刷新净值'}
              </button>
              <span className={styles.dataSource}>
                {balanceData?.equitySource === 'database' ? '✓ 实时数据' : '○ 模拟数据'}
              </span>
            </div>
          </div>
        </div>

        {/* 关卡完成提示 */}
        {levelJustCompleted && (
          <div className={styles.levelCompleteBanner}>
            <div className={styles.checkmark}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            <span>恭喜完成第{challengeStatus.currentLevel}关！</span>
            <p className={styles.resetHint}>请将账户余额重置为1000后点击下方按钮继续</p>
            <button 
              className={styles.continueButton}
              onClick={handleContinueNextLevel}
            >
              继续挑战第{challengeStatus.currentLevel + 1}关
            </button>
          </div>
        )}

        {/* 消息提示 */}
        {message && !levelJustCompleted && (
          <div className={`${styles.messageBanner} ${styles[message.type]}`}>
            {message.text}
          </div>
        )}

        {/* 规则说明 */}
        <section className={styles.rulesSection}>
          <h2 className={styles.sectionTitle}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
            挑战规则
          </h2>
          <div className={styles.rulesList}>
            <div className={styles.ruleCard}>
              <div className={styles.ruleIcon} style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
              <div className={styles.ruleContent}>
                <h4>通关条件</h4>
                <p>账户净值达到 {getTargetBalance()}（盈利≥{getTargetBalance() - getInitialBalance()}）</p>
              </div>
            </div>
            <div className={styles.ruleCard}>
              <div className={styles.ruleIcon} style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </div>
              <div className={styles.ruleContent}>
                <h4>失败条件</h4>
                <p>账户净值低于 {getFailBalance()}</p>
              </div>
            </div>
            <div className={styles.ruleCard}>
              <div className={styles.ruleIcon} style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div className={styles.ruleContent}>
                <h4>净值来源</h4>
                <p>自动从EA获取真实净值数据，无需手动输入</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
