'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserCardSkeleton } from '@/components/loading-skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Wallet, 
  User as UserIcon, 
  Link2, 
  Unlink, 
  CheckCircle2,
  XCircle,
  AlertCircle,
  Coins,
  Shield,
  Camera,
  Edit3,
  Clock,
  Gift,
  Zap,
  Globe,
  TrendingUp,
  Crown,
  Star,
  Ban,
  MessageSquare,
  Lightbulb,
  QrCode,
  ArrowRight,
} from 'lucide-react';

interface UserInfo {
  userId: string;
  email: string;
  name: string;
  avatar: string | null;
  coinBalance: number;
  createdAt: string;
  nameUpdatedAt: string | null;
}

interface MTAccount {
  id: number;
  accountNumber: string;
  broker: string;
  platform: string;
  isVerified: boolean;
  createdAt: string;
}

interface FollowInfo {
  id: number;
  planetId: number;
  planetName: string;
  signalAccount: string;
  status: string;
  createdAt: string;
}

// 会员等级配置
const MEMBER_LEVELS = [
  { name: '普通会员', minCoins: 0, icon: Star, color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  { name: '银牌会员', minCoins: 500, icon: Star, color: 'text-gray-400', bgColor: 'bg-gray-200 dark:bg-gray-700' },
  { name: '金牌会员', minCoins: 1000, icon: Star, color: 'text-yellow-500', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  { name: '白金会员', minCoins: 2000, icon: Crown, color: 'text-purple-500', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  { name: '钻石会员', minCoins: 5000, icon: Crown, color: 'text-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
];

// 获取会员等级
function getMemberLevel(totalRecharged: number) {
  for (let i = MEMBER_LEVELS.length - 1; i >= 0; i--) {
    if (totalRecharged >= MEMBER_LEVELS[i].minCoins) {
      return MEMBER_LEVELS[i];
    }
  }
  return MEMBER_LEVELS[0];
}

export default function UserCenterPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [mtAccount, setMtAccount] = useState<MTAccount | null>(null);
  const [followInfo, setFollowInfo] = useState<FollowInfo[]>([]);
  const [totalRecharged, setTotalRecharged] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mtForm, setMtForm] = useState({
    accountNumber: '',
    platform: 'MT5',
  });
  const [mtLoading, setMtLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // 头像和昵称相关状态
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [nameLoading, setNameLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [canChangeName, setCanChangeName] = useState(true);
  const [nextNameChangeDate, setNextNameChangeDate] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const [userRes, mtRes, followRes] = await Promise.all([
        fetch('/api/user/info'),
        fetch('/api/mt-account'),
        fetch('/api/follow/my'),
      ]);
      
      const userData = await userRes.json();
      const mtData = await mtRes.json();
      const followData = await followRes.json();
      
      setUser(userData.user);
      setMtAccount(mtData.account);
      setFollowInfo(followData.follows || []);
      setTotalRecharged(userData.totalRecharged || 0);
      setNewName(userData.user?.name || '');
      
      // 检查昵称修改限制
      checkNameChangeLimit(userData.user);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkNameChangeLimit = (userData: UserInfo) => {
    if (!userData?.nameUpdatedAt) {
      setCanChangeName(true);
      return;
    }
    
    const lastUpdate = new Date(userData.nameUpdatedAt);
    const oneYearLater = new Date(lastUpdate);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    
    if (new Date() < oneYearLater) {
      setCanChangeName(false);
      setNextNameChangeDate(oneYearLater.toLocaleDateString());
    } else {
      setCanChangeName(true);
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
      
      if (data.success) {
        setSuccess('MT账号绑定成功');
        setMtAccount(data.account);
        setMtForm({ accountNumber: '', platform: 'MT5' });
      } else {
        setError(data.error || '绑定失败');
      }
    } catch (error) {
      setError('绑定失败，请稍后重试');
    } finally {
      setMtLoading(false);
    }
  };

  const handleUnbindMTAccount = async () => {
    if (!mtAccount) return;
    
    setError('');
    setSuccess('');
    setMtLoading(true);

    try {
      const res = await fetch(`/api/mt-account?id=${mtAccount.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      
      if (data.success) {
        setSuccess('MT账号已解绑');
        setMtAccount(null);
      } else {
        setError(data.error || '解绑失败');
      }
    } catch (error) {
      setError('解绑失败，请稍后重试');
    } finally {
      setMtLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setAvatarLoading(true);
    setError('');
    
    try {
      // 将图片转换为 base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: base64 }),
      });
      const data = await res.json();
      
      if (data.success) {
        setUser(prev => prev ? { ...prev, avatar: data.avatar } : null);
        setSuccess('头像更新成功');
      } else {
        setError(data.error || '头像更新失败');
      }
    } catch (err) {
      console.error('Avatar update error:', err);
      setError('头像更新失败，请稍后重试');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleNameChange = async () => {
    if (!newName.trim() || newName === user?.name) return;
    
    if (!canChangeName) {
      setError(`昵称修改已受限，下次可修改时间: ${nextNameChangeDate}`);
      return;
    }
    
    setNameLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/user/name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      
      if (data.success) {
        setUser(prev => prev ? { ...prev, name: newName.trim() } : null);
        setSuccess('昵称修改成功');
        checkNameChangeLimit({ ...user!, nameUpdatedAt: new Date().toISOString() });
      } else {
        setError(data.error || '昵称修改失败');
      }
    } catch (error) {
      setError('昵称修改失败，请稍后重试');
    } finally {
      setNameLoading(false);
    }
  };

  const memberLevel = getMemberLevel(totalRecharged);
  const LevelIcon = memberLevel.icon;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-gray-900 dark:via-amber-950/30 dark:to-orange-950/30 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">个人中心</h1>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UserCardSkeleton />
            <UserCardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-gray-900 dark:via-amber-950/30 dark:to-orange-950/30 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl mb-4">
            <UserIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">个人中心</h1>
          <p className="text-gray-600 dark:text-gray-400">
            余额: <span className="font-bold text-amber-600">{user?.coinBalance || 0} U</span>
          </p>
        </div>

        {/* 会员等级 */}
        <div className="mb-6">
          <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full ${memberLevel.bgColor}`}>
            <LevelIcon className={`w-5 h-5 ${memberLevel.color}`} />
            <span className={`font-semibold ${memberLevel.color}`}>{memberLevel.name}</span>
            <span className="text-gray-500 text-sm">累计充值 {totalRecharged} U</span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              个人资料
            </TabsTrigger>
            <TabsTrigger value="recharge" className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              充值
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 昵称设置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-blue-500" />
                    昵称设置
                  </CardTitle>
                  <CardDescription>
                    修改您的昵称，一年仅能修改一次
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {success && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-700">{success}</AlertDescription>
                    </Alert>
                  )}
                  {error && (
                    <Alert className="border-red-200 bg-red-50">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-700">{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label>新昵称</Label>
                    <Input
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="输入新昵称"
                      maxLength={20}
                    />
                    {!canChangeName && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        下次可修改时间: {nextNameChangeDate}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleNameChange}
                    disabled={nameLoading || !newName.trim() || newName === user?.name || !canChangeName}
                    className="w-full"
                  >
                    {nameLoading ? '保存中...' : '保存昵称'}
                  </Button>
                </CardContent>
              </Card>

              {/* 头像设置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-purple-500" />
                    头像设置
                  </CardTitle>
                  <CardDescription>
                    上传您的头像，建议尺寸 200x200
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-24 h-24">
                      <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-2xl">
                        {user?.name?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                      {user?.avatar && <AvatarImage src={user.avatar} />}
                    </Avatar>
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={avatarLoading}
                      >
                        {avatarLoading ? '上传中...' : '选择图片'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* MT账号绑定 - 暂时隐藏
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {mtAccount ? (
                      <Unlink className="w-5 h-5 text-red-500" />
                    ) : (
                      <Link2 className="w-5 h-5 text-green-500" />
                    )}
                    MT账号绑定
                  </CardTitle>
                  <CardDescription>
                    绑定您的MT4/MT5账号，用于接收跟单信号
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {mtAccount ? (
                    <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                          <Globe className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-lg">{mtAccount.accountNumber}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{mtAccount.platform}</Badge>
                            <Badge className={mtAccount.isVerified ? 'bg-green-500' : 'bg-yellow-500'}>
                              {mtAccount.isVerified ? '已验证' : '待验证'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleUnbindMTAccount}
                        disabled={mtLoading}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Unlink className="w-4 h-4 mr-1" />
                        解绑
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleBindMTAccount} className="space-y-4">
                      {error && (
                        <Alert className="border-red-200 bg-red-50">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-700">{error}</AlertDescription>
                        </Alert>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>MT账号</Label>
                          <Input
                            value={mtForm.accountNumber}
                            onChange={e => setMtForm({ ...mtForm, accountNumber: e.target.value })}
                            placeholder="输入MT账号"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>平台</Label>
                          <select
                            value={mtForm.platform}
                            onChange={e => setMtForm({ ...mtForm, platform: e.target.value })}
                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                          >
                            <option value="MT4">MT4</option>
                            <option value="MT5">MT5</option>
                          </select>
                        </div>
                      </div>
                      <Button type="submit" disabled={mtLoading} className="w-full">
                        {mtLoading ? '绑定中...' : '绑定账号'}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
              */}

              {/* 跟单统计 - 暂时隐藏
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-amber-500" />
                    我的跟单
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {followInfo.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>暂未跟单任何信号</p>
                      <p className="text-sm mt-2">去星球探索感兴趣的信号吧</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {followInfo.map(info => (
                        <div key={info.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                              <Globe className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-medium">{info.planetName}</p>
                              <p className="text-xs text-gray-500">信号账号: {info.signalAccount}</p>
                            </div>
                          </div>
                          <Badge className={info.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                            {info.status === 'active' ? '跟单中' : '已暂停'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 投诉和建议入口 */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-red-500" />
                    意见反馈
                  </CardTitle>
                  <CardDescription>
                    有问题或建议？我们随时为您服务
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <a href="/complaint" className="block">
                      <div className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors cursor-pointer">
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                          <MessageSquare className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <p className="font-semibold">意见投诉</p>
                          <p className="text-sm text-gray-500">提交您遇到的问题</p>
                        </div>
                      </div>
                    </a>
                    <a href="/suggestion" className="block">
                      <div className="flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors cursor-pointer">
                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                          <Lightbulb className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-semibold">意见建议</p>
                          <p className="text-sm text-gray-500">提出您的宝贵建议</p>
                        </div>
                      </div>
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Recharge Tab */}
          <TabsContent value="recharge">
            {/* 微信充值入口 */}
            <Card className="border-green-200 dark:border-green-800 max-w-xl mx-auto">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <QrCode className="w-5 h-5 text-green-500" />
                  充值 U
                </CardTitle>
                <CardDescription className="text-xs">
                  使用微信扫码支付，方便快捷
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a href="/wechat-recharge" className="block">
                  <Button 
                    variant="outline" 
                    className="w-full h-auto py-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <QrCode className="w-10 h-10 text-green-600" />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-lg text-green-700 dark:text-green-400">微信扫码充值</p>
                        <p className="text-xs text-gray-500 mt-1">点击进入充值页面 →</p>
                      </div>
                    </div>
                  </Button>
                </a>
                <p className="text-xs text-gray-500 text-center mt-4">
                  * 充值申请提交后，后台将在1-24小时内审核，审核通过后 U 将自动到账
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
