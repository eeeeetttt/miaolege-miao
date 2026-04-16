'use client';

import { useEffect, useState } from 'react';

export default function DownloadPage() {
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // 检测设备类型
    const checkMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(checkMobile);
  }, []);

  const handleDownload = () => {
    setDownloadStarted(true);
    // 直接触发下载
    const link = document.createElement('a');
    link.href = '/miaolegemiao.apk';
    link.download = '喵了个喵.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '40px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Logo */}
        <div style={{
          width: '120px',
          height: '120px',
          margin: '0 auto 24px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '60px'
        }}>
          🐱
        </div>

        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#1a1a2e',
          marginBottom: '8px'
        }}>
          喵了个喵
        </h1>

        <p style={{
          fontSize: '14px',
          color: '#666',
          marginBottom: '32px'
        }}>
          星球跟单平台
        </p>

        <div style={{
          background: '#f8f9fa',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#666', fontSize: '14px' }}>版本</span>
            <span style={{ color: '#333', fontWeight: '500' }}>1.0.0</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#666', fontSize: '14px' }}>大小</span>
            <span style={{ color: '#333', fontWeight: '500' }}>5.3 MB</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#666', fontSize: '14px' }}>平台</span>
            <span style={{ color: '#333', fontWeight: '500' }}>Android 5.0+</span>
          </div>
        </div>

        {downloadStarted ? (
          <div style={{
            background: '#d4edda',
            color: '#155724',
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '16px'
          }}>
            <p style={{ fontSize: '14px' }}>下载已开始...</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>请查看浏览器下载栏</p>
          </div>
        ) : (
          <button
            onClick={handleDownload}
            style={{
              width: '100%',
              padding: '16px 32px',
              fontSize: '18px',
              fontWeight: 'bold',
              color: 'white',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseOver={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.transform = 'translateY(-2px)';
              target.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)';
            }}
            onMouseOut={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.transform = 'translateY(0)';
              target.style.boxShadow = 'none';
            }}
          >
            {isMobile ? '立即安装' : '立即下载'}
          </button>
        )}

        <p style={{
          fontSize: '12px',
          color: '#999',
          marginTop: '24px'
        }}>
          点击下载即表示您同意安装来自喵了个喵的应用
        </p>

        <div style={{
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: '1px solid #eee'
        }}>
          <a
            href="/"
            style={{
              color: '#667eea',
              textDecoration: 'none',
              fontSize: '14px'
            }}
          >
            先去网页版看看 →
          </a>
        </div>
      </div>
    </div>
  );
}
