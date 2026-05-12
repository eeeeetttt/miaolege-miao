package cn.miaolegemiao.app;

import android.annotation.SuppressLint;
import android.content.pm.ActivityInfo;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;

import androidx.appcompat.app.AppCompatActivity;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private ProgressBar progressBar;
    private FrameLayout frameLayout;
    
    private static final String URL = "https://miaolegemiao.cn";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 全屏
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        
        // 设置内容视图
        setContentView(R.layout.activity_main);
        
        // 初始化视图
        webView = findViewById(R.id.webView);
        progressBar = findViewById(R.id.progressBar);
        frameLayout = findViewById(R.id.frameLayout);
        
        // 配置 WebView
        setupWebView();
        
        // 加载网站
        webView.loadUrl(URL);
    }
    
    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        
        // 启用 JavaScript
        settings.setJavaScriptEnabled(true);
        
        // 启用 DOM 存储
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        
        // 启用缓存
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        
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
        
        // 设置 User Agent
        String userAgent = settings.getUserAgentString();
        settings.setUserAgentString(userAgent + " MiaoLeGeMiaoApp/1.0");
        
        // Cookie 管理
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);
        
        // WebViewClient
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                // 只在 WebView 内打开同域名链接
                if (url.contains("miaolegemiao.cn") || url.contains("vercel.app")) {
                    return false;
                }
                // 外部链接也在 WebView 内打开
                return false;
            }
            
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                progressBar.setVisibility(View.VISIBLE);
            }
            
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                progressBar.setVisibility(View.GONE);
            }
        });
        
        // WebChromeClient
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
            }
        });
    }
    
    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
    
    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }
    
    @Override
    protected void onPause() {
        super.onPause();
        webView.onPause();
    }
    
    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
