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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Save,
  Image,
  Check,
  X,
  MessageSquare,
  Lightbulb,
  QrCode,
} from 'lucide-react';
import { ChatHallAdmin } from '@/components/chat-hall-admin';
import { DatabaseManager } from '@/components/database-manager';
import AIConfigPanel from '@/components/ai-config-admin';

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
    publishDate: '', // 自定义发布日期
  });

  // 充值审核状态
  const [rechargeApplications, setRechargeApplications] = useState<any[]>([]);
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [rechargePage, setRechargePage] = useState(1);
  const [rechargeTotal, setRechargeTotal] = useState(0);
  const [rechargeStatus, setRechargeStatus] = useState<string>('all');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [adminNote, setAdminNote] = useState('');

  // 投诉管理状态
  const [complaints, setComplaints] = useState<any[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [complaintsPage, setComplaintsPage] = useState(1);
  const [complaintsTotal, setComplaintsTotal] = useState(0);
  const [complaintsStatus, setComplaintsStatus] = useState<string>('all');
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyingComplaint, setReplyingComplaint] = useState<any>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  // 建议管理状态
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsPage, setSuggestionsPage] = useState(1);
  const [suggestionsTotal, setSuggestionsTotal] = useState(0);
  const [suggestionsStatus, setSuggestionsStatus] = useState<string>('all');

  // 导航栏配置状态
  const [navConfig, setNavConfig] = useState({
    nav_show_challenge_hall: true,
    nav_show_kline_challenge: true,
    nav_show_social: true,
    nav_show_docs: true,
    nav_show_suggestion: true,
    nav_show_complaint: true,
    nav_show_download: true,
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
    if (isAdmin && activeTab === 'recharge') {
      fetchRechargeApplications();
    }
    if (isAdmin && activeTab === 'complaints') {
      fetchComplaints();
    }
    if (isAdmin && activeTab === 'suggestions') {
      fetchSuggestions();
    }
    if (isAdmin && activeTab === 'nav') {
      fetchNavConfig();
    }
  }, [activeTab, isAdmin]);

  const checkAdmin = async () => {
    // 直接从 session 中检查管理员权限
    if (session?.user?.role === 'admin') {
      setIsAdmin(true);
      fetchStats();
    } else {
      // 如果 session 中不是管理员，尝试 API 检查
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
        setShowInitForm(true);
      }
    }
    setCheckingAdmin(false);
    setLoading(false);
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

  // 获取导航栏配置
  const fetchNavConfig = async () => {
    try {
      const res = await fetch('/api/admin/nav-config');
      const data = await res.json();
      if (data.config) {
        setNavConfig({
          nav_show_challenge_hall: data.config.nav_show_challenge_hall !== 'false',
          nav_show_kline_challenge: data.config.nav_show_kline_challenge !== 'false',
          nav_show_social: data.config.nav_show_social !== 'false',
          nav_show_docs: data.config.nav_show_docs !== 'false',
          nav_show_suggestion: data.config.nav_show_suggestion !== 'false',
          nav_show_complaint: data.config.nav_show_complaint !== 'false',
          nav_show_download: data.config.nav_show_download !== 'false',
        });
      }
    } catch (err) {
      console.error('Fetch nav config error:', err);
    }
  };

  // 保存导航栏配置
  const handleSaveNavConfig = async () => {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await fetch('/api/admin/nav-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(navConfig),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess('导航配置已保存');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || '保存失败');
      }
    } catch (err) {
      setError('保存失败');
    } finally {
      setSaving(false);
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
      publishDate: doc.updatedAt ? doc.updatedAt.split('T')[0] : '',
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
      publishDate: new Date().toISOString().split('T')[0], // 默认今天
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

  // 充值审核相关函数
  const fetchRechargeApplications = async () => {
    setRechargeLoading(true);
    try {
      const params = new URLSearchParams({
        page: rechargePage.toString(),
        limit: '20',
        status: rechargeStatus,
      });
      
      const res = await fetch(`/api/admin/recharge?${params}`);
      const data = await res.json();

      if (res.ok) {
        setRechargeApplications(data.applications || []);
        setRechargeTotal(data.total);
      } else {
        setError(data.error || '获取充值申请失败');
      }
    } catch (err) {
      console.error('Fetch recharge applications error:', err);
      setError('获取充值申请失败');
    } finally {
      setRechargeLoading(false);
    }
  };

  const handleProcessRecharge = async (applicationId: number, action: 'approve' | 'reject') => {
    if (action === 'approve' && !confirm('确认通过此充值申请？用户余额将增加。')) {
      return;
    }
    if (action === 'reject' && !confirm('确认拒绝此充值申请？')) {
      return;
    }

    setProcessingId(applicationId);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          action,
          adminNote,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message);
        setAdminNote('');
        fetchRechargeApplications();
      } else {
        setError(data.error || '操作失败');
      }
    } catch (err) {
      setError('操作失败');
    } finally {
      setProcessingId(null);
    }
  };

  // 投诉管理函数
  const fetchComplaints = async () => {
    setComplaintsLoading(true);
    try {
      const params = new URLSearchParams({
        page: complaintsPage.toString(),
        limit: '20',
        status: complaintsStatus,
      });
      
      const res = await fetch(`/api/admin/complaint?${params}`);
      const data = await res.json();

      if (res.ok) {
        setComplaints(data.complaints || []);
        setComplaintsTotal(data.total);
      } else {
        setError(data.error || '获取投诉列表失败');
      }
    } catch (err) {
      console.error('Fetch complaints error:', err);
      setError('获取投诉列表失败');
    } finally {
      setComplaintsLoading(false);
    }
  };

  const handleReplyComplaint = async () => {
    if (!replyingComplaint || !replyContent.trim()) {
      alert('请输入回复内容');
      return;
    }

    setReplySubmitting(true);
    try {
      const res = await fetch('/api/admin/complaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaintId: replyingComplaint.id,
          reply: replyContent,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess('回复成功');
        setReplyDialogOpen(false);
        setReplyContent('');
        setReplyingComplaint(null);
        fetchComplaints();
      } else {
        setError(data.error || '回复失败');
      }
    } catch (err) {
      setError('回复失败');
    } finally {
      setReplySubmitting(false);
    }
  };

  // 建议管理函数
  const fetchSuggestions = async () => {
    setSuggestionsLoading(true);
    try {
      const params = new URLSearchParams({
        page: suggestionsPage.toString(),
        limit: '20',
        status: suggestionsStatus,
      });
      
      const res = await fetch(`/api/admin/suggestion?${params}`);
      const data = await res.json();

      if (res.ok) {
        setSuggestions(data.suggestions || []);
        setSuggestionsTotal(data.total);
      } else {
        setError(data.error || '获取建议列表失败');
      }
    } catch (err) {
      console.error('Fetch suggestions error:', err);
      setError('获取建议列表失败');
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleReviewSuggestion = async (suggestionId: number, action: 'approve' | 'reject') => {
    if (!confirm(`确认${action === 'approve' ? '通过' : '拒绝'}此建议？`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionId,
          action,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(data.message);
        fetchSuggestions();
      } else {
        setError(data.error || '操作失败');
      }
    } catch (err) {
      setError('操作失败');
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
                    <p className="text-sm text-gray-500">U 流通</p>
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
          {/* 优化的Tab导航 - 滚动式布局 */}
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-1 min-w-max">
              <Button
                size="sm"
                variant={activeTab === 'users' ? 'default' : 'outline'}
                onClick={() => setActiveTab('users')}
                className="gap-2"
              >
                <Users className="w-4 h-4" />
                用户
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'recharge' ? 'default' : 'outline'}
                onClick={() => setActiveTab('recharge')}
                className="gap-2"
              >
                <DollarSign className="w-4 h-4" />
                充值
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'complaints' ? 'default' : 'outline'}
                onClick={() => setActiveTab('complaints')}
                className="gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                投诉
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'suggestions' ? 'default' : 'outline'}
                onClick={() => setActiveTab('suggestions')}
                className="gap-2"
              >
                <Lightbulb className="w-4 h-4" />
                建议
              </Button>
              <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-1 self-center" />
              <Button
                size="sm"
                variant={activeTab === 'nav' ? 'default' : 'outline'}
                onClick={() => setActiveTab('nav')}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                导航
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'config' ? 'default' : 'outline'}
                onClick={() => setActiveTab('config')}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                配置
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'docs' ? 'default' : 'outline'}
                onClick={() => setActiveTab('docs')}
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                文档
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'database' ? 'default' : 'outline'}
                onClick={() => setActiveTab('database')}
                className="gap-2"
              >
                <Database className="w-4 h-4" />
                数据库
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'chatHall' ? 'default' : 'outline'}
                onClick={() => setActiveTab('chatHall')}
                className="gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                聊天
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'ea' ? 'default' : 'outline'}
                onClick={() => setActiveTab('ea')}
                className="gap-2"
              >
                <FileCode className="w-4 h-4" />
                EA
              </Button>
              <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-1 self-center" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push('/admin/challenge')}
                className="gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                K线征途
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push('/admin/wechat-recharge')}
                className="gap-2"
              >
                <QrCode className="w-4 h-4" />
                微信充值
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'aiConfig' ? 'default' : 'outline'}
                onClick={() => setActiveTab('aiConfig')}
                className="gap-2"
              >
                <Lightbulb className="w-4 h-4" />
                店小二
              </Button>
            </div>
          </div>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-0">
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

          {/* Recharge Tab */}
          <TabsContent value="recharge">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      充值审核
                    </CardTitle>
                    <CardDescription>
                      审核用户的充值申请，处理通过的申请将自动增加用户余额
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={rechargeStatus}
                      onChange={(e) => {
                        setRechargeStatus(e.target.value);
                        setRechargePage(1);
                      }}
                      className="px-3 py-2 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 text-sm"
                    >
                      <option value="all">全部状态</option>
                      <option value="pending">待处理</option>
                      <option value="completed">已通过</option>
                      <option value="rejected">已拒绝</option>
                    </select>
                    <Button variant="outline" size="sm" onClick={fetchRechargeApplications}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      刷新
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {rechargeLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Spinner className="w-6 h-6" />
                  </div>
                ) : rechargeApplications.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无充值申请</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rechargeApplications.map((app: any) => (
                      <div key={app.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={app.user?.avatar || undefined} />
                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-xs">
                                  {app.user?.name?.[0]?.toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{app.user?.name || '未知用户'}</p>
                                <p className="text-xs text-gray-500">{app.user?.email}</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500">充值金额</p>
                                <p className="font-bold text-lg">{app.amount} U</p>
                              </div>
                              <div>
                                <p className="text-gray-500">货币类型</p>
                                <p className="font-medium">{app.currency}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">网络</p>
                                <p className="font-medium">{app.network_type || 'TRC20'}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">状态</p>
                                <Badge variant={
                                  app.status === 'completed' ? 'default' :
                                  app.status === 'rejected' ? 'destructive' : 'secondary'
                                }>
                                  {app.status === 'pending' ? '待处理' :
                                   app.status === 'completed' ? '已通过' : '已拒绝'}
                                </Badge>
                              </div>
                            </div>

                            {app.wallet_address && (
                              <div className="mt-2 text-sm">
                                <p className="text-gray-500">钱包地址</p>
                                <p className="font-mono text-xs break-all">{app.wallet_address}</p>
                              </div>
                            )}

                            {app.admin_note && (
                              <div className="mt-2 text-sm">
                                <p className="text-gray-500">处理备注</p>
                                <p className="text-orange-600 dark:text-orange-400">{app.admin_note}</p>
                              </div>
                            )}

                            <div className="mt-2 text-xs text-gray-400">
                              申请时间: {new Date(app.created_at).toLocaleString()}
                              {app.processed_at && ` | 处理时间: ${new Date(app.processed_at).toLocaleString()}`}
                            </div>
                          </div>

                          {app.screenshot_url && (
                            <div className="ml-4">
                              <a 
                                href={app.screenshot_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img 
                                  src={app.screenshot_url} 
                                  alt="充值截图" 
                                  className="w-32 h-32 object-cover rounded-lg border hover:border-purple-500 cursor-pointer"
                                />
                                <p className="text-xs text-center text-gray-500 mt-1 flex items-center justify-center gap-1">
                                  <Image className="w-3 h-3" />
                                  查看截图
                                </p>
                              </a>
                            </div>
                          )}
                        </div>

                        {app.status === 'pending' && (
                          <div className="mt-4 pt-4 border-t flex items-center gap-3">
                            <Input
                              placeholder="处理备注（可选）"
                              value={adminNote}
                              onChange={(e) => setAdminNote(e.target.value)}
                              className="flex-1"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleProcessRecharge(app.id, 'reject')}
                              disabled={processingId === app.id}
                              className="text-red-500 hover:text-red-600"
                            >
                              <X className="w-4 h-4 mr-1" />
                              拒绝
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleProcessRecharge(app.id, 'approve')}
                              disabled={processingId === app.id}
                              className="bg-green-500 hover:bg-green-600"
                            >
                              {processingId === app.id ? (
                                <Spinner className="w-4 h-4" />
                              ) : (
                                <Check className="w-4 h-4 mr-1" />
                              )}
                              通过
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* 分页 */}
                    {rechargeTotal > 20 && (
                      <div className="flex justify-between items-center pt-4">
                        <p className="text-sm text-gray-500">
                          共 {rechargeTotal} 条申请
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={rechargePage === 1}
                            onClick={() => { setRechargePage(p => p - 1); fetchRechargeApplications(); }}
                          >
                            上一页
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={rechargePage * 20 >= rechargeTotal}
                            onClick={() => { setRechargePage(p => p + 1); fetchRechargeApplications(); }}
                          >
                            下一页
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Complaints Tab */}
          <TabsContent value="complaints">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      投诉管理
                    </CardTitle>
                    <CardDescription>
                      查看并回复用户的投诉
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={complaintsStatus}
                      onChange={(e) => {
                        setComplaintsStatus(e.target.value);
                        setComplaintsPage(1);
                      }}
                      className="px-3 py-2 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 text-sm"
                    >
                      <option value="all">全部状态</option>
                      <option value="pending">待处理</option>
                      <option value="replied">已回复</option>
                      <option value="closed">已关闭</option>
                    </select>
                    <Button variant="outline" size="sm" onClick={fetchComplaints}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      刷新
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {complaintsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Spinner className="w-6 h-6" />
                  </div>
                ) : complaints.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无投诉</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {complaints.map((complaint: any) => (
                      <div key={complaint.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={complaint.user?.avatar || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-red-500 to-orange-500 text-white text-xs">
                                {complaint.user?.name?.[0]?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{complaint.user?.name || '未知用户'}</p>
                              <p className="text-xs text-gray-500">{complaint.user?.email}</p>
                            </div>
                          </div>
                          <Badge variant={
                            complaint.status === 'pending' ? 'secondary' :
                            complaint.status === 'replied' ? 'default' : 'outline'
                          }>
                            {complaint.status === 'pending' ? '待处理' :
                             complaint.status === 'replied' ? '已回复' : '已关闭'}
                          </Badge>
                        </div>
                        <div className="mb-3">
                          <h4 className="font-medium mb-1">{complaint.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                            {complaint.content}
                          </p>
                        </div>
                        {complaint.admin_reply && (
                          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-3">
                            <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">回复内容</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {complaint.admin_reply}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">
                            {new Date(complaint.created_at).toLocaleString('zh-CN')}
                          </p>
                          {complaint.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setReplyingComplaint(complaint);
                                setReplyDialogOpen(true);
                              }}
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              回复
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {complaintsTotal > 20 && (
                      <div className="flex justify-between items-center pt-4">
                        <p className="text-sm text-gray-500">共 {complaintsTotal} 条投诉</p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={complaintsPage === 1}
                            onClick={() => { setComplaintsPage(p => p - 1); fetchComplaints(); }}
                          >
                            上一页
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={complaintsPage * 20 >= complaintsTotal}
                            onClick={() => { setComplaintsPage(p => p + 1); fetchComplaints(); }}
                          >
                            下一页
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5" />
                      建议管理
                    </CardTitle>
                    <CardDescription>
                      审核用户提交的建议，通过后所有人可见
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={suggestionsStatus}
                      onChange={(e) => {
                        setSuggestionsStatus(e.target.value);
                        setSuggestionsPage(1);
                      }}
                      className="px-3 py-2 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 text-sm"
                    >
                      <option value="all">全部状态</option>
                      <option value="pending">待审核</option>
                      <option value="approved">已通过</option>
                      <option value="rejected">已拒绝</option>
                    </select>
                    <Button variant="outline" size="sm" onClick={fetchSuggestions}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      刷新
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {suggestionsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Spinner className="w-6 h-6" />
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无建议</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {suggestions.map((suggestion: any) => (
                      <div key={suggestion.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={suggestion.user?.avatar || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-amber-500 to-yellow-500 text-white text-xs">
                                {suggestion.user?.name?.[0]?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{suggestion.user?.name || '未知用户'}</p>
                              <p className="text-xs text-gray-500">{suggestion.user?.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">{suggestion.like_count} 赞</span>
                            <Badge variant={
                              suggestion.status === 'approved' ? 'default' :
                              suggestion.status === 'rejected' ? 'destructive' : 'secondary'
                            }>
                              {suggestion.status === 'pending' ? '待审核' :
                               suggestion.status === 'approved' ? '已通过' : '已拒绝'}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap mb-3">
                          {suggestion.content}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">
                            {new Date(suggestion.created_at).toLocaleString('zh-CN')}
                          </p>
                          {suggestion.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReviewSuggestion(suggestion.id, 'reject')}
                                className="text-red-500 hover:text-red-600"
                              >
                                <X className="w-4 h-4 mr-1" />
                                拒绝
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleReviewSuggestion(suggestion.id, 'approve')}
                                className="bg-green-500 hover:bg-green-600"
                              >
                                <Check className="w-4 h-4 mr-1" />
                                通过
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {suggestionsTotal > 20 && (
                      <div className="flex justify-between items-center pt-4">
                        <p className="text-sm text-gray-500">共 {suggestionsTotal} 条建议</p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={suggestionsPage === 1}
                            onClick={() => { setSuggestionsPage(p => p - 1); fetchSuggestions(); }}
                          >
                            上一页
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={suggestionsPage * 20 >= suggestionsTotal}
                            onClick={() => { setSuggestionsPage(p => p + 1); fetchSuggestions(); }}
                          >
                            下一页
                          </Button>
                        </div>
                      </div>
                    )}
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
                  <h3 className="font-semibold mb-4 text-purple-600">星球创建价格（U）</h3>
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
                    <Label htmlFor="defaultTicketPrice">默认门票价格（U）</Label>
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

          {/* 导航栏按钮配置 Tab */}
          <TabsContent value="nav">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  导航栏按钮配置
                </CardTitle>
                <CardDescription>
                  控制导航栏按钮的显示与隐藏
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 导航按钮开关 */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="font-medium">挑战赛大厅</p>
                      <p className="text-sm text-gray-500">显示"挑战赛大厅"导航按钮</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={navConfig.nav_show_challenge_hall}
                        onChange={(e) => setNavConfig({...navConfig, nav_show_challenge_hall: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="font-medium">K线征途</p>
                      <p className="text-sm text-gray-500">显示"K线征途"导航按钮</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={navConfig.nav_show_kline_challenge}
                        onChange={(e) => setNavConfig({...navConfig, nav_show_kline_challenge: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="font-medium">茶馆</p>
                      <p className="text-sm text-gray-500">显示"茶馆"导航按钮</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={navConfig.nav_show_social}
                        onChange={(e) => setNavConfig({...navConfig, nav_show_social: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="font-medium">文档中心</p>
                      <p className="text-sm text-gray-500">显示"文档中心"导航按钮</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={navConfig.nav_show_docs}
                        onChange={(e) => setNavConfig({...navConfig, nav_show_docs: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="font-medium">建议</p>
                      <p className="text-sm text-gray-500">显示"建议"导航按钮</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={navConfig.nav_show_suggestion}
                        onChange={(e) => setNavConfig({...navConfig, nav_show_suggestion: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="font-medium">投诉</p>
                      <p className="text-sm text-gray-500">显示"投诉"导航按钮</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={navConfig.nav_show_complaint}
                        onChange={(e) => setNavConfig({...navConfig, nav_show_complaint: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="font-medium">软件下载</p>
                      <p className="text-sm text-gray-500">显示"软件下载"导航按钮</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={navConfig.nav_show_download}
                        onChange={(e) => setNavConfig({...navConfig, nav_show_download: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveNavConfig}
                    disabled={saving}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {saving ? (
                      <>
                        <Spinner className="w-4 h-4 mr-2" />
                        保存中...
                      </>
                    ) : (
                      '保存导航配置'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Database Tab */}
          <TabsContent value="database">
            <DatabaseManager />
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

          {/* 聊天大厅 Tab */}
          <TabsContent value="chatHall">
            <ChatHallAdmin />
          </TabsContent>

          {/* 店小二配置 Tab */}
          <TabsContent value="aiConfig">
            <AIConfigPanel />
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
                  <Label>U 余额</Label>
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
                  <div className="space-y-2">
                    <Label>发布日期</Label>
                    <Input
                      type="date"
                      value={docForm.publishDate}
                      onChange={(e) => setDocForm({ ...docForm, publishDate: e.target.value })}
                    />
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

      {/* 回复投诉对话框 */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>回复投诉</DialogTitle>
            <DialogDescription>
              回复用户：{replyingComplaint?.user?.name || '未知用户'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm font-medium mb-1">投诉标题：</p>
              <p className="text-sm">{replyingComplaint?.title}</p>
              <p className="text-sm font-medium mb-1 mt-2">投诉内容：</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{replyingComplaint?.content}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="replyContent">回复内容</Label>
              <textarea
                id="replyContent"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="请输入回复内容..."
                rows={4}
                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 resize-none"
                maxLength={2000}
              />
              <p className="text-xs text-gray-500">{replyContent.length}/2000</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleReplyComplaint} disabled={replySubmitting}>
              {replySubmitting ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  提交中...
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  提交回复
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
