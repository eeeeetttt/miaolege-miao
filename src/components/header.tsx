'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
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
import { User, LogOut, Globe, Settings, Download, Home, Shield, FileText, Trophy, MessageCircle, UserCircle, Wallet, MessageSquare, AlertCircle, Menu, X } from 'lucide-react';

export function Header() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/', label: '首页', icon: Home },
    { href: '/challenge/hall', label: '挑战赛大厅', icon: Globe, requireAuth: true },
    { href: '/challenge', label: 'K线征途', icon: Trophy, requireAuth: true, highlight: true },
    { href: '/social', label: '社交', icon: MessageCircle, requireAuth: true },
    { href: '/docs', label: '文档中心', icon: FileText, requireAuth: true },
    { href: '/suggestion', label: '意见建议', icon: MessageSquare, requireAuth: true },
    { href: '/complaint', label: '意见投诉', icon: AlertCircle, requireAuth: true },
  ];

  const filteredNavItems = session 
    ? navItems 
    : navItems.filter(item => !item.requireAuth);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image 
              src="/logo.png" 
              alt="喵了个喵" 
              width={40} 
              height={40}
              className="rounded-full shadow-lg"
            />
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                喵了个喵
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">星球跟单平台</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-6">
            {filteredNavItems.map((item) => (
              <Link 
                key={item.href}
                href={item.href} 
                className={`${item.highlight 
                  ? 'text-amber-600 hover:text-amber-500 dark:text-amber-400 dark:hover:text-amber-300 font-semibold' 
                  : 'text-gray-600 hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400'
                } transition-colors flex items-center gap-1.5 text-sm`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="切换菜单"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-3">
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
                  <DropdownMenuItem asChild>
                    <Link href="/social" className="cursor-pointer">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      社交中心
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/user" className="cursor-pointer">
                      <UserCircle className="mr-2 h-4 w-4" />
                      个人中心
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/planet/my" className="cursor-pointer">
                      <Globe className="mr-2 h-4 w-4" />
                      我的星球
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/planet/create" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      创建星球
                    </Link>
                  </DropdownMenuItem>
                  {session.user?.role === 'admin' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="cursor-pointer">
                          <Shield className="mr-2 h-4 w-4" />
                          后台管理
                        </Link>
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
                <Link href="/login">
                  <Button variant="ghost">登录</Button>
                </Link>
                <Link href="/register">
                  <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                    注册
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t py-4 bg-white dark:bg-gray-900">
            <nav className="flex flex-col gap-2">
              {filteredNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`${item.highlight 
                    ? 'text-amber-600 dark:text-amber-400 font-semibold' 
                    : 'text-gray-600 dark:text-gray-300'
                  } px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
            </nav>
            
            {/* Mobile Auth */}
            <div className="mt-4 pt-4 border-t flex items-center justify-between px-4">
              <ThemeToggle />
              {session ? (
                <Button 
                  variant="outline" 
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => signOut({ callbackUrl: '/' })}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  退出登录
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Link href="/login">
                    <Button variant="outline">登录</Button>
                  </Link>
                  <Link href="/register">
                    <Button className="bg-gradient-to-r from-purple-600 to-blue-600">注册</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
