'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession, signIn } from 'next-auth/react';
import { Crown, Calendar, Gift, Users, Trophy, Flame, Mountain, Sun, CalendarDays, GraduationCap, Loader2, Zap } from 'lucide-react';

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
  route?: string;
}

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
    route: '/challenge/ladder',
  },
  {
    id: 'kline',
    name: 'K线征途',
    icon: 'fas fa-chart-line',
    badges: ['⚡ K线挑战', '💰 丰厚奖金'],
    description: '从1000星球币起步，挑战账户净值达到2000通关。报名费1000星球币，净值跌破100则挑战失败。',
    details: [
      { label: '报名费', value: '1000星球币' },
      { label: '初始净值', value: '1000' },
      { label: '通关目标', value: '2000' },
    ],
    reward: '通关奖励 + 专属勋章',
    status: 'hot',
    buttonText: '挑战开始',
    route: '/challenge/play',
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

export default function LobbyPage() {
  const { data: session, status } = useSession();
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
    // 更准确的登录检测
    if (status === 'loading') {
      alert('正在检查登录状态，请稍候...');
      return;
    }
    
    if (status === 'unauthenticated' || !session?.user) {
      // 如果未登录，尝试跳转登录页
      const confirmLogin = window.confirm('请先登录后再报名，是否前往登录？');
      if (confirmLogin) {
        window.location.href = '/login?redirect=/lobby';
      }
      return;
    }

    // 如果有专属路由，直接跳转
    if (tournament.route) {
      window.location.href = tournament.route;
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
      case 'fas fa-chart-line': return <Zap className="w-8 h-8" />;
      case 'fas fa-user-graduate': return <GraduationCap className="w-8 h-8" />;
      case 'fas fa-sun': return <Sun className="w-8 h-8" />;
      case 'fas fa-calendar-alt': return <CalendarDays className="w-8 h-8" />;
      case 'fas fa-mountain': return <Mountain className="w-8 h-8" />;
      default: return <Trophy className="w-8 h-8" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white">
      {/* 导航栏 */}
      <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-yellow-600/30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="w-7 h-7 text-yellow-500" />
            <span className="font-bold text-lg bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
              LONDON GOLD
            </span>
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">挑战赛</span>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-yellow-400 border-b-2 border-yellow-400 pb-1">赛事报名</span>
          </div>
        </div>
      </div>

      {/* Banner */}
      <div className="bg-gradient-to-r from-yellow-900/30 via-yellow-800/20 to-transparent border-b border-yellow-600/20">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flame className="w-7 h-7 text-yellow-500" />
            黄金竞技场 · 勇者集结
          </h1>
          <p className="text-gray-400 mt-2">参与殿堂级伦敦金模拟赛事，与顶级交易员同台竞逐</p>
          <span className="inline-block mt-3 text-xs bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 px-3 py-1 rounded-full">
            2026 S2赛季 · 热力开启
          </span>
        </div>
      </div>

      {/* 赛事列表 */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
            <span className="ml-3 text-gray-400">加载赛事中...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="bg-gray-900/80 border border-yellow-600/30 rounded-2xl overflow-hidden hover:border-yellow-500/60 hover:-translate-y-1 transition-all duration-300"
              >
                {/* 顶部装饰线 */}
                <div className="h-1 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-600" />
                
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-yellow-200 to-yellow-400 bg-clip-text text-transparent">
                      {tournament.name}
                    </h3>
                    <div className="text-yellow-500">
                      {getIcon(tournament.icon)}
                    </div>
                  </div>

                  {/* 徽章 */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {tournament.badges.map((badge, index) => (
                      <span
                        key={index}
                        className={`text-xs px-2 py-1 rounded-full ${
                          badge.includes('🔥') || badge.includes('🏆') || badge.includes('⚡')
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-gray-800 text-gray-400'
                        }`}
                      >
                        {badge}
                      </span>
                    ))}
                  </div>

                  {/* 描述 */}
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                    {tournament.description}
                  </p>

                  {/* 详情 */}
                  <div className="space-y-1 mb-4 text-sm">
                    {tournament.details.map((detail, index) => (
                      <div key={index} className="flex justify-between text-gray-400">
                        <span>{detail.label}:</span>
                        <span className="text-yellow-300">{detail.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* 奖励提示 */}
                  <div className="bg-yellow-500/10 text-yellow-400 text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-1 mb-4">
                    <Gift className="w-3 h-3" />
                    {tournament.reward}
                  </div>

                  {/* 报名按钮 */}
                  <button
                    onClick={() => handleRegister(tournament)}
                    disabled={registering === tournament.id}
                    className="w-full bg-gradient-to-r from-yellow-700/80 to-yellow-600/80 hover:from-yellow-600 hover:to-yellow-500 text-black font-bold py-3 px-4 rounded-full flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {registering === tournament.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        处理中...
                      </>
                    ) : (
                      <>
                        {tournament.buttonText}
                        <Crown className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 底部提示 */}
        <div className="text-center mt-8 text-gray-500 text-sm border-t border-gray-800 pt-6">
          <p>每个赛事均为独立挑战，报名后解锁实时排名与专属奖励池</p>
        </div>
      </div>
    </div>
  );
}
