package com.miaolegemiao;

import android.app.Application;
import android.webkit.WebView;

public class MiaoApp extends Application {
    
    private static MiaoApp instance;
    
    public static MiaoApp getInstance() {
        return instance;
    }
    
    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        
        // 开启WebView调试（仅在Debug模式）
        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
    }
}
