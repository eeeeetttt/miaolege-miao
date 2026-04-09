'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import styles from './page.module.css';

export default function ChallengePage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/challenge/register')
        .then(res => res.json())
        .then(result => {
          setData(result);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status]);

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

  return (
    <div className={styles.pageContainer}>
      <div className={styles.content}>
        <h1>K线征途挑战赛</h1>
        {!session ? (
          <p>请先登录</p>
        ) : data?.error ? (
          <p>{data.error}</p>
        ) : (
          <p>数据加载成功</p>
        )}
      </div>
    </div>
  );
}
