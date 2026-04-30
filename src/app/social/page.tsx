'use client';

import { useEffect } from 'react';
import { ChatHall } from '@/components/chat-hall';

export default function SocialPage() {
  // 页面加载时设置背景
  useEffect(() => {
    document.body.style.background = 'linear-gradient(180deg, #0a0f1e 0%, #1a1525 50%, #2d1f3d 100%)';
    return () => {
      document.body.style.background = '';
    };
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 篝火动画背景 */}
      <iframe 
        src="/campfire.html"
        className="absolute inset-0 w-full h-full"
        style={{ border: 'none', pointerEvents: 'none' }}
        title="Campfire Animation"
      />
      
      {/* 半透明遮罩让文字更易读 */}
      <div className="absolute inset-0 bg-black/30" />
      
      {/* 聊天室 - 左下方固定 */}
      <div className="relative z-10 p-4">
        <div className="max-w-2xl">
          <ChatHall />
        </div>
      </div>
    </div>
  );
}
