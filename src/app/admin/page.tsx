'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import AIConfigPanel from '@/components/ai-config-admin';
import { 
  Shield, Users, Globe, TrendingUp, BarChart3, Coins, 
  Settings, FileText, CreditCard, MessageSquare, Lightbulb,
  Search, Edit, Save, Trash2, Check, X, Plus, AlertCircle, CheckCircle2,
  Bot, ScrollText, Navigation, UserCog
} from 'lucide-react';

// 类型定义
interface Stats {
  totalUsers: number;
  totalPlanets: number;
  totalSignalSources: number;
  totalCoins: number;
  activeFollows: number;
}

interface UserInfo {
  userId: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
  coinBalance: number;
  goldBalance: number;
  silverBalance: number;
  role: string;
  createdAt: Date | null;
}

interface RechargeApplication {
  id: number;
  userId: string;
  userName: string;
  amount: number;
  status: string;
  createdAt: string;
  note?: string;
}

interface Complaint {
  id: number;
  userId: string;
  userName: string;
  content: string;
  status: string;
  createdAt: string;
  reply?: string;
}

interface Suggestion {
  id: number;
  userId: string;
  userName: string;
  content: string;
  status: string;
  createdAt: string;
}

interface NavConfig {
  nav_show_challenge_hall: boolean;
  nav_show_kline_challenge: boolean;
  nav_show_social: boolean;
  nav_show_docs: boolean;
  nav_show_suggestion: boolean;
  nav_show_complaint: boolean;
  nav_show_download: boolean;
}

interface SystemConfig {
  planet_price_7days: number;
  planet_price_1year: number;
  planet_price_3years: number;
  planet_price_permanent: number;
  planetCreationThreshold: number;
  rechargeEnabled: boolean;
  defaultTicketPrice: number;
  maxPublishers: number;
  customer_service_qq?: string;
  customer_service_wechat?: string;
  wechat_exchange_rate: number;
  wechat_enabled: boolean;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  // 基础状态
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  // 数据状态
  const [stats, setStats] = useState<Stats | null>(null);
  const [config, setConfig] = useState<SystemConfig>({
    planet_price_7days: 0,
    planet_price_1year: 1999,
    planet_price_3years: 2999,
    planet_price_permanent: 4999,
    planetCreationThreshold: 0,
    rechargeEnabled: true,
    defaultTicketPrice: 100,
    maxPublishers: 3,
    customer_service_qq: '',
    customer_service_wechat: '',
    wechat_exchange_rate: 7,
    wechat_enabled: true,
  });
  
  // 用户管理
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const [editForm, setEditForm] = useState<{ coinBalance: string; goldBalance: string; silverBalance: string; role: string }>({ coinBalance: '', goldBalance: '', silverBalance: '', role: '' });
  
  // 充值审核
  const [rechargeApps, setRechargeApps] = useState<RechargeApplication[]>([]);
  const [rechargeLoading, setRechargeLoading] = useState(false);
  
