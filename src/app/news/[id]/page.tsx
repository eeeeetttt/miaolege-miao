'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { 
  Newspaper, TrendingUp, Trophy, Zap, Calendar, 
  User, Eye, ArrowLeft, Share2, Clock
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

export default function NewsDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [news, setNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchNews(params.id as string);
    }
  }, [params.id]);

  const fetchNews = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/news/${id}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setNews(data.data);
      } else {
        setError(data.error || '新闻不存在');
      }
    } catch (e) {
      setError('获取新闻失败');
    } finally {
      setLoading(false);
    }
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 分享功能
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: news?.title,
          text: news?.content.substring(0, 100) + '...',
          url: window.location.href,
        });
      } catch (e) {
        // 用户取消分享
      }
    } else {
      // 复制链接
      navigator.clipboard.writeText(window.location.href);
      alert('链接已复制到剪贴板');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error || !news) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <Card className="bg-slate-800/50 border-slate-700 max-w-md">
          <CardContent className="py-12 text-center">
            <Newspaper className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">{error || '新闻不存在'}</p>
            <Link href="/news">
              <Button variant="outline" className="border-slate-600 text-slate-300">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回资讯列表
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* 顶部背景 */}
      <div className="relative bg-gradient-to-r from-amber-600 to-orange-600 py-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
        <div className="container mx-auto px-4 relative">
          <Link href="/news">
            <Button variant="ghost" className="text-white hover:text-amber-300 hover:bg-white/10 -ml-3">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回资讯列表
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* 主内容区 */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-8">
                {/* 分类和日期 */}
                <div className="flex items-center gap-4 mb-4">
                  <Badge className="bg-blue-100 text-blue-700">
                    {CATEGORY_INFO[news.category]?.icon}
                    <span className="ml-1">{CATEGORY_INFO[news.category]?.name || news.category}</span>
                  </Badge>
                  <span className="text-slate-500 text-sm flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(news.newsDate)}
                  </span>
                </div>

                {/* 标题 */}
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">
                  {news.title}
                </h1>

                {/* 作者信息 */}
                <div className="flex items-center gap-6 pb-6 border-b border-slate-700 mb-6">
                  <span className="text-slate-400 text-sm flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {news.author}
                  </span>
                  <span className="text-slate-400 text-sm flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {news.views} 阅读
                  </span>
                  <span className="text-slate-400 text-sm flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {new Date(news.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>

                {/* 正文内容 */}
                <div className="prose prose-invert prose-amber max-w-none">
                  <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {news.content}
                  </div>
                </div>

                {/* 标签 */}
                {news.tags && news.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-slate-700">
                    {news.tags.map((tag, index) => (
                      <Badge 
                        key={index}
                        variant="secondary"
                        className="bg-slate-700 text-slate-300"
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* 分享按钮 */}
                <div className="flex justify-end mt-6">
                  <Button 
                    variant="outline" 
                    className="border-slate-600 text-slate-300"
                    onClick={handleShare}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    分享
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            {/* 实时金价卡片 */}
            <GoldPriceCard />

            {/* 相关推荐 */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Newspaper className="w-4 h-4 text-amber-500" />
                  相关推荐
                </h3>
                <div className="space-y-3">
                  <Link href="/news?category=market" className="block text-slate-400 hover:text-amber-400 text-sm">
                    伦敦金市场分析
                  </Link>
                  <Link href="/news?category=platform" className="block text-slate-400 hover:text-amber-400 text-sm">
                    平台最新动态
                  </Link>
                  <Link href="/challenge" className="block text-slate-400 hover:text-amber-400 text-sm">
                    参加K线征途挑战
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
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
      <CardContent className="p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          伦敦金实时价格
        </h3>
        {loading ? (
          <Spinner className="w-6 h-6" />
        ) : price ? (
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">买价（卖出）</span>
              <span className="text-green-400 font-bold">${price.sell.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">卖价（买入）</span>
              <span className="text-red-400 font-bold">${price.buy.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-700">
              <span className="text-slate-500 text-xs">点差</span>
              <span className="text-slate-400 text-sm">{price.spread.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <p className="text-slate-400 text-sm">价格获取中...</p>
        )}
      </CardContent>
    </Card>
  );
}
