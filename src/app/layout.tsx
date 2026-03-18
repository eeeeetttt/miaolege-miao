import type { Metadata, Viewport } from 'next';
import { Inspector } from 'react-dev-inspector';
import SessionProvider from '@/components/providers/session-provider';
import { Header } from '@/components/header';
import CustomerService from '@/components/customer-service';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#7c3aed' },
    { media: '(prefers-color-scheme: dark)', color: '#7c3aed' },
  ],
};

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
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
      { url: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
      { url: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '喵了个喵',
  },
  formatDetection: {
    telephone: false,
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
