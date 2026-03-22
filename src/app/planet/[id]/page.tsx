'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PlanetDetailSkeleton, SignalCardSkeleton } from '@/components/loading-skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { 
  Eye,
  AlertCircle,
  CheckCircle2,
  Coins,
  BarChart3,
  ChevronRight,
  Signal,
  UserPlus,
  Clock,
  MessageSquare,
  Heart,
  MessageCircle,
  Pin,
  Send,
  Lock
} from 'lucide-react';

interface PlanetDetail {
  planet: {
    id: number;
    name: string;
    description: string;
    rules: string;
    ticketPrice: number;
    status: string;
    inviteCode: string;
    createdAt: string;
    forumEnabled: boolean;
  };
  members: Array<{
    userId: string;
    role: string;
    joinedAt: string;
  }>;
  userRole: string | null;
  memberCount: number;
}

interface SignalSource {
  id: number;
  accountNumber: string;
  broker: string;
  platform: string;
  isVerified: boolean;
  totalProfit: string;
  winRate: string;
  totalTrades: number;
  returnRate: string;
  maxDrawdown: string;
  profitFactor: string;
}

interface ForumPost {
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

export default function PlanetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [data, setData] = useState<PlanetDetail | null>(null);
  const [signalSources, setSignalSources] = useState<SignalSource[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [forumLoading, setForumLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [applyingPublisher, setApplyingPublisher] = useState(false);
  const [publisherApplicationStatus, setPublisherApplicationStatus] = useState<string | null>(null);
  const [isBanned, setIsBanned] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  
  // 发帖状态
  const [newPostContent, setNewPostContent] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchPlanetDetail();
  }, [params.id]);

  useEffect(() => {
    if (data?.userRole) {
      fetchSignalSources();
      fetchPublisherApplicationStatus();
      fetchForumPosts();
      checkBanStatus();
    }
  }, [data?.userRole]);

  const fetchPublisherApplicationStatus = async () => {
    try {
      const res = await fetch(`/api/planet/applications?planetId=${params.id}`);
      const result = await res.json();
      if (result.application) {
        setPublisherApplicationStatus(result.application.status);
      }
    } catch (error) {
      console.error('Failed to fetch application status:', error);
    }
  };

