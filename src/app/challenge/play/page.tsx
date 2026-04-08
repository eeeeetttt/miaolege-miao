'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from './page.module.css';

const levels = [
  { number: 1, name: '启念', description: '开始你的交易之旅' },
  { number: 2, name: '立规', description: '建立交易规则' },
  { number: 3, name: '守戒', description: '遵守交易纪律' },
  { number: 4, name: '忍痛', description: '学会止损止盈' },
  { number: 5, name: '止喜', description: '控制情绪波动' },
  { number: 6, name: '观己', description: '认识自我弱点' },
  { number: 7, name: '破执', description: '突破固有思维' },
  { number: 8, name: '随势', description: '顺势而为' },
  { number: 9, name: '忘我', description: '达到交易境界' },
  { number: 10, name: '得道', description: '完成终极挑战' },
];

const INITIAL_BALANCE = 1000;
const TARGET_BALANCE = 2000;
const FAIL_BALANCE = 100;

interface ChallengeStatus {
  id: number;
  currentLevel: number;
  completedLevels: number[];
  startedAt: string;
  initialBalance: number;
  targetBalance: number;
  failBalance: number;
}

export default function ChallengePlayPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [challengeStatus, setChallengeStatus] = useState<ChallengeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentBalance, setCurrentBalance] = useState(INITIAL_BALANCE);
  const [balanceInput, setBalanceInput] = useState(INITIAL_BALANCE.toString());
  const [showVictory, setShowVictory] = useState(false);
  const [showFailed, setShowFailed] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [levelJustCompleted, setLevelJustCompleted] = useState(false);
  const [rewards, setRewards] = useState<{ cash: string; trophy: string } | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchChallengeStatus();
    } else if (status === 'unauthenticated') {
      router.push('/challenge');
    }
  }, [status, router]);

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

  const fetchChallengeStatus = async () => {
    try {
      const res = await fetch('/api/challenge/register');
      const data = await res.json();
      
      if (data.hasActiveChallenge && data.registration) {
        setChallengeStatus(data.registration);
        setCurrentBalance(INITIAL_BALANCE);
        setBalanceInput(INITIAL_BALANCE.toString());
      } else {
        router.push('/challenge');
      }
      setLoading(false);
    } catch (error) {
      console.error('获取挑战状态失败:', error);
      setLoading(false);
    }
  };

  const currentLevelData = levels.find(l => l.number === challengeStatus?.currentLevel);

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
          text: `当前进度: ${progress}% | 目标: ${TARGET_BALANCE} | 底线: ${FAIL_BALANCE}` 
        });
      }
    } catch (error) {
      console.error('更新余额失败:', error);
      setMessage({ type: 'error', text: '更新失败，请重试' });
    }
  };

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
          setCurrentBalance(INITIAL_BALANCE);
          setBalanceInput(INITIAL_BALANCE.toString());
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
    if (currentBalance < INITIAL_BALANCE) {
      // 计算距离失败的距离
      return Math.max(0, ((currentBalance - FAIL_BALANCE) / (INITIAL_BALANCE - FAIL_BALANCE)) * 100);
    }
    // 计算距离通关的距离
    return Math.min(100, ((currentBalance - INITIAL_BALANCE) / (TARGET_BALANCE - INITIAL_BALANCE)) * 100);
  };

  const isInDanger = currentBalance < INITIAL_BALANCE && currentBalance >= FAIL_BALANCE;
  const isCritical = currentBalance < FAIL_BALANCE;

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
            <p className={styles.failedSubtitle}>账户净值已低于100</p>
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
              报名费不予退还，重新开始需再次支付1000星球币
            </div>
            <button 
              className={styles.failedButton}
              onClick={() => router.push('/challenge')}
            >
              返回挑战主页
            </button>
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
              style={{ left: `${((FAIL_BALANCE - FAIL_BALANCE) / (TARGET_BALANCE - FAIL_BALANCE)) * 100}%` }}
            />
          </div>
          <div className={styles.progressLabels}>
            <span className={styles.failLabel}>失败线: {FAIL_BALANCE}</span>
            <span className={styles.startLabel}>起始: {INITIAL_BALANCE}</span>
            <span className={styles.targetLabel}>目标: {TARGET_BALANCE}</span>
          </div>
        </div>

        {/* 余额显示 */}
        <div className={styles.balanceSection}>
          <div className={`${styles.balanceDisplay} ${isInDanger ? styles.danger : ''} ${isCritical ? styles.critical : ''}`}>
            <span className={styles.balanceLabel}>当前账户净值</span>
            <span className={styles.balanceValue}>{currentBalance}</span>
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

        {/* 余额输入 */}
        {!levelJustCompleted && !showVictory && !showFailed && (
          <section className={styles.balanceInputSection}>
            <h2 className={styles.sectionTitle}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
              </svg>
              更新账户净值
            </h2>
            <div className={styles.inputGroup}>
              <input
                type="number"
                className={styles.balanceInput}
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                placeholder="输入当前账户净值"
                min="0"
              />
              <button 
                className={styles.updateButton}
                onClick={handleUpdateBalance}
              >
                更新
              </button>
            </div>
            <p className={styles.hint}>
              请输入您在MT4/MT5账户中的当前净值，系统将自动判断通关或失败状态
            </p>
          </section>
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
                <p>账户净值达到 {TARGET_BALANCE}（盈利≥{TARGET_BALANCE - INITIAL_BALANCE}）</p>
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
                <p>账户净值低于 {FAIL_BALANCE}</p>
              </div>
            </div>
            <div className={styles.ruleCard}>
              <div className={styles.ruleIcon} style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div className={styles.ruleContent}>
                <h4>继续挑战</h4>
                <p>通关后将余额重置为 {INITIAL_BALANCE}，解锁下一关</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
