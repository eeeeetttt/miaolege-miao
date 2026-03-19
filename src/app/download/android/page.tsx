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
  AlertCircle
} from 'lucide-react';

export default function DownloadPage() {
  const [downloadUrl, setDownloadUrl] = useState('');
  
  useEffect(() => {
    // 获取当前域名
    const domain = window.location.origin;
    setDownloadUrl(`${domain}/download/miaolegemiao-android-app.tar.gz`);
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
      command: 'tar -xzvf miaolegemiao-android-app.tar.gz',
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
      description: '首次打开会自动下载依赖，请耐心等待',
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 mb-4">
            <Smartphone className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">下载安卓应用</h1>
          <p className="text-gray-600 dark:text-gray-400">
            喵了个喵 - 星球跟单平台 Android 客户端
          </p>
        </div>

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
                <p className="font-bold text-sm">com.miaolegemiao</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notice */}
        <Alert className="mb-8 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle>构建说明</AlertTitle>
          <AlertDescription>
            由于服务器环境限制，无法直接生成APK安装包。请下载项目源码，
            在您自己的电脑上使用 Android Studio 构建 APK。
            整个过程大约需要10-15分钟。
          </AlertDescription>
        </Alert>

        {/* Download Button */}
        <Card className="mb-8 border-2 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <FileArchive className="w-16 h-16 mx-auto text-purple-500 mb-4" />
              <h2 className="text-xl font-bold mb-2">下载项目源码</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                包含完整的 Android 项目代码和构建配置
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  onClick={() => window.open(downloadUrl, '_blank')}
                >
                  <Download className="w-5 h-5 mr-2" />
                  下载源码 (.tar.gz)
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    navigator.clipboard.writeText(downloadUrl);
                    alert('链接已复制到剪贴板');
                  }}
                >
                  复制下载链接
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Build Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-blue-500" />
              构建 APK 步骤
            </CardTitle>
            <CardDescription>
              按照以下步骤在您的电脑上构建 APK 安装包
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {buildSteps.map((step) => (
                <div
                  key={step.step}
                  className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">
                      {step.step}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{step.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {step.description}
                    </p>
                    {step.command && (
                      <code className="block p-2 bg-gray-200 dark:bg-gray-700 rounded text-xs overflow-x-auto">
                        {step.command}
                      </code>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              应用功能
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          </CardContent>
        </Card>

        {/* Tech Stack */}
        <Card className="mt-8">
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
