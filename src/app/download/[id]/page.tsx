'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bot, BarChart3, FileCode, Package, 
  ArrowLeft, Download, ShoppingCart, 
  CheckCircle2, Star, Users, Clock,
  Shield, Zap, Settings, BarChart
} from 'lucide-react';

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  version: string | null;
  platform: string | null;
  category: string | null;
  productType: string;
  features: string | null;
  imageUrl: string | null;
  downloadUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  salesCount: number | null;
  createdAt: string;
}

const PRODUCT_TYPE_CONFIG = {
  ea: { label: 'EA智能交易', icon: Bot, color: 'from-purple-500 to-blue-500' },
  indicator: { label: '技术指标', icon: BarChart3, color: 'from-blue-500 to-cyan-500' },
  script: { label: '脚本工具', icon: FileCode, color: 'from-amber-500 to-orange-500' },
  tool: { label: '交易工具', icon: Package, color: 'from-green-500 to-emerald-500' },
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchased, setPurchased] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const productId = params.id as string;

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const res = await fetch('/api/ea/products');
      const data = await res.json();
      const found = data.products?.find((p: Product) => p.id === parseInt(productId));
      if (found) {
        setProduct(found);
        // 检查是否已购买
        if (session) {
          checkPurchase(found.id);
        }
      } else {
        setError('产品不存在');
      }
    } catch (err) {
      console.error('获取产品失败:', err);
      setError('获取产品失败');
    } finally {
      setLoading(false);
    }
  };

  const checkPurchase = async (id: number) => {
    try {
      const res = await fetch(`/api/ea/purchase/check?productId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setPurchased(data.purchased || false);
      }
    } catch (err) {
      console.error('检查购买状态失败:', err);
    }
  };

  const handlePurchase = async () => {
    if (!session) {
      router.push('/login');
      return;
    }

    if (product?.price === 0) {
      handleDownload();
      return;
    }

    setPurchasing(true);
    try {
      const res = await fetch('/api/ea/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product?.id }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setPurchased(true);
        alert(`购买成功！已消耗 ${data.price} 星球币`);
        handleDownload();
      } else {
        alert(data.error || '购买失败');
      }
    } catch (err) {
      alert('网络错误，请稍后重试');
    } finally {
      setPurchasing(false);
    }
  };

  const handleDownload = async () => {
    if (!session) {
      router.push('/login');
      return;
    }

    setDownloading(true);
    try {
      const res = await fetch(`/api/ea/download?productId=${product?.id}`);
      const data = await res.json();
      
      if (data.downloadUrl) {
        const fileName = data.fileName || 'download';
        const downloadLink = `/api/ea/file-download?key=${encodeURIComponent(data.downloadUrl)}&fileName=${encodeURIComponent(fileName)}`;
        window.open(downloadLink, '_blank');
      } else {
        alert(data.error || '下载失败');
      }
    } catch (err) {
      alert('下载失败，请稍后重试');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-red-500 mb-4">{error || '产品不存在'}</p>
            <Button onClick={() => router.push('/download')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回列表
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const config = PRODUCT_TYPE_CONFIG[product.productType as keyof typeof PRODUCT_TYPE_CONFIG] || PRODUCT_TYPE_CONFIG.ea;
  const IconComponent = config.icon;
  const features = typeof product.features === 'string' ? JSON.parse(product.features) : (product.features || []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => router.push('/download')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回列表
        </Button>

        {/* Main Card */}
        <Card className="overflow-hidden">
          {/* Header Banner */}
          <div className={`bg-gradient-to-r ${config.color} p-8 text-white`}>
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center shadow-xl">
                <IconComponent className="w-12 h-12 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Badge className="bg-white/20 text-white">{config.label}</Badge>
                  <Badge className="bg-white/20 text-white">{product.platform}</Badge>
                  {product.category && (
                    <Badge className="bg-white/20 text-white">{product.category}</Badge>
                  )}
                </div>
                <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
                <div className="flex items-center gap-4 text-white/80 text-sm">
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    v{product.version || '1.0'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {product.salesCount || 0} 次下载
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {new Date(product.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <CardContent className="p-6">
            <Tabs defaultValue="details" className="space-y-6">
              <TabsList>
                <TabsTrigger value="details">产品详情</TabsTrigger>
                <TabsTrigger value="features">功能特点</TabsTrigger>
                <TabsTrigger value="instructions">使用说明</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-6">
                {/* Product Images */}
                {product.imageUrl && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">产品截图</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <img 
                        src={product.imageUrl} 
                        alt={product.name}
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">产品描述</h3>
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                      {product.description || '暂无描述'}
                    </p>
                  </div>
                </div>

                {/* File Info */}
                {product.fileName && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                    <h3 className="font-semibold">文件信息</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">文件名：</span>
                        <span className="font-medium">{product.fileName}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">文件大小：</span>
                        <span className="font-medium">
                          {product.fileSize ? `${product.fileSize} KB` : '未知'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="features" className="space-y-4">
                <h3 className="text-lg font-semibold">功能特点</h3>
                {features.length > 0 ? (
                  <div className="grid gap-4">
                    {features.map((feature: string, index: number) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">暂无功能特点</p>
                )}
              </TabsContent>

              <TabsContent value="instructions" className="space-y-4">
                <h3 className="text-lg font-semibold">使用说明</h3>
                <div className="space-y-4 text-gray-600 dark:text-gray-300">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                      <Shield className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-1">安全提示</h4>
                        <p className="text-sm">请从正规渠道下载EA软件，不要轻易相信来路不明的程序。</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-start gap-3">
                      <Zap className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-green-700 dark:text-green-400 mb-1">快速开始</h4>
                        <p className="text-sm">下载后解压文件，按照产品说明加载到MT4/MT5平台即可使用。</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-start gap-3">
                      <Settings className="w-6 h-6 text-purple-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-purple-700 dark:text-purple-400 mb-1">参数设置</h4>
                        <p className="text-sm">EA参数可根据个人交易风格进行调整，建议先在模拟账户测试。</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-3">
                      <BarChart className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-1">风险提示</h4>
                        <p className="text-sm">EA交易存在风险，请合理控制仓位，建议配合手动交易使用。</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Bottom Action Bar */}
        <Card className="mt-6 sticky bottom-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {product.price === 0 ? '免费' : `${product.price} 星球币`}
                </p>
                {product.price !== 0 && (
                  <p className="text-sm text-gray-500">永久授权</p>
                )}
              </div>
              <div className="flex gap-3">
                {purchased || product.price === 0 ? (
                  <Button 
                    size="lg"
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 gap-2"
                    onClick={handleDownload}
                    disabled={downloading || !product.downloadUrl}
                  >
                    {downloading ? (
                      <Spinner className="w-4 h-4" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {product.downloadUrl ? '立即下载' : '暂无文件'}
                  </Button>
                ) : (
                  <Button 
                    size="lg"
                    className={`bg-gradient-to-r ${config.color} hover:opacity-90 gap-2`}
                    onClick={handlePurchase}
                    disabled={purchasing}
                  >
                    {purchasing ? (
                      <Spinner className="w-4 h-4" />
                    ) : (
                      <ShoppingCart className="w-4 h-4" />
                    )}
                    购买并下载
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
