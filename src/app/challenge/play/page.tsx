'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from './page.module.css';

interface Level {
  number: number;
  name: string;
  description: string;
  target: string;
  tasks: { id: string; text: string }[];
}

const levels: Level[] = [
  { 
    number: 1, 
    name: '初入江湖', 
    description: '完成一笔交易', 
    target: '1笔交易',
    tasks: [
      { id: '1-1', text: '登录交易账户' },
      { id: '1-2', text: '选择交易品种' },
      { id: '1-3', text: '执行交易订单' },
    ]
  },
  { 
    number: 2, 
    name: '小试牛刀', 
    description: '连续3天每日交易', 
    target: '3天交易',
    tasks: [
      { id: '2-1', text: '第1天：执行交易' },
      { id: '2-2', text: '第2天：执行交易' },
      { id: '2-3', text: '第3天：执行交易' },
    ]
  },
  { 
    number: 3, 
    name: '稳步前进', 
    description: '累计10笔交易', 
    target: '10笔交易',
    tasks: [
      { id: '3-1', text: '完成5笔买入交易' },
      { id: '3-2', text: '完成5笔卖出交易' },
    ]
  },
  { 
    number: 4, 
    name: '略有小成', 
    description: '周收益率达到5%', 
    target: '5%收益',
    tasks: [
      { id: '4-1', text: '分析市场趋势' },
      { id: '4-2', text: '设置止盈止损' },
      { id: '4-3', text: '等待收益达到5%' },
    ]
  },
  { 
    number: 5, 
    name: '渐入佳境', 
    description: '连续5天稳定盈利', 
    target: '5天盈利',
    tasks: [
      { id: '5-1', text: '第1天盈利' },
      { id: '5-2', text: '第2天盈利' },
      { id: '5-3', text: '第3天盈利' },
      { id: '5-4', text: '第4天盈利' },
      { id: '5-5', text: '第5天盈利' },
    ]
  },
  { 
    number: 6, 
    name: '身手不凡', 
    description: '月收益达到20%', 
    target: '20%收益',
    tasks: [
      { id: '6-1', text: '制定交易计划' },
      { id: '6-2', text: '执行多个交易策略' },
      { id: '6-3', text: '累计收益达到20%' },
    ]
  },
  { 
    number: 7, 
    name: '出类拔萃', 
    description: '控制回撤在10%以内', 
    target: '<10%回撤',
    tasks: [
      { id: '7-1', text: '设置严格止损' },
      { id: '7-2', text: '监控账户风险' },
      { id: '7-3', text: '保持回撤小于10%' },
    ]
  },
  { 
    number: 8, 
    name: '技惊四座', 
    description: '周收益翻倍', 
    target: '100%收益',
    tasks: [
      { id: '8-1', text: '执行高收益策略' },
      { id: '8-2', text: '把握市场机会' },
      { id: '8-3', text: '实现资金翻倍' },
    ]
  },
  { 
    number: 9, 
    name: '登峰造极', 
    description: '连续30天稳定盈利', 
    target: '30天盈利',
    tasks: [
      { id: '9-1', text: '第1-10天稳定盈利' },
      { id: '9-2', text: '第11-20天稳定盈利' },
      { id: '9-3', text: '第21-30天稳定盈利' },
    ]
  },
  { 
    number: 10, 
    name: '一代宗师', 
    description: '累计收益达到500%', 
    target: '500%收益',
    tasks: [
      { id: '10-1', text: '执行大师级策略' },
      { id: '10-2', text: '完成多个盈利周期' },
      { id: '10-3', text: '达到500%累计收益' },
      { id: '10-4', text: '通关K线征途！' },
    ]
  },
];

