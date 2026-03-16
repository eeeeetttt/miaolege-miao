'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Download,
  ShoppingCart,
  Check,
  Clock,
  TrendingUp,
  Zap,
  Shield,
  Star,
  Coins,
  FileCode,
  Lock,
  AlertTriangle,
} from 'lucide-react';

interface EaProduct {
  id: number;
  name: string;
  description: string | null;
  price: number;
  version: string | null;
  platform: string | null;
  category: string | null;
  features: string | null;
  downloadUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  imageUrl: string | null;
  status: string | null;
  salesCount: number | null;
  createdAt: Date | null;
  purchased?: boolean;
}

export default function DownloadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<EaProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [coinBalance, setCoinBalance] = useState(0);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchProducts();
      fetchUserBalance();
    }
  }, [status]);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/ea/list');
      const data = await res.json();
      if (res.ok) {
        setProducts(data.products || []);
      } else {
        setError(data.error || '获取产品列表失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBalance = async () => {
    try {
      const res = await fetch('/api/user/info');
      const data = await res.json();
      if (res.ok) {
        setCoinBalance(data.coinBalance || 0);
      }
    } catch (err) {
      console.error('获取余额失败');
    }
  };

  const handlePurchase = async (productId: number, price: number) => {
    if (coinBalance < price) {
      setError('金币余额不足，请先充值');
      return;
    }

    setPurchasing(productId);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/ea/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(`购买成功！已扣除 ${price} 金币`);
        setCoinBalance(prev => prev - price);
        // 更新产品列表
        setProducts(prev => 
          prev.map(p => p.id === productId ? { ...p, purchased: true } : p)
        );
      } else {
        setError(data.error || '购买失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setPurchasing(null);
    }
  };

  const handleDownload = async (product: EaProduct) => {
    if (!product.purchased) {
      setError('请先购买此产品');
      return;
    }

    setDownloading(product.id);
    setError('');

    try {
      const res = await fetch(`/api/ea/download?productId=${product.id}`);
      
      if (res.ok) {
        const data = await res.json();
        if (data.downloadUrl) {
          // 使用 fetch + blob 下载
          const response = await fetch(data.downloadUrl);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = product.fileName || `${product.name}.ex5`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }
      } else {
        const data = await res.json();
        setError(data.error || '下载失败');
      }
    } catch (err) {
      setError('下载失败，请稍后重试');
    } finally {
      setDownloading(null);
    }
  };

  const getCategoryIcon = (category: string | null) => {
    switch (category) {
      case '趋势':
        return <TrendingUp className="w-4 h-4" />;
      case '震荡':
        return <Zap className="w-4 h-4" />;
      case '马丁':
        return <Shield className="w-4 h-4" />;
      default:
        return <Star className="w-4 h-4" />;
    }
  };

  const getPlatformBadge = (platform: string | null) => {
    if (!platform) return null;
    
    if (platform === 'Both') {
      return (
        <>
          <Badge variant="outline" className="text-xs">MT4</Badge>
          <Badge variant="outline" className="text-xs">MT5</Badge>
        </>
      );
    }
    
    return <Badge variant="outline" className="text-xs">{platform}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Spinner className="w-8 h-8" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">软件下载</h1>
          <p className="text-gray-600 dark:text-gray-400">
            精选EA交易程序，助力您的自动化交易
          </p>
        </div>

        {/* 用户余额 */}
        <Card className="mb-6 bg-gradient-to-r from-purple-500 to-blue-500 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Coins className="w-8 h-8" />
                <div>
                  <p className="text-purple-100 text-sm">我的金币</p>
                  <p className="text-3xl font-bold">{coinBalance}</p>
                </div>
              </div>
              <Button 
                variant="secondary" 
                onClick={() => router.push('/user')}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                充值
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 提示信息 */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-6 border-green-500 text-green-700 dark:text-green-400">
            <Check className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* 产品列表 */}
        {products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <FileCode className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>暂无可下载的软件</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(product.category)}
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                    </div>
                    {product.purchased && (
                      <Badge className="bg-green-500">
                        <Check className="w-3 h-3 mr-1" /> 已购买
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {getPlatformBadge(product.platform)}
                    <Badge variant="secondary" className="text-xs">
                      v{product.version || '1.0.0'}
                    </Badge>
                    {product.salesCount !== null && product.salesCount > 0 && (
                      <span className="text-xs text-gray-500">
                        {product.salesCount} 人已购
                      </span>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1">
                  <CardDescription className="mb-4 line-clamp-3">
                    {product.description || '暂无描述'}
                  </CardDescription>
                  
                  {product.features && (
                    <div className="space-y-1">
                      {JSON.parse(product.features).slice(0, 3).map((feature: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {product.fileSize && (
                    <p className="text-xs text-gray-500 mt-3">
                      文件大小: {(product.fileSize / 1024).toFixed(1)} MB
                    </p>
                  )}
                </CardContent>

                <CardFooter className="pt-4 border-t">
                  <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Coins className="w-4 h-4 text-yellow-500" />
                      <span className="text-xl font-bold">{product.price}</span>
                      <span className="text-sm text-gray-500">金币</span>
                    </div>
                    
                    {product.purchased ? (
                      <Button
                        onClick={() => handleDownload(product)}
                        disabled={downloading === product.id}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      >
                        {downloading === product.id ? (
                          <Spinner className="w-4 h-4" />
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            下载
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handlePurchase(product.id, product.price)}
                        disabled={purchasing === product.id}
                        variant={coinBalance >= product.price ? 'default' : 'secondary'}
                        className={coinBalance >= product.price ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700' : ''}
                      >
                        {purchasing === product.id ? (
                          <Spinner className="w-4 h-4" />
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            购买
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* 说明 */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">购买说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 mt-0.5 text-purple-500" />
              <p>购买后可永久下载使用，不限次数</p>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 mt-0.5 text-blue-500" />
              <p>如有更新，已购买用户可免费获取最新版本</p>
            </div>
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 mt-0.5 text-green-500" />
              <p>所有EA均经过测试验证，请放心使用</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
