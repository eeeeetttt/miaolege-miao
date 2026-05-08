'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Map, 
  Lock, 
  Unlock, 
  Shield, 
  Sword, 
  Users, 
  ChevronRight,
  Trophy,
  Star,
  Loader2,
  Globe,
  Mountain
} from 'lucide-react';

interface Land {
  land_id: number;
  name: string;
  region: string;
  description: string;
  required_power: number;
  defense: number;
  daily_output: number;
  upgrade_cost: number;
  upgrade_level: number;
  owner_user_id: string | null;
  is_locked: boolean;
}

interface UserInfo {
  coin_balance: number;
  total_debt: number;
  total_power: number;
  units: number;
}

interface MilitaryInfo {
  units: number;
  total_power: number;
  last_maintenance_date: string;
}

export default function ConquestPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [lands, setLands] = useState<Land[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [militaryInfo, setMilitaryInfo] = useState<MilitaryInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [attacking, setAttacking] = useState<number | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (status !== 'authenticated') return;
      
      try {
        const [landsRes, userRes, militaryRes] = await Promise.all([
          fetch('/api/conquest'),
          fetch('/api/user/info'),
          fetch('/api/military')
        ]);
        
        const landsData = await landsRes.json();
        const userData = await userRes.json();
        const militaryData = await militaryRes.json();
        
        if (landsData.lands) setLands(landsData.lands);
        if (userData.user) setUserInfo(userData.user);
        if (militaryData.military) setMilitaryInfo(militaryData.military);
      } catch (error) {
        console.error('获取数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [status]);

  const handleAttack = async (land: Land) => {
    if (!session?.user) return;
    
    if (militaryInfo && militaryInfo.total_power < land.required_power) {
      alert(`战力不足！需要 ${land.required_power} 战力，当前 ${militaryInfo.total_power} 战力`);
      return;
    }
    
    if (!confirm(`确定要征服「${land.name}」吗？\n需要战力: ${land.required_power}\n当前战力: ${militaryInfo?.total_power || 0}`)) {
      return;
    }
    
    setAttacking(land.land_id);
    
    try {
      const res = await fetch('/api/conquest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ landId: land.land_id })
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert(`恭喜！成功征服「${land.name}」！\n获得每日产出: ${land.daily_output} 银两`);
        // 刷新数据
        const [landsRes, militaryRes] = await Promise.all([
          fetch('/api/conquest'),
          fetch('/api/military')
        ]);
        setLands((await landsRes.json()).lands);
        setMilitaryInfo((await militaryRes.json()).military);
      } else {
        alert(data.message || '征服失败');
      }
    } catch (error) {
      alert('网络错误，请稍后重试');
    } finally {
      setAttacking(null);
    }
  };

  const domesticLands = lands.filter(l => l.region === 'domestic');
  const worldLands = lands.filter(l => l.region === 'world');

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
              <Map className="w-6 h-6 text-yellow-500" />
              领土征服
            </h1>
            <p className="text-sm text-gray-400">占领土地，获取资源产出</p>
          </div>
        </div>
        
        {/* 战力展示 */}
        <div className="bg-gray-800/50 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400">我的总战力</p>
              <p className="text-2xl font-bold text-yellow-400">
                {militaryInfo?.total_power || 0}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">兵团数量</p>
            <p className="text-lg font-bold">{militaryInfo?.units || 0}</p>
          </div>
        </div>
      </div>

      {/* 国内领土 */}
      <div className="px-4 py-4">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Mountain className="w-5 h-5 text-green-500" />
          国内领土
        </h2>
        
        <div className="space-y-3">
          {domesticLands.map(land => (
            <div
              key={land.land_id}
              className={`bg-gray-800/50 border rounded-xl p-4 ${
                land.owner_user_id === session?.user?.id
                  ? 'border-green-500/50 bg-green-900/20'
                  : land.is_locked
                  ? 'border-gray-700/30 opacity-60'
                  : 'border-yellow-500/30'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    {land.name}
                    {land.owner_user_id === session?.user?.id && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                        已占领
                      </span>
                    )}
                    {land.is_locked && (
                      <Lock className="w-4 h-4 text-gray-500" />
                    )}
                  </h3>
                  <p className="text-xs text-gray-400">{land.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">每日产出</p>
                  <p className="text-yellow-400 font-bold">+{land.daily_output}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm mb-3">
                <div className="flex items-center gap-1 text-gray-400">
                  <Shield className="w-4 h-4" />
                  防御: {land.defense}
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <Sword className="w-4 h-4" />
                  需求: {land.required_power}
                </div>
              </div>
              
              {!land.is_locked && land.owner_user_id !== session?.user?.id && (
                <button
                  onClick={() => handleAttack(land)}
                  disabled={attacking === land.land_id || !militaryInfo}
                  className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 disabled:from-gray-600 disabled:to-gray-700 text-black font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                  {attacking === land.land_id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      征服中...
                    </>
                  ) : (
                    <>
                      <Sword className="w-4 h-4" />
                      发起征服
                    </>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 世界领土 */}
      <div className="px-4 py-4">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Globe className="w-5 h-5 text-purple-500" />
          世界领土
          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full ml-2">
            未解锁
          </span>
        </h2>
        
        <div className="space-y-3">
          {worldLands.map(land => (
            <div
              key={land.land_id}
              className="bg-gray-800/50 border border-gray-700/30 rounded-xl p-4 opacity-60"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Lock className="w-4 h-4 text-gray-500" />
                    {land.name}
                  </h3>
                  <p className="text-xs text-gray-500">{land.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">每日产出</p>
                  <p className="text-gray-400 font-bold">+{land.daily_output}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div>防御: {land.defense}</div>
                <div>需求: {land.required_power}</div>
              </div>
              
              <div className="mt-3 text-center text-xs text-gray-500">
                需要统一国内后解锁
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
