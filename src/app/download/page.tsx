'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { 
  Smartphone, 
  Monitor, 
  Apple,
  Download,
  ArrowLeft,
  Zap,
  Shield,
  Star,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

export default function DownloadPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);
  const [apkUrl, setApkUrl] = useState<string | null>(null);

  useEffect(() => {
    // 检查是否有预生成的 APK
    checkApkExists();
  }, []);

  const checkApkExists = async () => {
    try {
      const res = await fetch('/api/download-apk');
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          setApkUrl(url);
          setDownloadReady(true);
        }
      }
    } catch (e) {
      console.log('APK not ready, will use PWA Builder');
    } finally {
      setIsLoading(false);
    }
  };

  const openPWABuilder = () => {
    window.open('https://www.pwabuilder.com/generate?siteUrl=https://jinhuohuo.coze.site&platforms=android', '_blank');
  };

  const features = [
    { icon: <Zap className="w-4 h-4" />, text: '秒开应用，无需更新' },
    { icon: <Shield className="w-4 h-4" />, text: '安全可靠，原生体验' },
    { icon: <Star className="w-4 h-4" />, text: '离线可用，省电流畅' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/user">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              下载 APP
            </h1>
            <p className="text-sm text-gray-500">
              安装到手机
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-4 mb-6 justify-center">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              {f.icon}
              <span>{f.text}</span>
            </div>
          ))}
        </div>

        {/* Android Download Card */}
        <Card className="mb-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white">
                <Smartphone className="w-10 h-10" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Android
                  </h3>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    推荐
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  适用于 Android 手机
                </p>
              </div>
            </div>

            {isLoading ? (
              <Button disabled className="w-full bg-gradient-to-r from-green-500 to-emerald-600">
                <Spinner className="w-4 h-4 mr-2" />
                正在生成...
              </Button>
            ) : downloadReady && apkUrl ? (
              <Button asChild className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
                <a href={apkUrl} download="金火银火.apk">
                  <Download className="w-4 h-4 mr-2" />
                  下载安装包
                </a>
              </Button>
            ) : (
              <Button onClick={openPWABuilder} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
                <ExternalLink className="w-4 h-4 mr-2" />
                在线生成并下载 APK
              </Button>
            )}

            <div className="mt-4 flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>一次生成，长期使用</span>
            </div>
          </CardContent>
        </Card>

        {/* iOS Help */}
        <Card className="mb-6 bg-gray-50 dark:bg-gray-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Apple className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              <h3 className="font-medium text-gray-900 dark:text-white">
                iPhone / iOS
              </h3>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              iOS 版本正在开发中，敬请期待
            </p>
            <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <strong>iOS 临时方案：</strong>
              <ol className="mt-2 space-y-1 list-decimal list-inside">
                <li>用 Safari 打开网站</li>
                <li>点击底部分享按钮</li>
                <li>选择「添加到主屏幕」</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Help Card */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              安装说明
            </h4>
            <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-2 list-decimal list-inside">
              <li>点击「在线生成并下载 APK」按钮</li>
              <li>在新页面等待 APK 生成完成（约1-2分钟）</li>
              <li>点击「Download Package」下载</li>
              <li>下载完成后点击安装包安装</li>
              <li>首次安装需要允许「未知来源应用」</li>
            </ol>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>版本 1.0.0</p>
          <p className="mt-1">金火银火星球跟单平台</p>
        </div>
      </div>
    </div>
  );
}
