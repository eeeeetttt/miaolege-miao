'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Check, X, RefreshCw, Settings, AlertCircle, Layers } from 'lucide-react';

interface ChallengeRegistration {
  registration: {
    id: number;
    userId: string;
    status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'failed' | 'level_passed';
    currentLevel: number;
    completedLevels: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    failedAt: Date | null;
    serverName: string | null;
    tradingAccount: string | null;
    createdAt: Date | null;
  };
  user: {
    userId: string;
    name: string | null;
    email: string | null;
    avatar: string | null;
  } | null;
}

interface LevelConfig {
  id: number;
  level: number;
  name: string;
  description: string | null;
  targetBalance: number;
  initialBalance: number;
  failBalance: number;
  reward: string | null;
}

export default function ChallengeAdminPage() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<ChallengeRegistration[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [config, setConfig] = useState<Record<string, string>>({});
  const [levelConfigs, setLevelConfigs] = useState<LevelConfig[]>([]);
  
  // 审核对话框
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<ChallengeRegistration | null>(null);
  const [approveForm, setApproveForm] = useState({
    serverName: '',
    tradingAccount: '',
    tradingPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // 配置对话框
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [descriptionForm, setDescriptionForm] = useState('');

  // 关卡配置对话框（独立窗口）
  const [levelConfigsDialogOpen, setLevelConfigsDialogOpen] = useState(false);
  
  // 快速编辑状态（用于关卡配置表格）
  const [editingLevels, setEditingLevels] = useState<Record<number, {
    initialBalance: number;
    targetBalance: number;
    failBalance: number;
  }>>({});
  
  // 单关编辑对话框
  const [levelDialogOpen, setLevelDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<LevelConfig | null>(null);
  const [levelForm, setLevelForm] = useState({
    name: '',
    description: '',
    initialBalance: 1000,
    targetBalance: 2000,
    failBalance: 100,
    reward: '',
  });

  useEffect(() => {
    fetchList();
  }, [statusFilter]);

  useEffect(() => {
    if (configDialogOpen && config.description) {
      setDescriptionForm(config.description);
    }
  }, [configDialogOpen, config.description]);

  const fetchList = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      
      const res = await fetch(`/api/admin/challenge?${params}`);
      const data = await res.json();
      
      if (res.ok) {
        setList(data.list || []);
        setTotal(data.total || 0);
        setConfig(data.config || {});
        setLevelConfigs(data.levelConfigs || []);
      }
    } catch (error) {
      console.error('获取列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRegistration) return;
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          registrationId: selectedRegistration.registration.id,
          ...approveForm,
        }),
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setApproveDialogOpen(false);
        setSelectedRegistration(null);
        setApproveForm({ serverName: '', tradingAccount: '', tradingPassword: '' });
        fetchList();
      } else {
        alert(data.error || '操作失败');
      }
    } catch (error) {
      alert('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (action: string, registrationId: number) => {
    if (!confirm(`确定要执行此操作吗？`)) return;
    
    setActionLoading(registrationId);
    try {
      const res = await fetch('/api/admin/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, registrationId }),
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        fetchList();
      } else {
        alert(data.error || '操作失败');
      }
    } catch (error) {
      alert('操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateConfig = async (configKey: string, value: string) => {
    try {
      const res = await fetch('/api/admin/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateConfig', configKey, configValue: value }),
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setConfig((prev) => ({ ...prev, [configKey]: value }));
        alert('配置已更新');
      } else {
        alert(data.error || '更新失败');
      }
    } catch (error) {
      alert('更新失败');
    }
  };

  const handleUpdateDescription = async () => {
    try {
      const res = await fetch('/api/admin/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateDescription', description: descriptionForm }),
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setConfig((prev) => ({ ...prev, description: descriptionForm }));
        alert('比赛说明已更新');
      } else {
        alert(data.error || '更新失败');
      }
    } catch (error) {
      alert('更新失败');
    }
  };

  // 打开关卡配置对话框
  const handleEditLevel = (level: LevelConfig) => {
    setEditingLevel(level);
    setLevelForm({
      name: level.name,
      description: level.description || '',
      initialBalance: typeof level.initialBalance === 'number' ? level.initialBalance : parseFloat(String(level.initialBalance)) || 1000,
      targetBalance: typeof level.targetBalance === 'number' ? level.targetBalance : parseFloat(String(level.targetBalance)) || 2000,
      failBalance: typeof level.failBalance === 'number' ? level.failBalance : parseFloat(String(level.failBalance)) || 100,
      reward: level.reward || '',
    });
    setLevelDialogOpen(true);
  };

  // 保存关卡配置
  const handleSaveLevel = async () => {
    if (!editingLevel) return;

    try {
      const res = await fetch('/api/admin/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateLevelConfig',
          level: editingLevel.level,
          ...levelForm,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // 更新本地状态
        setLevelConfigs(prev => prev.map(l => 
          l.level === editingLevel.level ? { ...l, ...levelForm } : l
        ));
        setLevelDialogOpen(false);
        alert('关卡配置已保存');
      } else {
        alert(data.error || '保存失败');
      }
    } catch (error) {
      alert('保存失败');
    }
  };

  // 快速保存关卡数值配置（不修改名称和描述）
  const handleSaveLevelQuick = async (
    levelNum: number, 
    initialBalance: number, 
    targetBalance: number, 
    failBalance: number
  ) => {
    try {
      const res = await fetch('/api/admin/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateLevelConfig',
          level: levelNum,
          initialBalance,
          targetBalance,
          failBalance,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // 更新本地状态
        setLevelConfigs(prev => prev.map(l => 
          l.level === levelNum ? { 
            ...l, 
            initialBalance, 
            targetBalance, 
            failBalance 
          } : l
        ));
        alert(`第${levelNum}关配置已保存`);
      } else {
        alert(data.error || '保存失败');
      }
    } catch (error) {
      alert('保存失败');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      pending: { color: 'bg-yellow-500', label: '待审核' },
      approved: { color: 'bg-blue-500', label: '待激活' },
      active: { color: 'bg-green-500', label: '挑战中' },
      level_passed: { color: 'bg-purple-500', label: '待开启下一关' },
      completed: { color: 'bg-purple-600', label: '已通关' },
      failed: { color: 'bg-red-500', label: '已失败' },
      rejected: { color: 'bg-gray-500', label: '已拒绝' },
    };
    const info = statusMap[status] || { color: 'bg-gray-500', label: status };
    return <Badge className={`${info.color} text-white`}>{info.label}</Badge>;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">K线征途管理</h1>
          <p className="text-gray-500">管理挑战赛申请和配置</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setConfigDialogOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />
            挑战赛配置
          </Button>
          <Button variant="outline" onClick={() => setLevelConfigsDialogOpen(true)}>
            <Layers className="w-4 h-4 mr-2" />
            关卡配置
          </Button>
          <Button variant="outline" onClick={fetchList}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">待审核</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {list.filter((i) => i.registration.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">挑战中</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {list.filter((i) => i.registration.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-600 dark:text-purple-400">待开启下一关</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {list.filter((i) => i.registration.status === 'level_passed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">已通关</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {list.filter((i) => i.registration.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">已失败</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {list.filter((i) => i.registration.status === 'failed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选 */}
      <div className="flex gap-4 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="筛选状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="pending">待审核</SelectItem>
            <SelectItem value="approved">待激活</SelectItem>
            <SelectItem value="active">挑战中</SelectItem>
            <SelectItem value="level_passed">待开启下一关</SelectItem>
            <SelectItem value="completed">已通关</SelectItem>
            <SelectItem value="failed">已失败</SelectItem>
            <SelectItem value="rejected">已拒绝</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-gray-500 self-center">共 {total} 条记录</span>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            暂无数据
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {list.map((item) => (
            <Card key={item.registration.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      {item.user?.avatar ? (
                        <img src={item.user.avatar} className="w-full h-full rounded-full" />
                      ) : (
                        <span className="text-lg font-bold">
                          {item.user?.name?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{item.user?.name || '未知用户'}</p>
                      <p className="text-sm text-gray-500">{item.user?.email || ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(item.registration.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">申请ID：</span>
                    <span className="font-mono">{item.registration.id}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">当前关卡：</span>
                    <span className="font-medium text-purple-600 dark:text-purple-400">
                      第{item.registration.currentLevel}关
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">已通关关卡：</span>
                    <span className="text-green-600 dark:text-green-400">
                      {Array.isArray(item.registration.completedLevels) ? item.registration.completedLevels.length : 0}关
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">申请时间：</span>
                    <span>{item.registration.createdAt ? new Date(item.registration.createdAt).toLocaleString() : '-'}</span>
                  </div>
                  {item.registration.tradingAccount && (
                    <>
                      <div>
                        <span className="text-gray-500">服务器：</span>
                        <span>{item.registration.serverName}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">交易账号：</span>
                        <span className="font-mono">{item.registration.tradingAccount}</span>
                      </div>
                    </>
                  )}
                  {item.registration.startedAt && (
                    <div>
                      <span className="text-gray-500">开始时间：</span>
                      <span>{new Date(item.registration.startedAt).toLocaleString()}</span>
                    </div>
                  )}
                  {item.registration.status === 'level_passed' && (
                    <div className="col-span-2 bg-purple-50 dark:bg-purple-900/30 p-2 rounded-lg">
                      <span className="text-purple-600 dark:text-purple-400 font-medium">
                        该用户已通过第{item.registration.currentLevel}关，等待开启第{item.registration.currentLevel + 1}关
                      </span>
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  {item.registration.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setSelectedRegistration(item);
                          setApproveDialogOpen(true);
                        }}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        审核通过
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction('reject', item.registration.id)}
                        disabled={actionLoading === item.registration.id}
                      >
                        <X className="w-4 h-4 mr-1" />
                        拒绝
                      </Button>
                    </>
                  )}
                  {item.registration.status === 'approved' && (
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleAction('activate', item.registration.id)}
                      disabled={actionLoading === item.registration.id}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      激活挑战
                    </Button>
                  )}
                  {item.registration.status === 'active' && (
                    <>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction('fail', item.registration.id)}
                        disabled={actionLoading === item.registration.id}
                      >
                        <X className="w-4 h-4 mr-1" />
                        标记失败
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction('reset', item.registration.id)}
                        disabled={actionLoading === item.registration.id}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        重置挑战
                      </Button>
                    </>
                  )}
                  {item.registration.status === 'level_passed' && (
                    <>
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                        onClick={() => handleAction('advanceLevel', item.registration.id)}
                        disabled={actionLoading === item.registration.id}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        开启下一关
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction('rejectLevel', item.registration.id)}
                        disabled={actionLoading === item.registration.id}
                      >
                        <X className="w-4 h-4 mr-1" />
                        驳回
                      </Button>
                    </>
                  )}
                  {(item.registration.status === 'failed' || item.registration.status === 'completed') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction('reset', item.registration.id)}
                      disabled={actionLoading === item.registration.id}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      允许重新报名
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 审核通过对话框 */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>审核通过 - 填写账户信息</DialogTitle>
            <DialogDescription>
              为用户分配交易账户信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="serverName">服务器名称</Label>
              <Input
                id="serverName"
                placeholder="例如: ICMarkets-Demo"
                value={approveForm.serverName}
                onChange={(e) => setApproveForm({ ...approveForm, serverName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tradingAccount">交易账号</Label>
              <Input
                id="tradingAccount"
                placeholder="例如: 12345678"
                value={approveForm.tradingAccount}
                onChange={(e) => setApproveForm({ ...approveForm, tradingAccount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tradingPassword">交易密码</Label>
              <Input
                id="tradingPassword"
                type="password"
                placeholder="交易账户密码"
                value={approveForm.tradingPassword}
                onChange={(e) => setApproveForm({ ...approveForm, tradingPassword: e.target.value })}
              />
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              审核通过后，系统将发送邮件通知用户
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleApprove}
              disabled={submitting || !approveForm.serverName || !approveForm.tradingAccount || !approveForm.tradingPassword}
            >
              {submitting ? '提交中...' : '确认通过'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 配置对话框 */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>挑战赛配置</DialogTitle>
            <DialogDescription>
              设置挑战赛的基本参数和比赛说明
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 比赛说明 */}
            <div className="border rounded-lg p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <span className="text-amber-600">比赛说明</span>
                <Badge variant="outline" className="text-xs">前端页面展示</Badge>
              </h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="descriptionContent">说明内容</Label>
                  <textarea
                    id="descriptionContent"
                    value={descriptionForm}
                    onChange={(e) => setDescriptionForm(e.target.value)}
                    placeholder="输入比赛说明内容，支持换行..."
                    rows={4}
                    className="w-full px-3 py-2 border rounded-md bg-white resize-none"
                  />
                </div>
                <Button onClick={handleUpdateDescription} className="w-full bg-amber-600 hover:bg-amber-700">
                  保存比赛说明
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">基本配置</h4>
            </div>

            <div className="space-y-2">
              <Label htmlFor="registrationFee">报名费（U）</Label>
              <div className="flex gap-2">
                <Input
                  id="registrationFee"
                  type="number"
                  defaultValue={config.registration_fee || '1000'}
                  className="flex-1"
                />
                <Button
                  onClick={(e) => {
                    const value = (e.target as HTMLButtonElement).parentElement?.querySelector('input')?.value;
                    if (value) handleUpdateConfig('registration_fee', value);
                  }}
                >
                  保存
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailNotification">邮件通知</Label>
              <Select
                defaultValue={config.email_notification || 'true'}
                onValueChange={(value) => handleUpdateConfig('email_notification', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">启用</SelectItem>
                  <SelectItem value="false">禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="challengeEnabled">挑战赛开关</Label>
              <Select
                defaultValue={config.challenge_enabled || 'true'}
                onValueChange={(value) => handleUpdateConfig('challenge_enabled', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">启用</SelectItem>
                  <SelectItem value="false">禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="showLeaderboard">挑战进度榜</Label>
              <Select
                defaultValue={config.show_leaderboard || 'true'}
                onValueChange={(value) => handleUpdateConfig('show_leaderboard', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">显示</SelectItem>
                  <SelectItem value="false">隐藏</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="completionReward">通关奖励（人民币）</Label>
              <div className="flex gap-2">
                <Input
                  id="completionReward"
                  type="number"
                  defaultValue={config.completion_reward || '100000'}
                  className="flex-1"
                />
                <Button
                  onClick={(e) => {
                    const value = (e.target as HTMLButtonElement).parentElement?.querySelector('input')?.value;
                    if (value) handleUpdateConfig('completion_reward', value);
                  }}
                >
                  保存
                </Button>
              </div>
              <p className="text-xs text-gray-500">通关后发放的奖励人民币金额</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 关卡配置对话框（独立窗口） */}
      <Dialog open={levelConfigsDialogOpen} onOpenChange={(open) => {
        setLevelConfigsDialogOpen(open);
        if (open) {
          // 打开时初始化编辑状态
          const initial: Record<number, { initialBalance: number; targetBalance: number; failBalance: number }> = {};
          levelConfigs.forEach(level => {
            initial[level.level] = {
              initialBalance: typeof level.initialBalance === 'number' ? level.initialBalance : parseFloat(String(level.initialBalance)) || 1000,
              targetBalance: typeof level.targetBalance === 'number' ? level.targetBalance : parseFloat(String(level.targetBalance)) || 2000,
              failBalance: typeof level.failBalance === 'number' ? level.failBalance : parseFloat(String(level.failBalance)) || 100,
            };
          });
          setEditingLevels(initial);
        }
      }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>关卡配置</DialogTitle>
            <DialogDescription>
              设置每一关的账户初始净值、通关目标净值和失败底线，每一关的值可以不同
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {/* 表头 */}
            <div className="grid grid-cols-12 gap-3 px-3 py-2 bg-gray-100 rounded-lg font-medium text-sm">
              <div className="col-span-1">关卡</div>
              <div className="col-span-2">名称</div>
              <div className="col-span-2 text-green-600">初始净值</div>
              <div className="col-span-2 text-amber-600">目标净值</div>
              <div className="col-span-2 text-red-500">失败底线</div>
              <div className="col-span-2">奖励描述</div>
              <div className="col-span-1">操作</div>
            </div>
            
            {/* 关卡列表 */}
            {levelConfigs.map((level) => (
              <div 
                key={level.id} 
                className="grid grid-cols-12 gap-3 items-center p-3 bg-white rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="col-span-1">
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    第{level.level}关
                  </Badge>
                </div>
                <div className="col-span-2 font-medium">{level.name}</div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    value={editingLevels[level.level]?.initialBalance ?? (typeof level.initialBalance === 'number' ? level.initialBalance : parseFloat(String(level.initialBalance)) || 1000)}
                    onChange={(e) => setEditingLevels(prev => ({
                      ...prev,
                      [level.level]: {
                        ...prev[level.level],
                        initialBalance: parseFloat(e.target.value) || 0,
                      }
                    }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    value={editingLevels[level.level]?.targetBalance ?? (typeof level.targetBalance === 'number' ? level.targetBalance : parseFloat(String(level.targetBalance)) || 2000)}
                    onChange={(e) => setEditingLevels(prev => ({
                      ...prev,
                      [level.level]: {
                        ...prev[level.level],
                        targetBalance: parseFloat(e.target.value) || 0,
                      }
                    }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    value={editingLevels[level.level]?.failBalance ?? (typeof level.failBalance === 'number' ? level.failBalance : parseFloat(String(level.failBalance)) || 100)}
                    onChange={(e) => setEditingLevels(prev => ({
                      ...prev,
                      [level.level]: {
                        ...prev[level.level],
                        failBalance: parseFloat(e.target.value) || 0,
                      }
                    }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="col-span-2 text-sm text-gray-600 truncate" title={level.reward || ''}>
                  {level.reward || '-'}
                </div>
                <div className="col-span-1">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-8"
                    onClick={() => {
                      const values = editingLevels[level.level];
                      if (values) {
                        handleSaveLevelQuick(level.level, values.initialBalance, values.targetBalance, values.failBalance);
                      }
                    }}
                  >
                    保存
                  </Button>
                </div>
              </div>
            ))}
            
            {/* 提示信息 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <p className="font-medium mb-1">配置说明：</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li><strong>初始净值：</strong>挑战开始时的账户净值</li>
                <li><strong>目标净值：</strong>达到此净值视为通关</li>
                <li><strong>失败底线：</strong>净值低于此值判定挑战失败</li>
              </ul>
            </div>
            
            {/* 批量操作提示 */}
            <div className="text-xs text-gray-500 text-center">
              点击每行右侧的"保存"按钮可快速保存该关卡的配置
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLevelConfigsDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 关卡编辑对话框 */}
      <Dialog open={levelDialogOpen} onOpenChange={setLevelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑第{editingLevel?.level}关配置</DialogTitle>
            <DialogDescription>
              设置该关卡的净值参数
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="levelName">关卡名称</Label>
              <Input
                id="levelName"
                value={levelForm.name}
                onChange={(e) => setLevelForm({ ...levelForm, name: e.target.value })}
                placeholder="例如: 启念"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="levelDesc">关卡描述</Label>
              <textarea
                id="levelDesc"
                value={levelForm.description}
                onChange={(e) => setLevelForm({ ...levelForm, description: e.target.value })}
                placeholder="描述该关卡的内容"
                rows={2}
                className="w-full px-3 py-2 border rounded-md bg-white resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="initialBalance" className="text-green-600">初始净值</Label>
                <Input
                  id="initialBalance"
                  type="number"
                  value={levelForm.initialBalance}
                  onChange={(e) => setLevelForm({ ...levelForm, initialBalance: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-gray-500">挑战开始时的账户净值</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetBalance" className="text-amber-600">目标净值</Label>
                <Input
                  id="targetBalance"
                  type="number"
                  value={levelForm.targetBalance}
                  onChange={(e) => setLevelForm({ ...levelForm, targetBalance: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-gray-500">达到此净值视为通关</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="failBalance" className="text-red-500">失败底线</Label>
              <Input
                id="failBalance"
                type="number"
                value={levelForm.failBalance}
                onChange={(e) => setLevelForm({ ...levelForm, failBalance: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-gray-500">净值低于此值判定挑战失败</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reward">通关奖励描述</Label>
              <Input
                id="reward"
                value={levelForm.reward}
                onChange={(e) => setLevelForm({ ...levelForm, reward: e.target.value })}
                placeholder="例如: 继续挑战、通关大奖"
              />
            </div>

            {/* 预览 */}
            <div className="bg-gradient-to-r from-green-50 via-amber-50 to-red-50 p-3 rounded-lg border">
              <p className="text-xs text-gray-500 mb-2">参数预览</p>
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-green-600 font-medium">${levelForm.initialBalance}</span>
                <span className="text-gray-400">→</span>
                <span className="text-amber-600 font-medium">${levelForm.targetBalance}</span>
                <span className="text-gray-400">→</span>
                <span className="text-red-500 font-medium">${levelForm.failBalance}</span>
              </div>
              <p className="text-xs text-center text-gray-500 mt-1">
                盈利目标: <span className="font-medium text-green-600">${levelForm.targetBalance - levelForm.initialBalance}</span>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLevelDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveLevel}>
              保存配置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
