'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Download, 
  Smartphone, 
  Shield, 
  Zap, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';

export default function DownloadPage() {
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'success' | 'error'>('idle');
  const [isAndroid, setIsAndroid] = useState(false);
  const [fileSize, setFileSize] = useState<string>('');

  useEffect(() => {
    // 检测是否为安卓设备
    const userAgent = navigator.userAgent.toLowerCase();
    setIsAndroid(userAgent.includes('android'));
    
    // 获取文件大小
    fetch('/jinhuohuo.apk')
      .then(res => {
        const size = res.headers.get('content-length');
        if (size) {
          const mb = (parseInt(size) / 1024 / 1024).toFixed(1);
          setFileSize(mb);
        }
      })
      .catch(console.error);
  }, []);

  const handleDownload = async () => {
    setDownloadStatus('downloading');
    
    try {
      const response = await fetch('/jinhuohuo.apk');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'jinhuohuo.apk';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setDownloadStatus('success');
      setTimeout(() => setDownloadStatus('idle'), 3000);
    } catch (error) {
      console.error('Download failed:', error);
      setDownloadStatus('error');
      setTimeout(() => setDownloadStatus('idle'), 3000);
    }
  };

  const features = [
    { icon: Shield, text: '安全可靠' },
    { icon: Zap, text: '快速响应' },
    { icon: RefreshCw, text: '实时更新' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center p-6">
      {/* Logo 和标题 */}
      <div className="text-center mb-8">
        <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
          <span className="text-4xl">🔥</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          金火火
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          星球跟单平台 v1.0
        </p>
      </div>

      {/* 下载卡片 */}
      <Card className="w-full max-w-md mb-8 shadow-xl">
        <CardContent className="p-6">
          {/* 功能特点 */}
          <div className="flex justify-center gap-6 mb-6">
            {features.map((item, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-1">
                  <item.icon className="w-5 h-5 text-amber-600" />
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400">{item.text}</span>
              </div>
            ))}
          </div>

          {/* 下载按钮 */}
          <Button
            onClick={handleDownload}
            disabled={downloadStatus === 'downloading'}
            className="w-full h-14 text-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
          >
            {downloadStatus === 'downloading' ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                下载中...
              </>
            ) : downloadStatus === 'success' ? (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                下载完成
              </>
            ) : downloadStatus === 'error' ? (
              <>
                <XCircle className="w-5 h-5 mr-2" />
                下载失败，点击重试
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                下载安装包 ({fileSize}MB)
              </>
            )}
          </Button>

          {/* 文件信息 */}
          <div className="mt-4 text-center text-sm text-gray-500">
            <p>APK 大小：{fileSize}MB</p>
            <p className="mt-1">版本：v1.0.0</p>
          </div>
        </CardContent>
      </Card>

      {/* 安装说明 */}
      <Card className="w-full max-w-md bg-white/80 dark:bg-gray-800/80">
        <CardContent className="p-4">
          <h2 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-amber-500" />
            安装说明
          </h2>
          <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <li className="flex gap-2">
              <span className="font-bold text-amber-600">1.</span>
              点击上方下载按钮，等待下载完成
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-amber-600">2.</span>
              下载完成后，点击通知或打开"下载"文件夹
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-amber-600">3.</span>
              点击 apk 文件，选择"安装"
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-amber-600">4.</span>
              如果提示"禁止安装未知应用"，请先开启权限
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* 底部提示 */}
      <p className="mt-6 text-xs text-gray-500 text-center">
        {isAndroid 
          ? '检测到您正在使用安卓手机，点击下载即可安装'
          : '请在安卓手机上打开此页面下载'
        }
      </p>
    </div>
  );
}
