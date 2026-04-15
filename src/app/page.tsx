'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { 
  Trophy,
  TrendingUp,
  Users,
  Zap,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export default function HomePage() {
  const { data: session } = useSession();

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
