'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserCardSkeleton, RechargeFormSkeleton } from '@/components/loading-skeleton';
import { Spinner } from '@/components/ui/spinner';
import { 
  Wallet, 
  User as UserIcon, 
  Link2, 
  Unlink, 
  CheckCircle2,
  XCircle,
  AlertCircle,
  Coins,
  TrendingUp,
  Shield,
  CreditCard,
  History,
  Gift,
  Zap
} from 'lucide-react';

interface UserInfo {
  userId: string;
  email: string;
  name: string;
  coinBalance: number;
  createdAt: string;
}

interface MTAccount {
  id: number;
  accountNumber: string;
  broker: string;
  platform: string;
  isVerified: boolean;
  createdAt: string;
}

interface RechargeRecord {
  id: number;
  amount: number;
  paymentMethod: string;
  transactionId: string;
  status: string;
  createdAt: string;
}

const RECHARGE_OPTIONS = [
  { amount: 100, bonus: 0, popular: false },
  { amount: 200, bonus: 10, popular: false },
  { amount: 500, bonus: 30, popular: true },
  { amount: 1000, bonus: 80, popular: false },
  { amount: 2000, bonus: 200, popular: false },
  { amount: 5000, bonus: 600, popular: false },
];

export default function UserCenterPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [mtAccount, setMtAccount] = useState<MTAccount | null>(null);
  const [rechargeRecords, setRechargeRecords] = useState<RechargeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [mtForm, setMtForm] = useState({
    accountNumber: '',
    broker: '',
    platform: 'MT5',
  });
  const [mtLoading, setMtLoading] = useState(false);
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchData();
    }
  }, [status]);

  const fetchData = async () => {
    try {
      const [userRes, mtRes, rechargeRes] = await Promise.all([
        fetch('/api/user/info'),
        fetch('/api/mt-account'),
        fetch('/api/recharge'),
      ]);
      
      const userData = await userRes.json();
      const mtData = await mtRes.json();
      const rechargeData = await rechargeRes.json();
      
      setUser(userData.user);
      setMtAccount(mtData.account);
      setRechargeRecords(rechargeData.records || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBindMTAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setMtLoading(true);

    try {
      const res = await fetch('/api/mt-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mtForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '绑定失败');
      } else {
        setSuccess('MT账号绑定成功！');
        fetchData();
        setMtForm({ accountNumber: '', broker: '', platform: 'MT5' });
      }
    } catch (err) {
      setError('绑定失败，请稍后重试');
    } finally {
      setMtLoading(false);
    }
  };

  const handleUnbindMTAccount = async () => {
    if (!confirm('确定要解绑MT账号吗？解绑后将无法接收跟单信号。')) {
      return;
    }

    setMtLoading(true);
    try {
      const res = await fetch('/api/mt-account', { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '解绑失败');
      } else {
        setSuccess('MT账号已解绑');
        setMtAccount(null);
      }
    } catch (err) {
      setError('解绑失败，请稍后重试');
    } finally {
      setMtLoading(false);
    }
  };

  const handleRecharge = async (amount: number) => {
    setError('');
    setSuccess('');
    setRechargeLoading(true);

    try {
      const res = await fetch('/api/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, paymentMethod: 'system' }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '充值失败');
      } else {
        setSuccess(`充值成功！到账 ${amount} 星球币`);
        fetchData();
        setSelectedAmount(null);
        setCustomAmount('');
      }
    } catch (err) {
      setError('充值失败，请稍后重试');
    } finally {
      setRechargeLoading(false);
    }
  };

  const handleCustomRecharge = () => {
    const amount = parseInt(customAmount);
    if (!amount || amount < 10 || amount > 50000) {
      setError('充值金额需在10-50000之间');
      return;
    }
    handleRecharge(amount);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <UserCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            个人中心
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            管理您的账户、MT账号和星球币
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <CardContent className="pt-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">星球币余额</p>
                  <p className="text-3xl font-bold mt-1">{user?.coinBalance || 0}</p>
                </div>
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                  <Coins className="w-8 h-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <CardContent className="pt-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">MT账号状态</p>
                  <p className="text-xl font-bold mt-1">
                    {mtAccount ? '已绑定' : '未绑定'}
                  </p>
                </div>
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                  <Link2 className="w-8 h-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <CardContent className="pt-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">账号状态</p>
                  <p className="text-xl font-bold mt-1">正常</p>
                </div>
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                  <Shield className="w-8 h-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              账户信息
            </TabsTrigger>
            <TabsTrigger value="mt-account" className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              MT账号绑定
            </TabsTrigger>
            <TabsTrigger value="recharge" className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              充值中心
            </TabsTrigger>
          </TabsList>

          {/* Account Info Tab */}
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>账户信息</CardTitle>
                <CardDescription>您的基本账户信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-600 dark:text-gray-400">邮箱</Label>
                    <Input value={user?.email || ''} disabled className="bg-gray-50 dark:bg-gray-800" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-600 dark:text-gray-400">昵称</Label>
                    <Input value={user?.name || ''} disabled className="bg-gray-50 dark:bg-gray-800" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-600 dark:text-gray-400">注册时间</Label>
                    <Input
                      value={user?.createdAt ? new Date(user.createdAt).toLocaleString() : ''}
                      disabled
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-600 dark:text-gray-400">用户ID</Label>
                    <Input value={user?.userId || ''} disabled className="bg-gray-50 dark:bg-gray-800 font-mono text-sm" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => router.push('/planet')}>
                    浏览星球
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/planet/my')}>
                    我的星球
                  </Button>
                  <Button variant="destructive" onClick={() => signOut({ callbackUrl: '/' })}>
                    退出登录
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MT Account Tab */}
          <TabsContent value="mt-account">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="w-5 h-5" />
                  MT4/MT5 账号绑定
                </CardTitle>
                <CardDescription>
                  绑定您的MT账号以接收跟单信号（每人只能绑定一个账号）
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="mb-4 border-green-200 bg-green-50 dark:bg-green-900/20">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700 dark:text-green-400">{success}</AlertDescription>
                  </Alert>
                )}

                {mtAccount ? (
                  <div className="space-y-4">
                    <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                            {mtAccount.platform === 'MT5' ? '5' : '4'}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold">{mtAccount.accountNumber}</h3>
                            <p className="text-gray-600 dark:text-gray-400">{mtAccount.broker || '未知经纪商'}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={mtAccount.platform === 'MT5' ? 'default' : 'secondary'}>
                                {mtAccount.platform}
                              </Badge>
                              <Badge variant={mtAccount.isVerified ? 'default' : 'outline'} className={mtAccount.isVerified ? 'bg-green-500' : ''}>
                                {mtAccount.isVerified ? '已验证' : '待验证'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleUnbindMTAccount}
                          disabled={mtLoading}
                        >
                          <Unlink className="w-4 h-4 mr-2" />
                          解绑
                        </Button>
                      </div>
                    </div>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        绑定后，您在该账号发布的信号将自动关联到您的星球。请确保EA已正确配置。
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : (
                  <form onSubmit={handleBindMTAccount} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="platform">平台类型 *</Label>
                        <select
                          id="platform"
                          value={mtForm.platform}
                          onChange={(e) => setMtForm({ ...mtForm, platform: e.target.value })}
                          className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-700"
                        >
                          <option value="MT5">MetaTrader 5</option>
                          <option value="MT4">MetaTrader 4</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="accountNumber">MT账号 *</Label>
                        <Input
                          id="accountNumber"
                          placeholder="输入您的MT账号"
                          value={mtForm.accountNumber}
                          onChange={(e) => setMtForm({ ...mtForm, accountNumber: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="broker">经纪商名称</Label>
                        <Input
                          id="broker"
                          placeholder="例如：IC Markets, XM 等（选填）"
                          value={mtForm.broker}
                          onChange={(e) => setMtForm({ ...mtForm, broker: e.target.value })}
                        />
                      </div>
                    </div>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>注意：</strong>每人只能绑定一个MT账号。绑定后请确保EA配置正确，以便信号能正确上传。
                      </AlertDescription>
                    </Alert>

                    <Button type="submit" disabled={mtLoading} className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                      {mtLoading ? (
                        <>
                          <Spinner className="mr-2" />
                          绑定中...
                        </>
                      ) : (
                        '绑定账号'
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recharge Tab */}
          <TabsContent value="recharge">
            <div className="space-y-6">
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="w-5 h-5" />
                    星球币充值
                  </CardTitle>
                  <CardDescription>
                    充值星球币用于购买星球门票，大额充值更有额外赠送
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 快捷充值选项 */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {RECHARGE_OPTIONS.map((option) => (
                      <button
                        key={option.amount}
                        onClick={() => {
                          setSelectedAmount(option.amount);
                          setCustomAmount('');
                        }}
                        disabled={rechargeLoading}
                        className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                          selectedAmount === option.amount
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                        }`}
                      >
                        {option.popular && (
                          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                            热门
                          </div>
                        )}
                        {option.bonus > 0 && (
                          <div className="absolute -top-2 -left-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Gift className="w-3 h-3" />
                            +{option.bonus}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mb-1">
                          <Zap className="w-5 h-5 text-yellow-500" />
                          <span className="text-2xl font-bold">{option.amount}</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          星球币
                        </p>
                        {option.bonus > 0 && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            实际到账: {option.amount + option.bonus}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* 自定义金额 */}
                  <div className="pt-4 border-t">
                    <Label className="text-gray-600 dark:text-gray-400 mb-2 block">自定义金额</Label>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          type="number"
                          placeholder="输入充值金额 (10-50000)"
                          value={customAmount}
                          onChange={(e) => {
                            setCustomAmount(e.target.value);
                            setSelectedAmount(null);
                          }}
                          className="pl-10"
                          min={10}
                          max={50000}
                        />
                      </div>
                      <Button
                        onClick={handleCustomRecharge}
                        disabled={rechargeLoading || !customAmount}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      >
                        {rechargeLoading ? <Spinner className="w-4 h-4" /> : '充值'}
                      </Button>
                    </div>
                  </div>

                  {/* 充值按钮 */}
                  {selectedAmount && (
                    <Button
                      onClick={() => handleRecharge(selectedAmount)}
                      disabled={rechargeLoading}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 h-12 text-lg"
                    >
                      {rechargeLoading ? (
                        <>
                          <Spinner className="mr-2" />
                          充值中...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5 mr-2" />
                          立即充值 {selectedAmount} 星球币
                        </>
                      )}
                    </Button>
                  )}

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      充值即时到账，星球币仅用于平台内消费，不支持退款。
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* 充值记录 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="w-4 h-4" />
                    充值记录
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {rechargeRecords.length > 0 ? (
                    <div className="space-y-3">
                      {rechargeRecords.slice(0, 5).map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div>
                            <p className="font-medium">+{record.amount} 星球币</p>
                            <p className="text-sm text-gray-500">
                              {new Date(record.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <Badge
                            variant={record.status === 'completed' ? 'default' : 'secondary'}
                            className={record.status === 'completed' ? 'bg-green-500' : ''}
                          >
                            {record.status === 'completed' ? '已完成' : '处理中'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>暂无充值记录</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