  // 投诉管理
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [replyDialog, setReplyDialog] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyingId, setReplyingId] = useState<number | null>(null);
  
  // 建议管理
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  
  // 导航配置
  const [navConfig, setNavConfig] = useState<NavConfig>({
    nav_show_challenge_hall: true,
    nav_show_kline_challenge: true,
    nav_show_social: true,
    nav_show_docs: true,
    nav_show_suggestion: true,
    nav_show_complaint: true,
    nav_show_download: true,
  });
  
  // 文档管理
  const [docs, setDocs] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docDialog, setDocDialog] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [docForm, setDocForm] = useState({ title: '', slug: '', content: '', category: 'general' });

  // 权限检查
  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    const userRole = session?.user?.role;
    const userEmail = session?.user?.email;
    
    if (userRole === 'admin' || userEmail === '497209390@qq.com') {
      setHasAccess(true);
      fetchStats();
    } else {
      setHasAccess(false);
      setLoading(false);
    }
  }, [status, session, router]);

  // 获取统计数据
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (data.stats) {
        setStats(data.stats);
      }
      if (data.config) {
        setConfig(data.config);
      }
    } catch (err) {
      console.error('Stats fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取用户列表
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch(`/api/admin/users?search=${userSearch}`);
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Users fetch error:', err);
    } finally {
      setUsersLoading(false);
    }
  }, [userSearch]);

  // 获取充值申请
  const fetchRechargeApps = useCallback(async () => {
    setRechargeLoading(true);
    try {
      const res = await fetch('/api/admin/recharge');
      const data = await res.json();
      if (data.applications) {
        setRechargeApps(data.applications);
      }
    } catch (err) {
      console.error('Recharge fetch error:', err);
    } finally {
      setRechargeLoading(false);
    }
  }, []);

  // 获取投诉列表
  const fetchComplaints = useCallback(async () => {
    setComplaintsLoading(true);
    try {
      const res = await fetch('/api/admin/complaint');
      const data = await res.json();
      if (data.complaints) {
        setComplaints(data.complaints);
      }
    } catch (err) {
      console.error('Complaints fetch error:', err);
    } finally {
      setComplaintsLoading(false);
    }
  }, []);

  // 获取建议列表
  const fetchSuggestions = useCallback(async () => {
    setSuggestionsLoading(true);
    try {
      const res = await fetch('/api/admin/suggestion');
      const data = await res.json();
      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (err) {
      console.error('Suggestions fetch error:', err);
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  // 获取文档列表
  const fetchDocs = useCallback(async () => {
    setDocsLoading(true);
    try {
      const res = await fetch('/api/admin/docs');
      const data = await res.json();
      if (data.documents) {
        setDocs(data.documents);
      }
    } catch (err) {
      console.error('Docs fetch error:', err);
    } finally {
      setDocsLoading(false);
    }
  }, []);

  // Tab 切换时加载数据
  useEffect(() => {
    if (!hasAccess) return;
    
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'recharge') fetchRechargeApps();
    if (activeTab === 'complaints') fetchComplaints();
    if (activeTab === 'suggestions') fetchSuggestions();
    if (activeTab === 'docs') fetchDocs();
  }, [activeTab, hasAccess, fetchUsers, fetchRechargeApps, fetchComplaints, fetchSuggestions, fetchDocs]);

  // 保存用户编辑
  const handleSaveUser = async () => {
    if (!editingUser) return;
    
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser.userId,
          coinBalance: editForm.silverBalance || editForm.coinBalance,
          goldBalance: editForm.goldBalance,
          role: editForm.role,
        }),
      });
      
      if (res.ok) {
        setSuccess('用户更新成功');
        setEditingUser(null);
        fetchUsers();
        fetchStats();
      } else {
        const data = await res.json();
        setError(data.error || '更新失败');
      }
    } catch (err) {
      setError('更新失败');
    }
  };

  // 处理充值申请
  const handleRecharge = async (id: number, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/admin/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      
      if (res.ok) {
        setSuccess(action === 'approve' ? '已通过审核' : '已拒绝');
        fetchRechargeApps();
        fetchStats();
      }
    } catch (err) {
      setError('操作失败');
    }
  };

  // 回复投诉
  const handleReplyComplaint = async () => {
    if (!replyingId || !replyContent) return;
    
    try {
      const res = await fetch('/api/admin/complaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: replyingId, reply: replyContent, action: 'reply' }),
      });
      
      if (res.ok) {
        setSuccess('回复成功');
        setReplyDialog(false);
        setReplyContent('');
        setReplyingId(null);
        fetchComplaints();
      }
    } catch (err) {
      setError('回复失败');
    }
  };

  // 处理建议
  const handleSuggestion = async (id: number, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/admin/suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      
      if (res.ok) {
        setSuccess(action === 'approve' ? '已通过' : '已拒绝');
        fetchSuggestions();
      }
    } catch (err) {
      setError('操作失败');
    }
  };

  // 保存系统配置
  const handleSaveConfig = async () => {
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      
      if (res.ok) {
        setSuccess('配置保存成功');
      } else {
        setError('保存失败');
      }
    } catch (err) {
      setError('保存失败');
    }
  };

  // 保存导航配置
  const handleSaveNavConfig = async () => {
    try {
      const res = await fetch('/api/admin/nav-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(navConfig),
      });
      
      if (res.ok) {
        setSuccess('导航配置保存成功');
      } else {
        setError('保存失败');
      }
    } catch (err) {
      setError('保存失败');
    }
  };

  // 保存文档
  const handleSaveDoc = async () => {
    try {
      const isEdit = editingDoc?.id;
      const res = await fetch('/api/admin/docs', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { ...docForm, id: editingDoc.id } : docForm),
      });
      
      if (res.ok) {
        setSuccess('文档保存成功');
        setDocDialog(false);
        fetchDocs();
      } else {
        setError('保存失败');
      }
    } catch (err) {
      setError('保存失败');
    }
  };

  // 加载中
  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center h-64">
          <Spinner className="w-8 h-8" />
          <span className="ml-3 text-gray-600">加载中...</span>
        </div>
      </div>
    );
  }

  // 无权限
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <Shield className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <CardTitle>无权限访问</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-4">您没有管理员权限</p>
              <Button onClick={() => router.push('/')}>返回首页</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
          <Shield className="w-8 h-8 text-purple-500" />
          后台管理
        </h1>
        
        {/* 消息提示 */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50 dark:bg-green-900/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-400">{success}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex flex-wrap gap-2">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="users">用户管理</TabsTrigger>
            <TabsTrigger value="challenge">K线挑战</TabsTrigger>
            <TabsTrigger value="recharge">充值审核</TabsTrigger>
            <TabsTrigger value="complaints">投诉管理</TabsTrigger>
            <TabsTrigger value="suggestions">建议管理</TabsTrigger>
            <TabsTrigger value="docs">文档管理</TabsTrigger>
            <TabsTrigger value="news">新闻管理</TabsTrigger>
            <TabsTrigger value="ai">店小二配置</TabsTrigger>
            <TabsTrigger value="ea">EA管理</TabsTrigger>
            <TabsTrigger value="config">系统配置</TabsTrigger>
            <TabsTrigger value="nav">导航配置</TabsTrigger>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.href = '/admin/wechat-recharge'}
              className="ml-2"
            >
              微信充值
            </Button>
          </TabsList>

          {/* 概览 */}
          <TabsContent value="overview">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">用户总数</p>
                      <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">星球总数</p>
                      <p className="text-2xl font-bold">{stats?.totalPlanets || 0}</p>
                    </div>
                    <Globe className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">信号源总数</p>
                      <p className="text-2xl font-bold">{stats?.totalSignalSources || 0}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">活跃跟单</p>
                      <p className="text-2xl font-bold">{stats?.activeFollows || 0}</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">总星球币</p>
                      <p className="text-2xl font-bold">{stats?.totalCoins || 0}</p>
                    </div>
                    <Coins className="w-8 h-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 用户管理 */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>用户管理</CardTitle>
                    <CardDescription>管理平台用户信息</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input 
                      placeholder="搜索用户..." 
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-64"
                    />
                    <Button onClick={fetchUsers}>搜索</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">用户ID</th>
                          <th className="text-left p-2">邮箱</th>
                          <th className="text-left p-2">昵称</th>
                          <th className="text-left p-2">角色</th>
                          <th className="text-left p-2">星球币</th>
                          <th className="text-left p-2">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.userId} className="border-b">
                            <td className="p-2">{user.userId}</td>
                            <td className="p-2">{user.email}</td>
                            <td className="p-2">{user.name || '-'}</td>
                            <td className="p-2">
                              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                {user.role}
                              </Badge>
                            </td>
                            <td className="p-2">{user.coinBalance}</td>
                            <td className="p-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setEditingUser(user);
                                  setEditForm({ 
                                    coinBalance: (user as any).coinBalance ?? '', 
                                    goldBalance: (user as any).goldBalance ?? '', 
                                    silverBalance: (user as any).silverBalance ?? '', 
                                    role: user.role 
                                  });
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 充值审核 */}
          <TabsContent value="recharge">
            <Card>
              <CardHeader>
                <CardTitle>充值审核</CardTitle>
                <CardDescription>处理用户充值申请</CardDescription>
              </CardHeader>
              <CardContent>
                {rechargeLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner />
                  </div>
                ) : rechargeApps.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">暂无待审核申请</p>
                ) : (
                  <div className="space-y-4">
                    {rechargeApps.map((app) => (
                      <div key={app.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{app.userName}</p>
                            <p className="text-sm text-gray-500">申请金额: {app.amount} 元</p>
                            <p className="text-xs text-gray-400">{app.createdAt}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleRecharge(app.id, 'approve')}
                            >
                              <Check className="w-4 h-4 mr-1" /> 通过
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleRecharge(app.id, 'reject')}
                            >
                              <X className="w-4 h-4 mr-1" /> 拒绝
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 投诉管理 */}
          <TabsContent value="complaints">
            <Card>
              <CardHeader>
                <CardTitle>投诉管理</CardTitle>
                <CardDescription>处理用户投诉</CardDescription>
              </CardHeader>
              <CardContent>
                {complaintsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner />
                  </div>
                ) : complaints.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">暂无投诉</p>
                ) : (
                  <div className="space-y-4">
                    {complaints.map((c) => (
                      <div key={c.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{c.userName}</p>
                            <p className="text-sm mt-1">{c.content}</p>
                            {c.reply && (
                              <p className="text-sm text-green-600 mt-2">回复: {c.reply}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">{c.createdAt}</p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setReplyingId(c.id);
                              setReplyDialog(true);
                            }}
                          >
                            回复
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 建议管理 */}
          <TabsContent value="suggestions">
            <Card>
              <CardHeader>
                <CardTitle>建议管理</CardTitle>
                <CardDescription>处理用户建议</CardDescription>
              </CardHeader>
              <CardContent>
                {suggestionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner />
                  </div>
                ) : suggestions.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">暂无建议</p>
                ) : (
                  <div className="space-y-4">
                    {suggestions.map((s) => (
                      <div key={s.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{s.userName}</p>
                            <p className="text-sm mt-1">{s.content}</p>
                            <p className="text-xs text-gray-400 mt-1">{s.createdAt}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm"
                              onClick={() => handleSuggestion(s.id, 'approve')}
                            >
                              <Check className="w-4 h-4 mr-1" /> 通过
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleSuggestion(s.id, 'reject')}
                            >
                              <X className="w-4 h-4 mr-1" /> 拒绝
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 文档管理 */}
          <TabsContent value="docs">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>文档管理</CardTitle>
                    <CardDescription>管理平台文档</CardDescription>
                  </div>
                  <Button onClick={() => {
                    setEditingDoc({});
                    setDocForm({ title: '', slug: '', content: '', category: 'general' });
                    setDocDialog(true);
                  }}>
                    <Plus className="w-4 h-4 mr-1" /> 新增
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {docsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner />
                  </div>
                ) : docs.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">暂无文档</p>
                ) : (
                  <div className="space-y-4">
                    {docs.map((doc) => (
                      <div key={doc.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{doc.title}</p>
                            <p className="text-sm text-gray-500">/{doc.slug}</p>
                            <p className="text-xs text-gray-400">{doc.category}</p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setEditingDoc(doc);
                              setDocForm({ 
                                title: doc.title, 
                                slug: doc.slug, 
                                content: doc.content || '', 
                                category: doc.category || 'general' 
                              });
                              setDocDialog(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 系统配置 */}
          <TabsContent value="config">
            <Card>
              <CardHeader>
                <CardTitle>系统配置</CardTitle>
                <CardDescription>配置平台参数</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>7天星球价格</Label>
                    <Input 
                      type="number"
                      value={config.planet_price_7days}
                      onChange={(e) => setConfig({...config, planet_price_7days: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label>1年星球价格</Label>
                    <Input 
                      type="number"
                      value={config.planet_price_1year}
                      onChange={(e) => setConfig({...config, planet_price_1year: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label>3年星球价格</Label>
                    <Input 
                      type="number"
                      value={config.planet_price_3years}
                      onChange={(e) => setConfig({...config, planet_price_3years: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label>永久星球价格</Label>
                    <Input 
                      type="number"
                      value={config.planet_price_permanent}
                      onChange={(e) => setConfig({...config, planet_price_permanent: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label>默认门票价格</Label>
                    <Input 
                      type="number"
                      value={config.defaultTicketPrice}
                      onChange={(e) => setConfig({...config, defaultTicketPrice: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label>最大信号源数量</Label>
                    <Input 
                      type="number"
                      value={config.maxPublishers}
                      onChange={(e) => setConfig({...config, maxPublishers: Number(e.target.value)})}
                    />
                  </div>
                </div>

                {/* 客服配置 */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-medium mb-4">客服配置</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>客服QQ号码</Label>
                      <Input 
                        value={config.customer_service_qq || ''}
                        onChange={(e) => setConfig({...config, customer_service_qq: e.target.value})}
                        placeholder="请输入客服QQ号码"
                      />
                    </div>
                    <div>
                      <Label>客服微信</Label>
                      <Input 
                        value={config.customer_service_wechat || ''}
                        onChange={(e) => setConfig({...config, customer_service_wechat: e.target.value})}
                        placeholder="请输入客服微信号"
                      />
                    </div>
                  </div>
                </div>

                {/* 充值配置 */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-medium mb-4">充值配置</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>充值比例 (1元=N星球币)</Label>
                      <Input 
                        type="number"
                        value={config.wechat_exchange_rate}
                        onChange={(e) => setConfig({...config, wechat_exchange_rate: Number(e.target.value)})}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label>启用充值功能</Label>
                      <input 
                        type="checkbox"
                        checked={config.wechat_enabled}
                        onChange={(e) => setConfig({...config, wechat_enabled: e.target.checked})}
                        className="w-5 h-5"
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveConfig}>
                  <Save className="w-4 h-4 mr-1" /> 保存配置
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 导航配置 */}
          <TabsContent value="nav">
            <Card>
              <CardHeader>
                <CardTitle>导航配置</CardTitle>
                <CardDescription>配置导航栏显示</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Label className="w-48">挑战赛大厅</Label>
                  <input 
                    type="checkbox"
                    checked={navConfig.nav_show_challenge_hall}
                    onChange={(e) => setNavConfig({...navConfig, nav_show_challenge_hall: e.target.checked})}
                    className="w-5 h-5"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <Label className="w-48">K线征途挑战</Label>
                  <input 
                    type="checkbox"
                    checked={navConfig.nav_show_kline_challenge}
                    onChange={(e) => setNavConfig({...navConfig, nav_show_kline_challenge: e.target.checked})}
                    className="w-5 h-5"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <Label className="w-48">社交中心</Label>
                  <input 
                    type="checkbox"
                    checked={navConfig.nav_show_social}
                    onChange={(e) => setNavConfig({...navConfig, nav_show_social: e.target.checked})}
                    className="w-5 h-5"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <Label className="w-48">帮助文档</Label>
                  <input 
                    type="checkbox"
                    checked={navConfig.nav_show_docs}
                    onChange={(e) => setNavConfig({...navConfig, nav_show_docs: e.target.checked})}
                    className="w-5 h-5"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <Label className="w-48">意见建议</Label>
                  <input 
                    type="checkbox"
                    checked={navConfig.nav_show_suggestion}
                    onChange={(e) => setNavConfig({...navConfig, nav_show_suggestion: e.target.checked})}
                    className="w-5 h-5"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <Label className="w-48">投诉反馈</Label>
                  <input 
                    type="checkbox"
                    checked={navConfig.nav_show_complaint}
                    onChange={(e) => setNavConfig({...navConfig, nav_show_complaint: e.target.checked})}
                    className="w-5 h-5"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <Label className="w-48">下载中心</Label>
                  <input 
                    type="checkbox"
                    checked={navConfig.nav_show_download}
                    onChange={(e) => setNavConfig({...navConfig, nav_show_download: e.target.checked})}
                    className="w-5 h-5"
                  />
                </div>
                <Button onClick={handleSaveNavConfig}>
                  <Save className="w-4 h-4 mr-1" /> 保存配置
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* K线挑战管理 */}
          <TabsContent value="challenge">
            <Card>
              <CardHeader>
                <CardTitle>K线征途挑战管理</CardTitle>
                <CardDescription>管理挑战赛申请、关卡配置和奖励设置</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Button 
                      variant="outline" 
                      className="h-20 flex flex-col gap-2"
                      onClick={() => window.location.href = '/admin/challenge'}
                    >
                      <Settings className="w-6 h-6" />
                      <span>挑战申请管理</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-20 flex flex-col gap-2"
                      onClick={() => window.location.href = '/admin/challenge?tab=levels'}
                    >
                      <TrendingUp className="w-6 h-6" />
                      <span>关卡配置</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-20 flex flex-col gap-2"
                      onClick={() => window.location.href = '/admin/challenge?tab=hall'}
                    >
                      <Shield className="w-6 h-6" />
                      <span>名人堂管理</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-20 flex flex-col gap-2 border-blue-200 hover:bg-blue-50"
                      onClick={() => window.location.href = '/admin/match-config'}
                    >
                      <BarChart3 className="w-6 h-6 text-blue-600" />
                      <span className="text-blue-600">赛事配置</span>
                    </Button>
                  </div>
                  
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium mb-4">快速跳转</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <a href="/challenge" target="_blank" className="text-purple-600 hover:underline">
                        挑战赛主页 →
                      </a>
                      <a href="/challenge/hall" target="_blank" className="text-purple-600 hover:underline">
                        挑战赛大厅 →
                      </a>
                      <a href="/challenge/hall-of-fame" target="_blank" className="text-purple-600 hover:underline">
                        名人堂 →
                      </a>
                      <a href="/challenge/play" target="_blank" className="text-purple-600 hover:underline">
                        我的挑战 →
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 新闻管理 */}
          <TabsContent value="news">
            <Card>
              <CardHeader>
                <CardTitle>新闻管理</CardTitle>
                <CardDescription>管理平台新闻和公告</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center py-8">
                  <Button onClick={() => window.location.href = '/admin/news'}>
                    <FileText className="w-4 h-4 mr-1" /> 打开新闻管理页面
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 店小二配置 */}
          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  店小二配置
                </CardTitle>
                <CardDescription>管理茶馆聊天室的AI角色（店小二），当前连接DeepSeek</CardDescription>
              </CardHeader>
              <CardContent>
                <AIConfigPanel />
              </CardContent>
            </Card>
          </TabsContent>

          {/* EA管理 */}
          <TabsContent value="ea">
            <Card>
              <CardHeader>
                <CardTitle>EA产品管理</CardTitle>
                <CardDescription>管理EA智能交易产品</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center py-8">
                  <Button onClick={() => window.location.href = '/admin/ea'}>
                    <TrendingUp className="w-4 h-4 mr-1" /> 打开EA管理页面
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 用户编辑对话框 */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>星球币余额</Label>
              <Input 
                type="text"
                value={editForm.coinBalance}
                onChange={(e) => setEditForm({...editForm, coinBalance: e.target.value})}
              />
            </div>
            <div>
              <Label>金币</Label>
              <input
                type="number"
                value={editForm.goldBalance || 0}
                onChange={(e) => setEditForm({...editForm, goldBalance: e.target.value})}
              />
              <Label>银两</Label>
              <input
                type="number"
                value={editForm.silverBalance || 0}
                onChange={(e) => setEditForm({...editForm, silverBalance: e.target.value})}
              />
              <Label>角色</Label>
              <select 
                className="w-full p-2 border rounded"
                value={editForm.role}
                onChange={(e) => setEditForm({...editForm, role: e.target.value})}
              >
                <option value="user">普通用户</option>
                <option value="vip">VIP用户</option>
                <option value="admin">管理员</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>取消</Button>
            <Button onClick={handleSaveUser}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 回复投诉对话框 */}
      <Dialog open={replyDialog} onOpenChange={() => setReplyDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>回复投诉</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>回复内容</Label>
            <textarea 
              className="w-full p-2 border rounded h-32"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="输入回复内容..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialog(false)}>取消</Button>
            <Button onClick={handleReplyComplaint}>发送回复</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 文档编辑对话框 */}
      <Dialog open={docDialog} onOpenChange={() => setDocDialog(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingDoc?.id ? '编辑文档' : '新增文档'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>标题</Label>
              <Input 
                value={docForm.title}
                onChange={(e) => setDocForm({...docForm, title: e.target.value})}
                placeholder="文档标题"
              />
            </div>
            <div>
              <Label>别名 (URL路径)</Label>
              <Input 
                value={docForm.slug}
                onChange={(e) => setDocForm({...docForm, slug: e.target.value})}
                placeholder="doc-slug"
              />
            </div>
            <div>
              <Label>分类</Label>
              <Input 
                value={docForm.category}
                onChange={(e) => setDocForm({...docForm, category: e.target.value})}
                placeholder="general"
              />
            </div>
            <div>
              <Label>内容 (Markdown)</Label>
              <textarea 
                className="w-full p-2 border rounded h-64 font-mono text-sm"
                value={docForm.content}
                onChange={(e) => setDocForm({...docForm, content: e.target.value})}
                placeholder="文档内容..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocDialog(false)}>取消</Button>
            <Button onClick={handleSaveDoc}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
