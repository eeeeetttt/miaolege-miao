'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from './page.module.css';

interface Level {
  number: number;
  name: string;
  description: string;
  target: string;
  reward: string;
}

const levels: Level[] = [
  { number: 1, name: '初入江湖', description: '完成一笔交易', target: '1笔交易', reward: '100金币' },
  { number: 2, name: '小试牛刀', description: '连续3天每日交易', target: '3天交易', reward: '200金币' },
  { number: 3, name: '稳步前进', description: '累计10笔交易', target: '10笔交易', reward: '300金币' },
  { number: 4, name: '略有小成', description: '周收益率达到5%', target: '5%收益', reward: '500金币' },
  { number: 5, name: '渐入佳境', description: '连续5天稳定盈利', target: '5天盈利', reward: '800金币' },
  { number: 6, name: '身手不凡', description: '月收益达到20%', target: '20%收益', reward: '1000金币' },
  { number: 7, name: '出类拔萃', description: '控制回撤在10%以内', target: '<10%回撤', reward: '1500金币' },
  { number: 8, name: '技惊四座', description: '周收益翻倍', target: '100%收益', reward: '2000金币' },
  { number: 9, name: '登峰造极', description: '连续30天稳定盈利', target: '30天盈利', reward: '3000金币' },
  { number: 10, name: '一代宗师', description: '累计收益达到500%', target: '500%收益', reward: '5000金币' },
];

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
  const [challengeStatus, setChallengeStatus] = useState<{
    hasActiveChallenge: boolean;
    registration: { currentLevel: number; completedLevels: number[] } | null;
    completedCount: number;
    bestRecord: { totalDuration: number } | null;
  } | null>(null);
  const [hallOfFame, setHallOfFame] = useState<HallOfFameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchChallengeStatus();
      fetchHallOfFame();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status]);

  const fetchChallengeStatus = async () => {
    try {
      const res = await fetch('/api/challenge/register');
      const data = await res.json();
      setChallengeStatus(data);
      setLoading(false);
    } catch (error) {
      console.error('获取挑战状态失败:', error);
      setLoading(false);
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

  const handleStartChallenge = async () => {
    try {
      const res = await fetch('/api/challenge/register', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        router.push('/challenge/play');
      } else {
        alert(data.error || '报名失败');
      }
    } catch (error) {
      console.error('报名失败:', error);
      alert('报名失败，请重试');
    }
  };

  const handleContinueChallenge = () => {
    router.push('/challenge/play');
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

  const currentLevel = challengeStatus?.registration?.currentLevel || 1;
  const completedLevels = challengeStatus?.registration?.completedLevels || [];

  return (
    <div className={styles.container}>
      
      {/* 背景装饰 */}
      <div className={styles.bgDecoration}>
        <div className={styles.grid}></div>
      </div>

      {/* 通关动画 */}
      {showConfetti && (
        <div className={styles.confetti}>
          {Array.from({ length: 50 }).map((_, i) => (
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
      )}

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

        {/* 挑战状态卡片 */}
        <section className={styles.statusSection}>
          {session?.user ? (
            challengeStatus?.hasActiveChallenge ? (
              <div className={styles.activeChallengeCard}>
                <div className={styles.challengeInfo}>
                  <div className={styles.currentLevelBadge}>
                    第{currentLevel}关
                  </div>
                  <div className={styles.progressInfo}>
                    <p>正在进行中</p>
                    <div className={styles.levelDots}>
                      {levels.map((level) => (
                        <span
                          key={level.number}
                          className={`${styles.levelDot} ${
                            completedLevels.includes(level.number) ? styles.completed : ''
                          } ${currentLevel === level.number ? styles.current : ''}`}
                        />
                      ))}
                    </div>
                    <p className={styles.progressText}>
                      已完成 {completedLevels.length}/10 关
                    </p>
                  </div>
                </div>
                <button 
                  className={styles.continueButton}
                  onClick={handleContinueChallenge}
                >
                  继续挑战
                </button>
              </div>
            ) : (
              <div className={styles.startChallengeCard}>
                <h3>开始你的K线征途</h3>
                <p>10关挑战，从新手到大师</p>
                <div className={styles.rewards}>
                  <span className={styles.rewardIcon}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </span>
                  通关可获得总计 15000+ 金币
                </div>
                <button 
                  className={styles.startButton}
                  onClick={handleStartChallenge}
                >
                  立即报名
                </button>
              </div>
            )
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

        {/* 关卡列表 */}
        <section className={styles.levelsSection}>
          <h2 className={styles.sectionTitle}>
            <svg viewBox="0 0 24 24" fill="currentColor" className={styles.sectionIcon}>
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
            挑战关卡
          </h2>
          <div className={styles.levelsGrid}>
            {levels.map((level) => {
              const isCompleted = completedLevels.includes(level.number);
              const isCurrent = currentLevel === level.number && challengeStatus?.hasActiveChallenge;
              const isLocked = !completedLevels.includes(level.number - 1) && 
                              !(level.number === 1 || completedLevels.includes(level.number));
              
              return (
                <div 
                  key={level.number}
                  className={`${styles.levelCard} ${isCompleted ? styles.completed : ''} ${isCurrent ? styles.current : ''} ${isLocked && !challengeStatus?.hasActiveChallenge ? styles.locked : ''}`}
                >
                  <div className={styles.levelHeader}>
                    <span className={styles.levelNumber}>第{level.number}关</span>
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
                    {isLocked && !challengeStatus?.hasActiveChallenge && (
                      <span className={styles.lockedBadge}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
                        </svg>
                      </span>
                    )}
                  </div>
                  <h3 className={styles.levelName}>{level.name}</h3>
                  <p className={styles.levelDesc}>{level.description}</p>
                  <div className={styles.levelMeta}>
                    <div className={styles.levelTarget}>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                      </svg>
                      {level.target}
                    </div>
                    <div className={styles.levelReward}>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
                      </svg>
                      {level.reward}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 名人堂 */}
        <section className={styles.hallOfFameSection}>
          <h2 className={styles.sectionTitle}>
            <svg viewBox="0 0 24 24" fill="currentColor" className={styles.sectionIcon}>
              <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
            </svg>
            名人堂
          </h2>
          {hallOfFame.length > 0 ? (
            <div className={styles.hallOfFameList}>
              {hallOfFame.slice(0, 10).map((entry, index) => (
                <div key={entry.rank} className={styles.hallOfFameItem}>
                  <div className={styles.rank}>
                    {index < 3 ? (
                      <span className={`${styles.topRank} ${styles[`rank${index + 1}`]}`}>
                        {index + 1}
                      </span>
                    ) : (
                      <span className={styles.normalRank}>{entry.rank}</span>
                    )}
                  </div>
                  <div className={styles.avatar}>
                    {entry.avatar ? (
                      <img src={entry.avatar} alt={entry.displayName} />
                    ) : (
                      <div className={styles.defaultAvatar}>
                        {entry.displayName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className={styles.userInfo}>
                    <span className={styles.displayName}>{entry.displayName}</span>
                    <span className={styles.completionTime}>
                      {new Date(entry.completedAt).toLocaleDateString('zh-CN')} 完成
                    </span>
                  </div>
                  <div className={styles.duration}>
                    {entry.formattedDuration}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyHallOfFame}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <p>暂无记录</p>
              <span>成为第一个通关的大师吧！</span>
            </div>
          )}
          <button 
            className={styles.moreButton}
            onClick={() => router.push('/challenge/hall-of-fame')}
          >
            查看完整排名
          </button>
        </section>
      </main>
    </div>
  );
}
