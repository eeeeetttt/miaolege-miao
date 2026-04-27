import type { Metadata, Viewport } from 'next';
import { Inspector } from 'react-dev-inspector';
import SessionProvider from '@/components/providers/session-provider';
import { Header } from '@/components/header';
import CustomerService from '@/components/customer-service';
import { ServiceWorkerRegistration } from '@/components/pwa-registration';
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
    default: '金火火 - 智能交易平台',
    template: '%s | 金火火',
  },
  description:
    '金火火是一个专业的智能交易平台。EA智能交易、技术指标、脚本工具，助力您的外汇交易。',
  keywords: [
    '金火火',
    '智能交易',
    'EA交易',
    'MT4',
    'MT5',
    '外汇交易',
    '技术指标',
    '自动跟单',
  ],
  authors: [{ name: 'MLGM Team' }],
  // 移除 generator 标签，避免显示技术栈信息
  // generator: 'Next.js',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '金火火',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: '金火火 - 智能交易平台',
    description: 'EA智能交易、技术指标、脚本工具，助力您的外汇交易',
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
        <ServiceWorkerRegistration />
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
                  © {new Date().getFullYear()} 金火火智能交易平台. All rights reserved.
                </p>
                <p className="text-sm">
                  EA智能交易 · 技术指标 · 脚本工具
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
