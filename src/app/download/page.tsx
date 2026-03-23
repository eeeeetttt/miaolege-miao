'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  Download, 
  Code, 
  CheckCircle2, 
  ArrowRight,
  FileCode,
  Terminal,
  Package,
  ExternalLink
} from 'lucide-react';

export default function AppDownloadPage() {
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  const copyToClipboard = (text: string, fileName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(fileName);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const websiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com';

  // Android 项目文件内容
  const buildGradle = `// build.gradle (Project level)
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.2.0'
        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.20'
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}`;

  const appBuildGradle = `// app/build.gradle (Module level)
plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace 'com.mlgm.app'
    compileSdk 34

    defaultConfig {
        applicationId "com.mlgm.app"
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName "1.0.0"
    }

    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = '17'
    }

    buildFeatures {
        viewBinding true
    }
}

dependencies {
    implementation 'androidx.core:core-ktx:1.12.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
    implementation 'androidx.webkit:webkit:1.8.0'
}`;

  const mainActivity = `// MainActivity.kt
package com.mlgm.app

import android.annotation.SuppressLint
import android.content.pm.ApplicationInfo
import android.graphics.Bitmap
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ProgressBar
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewFeature

class MainActivity : AppCompatActivity() {
    
    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private val baseUrl = "${websiteUrl}"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)

        setupWebView()
        webView.loadUrl(baseUrl)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            useWideViewPort = true
            loadWithOverviewMode = true
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            allowFileAccess = true
            allowContentAccess = true
            cacheMode = android.webkit.WebSettings.LOAD_DEFAULT
        }

        // Enable dark mode support
        if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK)) {
            WebSettingsCompat.setForceDark(webView.settings, WebSettingsCompat.FORCE_DARK_AUTO)
        }

        // Cookie management
        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, true)
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url.toString()
                // Handle external links
                if (!url.startsWith(baseUrl)) {
                    // Open external links in browser
                    return false
                }
                return false
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                progressBar.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar.visibility = View.GONE
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progressBar.progress = newProgress
                if (newProgress == 100) {
                    progressBar.visibility = View.GONE
                }
            }

            override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
                super.onShowCustomView(view, callback)
                // Handle fullscreen video
            }

            override fun onHideCustomView() {
                super.onHideCustomView()
            }
        }

        // Enable debug mode in development
        if (0 != applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) {
            WebView.setWebContentsDebuggingEnabled(true)
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}`;

  const activityMainXml = `<!-- activity_main.xml -->
<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    tools:context=".MainActivity">

    <WebView
        android:id="@+id/webView"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />

    <ProgressBar
        android:id="@+id/progressBar"
        style="@style/Widget.AppCompat.ProgressBar.Horizontal"
        android:layout_width="match_parent"
        android:layout_height="4dp"
        android:progressTint="#7c3aed"
        android:visibility="gone" />

</FrameLayout>`;

  const androidManifest = `<!-- AndroidManifest.xml -->
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
        tools:ignore="ScopedStorage" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.MLGM"
        android:usesCleartextTraffic="true"
        tools:targetApi="34">

        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|screenSize|keyboardHidden"
            android:exported="true"
            android:screenOrientation="portrait"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

    </application>

</manifest>`;

  const colorsXml = `<!-- res/values/colors.xml -->
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="purple_500">#7c3aed</color>
    <color name="purple_700">#6d28d9</color>
    <color name="white">#ffffff</color>
    <color name="black">#000000</color>
</resources>`;

  const themesXml = `<!-- res/values/themes.xml -->
<resources xmlns:tools="http://schemas.android.com/tools">
    <style name="Theme.MLGM" parent="Theme.MaterialComponents.DayNight.NoActionBar">
        <item name="colorPrimary">@color/purple_500</item>
        <item name="colorPrimaryDark">@color/purple_700</item>
        <item name="colorAccent">@color/purple_500</item>
        <item name="android:statusBarColor">@color/purple_500</item>
        <item name="android:navigationBarColor">@color/white</item>
    </style>
</resources>`;

  const stringsXml = `<!-- res/values/strings.xml -->
<resources>
    <string name="app_name">喵了个喵</string>
    <string name="loading">加载中...</string>
    <string name="error_network">网络连接失败，请检查网络设置</string>
</resources>`;

  const proguardRules = `# proguard-rules.pro
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keep public class * extends android.app.Activity
-keep class com.mlgm.app.** { *; }

# WebView
-keepclassmembers class * extends android.webkit.WebViewClient {
    public void *(android.webkit.WebView, java.lang.String, android.graphics.Bitmap);
    public boolean *(android.webkit.WebView, java.lang.String);
}
-keepclassmembers class * extends android.webkit.WebChromeClient {
    public void *(android.webkit.WebView, java.lang.String);
}`;

  const FileBlock = ({ title, filename, content, language }: { title: string; filename: string; content: string; language: string }) => (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-purple-500" />
          <span className="font-medium text-sm">{title}</span>
          <Badge variant="outline" className="text-xs">{language}</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => copyToClipboard(content, filename)}
        >
          {copiedFile === filename ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </Button>
      </div>
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
        <code>{content}</code>
      </pre>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl mb-6">
            <Smartphone className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            下载喵了个喵 APP
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
            选择适合你的方式，随时随地访问星球跟单平台
          </p>
        </div>

        {/* Options */}
        <Tabs defaultValue="pwa" className="space-y-8">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="pwa" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              PWA 快捷方式
            </TabsTrigger>
            <TabsTrigger value="android" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              Android 源码
            </TabsTrigger>
          </TabsList>

          {/* PWA Tab */}
          <TabsContent value="pwa">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-purple-500" />
                  PWA 快捷安装
                </CardTitle>
                <CardDescription>
                  无需下载，直接在浏览器中添加到主屏幕
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-6">
                  <h3 className="font-semibold text-purple-800 dark:text-purple-300 mb-4">
                    📱 iOS 设备（iPhone/iPad）
                  </h3>
                  <ol className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs">1</span>
                      <span>使用 Safari 浏览器打开本网站</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs">2</span>
                      <span>点击底部的「分享」按钮（方框向上箭头图标）</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs">3</span>
                      <span>向下滚动，点击「添加到主屏幕」</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs">4</span>
                      <span>点击右上角的「添加」完成安装</span>
                    </li>
                  </ol>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-6">
                  <h3 className="font-semibold text-green-800 dark:text-green-300 mb-4">
                    🤖 Android 设备
                  </h3>
                  <ol className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">1</span>
                      <span>使用 Chrome 浏览器打开本网站</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">2</span>
                      <span>点击右上角菜单（三个点）</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">3</span>
                      <span>点击「添加到主屏幕」或「安装应用」</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">4</span>
                      <span>确认安装即可</span>
                    </li>
                  </ol>
                </div>

                <div className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <CheckCircle2 className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    PWA 支持离线访问，安装后即可像原生 APP 一样使用
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Android Tab */}
          <TabsContent value="android">
            <div className="space-y-6">
              {/* Requirements */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-purple-500" />
                    构建环境要求
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="font-medium mb-1">Android Studio</p>
                      <p className="text-sm text-gray-500">Hedgehog (2023.1.1) 或更高版本</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="font-medium mb-1">JDK</p>
                      <p className="text-sm text-gray-500">JDK 17 或更高版本</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="font-medium mb-1">Android SDK</p>
                      <p className="text-sm text-gray-500">API 34 (Android 14)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Steps */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-500" />
                    构建步骤
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-4">
                    <li className="flex items-start gap-4">
                      <span className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">1</span>
                      <div>
                        <p className="font-medium">创建新项目</p>
                        <p className="text-sm text-gray-500">打开 Android Studio，创建新的 Empty Views Activity 项目</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-4">
                      <span className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">2</span>
                      <div>
                        <p className="font-medium">复制源码文件</p>
                        <p className="text-sm text-gray-500">将下方的源码文件复制到对应的目录中</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-4">
                      <span className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">3</span>
                      <div>
                        <p className="font-medium">修改网站地址</p>
                        <p className="text-sm text-gray-500">在 MainActivity.kt 中将 baseUrl 改为你的网站地址</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-4">
                      <span className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">4</span>
                      <div>
                        <p className="font-medium">添加应用图标</p>
                        <p className="text-sm text-gray-500">将应用图标放入 res/mipmap 目录</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-4">
                      <span className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">5</span>
                      <div>
                        <p className="font-medium">构建 APK</p>
                        <p className="text-sm text-gray-500">点击 Build → Build Bundle(s) / APK(s) → Build APK(s)</p>
                      </div>
                    </li>
                  </ol>
                </CardContent>
              </Card>

              {/* Source Files */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="w-5 h-5 text-purple-500" />
                    源码文件
                  </CardTitle>
                  <CardDescription>
                    复制以下文件到 Android 项目的对应目录
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FileBlock title="项目级 build.gradle" filename="build.gradle" content={buildGradle} language="Gradle" />
                  <FileBlock title="模块级 build.gradle" filename="app/build.gradle" content={appBuildGradle} language="Gradle" />
                  <FileBlock title="主活动" filename="MainActivity.kt" content={mainActivity} language="Kotlin" />
                  <FileBlock title="布局文件" filename="activity_main.xml" content={activityMainXml} language="XML" />
                  <FileBlock title="清单文件" filename="AndroidManifest.xml" content={androidManifest} language="XML" />
                  <FileBlock title="颜色资源" filename="colors.xml" content={colorsXml} language="XML" />
                  <FileBlock title="主题样式" filename="themes.xml" content={themesXml} language="XML" />
                  <FileBlock title="字符串资源" filename="strings.xml" content={stringsXml} language="XML" />
                  <FileBlock title="混淆规则" filename="proguard-rules.pro" content={proguardRules} language="ProGuard" />
                </CardContent>
              </Card>

              {/* Features */}
              <Card>
                <CardHeader>
                  <CardTitle>APP 功能特性</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      { icon: '🌐', title: 'WebView 加载', desc: '完整展示网站内容' },
                      { icon: '⚡', title: '进度条显示', desc: '加载进度实时展示' },
                      { icon: '🌙', title: '暗黑模式', desc: '跟随系统自动切换' },
                      { icon: '↩️', title: '返回键支持', desc: ' WebView 历史导航' },
                      { icon: '📱', title: '全屏显示', desc: '沉浸式浏览体验' },
                      { icon: '🔒', title: 'Cookie 管理', desc: '保持登录状态' },
                    ].map((feature, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className="text-2xl">{feature.icon}</span>
                        <div>
                          <p className="font-medium text-sm">{feature.title}</p>
                          <p className="text-xs text-gray-500">{feature.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Back link */}
        <div className="text-center mt-12">
          <a href="/" className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 dark:text-purple-400">
            <ArrowRight className="w-4 h-4 rotate-180" />
            返回首页
          </a>
        </div>
      </div>
    </div>
  );
}