  const fetchPlanetDetail = async () => {
    try {
      const res = await fetch(`/api/planet/${params.id}`);
      const planetData = await res.json();
      setData(planetData);
    } catch (error) {
      console.error('Failed to fetch planet:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSignalSources = async () => {
    try {
      const res = await fetch(`/api/signals/stats?planetId=${params.id}`);
      const result = await res.json();
      setSignalSources(result.signalSources || []);
    } catch (error) {
      console.error('Failed to fetch signal sources:', error);
    } finally {
      setSignalsLoading(false);
    }
  };

  const fetchForumPosts = async () => {
    try {
      const res = await fetch(`/api/forum/posts?planetId=${params.id}`);
      const result = await res.json();
      setForumPosts(result.posts || []);
    } catch (error) {
      console.error('Failed to fetch forum posts:', error);
    } finally {
      setForumLoading(false);
    }
  };

  const checkBanStatus = async () => {
    if (data?.userRole === 'owner') return;
    try {
      const res = await fetch(`/api/forum/ban/check?planetId=${params.id}`);
      if (res.ok) {
        const result = await res.json();
        setIsBanned(result.isBanned);
      }
    } catch (error) {
      console.error('Failed to check ban status:', error);
    }
  };

  const handleJoin = async (method: 'purchase' | 'invite') => {
    if (!session) {
      router.push('/login');
      return;
    }

    if (method === 'invite' && !inviteCode) {
      setError('请输入邀请码');
      return;
    }

    setJoining(true);
    setError('');

    try {
      const res = await fetch('/api/planet/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planetId: data?.planet.id,
          method,
          inviteCode: method === 'invite' ? inviteCode : undefined,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || '加入失败');
      } else {
        setSuccess('成功加入星球！');
        fetchPlanetDetail();
      }
    } catch (err) {
      setError('加入失败，请稍后重试');
    } finally {
      setJoining(false);
    }
  };

  const handleApplyPublisher = async () => {
    if (!session) {
      router.push('/login');
      return;
    }

    setApplyingPublisher(true);
    setError('');

    try {
      const res = await fetch('/api/planet/apply-publisher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planetId: data?.planet.id }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || '申请失败');
      } else {
        setSuccess('申请已提交，请等待星主审核');
        setPublisherApplicationStatus('pending');
      }
    } catch (err) {
      setError('申请失败，请稍后重试');
    } finally {
      setApplyingPublisher(false);
    }
  };

  const handlePostSubmit = async () => {
    if (!newPostContent.trim()) return;

    setPosting(true);
    try {
      const res = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planetId: data?.planet.id,
          title: newPostContent.substring(0, 50),
          content: newPostContent,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.error || '发帖失败');
      } else {
        setNewPostContent('');
        fetchForumPosts();
      }
    } catch (err) {
      alert('发帖失败，请稍后重试');
    } finally {
      setPosting(false);
    }
  };

  const formatTime = (dateStr: string) => {
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
        <div className="max-w-7xl mx-auto">
          <PlanetDetailSkeleton />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold mb-2">星球不存在</h2>
            <p className="text-gray-500 mb-4">该星球可能已被删除或您没有访问权限</p>
            <Link href="/planet">
              <Button>返回星球列表</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { planet, userRole } = data;
  const showForumInput = userRole && !isBanned && planet.forumEnabled;

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4 ${showForumInput ? 'pb-24' : ''}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {planet.name}
                </h1>
                <Badge variant={planet.status === 'active' ? 'default' : 'secondary'} className="text-sm">
                  {planet.status === 'active' ? '活跃' : '已关闭'}
                </Badge>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {planet.description || '暂无描述'}
              </p>
            </div>
            {userRole === 'owner' && (
              <Link href={`/planet/manage/${planet.id}`}>
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                  管理星球
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Join Section */}
        {!userRole && (
          <Card className="mb-8 border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
            <CardHeader>
              <CardTitle>加入星球</CardTitle>
              <CardDescription>购买门票或使用邀请码加入星球</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-400">{success}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col md:flex-row gap-4">
                {planet.ticketPrice > 0 && (
                  <Button
                    onClick={() => handleJoin('purchase')}
                    disabled={joining || !session}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 h-12"
                  >
                    {joining ? (
                      <>
                        <Spinner className="mr-2" />
                        处理中...
                      </>
                    ) : (
                      <>
                        <Coins className="w-4 h-4 mr-2" />
                        购买门票加入（{planet.ticketPrice} 星球币）
                      </>
                    )}
                  </Button>
                )}

                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    placeholder="输入邀请码"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:border-gray-700"
                  />
                  <Button
                    variant="outline"
                    onClick={() => handleJoin('invite')}
                    disabled={joining || !session}
                    className="border-purple-300 dark:border-purple-700"
                  >
                    使用邀请码
                  </Button>
                </div>
              </div>

              {!session && (
                <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                  <Link href="/login" className="text-purple-600 hover:underline font-medium">
                    登录
                  </Link>
                  后加入星球
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Member Info */}
        {userRole && (
          <div className="mb-8 space-y-4">
            <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                您已是该星球成员（角色：{userRole === 'owner' ? '星主' : userRole === 'publisher' ? '发布者' : '跟单者'}）
              </AlertDescription>
            </Alert>
            
            {/* 申请成为发布者按钮 */}
            {userRole === 'follower' && (
              <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                        <UserPlus className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-blue-800 dark:text-blue-300">申请成为信号发布者</h3>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          成为发布者后可绑定MT账号分享交易信号
                        </p>
                      </div>
                    </div>
                    {publisherApplicationStatus === 'pending' ? (
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <Clock className="w-5 h-5" />
                        <span className="text-sm font-medium">申请审核中</span>
                      </div>
                    ) : publisherApplicationStatus === 'rejected' ? (
                      <Button
                        onClick={handleApplyPublisher}
                        disabled={applyingPublisher}
                        variant="outline"
                        className="border-blue-300 dark:border-blue-700"
                      >
                        {applyingPublisher ? (
                          <>
                            <Spinner className="mr-2" />
                            申请中...
                          </>
                        ) : (
                          '重新申请'
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleApplyPublisher}
                        disabled={applyingPublisher}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      >
                        {applyingPublisher ? (
                          <>
                            <Spinner className="mr-2" />
                            申请中...
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-2" />
                            申请成为发布者
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* 星球公告 */}
            {planet.rules && (
              <Card className="border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">星球公告</h3>
                      <p className="text-amber-700 dark:text-amber-400 text-sm whitespace-pre-wrap">
                        {planet.rules}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Two Column Layout - 论坛在左，信号在右 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Forum */}
          {planet.forumEnabled && userRole && (
            <div className="lg:order-1">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquare className="w-5 h-5 text-purple-500" />
                    星球论坛
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {isBanned && (
                    <Alert className="mb-3 border-red-200 bg-red-50 dark:bg-red-900/20">
                      <Lock className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-600 text-sm">
                        您已被禁言，无法发帖
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {forumLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse flex gap-3 p-3">
                          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : forumPosts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">暂无帖子，来发第一条吧！</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {forumPosts.map(post => (
                        <Link 
                          key={post.id} 
                          href={`/planet/${planet.id}/forum/${post.id}`}
                          className="block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="flex gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                              {post.userName?.charAt(0) || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{post.userName || '用户'}</span>
                                {post.isPinned && (
                                  <Badge variant="secondary" className="text-xs py-0 h-4">
                                    <Pin className="w-2.5 h-2.5 mr-1" />
                                    置顶
                                  </Badge>
                                )}
                                <span className="text-xs text-gray-400">{formatTime(post.createdAt)}</span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 break-words">
                                {post.content}
                              </p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Heart className="w-3 h-3" />
                                  {post.likeCount || 0}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MessageCircle className="w-3 h-3" />
                                  {post.commentCount || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Right Column: Signal Sources */}
          <div className={planet.forumEnabled && userRole ? 'lg:order-2' : ''}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Signal className="w-5 h-5 text-purple-500" />
                  信号展示
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userRole ? (
                  signalsLoading ? (
                    <div className="space-y-4">
                      <SignalCardSkeleton />
                      <SignalCardSkeleton />
                    </div>
                  ) : signalSources.length > 0 ? (
                    <div className="space-y-4">
                      {signalSources.map((source, index) => (
                        <Link 
                          key={source.id}
                          href={`/signal/${source.accountNumber}?planetId=${planet.id}`}
                          className="block"
                        >
                          <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                            <CardContent className="p-0">
                              <div className="flex items-center p-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-lg font-bold mr-3">
                                  {index + 1}
                                </div>
                                
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-xs">
                                      {source.platform}
                                    </Badge>
                                    {source.isVerified && (
                                      <Badge className="bg-green-500 text-xs">已验证</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    账号: {source.accountNumber}
                                  </p>
                                  
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                      <p className="text-xs text-gray-500">总盈利</p>
                                      <p className={`text-base font-bold ${parseFloat(source.totalProfit) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        ${source.totalProfit}
                                      </p>
                                    </div>
                                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                      <p className="text-xs text-gray-500">收益率</p>
                                      <p className={`text-base font-bold ${parseFloat(source.returnRate) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {source.returnRate}%
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <BarChart3 className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-gray-500">暂无信号源</p>
                      <p className="text-gray-400 text-sm mt-1">信号发布者绑定MT账号后展示</p>
                    </div>
                  )
                ) : (
                  <div className="py-12 text-center">
                    <Eye className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 mb-1">加入星球后可查看信号源</p>
                    <p className="text-gray-400 text-sm">成为会员，获取实时交易信号</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 底部发帖输入框 - 固定在底部 */}
      {showForumInput && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-3 shadow-lg z-50">
          <div className="max-w-7xl mx-auto">
            <div className="flex gap-2">
              <Textarea
                placeholder="写下你想说的..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                className="flex-1 min-h-[40px] max-h-24 resize-none text-sm"
                rows={1}
                maxLength={5000}
              />
              <Button
                onClick={handlePostSubmit}
                disabled={posting || !newPostContent.trim()}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 h-10 px-4"
                size="sm"
              >
                {posting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
