'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐱</span>
            <h1 className="text-xl font-bold">喵了个喵</h1>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/planet">
              <Button variant="ghost">星球列表</Button>
            </Link>
            {session ? (
              <>
                <Link href="/planet/my">
                  <Button variant="ghost">我的星球</Button>
                </Link>
                <Link href="/user">
                  <Button>个人中心</Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">登录</Button>
                </Link>
                <Link href="/register">
                  <Button>注册</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            星球跟单平台
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            创建您的专属星球，邀请信号发布者加入，与跟单者共享交易信号，实现共赢
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/planet">
              <Button size="lg">浏览星球</Button>
            </Link>
            {session && (
              <Link href="/planet/create">
                <Button size="lg" variant="outline">创建星球</Button>
              </Link>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🌟</span>
                创建星球
              </CardTitle>
              <CardDescription>
                成为星主，创建您的专属交易圈子
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                设置门票价格或邀请码，邀请信号发布者加入，管理星球成员
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📊</span>
                发布信号
              </CardTitle>
              <CardDescription>
                成为发布者，分享您的交易信号
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                通过 EA 自动发送信号，让星球成员实时跟单
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">💰</span>
                跟单获利
              </CardTitle>
              <CardDescription>
                加入星球，获取优质交易信号
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                购买门票或使用邀请码加入星球，查看信号并跟单
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-center mb-12">如何使用</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: 1, title: '注册账号', desc: '创建您的账号' },
            { step: 2, title: '创建/加入星球', desc: '创建或加入感兴趣的星球' },
            { step: 3, title: '发布/接收信号', desc: '发布或接收交易信号' },
            { step: 4, title: '跟单获利', desc: '根据信号进行跟单' },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                {item.step}
              </div>
              <h4 className="font-semibold mb-2">{item.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <CardContent className="py-12 text-center">
            <h3 className="text-2xl font-bold mb-4">准备好开始了吗？</h3>
            <p className="mb-6 opacity-90">立即注册，开启您的星球之旅</p>
            <Link href={session ? '/planet' : '/register'}>
              <Button size="lg" variant="secondary">
                {session ? '浏览星球' : '立即注册'}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-gray-600 dark:text-gray-400">
          <p>© 2024 喵了个喵星球跟单平台. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
