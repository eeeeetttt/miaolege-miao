'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Home, Users, Trophy, MessageCircle, User, Space, Medal } from 'lucide-react';
import Link from 'next/link';
import { UserCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface NavConfig {
  nav_show_challenge_hall: boolean;
  nav_show_kline_challenge: boolean;
  nav_show_social: boolean;
  nav_show_docs: boolean;
  nav_show_suggestion: boolean;
}

const navItems = [
  { href: '/', icon: Home, label: '首页' },
  { href: '/lobby', icon: Medal, label: '大赛' },
  { href: '/challenge', icon: Trophy, label: '挑战' },
  { href: '/social', icon: MessageCircle, label: '社交' },
  { href: '/user/space', icon: Space, label: '空间' },
  { href: '/user', icon: User, label: '我的' },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [navConfig, setNavConfig] = useState<NavConfig>({
    nav_show_challenge_hall: true,
    nav_show_kline_challenge: true,
    nav_show_social: true,
    nav_show_docs: true,
    nav_show_suggestion: true,
  });
  const [showNav, setShowNav] = useState(false);

  useEffect(() => {
    const fetchNavConfig = async () => {
      try {
        const res = await fetch('/api/nav-config');
        const data = await res.json();
        if (data.config) {
          setNavConfig(data.config);
        }
      } catch (error) {
        console.error('获取导航配置失败:', error);
      }
    };
    fetchNavConfig();
  }, []);

  useEffect(() => {
    // 只在移动端显示底部导航
    const checkMobile = () => {
      setShowNav(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 不显示底部导航的页面
  const hideNavPaths = ['/admin', '/login', '/register', '/admin-test'];
  if (hideNavPaths.some(path => pathname.startsWith(path)) || !showNav || !session) {
    return null;
  }

  // 根据导航配置过滤项目
  const filteredItems = navItems.filter(item => {
    if (item.href === '/lobby') return navConfig.nav_show_challenge_hall;
    if (item.href === '/challenge') return navConfig.nav_show_kline_challenge;
    if (item.href === '/social') return navConfig.nav_show_social;
    return true;
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[9999] bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center justify-center flex-1 h-full min-w-[60px] transition-colors ${
                isActive 
                  ? 'text-purple-600 dark:text-purple-400' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-purple-600 dark:bg-purple-400" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
