'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { 
  Settings, 
  Users, 
  FileText, 
  CheckCircle2,
  AlertCircle,
  Radio,
  RadioIcon,
  Save,
  Edit3
} from 'lucide-react';

interface Application {
  id: number;
  userId: string;
  userName: string;
  userEmail: string;
  appliedAt: string;
  status: string;
}

interface Member {
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  joinMethod: string;
  ticketPaid: number;
  joinedAt: string;
  expiryDate: string;
  followStatus: string | null;
}

interface PlanetInfo {
  id: number;
  name: string;
  description: string;
  rules: string;
  ticketPrice: number;
  ownerAsPublisher: boolean;
  maxPublishers: number;
  status: string;
  inviteCode: string;
}

export default function PlanetManagePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [planet, setPlanet] = useState<PlanetInfo | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState({ totalMembers: 0, totalEarnings: 0 });
  const [ownerAsPublisher, setOwnerAsPublisher] = useState(false);
  const [updatingPublisher, setUpdatingPublisher] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // 编辑模式状态
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    rules: '',
    ticketPrice: 0,
  });
  const [savingInfo, setSavingInfo] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, params.id]);

  const fetchData = async () => {
    try {
      // Fetch planet detail
      const planetRes = await fetch(`/api/planet/${params.id}`);
      const planetData = await planetRes.json();
      
      if (planetData.userRole !== 'owner') {
        router.push('/planet');
        return;
      }

      setPlanet(planetData.planet);
      setOwnerAsPublisher(planetData.planet.ownerAsPublisher || false);
      setStats({ totalMembers: planetData.memberCount, totalEarnings: 0 });
      
      // 初始化编辑表单
      setEditForm({
        name: planetData.planet.name || '',
        description: planetData.planet.description || '',
        rules: planetData.planet.rules || '',
        ticketPrice: planetData.planet.ticketPrice || 0,
      });

      // Fetch applications
      const appRes = await fetch(`/api/planet/applications?planetId=${params.id}`);
      const appData = await appRes.json();
      setApplications(appData.applications || []);

      // Fetch members
      const membersRes = await fetch(`/api/planet/members?planetId=${params.id}`);
      const membersData = await membersRes.json();
      setMembers(membersData.members || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      const res = await fetch('/api/planet/approve-publisher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planetId: parseInt(params.id as string), userId }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const res = await fetch('/api/planet/reject-publisher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planetId: parseInt(params.id as string), userId }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  };

  const handleOwnerPublisherChange = async (checked: boolean) => {
    setUpdatingPublisher(true);
    setSuccessMessage('');
    
    try {
      const res = await fetch('/api/planet/set-owner-publisher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          planetId: parseInt(params.id as string), 
          ownerAsPublisher: checked 
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setOwnerAsPublisher(checked);
        setSuccessMessage(data.message);
        fetchData();
      } else {
        alert(data.error || '设置失败');
      }
    } catch (error) {
      console.error('Failed to update:', error);
      alert('设置失败，请稍后重试');
    } finally {
      setUpdatingPublisher(false);
    }
  };

  const handleSaveInfo = async () => {
    setSavingInfo(true);
    setSuccessMessage('');
    
    try {
      const res = await fetch('/api/planet/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planetId: parseInt(params.id as string),
          ...editForm,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMessage('星球信息更新成功！');
        setEditMode(false);
        fetchData();
      } else {
        alert(data.error || '更新失败');
      }
    } catch (error) {
      console.error('Failed to update planet:', error);
      alert('更新失败，请稍后重试');
    } finally {
      setSavingInfo(false);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    // 重置表单
    setEditForm({
      name: planet?.name || '',
      description: planet?.description || '',
      rules: planet?.rules || '',
      ticketPrice: planet?.ticketPrice || 0,
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900">
        <div className="text-center">
          <Spinner className="w-8 h-8 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const publisherCount = members.filter(m => m.role === 'publisher' || (m.role === 'owner' && ownerAsPublisher)).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                管理星球: {planet?.name}
              </h1>
              <Badge variant={planet?.status === 'active' ? 'default' : 'secondary'}>
                {planet?.status === 'active' ? '活跃' : '已关闭'}
              </Badge>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              管理成员、发布者和设置
            </p>
          </div>
          <Link href={`/planet/${params.id}`}>
            <Button variant="outline" className="border-purple-200 dark:border-purple-800">
              查看星球
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-xs">总成员数</p>
                  <p className="text-2xl font-bold">{stats.totalMembers}</p>
                </div>
                <Users className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-xs">待审核申请</p>
                  <p className="text-2xl font-bold">{pendingApplications.length}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-xs">发布者数</p>
                  <p className="text-2xl font-bold">{publisherCount}/{planet?.maxPublishers || 3}</p>
                </div>
                <Radio className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-xs">门票价格</p>
                  <p className="text-2xl font-bold">{planet?.ticketPrice || 0}</p>
                </div>
                <Settings className="w-8 h-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Success Message */}
        {successMessage && (
          <Alert className="mb-6 border-green-200 bg-green-50 dark:bg-green-900/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-400">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              星球设置
            </TabsTrigger>
            <TabsTrigger value="applications" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              申请管理
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              成员列表
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6">
              {/* Planet Info Settings */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Edit3 className="w-5 h-5" />
                        星球信息
                      </CardTitle>
                      <CardDescription>
                        编辑星球的基本信息
                      </CardDescription>
                    </div>
                    {!editMode && (
                      <Button variant="outline" onClick={() => setEditMode(true)}>
                        <Edit3 className="w-4 h-4 mr-2" />
                        编辑
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editMode ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="name">星球名称</Label>
                        <Input
                          id="name"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          placeholder="输入星球名称"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="description">星球描述</Label>
                        <Input
                          id="description"
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          placeholder="输入星球描述"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="rules">星球公告</Label>
                        <textarea
                          id="rules"
                          value={editForm.rules}
                          onChange={(e) => setEditForm({ ...editForm, rules: e.target.value })}
                          placeholder="输入星球公告"
                          className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 min-h-[100px]"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="ticketPrice">门票价格（U）</Label>
                        <Input
                          id="ticketPrice"
                          type="number"
                          value={editForm.ticketPrice}
                          onChange={(e) => setEditForm({ ...editForm, ticketPrice: parseInt(e.target.value) || 0 })}
                          placeholder="0"
                          min="0"
                        />
                      </div>
                      
                      <div className="flex gap-3 pt-4">
                        <Button 
                          onClick={handleSaveInfo} 
                          disabled={savingInfo}
                          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        >
                          {savingInfo ? (
                            <>
                              <Spinner className="w-4 h-4 mr-2" />
                              保存中...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              保存修改
                            </>
                          )}
                        </Button>
                        <Button variant="outline" onClick={handleCancelEdit}>
                          取消
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-sm text-gray-500 mb-1">星球名称</p>
                          <p className="font-semibold">{planet?.name}</p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-sm text-gray-500 mb-1">门票价格</p>
                          <p className="font-semibold">{planet?.ticketPrice || 0} U</p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-sm text-gray-500 mb-1">最大发布者数</p>
                          <p className="font-semibold">{planet?.maxPublishers || 3} 人</p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-sm text-gray-500 mb-1">邀请码</p>
                          <p className="font-semibold font-mono">{planet?.inviteCode || '-'}</p>
                        </div>
                      </div>
                      
                      {planet?.description && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-sm text-gray-500 mb-1">星球描述</p>
                          <p className="text-gray-700 dark:text-gray-300">{planet.description}</p>
                        </div>
                      )}
                      
                      {planet?.rules && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-sm text-gray-500 mb-1">星球公告</p>
                          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{planet.rules}</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Publisher Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RadioIcon className="w-5 h-5" />
                    发布者设置
                  </CardTitle>
                  <CardDescription>
                    配置星球发布者相关权限
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Owner as Publisher Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="space-y-1">
                      <Label htmlFor="owner-publisher" className="text-base font-semibold">
                        我作为信号发布者
                      </Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        开启后，您可以在自己的星球发布交易信号，成员可以跟单
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {updatingPublisher && <Spinner className="w-4 h-4" />}
                      <Switch
                        id="owner-publisher"
                        checked={ownerAsPublisher}
                        onCheckedChange={handleOwnerPublisherChange}
                        disabled={updatingPublisher}
                      />
                    </div>
                  </div>

                  {/* Status Display */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 dark:text-gray-400">当前状态：</span>
                      {ownerAsPublisher ? (
                        <Badge className="bg-green-500">已开启发布者权限</Badge>
                      ) : (
                        <Badge variant="outline">未开启发布者权限</Badge>
                      )}
                    </div>
                  </div>

                  {/* Info Alert */}
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>说明</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1 mt-2">
                        <li>开启后，您需要绑定MT账号才能发布信号</li>
                        <li>您发布的信号将自动关联到此星球</li>
                        <li>星球成员可以对您的信号进行跟单</li>
                        <li>您可以随时开启或关闭此功能</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle>发布者申请</CardTitle>
                <CardDescription>审核成员成为发布者的申请</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingApplications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    暂无待审核的申请
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingApplications.map((app) => (
                      <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{app.userName}</p>
                          <p className="text-sm text-gray-500">{app.userEmail}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            申请时间: {new Date(app.appliedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleApprove(app.userId)}>
                            批准
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleReject(app.userId)}>
                            拒绝
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>成员列表</CardTitle>
                <CardDescription>星球所有成员</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">用户</th>
                        <th className="text-left py-3 px-4">角色</th>
                        <th className="text-left py-3 px-4">加入方式</th>
                        <th className="text-left py-3 px-4">跟单状态</th>
                        <th className="text-left py-3 px-4">加入时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((member) => (
                        <tr key={member.userId} className="border-b">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{member.userName}</p>
                              <p className="text-sm text-gray-500">{member.userEmail}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={member.role === 'owner' ? 'default' : member.role === 'publisher' ? 'secondary' : 'outline'}>
                              {member.role === 'owner' ? '星主' : member.role === 'publisher' ? '发布者' : '成员'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            {member.joinMethod === 'purchase' ? '购买门票' : '邀请码'}
                          </td>
                          <td className="py-3 px-4">
                            {member.followStatus === 'active' ? (
                              <Badge className="bg-green-500">跟单中</Badge>
                            ) : member.followStatus === 'paused' ? (
                              <Badge variant="secondary">已暂停</Badge>
                            ) : (
                              <span className="text-gray-400 text-sm">未跟单</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500">
                            {new Date(member.joinedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
