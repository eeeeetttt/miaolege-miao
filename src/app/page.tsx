'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Rocket, 
  TrendingUp, 
  Users, 
  Shield, 
  Zap, 
  Globe,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Link2
} from 'lucide-react';

export default function HomePage() {
  const { data: session } = useSession();

  const features = [
    {
      icon: Rocket,
      title: '创建星球',
      description: '成为星主，创建您的专属交易圈子，邀请信号发布者加入',
      color: 'from-purple-500 to-purple-600',
    },
    {
      icon: TrendingUp,
      title: '发布信号',
      description: '通过EA自动发送交易信号，让星球成员实时跟单',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: Users,
      title: '智能跟单',
      description: '加入星球，获取优质信号，一键跟单，灵活控制',
      color: 'from-green-500 to-green-600',
    },
    {
      icon: Shield,
      title: '安全可靠',
      description: '绑定MT账号，信号精确匹配，数据安全加密',
      color: 'from-orange-500 to-orange-600',
    },
  ];

  const stats = [
    { label: '活跃星球', value: '50+', icon: Globe },
    { label: '交易信号', value: '10000+', icon: BarChart3 },
    { label: '活跃用户', value: '1000+', icon: Users },
    { label: '成功跟单', value: '50000+', icon: TrendingUp },
  ];

  const steps = [
    { step: 1, title: '注册账号', desc: '创建您的账号并绑定MT账号' },
    { step: 2, title: '加入星球', desc: '浏览星球列表，选择感兴趣的星球加入' },
    { step: 3, title: '查看信号', desc: '实时查看星球内的交易信号' },
    { step: 4, title: '智能跟单', desc: '一键跟单，支持暂停和恢复' },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 text-gray-900 dark:text-white py-20 px-4">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5 dark:opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/50 backdrop-blur-sm rounded-full text-sm mb-6 text-purple-600 dark:text-purple-300">
            <Zap className="w-4 h-4" />
            <span>全新升级 · 支持MT4/MT5跟单</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            喵了个喵
            <br />
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">星球跟单平台</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-10 max-w-3xl mx-auto">
            创建您的专属星球，邀请信号发布者加入，
            <br className="hidden md:block" />
            让跟单者共享交易信号，实现共赢
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/planet">
              <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-lg px-8 py-6">
                浏览星球
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            {session ? (
              <Link href="/planet/create">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-lg px-8 py-6">
                  创建星球
                </Button>
              </Link>
            ) : (
              <Link href="/register">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-lg px-8 py-6">
                  立即注册
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 px-4 bg-white dark:bg-gray-900 border-b">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <stat.icon className="w-8 h-8 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-gray-600 dark:text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              核心功能
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              为信号发布者和跟单者打造的专业平台
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
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
      <section className="py-20 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              如何使用
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              简单四步，开始您的跟单之旅
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-lg">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">{item.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{item.desc}</p>
                
                {item.step < 4 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-purple-300 to-blue-300 dark:from-purple-700 dark:to-blue-700 -translate-x-8" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features List */}
      <section className="py-20 px-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                为什么选择喵了个喵？
              </h2>
              <div className="space-y-4">
                {[
                  '绑定MT4/MT5账号，精准匹配信号',
                  '支持暂停/恢复跟单，灵活控制',
                  '每个星球独立运营，权限清晰',
                  '信号实时推送，不错过任何机会',
                  '数据加密存储，安全可靠',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <Card className="border-2 border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-purple-600" />
                  MT账号绑定
                </CardTitle>
                <CardDescription>
                  绑定您的MT4/MT5账号，开始接收跟单信号
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg text-center">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    每位用户只能绑定一个MT账号
                  </p>
                  <Link href="/user">
                    <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                      立即绑定
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            准备好开始了吗？
          </h2>
          <p className="text-xl text-purple-100 mb-10">
            立即注册，开启您的星球之旅
          </p>
          <Link href={session ? '/planet' : '/register'}>
            <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50 text-lg px-8 py-6">
              {session ? '浏览星球' : '立即注册'}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
