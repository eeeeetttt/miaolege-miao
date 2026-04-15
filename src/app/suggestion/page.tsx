'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Lightbulb,
  Send,
  ThumbsUp,
  ChevronLeft,
  CheckCircle,
  Clock,
  User,
} from 'lucide-react';
import Link from 'next/link';

interface Suggestion {
  id: number;
  user_id: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  like_count: number;
  isLiked?: boolean;
  created_at: string;
  user?: {
    userId: string;
    name: string | null;
    avatar: string | null;
  };
}

export default function SuggestionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState('');
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSuggestions = async () => {
    try {
      const res = await fetch('/api/suggestion');
      const data = await res.json();
      if (data.success) {
        setSuggestions(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchSuggestions();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      showToast('请填写建议内容', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('建议提交成功，等待审核', 'success');
        setContent('');
        setShowForm(false);
        fetchSuggestions();
      } else {
        showToast(data.error || '提交失败', 'error');
      }
    } catch (err) {
      showToast('提交失败，请重试', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (suggestionId: number) => {
    if (!session) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch('/api/suggestion/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId }),
      });
      const data = await res.json();
      if (data.success) {
        // 更新本地状态
        setSuggestions((prev) =>
          prev.map((s) =>
            s.id === suggestionId
              ? {
                  ...s,
                  isLiked: data.liked,
                  like_count: data.liked ? s.like_count + 1 : s.like_count - 1,
                }
              : s
          )
        );
      }
    } catch (err) {
      showToast('操作失败', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/user">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              返回
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-amber-500" />
            <h1 className="text-2xl font-bold">意见建议</h1>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
              toast.type === 'success'
                ? 'bg-green-500 text-white'
                : 'bg-red-500 text-white'
            }`}
          >
            {toast.message}
          </div>
        )}

        {/* 提交建议表单 */}
        {showForm ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>提出建议</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="请写下您的宝贵建议..."
                    rows={6}
                    maxLength={2000}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {content.length}/2000
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-amber-500 hover:bg-amber-600"
                  >
                    {submitting ? (
                      <>
                        <Spinner className="w-4 h-4 mr-2" />
                        提交中...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        提交建议
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    取消
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Button
            onClick={() => setShowForm(true)}
            className="w-full mb-6 bg-amber-500 hover:bg-amber-600"
          >
            <Lightbulb className="w-4 h-4 mr-2" />
            提出建议
          </Button>
        )}

        {/* 建议列表 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            精选建议 ({suggestions.length})
          </h2>

          {suggestions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无建议</p>
                <p className="text-sm mt-2">成为第一个提出建议的人吧！</p>
              </CardContent>
            </Card>
          ) : (
            suggestions.map((suggestion) => (
              <Card key={suggestion.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        {suggestion.user?.avatar ? (
                          <AvatarImage src={suggestion.user.avatar} />
                        ) : (
                          <AvatarFallback>
                            <User className="w-4 h-4" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {suggestion.user?.name || '匿名用户'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(suggestion.created_at).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">
                        {suggestion.like_count} 赞
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {suggestion.content}
                  </p>
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <Button
                      variant={suggestion.isLiked ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleLike(suggestion.id)}
                      className={
                        suggestion.isLiked
                          ? 'bg-amber-500 hover:bg-amber-600'
                          : ''
                      }
                    >
                      <ThumbsUp className="w-4 h-4 mr-1" />
                      {suggestion.isLiked ? '已赞' : '点赞'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
