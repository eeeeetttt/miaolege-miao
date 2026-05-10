'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, Building2, Medal, MessageCircle, Newspaper, User } from 'lucide-react';
import { useEffect, useState } from 'react';

const navItems = [
  { href: '/home', icon: Home, label: '大业' },
  { href: '/challenge', icon: Medal, label: '大赛' },
  { href: '/social', icon: MessageCircle, label: '社交' },
  { href: '/news', icon: Newspaper, label: '资讯' },
  { href: '/user', icon: User, label: '我的' },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const hideNavPaths = ['/admin', '/login', '/register', '/challenge/admin'];
  
  if (!isMobile || hideNavPaths.some(path => pathname.startsWith(path))) {
    return null;
  }

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-[9999] bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800"
      style={{ 
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="flex items-center justify-around w-full h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`relative flex flex-col items-center justify-center flex-1 h-full min-w-[60px] transition-colors touch-manipulation ${
                isActive 
                  ? 'text-yellow-600 dark:text-yellow-400' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span className="text-[11px] mt-1 font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute -top-0.5 w-1 h-1 rounded-full bg-yellow-500" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
