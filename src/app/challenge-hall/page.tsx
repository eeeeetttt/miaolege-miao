'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, Trophy, Flame, Mountain, Calendar, Users, Gift, ChevronRight, Zap, Shield, Star, Medal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Challenge {
  id: string;
  name: string;
  icon: React.ReactNode;
  badges: string[];
  description: string;
  details: { label: string; value: string }[];
  reward: string;
  status: string;
  buttonText: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
  fee?: string;
}

export default function ChallengeHallPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'all' | 'free' | 'hot'>('all');

  const challenges: Challenge[] = [
    {
      id: 'ladder',
      name: '天梯赛',
      icon: <Trophy className="w-8 h-8" />,
      badges: ['🏆 赛季积分', '🔥 全民参与'],
      description: '长期开放分段晋升，根据胜率与收益率动态升降段位，争夺"最强王者"头衔。每日更新天梯榜。',
      details: [
        { label: '周期', value: '每月赛季' },
        { label: '参赛费', value: '免费' },
        { label: '奖励池', value: '8,888 USD' }
      ],
      reward: '黄金段位专属勋章 + 现金奖励',
      status: 'hot',
      buttonText: '立即报名',
      difficulty: 'easy',
      fee: '免费'
    },
    {
      id: 'daily',
      name: '每日挑战赛',
      icon: <Zap className="w-8 h-8" />,
      badges: ['⏳ 24小时一轮', '🎯 快速竞技'],
      description: '每个自然日独立结算，短线快节奏，满足最低交易笔数即有奖，适合所有玩家。',
      details: [
        { label: '报名时间', value: '每日00:00-20:00' },
        { label: '本金', value: '模拟金10,000' },
        { label: '冠军奖', value: '500 USD' }
      ],
      reward: '每日前10名获得京东卡/黄金积分',
      status: 'hot',
      buttonText: '今日报名',
      difficulty: 'easy',
      fee: '免费'
    },
    {
      id: 'monthly',
      name: '月度总决赛',
      icon: <Calendar className="w-8 h-8" />,
      badges: ['🏅 精英集结', '💎 高额奖金'],
      description: '每月底压轴大战，由天梯赛和每日赛积分榜前列选手自动入围，冠军直接晋升大师赛。',
      details: [
        { label: '日期', value: '每月27-30日' },
        { label: '规模', value: '最多200席' },
        { label: '奖金池保底', value: '20,000 USD' }
      ],
      reward: '月度黄金腰带 + 定制奖杯 + 大额赠金',
      status: '',
      buttonText: '备战报名',
      difficulty: 'medium',
      fee: '100星球币'
    },
    {
      id: 'master',
      name: '大师邀请赛',
      icon: <Shield className="w-8 h-8" />,
      badges: ['🎫 邀请制', '👑 殿堂对决'],
      description: '仅限往届优胜者/特邀高手参与，巅峰级别策略博弈，胜者载入名人堂特别版块。',
      details: [
        { label: '开赛', value: '季度一次' },
        { label: '门槛', value: '历史战绩认证' },
        { label: '保底奖', value: '3,000 USD' }
      ],
      reward: '大师权杖 NFT + 高额奖池分成',
      status: 'invite',
      buttonText: '申请报名',
      difficulty: 'expert',
      fee: '500星球币'
    },
    {
      id: 'peak',
      name: '巅峰赛',
      icon: <Mountain className="w-8 h-8" />,
      badges: ['⚠️ 顶级难度', '🏔️ 封神之战'],
      description: '年度最高规格赛事，高杠杆、高波动环境，只对胜率>60%选手开放，万亿级模拟资金博弈。',
      details: [
        { label: '赛程', value: '季度一次' },
        { label: '最小权益', value: '50,000 USD' },
        { label: '冠军奖励', value: '保时捷+黄金' }
      ],
      reward: '巅峰之戒 + 冠军总奖池50%',
      status: 'elite',
      buttonText: '验证报名',
      difficulty: 'expert',
      fee: '1000星球币'
    },
    {
      id: 'beginner',
      name: '新手试炼赛',
      icon: <Star className="w-8 h-8" />,
      badges: ['🌱 新手专属', '🎁 入场礼'],
      description: '专为新手设计的入门赛事，完成新手教程即可参与，赢取丰厚新手礼包。',
      details: [
        { label: '周期', value: '长期开放' },
        { label: '参赛费', value: '免费' },
        { label: '参与奖', value: '100星球币' }
      ],
      reward: '新手大礼包 + 专属称号',
      status: 'hot',
      buttonText: '进入试炼',
      difficulty: 'easy',
      fee: '免费'
    }
  ];

  const filteredChallenges = challenges.filter(challenge => {
    if (activeTab === 'free') return challenge.fee === '免费';
    if (activeTab === 'hot') return challenge.status === 'hot';
    return true;
  });

  const handleRegister = (challenge: Challenge) => {
    if (challenge.id === 'master') {
      alert('🏅【大师邀请赛】报名需资格审核，已提交申请，请联系客服或等待邀请码验证。');
    } else if (challenge.id === 'peak') {
      alert('⚡ 巅峰赛报名需验证交易资质，请先完成模拟认证考核。');
    } else if (challenge.id === 'beginner') {
      router.push('/challenge/beginner');
    } else {
      router.push(`/challenge/${challenge.id}`);
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-orange-400';
      case 'expert': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* 顶部导航 */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-amber-500/30">
          <div className="flex items-center gap-3">
            <Crown className="w-8 h-8 text-amber-400" />
            <span className="font-bold text-xl" style={{ fontFamily: 'Orbitron, monospace' }}>
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">
                金&nbsp;融&nbsp;挑&nbsp;战
              </span>
            </span>
            <span className="text-xs bg-amber-500/20 px-2 py-1 rounded-full border border-amber-500/50">
              挑战赛·大厅
            </span>
          </div>
          <div className="flex gap-4 text-sm">
            <button className="text-amber-400 font-medium border-b-2 border-amber-400 pb-1">竞技大厅</button>
            <button className="text-slate-400 hover:text-amber-300">赛事报名</button>
            <button className="text-slate-400 hover:text-amber-300">名人堂</button>
          </div>
        </div>

        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl p-6 mb-8 border border-amber-500/50"
          style={{
            background: 'linear-gradient(105deg, rgba(0,0,0,0.6) 0%, rgba(16,12,8,0.8) 100%), url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d4af37\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
          }}
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-200"></div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-400" />
            <span className="bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
              黄金竞技场 · 勇者集结
            </span>
          </h2>
          <p className="text-slate-300 mt-2 max-w-xl">
            立即报名，参与殿堂级模拟赛事，与顶级交易员同台竞逐，赢取荣耀与实物豪礼。
          </p>
          <div className="inline-block mt-4 bg-amber-500/20 backdrop-blur-sm rounded-full px-4 py-1 text-sm border border-amber-500/50">
            <Medal className="w-4 h-4 inline mr-1" />
            2025 S1赛季 · 热力开启
          </div>
        </div>

        {/* 筛选标签 */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-amber-500 text-slate-900'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            全部赛事
          </button>
          <button
            onClick={() => setActiveTab('free')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === 'free'
                ? 'bg-green-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            免费参赛
          </button>
          <button
            onClick={() => setActiveTab('hot')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === 'hot'
                ? 'bg-red-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            热门赛事
          </button>
        </div>

        {/* 赛事网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChallenges.map((challenge) => (
            <Card
              key={challenge.id}
              className="relative overflow-hidden bg-slate-900/80 backdrop-blur border-amber-500/30 hover:border-amber-500/70 transition-all hover:-translate-y-2 hover:shadow-2xl group"
            >
              {/* 顶部金线装饰 */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-200"></div>

              <CardContent className="p-5">
                {/* 标题行 */}
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent"
                    style={{ fontFamily: 'Orbitron, monospace' }}>
                    {challenge.name}
                  </h3>
                  <div className="text-amber-400 group-hover:scale-110 transition-transform">
                    {challenge.icon}
                  </div>
                </div>

                {/* 徽章 */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {challenge.badges.map((badge, index) => (
                    <span
                      key={index}
                      className={`text-xs px-2 py-1 rounded-full border ${
                        badge.includes('🔥') || badge.includes('🏆') || badge.includes('🌱')
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-slate-800 text-slate-300 border-slate-600'
                      }`}
                    >
                      {badge}
                    </span>
                  ))}
                  {challenge.status === 'invite' && (
                    <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50">
                      🔑 邀请专属
                    </span>
                  )}
                  {challenge.status === 'elite' && (
                    <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/50">
                      💀 高难度
                    </span>
                  )}
                </div>

                {/* 描述 */}
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  {challenge.description}
                </p>

                {/* 详情 */}
                <div className="border-t border-dashed border-amber-500/20 pt-3 mb-4 space-y-1">
                  {challenge.details.map((detail, index) => (
                    <div key={index} className="flex justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <span className="text-amber-500">●</span> {detail.label}
                      </span>
                      <span className={`font-medium ${getDifficultyColor(challenge.difficulty)}`}>
                        {detail.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 奖励预览 */}
                <div className="bg-amber-500/10 rounded-full px-3 py-1 text-xs text-amber-300 mb-4 inline-block">
                  <Gift className="w-3 h-3 inline mr-1" />
                  奖励：{challenge.reward}
                </div>

                {/* 难度和费用 */}
                <div className="flex justify-between items-center mb-4 text-xs">
                  <span className={`font-medium ${getDifficultyColor(challenge.difficulty)}`}>
                    难度：{challenge.difficulty === 'easy' ? '★☆☆☆☆' : challenge.difficulty === 'medium' ? '★★☆☆☆' : challenge.difficulty === 'hard' ? '★★★☆☆' : '★★★★★'}
                  </span>
                  <span className="text-slate-400">
                    参赛费：<span className={challenge.fee === '免费' ? 'text-green-400' : 'text-amber-400'}>{challenge.fee}</span>
                  </span>
                </div>

                {/* 报名按钮 */}
                <button
                  onClick={() => handleRegister(challenge)}
                  className="w-full bg-gradient-to-r from-slate-800 to-slate-900 border border-amber-500 rounded-full py-3 font-bold text-amber-300 flex items-center justify-center gap-2 hover:from-amber-500 hover:to-amber-600 hover:text-slate-900 transition-all group"
                >
                  <span>{challenge.buttonText}</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 底部说明 */}
        <div className="mt-8 text-center pt-6 border-t border-amber-500/20">
          <p className="text-slate-500 text-sm">
            <Flame className="w-4 h-4 inline mr-1 text-amber-500" />
            每个赛事均为独立挑战，报名后解锁实时排名与专属奖励池 | 规则详见赛事详情页
          </p>
        </div>
      </div>
    </div>
  );
}
