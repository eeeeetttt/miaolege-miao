'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { 
  Smartphone, 
  Bot,
  Zap,
  Shield,
  Cpu,
  CheckCircle2,
  ArrowRight,
  ShoppingCart,
  AlertCircle
} from 'lucide-react';

export default function AppDownloadPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [eaProducts, setEaProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [purchasingId, setPurchasingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [purchasedIds, setPurchasedIds] = useState<Set<number>>(new Set());

  // 获取EA产品列表
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/ea/products');
        const data = await res.json();
        if (data.products) {
          setEaProducts(data.products);
        }
      } catch (error) {
        console.error('获取EA产品失败:', error);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  // 购买EA产品
  const handlePurchase = async (productId: number) => {
    if (!session) {
      router.push('/login');
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
        // 标记为已购买
        setPurchasedIds(prev => new Set([...prev, productId]));
        alert(`购买成功！已消耗 ${data.price} U`);
      } else {
        setError(data.error || '购买失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setPurchasingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl mb-6">
            <Bot className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            交易机器人 EA 产品
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
            专业开发的MT4/MT5自动交易机器人，助力您的外汇交易
          </p>
        </div>

        {/* EA Products */}
        {loadingProducts ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        ) : eaProducts.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="text-center py-20">
              <Bot className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-xl text-gray-500">暂无EA产品</p>
              <p className="text-sm text-gray-400 mt-2">敬请期待更多优质交易机器人</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eaProducts.map((product) => (
              <Card 
                key={product.id} 
                className="hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-900/20 border-purple-100 dark:border-purple-800/30"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Bot className="w-7 h-7 text-white" />
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
                        ¥{product.price || 0}
                      </p>
                      <p className="text-xs text-gray-500">元/永久授权</p>
                    </div>
                    {purchasedIds.has(product.id) ? (
                      <Badge className="bg-green-500 text-white px-4 py-2">
                        已购买
                      </Badge>
                    ) : (
                      <Button 
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 gap-2"
                        onClick={() => handlePurchase(product.id)}
                        disabled={purchasingId === product.id}
                      >
                        {purchasingId === product.id ? (
                          <>
                            <Spinner className="w-4 h-4" />
                            购买中...
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4" />
                            立即购买
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* EA Features */}
        <div className="mt-16 pt-12 border-t border-purple-100 dark:border-purple-800/30">
          <h2 className="text-2xl font-bold text-center mb-8 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            为什么选择我们的EA产品？
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
