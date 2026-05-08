'use client';

import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Coins, 
  Sword, 
  Landmark, 
  Map, 
  Heart, 
  Lock, 
  Trophy, 
  TrendingUp, 
  Users, 
  Shield,
  Castle,
  Warehouse
} from 'lucide-react';

interface Module {
  id: string;
  name: string;
  icon: any;
  description: string;
  status: 'locked' | 'unlocked' | 'coming';
  route?: string;
  unlockCondition?: string;
}

const modules: Module[] = [
  // 第一排
  {
    id: 'banks',
    name: '五大钱庄',
    icon: Building2,
    description: '借贷资金、利息结算',
    status: 'unlocked',
    route: '/finance',
    unlockCondition: '已解锁',
  },
  {
    id: 'exchanges',
    name: '三大交易所',
    icon: TrendingUp,
    description: '交易抽成、手续费收入',
    status: 'unlocked',
    route: '/finance',
    unlockCondition: '已解锁',
  },
  {
    id: 'armory',
    name: '武器库',
    icon: Sword,
    description: '研发武器、战力加成',
    status: 'coming',
    unlockCondition: '即将开放',
  },
  // 第二排
  {
    id: 'trade',
    name: '贸易',
    icon: Warehouse,
    description: '道具交易、拍卖行',
    status: 'coming',
    unlockCondition: '敬请期待',
  },
  {
    id: 'lands',
    name: '五大部落',
    icon: Map,
    description: '领土征服、势力扩张',
    status: 'unlocked',
    route: '/conquest',
    unlockCondition: '已解锁',
  },
  {
    id: 'bank_central',
    name: '中央银行',
    icon: Landmark,
    description: '金币充值、货币兑换',
    status: 'coming',
    unlockCondition: '敬请期待',
  },
  // 第三排
  {
    id: 'village',
    name: '庄园',
    icon: Castle,
    description: '养成系统、资源产出',
    status: 'coming',
    unlockCondition: '敬请期待',
  },
];

export default function HomePage() {
  const router = useRouter();

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'unlocked':
        return 'from-yellow-600/20 to-yellow-800/10 border-yellow-500/50 hover:border-yellow-400';
      case 'coming':
        return 'from-gray-800/50 to-gray-900/30 border-gray-700/30';
      default:
        return 'from-gray-800/50 to-gray-900/30 border-gray-700/30';
    }
  };

  const getIconStyle = (status: string) => {
    switch (status) {
      case 'unlocked':
        return 'text-yellow-500';
      case 'coming':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white pb-20">
      {/* 顶部装饰 */}
      <div className="relative bg-gradient-to-b from-yellow-900/30 to-transparent pt-6 pb-8">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl" />
          <div className="absolute top-20 right-1/4 w-48 h-48 bg-yellow-600/5 rounded-full blur-2xl" />
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-1 mb-4">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-yellow-400">金火火 · 金融征服游戏</span>
          </div>
          
          <h1 className="text-3xl font-bold mb-2">
            <span className="bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              金火火 · 金融大业
            </span>
          </h1>
          <p className="text-gray-400 text-sm">征服金融世界，成为一代霸主</p>
        </div>
      </div>

      {/* 模块网格 */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-3">
          {modules.map((module) => {
            const Icon = module.icon;
            const isUnlocked = module.status === 'unlocked';
            
            return (
              <button
                key={module.id}
                onClick={() => {
                  if (isUnlocked && module.route) {
                    router.push(module.route);
                  }
                }}
                disabled={!isUnlocked}
                className={`relative bg-gradient-to-br ${getStatusStyle(module.status)} border rounded-2xl p-4 text-center transition-all ${
                  isUnlocked ? 'hover:scale-105 active:scale-95 cursor-pointer' : 'cursor-not-allowed opacity-80'
                }`}
              >
                {/* 锁定图标 */}
                {module.status !== 'unlocked' && (
                  <div className="absolute top-2 right-2">
                    <Lock className="w-3 h-3 text-gray-500" />
                  </div>
                )}
                
                {/* 图标 */}
                <div className={`w-12 h-12 mx-auto mb-2 rounded-xl bg-gray-800/50 flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${getIconStyle(module.status)}`} />
                </div>
                
                {/* 名称 */}
                <h3 className={`text-sm font-bold mb-1 ${
                  module.status === 'unlocked' ? 'text-white' : 'text-gray-400'
                }`}>
                  {module.name}
                </h3>
                
                {/* 描述 */}
                <p className="text-[10px] text-gray-500 leading-tight">
                  {module.description}
                </p>
                
                {/* 解锁条件 */}
                {module.status === 'unlocked' ? (
                  <div className="mt-2 text-[10px] text-yellow-500 flex items-center justify-center gap-1">
                    <span className="w-1 h-1 bg-green-500 rounded-full" />
                    已解锁
                  </div>
                ) : (
                  <div className="mt-2 text-[10px] text-gray-500">
                    {module.unlockCondition}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 赛事入口 */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          挑战赛事
        </h2>
        
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push('/challenge/play')}
            className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/10 border border-yellow-500/50 rounded-2xl p-4 text-left hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <h3 className="font-bold text-yellow-300">K线征途</h3>
                <p className="text-xs text-gray-400">10关挑战赛</p>
              </div>
            </div>
            <p className="text-xs text-gray-400">从1000到2000，证明你的交易实力</p>
          </button>
          
          <button
            onClick={() => router.push('/lobby')}
            className="bg-gradient-to-br from-blue-600/20 to-blue-800/10 border border-blue-500/50 rounded-2xl p-4 text-left hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-bold text-blue-300">大赛汇总</h3>
                <p className="text-xs text-gray-400">更多赛事</p>
              </div>
            </div>
            <p className="text-xs text-gray-400">天梯赛、每日挑战等精彩赛事</p>
          </button>
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Coins className="w-5 h-5 text-yellow-500" />
          快捷入口
        </h2>
        
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => router.push('/user/space')}
            className="bg-gray-800/50 border border-gray-700/30 rounded-xl p-3 text-center hover:bg-gray-800 transition-colors"
          >
            <Users className="w-5 h-5 text-gray-400 mx-auto mb-1" />
            <span className="text-xs text-gray-400">个人空间</span>
          </button>
          
          <button
            onClick={() => router.push('/social')}
            className="bg-gray-800/50 border border-gray-700/30 rounded-xl p-3 text-center hover:bg-gray-800 transition-colors"
          >
            <Users className="w-5 h-5 text-gray-400 mx-auto mb-1" />
            <span className="text-xs text-gray-400">聊天大厅</span>
          </button>
          
          <button
            onClick={() => router.push('/conquest')}
            className="bg-gray-800/50 border border-gray-700/30 rounded-xl p-3 text-center hover:bg-gray-800 transition-colors"
          >
            <Map className="w-5 h-5 text-gray-400 mx-auto mb-1" />
            <span className="text-xs text-gray-400">领土征服</span>
          </button>
          
          <button
            onClick={() => router.push('/shop')}
            className="bg-gray-800/50 border border-gray-700/30 rounded-xl p-3 text-center hover:bg-gray-800 transition-colors"
          >
            <Coins className="w-5 h-5 text-gray-400 mx-auto mb-1" />
            <span className="text-xs text-gray-400">道具商城</span>
          </button>
        </div>
      </div>

      {/* 底部 slogan */}
      <div className="text-center py-8 text-gray-600 text-xs">
        <p>金火火 · 让金融更有趣</p>
      </div>
    </div>
  );
}
