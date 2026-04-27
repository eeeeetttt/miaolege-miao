'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Smartphone, 
  Code, 
  Terminal, 
  CheckCircle2,
  ExternalLink,
  FileArchive,
  AlertCircle,
  Share2,
  Plus
} from 'lucide-react';

export default function DownloadPage() {
  const [downloadUrl, setDownloadUrl] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  
  useEffect(() => {
    // 获取当前域名
    const domain = window.location.origin;
    setDownloadUrl(`${domain}/download/jinhuohuo-android-app.tar.gz`);
    setSiteUrl(domain);
  }, []);

  const buildSteps = [
    {
      step: 1,
      title: '安装 Android Studio',
      description: '从官网下载并安装 Android Studio (最新版本)',
      command: 'https://developer.android.com/studio',
    },
    {
      step: 2,
      title: '下载项目源码',
      description: '点击上方按钮下载项目压缩包，解压到本地目录',
      command: 'tar -xzvf jinhuohuo-android-app.tar.gz',
    },
    {
      step: 3,
      title: '用 Android Studio 打开项目',
      description: '打开 Android Studio，选择 "Open an existing project"，选择解压后的 android-app 目录',
      command: null,
    },
    {
      step: 4,
      title: '等待 Gradle 同步',
      description: '首次打开会自动下载依赖，请耐心等待（可能需要5-10分钟）',
      command: null,
    },
    {
      step: 5,
      title: '构建 APK',
      description: '点击菜单 Build > Build Bundle(s) / APK(s) > Build APK(s)',
      command: null,
    },
    {
      step: 6,
      title: '获取 APK 文件',
      description: '构建完成后，APK 位于 app/build/outputs/apk/debug/',
      command: 'app/build/outputs/apk/debug/MiaoLeGeMiao_1.0.0_debug_*.apk',
    },
  ];

  const pwaSteps = [
    {
      step: 1,
      title: '打开网站',
      description: `用 Chrome 或 Safari 浏览器打开：${siteUrl}`,
    },
    {
      step: 2,
      title: '点击分享按钮',
      description: '点击浏览器底部的"分享"按钮（或菜单中的"添加到主屏幕"）',
    },
    {
      step: 3,
      title: '添加到主屏幕',
      description: '选择"添加到主屏幕"或"安装应用"',
    },
    {
      step: 4,
      title: '完成',
      description: '桌面上会出现"金火火"图标，点击即可使用',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 mb-4">
            <Smartphone className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">安装到手机</h1>
          <p className="text-gray-600 dark:text-gray-400">
            金火火 - 智能交易平台
          </p>
        </div>

        {/* PWA 方式 - 推荐 */}
        <Card className="mb-8 border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-green-700 dark:text-green-400">方式一：添加到主屏幕（推荐）</CardTitle>
                <CardDescription className="text-green-600 dark:text-green-500">
                  无需下载安装，像App一样使用
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pwaSteps.map((step) => (
                <div key={step.step} className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm">
                    {step.step}
                  </div>
                  <div>
                    <h3 className="font-medium text-green-800 dark:text-green-300">{step.title}</h3>
                    <p className="text-sm text-green-600 dark:text-green-400">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => window.open(siteUrl, '_blank')}
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                打开网站
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-green-300 dark:border-green-700"
                onClick={() => {
                  navigator.clipboard.writeText(siteUrl);
                  alert('网站地址已复制：' + siteUrl);
                }}
              >
                复制网址
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* APK 方式 */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center">
                <FileArchive className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle>方式二：构建 APK 安装包</CardTitle>
                <CardDescription>
                  需要在电脑上使用 Android Studio 构建
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle>说明</AlertTitle>
              <AlertDescription>
                服务器环境无法直接生成APK。请下载项目源码，在您自己的电脑上使用 Android Studio 构建 APK 安装包。
              </AlertDescription>
            </Alert>

            <div className="text-center mb-6">
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                onClick={() => window.open(downloadUrl, '_blank')}
              >
                <Download className="w-5 h-5 mr-2" />
                下载 Android 项目源码
              </Button>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-lg mb-4">构建步骤：</h3>
              {buildSteps.map((step) => (
                <div
                  key={step.step}
                  className="flex gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">
                      {step.step}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {step.description}
                    </p>
                    {step.command && (
                      <code className="block p-2 mt-2 bg-gray-200 dark:bg-gray-700 rounded text-xs overflow-x-auto">
                        {step.command}
                      </code>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-purple-500" />
              应用信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">版本</p>
                <p className="font-bold">1.0.0</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">最低系统</p>
                <p className="font-bold">Android 7.0</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">目标系统</p>
                <p className="font-bold">Android 14</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">包名</p>
                <p className="font-bold text-sm">com.jinhuohuo</p>
              </div>
            </div>

            {/* Features */}
            <div className="mt-6">
              <h4 className="font-semibold mb-3">应用功能</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  'WebView容器加载网页应用',
                  '全屏沉浸式体验',
                  '文件下载支持',
                  '启动页动画',
                  '深色模式适配',
                  '网络错误处理',
                  '退出确认对话框',
                  '自定义应用图标',
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tech Stack */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5 text-purple-500" />
              技术栈
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Kotlin</Badge>
              <Badge variant="secondary">Android SDK 34</Badge>
              <Badge variant="secondary">WebView</Badge>
              <Badge variant="secondary">Material Design</Badge>
              <Badge variant="secondary">Gradle 8.2</Badge>
              <Badge variant="secondary">AndroidX</Badge>
              <Badge variant="secondary">PWA</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>如有问题，请联系技术支持</p>
        </div>
      </div>
    </div>
  );
}
