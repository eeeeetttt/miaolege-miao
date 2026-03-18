package com.miaolegemiao;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Environment;
import android.os.IBinder;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * 下载服务
 * 用于后台下载文件
 */
public class DownloadService extends Service {
    
    private static final String CHANNEL_ID = "download_service";
    private static final int NOTIFICATION_ID = 1001;
    
    private NotificationManager notificationManager;
    private boolean isDownloading = false;
    
    public static final String EXTRA_URL = "url";
    public static final String EXTRA_FILENAME = "filename";
    
    @Override
    public void onCreate() {
        super.onCreate();
        notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        createNotificationChannel();
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && !isDownloading) {
            String url = intent.getStringExtra(EXTRA_URL);
            String filename = intent.getStringExtra(EXTRA_FILENAME);
            
            if (url != null) {
                startForeground(NOTIFICATION_ID, createNotification("准备下载...", 0));
                downloadFile(url, filename);
            }
        }
        
        return START_NOT_STICKY;
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "下载服务",
                NotificationManager.IMPORTANCE_LOW
            );
            notificationManager.createNotificationChannel(channel);
        }
    }
    
    private Notification createNotification(String title, int progress) {
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setContentTitle(title)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW);
        
        if (progress > 0 && progress < 100) {
            builder.setProgress(100, progress, false);
        } else if (progress >= 100) {
            builder.setProgress(0, 0, false);
            builder.setOngoing(false);
        }
        
        return builder.build();
    }
    
    private void downloadFile(String fileUrl, String filename) {
        isDownloading = true;
        
        new Thread(() -> {
            try {
                URL url = new URL(fileUrl);
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                connection.connect();
                
                int fileSize = connection.getContentLength();
                InputStream input = connection.getInputStream();
                
                File outputDir = new File(
                    Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
                    "MiaoLeGeMiao"
                );
                if (!outputDir.exists()) {
                    outputDir.mkdirs();
                }
                
                File outputFile = new File(outputDir, filename != null ? filename : "download_" + System.currentTimeMillis());
                FileOutputStream output = new FileOutputStream(outputFile);
                
                byte[] buffer = new byte[4096];
                int bytesRead;
                long totalRead = 0;
                int lastProgress = 0;
                
                while ((bytesRead = input.read(buffer)) != -1) {
                    output.write(buffer, 0, bytesRead);
                    totalRead += bytesRead;
                    
                    int progress = (int) (totalRead * 100 / fileSize);
                    if (progress != lastProgress) {
                        lastProgress = progress;
                        updateNotification("正在下载: " + filename, progress);
                    }
                }
                
                output.flush();
                output.close();
                input.close();
                
                updateNotification("下载完成: " + filename, 100);
                
            } catch (Exception e) {
                e.printStackTrace();
                updateNotification("下载失败: " + e.getMessage(), -1);
            } finally {
                isDownloading = false;
                stopForeground(true);
                stopSelf();
            }
        }).start();
    }
    
    private void updateNotification(String title, int progress) {
        notificationManager.notify(NOTIFICATION_ID, createNotification(title, progress));
    }
    
    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
