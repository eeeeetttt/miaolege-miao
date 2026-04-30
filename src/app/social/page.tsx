'use client';

import { Suspense } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { ChatHall } from '@/components/chat-hall';

export default function SocialPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, rgba(40, 20, 10, 0.95) 0%, rgba(20, 10, 5, 0.98) 100%)'
      }}>
        <Spinner className="w-8 h-8 text-amber-400" />
      </div>
    }>
      <div className="min-h-screen p-4 md:p-6" style={{
        background: 'linear-gradient(135deg, rgba(40, 20, 10, 0.95) 0%, rgba(20, 10, 5, 0.98) 100%)'
      }}>
        <div className="max-w-4xl mx-auto h-[calc(100vh-48px)]">
          <ChatHall />
        </div>
      </div>
    </Suspense>
  );
}
