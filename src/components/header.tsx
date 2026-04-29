'use client';

import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle'; 
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, LogOut, Globe, Settings, Download, Home, Shield, FileText, Trophy, MessageCircle, UserCircle, Wallet, MessageSquare, AlertCircle } from 'lucide-react';

// 导航栏配置接口
interface NavConfig {
  nav_show_challenge_hall: boolean;
  nav_show_kline_challenge: boolean;
  nav_show_social: boolean;
  nav_show_docs: boolean;
  nav_show_suggestion: boolean;
  nav_show_complaint: boolean;
  nav_show_download: boolean;
  nav_show_app_download: boolean;
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [navConfig, setNavConfig] = useState<NavConfig>({
    nav_show_challenge_hall: true,
    nav_show_kline_challenge: true,
    nav_show_social: true,
    nav_show_docs: true,
    nav_show_suggestion: true,
    nav_show_complaint: true,
    nav_show_download: true,
    nav_show_app_download: true,
  });
  const [configLoading, setConfigLoading] = useState(true);

  // 导航处理函数
  const navigate = useCallback((href: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = href;
    }
  }, []);

  // 获取导航栏配置
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
      } finally {
        setConfigLoading(false);
      }
    };
    fetchNavConfig();
  }, []);

  return (
    <header key={pathname} className="sticky top-0 z-[9999] w-full border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60" style={{ position: 'sticky', top: 0, left: 0, right: 0 }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4 overflow-visible">
          {/* Logo */}
          <button onClick={() => navigate('/')} className="flex items-center gap-3 hover:opacity-80 transition-opacity flex-shrink-0">
            <Image 
              src="/logo.png" 
              alt="金火火" 
              width={40} 
              height={40}
              className="rounded-full shadow-lg"
            />
            <div className="hidden sm:block flex-shrink-0">
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                金火火
              </h1>
            </div>
          </button>

          {/* Navigation */}
          {!configLoading && (
            <nav className="hidden lg:flex items-center gap-6 z-[100] relative flex-shrink-0">
              <button onClick={() => navigate('/')} className="text-gray-600 hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400 transition-colors flex items-center gap-1">
                <Home className="w-4 h-4" />
                首页
              </button>
              {session && (
                <>
                  {navConfig.nav_show_challenge_hall && (
                    <button onClick={() => navigate('/challenge/hall')} className="text-gray-600 hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400 transition-colors flex items-center gap-1">
                      <Globe className="w-4 h-4" />
                      挑战赛大厅
                    </button>
                  )}
                  {navConfig.nav_show_kline_challenge && (
                    <button onClick={() => navigate('/challenge')} className="text-amber-600 hover:text-amber-500 dark:text-amber-400 dark:hover:text-amber-300 transition-colors flex items-center gap-1 font-semibold">
                      <Trophy className="w-4 h-4" />
                      K线征途
                    </button>
                  )}
                  {navConfig.nav_show_social && (
                    <button onClick={() => navigate('/social')} className="text-gray-600 hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400 transition-colors flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      茶馆
                    </button>
                  )}
                  {navConfig.nav_show_docs && (
                    <button onClick={() => navigate('/docs')} className="text-gray-600 hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400 transition-colors flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      文档中心
                    </button>
                  )}
                  {navConfig.nav_show_suggestion && (
                    <button onClick={() => navigate('/suggestion')} className="text-gray-600 hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400 transition-colors flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      建议
                    </button>
                  )}
                  {navConfig.nav_show_complaint && (
                    <button onClick={() => navigate('/complaint')} className="text-gray-600 hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400 transition-colors flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      投诉
                    </button>
                  )}
                  {navConfig.nav_show_download && (
                    <button onClick={() => navigate('/download')} className="text-gray-600 hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400 transition-colors flex items-center gap-1">
                      <Download className="w-4 h-4" />
                      软件下载
                    </button>
                  )}
                </>
              )}
            </nav>
          )}

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10 border-2 border-purple-200 dark:border-purple-800">
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white font-semibold">
                        {session.user?.name?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{session.user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{session.user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/social')} className="cursor-pointer">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    社交中心
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/user')} className="cursor-pointer">
                    <UserCircle className="mr-2 h-4 w-4" />
                    个人中心
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/planet/my')} className="cursor-pointer">
                    <Globe className="mr-2 h-4 w-4" />
                    我的星球
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/planet/create')} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    创建星球
                  </DropdownMenuItem>
                  {session.user?.role === 'admin' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer">
                        <Shield className="mr-2 h-4 w-4" />
                        后台管理
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer text-red-600 focus:text-red-600"
                    onClick={() => signOut({ callbackUrl: '/' })}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => navigate('/login')}>登录</Button>
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700" onClick={() => navigate('/register')}>
                  注册
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
