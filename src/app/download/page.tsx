'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Smartphone, 
  Bot,
  Zap,
  Shield,
  Cpu,
  CheckCircle2,
  ArrowRight,
  ShoppingCart,
  Download,
  BarChart3,
  FileCode,
  Package,
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
  downloadUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  status: string | null;
  salesCount: number | null;
}

// 产品类型配置
const PRODUCT_TYPE_CONFIG = {
  ea: { label: 'EA智能交易', icon: Bot, color: 'from-purple-500 to-blue-500', bgColor: 'to-purple-50 dark:to-purple-900/20', borderColor: 'border-purple-100 dark:border-purple-800/30' },
  indicator: { label: '技术指标', icon: BarChart3, color: 'from-blue-500 to-cyan-500', bgColor: 'to-blue-50 dark:to-blue-900/20', borderColor: 'border-blue-100 dark:border-blue-800/30' },
  script: { label: '脚本工具', icon: FileCode, color: 'from-amber-500 to-orange-500', bgColor: 'to-amber-50 dark:to-amber-900/20', borderColor: 'border-amber-100 dark:border-amber-800/30' },
  tool: { label: '交易工具', icon: Package, color: 'from-green-500 to-emerald-500', bgColor: 'to-green-50 dark:to-green-900/20', borderColor: 'border-green-100 dark:border-green-800/30' },
};

// 获取图标组件
function getProductIcon(productType: string) {
  const config = PRODUCT_TYPE_CONFIG[productType as keyof typeof PRODUCT_TYPE_CONFIG] || PRODUCT_TYPE_CONFIG.ea;
  return config.icon;
}

function getProductStyle(productType: string) {
  const config = PRODUCT_TYPE_CONFIG[productType as keyof typeof PRODUCT_TYPE_CONFIG] || PRODUCT_TYPE_CONFIG.ea;
  return config;
}

