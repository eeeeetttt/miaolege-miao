'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

interface HallOfFameEntry {
  rank: number;
  id: number;
  userId: string;
  displayName: string;
  avatar: string | null;
  completedAt: string;
  totalDuration: number;
  formattedDuration: string;
  rewardClaimed: boolean;
}

export default function HallOfFamePage() {
  const router = useRouter();
  const [entries, setEntries] = useState<HallOfFameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchHallOfFame();
  }, [page]);

  const fetchHallOfFame = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/challenge/hall-of-fame?page=${page}&limit=20`);
      const data = await res.json();
      setEntries(data.list || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('获取名人堂失败:', error);
    }
    setLoading(false);
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}小时${minutes}分${secs}秒`;
    } else if (minutes > 0) {
      return `${minutes}分${secs}秒`;
    }
    return `${secs}秒`;
  };

  const getRankClass = (rank: number): string => {
    if (rank === 1) return styles.rankGold;
    if (rank === 2) return styles.rankSilver;
    if (rank === 3) return styles.rankBronze;
    return '';
  };

  const getMedalIcon = (rank: number): React.ReactNode => {
    if (rank > 3) return null;
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={styles.medalIcon}>
        <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
      </svg>
    );
  };

  return (
    <div className={styles.container}>
      
      {/* 背景装饰 */}
      <div className={styles.bgDecoration}>
        <div className={styles.rays}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div 
              key={i} 
              className={styles.ray}
              style={{ transform: `rotate(${i * 30}deg)` }}
            />
          ))}
        </div>
      </div>

      <main className={styles.main}>
        {/* 头部 */}
        <header className={styles.header}>
          <button className={styles.backButton} onClick={() => router.push('/challenge')}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
            返回
          </button>
          <h1 className={styles.title}>
            <svg viewBox="0 0 24 24" fill="currentColor" className={styles.titleIcon}>
              <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
            </svg>
            名人堂
          </h1>
          <p className={styles.subtitle}>
            通关K线征途的大师排行榜
          </p>
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{total}</span>
              <span className={styles.statLabel}>通关人数</span>
            </div>
          </div>
        </header>

        {/* 排行榜 */}
        <section className={styles.leaderboard}>
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>加载中...</p>
            </div>
          ) : entries.length > 0 ? (
            <>
              <div className={styles.entriesList}>
                {entries.map((entry) => (
                  <div key={entry.id} className={styles.entryCard}>
                    <div className={`${styles.rank} ${getRankClass(entry.rank)}`}>
                      {getMedalIcon(entry.rank)}
                      <span className={styles.rankNumber}>{entry.rank}</span>
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
                      <span className={styles.completionDate}>
                        {new Date(entry.completedAt).toLocaleDateString('zh-CN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })} 完成挑战
                      </span>
                    </div>
                    <div className={styles.duration}>
                      <svg viewBox="0 0 24 24" fill="currentColor" className={styles.durationIcon}>
                        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                      </svg>
                      <span>{entry.formattedDuration}</span>
                    </div>
                    {entry.rewardClaimed && (
                      <div className={styles.rewardBadge}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        已领取
                      </div>
                    )}
                    <button 
                      className={styles.detailButton}
                      onClick={() => router.push(`/challenge/player/${entry.userId}`)}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                      查看详情
                    </button>
                  </div>
                ))}
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <button 
                    className={styles.pageButton}
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    上一页
                  </button>
                  <span className={styles.pageInfo}>
                    第 {page} / {totalPages} 页
                  </span>
                  <button 
                    className={styles.pageButton}
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className={styles.empty}>
              <svg viewBox="0 0 24 24" fill="currentColor" className={styles.emptyIcon}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <h3>暂无记录</h3>
              <p>成为第一个通关的大师吧！</p>
              <button 
                className={styles.startButton}
                onClick={() => router.push('/challenge')}
              >
                前往挑战
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
