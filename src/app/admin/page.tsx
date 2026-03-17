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
  RefreshCw
} from 'lucide-react';

// 系统配置
interface SystemConfig {
  planetCreationThreshold: number; // 创建星球所需的充值金额
  rechargeEnabled: boolean; // 充值功能是否开启
  defaultTicketPrice: number; // 默认门票价格
  maxPublishers: number; // 最大发布者数量
}

// 统计数据
interface Stats {
  totalUsers: number;
  totalPlanets: number;
  totalSignals: number;
  totalCoins: number;
  activeFollows: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [config, setConfig] = useState<SystemConfig>({
    planetCreationThreshold: 2000,
    rechargeEnabled: true,
    defaultTicketPrice: 100,
    maxPublishers: 3,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // 简单的管理员验证（实际应通过数据库或权限系统）
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchStats();
    }
  }, [status]);

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
    } finally {
      setLoading(false);
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

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center h-64">
          <Spinner className="w-8 h-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
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
                    <p className="text-sm text-gray-500">信号总数</p>
                    <p className="text-2xl font-bold">{stats.totalSignals}</p>
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
        <Tabs defaultValue="config" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              系统配置
            </TabsTrigger>
            <TabsTrigger value="database" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              数据库
            </TabsTrigger>
            <TabsTrigger value="ea" className="flex items-center gap-2">
              <FileCode className="w-4 h-4" />
              EA管理
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              用户管理
            </TabsTrigger>
          </TabsList>

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="planetCreationThreshold">创建星球所需充值金额（星球币）</Label>
                    <Input
                      id="planetCreationThreshold"
                      type="number"
                      value={config.planetCreationThreshold}
                      onChange={(e) => setConfig({ ...config, planetCreationThreshold: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-gray-500">用户累计充值达到此金额后可创建星球</p>
                  </div>

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
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>用户管理功能开发中...</p>
                  <p className="text-sm mt-2">将支持查看用户列表、修改余额、封禁用户等功能</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
