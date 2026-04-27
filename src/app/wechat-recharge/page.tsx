'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { ImageUploader } from '@/components/image-uploader';
import { 
  Coins, 
  CheckCircle2,
  XCircle,
  AlertCircle,
  QrCode,
  Upload,
  Clock,
  ArrowLeft,
} from 'lucide-react';

interface WechatPayConfig {
  qrcodeUrl: string;
  exchangeRate: number;
  enabled: boolean;
}

interface RechargeRecord {
  id: number;
  amount: number;
  cny_amount: number;
  exchange_rate: number;
  status: string;
  screenshot_url: string;
  created_at: string;
  processed_at: string | null;
}

const RECHARGE_OPTIONS = [
  { amount: 100 },
  { amount: 200 },
  { amount: 500 },
  { amount: 1000 },
  { amount: 2000 },
];

export default function WechatRechargePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [config, setConfig] = useState<WechatPayConfig | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [cnyAmount, setCnyAmount] = useState(0);
  const [exchangeRate, setExchangeRate] = useState(7);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [records, setRecords] = useState<RechargeRecord[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchConfig();
      fetchRecords();
    }
  }, [status]);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/wechat-pay/config');
      const data = await res.json();
      if (data.success) {
        setConfig(data.data);
        setExchangeRate(data.data.exchangeRate);
      }
    } catch (err) {
      console.error('获取配置失败:', err);
    }
  };

  const fetchRecords = async () => {
    try {
      const res = await fetch('/api/wechat-pay/apply');
      const data = await res.json();
      if (data.success) {
        setRecords(data.data || []);
      }
    } catch (err) {
      console.error('获取记录失败:', err);
    }
  };

  const handleAmountSelect = async (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
    setError('');
    setSuccess('');
    setScreenshot(null);
    setScreenshotPreview(null);
    setApplicationId(null);

    // 计算人民币金额
    const cny = Math.ceil(amount * exchangeRate);
    setCnyAmount(cny);
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
    setError('');
    setSuccess('');
    setScreenshot(null);
    setScreenshotPreview(null);
    setApplicationId(null);

    const amount = parseInt(value);
    if (amount > 0) {
      setCnyAmount(Math.ceil(amount * exchangeRate));
    } else {
      setCnyAmount(0);
    }
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // 从事件中获取文件
    let file: File | undefined;
    
    if (e.target.files?.[0]) {
      file = e.target.files[0];
    } else if (screenshotInputRef.current?.files?.[0]) {
      // 备用方式从ref获取
      file = screenshotInputRef.current.files[0];
    }
    
    if (!file) {
      console.error('未选择文件');
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      setError('请上传图片文件');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过5MB');
      return;
    }
    
    setLoading(true);
    try {
      // 使用FileReader读取文件为base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      // 显示预览
      setScreenshotPreview(base64);
      
      // 上传截图
      const res = await fetch('/api/upload/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });
      const data = await res.json();
      
      if (data.success && data.url) {
        setScreenshot(data.url);
        setError('');
      } else {
        setError(data.error || '截图上传失败');
        setScreenshotPreview(null);
        setScreenshot(null);
      }
    } catch (err) {
      console.error('截图上传失败:', err);
      setError('截图上传失败，请重试');
      setScreenshotPreview(null);
      setScreenshot(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    const amount = selectedAmount || parseInt(customAmount);
    if (!amount || amount <= 0) {
      setError('请选择或输入有效充值金额');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/wechat-pay/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      
      if (data.success) {
        setApplicationId(data.applicationId);
        setCnyAmount(data.cnyAmount);
        setExchangeRate(data.exchangeRate);
        setSuccess('订单已创建，请扫码支付后上传截图');
      } else {
        setError(data.error || '创建订单失败');
      }
    } catch (err) {
      setError('创建订单失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPayment = async () => {
    const amount = selectedAmount || parseInt(customAmount);
    if (!amount || amount <= 0) {
      setError('请选择或输入有效充值金额');
      return;
    }

    if (!screenshot) {
      setError('请上传付款截图');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      // 先创建订单
      const orderRes = await fetch('/api/wechat-pay/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      const orderData = await orderRes.json();
      
      if (!orderData.success) {
        setError(orderData.error || orderData.details || '创建订单失败');
        setSubmitting(false);
        return;
      }

      const newApplicationId = orderData.applicationId;

      // 上传截图
      if (screenshot && !screenshot.startsWith('http')) {
        const formData = new FormData();
        const res = await fetch(screenshot);
        const blob = await res.blob();
        const file = new File([blob], 'screenshot.png', { type: 'image/png' });
        formData.append('file', file);
        formData.append('applicationId', String(newApplicationId));
        
        const uploadRes = await fetch('/api/wechat-pay/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadData.success) {
          console.error('截图上传失败:', uploadData.error);
        }
      }

      setSuccess('付款确认已提交，请等待后台审核，审核通过后 U 将自动到账');
      setSelectedAmount(null);
      setCustomAmount('');
      setScreenshot(null);
      setScreenshotPreview(null);
      setApplicationId(null);
      setCnyAmount(0);
      fetchRecords();
    } catch (err) {
      console.error('确认付款失败:', err);
      setError('确认付款失败，请重试');
    } finally {
      setSubmitting(false);
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

  if (status === 'loading' || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!config.enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">微信充值已关闭</h2>
            <p className="text-gray-500">请使用其他充值方式</p>
            <Button className="mt-4" onClick={() => router.push('/user')}>
              返回个人中心
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => router.push('/user')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <QrCode className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">微信充值</h1>
              <p className="text-sm text-gray-500">汇率：1 U = {exchangeRate} 元</p>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-green-600" />
              扫码支付
            </CardTitle>
            <CardDescription>
              扫描下方二维码进行支付，支付完成后上传截图
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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

            {/* 金额选择 */}
            <div className="space-y-3">
              <Label>选择充值金额（U）</Label>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {RECHARGE_OPTIONS.map(option => (
                  <button
                    key={option.amount}
                    type="button"
                    onClick={() => handleAmountSelect(option.amount)}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      selectedAmount === option.amount
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                    }`}
                  >
                    <p className="font-bold text-lg">{option.amount}</p>
                    <p className="text-xs text-gray-500">¥{Math.ceil(option.amount * exchangeRate)}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 自定义金额 */}
            <div className="space-y-2">
              <Label>或输入自定义金额</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={customAmount}
                  onChange={e => handleCustomAmountChange(e.target.value)}
                  placeholder="输入U数量"
                  min="1"
                />
                <span className="flex items-center text-gray-500">U</span>
              </div>
            </div>

            {/* 金额显示 */}
            {(selectedAmount || (customAmount && parseInt(customAmount) > 0)) && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">充值金额</span>
                  <span className="text-xl font-bold text-green-600">
                    {(selectedAmount || parseInt(customAmount) || 0)} U
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-600 dark:text-gray-400">应付金额</span>
                  <span className="text-2xl font-bold text-red-600">
                    ¥{cnyAmount}
                  </span>
                </div>
              </div>
            )}

            {/* 二维码 */}
            {config.qrcodeUrl && (selectedAmount || (customAmount && parseInt(customAmount) > 0)) && (
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-4">请扫码支付以上金额</p>
                <div className="inline-block p-4 bg-white rounded-lg border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={config.qrcodeUrl} 
                    alt="微信收款码" 
                    className="w-48 h-48 object-contain"
                  />
                </div>
              </div>
            )}

            {/* 截图上传 - 只要选择了金额就显示 */}
            {(selectedAmount || (customAmount && parseInt(customAmount) > 0)) && (
              <div className="space-y-3">
                <Label>上传付款截图 *</Label>
                <ImageUploader
                  onUpload={(base64) => {
                    setScreenshot(base64);
                    setScreenshotPreview(base64);
                  }}
                  preview={screenshotPreview}
                  disabled={loading}
                />
              </div>
            )}

            {/* 提交按钮 - 简化流程：直接提交 */}
            <Button 
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={submitting || (!selectedAmount && (!customAmount || parseInt(customAmount) <= 0)) || !screenshot}
              onClick={handleConfirmPayment}
            >
              {submitting ? '提交中...' : '确认充值并提交'}
            </Button>
          </CardContent>
        </Card>

        {/* 历史记录 */}
        {records.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                充值记录
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {records.slice(0, 5).map(record => (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <Coins className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{record.amount} U</p>
                        <p className="text-xs text-gray-500">¥{record.cny_amount} · {new Date(record.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {getStatusBadge(record.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
