'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
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
import { 
  QrCode,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Image as ImageIcon,
  Settings,
  Upload,
} from 'lucide-react';

interface RechargeRecord {
  id: number;
  user_id: string;
  amount: number;
  cny_amount: number;
  exchange_rate: number;
  status: string;
  screenshot_url: string;
  admin_note: string;
  created_at: string;
  processed_at: string | null;
  user: {
    userId: string;
    name: string | null;
    email: string | null;
  } | null;
}

interface WechatPayConfig {
  qrcodeUrl: string;
  exchangeRate: string;
  enabled: boolean;
}

export default function WechatRechargeAdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [records, setRecords] = useState<RechargeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [config, setConfig] = useState<WechatPayConfig | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<RechargeRecord | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [newExchangeRate, setNewExchangeRate] = useState('');
  const [newEnabled, setNewEnabled] = useState(true);
  const qrcodeInputRef = useRef<HTMLInputElement>(null);
  const [qrcodePreview, setQrcodePreview] = useState<string | null>(null);
  const [uploadingQrcode, setUploadingQrcode] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user || session.user.role !== 'admin') {
      router.push('/login');
      return;
    }

    fetchRecords();
    fetchConfig();
  }, [status]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/wechat-recharge?status=${statusFilter}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.data || []);
      }
    } catch (error) {
      console.error('获取记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/wechat-pay-config');
      const data = await res.json();
      if (data.success) {
        setConfig(data.data);
        setNewExchangeRate(data.data.exchangeRate);
        setNewEnabled(data.data.enabled);
        setQrcodePreview(data.data.qrcodeUrl);
      }
    } catch (error) {
      console.error('获取配置失败:', error);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [statusFilter]);

  const handleApprove = async (recordId: number) => {
    if (!confirm('确定要通过该充值申请吗？')) return;
    
    setActionLoading(recordId);
    try {
      const res = await fetch('/api/admin/wechat-recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', applicationId: recordId }),
      });
      const data = await res.json();
      if (data.success) {
        alert('审核通过！');
        fetchRecords();
      } else {
        alert(data.error || '操作失败');
      }
    } catch (error) {
      alert('操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRecord) return;
    
    setActionLoading(selectedRecord.id);
    try {
      const res = await fetch('/api/admin/wechat-recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'reject', 
          applicationId: selectedRecord.id,
          adminNote: rejectNote 
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('已拒绝该申请');
        setRejectDialogOpen(false);
        setRejectNote('');
        setSelectedRecord(null);
        fetchRecords();
      } else {
        alert(data.error || '操作失败');
      }
    } catch (error) {
      alert('操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleQrcodeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过5MB');
      return;
    }
    
    // 预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setQrcodePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    // 上传
    setUploadingQrcode(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'uploadQrcode');
      
      const res = await fetch('/api/admin/wechat-pay-config', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        alert('收款码上传成功');
        fetchConfig();
      } else {
        alert(data.error || '上传失败');
      }
    } catch (error) {
      alert('上传失败');
    } finally {
      setUploadingQrcode(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      const formData = new FormData();
      formData.append('action', 'updateConfig');
      formData.append('config', JSON.stringify({
        exchangeRate: newExchangeRate,
        enabled: newEnabled,
      }));
      
      const res = await fetch('/api/admin/wechat-pay-config', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        alert('配置保存成功');
        setConfigDialogOpen(false);
        fetchConfig();
      } else {
        alert(data.error || '保存失败');
      }
    } catch (error) {
      alert('保存失败');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500">待审核</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">已通过</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">已拒绝</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">微信充值管理</h1>
          <p className="text-gray-500">审核用户微信充值申请</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setConfigDialogOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />
            支付配置
          </Button>
          <Button variant="outline" onClick={fetchRecords}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">待审核</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {records.filter(r => r.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">已通过</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {records.filter(r => r.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">已拒绝</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {records.filter(r => r.status === 'rejected').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选 */}
      <div className="mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="pending">待审核</SelectItem>
            <SelectItem value="completed">已通过</SelectItem>
            <SelectItem value="rejected">已拒绝</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="w-8 h-8" />
        </div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            暂无充值申请
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {records.map(record => (
            <Card key={record.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <QrCode className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg">{record.amount} U</span>
                        <span className="text-gray-400">≈</span>
                        <span className="font-bold text-red-600">¥{record.cny_amount}</span>
                        <span className="text-xs text-gray-400">汇率: {record.exchange_rate}</span>
                      </div>
                      <p className="text-sm text-gray-500">
                        用户: {record.user?.name || record.user_id.substring(0, 8)} 
                        {record.user?.email && ` (${record.user.email})`}
                      </p>
                      <p className="text-xs text-gray-400">
                        申请时间: {new Date(record.created_at).toLocaleString()}
                      </p>
                      {record.admin_note && (
                        <p className="text-xs text-gray-500 mt-1">
                          备注: {record.admin_note}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(record.status)}
                  </div>
                </div>

                {/* 截图 */}
                {record.screenshot_url && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm font-medium mb-2">付款截图</p>
                    <div className="flex gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={record.screenshot_url} 
                        alt="付款截图" 
                        className="max-h-48 rounded border cursor-pointer hover:opacity-80"
                        onClick={() => window.open(record.screenshot_url, '_blank')}
                      />
                    </div>
                  </div>
                )}

                {/* 操作按钮 */}
                {record.status === 'pending' && (
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(record.id)}
                      disabled={actionLoading === record.id}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      通过
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedRecord(record);
                        setRejectDialogOpen(true);
                      }}
                      disabled={actionLoading === record.id}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      拒绝
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 拒绝对话框 */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>拒绝充值申请</DialogTitle>
            <DialogDescription>
              请填写拒绝原因（可选）
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectNote">拒绝原因</Label>
              <Input
                id="rejectNote"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="可选填写"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              取消
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading !== null}
            >
              {actionLoading !== null ? '处理中...' : '确认拒绝'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 配置对话框 */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>微信支付配置</DialogTitle>
            <DialogDescription>
              设置收款二维码和汇率
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 收款码 */}
            <div className="space-y-2">
              <Label>收款二维码</Label>
              <input
                type="file"
                ref={qrcodeInputRef}
                onChange={handleQrcodeUpload}
                accept="image/*"
                className="hidden"
              />
              <div 
                onClick={() => qrcodeInputRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-green-400 transition-colors"
              >
                {qrcodePreview ? (
                  <div className="space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={qrcodePreview} 
                      alt="收款码" 
                      className="max-h-32 mx-auto rounded"
                    />
                    <p className="text-xs text-green-600">点击重新上传</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-gray-400" />
                    <p className="text-sm text-gray-500">点击上传收款二维码</p>
                  </div>
                )}
              </div>
              {uploadingQrcode && (
                <div className="flex items-center justify-center gap-2">
                  <Spinner className="w-4 h-4" />
                  <span className="text-sm text-gray-500">上传中...</span>
                </div>
              )}
            </div>

            {/* 汇率 */}
            <div className="space-y-2">
              <Label htmlFor="exchangeRate">汇率（1 U = ? 元）</Label>
              <Input
                id="exchangeRate"
                type="number"
                step="0.1"
                min="1"
                value={newExchangeRate}
                onChange={(e) => setNewExchangeRate(e.target.value)}
              />
            </div>

            {/* 启用 */}
            <div className="space-y-2">
              <Label htmlFor="enabled">启用状态</Label>
              <Select value={newEnabled ? 'true' : 'false'} onValueChange={(v) => setNewEnabled(v === 'true')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">启用</SelectItem>
                  <SelectItem value="false">禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              关闭
            </Button>
            <Button onClick={handleSaveConfig}>
              保存配置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
