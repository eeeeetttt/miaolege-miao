'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Spinner } from '@/components/ui/spinner';
import { 
  Settings,
  Users,
  AlertCircle,
  RefreshCw,
  Trash2,
  Save,
  Clock,
  MessageSquare,
  CheckCircle2,
  Search,
} from 'lucide-react';

interface ChatHallConfig {
  hourly_limit: { value: string; description: string };
  enabled: { value: string; description: string };
}

interface MuteUser {
  id: number;
  user_id: string;
  user_name: string;
  user_email: string;
  reason: string | null;
  expires_at: string | null;
  created_at: string;
}

export function ChatHallAdmin() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ChatHallConfig | null>(null);
  const [mutes, setMutes] = useState<MuteUser[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 禁言相关状态
  const [muteDialogOpen, setMuteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [muteReason, setMuteReason] = useState('');
  const [muteDuration, setMuteDuration] = useState(''); // 分钟，0表示永久
  const [muteSubmitting, setMuteSubmitting] = useState(false);

  // 搜索用户
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/chat-hall');
      const data = await res.json();
      if (data.success) {
        setConfig({
          hourly_limit: { value: data.config?.cooldown_seconds?.value || '3', description: '每小时发言限制' },
          enabled: { value: data.config?.enabled?.value || 'true', description: '是否开启聊天大厅' },
        });
        setMutes(data.mutes || []);
      } else {
        setError(data.error || '加载失败');
      }
    } catch (err) {
      console.error('Load chat hall data error:', err);
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 保存配置
  const handleSaveConfig = async (key: string, value: string) => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const res = await fetch('/api/admin/chat-hall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_config',
          data: { key, value },
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(`${key === 'hourly_limit' ? '每小时发言限制' : '聊天大厅'}已更新`);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || '保存失败');
      }
    } catch (err) {
      console.error('Save config error:', err);
      setError('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 搜索用户
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      const res = await fetch(`/api/user/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data || []);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  // 禁言用户
  const handleMute = async () => {
    if (!selectedUserId) return;

    try {
      setMuteSubmitting(true);
      const res = await fetch('/api/admin/chat-hall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mute_user',
          data: {
            userId: selectedUserId,
            reason: muteReason,
            durationMinutes: parseInt(muteDuration) || 0,
          },
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(data.message);
        setMuteDialogOpen(false);
        setMuteReason('');
        setMuteDuration('');
        setSelectedUserId('');
        loadData();
      } else {
        setError(data.error || '操作失败');
      }
    } catch (err) {
      console.error('Mute error:', err);
      setError('操作失败');
    } finally {
      setMuteSubmitting(false);
    }
  };

  // 解禁用户
  const handleUnmute = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/chat-hall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unmute_user',
          data: { userId },
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess('已解除禁言');
        loadData();
      } else {
        setError(data.error || '操作失败');
      }
    } catch (err) {
      console.error('Unmute error:', err);
      setError('操作失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600 dark:text-green-400">{success}</AlertDescription>
        </Alert>
      )}

      {/* 聊天大厅配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            聊天大厅配置
          </CardTitle>
          <CardDescription>管理聊天大厅的基本设置</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 是否开启 */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <div className="flex items-center gap-2">
                <Label className="font-medium">开启聊天大厅</Label>
              </div>
              <p className="text-sm text-gray-500">关闭后用户将无法发送消息</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={config?.enabled?.value === 'true' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSaveConfig('enabled', config?.enabled?.value === 'true' ? 'false' : 'true')}
                disabled={saving}
                className={config?.enabled?.value === 'true' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {config?.enabled?.value === 'true' ? '已开启' : '已关闭'}
              </Button>
            </div>
          </div>

          {/* 每小时发言限制 */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <div className="flex items-center gap-2">
                <Label className="font-medium">每小时发言限制</Label>
              </div>
              <p className="text-sm text-gray-500">每位用户每小时可发言的次数</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={config?.hourly_limit?.value || '3'}
                onChange={(e) => setConfig({
                  ...config!,
                  hourly_limit: { ...config!.hourly_limit, value: e.target.value }
                })}
                className="w-24"
                min={1}
                max={100}
              />
              <span className="text-gray-500 text-sm">条/小时</span>
              <Button
                size="sm"
                onClick={() => handleSaveConfig('hourly_limit', config?.hourly_limit?.value || '3')}
                disabled={saving}
              >
                <Save className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="text-sm text-gray-500 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <p>💡 提示：发言次数每小时自动重置。</p>
          </div>
        </CardContent>
      </Card>

      {/* 禁言管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            禁言管理
          </CardTitle>
          <CardDescription>管理聊天大厅用户的发言权限</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 搜索并禁言 */}
          <div className="flex gap-2">
            <Input
              placeholder="搜索用户名或邮箱..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? <Spinner className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          {/* 搜索结果 */}
          {searchResults.length > 0 && (
            <div className="border rounded-lg divide-y">
              {searchResults.map((user) => {
                const isMuted = mutes.some(m => m.user_id === user.userId && (!m.expires_at || new Date(m.expires_at) > new Date()));
                return (
                  <div key={user.userId} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                        <span className="text-amber-700 dark:text-amber-300 font-bold">{user.name?.slice(0, 1) || '?'}</span>
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    {isMuted ? (
                      <Badge variant="outline" className="text-red-500 border-red-200">已禁言</Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUserId(user.userId);
                          setMuteDialogOpen(true);
                        }}
                      >
                        <AlertCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 当前禁言列表 */}
          {mutes.length > 0 ? (
            <div className="border rounded-lg divide-y">
              {mutes.map((mute) => {
                const isActive = !mute.expires_at || new Date(mute.expires_at) > new Date();
                if (!isActive) return null;
                
                return (
                  <div key={mute.id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                        <span className="text-red-700 dark:text-red-300 font-bold">{mute.user_name?.slice(0, 1) || '?'}</span>
                      </div>
                      <div>
                        <p className="font-medium">{mute.user_name}</p>
                        <p className="text-xs text-gray-500">
                          {mute.reason && `原因: ${mute.reason} · `}
                          {mute.expires_at ? (
                            <>有效期至: {new Date(mute.expires_at).toLocaleString()}</>
                          ) : (
                            <span className="text-red-500">永久禁言</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnmute(mute.user_id)}
                      className="text-green-600 border-green-200 hover:bg-green-50"
                    >
                      解禁
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无禁言记录</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 禁言对话框 */}
      <Dialog open={muteDialogOpen} onOpenChange={setMuteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>禁言用户</DialogTitle>
            <DialogDescription>
              设置用户的禁言时间和原因
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>禁言时长（分钟）</Label>
              <Input
                type="number"
                placeholder="0表示永久禁言"
                value={muteDuration}
                onChange={(e) => setMuteDuration(e.target.value)}
                min={0}
              />
              <p className="text-xs text-gray-500">输入0表示永久禁言</p>
            </div>
            <div className="space-y-2">
              <Label>禁言原因（可选）</Label>
              <Input
                placeholder="请输入禁言原因..."
                value={muteReason}
                onChange={(e) => setMuteReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMuteDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleMute} disabled={muteSubmitting}>
              {muteSubmitting ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  提交中...
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  确认禁言
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