export default function ChallengePlayPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [challengeStatus, setChallengeStatus] = useState<{
    id: number;
    currentLevel: number;
    completedLevels: number[];
    startedAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [levelComplete, setLevelComplete] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchChallengeStatus();
    } else if (status === 'unauthenticated') {
      router.push('/challenge');
    }
  }, [status, router]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (startTime && !levelComplete && !showVictory) {
      timer = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [startTime, levelComplete, showVictory]);

  const fetchChallengeStatus = async () => {
    try {
      const res = await fetch('/api/challenge/register');
      const data = await res.json();
      
      if (data.hasActiveChallenge && data.registration) {
        setChallengeStatus(data.registration);
        setStartTime(Date.now() - (elapsedTime * 1000));
        
        // 加载已完成的任务
        if (data.registration.completedLevels.length > 0) {
          const tasks: string[] = [];
          data.registration.completedLevels.forEach((level: number) => {
            const levelData = levels.find(l => l.number === level);
            if (levelData) {
              levelData.tasks.forEach(task => tasks.push(task.id));
            }
          });
          setCompletedTasks(tasks);
        }
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

  const handleTaskClick = (taskId: string) => {
    if (completedTasks.includes(taskId)) return;
    setActiveTask(taskId);
  };

  const handleCompleteTask = async () => {
    if (!activeTask || !currentLevelData) return;

    const newCompletedTasks = [...completedTasks, activeTask];
    setCompletedTasks(newCompletedTasks);
    setActiveTask(null);

    // 检查是否完成所有任务
    const allTasksComplete = currentLevelData.tasks.every(task => 
      newCompletedTasks.includes(task.id)
    );

    if (allTasksComplete) {
      // 完成关卡
      try {
        const res = await fetch('/api/challenge/level', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level: challengeStatus?.currentLevel,
            duration: elapsedTime,
          }),
        });
        const data = await res.json();

        if (data.success) {
          if (data.completed) {
            // 通关
            setShowVictory(true);
            setLevelComplete(true);
          } else {
            // 继续下一关
            setLevelComplete(true);
            setTimeout(() => {
              setChallengeStatus(prev => prev ? {
                ...prev,
                currentLevel: data.nextLevel,
                completedLevels: data.completedLevels,
              } : null);
              setCompletedTasks([]);
              setLevelComplete(false);
              setElapsedTime(0);
              setStartTime(Date.now());
            }, 2000);
          }
        }
      } catch (error) {
        console.error('完成关卡失败:', error);
      }
    }
  };

  const handleAbandon = async () => {
    if (!confirm('确定要放弃当前挑战吗？')) return;
    
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
              className={styles.progressFill}
              style={{ 
                width: `${(completedTasks.length / currentLevelData.tasks.length) * 100}%` 
              }}
            />
          </div>
          <span className={styles.progressText}>
            {completedTasks.length} / {currentLevelData.tasks.length} 任务完成
          </span>
        </div>

        {/* 关卡提示 */}
        {levelComplete && !showVictory && (
          <div className={styles.levelCompleteBanner}>
            <div className={styles.checkmark}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            <span>关卡完成！{challengeStatus.currentLevel < 10 ? '正在进入下一关...' : ''}</span>
          </div>
        )}

        {/* 任务列表 */}
        <section className={styles.tasksSection}>
          <h2 className={styles.sectionTitle}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            任务清单
          </h2>
          <div className={styles.tasksList}>
            {currentLevelData.tasks.map((task, index) => {
              const isCompleted = completedTasks.includes(task.id);
              const isActive = activeTask === task.id;
              
              return (
                <div 
                  key={task.id}
                  className={`${styles.taskCard} ${isCompleted ? styles.completed : ''} ${isActive ? styles.active : ''}`}
                  onClick={() => handleTaskClick(task.id)}
                >
                  <div className={styles.taskNumber}>
                    {isCompleted ? (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className={styles.taskText}>{task.text}</span>
                  {isCompleted && (
                    <span className={styles.completedTag}>已完成</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 任务详情弹窗 */}
        {activeTask && (
          <div className={styles.taskModal}>
            <div className={styles.taskModalContent}>
              <h3 className={styles.taskModalTitle}>完成任务</h3>
              <p className={styles.taskModalDesc}>
                {currentLevelData.tasks.find(t => t.id === activeTask)?.text}
              </p>
              <div className={styles.taskModalActions}>
                <button 
                  className={styles.cancelButton}
                  onClick={() => setActiveTask(null)}
                >
                  取消
                </button>
                <button 
                  className={styles.completeButton}
                  onClick={handleCompleteTask}
                >
                  确认完成
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 底部提示 */}
        <footer className={styles.footer}>
          <div className={styles.tips}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            <span>提示：完成任务后点击任务卡片即可标记完成</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
