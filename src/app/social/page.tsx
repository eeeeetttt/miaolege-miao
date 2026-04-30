'use client';

import { ChatHall } from '@/components/chat-hall';

export default function SocialPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 篝火动画背景 */}
      <iframe 
        src="/campfire.html"
        className="absolute inset-0 w-full h-full"
        style={{ border: 'none', pointerEvents: 'none' }}
        title="Campfire Animation"
      />
      
      {/* 聊天室 - 左下方固定 */}
      <div className="relative z-10 p-4 flex items-end" style={{ height: 'calc(100vh - 60px)' }}>
        <div className="w-full max-w-2xl">
          <ChatHall />
        </div>
      </div>
    </div>
  );
}
