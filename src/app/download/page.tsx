'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone, Download, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function DownloadPage() {
  const downloadApk = () => {
    // 直接下载 APK
    const link = document.createElement('a');
    link.href = '/jinhuohuo.app.apk';
    link.download = '金火银火.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-slate-900 text-white">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/user" className="p-2 hover:bg-white/10 rounded-lg transition">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold">下载安装包</h1>
        </div>

        {/* App Info */}
        <Card className="bg-white/10 border-white/20 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-center text-white flex items-center justify-center gap-3">
              <Smartphone className="w-8 h-8 text-purple-400" />
              金火银火
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-purple-200">
              一键安装到手机，随时随地使用
            </p>
            
            {/* Features */}
            <div className="grid grid-cols-3 gap-2 text-sm text-purple-200">
              <div className="flex flex-col items-center gap-1">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span>安全可靠</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span>流畅体验</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span>实时更新</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Download Button */}
        <Card className="bg-gradient-to-r from-purple-600 to-pink-600 border-0">
          <CardContent className="pt-6 pb-6 text-center">
            <Button 
              onClick={downloadApk}
              className="w-full h-14 text-lg bg-white text-purple-900 hover:bg-white/90 flex items-center justify-center gap-3"
              size="lg"
            >
              <Download className="w-6 h-6" />
              一键下载安装包
            </Button>
            <p className="text-sm text-white/70 mt-3">
              点击上方按钮下载 APK 安装包
            </p>
            <p className="text-xs text-white/50 mt-2">
              安装后可在桌面创建快捷方式
            </p>
          </CardContent>
        </Card>

        {/* Install Guide */}
        <Card className="bg-white/5 border-white/10 mt-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white">安装说明</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-purple-200 space-y-3">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-xs">1</span>
              <p>下载 APK 文件到手机</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-xs">2</span>
              <p>点击安装包进行安装</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-xs">3</span>
              <p>首次安装需允许「未知来源应用」</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-xs">4</span>
              <p>安装完成即可使用</p>
            </div>
          </CardContent>
        </Card>

        {/* Back Link */}
        <div className="text-center mt-8">
          <Link href="/user" className="text-purple-300 hover:text-white transition">
            返回个人中心
          </Link>
        </div>
      </div>
    </div>
  );
}
