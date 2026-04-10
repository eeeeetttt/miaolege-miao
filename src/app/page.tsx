'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
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
  Star,
  Clock,
  DollarSign,
  BarChart3,
  Medal,
  Crown
} from 'lucide-react';

export default function HomePage() {
  const { data: session } = useSession();

  const challengeFeatures = [
    {
      icon: Target,
      title: '挑战目标',
      description: '初始净值1000，通过挑战将净值翻倍至2000即可通关',
      color: 'from-amber-500 to-orange-600',
    },
    {
      icon: Shield,
      title: '风险控制',
      description: '净值低于100将判定挑战失败，严格止损保护您的资金',
      color: 'from-red-500 to-pink-600',
    },
    {
      icon: Trophy,
      title: '丰厚奖励',
      description: '通关即可获得100000星球币奖励，成就交易梦想',
      color: 'from-yellow-500 to-amber-600',
    },
    {
      icon: BarChart3,
      title: '实时追踪',
      description: '随时查看账户净值和交易数据，透明公开',
      color: 'from-blue-500 to-cyan-600',
    },
  ];

  const stats = [
    { label: '挑战选手', value: '200+', icon: Users },
    { label: '通关人数', value: '45+', icon: Medal },
    { label: '总奖励发放', value: '450万+', icon: Star },
    { label: '平均收益率', value: '85%', icon: TrendingUp },
  ];

  const levels = [
    { level: 1, name: '初出茅庐', target: 1200, initial: 1000, reward: 5000 },
    { level: 2, name: '小试牛刀', target: 1500, initial: 1200, reward: 10000 },
    { level: 3, name: '渐入佳境', target: 1800, initial: 1500, reward: 20000 },
    { level: 4, name: '炉火纯青', target: 2000, initial: 1800, reward: 65000 },
  ];

  const steps = [
    { step: 1, title: '报名参赛', desc: '支付1000星球币报名费' },
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
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/50 backdrop-blur-sm rounded-full text-sm mb-6 text-amber-700 dark:text-amber-300">
            <Zap className="w-4 h-4" />
            <span>K线征途挑战赛 · 火热进行中</span>
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
            支付1000星球币，挑战净值翻倍！
            <br className="hidden md:block" />
            通关即有机会获得100000星球币奖励
          </p>

          <div className="flex items-center justify-center gap-4 mb-10">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/50 rounded-full">
              <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300 font-medium">目标净值: 2000</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/50 rounded-full">
              <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-red-700 dark:text-red-300 font-medium">失败底线: 100</span>
            </div>
          </div>

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

      {/* Stats Section */}
      <section className="py-12 px-4 bg-white dark:bg-gray-900 border-b border-amber-200 dark:border-amber-800">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <stat.icon className="w-8 h-8 mx-auto mb-2 text-amber-600 dark:text-amber-400" />
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-gray-600 dark:text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Levels Preview Section */}
      <section className="py-20 px-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              挑战关卡
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              四个关卡，逐步进阶，最终达成财富目标
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {levels.map((level) => (
              <Card key={level.level} className="relative overflow-hidden border-0 shadow-lg">
                <div className={`absolute inset-0 bg-gradient-to-br ${level.level === 4 ? 'from-amber-500 to-orange-600' : level.level === 3 ? 'from-yellow-500 to-amber-500' : level.level === 2 ? 'from-blue-500 to-cyan-500' : 'from-green-500 to-emerald-500'} opacity-90`} />
                <CardHeader className="relative z-10 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-white/20 text-white border-0">第{level.level}关</Badge>
                    {level.level === 4 && <Crown className="w-6 h-6" />}
                  </div>
                  <CardTitle className="text-2xl">{level.name}</CardTitle>
                </CardHeader>
                <CardContent className="relative z-10 text-white">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="opacity-80">初始净值</span>
                      <span className="font-bold">{level.initial}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-80">目标净值</span>
                      <span className="font-bold">{level.target}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-80">通关奖励</span>
                      <span className="font-bold">{level.reward.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              为什么参加挑战赛？
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              专业、公平、奖励丰厚
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {challengeFeatures.map((feature, idx) => (
              <Card key={idx} className="group hover:shadow-xl transition-all duration-300 border-0 bg-white dark:bg-gray-800">
                <CardHeader>
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
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

      {/* Rules Section */}
      <section className="py-20 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <Card className="border-2 border-amber-200 dark:border-amber-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Shield className="w-6 h-6 text-amber-600" />
                挑战规则
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  '报名费：1000星球币（扣除后不可退还）',
                  '初始净值：1000美元',
                  '通关条件：净值达到2000美元',
                  '失败条件：净值低于100美元',
                  '交易账户由平台统一分配，禁止私自转让',
                  '禁止对冲、剥头皮等违规交易行为',
                  '通关奖励：100000星球币',
                ].map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{rule}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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

// Badge component
function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}
