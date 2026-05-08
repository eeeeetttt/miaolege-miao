'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Coins, Sword, Landmark, Map, Heart, Lock, Unlock, Trophy, TrendingUp, Users, Shield } from 'lucide-react';
import Link from 'next/link';

interface Module {
  id: string;
  name: string;
  icon: string;
  description: string;
  status: 'locked' | 'unlocked';
  unlockCondition?: string;
}

const defaultModules: Module[] = [
  // 第一排
  {
    id: 'banks',
    name: '五大钱庄',
    icon: 'Coins',
    description: '存储资产、利息收益',
    status: 'locked',
    unlockCondition: '累计收益达到 10,000',
  },
  {
    id: 'exchanges',
    name: '三大交易所',
    icon: 'TrendingUp',
    description: '数字货币、贵金属、外汇交易',
    status: 'locked',
    unlockCondition: '完成首战告捷',
  },
  {
    id: 'armory',
    name: '武器库',
    icon: 'Sword',
    description: 'EA策略、交易工具',
    status: 'locked',
    unlockCondition: 'K线征途通关第3关',
  },
  // 第二排
  {
    id: 'trade',
    name: '贸易',
    icon: 'Building2',
    description: '跨服交易、物品交换',
    status: 'locked',
    unlockCondition: '参赛满 50 场',
  },
  {
    id: 'tribes',
    name: '五大部落地图',
    icon: 'Map',
    description: '团队竞技、领地争夺',
    status: 'locked',
    unlockCondition: '天梯赛达到黄金段位',
  },
  // 第三排
  {
    id: 'centralbank',
    name: '中央银行',
    icon: 'Landmark',
    description: '政策发布、宏观调控',
    status: 'locked',
    unlockCondition: '总收益达到 100,000',
  },
  // 第四排
  {
    id: 'manor',
    name: '庄园',
    icon: 'Heart',
    description: '养宠、种植、装修',
    status: 'locked',
    unlockCondition: 'K线征途全通关',
  },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Coins,
  TrendingUp,
  Sword,
  Building2,
  Map,
  Landmark,
  Heart,
  Trophy,
  Users,
  Shield,
};

export default function HomePage() {
  const router = useRouter();
  const [modules, setModules] = useState<Module[]>(defaultModules);

  useEffect(() => {
    // 后期可从API获取用户解锁状态
  }, []);

  const handleModuleClick = (module: Module) => {
    if (module.status === 'unlocked') {
      router.push(`/home/${module.id}`);
    } else {
      alert(`🔒 解锁条件：${module.unlockCondition}`);
    }
  };

  const getIcon = (iconName: string) => {
    const Icon = iconMap[iconName] || Trophy;
    return <Icon className="w-8 h-8" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white pb-20">
      {/* 顶部标题 */}
      <div className="bg-gradient-to-r from-yellow-900/40 via-yellow-800/30 to-yellow-900/40 border-b border-yellow-600/30">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Building2 className="w-8 h-8 text-yellow-500" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
              金 融 大 业
            </h1>
            <Building2 className="w-8 h-8 text-yellow-500" />
          </div>
          <p className="text-center text-gray-400 text-sm">构建你的金融帝国</p>
        </div>
      </div>

      {/* 模块网格 */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 第一排：三大核心 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {modules.slice(0, 3).map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              onClick={() => handleModuleClick(module)}
              getIcon={getIcon}
              variant="tall"
            />
          ))}
        </div>

        {/* 第二排：两大核心 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {modules.slice(3, 5).map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              onClick={() => handleModuleClick(module)}
              getIcon={getIcon}
              variant="wide"
            />
          ))}
        </div>

        {/* 第三排：中央银行 */}
        <div className="grid grid-cols-1 gap-3 mb-4">
          {modules.slice(5, 6).map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              onClick={() => handleModuleClick(module)}
              getIcon={getIcon}
              variant="full"
            />
          ))}
        </div>

        {/* 第四排：庄园 */}
        <div className="grid grid-cols-1 gap-3">
          {modules.slice(6, 7).map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              onClick={() => handleModuleClick(module)}
              getIcon={getIcon}
              variant="full"
            />
          ))}
        </div>

        {/* 底部提示 */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>更多模块持续开发中...</p>
          <p className="mt-1 text-xs">完成挑战，解锁更多功能</p>
        </div>
      </div>

      {/* 快捷入口 */}
      <div className="fixed bottom-20 right-4 flex flex-col gap-2 z-40">
        <Link
          href="/lobby"
          className="w-12 h-12 bg-yellow-600 hover:bg-yellow-500 rounded-full flex items-center justify-center shadow-lg"
        >
          <Trophy className="w-6 h-6 text-white" />
        </Link>
        <Link
          href="/challenge/play"
          className="w-12 h-12 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center shadow-lg"
        >
          <TrendingUp className="w-6 h-6 text-white" />
        </Link>
      </div>
    </div>
  );
}

interface ModuleCardProps {
  module: Module;
  onClick: () => void;
  getIcon: (iconName: string) => React.ReactNode;
  variant: 'tall' | 'wide' | 'full';
}

function ModuleCard({ module, onClick, getIcon, variant }: ModuleCardProps) {
  const isLocked = module.status === 'locked';
  
  const baseClasses = `
    relative overflow-hidden rounded-2xl border transition-all duration-300
    ${isLocked 
      ? 'bg-gray-900/60 border-gray-700/50 hover:border-gray-600' 
      : 'bg-gradient-to-br from-yellow-900/40 to-orange-900/40 border-yellow-600/50 hover:border-yellow-500'
    }
  `;

  return (
    <button onClick={onClick} className={baseClasses}>
      {/* 顶部装饰 */}
      <div className={`h-1 ${isLocked ? 'bg-gray-700' : 'bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-600'}`} />
      
      <div className={`${variant === 'tall' ? 'p-4' : 'p-5'}`}>
        {/* 图标 */}
        <div className={`mb-3 ${isLocked ? 'text-gray-600' : 'text-yellow-500'}`}>
          {getIcon(module.icon)}
        </div>

        {/* 名称 */}
        <h3 className={`font-bold mb-1 ${isLocked ? 'text-gray-400' : 'text-yellow-200'}`}>
          {module.name}
        </h3>

        {/* 描述 */}
        <p className={`text-xs mb-2 ${isLocked ? 'text-gray-500' : 'text-gray-300'}`}>
          {module.description}
        </p>

        {/* 解锁状态 */}
        {isLocked ? (
          <div className="flex items-center gap-1 text-gray-500 text-xs">
            <Lock className="w-3 h-3" />
            <span>未解锁</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-yellow-400 text-xs">
            <Unlock className="w-3 h-3" />
            <span>已解锁</span>
          </div>
        )}
      </div>
    </button>
  );
}
