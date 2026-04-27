'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, Shield, Zap, Heart } from 'lucide-react';

export default function AppDownloadPage() {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    // 直接下载APK
    window.location.href = '/jinhuohuo.apk';
    setTimeout(() => setDownloading(false), 2000);
  };

  const features = [
    { icon: <Zap className="w-6 h-6" />, title: '实时跟单', desc: '第一时间获取交易信号' },
    { icon: <Shield className="w-6 h-6" />, title: '安全可靠', desc: '官方正版应用' },
    { icon: <Smartphone className="w-6 h-6" />, title: '操作简便', desc: '一键跟单，轻松上手' },
  ];

  return (
    <div className="container mx-auto py-12 px-4 max-w-2xl">
      <div className="text-center mb-8">
        <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
          <span className="text-4xl">🔥</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">金火火 App</h1>
        <p className="text-muted-foreground">下载金火火交易跟单应用</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>功能特点</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  {f.icon}
                </div>
                <h3 className="font-medium text-sm">{f.title}</h3>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>立即下载</CardTitle>
          <CardDescription>版本 1.0.0 | Android 8.0 及以上</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleDownload} 
            disabled={downloading}
            className="w-full h-12 text-lg bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
          >
            {downloading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                下载中...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                下载安装包
              </span>
            )}
          </Button>
          
          <div className="text-center text-sm text-muted-foreground">
            <p>下载后请在设置中允许安装未知来源应用</p>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-center text-muted-foreground">
              如下载遇到问题，请联系客服
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
        <Heart className="w-4 h-4" />
        <span>金火火 - 让交易更简单</span>
      </div>
    </div>
  );
}
