'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  MessageSquare, 
  Heart, 
  MessageCircle, 
  Pin, 
  Plus, 
  ArrowLeft,
  Clock,
  User,
  AlertCircle,
  Lock
} from 'lucide-react';

interface Post {
  id: number;
  title: string;
  content: string;
  likeCount: number;
  commentCount: number;
  isPinned: boolean;
  createdAt: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
}

interface PlanetInfo {
  id: number;
  name: string;
  forumEnabled: boolean;
}

export default function ForumPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [planet, setPlanet] = useState<PlanetInfo | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
  
  // 发帖对话框
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPlanetInfo();
    fetchPosts();
  }, [params.id]);

  const fetchPlanetInfo = async () => {
    try {
      const res = await fetch(`/api/planet/${params.id}`);
      const data = await res.json();
      setPlanet(data.planet);
      setUserRole(data.userRole);
      
      // 检查是否被禁言
      if (data.userRole && data.userRole !== 'owner') {
        const banRes = await fetch(`/api/forum/ban/check?planetId=${params.id}`);
        if (banRes.ok) {
          const banData = await banRes.json();
          setIsBanned(banData.isBanned);
        }
      }
    } catch (error) {
      console.error('Failed to fetch planet:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch(`/api/forum/posts?planetId=${params.id}`);
      const data = await res.json();
      if (data.error) {
        console.error(data.error);
      } else {
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPost = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      setError('请填写标题和内容');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planetId: parseInt(params.id as string),
          title: newTitle,
          content: newContent,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '发帖失败');
      } else {
        setNewTitle('');
        setNewContent('');
        setDialogOpen(false);
        fetchPosts();
      }
    } catch (err) {
      setError('发帖失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!planet?.forumEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-6 text-center">
              <Lock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold mb-2">论坛未开启</h2>
              <p className="text-gray-500 mb-4">该星球未开启论坛功能</p>
              <Link href={`/planet/${params.id}`}>
                <Button>返回星球</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href={`/planet/${params.id}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-purple-500" />
                星球论坛
              </h1>
              <p className="text-gray-500 text-sm">{planet.name}</p>
            </div>
          </div>

          {userRole && !isBanned && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600">
                  <Plus className="w-4 h-4 mr-2" />
                  发帖
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>发布新帖</DialogTitle>
                  <DialogDescription>
                    分享你的想法和见解
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div>
                    <label className="text-sm font-medium mb-1 block">标题</label>
                    <Input
                      placeholder="请输入帖子标题"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">内容</label>
                    <Textarea
                      placeholder="请输入帖子内容..."
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      rows={6}
                      maxLength={5000}
                    />
                    <p className="text-xs text-gray-400 mt-1">{newContent.length}/5000</p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={handleSubmitPost} disabled={submitting}>
                      {submitting ? '发布中...' : '发布'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* 禁言提示 */}
        {isBanned && (
          <Alert className="mb-4 border-red-200 bg-red-50 dark:bg-red-900/20">
            <Lock className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700 dark:text-red-400">
              您已被禁言，无法发帖和评论
            </AlertDescription>
          </Alert>
        )}

        {/* Posts List */}
        {posts.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-16">
              <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold mb-2">暂无帖子</h3>
              <p className="text-gray-500">成为第一个发帖的人吧！</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <Link key={post.id} href={`/planet/${params.id}/forum/${post.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* 头像 */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {post.userName?.charAt(0) || 'U'}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {post.isPinned && (
                            <Badge variant="secondary" className="text-xs">
                              <Pin className="w-3 h-3 mr-1" />
                              置顶
                            </Badge>
                          )}
                          <h3 className="font-semibold truncate">{post.title}</h3>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                          {post.content}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {post.userName || '未知用户'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(post.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {post.likeCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {post.commentCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
