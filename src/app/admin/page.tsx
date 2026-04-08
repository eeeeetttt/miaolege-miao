'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Settings, 
  Users, 
  Globe, 
  Coins, 
  FileCode,
  Database,
  Shield,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  BarChart3,
  RefreshCw,
  Search,
  Edit,
  Lock,
  FileText,
  Plus,
  Trash2,
  Save
} from 'lucide-react';

// 系统配置
interface SystemConfig {
  planet_price_7days: number;
  planet_price_1year: number;
  planet_price_3years: number;
  planet_price_permanent: number;
  planetCreationThreshold: number;
  rechargeEnabled: boolean;
  defaultTicketPrice: number;
  maxPublishers: number;
}

// 统计数据
interface Stats {
  totalUsers: number;
  totalPlanets: number;
  totalSignalSources: number;
  totalCoins: number;
  activeFollows: number;
}

// 用户信息
interface UserInfo {
  userId: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
  coinBalance: number;
  role: string;
  createdAt: Date | null;
  mtAccount: { accountNumber: string; platform: string } | null;
  activeFollows: number;
  createdPlanets: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showInitForm, setShowInitForm] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  
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
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // 用户管理状态
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const [editForm, setEditForm] = useState({ coinBalance: 0, role: '' });
  const [activeTab, setActiveTab] = useState('users');

  // 文档管理状态
  const [docs, setDocs] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [docForm, setDocForm] = useState({
    title: '',
    slug: '',
    content: '',
    category: 'general',
    sortOrder: 0,
    status: 'published' as 'published' | 'draft',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      checkAdmin();
    }
  }, [status]);

  // 监听Tab切换，加载相应数据
  useEffect(() => {
    if (isAdmin && activeTab === 'docs' && docs.length === 0) {
      fetchDocs();
    }
    if (isAdmin && activeTab === 'users' && users.length === 0) {
      fetchUsers();
    }
  }, [activeTab, isAdmin]);

  const checkAdmin = async () => {
    try {
      const res = await fetch('/api/admin/init');
      const data = await res.json();
      
      if (data.isAdmin) {
        setIsAdmin(true);
        fetchStats();
      } else {
        setShowInitForm(true);
      }
    } catch (err) {
      console.error('Check admin error:', err);
    } finally {
      setCheckingAdmin(false);
      setLoading(false);
    }
  };

  const handleInitAdmin = async () => {
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message);
        setIsAdmin(true);
        setShowInitForm(false);
        fetchStats();
      } else {
        setError(data.error || '操作失败');
      }
    } catch (err) {
      setError('操作失败');
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      
      if (res.ok) {
        setStats(data.stats);
        if (data.config) {
          setConfig(data.config);
        }
      } else {
        setError(data.error || '获取数据失败');
      }
    } catch (err) {
      console.error('Fetch stats error:', err);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({
        page: userPage.toString(),
        limit: '10',
        search: userSearch,
      });
      
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();

      if (res.ok) {
        setUsers(data.users);
        setUserTotal(data.total);
      } else {
        setError(data.error || '获取用户列表失败');
      }
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('配置保存成功！');
      } else {
        setError(data.error || '保存失败');
      }
    } catch (err) {
      setError('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  // 文档管理函数
  const fetchDocs = async () => {
    setDocsLoading(true);
    try {
      const res = await fetch('/api/admin/docs');
      const data = await res.json();
      if (res.ok) {
        setDocs(data.documents || []);
      } else {
        setError(data.error || '获取文档失败');
      }
    } catch (err) {
      console.error('Fetch docs error:', err);
      setError('获取文档失败');
    } finally {
      setDocsLoading(false);
    }
  };

  const handleEditDoc = (doc: any) => {
    setEditingDoc(doc);
    setDocForm({
      title: doc.title,
      slug: doc.slug,
      content: doc.content,
      category: doc.category || 'general',
      sortOrder: doc.sortOrder || 0,
      status: doc.status || 'published',
    });
  };

  const handleNewDoc = () => {
    setEditingDoc({ id: 'new' });
    setDocForm({
      title: '',
      slug: '',
      content: '',
      category: 'general',
      sortOrder: 0,
      status: 'published',
    });
  };

  const handleSaveDoc = async () => {
    if (!docForm.title || !docForm.slug || !docForm.content) {
      setError('标题、别名和内容为必填项');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const isEdit = editingDoc?.id !== 'new';
      const res = await fetch('/api/admin/docs', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { ...docForm, id: editingDoc.id } : docForm),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(isEdit ? '文档更新成功！' : '文档创建成功！');
        setEditingDoc(null);
        fetchDocs();
      } else {
        setError(data.error || '操作失败');
      }
    } catch (err) {
      setError('操作失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDoc = async (id: number) => {
    if (!confirm('确定要删除这篇文档吗？')) return;

    try {
      const res = await fetch(`/api/admin/docs?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('文档删除成功！');
        fetchDocs();
      } else {
        const data = await res.json();
        setError(data.error || '删除失败');
      }
    } catch (err) {
      setError('删除失败');
    }
  };

  const handleInitDatabase = async () => {
    if (!confirm('确定要初始化数据库吗？这将创建缺失的表。')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/init-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('数据库初始化成功！');
      } else {
        setError(data.error || '初始化失败');
      }
    } catch (err) {
      setError('初始化失败');
    }
  };

  const handleInitEA = async () => {
    if (!confirm('确定要初始化EA产品表吗？')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/init-ea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('EA产品表初始化成功！');
      } else {
        setError(data.error || '初始化失败');
      }
    } catch (err) {
      setError('初始化失败');
    }
  };

  const handleEditUser = (user: UserInfo) => {
    setEditingUser(user);
    setEditForm({ coinBalance: user.coinBalance, role: user.role });
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser.userId,
          coinBalance: editForm.coinBalance,
          role: editForm.role,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('用户信息更新成功！');
        setEditingUser(null);
        fetchUsers();
      } else {
        setError(data.error || '更新失败');
      }
    } catch (err) {
      setError('更新失败');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || checkingAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center h-64">
          <Spinner className="w-8 h-8" />
        </div>
      </div>
    );
  }

  // 显示管理员初始化表单
  if (!isAdmin && showInitForm) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <Shield className="w-12 h-12 mx-auto mb-4 text-purple-500" />
              <CardTitle>管理员验证</CardTitle>
              <CardDescription>
                请输入管理员密码以获取管理员权限
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="adminPassword">管理员密码</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="输入管理员密码"
                />
              </div>
              
              <Button 
                onClick={handleInitAdmin}
                className="w-full"
                disabled={!adminPassword}
              >
                <Lock className="w-4 h-4 mr-2" />
                验证并获取权限
              </Button>
              
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => router.push('/')}
              >
                返回首页
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-500" />
            后台管理
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            管理平台配置、数据和用户
          </p>
        </div>

        {/* Error/Success Messages */}
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

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">用户总数</p>
                    <p className="text-2xl font-bold">{stats.totalUsers}</p>
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
                    <p className="text-2xl font-bold">{stats.totalPlanets}</p>
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
                    <p className="text-2xl font-bold">{stats.totalSignalSources}</p>
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
                    <p className="text-2xl font-bold">{stats.activeFollows}</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">星球币流通</p>
                    <p className="text-2xl font-bold">{stats.totalCoins}</p>
                  </div>
                  <Coins className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              用户管理
            </TabsTrigger>
            <TabsTrigger value="docs" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              文档管理
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              系统配置
            </TabsTrigger>
            <TabsTrigger value="database" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              数据库
            </TabsTrigger>
            <TabsTrigger value="challenge" className="flex items-center gap-2" onClick={() => router.push('/admin/challenge')}>
              <TrendingUp className="w-4 h-4" />
              K线征途
            </TabsTrigger>
            <TabsTrigger value="ea" className="flex items-center gap-2">
              <FileCode className="w-4 h-4" />
              EA管理
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  用户管理
                </CardTitle>
                <CardDescription>
                  查看和管理平台用户
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 搜索 */}
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="搜索用户名、邮箱或ID..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={() => { setUserPage(1); fetchUsers(); }}>
                    搜索
                  </Button>
                </div>

                {/* 用户列表 */}
                {usersLoading ? (
                  <div className="text-center py-8">
                    <Spinner className="w-6 h-6 mx-auto" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    暂无用户数据
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="text-left py-3 px-4 text-sm font-medium">用户</th>
                          <th className="text-left py-3 px-4 text-sm font-medium">MT账号</th>
                          <th className="text-left py-3 px-4 text-sm font-medium">余额</th>
                          <th className="text-left py-3 px-4 text-sm font-medium">角色</th>
                          <th className="text-left py-3 px-4 text-sm font-medium">统计</th>
                          <th className="text-right py-3 px-4 text-sm font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {users.map((user) => (
                          <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-8 h-8">
                                  <AvatarImage src={user.avatar || undefined} />
                                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-xs">
                                    {user.name?.[0]?.toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{user.name || '未设置昵称'}</p>
                                  <p className="text-xs text-gray-500">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {user.mtAccount ? (
                                <div>
                                  <p className="font-medium">{user.mtAccount.accountNumber}</p>
                                  <p className="text-xs text-gray-500">{user.mtAccount.platform}</p>
                                </div>
                              ) : (
                                <span className="text-gray-400">未绑定</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-medium">{user.coinBalance}</span>
                              <span className="text-xs text-gray-500 ml-1">币</span>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                                {user.role === 'admin' ? '管理员' : '用户'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-500">
                              <p>跟单: {user.activeFollows}</p>
                              <p>星球: {user.createdPlanets}</p>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditUser(user)}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                编辑
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 分页 */}
                {userTotal > 10 && (
                  <div className="flex justify-between items-center pt-4">
                    <p className="text-sm text-gray-500">
                      共 {userTotal} 个用户
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={userPage === 1}
                        onClick={() => { setUserPage(p => p - 1); fetchUsers(); }}
                      >
                        上一页
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={userPage * 10 >= userTotal}
                        onClick={() => { setUserPage(p => p + 1); fetchUsers(); }}
                      >
                        下一页
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Docs Tab */}
          <TabsContent value="docs">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      文档管理
                    </CardTitle>
                    <CardDescription>
                      管理文档中心的内容
                    </CardDescription>
                  </div>
                  <Button onClick={handleNewDoc} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    新建文档
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {docsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Spinner className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {docs.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>暂无文档</p>
                        <p className="text-sm mt-2">点击上方按钮创建第一篇文档</p>
                      </div>
                    ) : (
                      docs.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{doc.title}</h3>
                              <Badge variant={doc.status === 'published' ? 'default' : 'secondary'}>
                                {doc.status === 'published' ? '已发布' : '草稿'}
                              </Badge>
                              <Badge variant="outline">{doc.category}</Badge>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              /{doc.slug} · {doc.viewCount || 0} 次浏览
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditDoc(doc)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteDoc(doc.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Config Tab */}
          <TabsContent value="config">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  系统配置
                </CardTitle>
                <CardDescription>
                  调整平台的基础配置参数
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 星球创建价格配置 */}
                <div className="border-b pb-6">
                  <h3 className="font-semibold mb-4 text-purple-600">星球创建价格（星球币）</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="planet_price_7days">7天</Label>
                      <Input
                        id="planet_price_7days"
                        type="number"
                        value={config.planet_price_7days}
                        onChange={(e) => setConfig({ ...config, planet_price_7days: parseInt(e.target.value) || 0 })}
                      />
                      <p className="text-xs text-gray-500">免费体验</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="planet_price_1year">一年</Label>
                      <Input
                        id="planet_price_1year"
                        type="number"
                        value={config.planet_price_1year}
                        onChange={(e) => setConfig({ ...config, planet_price_1year: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="planet_price_3years">三年</Label>
                      <Input
                        id="planet_price_3years"
                        type="number"
                        value={config.planet_price_3years}
                        onChange={(e) => setConfig({ ...config, planet_price_3years: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="planet_price_permanent">永久</Label>
                      <Input
                        id="planet_price_permanent"
                        type="number"
                        value={config.planet_price_permanent}
                        onChange={(e) => setConfig({ ...config, planet_price_permanent: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="defaultTicketPrice">默认门票价格（星球币）</Label>
                    <Input
                      id="defaultTicketPrice"
                      type="number"
                      value={config.defaultTicketPrice}
                      onChange={(e) => setConfig({ ...config, defaultTicketPrice: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-gray-500">新建星球的默认门票价格</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxPublishers">最大发布者数量</Label>
                    <Input
                      id="maxPublishers"
                      type="number"
                      value={config.maxPublishers}
                      onChange={(e) => setConfig({ ...config, maxPublishers: parseInt(e.target.value) || 1 })}
                    />
                    <p className="text-xs text-gray-500">每个星球最大信号发布者数量</p>
                  </div>

                  <div className="space-y-2">
                    <Label>充值功能状态</Label>
                    <div className="flex items-center gap-4">
                      <Button
                        variant={config.rechargeEnabled ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setConfig({ ...config, rechargeEnabled: true })}
                        className={config.rechargeEnabled ? 'bg-green-500 hover:bg-green-600' : ''}
                      >
                        开启
                      </Button>
                      <Button
                        variant={!config.rechargeEnabled ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setConfig({ ...config, rechargeEnabled: false })}
                        className={!config.rechargeEnabled ? 'bg-red-500 hover:bg-red-600' : ''}
                      >
                        关闭
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">控制前端充值功能的开启状态</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveConfig}
                    disabled={saving}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {saving ? (
                      <>
                        <Spinner className="w-4 h-4 mr-2" />
                        保存中...
                      </>
                    ) : (
                      '保存配置'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Database Tab */}
          <TabsContent value="database">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  数据库管理
                </CardTitle>
                <CardDescription>
                  初始化和管理数据库表结构
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    数据库操作可能会影响现有数据，请谨慎操作。建议在操作前备份数据库。
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold">初始化数据库表</h3>
                          <p className="text-sm text-gray-500 mt-1">创建缺失的数据库表结构</p>
                        </div>
                        <Button onClick={handleInitDatabase} variant="outline">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          执行
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold">初始化EA产品表</h3>
                          <p className="text-sm text-gray-500 mt-1">创建EA产品和购买记录表</p>
                        </div>
                        <Button onClick={handleInitEA} variant="outline">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          执行
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* EA Tab */}
          <TabsContent value="ea">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCode className="w-5 h-5" />
                  EA产品管理
                </CardTitle>
                <CardDescription>
                  管理平台上的EA产品
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-gray-500">管理EA产品的上传、价格和状态</p>
                  <Button onClick={() => router.push('/admin/ea')}>
                    进入EA管理
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 用户编辑弹窗 */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>编辑用户</CardTitle>
                <CardDescription>
                  {editingUser.name} ({editingUser.email})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>星球币余额</Label>
                  <Input
                    type="number"
                    value={editForm.coinBalance}
                    onChange={(e) => setEditForm({ ...editForm, coinBalance: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>用户角色</Label>
                  <div className="flex gap-3">
                    <Button
                      variant={editForm.role === 'user' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEditForm({ ...editForm, role: 'user' })}
                      className={editForm.role === 'user' ? 'bg-purple-500' : ''}
                    >
                      普通用户
                    </Button>
                    <Button
                      variant={editForm.role === 'admin' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEditForm({ ...editForm, role: 'admin' })}
                      className={editForm.role === 'admin' ? 'bg-purple-500' : ''}
                    >
                      管理员
                    </Button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditingUser(null)}
                  >
                    取消
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleUpdateUser}
                    disabled={saving}
                  >
                    {saving ? <Spinner className="w-4 h-4" /> : '保存'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 文档编辑弹窗 */}
        {editingDoc && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
            <Card className="w-full max-w-3xl mx-4">
              <CardHeader>
                <CardTitle>{editingDoc.id === 'new' ? '新建文档' : '编辑文档'}</CardTitle>
                <CardDescription>
                  文档支持Markdown格式
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>标题</Label>
                    <Input
                      value={docForm.title}
                      onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                      placeholder="输入文档标题"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>别名 (URL)</Label>
                    <Input
                      value={docForm.slug}
                      onChange={(e) => setDocForm({ ...docForm, slug: e.target.value })}
                      placeholder="例如: how-to-use"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>分类</Label>
                    <select
                      value={docForm.category}
                      onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-700"
                    >
                      <option value="getting-started">新手入门</option>
                      <option value="trading">交易指南</option>
                      <option value="faq">常见问题</option>
                      <option value="other">其他</option>
                      <option value="general">通用</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>排序权重</Label>
                    <Input
                      type="number"
                      value={docForm.sortOrder}
                      onChange={(e) => setDocForm({ ...docForm, sortOrder: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>状态</Label>
                    <select
                      value={docForm.status}
                      onChange={(e) => setDocForm({ ...docForm, status: e.target.value as 'published' | 'draft' })}
                      className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-700"
                    >
                      <option value="published">已发布</option>
                      <option value="draft">草稿</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>内容 (Markdown)</Label>
                  <textarea
                    value={docForm.content}
                    onChange={(e) => setDocForm({ ...docForm, content: e.target.value })}
                    placeholder="## 标题&#10;&#10;文档内容...&#10;&#10;- 列表项1&#10;- 列表项2"
                    className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 min-h-[300px] font-mono text-sm"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditingDoc(null)}
                  >
                    取消
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSaveDoc}
                    disabled={saving}
                  >
                    {saving ? <Spinner className="w-4 h-4" /> : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        保存
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
