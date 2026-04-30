'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Trophy,
  TrendingUp,
  Users,
  Shield,
  Zap,
  Target,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  MessageSquare,
  Gift,
  Crown,
  Award
} from 'lucide-react';

interface PrizeConfig {
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  prizes: {
    title: string;
    description: string;
    icon: string;
  }[];
}

export default function HomePage() {
  const { data: session } = useSession();
  const [prizeConfig, setPrizeConfig] = useState<PrizeConfig | null>(null);

  useEffect(() => {
    const fetchPrizeConfig = async () => {
      try {
        const res = await fetch('/api/challenge/prize-config');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.config) {
            setPrizeConfig(data.config);
          }
        }
      } catch (e) {
        console.error('获取奖品配置失败:', e);
      }
    };
    fetchPrizeConfig();
  }, []);

  const defaultPrizeConfig: PrizeConfig = {
    title: '丰厚奖励',
    subtitle: '通关即可获得',
    description: '完成挑战即可获得丰厚奖励，实盘账户 + 无责底薪 + 专业培训',
    imageUrl: '',
    prizes: [
      { title: '实盘账户', description: '获得真实账户进行交易', icon: 'account' },
      { title: '无责底薪', description: '合作期间享有无责底薪保障', icon: 'salary' },
      { title: '专业培训', description: '获得专业交易培训和技术支持', icon: 'training' },
    ],
  };

  const config = prizeConfig || defaultPrizeConfig;
  const iconMap: Record<string, React.ReactNode> = {
    account: <Trophy className="w-8 h-8" />,
    salary: <Crown className="w-8 h-8" />,
    training: <Award className="w-8 h-8" />,
  };

  const challengeFeatures = [
    {
      icon: Target,
      title: '挑战目标',
      description: '通过挑战将净值翻倍，即可通关',
      color: 'from-amber-500 to-orange-600',
    },
    {
      icon: Shield,
      title: '风险控制',
      description: '严格止损，控制回撤风险',
      color: 'from-red-500 to-pink-600',
    },
    {
      icon: Trophy,
      title: '丰厚奖励',
      description: '通关即可获得实盘账户，合作期间无责底薪',
      color: 'from-yellow-500 to-amber-600',
    },
    {
      icon: BarChart3,
      title: '实时追踪',
      description: '随时查看账户净值和交易数据，透明公开',
      color: 'from-blue-500 to-cyan-600',
    },
  ];

  const steps = [
    { step: 1, title: '报名参赛', desc: '支付报名费参加挑战' },
    { step: 2, title: '审核激活', desc: '等待管理员分配账号' },
    { step: 3, title: '开始挑战', desc: '使用分配账号进行交易' },
    { step: 4, title: '通关领奖', desc: '达成目标领取丰厚奖励' },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-gray-900 dark:via-amber-950/30 dark:to-orange-950/30 text-gray-900 dark:text-white py-20 px-4">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5 dark:opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D97706' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-orange-400/20 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto text-center">
          {/* 标签和价格 */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/50 backdrop-blur-sm rounded-full text-sm text-amber-700 dark:text-amber-300">
              <Zap className="w-4 h-4" />
              <span>K线征途挑战赛 · 火热进行中</span>
            </div>
          </div>

          <div className="flex justify-center mb-6">
            <Trophy className="w-20 h-20 text-amber-500 animate-pulse" />
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            K线征途
            <br />
            <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">挑战赛</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-6 max-w-3xl mx-auto">
            挑战净值翻倍！
            <br className="hidden md:block" />
            通关即有机会获得巨额奖励
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {session ? (
              <Link href="/challenge">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-lg px-8 py-6 shadow-lg shadow-amber-500/30">
                  <Trophy className="mr-2 w-5 h-5" />
                  立即报名挑战
                </Button>
              </Link>
            ) : (
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-lg px-8 py-6 shadow-lg shadow-amber-500/30">
                  注册参赛
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            )}
            <Link href="/challenge/hall">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 text-lg px-8 py-6">
                <Users className="mr-2 w-5 h-5" />
                查看挑战大厅
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              如何参赛
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              简单四步，开启您的挑战之旅
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-lg shadow-amber-500/30">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">{item.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{item.desc}</p>
                
                {item.step < 4 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-amber-300 to-orange-300 dark:from-amber-700 dark:to-orange-700 -translate-x-8" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Prize Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-amber-950/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Gift className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {config.title}
            </h2>
            <p className="text-xl text-amber-600 dark:text-amber-400 mb-2">
              {config.subtitle}
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {config.description}
            </p>
          </div>

          {config.imageUrl && (
            <div className="mb-12 text-center">
              <img 
                src={config.imageUrl} 
                alt="奖品图片" 
                className="max-w-full md:max-w-2xl mx-auto rounded-lg shadow-xl"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {config.prizes.map((prize, index) => (
              <div 
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-amber-200 dark:border-amber-800 text-center hover:shadow-xl transition-shadow"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 text-white">
                  {iconMap[prize.icon] || <Trophy className="w-8 h-8" />}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {prize.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {prize.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <Trophy className="w-16 h-16 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            准备好挑战自我了吗？
          </h2>
          <p className="text-xl text-amber-100 mb-10">
            用您的交易实力，赢取丰厚奖励
          </p>
          {session ? (
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/challenge">
                <Button size="lg" className="bg-white text-amber-600 hover:bg-amber-50 text-lg px-8 py-6">
                  <Trophy className="mr-2 w-5 h-5" />
                  立即报名
                </Button>
              </Link>
              <Link href="/challenge/hall">
                <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/20 text-lg px-8 py-6">
                  <Users className="mr-2 w-5 h-5" />
                  查看大厅
                </Button>
              </Link>
            </div>
          ) : (
            <Link href="/register">
              <Button size="lg" className="bg-white text-amber-600 hover:bg-amber-50 text-lg px-8 py-6">
                立即注册参赛
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
