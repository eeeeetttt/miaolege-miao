'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  Clock, 
  User,
  AlertCircle,
  Lock,
  MoreVertical,
  Trash2,
  Pin
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Comment {
  id: number;
  content: string;
  likeCount: number;
  parentId: number | null;
  createdAt: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  isLiked: boolean;
  replies: Comment[];
}

interface Post {
  id: number;
  planetId: number;
  title: string;
  content: string;
  likeCount: number;
  commentCount: number;
  isPinned: boolean;
  createdAt: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  isLiked: boolean;
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
  
  // 评论状态
  const [replyContent, setReplyContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPostDetail();
  }, [params.postId]);

  const fetchPostDetail = async () => {
    try {
      const res = await fetch(`/api/forum/posts/${params.postId}`);
      const data = await res.json();
      
      if (data.error) {
        console.error(data.error);
      } else {
        setPost(data.post);
        setComments(data.comments || []);
        setUserRole(data.userRole);
        
        // 检查是否被禁言
        if (data.userRole && data.userRole !== 'owner') {
          const banRes = await fetch(`/api/forum/ban/check?planetId=${data.post.planetId}`);
          if (banRes.ok) {
            const banData = await banRes.json();
            setIsBanned(banData.isBanned);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch post:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!session) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch('/api/forum/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: 'post',
          targetId: post?.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPost(prev => prev ? {
          ...prev,
          isLiked: data.liked,
          likeCount: data.liked ? prev.likeCount + 1 : prev.likeCount - 1,
        } : null);
      }
    } catch (error) {
      console.error('Failed to like:', error);
    }
  };

  const handleCommentLike = async (commentId: number, isLiked: boolean) => {
    if (!session) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch('/api/forum/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: 'comment',
          targetId: commentId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        updateCommentLike(comments, commentId, data.liked);
        setComments([...comments]);
      }
    } catch (error) {
      console.error('Failed to like comment:', error);
    }
  };

  const updateCommentLike = (comments: Comment[], commentId: number, isLiked: boolean) => {
    for (const comment of comments) {
      if (comment.id === commentId) {
        comment.isLiked = isLiked;
        comment.likeCount = isLiked ? comment.likeCount + 1 : comment.likeCount - 1;
        return true;
      }
      if (comment.replies.length > 0) {
        if (updateCommentLike(comment.replies, commentId, isLiked)) {
          return true;
        }
      }
    }
    return false;
  };

  const handleSubmitComment = async (parentId: number | null) => {
    if (!replyContent.trim()) {
      setError('请输入评论内容');
      return;
    }

    if (!session) {
      router.push('/login');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/forum/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post?.id,
          content: replyContent,
          parentId: parentId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '评论失败');
      } else {
        setReplyContent('');
        setReplyingTo(null);
        fetchPostDetail();
      }
    } catch (err) {
      setError('评论失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('确定要删除这篇帖子吗？')) return;

    try {
      const res = await fetch(`/api/forum/posts/${post?.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        router.push(`/planet/${params.id}/forum`);
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('确定要删除这条评论吗？')) return;

    try {
      const res = await fetch(`/api/forum/comments?commentId=${commentId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        fetchPostDetail();
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
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

  const renderComment = (comment: Comment, depth = 0) => (
    <div key={comment.id} className={`${depth > 0 ? 'ml-8 mt-3' : 'mt-4'}`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {comment.userName?.charAt(0) || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">{comment.userName || '未知用户'}</span>
            <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
          </div>
          <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">{comment.content}</p>
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => handleCommentLike(comment.id, comment.isLiked)}
              className={`flex items-center gap-1 text-xs ${comment.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
            >
              <Heart className={`w-3 h-3 ${comment.isLiked ? 'fill-current' : ''}`} />
              {comment.likeCount > 0 && comment.likeCount}
            </button>
            {!isBanned && (
              <button
                onClick={() => setReplyingTo(comment.id)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-purple-500"
              >
                <MessageCircle className="w-3 h-3" />
                回复
              </button>
            )}
            {(comment.userId === session?.user?.id || userRole === 'owner') && (
              <button
                onClick={() => handleDeleteComment(comment.id)}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                删除
              </button>
            )}
          </div>

          {/* 回复框 */}
          {replyingTo === comment.id && !isBanned && (
            <div className="mt-3 flex gap-2">
              <Textarea
                placeholder="写下你的回复..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="text-sm"
                rows={2}
              />
              <div className="flex flex-col gap-1">
                <Button size="sm" onClick={() => handleSubmitComment(comment.id)} disabled={submitting}>
                  回复
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)}>
                  取消
                </Button>
              </div>
            </div>
          )}

          {/* 子评论 */}
          {comment.replies.length > 0 && (
            <div className="border-l-2 border-gray-100 dark:border-gray-800 pl-4">
              {comment.replies.map(reply => renderComment(reply, depth + 1))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold mb-2">帖子不存在</h2>
              <p className="text-gray-500 mb-4">该帖子可能已被删除</p>
              <Link href={`/planet/${params.id}/forum`}>
                <Button>返回论坛</Button>
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
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/planet/${params.id}/forum`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">帖子详情</h1>
        </div>

        {/* Post */}
        <Card className="mb-6">
          <CardContent className="p-6">
            {/* Post Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-lg font-bold">
                  {post.userName?.charAt(0) || 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{post.userName || '未知用户'}</span>
                    {post.isPinned && (
                      <Badge variant="secondary" className="text-xs">
                        <Pin className="w-3 h-3 mr-1" />
                        置顶
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">{formatDate(post.createdAt)}</span>
                </div>
              </div>
              
              {/* Actions */}
              {(post.userId === session?.user?.id || userRole === 'owner') && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {userRole === 'owner' && (
                      <DropdownMenuItem>
                        <Pin className="w-4 h-4 mr-2" />
                        {post.isPinned ? '取消置顶' : '置顶'}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleDeletePost} className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" />
                      删除帖子
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold mb-4">{post.title}</h2>

            {/* Content */}
            <div className="prose dark:prose-invert max-w-none mb-6">
              <p className="whitespace-pre-wrap">{post.content}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-6 pt-4 border-t">
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 ${post.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
              >
                <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-current' : ''}`} />
                <span>点赞 {post.likeCount > 0 && `(${post.likeCount})`}</span>
              </button>
              <span className="flex items-center gap-2 text-gray-500">
                <MessageCircle className="w-5 h-5" />
                <span>评论 ({post.commentCount})</span>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 禁言提示 */}
        {isBanned && (
          <Alert className="mb-4 border-red-200 bg-red-50 dark:bg-red-900/20">
            <Lock className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700 dark:text-red-400">
              您已被禁言，无法发表评论
            </AlertDescription>
          </Alert>
        )}

        {/* Comment Input */}
        {session && !isBanned && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {session.user?.name?.charAt(0) || 'U'}
                </div>
                <div className="flex-1">
                  <Textarea
                    placeholder="写下你的评论..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end mt-2">
                    <Button 
                      onClick={() => handleSubmitComment(null)} 
                      disabled={submitting || !replyContent.trim()}
                    >
                      {submitting ? '发送中...' : '发送评论'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comments */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">全部评论 ({post.commentCount})</h3>
            {comments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>暂无评论，快来抢沙发吧！</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {comments.map(comment => renderComment(comment))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
