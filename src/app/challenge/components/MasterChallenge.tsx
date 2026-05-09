'use client';

import { useState, useEffect } from 'react';
import TradingPanel from './TradingPanel';

interface MasterConfig {
  enabled: boolean;
  entryFeeGold: number;
  initialCapitalSilver: number;
  roundDays: number;
  rewards: string;
}

interface Requirements {
  debtMustBeZero: boolean;
  requireTitle: string;
  minLadderRank: number;
}

interface MyAccount {
  accountId: string;
  currentValue: number;
  initialValue: number;
  currentRound: number;
  winCount: number;
  status: string;
}

interface LeaderboardEntry {
  rank: number;
  userName: string;
  returnRate: number;
  currentRound: number;
}

export default function MasterChallenge() {
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [config, setConfig] = useState<MasterConfig | null>(null);
  const [requirements, setRequirements] = useState<Requirements | null>(null);
  const [myAccount, setMyAccount] = useState<MyAccount | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [status, setStatus] = useState<string>('loading');
  const [message, setMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId]);

  const fetchUserId = async () => {
    try {
      const res = await fetch('/api/session');
      const data = await res.json();
      if (data.user?.id) {
        setUserId(data.user.id);
      } else {
        setLoading(false);
        setStatus('login');
      }
    } catch {
      setLoading(false);
      setStatus('login');
    }
  };

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/match/master?userId=${userId}`);
      const data = await res.json();
      
      if (data.error) {
        setMessage(data.error);
        setStatus('error');
      } else {
        setConfig(data.config);
        setRequirements(data.requirements);
        setMyAccount(data.myAccount);
        setLeaderboard(data.leaderboard || []);
        setTotalParticipants(data.totalParticipants || 0);
        setStatus(data.status);
      }
    } catch (error) {
      setMessage('获取数据失败');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!confirm('确认报名大师邀请赛？需要扣除500金币和10万银两。')) {
      return;
    }

    setEnrolling(true);
    try {
      const res = await fetch('/api/match/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enroll' }),
      });
      const data = await res.json();
      
      if (data.success) {
        alert('报名成功！');
        fetchData();
      } else {
        alert(data.error || '报名失败');
      }
    } catch {
      alert('报名失败，请重试');
    } finally {
      setEnrolling(false);
    }
  };

  const handleQuit = async () => {
    if (!confirm('确认退出比赛？当前余额将退还。')) {
      return;
    }

    setEnrolling(true);
    try {
      const res = await fetch('/api/match/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'quit' }),
      });
      const data = await res.json();
      
      if (data.success) {
        alert('已退出比赛');
        fetchData();
      } else {
        alert(data.error || '退出失败');
      }
    } catch {
      alert('退出失败，请重试');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-purple-400 animate-spin text-2xl">◌</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">请先登录后参加大师邀请赛</p>
        <a href="/login" className="text-purple-400 hover:underline">前往登录</a>
      </div>
    );
  }

  const rewards = config?.rewards ? JSON.parse(config.rewards) : [];

  return (
    <div className="space-y-4">
      {/* 大师邀请赛特点 */}
      <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-xl p-4 border border-purple-500/30">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">👑</span>
          <h3 className="text-lg font-bold text-purple-300">大师邀请赛</h3>
        </div>
        <p className="text-sm text-gray-300">
          单败淘汰赛，每轮7天，与对手比收益率。持有"K线宗师"称号方可参加！
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <div className="bg-black/30 rounded-lg p-2 text-center">
            <div className="text-purple-400">{config?.entryFeeGold || 500}</div>
            <div className="text-gray-400">报名费(金币)</div>
          </div>
          <div className="bg-black/30 rounded-lg p-2 text-center">
            <div className="text-purple-400">{config?.initialCapitalSilver ? (config.initialCapitalSilver / 10000).toFixed(0) : 10}万</div>
            <div className="text-gray-400">参赛本金(银两)</div>
          </div>
          <div className="bg-black/30 rounded-lg p-2 text-center">
            <div className="text-purple-400">{config?.roundDays || 7}</div>
            <div className="text-gray-400">每轮天数</div>
          </div>
        </div>
      </div>

      {/* 参赛条件 */}
      <div className="bg-gray-800/50 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-2">参赛条件</h4>
        <div className="space-y-1 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span>负债必须为0</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span>拥有「K线宗师」称号</span>
          </div>
        </div>
      </div>

      {/* 我的账户 */}
      {status === 'enrolled' && myAccount && (
        <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 rounded-xl p-4 border border-green-500/30">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🎯</span>
            <h4 className="font-semibold text-green-300">我的参赛状态</h4>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-black/30 rounded-lg p-3">
              <div className="text-green-400 text-lg font-bold">
                {myAccount.currentRound}/∞
              </div>
              <div className="text-gray-400">当前轮次</div>
            </div>
            <div className="bg-black/30 rounded-lg p-3">
              <div className="text-green-400 text-lg font-bold">
                {myAccount.winCount}
              </div>
              <div className="text-gray-400">胜场</div>
            </div>
            <div className="bg-black/30 rounded-lg p-3">
              <div className="text-green-400 text-lg font-bold">
                {(myAccount.currentValue / 10000).toFixed(0)}万
              </div>
              <div className="text-gray-400">当前净值</div>
            </div>
            <div className="bg-black/30 rounded-lg p-3">
              <div className="text-green-400 text-lg font-bold">
                {myAccount.initialValue > 0 
                  ? ((myAccount.currentValue - myAccount.initialValue) / myAccount.initialValue * 100).toFixed(2)
                  : 0}%
              </div>
              <div className="text-gray-400">收益率</div>
            </div>
          </div>
          <button
            onClick={handleQuit}
            disabled={enrolling}
            className="w-full mt-3 py-2 bg-red-600/80 hover:bg-red-600 disabled:bg-gray-600 rounded-lg text-sm transition"
          >
            {enrolling ? '处理中...' : '退出比赛'}
          </button>
        </div>
      )}

      {/* 交易面板 */}
      {status === 'enrolled' && myAccount && (
        <TradingPanel
          matchType="master"
          initialBalance={myAccount.currentValue}
          matchAccountId={myAccount.accountId}
        />
      )}

      {/* 报名按钮 */}
      {status === 'open' && (
        <button
          onClick={handleEnroll}
          disabled={enrolling}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 rounded-xl font-bold text-white transition"
        >
          {enrolling ? '报名中...' : `立即报名 (需${config?.entryFeeGold || 500}金币 + ${(config?.initialCapitalSilver || 100000).toLocaleString()}银两)`}
        </button>
      )}

      {/* 奖励规则 */}
      <div className="bg-gray-800/50 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">🏆 奖励规则</h4>
        <div className="space-y-2">
          {rewards.map((reward: any, index: number) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className={
                index === 0 ? 'text-yellow-400' :
                index === 1 ? 'text-gray-300' :
                index === 2 ? 'text-amber-600' : 'text-gray-400'
              }>
                {reward.rank === 1 ? '🥇' : reward.rank === 2 ? '🥈' : reward.rank === 3 ? '🥉' : `${reward.rank}名`}
              </span>
              <span className="text-yellow-400">{reward.gold?.toLocaleString()}金币</span>
              {reward.title && <span className="text-purple-400">+「{reward.title}」</span>}
            </div>
          ))}
        </div>
      </div>

      {/* 排行榜 */}
      <div className="bg-gray-800/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-300">📊 当前参赛者 ({totalParticipants}人)</h4>
        </div>
        {leaderboard.length === 0 ? (
          <p className="text-center text-gray-500 py-4">暂无参赛者</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {leaderboard.map((entry) => (
              <div key={entry.rank} className="flex items-center gap-3 text-sm bg-black/30 rounded-lg p-2">
                <span className={
                  entry.rank === 1 ? 'text-yellow-400' :
                  entry.rank === 2 ? 'text-gray-300' :
                  entry.rank === 3 ? 'text-amber-600' : 'text-gray-400'
                }>
                  {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `${entry.rank}`}
                </span>
                <span className="flex-1 text-gray-300">{entry.userName}</span>
                <span className="text-purple-400">第{entry.currentRound}轮</span>
                <span className={entry.returnRate >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {entry.returnRate >= 0 ? '+' : ''}{entry.returnRate}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
