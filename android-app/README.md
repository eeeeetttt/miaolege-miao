# 喵了个喵 Android App

一个简单的 Android WebView 应用，封装 https://miaolegemiao.cn 网站。

## 功能

- 全屏 WebView 浏览体验
- 支持返回键导航
- 自动处理外部链接
- 离线缓存支持

## 构建 APK

### 方法一：GitHub Actions 自动构建

1. 将此项目推送到 GitHub
2. 进入 Actions 页面
3. 点击 "Build APK" workflow
4. 点击 "Run workflow"
5. 等待构建完成，下载 APK

### 方法二：本地构建

1. 安装 Android Studio
2. 打开此项目
3. 等待 Gradle 同步
4. 点击 Build -> Build Bundle(s) / APK(s) -> Build APK(s)
5. APK 位于 `app/build/outputs/apk/debug/app-debug.apk`

## 安装

1. 将 APK 传输到 Android 手机
2. 打开 APK 文件
3. 允许安装未知来源应用
4. 完成安装

## 技术栈

- Android SDK 34
- WebView
- Material Design
