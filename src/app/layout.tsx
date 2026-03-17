import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import SessionProvider from '@/components/providers/session-provider';
import { Header } from '@/components/header';
import CustomerService from '@/components/customer-service';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '喵了个喵 - 星球跟单平台',
    template: '%s | 喵了个喵',
  },
  description:
    '喵了个喵是一个基于交易信号跟单的社区化平台。创建星球、发布信号、智能跟单，实现交易信号共享与跟单。',
  keywords: [
    '喵了个喵',
    '跟单平台',
    '交易信号',
    'MT4',
    'MT5',
    '外汇跟单',
    '交易社区',
    '星球',
  ],
  authors: [{ name: 'MLGM Team' }],
  generator: 'Next.js',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🐱</text></svg>',
  },
  openGraph: {
    title: '喵了个喵 - 星球跟单平台',
    description: '创建星球、发布信号、智能跟单，实现交易信号共享与跟单',
    type: 'website',
    locale: 'zh_CN',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`antialiased bg-gray-50 dark:bg-gray-900`}>
        <SessionProvider>
          {isDev && <Inspector />}
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <footer className="border-t bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm py-8">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600 dark:text-gray-400">
                <p className="mb-2">
                  © {new Date().getFullYear()} 喵了个喵星球跟单平台. All rights reserved.
                </p>
                <p className="text-sm">
                  创建星球 · 发布信号 · 智能跟单
                </p>
              </div>
            </footer>
          </div>
          {/* 在线客服 */}
          <CustomerService qq="497209390" />
        </SessionProvider>
      </body>
    </html>
  );
}
