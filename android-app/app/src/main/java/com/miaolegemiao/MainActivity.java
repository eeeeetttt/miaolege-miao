package com.miaolegemiao;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.DownloadManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;

/**
 * 主Activity - WebView容器
 * 加载喵了个喵星球跟单平台
 */
public class MainActivity extends AppCompatActivity {

    // 网站地址 - 喵了个喵星球跟单平台
    private static final String BASE_URL = "https://gvbn6hx95b.coze.site";
    
    private WebView webView;
    private ProgressBar progressBar;
    private FrameLayout splashScreen;
    
    private static final int PERMISSION_REQUEST_CODE = 1001;
    private String pendingDownloadUrl = null;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        initViews();
        setupFullscreen();
        createNotificationChannel();
        initWebView();
        checkPermissions();
        
        // 加载网站
        loadUrl(BASE_URL);
    }
    
    private void initViews() {
        webView = findViewById(R.id.webView);
        progressBar = findViewById(R.id.progressBar);
        splashScreen = findViewById(R.id.splashScreen);
    }
    
    /**
     * 设置显示状态栏和导航栏
     */
    private void setupFullscreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // 显示状态栏
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.show(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
            }
        }
        // 不设置全屏标志，保持正常显示
    }
    
    /**
     * 创建通知渠道 (Android 8.0+)
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                "download",
                "下载通知",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("文件下载进度通知");
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }
    
    /**
     * 初始化WebView
     */
    @SuppressLint("SetJavaScriptEnabled")
    private void initWebView() {
        WebSettings settings = webView.getSettings();
        
        // 启用JavaScript
        settings.setJavaScriptEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        
        // 启用DOM存储
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        
        // 启用缓存
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        // setAppCacheEnabled 在 Android 11+ 已弃用，WebView 自动处理
        
        // 支持缩放
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        
        // 自适应屏幕
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setLayoutAlgorithm(WebSettings.LayoutAlgorithm.TEXT_AUTOSIZING);
        
        // 允许混合内容
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        
        // 允许文件访问
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        
        // 设置User-Agent
        String userAgent = settings.getUserAgentString();
        settings.setUserAgentString(userAgent + " MiaoLeGeMiaoApp/1.0");
        
        // Cookie设置
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);
        
        // 设置WebViewClient
        webView.setWebViewClient(new MiaoWebViewClient());
        
        // 设置WebChromeClient
        webView.setWebChromeClient(new MiaoWebChromeClient());
        
        // 设置下载监听
        webView.setDownloadListener(new MiaoDownloadListener());
        
        // 支持深色模式
        if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK)) {
            int nightModeFlags = getResources().getConfiguration().uiMode & 
                android.content.res.Configuration.UI_MODE_NIGHT_MASK;
            if (nightModeFlags == android.content.res.Configuration.UI_MODE_NIGHT_YES) {
                WebSettingsCompat.setForceDark(settings, WebSettingsCompat.FORCE_DARK_ON);
            }
        }
    }
    
    /**
     * 加载URL
     */
    private void loadUrl(String url) {
        if (webView != null) {
            webView.loadUrl(url);
        }
    }
    
    /**
     * 检查权限
     */
    private void checkPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) 
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.POST_NOTIFICATIONS},
                    PERMISSION_REQUEST_CODE);
            }
        }
    }
    
    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, 
                                           @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CODE) {
            // 权限请求结果处理
        }
    }
    
    /**
     * 返回键处理
     */
    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            showExitDialog();
        }
    }
    
    /**
     * 显示退出确认对话框
     */
    private void showExitDialog() {
        new AlertDialog.Builder(this)
            .setTitle("退出应用")
            .setMessage("确定要退出喵了个喵吗？")
            .setPositiveButton("退出", (dialog, which) -> {
                finishAffinity();
            })
            .setNegativeButton("取消", null)
            .show();
    }
    
    /**
     * 显示启动画面
     */
    private void showSplash() {
        if (splashScreen != null) {
            splashScreen.setVisibility(View.VISIBLE);
        }
    }
    
    /**
     * 隐藏启动画面
     */
    private void hideSplash() {
        if (splashScreen != null) {
            splashScreen.animate()
                .alpha(0f)
                .setDuration(300)
                .withEndAction(() -> splashScreen.setVisibility(View.GONE))
                .start();
        }
    }
    
    /**
     * WebViewClient实现
     */
    private class MiaoWebViewClient extends WebViewClient {
        
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            String url = request.getUrl().toString();
            
            // 处理外部链接
            if (!url.startsWith(BASE_URL) && !url.startsWith("about:blank")) {
                // 特殊处理支付、登录等外部链接
                if (url.contains("alipay") || url.contains("weixin") || url.contains("wxpay")) {
                    // 可以在这里处理支付跳转
                    return false;
                }
                
                // 其他外部链接在应用内打开
                return false;
            }
            
            return false;
        }
        
        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            super.onPageStarted(view, url, favicon);
            progressBar.setVisibility(View.VISIBLE);
            progressBar.setProgress(0);
        }
        
        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            progressBar.setVisibility(View.GONE);
            hideSplash();
            
            // 注入原生App标识
            view.evaluateJavascript(
                "window.isNativeApp = true; window.appVersion = '1.0.0';",
                null
            );
        }
        
        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, 
                                   android.webkit.WebResourceError error) {
            super.onReceivedError(view, request, error);
            if (request.getUrl().toString().equals(view.getUrl())) {
                // 主页面加载失败，显示错误页面
                view.loadUrl("file:///android_asset/error.html");
            }
        }
    }
    
    /**
     * WebChromeClient实现
     */
    private class MiaoWebChromeClient extends WebChromeClient {
        
        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            super.onProgressChanged(view, newProgress);
            progressBar.setProgress(newProgress);
        }
        
        @Override
        public void onReceivedTitle(WebView view, String title) {
            super.onReceivedTitle(view, title);
            // 可以在这里更新标题
        }
        
        @Override
        public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                                         FileChooserParams fileChooserParams) {
            // 处理文件选择
            return true;
        }
    }
    
    /**
     * 下载监听器
     */
    private class MiaoDownloadListener implements DownloadListener {
        
        @Override
        public void onDownloadStart(String url, String userAgent, String contentDisposition,
                                    String mimeType, long contentLength) {
            // 使用系统下载管理器
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setMimeType(mimeType);
            request.addRequestHeader("User-Agent", userAgent);
            request.setDescription("正在下载文件...");
            request.setTitle(URLUtil.guessFileName(url, contentDisposition, mimeType));
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS,
                URLUtil.guessFileName(url, contentDisposition, mimeType));
            
            DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            dm.enqueue(request);
            
            Toast.makeText(MainActivity.this, "开始下载...", Toast.LENGTH_LONG).show();
        }
    }
    
    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }
    
    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) {
            webView.onPause();
        }
    }
    
    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