// 产品卡片组件
function ProductCard({ 
  product, 
  purchased, 
  purchasing, 
  onPurchase,
  onDownload,
}: { 
  product: Product; 
  purchased: boolean; 
  purchasing: boolean;
  onPurchase: () => void;
  onDownload?: () => void;
}) {
  const style = getProductStyle(product.productType);
  const IconComponent = getProductIcon(product.productType);
  
  return (
    <Card 
      className={`hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white ${style.bgColor} dark:from-gray-800 border ${style.borderColor}`}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-14 h-14 bg-gradient-to-br ${style.color} rounded-xl flex items-center justify-center shadow-lg`}>
              <IconComponent className="w-7 h-7 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">{product.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-900/30">
                  {product.version || 'v1.0'}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {product.platform || 'MT4/MT5'}
                </Badge>
                {product.category && (
                  <Badge variant="secondary" className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    {product.category}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription className="text-sm line-clamp-3 min-h-[60px]">
          {product.description || '暂无描述'}
        </CardDescription>

        {product.features && (
          <div className="flex flex-wrap gap-2">
            {(typeof product.features === 'string' 
              ? JSON.parse(product.features) 
              : product.features)?.map((feature: string, idx: number) => (
              <span 
                key={idx} 
                className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-700 rounded-md text-xs text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
              >
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                {feature}
              </span>
            ))}
          </div>
        )}

        <div className="pt-4 border-t flex items-center justify-between">
          <div className="text-right">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {product.price === 0 ? '免费' : `${product.price} U`}
            </p>
            <p className="text-xs text-gray-500">
              {product.price === 0 ? '' : '星球币/永久授权'}
            </p>
          </div>
          {purchased ? (
            <div className="flex gap-2">
              <Badge className="bg-green-500 text-white px-4 py-2">
                已购买
              </Badge>
              {onDownload && (
                <Button 
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 gap-2"
                  onClick={onDownload}
                >
                  <Download className="w-4 h-4" />
                  下载
                </Button>
              )}
            </div>
          ) : (
            <Button 
              className={`bg-gradient-to-r ${style.color} hover:opacity-90 gap-2`}
              onClick={onPurchase}
              disabled={purchasing}
            >
              {purchasing ? (
                <>
                  <Spinner className="w-4 h-4" />
                  处理中...
                </>
              ) : (
                <>
                  {product.price === 0 ? (
                    <>
                      <Download className="w-4 h-4" />
                      免费下载
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      购买
                    </>
                  )}
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AppDownloadPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [purchasingId, setPurchasingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [purchasedIds, setPurchasedIds] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState('all');

  // 获取产品列表
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/ea/products');
        const data = await res.json();
        if (data.products) {
          setProducts(data.products);
        }
      } catch (error) {
        console.error('获取产品失败:', error);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  // 下载产品
  const handleDownload = async (productId: number) => {
    try {
      const res = await fetch(`/api/ea/download?productId=${productId}`);
      const data = await res.json();
      
      if (data.success && data.downloadUrl) {
        // 创建下载链接
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = data.fileName || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert(data.error || '下载失败');
      }
    } catch (err) {
      console.error('下载失败:', err);
      alert('下载失败，请稍后重试');
    }
  };

  // 购买产品
  const handlePurchase = async (productId: number, price: number) => {
    if (!session) {
      router.push('/login');
      return;
    }

    // 免费产品直接下载
    if (price === 0) {
      handleDownload(productId);
      setPurchasedIds(prev => new Set([...prev, productId]));
      return;
    }

    setError(null);
    setPurchasingId(productId);

    try {
      const res = await fetch('/api/ea/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setPurchasedIds(prev => new Set([...prev, productId]));
        alert(`购买成功！已消耗 ${data.price} U`);
        // 购买成功后自动下载
        handleDownload(productId);
      } else {
        setError(data.error || '购买失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setPurchasingId(null);
    }
  };

  // 分类过滤
  const filteredProducts = activeTab === 'all' 
    ? products 
    : products.filter(p => p.productType === activeTab);

  // 按类型分组
  const leftProducts = filteredProducts.filter(p => ['ea', 'indicator', 'script'].includes(p.productType));
  const rightProducts = filteredProducts.filter(p => p.productType === 'tool');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl mb-6">
            <Bot className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            软件下载中心
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
            专业开发的MT4/MT5交易工具，助力您的外汇交易
          </p>
        </div>

        {/* Tab 导航 */}
        <div className="flex justify-center mb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-2xl">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="ea">EA</TabsTrigger>
              <TabsTrigger value="indicator">指标</TabsTrigger>
              <TabsTrigger value="script">脚本</TabsTrigger>
              <TabsTrigger value="tool">工具</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* 加载状态 */}
        {loadingProducts ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="text-center py-20">
              <Bot className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-xl text-gray-500">暂无软件产品</p>
              <p className="text-sm text-gray-400 mt-2">敬请期待更多优质交易工具</p>
            </CardContent>
          </Card>
        ) : (
          /* 左右布局 */
          <div className="grid lg:grid-cols-2 gap-8">
            {/* 左边：EA、指标、脚本 */}
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Bot className="w-6 h-6 text-purple-500" />
                智能交易 & 分析工具
              </h2>
              {leftProducts.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-gray-500">暂无相关产品</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {leftProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      purchased={purchasedIds.has(product.id)}
                      purchasing={purchasingId === product.id}
                      onPurchase={() => handlePurchase(product.id, product.price)}
                      onDownload={purchasedIds.has(product.id) ? () => handleDownload(product.id) : undefined}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 右边：交易工具 */}
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Package className="w-6 h-6 text-green-500" />
                交易工具
              </h2>
              {rightProducts.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-gray-500">暂无相关产品</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {rightProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      purchased={purchasedIds.has(product.id)}
                      purchasing={purchasingId === product.id}
                      onPurchase={() => handlePurchase(product.id, product.price)}
                      onDownload={purchasedIds.has(product.id) ? () => handleDownload(product.id) : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Features */}
        <div className="mt-16 pt-12 border-t border-purple-100 dark:border-purple-800/30">
          <h2 className="text-2xl font-bold text-center mb-8 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            为什么选择我们的产品？
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: Cpu, title: '智能算法', desc: '基于多年交易经验开发的量化策略', color: 'from-purple-500 to-purple-600' },
              { icon: Shield, title: '风险控制', desc: '多重止损保护机制，降低最大回撤', color: 'from-blue-500 to-blue-600' },
              { icon: Zap, title: '快速执行', desc: '毫秒级订单响应，抓住每个机会', color: 'from-amber-500 to-amber-600' },
              { icon: Bot, title: '24/7运行', desc: '全天候自动交易，无需人工盯盘', color: 'from-green-500 to-green-600' },
            ].map((item, i) => (
              <div key={i} className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-shadow border border-purple-100 dark:border-purple-800/30">
                <div className={`w-14 h-14 mx-auto mb-4 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center shadow-lg`}>
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <p className="font-semibold text-lg mb-1">{item.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Service Guarantee */}
        <div className="mt-12 p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl border border-purple-100 dark:border-purple-800/30">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <Shield className="w-8 h-8 text-purple-500" />
              <p className="font-medium">正版授权</p>
              <p className="text-sm text-gray-500">永久授权，无限使用</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <p className="font-medium">免费更新</p>
              <p className="text-sm text-gray-500">持续优化，功能升级</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Bot className="w-8 h-8 text-blue-500" />
              <p className="font-medium">技术支持</p>
              <p className="text-sm text-gray-500">专业指导，在线答疑</p>
            </div>
          </div>
        </div>

        {/* Back link */}
        <div className="text-center mt-12">
          <a href="/" className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 dark:text-purple-400 transition-colors">
            <ArrowRight className="w-4 h-4 rotate-180" />
            返回首页
          </a>
        </div>
      </div>
    </div>
  );
}
