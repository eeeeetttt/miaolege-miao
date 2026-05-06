'use client';

import { useState } from 'react';

export default function DownloadPage() {
  const [downloading, setDownloading] = useState(false);
  
  const handleDownload = () => {
    setDownloading(true);
    window.location.href = '/android-app.tar.gz';
    setTimeout(() => setDownloading(false), 3000);
  };

  const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-24 h-24 mx-auto mb-6 bg-blue-100 rounded-2xl flex items-center justify-center">
          <svg className="w-14 h-14 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
            <path d="M12 12c-1.65 0-3 1.35-3 3s1.35 3 3 3 3-1.35 3-3-1.35-3-3-3z"/>
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">金火伙 APP</h1>
        <p className="text-gray-500 mb-6">版本 1.0.0 | 大小 2.4 MB</p>

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl mb-6 transition-all disabled:opacity-50"
        >
          {downloading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              正在下载...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              下载 Android 项目包
            </span>
          )}
        </button>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-left">
          <h3 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            构建说明
          </h3>
          <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
            <li>下载项目包并解压</li>
            <li>确保电脑已安装 Android Studio</li>
            <li>在 Android Studio 中打开解压的 <code className="bg-yellow-100 px-1 rounded">android</code> 文件夹</li>
            <li>等待 Gradle 同步完成</li>
            <li>点击 Build → Build Bundle(s) / APK(s) → Build APK(s)</li>
            <li>APK 生成在 <code className="bg-yellow-100 px-1 rounded">android/app/build/outputs/apk/debug/</code></li>
          </ol>
        </div>

        <div className="mt-6 text-xs text-gray-400">
          <p>构建前请确保：</p>
          <ul className="mt-2 space-y-1">
            <li>• Android SDK 已正确配置</li>
            <li>• JAVA_HOME 环境变量已设置</li>
            <li>• Gradle 版本兼容</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
