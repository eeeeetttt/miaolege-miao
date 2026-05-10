'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Newspaper, TrendingUp, Trophy, Zap, Calendar, 
  User, Search, Eye, ChevronRight
} from 'lucide-react';

interface NewsItem {
  id: number;
  title: string;
  content: string;
  author: string;
  category: string;
  newsDate: string;
  coverImage?: string;
  tags: string[];
  views: number;
  createdAt: string;
}

const CATEGORY_INFO: Record<string, { name: string; icon: React.ReactNode; color: string }> = {
  market: { name: '市场分析', icon: <TrendingUp className="w-4 h-4" />, color: '#3b82f6' },
  platform: { name: '平台动态', icon: <Trophy className="w-4 h-4" />, color: '#10b981' },
  hotspot: { name: '热点消息', icon: <Zap className="w-4 h-4" />, color: '#f59e0b' },
};

const CATEGORY_COLORS: Record<string, string> = {
  market: 'bg-blue-100 text-blue-700',
  platform: 'bg-green-100 text-green-700',
  hotspot: 'bg-amber-100 text-amber-700',
};

// 主内容组件
function NewsContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';
  
  const [loading, setLoading] = useState(true);
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [searchKeyword, setSearchKeyword] = useState('');
  const pageSize = 10;

  // 获取新闻列表
  useEffect(() => {
    fetchNews();
  }, [page, activeCategory]);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (activeCategory !== 'all') {
        params.set('category', activeCategory);
      }

      const res = await fetch(`/api/news?${params}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setNewsList(data.data.list);
        setTotal(data.data.total);
      }
    } catch (error) {
      console.error('获取新闻失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 截断内容
  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* 顶部背景 */}
      <div className="relative bg-gradient-to-r from-amber-600 to-orange-600 py-16">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
        <div className="container mx-auto px-4 relative">
          <div className="flex items-center gap-3 mb-4">
            <Newspaper className="w-10 h-10 text-white" />
            <div>
              <h1 className="text-3xl font-bold text-white">金火火资讯</h1>
              <p className="text-amber-100 mt-1">伦敦金市场分析 · 平台动态 · 热点消息</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* 主内容区 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 分类切换 */}
            <div className="flex items-center gap-2 bg-slate-800/50 p-2 rounded-xl">
              <button
                onClick={() => { setActiveCategory('all'); setPage(1); }}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeCategory === 'all' 
                    ? 'bg-amber-500 text-white' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                全部
              </button>
              {Object.entries(CATEGORY_INFO).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => { setActiveCategory(key); setPage(1); }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    activeCategory === key 
                      ? 'bg-amber-500 text-white' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {info.icon}
                  <span className="hidden sm:inline">{info.name}</span>
                </button>
              ))}
            </div>

            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="搜索新闻..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            {/* 新闻列表 */}
            {loading ? (
              <div className="flex justify-center py-20">
                <Spinner className="w-8 h-8" />
              </div>
            ) : newsList.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="py-12 text-center">
                  <Newspaper className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">暂无新闻</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {newsList.map((news) => (
                  <Link key={news.id} href={`/news/${news.id}`}>
                    <Card className="bg-slate-800/50 border-slate-700 hover:border-amber-500/50 transition-all hover:bg-slate-800/80 cursor-pointer">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* 分类标签 */}
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={CATEGORY_COLORS[news.category] || 'bg-gray-100 text-gray-700'}>
                                {CATEGORY_INFO[news.category]?.name || news.category}
                              </Badge>
                              <span className="text-slate-500 text-sm flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(news.newsDate)}
                              </span>
                            </div>
                            
                            {/* 标题 */}
                            <h3 className="text-lg font-semibold text-white mb-2 hover:text-amber-400 transition-colors">
                              {news.title}
                            </h3>
                            
                            {/* 摘要 */}
                            <p className="text-slate-400 text-sm mb-3 line-clamp-2">
                              {truncateContent(news.content)}
                            </p>
                            
                            {/* 底部信息 */}
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {news.author}
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {news.views} 阅读
                              </span>
                            </div>
                          </div>
                          
                          {/* 箭头 */}
                          <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0 mt-8" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}

                {/* 分页 */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="border-slate-700 text-slate-300"
                    >
                      上一页
                    </Button>
                    <span className="px-4 py-2 text-slate-400">
                      第 {page} / {totalPages} 页
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="border-slate-700 text-slate-300"
                    >
                      下一页
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            {/* 实时金价卡片 */}
            <GoldPriceCard />

            {/* 热门标签 */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  热门标签
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {['伦敦金', '市场分析', '美联储', 'CPI', 'K线征途', '天梯赛', '冠军', '每日挑战'].map((tag) => (
                    <Badge 
                      key={tag}
                      variant="secondary"
                      className="bg-slate-700 text-slate-300 hover:bg-amber-500 hover:text-white cursor-pointer"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 关于我们 */}
            <Card className="bg-gradient-to-br from-amber-600/20 to-orange-600/20 border-amber-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Newspaper className="w-5 h-5 text-amber-500" />
                  关于资讯
                </CardTitle>
              </CardHeader>
              <CardContent className="text-slate-300 text-sm space-y-2">
                <p>
                  <strong className="text-amber-400">金查理</strong>是金火火的AI分析师，每日为您提供伦敦金市场深度分析。
                </p>
                <p>
                  资讯涵盖市场分析、平台动态、热点消息，助您把握投资机会。
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// 默认导出 - 用 Suspense 包裹
export default function NewsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    }>
      <NewsContent />
    </Suspense>
  );
}

// 实时金价组件
function GoldPriceCard() {
  const [price, setPrice] = useState<{ buy: number; sell: number; spread: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchPrice = async () => {
    try {
      const res = await fetch('/api/gold-price');
      const data = await res.json();
      if (data.success && data.data) {
        setPrice({
          buy: data.data.ask,
          sell: data.data.bid,
          spread: data.data.spread,
        });
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-amber-900/50 to-yellow-900/50 border-amber-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            伦敦金实时价格
          </span>
          <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-xs">
            实时
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Spinner className="w-6 h-6" />
        ) : price ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">买价（卖/卖出）</span>
              <span className="text-green-400 font-bold text-xl">
                ${price.sell.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">卖价（买/买入）</span>
              <span className="text-red-400 font-bold text-xl">
                ${price.buy.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-700">
              <span className="text-slate-500 text-xs">点差</span>
              <span className="text-slate-400 text-sm">{price.spread.toFixed(2)}</span>
            </div>
            <p className="text-xs text-slate-500 text-center">
              数据来源: Swissquote
            </p>
          </div>
        ) : (
          <p className="text-slate-400 text-sm">价格获取中...</p>
        )}
      </CardContent>
    </Card>
  );
}
