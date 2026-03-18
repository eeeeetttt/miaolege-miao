# 喵了个喵 Android App

星球跟单平台 Android 客户端

## 项目结构

```
android-app/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/miaolegemiao/
│   │   │   │   ├── MiaoApp.java          # Application类
│   │   │   │   ├── MainActivity.java      # 主Activity
│   │   │   │   └── DownloadService.java   # 下载服务
│   │   │   ├── res/
│   │   │   │   ├── drawable/              # 图标和drawable资源
│   │   │   │   ├── layout/                # 布局文件
│   │   │   │   ├── mipmap-*/              # 应用图标
│   │   │   │   ├── values/                # 字符串、颜色、主题
│   │   │   │   └── xml/                   # XML配置
│   │   │   ├── assets/                    # 静态资源
│   │   │   └── AndroidManifest.xml
│   │   └── debug/
│   ├── build.gradle
│   └── proguard-rules.pro
├── gradle/
│   └── wrapper/
├── build.gradle
├── settings.gradle
├── gradle.properties
└── README.md
```

## 技术栈

- **最低SDK**: Android 7.0 (API 24)
- **目标SDK**: Android 14 (API 34)
- **Kotlin**: 1.9.20
- **Gradle**: 8.2
- **Android Gradle Plugin**: 8.2.0

## 主要功能

- WebView容器，加载网页应用
- 文件下载支持
- 全屏沉浸式体验
- 启动页
- 离线错误页面
- 深色模式支持
- 权限管理
- 网络安全配置

## 构建要求

- JDK 17+
- Android SDK 34
- Gradle 8.2+

## 构建步骤

### 1. 配置域名

修改 `MainActivity.java` 中的 `BASE_URL`：

```java
private static final String BASE_URL = "https://your-domain.dev.coze.site";
```

### 2. 构建APK

```bash
# Debug版本
./gradlew assembleDebug

# Release版本
./gradlew assembleRelease
```

### 3. 签名配置（发布前）

在 `app/build.gradle` 中配置签名：

```groovy
android {
    signingConfigs {
        release {
            storeFile file('your-keystore.jks')
            storePassword 'your-store-password'
            keyAlias 'your-key-alias'
            keyPassword 'your-key-password'
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

## 权限说明

| 权限 | 用途 |
|------|------|
| INTERNET | 网络访问 |
| ACCESS_NETWORK_STATE | 检查网络状态 |
| POST_NOTIFICATIONS | 下载通知 (Android 13+) |
| WRITE_EXTERNAL_STORAGE | 文件下载 (Android 9及以下) |
| READ_EXTERNAL_STORAGE | 读取文件 (Android 12及以下) |

## 输出文件

构建完成后，APK位于：

- Debug: `app/build/outputs/apk/debug/`
- Release: `app/build/outputs/apk/release/`

## 发布检查清单

- [ ] 更新 `versionCode` 和 `versionName`
- [ ] 配置签名密钥
- [ ] 更新应用图标
- [ ] 测试所有核心功能
- [ ] 检查权限配置
- [ ] 验证网络安全配置
- [ ] 测试深色模式

## 注意事项

1. **网络安全**: 生产环境建议移除 `usesCleartextTraffic` 和调整网络安全配置
2. **域名验证**: 深度链接需要配置域名验证文件
3. **隐私政策**: 发布前需要提供隐私政策页面

## License

MIT
