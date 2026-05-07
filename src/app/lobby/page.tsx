'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Crown, Calendar, Gift, Users, Trophy, Flame, Mountain, Sun, CalendarDays, GraduationCap, Loader2 } from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  icon: string;
  badges: string[];
  description: string;
  details: { label: string; value: string }[];
  reward: string;
  status: string;
  buttonText: string;
}

export default function LobbyPage() {
  const { data: session } = useSession();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const res = await fetch('/api/admin/tournaments');
        const data = await res.json();
        if (data.tournaments && data.tournaments.length > 0) {
          setTournaments(data.tournaments);
        } else {
          // 默认赛事
          setTournaments(defaultTournaments);
        }
      } catch {
        setTournaments(defaultTournaments);
      } finally {
        setLoading(false);
      }
    };
    fetchTournaments();
  }, []);

  const handleRegister = async (tournament: Tournament) => {
    if (!session) {
      alert('请先登录后再报名');
      return;
    }
    setRegistering(tournament.id);

    try {
      const res = await fetch('/api/tournament/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: tournament.id }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`恭喜！您已成功报名【${tournament.name}】！`);
      } else {
        alert(data.message || '报名失败，请稍后重试');
      }
    } catch {
      alert('网络错误，请稍后重试');
    } finally {
      setRegistering(null);
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'fas fa-chart-simple': return <Trophy className="w-8 h-8" />;
      case 'fas fa-user-graduate': return <GraduationCap className="w-8 h-8" />;
      case 'fas fa-sun': return <Sun className="w-8 h-8" />;
      case 'fas fa-calendar-alt': return <CalendarDays className="w-8 h-8" />;
      case 'fas fa-mountain': return <Mountain className="w-8 h-8" />;
      default: return <Trophy className="w-8 h-8" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-amber-500 mx-auto mb-4" />
          <p className="text-gray-400">加载赛事中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* 顶部导航 */}
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-amber-500/30">
          <div className="flex items-center gap-3">
            <Crown className="w-8 h-8 text-amber-500" />
            <span className="text-2xl font-bold bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
              LONDON GOLD
            </span>
            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">
              挑战赛·大厅
            </span>
          </div>
        </div>

        {/* Banner */}
        <div className="relative bg-gradient-to-r from-black/60 to-amber-950/60 rounded-3xl p-6 mb-8 border border-amber-500/50 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent" />
          <div className="relative">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Flame className="w-7 h-7 text-amber-500" />
              黄金竞技场 · 勇者集结
            </h2>
            <p className="text-gray-300 mt-2 max-w-xl">
              立即报名，参与殿堂级伦敦金模拟赛事，与顶级交易员同台竞逐，赢取荣耀与实物豪礼。
            </p>
            <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/60 text-amber-400 px-4 py-2 rounded-full mt-4 text-sm">
              <Calendar className="w-4 h-4" />
              2026 S2赛季 · 热力开启
            </div>
          </div>
        </div>
      </div>

      {/* 赛事网格 */}
      <div className="max-w-6xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tournament) => (
            <div
              key={tournament.id}
              className="relative bg-gray-900/80 backdrop-blur-xl rounded-3xl border border-amber-500/30 overflow-hidden hover:border-amber-500/70 hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 hover:-translate-y-2 group"
            >
              {/* 顶部金色装饰线 */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500" />

              <div className="p-6">
                {/* 标题区 */}
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">
                    {tournament.name}
                  </h3>
                  <div className="text-amber-500 group-hover:scale-110 transition-transform">
                    {getIcon(tournament.icon)}
                  </div>
                </div>

                {/* 徽章 */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {tournament.badges.map((badge, i) => (
                    <span
                      key={i}
                      className={`text-xs px-3 py-1 rounded-full border-l-2 ${
                        badge.includes('热门') || badge.includes('全民')
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500'
                          : 'bg-gray-800 text-gray-300 border-gray-600'
                      }`}
                    >
                      {badge}
                    </span>
                  ))}
                </div>

                {/* 描述 */}
                <p className="text-gray-400 text-sm leading-relaxed mb-4">
                  {tournament.description}
                </p>

                {/* 详情 */}
                <div className="space-y-2 mb-4 pb-4 border-b border-dashed border-amber-500/20">
                  {tournament.details.map((detail, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                      <span className="text-gray-500">{detail.label}:</span>
                      <span className="text-amber-300 font-semibold">{detail.value}</span>
                    </div>
                  ))}
                </div>

                {/* 奖励 */}
                <div className="bg-amber-500/10 rounded-xl px-4 py-2 mb-4 inline-flex items-center gap-2 text-amber-400 text-sm">
                  <Gift className="w-4 h-4" />
                  {tournament.reward}
                </div>

                {/* 报名按钮 */}
                <button
                  onClick={() => handleRegister(tournament)}
                  disabled={registering === tournament.id}
                  className="w-full bg-gradient-to-r from-gray-800 to-gray-900 border border-amber-500 rounded-full py-3 font-bold text-amber-400 hover:from-amber-500 hover:to-amber-600 hover:text-gray-900 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {registering === tournament.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>报名参赛</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 底部提示 */}
        <div className="text-center mt-12 pt-6 border-t border-amber-500/20">
          <p className="text-gray-500 text-sm flex items-center justify-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            每个赛事均为独立挑战，报名后解锁实时排名与专属奖励池
          </p>
        </div>
      </div>
    </div>
  );
}

// 默认赛事数据
const defaultTournaments: Tournament[] = [
  {
    id: 'ladder',
    name: '天梯赛',
    icon: 'fas fa-chart-simple',
    badges: ['🏆 赛季积分', '🔥 全民参与'],
    description: '长期开放分段晋升，根据胜率与收益率动态升降段位，争夺"最强王者"头衔。每日更新天梯榜。',
    details: [
      { label: '周期', value: '每月赛季' },
      { label: '参赛费', value: '免费' },
      { label: '奖励池', value: '8,888 USD' },
    ],
    reward: '黄金段位专属勋章 + 现金奖励',
    status: 'hot',
    buttonText: '立即报名',
  },
  {
    id: 'master',
    name: '大师邀请赛',
    icon: 'fas fa-user-graduate',
    badges: ['🎫 邀请制', '👑 殿堂对决'],
    description: '仅限往届优胜者/特邀高手参与，巅峰级别策略博弈，胜者载入名人堂特别版块。',
    details: [
      { label: '开赛', value: '4月20日' },
      { label: '门槛', value: '历史战绩认证' },
      { label: '保底奖', value: '3,000 USD' },
    ],
    reward: '大师权杖 NFT + 高额奖池分成',
    status: 'invite',
    buttonText: '申请报名',
  },
  {
    id: 'daily',
    name: '每日挑战赛',
    icon: 'fas fa-sun',
    badges: ['⏳ 24小时一轮', '🎯 快速竞技'],
    description: '每个自然日独立结算，短线快节奏，满足最低交易笔数即有奖，适合所有玩家。',
    details: [
      { label: '报名时间', value: '每日00:00-20:00' },
      { label: '本金', value: '模拟金10,000' },
      { label: '冠军奖', value: '500 USD' },
    ],
    reward: '每日前10名获得京东卡/黄金积分',
    status: 'hot',
    buttonText: '今日报名',
  },
  {
    id: 'monthly',
    name: '月度总决赛',
    icon: 'fas fa-calendar-alt',
    badges: ['🏅 精英集结', '💎 高额奖金'],
    description: '每月底压轴大战，由天梯赛和每日赛积分榜前列选手自动入围，冠军直接晋升大师赛。',
    details: [
      { label: '日期', value: '每月27-30日' },
      { label: '规模', value: '最多200席' },
      { label: '奖金池保底', value: '20,000 USD' },
    ],
    reward: '月度黄金腰带 + 定制奖杯 + 大额赠金',
    status: '',
    buttonText: '备战报名',
  },
  {
    id: 'peak',
    name: '巅峰赛',
    icon: 'fas fa-mountain',
    badges: ['⚠️ 顶级难度', '🏔️ 封神之战'],
    description: '年度最高规格赛事，高杠杆、高波动环境，只对胜率>60%选手开放，万亿级模拟资金博弈。',
    details: [
      { label: '赛程', value: '季度一次' },
      { label: '最小权益', value: '50,000 USD' },
      { label: '冠军奖励', value: '保时捷+黄金' },
    ],
    reward: '巅峰之戒 + 冠军总奖池50%',
    status: 'elite',
    buttonText: '验证报名',
  },
];
