'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Coins, 
  ShoppingCart, 
  Package, 
  Loader2,
  Zap,
  Users,
  CreditCard,
  Shield,
  Map,
  Award,
  Circle,
  Crown
} from 'lucide-react';

interface Item {
  item_id: string;
  name: string;
  item_type: string;
  description: string;
  price_gold: number;
  price_silver: number;
  effect_type: string;
  icon: string;
  is_stackable: boolean;
  can_trade: boolean;
}

const iconMap: Record<string, any> = {
  zap: Zap,
  users: Users,
  'credit-card': CreditCard,
  shield: Shield,
  map: Map,
  award: Award,
  circle: Circle,
};

export default function ShopPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'shop' | 'backpack'>('shop');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await fetch('/api/items');
        const data = await res.json();
        if (data.items) {
          setItems(data.items);
        }
      } catch (error) {
        console.error('获取道具失败:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (activeTab === 'shop') {
      fetchItems();
    }
  }, [activeTab]);

  const handlePurchase = async (item: Item) => {
    if (!session?.user) return;
    
    if (item.price_gold > 0) {
      const confirmBuy = confirm(`确定花费 ${item.price_gold} 金币购买「${item.name}」吗？`);
      if (!confirmBuy) return;
    } else if (item.price_silver > 0) {
      const confirmBuy = confirm(`确定花费 ${item.price_silver} 银两购买「${item.name}」吗？`);
      if (!confirmBuy) return;
    }
    
    setPurchasing(item.item_id);
    
    try {
      const res = await fetch('/api/items/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.item_id })
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert(`购买成功！${item.name} 已加入背包`);
      } else {
        alert(data.message || '购买失败');
      }
    } catch (error) {
      alert('网络错误，请稍后重试');
    } finally {
      setPurchasing(null);
    }
  };

  const getIcon = (iconName: string) => {
    const Icon = iconMap[iconName] || Circle;
    return <Icon className="w-6 h-6" />;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'consumable': return '消耗品';
      case 'functional': return '功能道具';
      case 'decorative': return '装饰';
      case 'collectible': return '收藏品';
      case 'title': return '称号';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'consumable': return 'text-green-400 bg-green-500/20';
      case 'functional': return 'text-blue-400 bg-blue-500/20';
      case 'decorative': return 'text-purple-400 bg-purple-500/20';
      case 'collectible': return 'text-yellow-400 bg-yellow-500/20';
      case 'title': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white pb-20">
      {/* 顶部 */}
      <div className="bg-gradient-to-b from-yellow-900/30 to-transparent pt-6 pb-4 px-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-yellow-500" />
              道具商城
            </h1>
            <p className="text-sm text-gray-400">购买道具，增强实力</p>
          </div>
        </div>
        
        {/* Tab切换 */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('shop')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === 'shop'
                ? 'bg-yellow-500 text-black'
                : 'bg-gray-800 text-gray-400'
            }`}
          >
            <Coins className="w-4 h-4 inline mr-1" />
            商城
          </button>
          <button
            onClick={() => setActiveTab('backpack')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === 'backpack'
                ? 'bg-yellow-500 text-black'
                : 'bg-gray-800 text-gray-400'
            }`}
          >
            <Package className="w-4 h-4 inline mr-1" />
            背包
          </button>
        </div>
      </div>

      {/* 商品列表 */}
      <div className="px-4 py-4">
        {activeTab === 'shop' && (
          <div className="space-y-3">
            {items.map(item => (
              <div
                key={item.item_id}
                className="bg-gray-800/50 border border-gray-700/30 rounded-xl p-4"
              >
                <div className="flex items-start gap-4">
                  {/* 图标 */}
                  <div className="w-14 h-14 rounded-xl bg-gray-700/50 flex items-center justify-center text-yellow-500">
                    {getIcon(item.icon)}
                  </div>
                  
                  {/* 信息 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold">{item.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(item.item_type)}`}>
                        {getTypeLabel(item.item_type)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{item.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {item.price_gold > 0 && (
                          <span className="text-yellow-400 font-bold flex items-center gap-1">
                            <Coins className="w-4 h-4" />
                            {item.price_gold} 金币
                          </span>
                        )}
                        {item.price_silver > 0 && (
                          <span className="text-gray-300 font-bold flex items-center gap-1">
                            <Circle className="w-4 h-4" />
                            {item.price_silver} 银两
                          </span>
                        )}
                        {item.price_gold === 0 && item.price_silver === 0 && (
                          <span className="text-green-400 font-bold">免费</span>
                        )}
                      </div>
                      
                      <button
                        onClick={() => handlePurchase(item)}
                        disabled={purchasing === item.item_id}
                        className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 disabled:from-gray-600 disabled:to-gray-700 text-black font-bold py-2 px-4 rounded-full text-sm flex items-center gap-1 transition-all"
                      >
                        {purchasing === item.item_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            购买
                            <ShoppingCart className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'backpack' && (
          <div className="text-center py-20 text-gray-500">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>背包功能开发中</p>
            <p className="text-sm mt-2">购买道具后可在背包中使用</p>
          </div>
        )}
      </div>
    </div>
  );
}
