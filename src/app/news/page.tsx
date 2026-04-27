'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { formatDate } from '@/lib/utils';
import { Calendar, User, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface NewsItem {
  id: number;
  title: string;
  content: string;
  author: string;
  news_date: string;
  created_at: string;
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    loadNews();
  }, [page]);

  const loadNews = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/news?page=${page}&pageSize=${pageSize}`);
      const data = await res.json();
      if (data.success) {
        setNews(data.data);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('加载新闻失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <Link href="/social" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          返回社交中心
        </Link>
        <h1 className="text-3xl font-bold">金查理伦敦金日报</h1>
        <p className="text-muted-foreground mt-2">每日伦敦金市场分析，操作建议</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : news.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">暂无新闻</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {news.map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-xl leading-relaxed">{item.title}</CardTitle>
                  <Badge variant="outline" className="shrink-0">
                    日报
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {item.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(item.news_date)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {item.content.split('\n').map((paragraph, index) => (
                    paragraph.trim() && (
                      <p key={index} className="mb-3 text-base leading-relaxed">
                        {paragraph}
                      </p>
                    )
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                上一页
              </button>
              <span className="px-4 py-2">
                第 {page} / {totalPages} 页
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg border bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                下一页
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
