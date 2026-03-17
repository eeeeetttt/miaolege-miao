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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchProducts();
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

  const handlePurchase = async (productId: number, price: number) => {
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
        setSuccess(`购买成功！已扣除 ${price} 星球币`);
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

        {/* 跟单EA免费下载区 */}
        <Card className="mb-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/20 rounded-lg">
                  <FileCode className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">MLGM跟单接收端EA</h3>
                  <p className="text-blue-100 text-sm mb-2">
                    自动跟单交易助手，支持MT5平台，实时同步信号源交易
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-white/20 text-white">MT5</Badge>
                    <Badge className="bg-white/20 text-white">v1.0</Badge>
                    <Badge className="bg-green-400 text-green-900">免费</Badge>
                  </div>
                </div>
              </div>
              <Button 
                size="lg"
                className="bg-white text-purple-600 hover:bg-gray-100"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = '/跟单接收端EA.mq5';
                  link.download = '跟单接收端EA.mq5';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                免费下载
              </Button>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/20">
              <h4 className="font-medium mb-2">功能特性：</h4>
              <ul className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-blue-100">
                <li className="flex items-center gap-2">
                  <Check className="w-3 h-3" /> 自动验证跟单权限
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3 h-3" /> 实时信号轮询
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3 h-3" /> 自动开仓/平仓
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3 h-3" /> 止损止盈同步
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* EA使用说明 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">使用说明</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p><strong>1. 绑定MT账户：</strong>在「个人中心」绑定您的MT5账户号码</p>
            <p><strong>2. 加入星球：</strong>加入一个信号星球并开始跟单</p>
            <p><strong>3. 下载EA：</strong>将下载的 .mq5 文件放入 MT5 的 Experts 文件夹</p>
            <p><strong>4. 配置参数：</strong>在MT5中加载EA，设置服务器地址和跟单手数</p>
            <p><strong>5. 启动EA：</strong>开启自动交易，EA将自动同步信号源的交易</p>
          </CardContent>
        </Card>

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
                      <span className="text-sm text-gray-500">星球币</span>
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
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
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
