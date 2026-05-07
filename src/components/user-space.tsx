'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { 
  User, Trophy, TrendingUp, DollarSign, Skull, ChartLine, 
  Clock, Medal, Crown, Rocket, ChevronDown, ChevronUp,
  Ticket, Coins, Award, Headset, Edit, Copy,
  Flame, Calendar, Trophy as LadderIcon, Sun, Copy as CopyIcon, Check
} from 'lucide-react';

// 模拟用户数据
const mockUserData = {
  id: 'GOLD_8892',
  name: '黄金猎手·Alex',
  rank: '钻石交易员',
  rankPoints: 2847,
  totalReturn: '+187.4%',
  matches: 128,
  winRate: '68.3%',
  totalProfit: '+$24,830',
  maxProfit: '$6,240',
  maxDrawdown: '-23.5%',
  blowUpCount: 2,
  totalTrades: 347,
  avgHoldTime: '2.3 小时',
  maxSingleProfit: '$6,240',
  maxSingleLoss: '-$1,820',
  commonProduct: '伦敦金 (92%)',
  longShortRatio: '做多 63% / 做空 37%',
};

// 收益率数据
const profitData = [0.5, 1.2, -0.3, 2.1, 3.4, 2.8, 4.0, 3.2, 2.7, 4.9, 6.2, 5.4, 5.1, 7.2, 6.8, 5.9, 8.3, 10.1, 9.3, 11.5, 12.0, 11.2, 13.4, 14.2, 13.0, 15.1, 16.3, 17.2, 18.9, 19.5];

// 近期赛事
const recentMatches = [
  { name: '大师邀请赛·春季', date: '2025-02-15', rank: '第8名', reward: '+$450' },
  { name: '天梯赛 1月赛季', date: '2025-01-20', rank: '钻石段位', reward: '+$200奖励' },
  { name: '月度总决赛·十二月', date: '2024-12-28', rank: '第22名', reward: '+$80' },
];

// 进行中赛事
const ongoingMatches = [
  { name: '天梯赛 S2', icon: LadderIcon, desc: '当前排名: 第 36 名', btnText: '进入赛场' },
  { name: '每日挑战赛 (今日)', icon: Sun, desc: '收益率 +2.4% | 暂列第 12', btnText: '立即交易' },
  { name: '月度总决赛 (入围)', icon: Calendar, desc: '已锁定资格 · 距开赛2天', btnText: '查看赛程' },
];

// 勋章
const badges = [
  { name: '首胜勋章', icon: Crown, unlocked: true },
  { name: '连续盈利5日', icon: TrendingUp, unlocked: true },
  { name: '逆风翻盘', icon: Skull, unlocked: true },
  { name: '月赛八强', icon: Rocket, unlocked: true },
  { name: '大师认证', icon: Trophy, unlocked: false },
  { name: '巅峰战神', icon: Medal, unlocked: false },
];

export default function UserSpace() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [userData, setUserData] = useState(mockUserData);
  const [editName, setEditName] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    // 如果有真实用户数据，合并
    if (session?.user) {
      setUserData(prev => ({
        ...prev,
        id: session.user.id || prev.id,
        name: (session.user.name as string) || prev.name,
      }));
    }
    setLoading(false);
  }, [status, session, router]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(userData.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveProfile = () => {
    setUserData(prev => ({ ...prev, name: editName }));
    setEditDialogOpen(false);
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0c12] to-[#030406] flex items-center justify-center">
        <Spinner className="w-8 h-8 text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0c12] to-[#030406] pb-24">
      <div className="max-w-[800px] mx-auto p-4 md:p-6">
        {/* 头部身份区 */}
        <Card className="mb-4 bg-[rgba(12,16,24,0.7)] backdrop-blur-xl border-amber-500/30 rounded-3xl">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-[70px] h-[70px] rounded-full bg-gradient-to-br from-[#2a2e3f] to-[#181c2a] flex items-center justify-center border-2 border-amber-400 shadow-[0_0_12px_rgba(212,175,55,0.3)]">
                  <User className="w-10 h-10 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-100">{userData.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400 bg-black/40 px-2 py-0.5 rounded-full">
                      ID: {userData.id}
                    </span>
                    <button onClick={handleCopyId} className="text-gray-400 hover:text-amber-400 transition-colors">
                      {copied ? <Check className="w-3 h-3" /> : <CopyIcon className="w-3 h-3" />}
                    </button>
                  </div>
                  <button 
                    onClick={() => { setEditName(userData.name); setEditDialogOpen(true); }}
                    className="text-xs text-gray-400 mt-2 hover:text-amber-400 transition-colors flex items-center gap-1"
                  >
                    <Edit className="w-3 h-3" /> 编辑资料
                  </button>
                </div>
              </div>
              <div className="bg-gradient-to-r from-[#26221a] to-[#1f1b14] rounded-3xl px-5 py-3 border-l-2 border-amber-400 text-center">
                <div className="text-xs text-gray-400">当前段位</div>
                <div className="text-lg font-extrabold text-amber-200">⚡ {userData.rank}</div>
                <div className="text-xs text-gray-500">积分 {userData.rankPoints}</div>
              </div>
            </div>

            {/* 统计行 */}
            <div className="flex flex-wrap gap-3 mt-4">
              <div className="stat-pill flex-1 min-w-[100px]">
                <div className="text-xl font-bold text-amber-300">{userData.totalReturn}</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-400">总收益率</div>
              </div>
              <div className="stat-pill flex-1 min-w-[100px]">
                <div className="text-xl font-bold text-amber-300">{userData.matches} 场</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-400">参赛场次</div>
              </div>
              <div className="stat-pill flex-1 min-w-[100px]">
                <div className="text-xl font-bold text-amber-300">{userData.winRate}</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-400">总胜率</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 核心指标 */}
        <Card className="mb-4 bg-[rgba(12,16,24,0.7)] backdrop-blur-xl border-amber-500/30 rounded-3xl">
          <CardContent className="p-5">
            <h3 className="font-semibold text-base mb-4 flex items-center gap-2 border-l-2 border-amber-400 pl-3">
              <ChartLine className="w-4 h-4 text-amber-400" /> 核心交易数据
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/30 rounded-2xl p-3">
                <div className="flex items-center gap-2 text-amber-400 text-xs mb-1">
                  <DollarSign className="w-3 h-3" /> 总盈利
                </div>
                <div className="text-2xl font-bold text-amber-200">{userData.totalProfit}</div>
              </div>
              <div className="bg-black/30 rounded-2xl p-3">
                <div className="flex items-center gap-2 text-amber-400 text-xs mb-1">
                  <Trophy className="w-3 h-3" /> 最大盈利
                </div>
                <div className="text-2xl font-bold text-amber-200">{userData.maxProfit}</div>
              </div>
              <div className="bg-black/30 rounded-2xl p-3">
                <div className="flex items-center gap-2 text-amber-400 text-xs mb-1">
                  <ChartLine className="w-3 h-3" /> 最大回撤
                </div>
                <div className="text-2xl font-bold text-red-400">{userData.maxDrawdown}</div>
              </div>
              <div className="bg-black/30 rounded-2xl p-3">
                <div className="flex items-center gap-2 text-amber-400 text-xs mb-1">
                  <Skull className="w-3 h-3" /> 爆仓次数
                </div>
                <div className="text-2xl font-bold text-red-400">{userData.blowUpCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 收益率曲线 */}
        <Card className="mb-4 bg-[rgba(12,16,24,0.7)] backdrop-blur-xl border-amber-500/30 rounded-3xl">
          <CardContent className="p-5">
            <h3 className="font-semibold text-base mb-4 flex items-center gap-2 border-l-2 border-amber-400 pl-3">
              <ChartLine className="w-4 h-4 text-amber-400" /> 近30天收益率曲线
            </h3>
            <div className="h-[180px]">
              <ProfitChart data={profitData} />
            </div>
          </CardContent>
        </Card>

        {/* 进行中赛事 */}
        <Card className="mb-4 bg-[rgba(12,16,24,0.7)] backdrop-blur-xl border-amber-500/30 rounded-3xl">
          <CardContent className="p-5">
            <h3 className="font-semibold text-base mb-4 flex items-center gap-2 border-l-2 border-amber-400 pl-3">
              <Flame className="w-4 h-4 text-amber-400" /> 进行中 · 我的赛事
            </h3>
            <div className="space-y-3">
              {ongoingMatches.map((match, i) => (
                <div key={i} className="flex items-center justify-between bg-black/30 rounded-2xl p-3">
                  <div className="flex items-center gap-3">
                    <match.icon className="w-5 h-5 text-amber-400" />
                    <div>
                      <div className="font-semibold text-sm">{match.name}</div>
                      <div className="text-xs text-gray-400">{match.desc}</div>
                    </div>
                  </div>
                  <Button size="sm" className="bg-amber-400 hover:bg-amber-500 text-black font-bold text-xs rounded-full">
                    {match.btnText}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 荣耀勋章 */}
        <Card className="mb-4 bg-[rgba(12,16,24,0.7)] backdrop-blur-xl border-amber-500/30 rounded-3xl">
          <CardContent className="p-5">
            <h3 className="font-semibold text-base mb-4 flex items-center gap-2 border-l-2 border-amber-400 pl-3">
              <Medal className="w-4 h-4 text-amber-400" /> 荣耀勋章
            </h3>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge, i) => (
                <div 
                  key={i} 
                  className={`flex items-center gap-2 bg-[rgba(20,24,36,0.8)] rounded-full px-3 py-1.5 text-xs border ${
                    badge.unlocked ? 'border-amber-400/50' : 'border-gray-600 opacity-40 grayscale'
                  }`}
                >
                  <badge.icon className={`w-4 h-4 ${badge.unlocked ? 'text-amber-400' : 'text-gray-500'}`} />
                  {badge.name}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 近期参赛记录 */}
        <Card className="mb-4 bg-[rgba(12,16,24,0.7)] backdrop-blur-xl border-amber-500/30 rounded-3xl">
          <CardContent className="p-5">
            <h3 className="font-semibold text-base mb-4 flex items-center gap-2 border-l-2 border-amber-400 pl-3">
              <Clock className="w-4 h-4 text-amber-400" /> 近期参赛履历
            </h3>
            <div className="space-y-3">
              {recentMatches.map((match, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-amber-400/20 last:border-0">
                  <div>
                    <div className="font-semibold text-sm">{match.name}</div>
                    <div className="text-xs text-gray-500">{match.date}</div>
                  </div>
                  <div className="text-right">
                    <div className="bg-[#1f222e] px-2.5 py-1 rounded-full text-xs">{match.rank}</div>
                    <div className="text-amber-400 text-xs mt-1">{match.reward}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 高级统计折叠面板 */}
        <Card className="mb-4 bg-[rgba(12,16,24,0.7)] backdrop-blur-xl border-amber-500/30 rounded-3xl">
          <CardContent className="p-5">
            <h3 className="font-semibold text-base mb-3 flex items-center gap-2 border-l-2 border-amber-400 pl-3">
              <ChartLine className="w-4 h-4 text-amber-400" /> 高级交易统计
            </h3>
            <div 
              className="bg-black/30 rounded-2xl p-3 cursor-pointer flex justify-between items-center"
              onClick={() => setStatsExpanded(!statsExpanded)}
            >
              <span className="text-sm text-gray-300">详细数据面板</span>
              {statsExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </div>
            <div className={`overflow-hidden transition-all duration-300 ${statsExpanded ? 'max-h-96 opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-amber-400/10"><span>总交易笔数</span><strong>{userData.totalTrades} 笔</strong></div>
                <div className="flex justify-between py-1.5 border-b border-amber-400/10"><span>平均持仓时间</span><strong>{userData.avgHoldTime}</strong></div>
                <div className="flex justify-between py-1.5 border-b border-amber-400/10"><span>最大单笔盈利</span><strong className="text-green-400">{userData.maxSingleProfit}</strong></div>
                <div className="flex justify-between py-1.5 border-b border-amber-400/10"><span>最大单笔亏损</span><strong className="text-orange-400">{userData.maxSingleLoss}</strong></div>
                <div className="flex justify-between py-1.5 border-b border-amber-400/10"><span>常用品种</span><strong>{userData.commonProduct}</strong></div>
                <div className="flex justify-between py-1.5"><span>多空偏好</span><strong>{userData.longShortRatio}</strong></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 快捷操作 */}
        <Card className="mb-4 bg-[rgba(12,16,24,0.7)] backdrop-blur-xl border-amber-500/30 rounded-3xl">
          <CardContent className="p-5">
            <h3 className="font-semibold text-base mb-4 flex items-center gap-2 border-l-2 border-amber-400 pl-3">
              快捷操作
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button variant="outline" className="border-amber-400 text-amber-300 hover:bg-amber-400 hover:text-black rounded-full py-5 flex-col h-auto gap-1">
                <Ticket className="w-5 h-5" />
                <span className="text-xs">推荐报名</span>
              </Button>
              <Button variant="outline" className="border-amber-400 text-amber-300 hover:bg-amber-400 hover:text-black rounded-full py-5 flex-col h-auto gap-1">
                <Coins className="w-5 h-5" />
                <span className="text-xs">充值/兑换</span>
              </Button>
              <Button variant="outline" className="border-amber-400 text-amber-300 hover:bg-amber-400 hover:text-black rounded-full py-5 flex-col h-auto gap-1">
                <Award className="w-5 h-5" />
                <span className="text-xs">参赛证书</span>
              </Button>
              <Button variant="outline" className="border-amber-400 text-amber-300 hover:bg-amber-400 hover:text-black rounded-full py-5 flex-col h-auto gap-1">
                <Headset className="w-5 h-5" />
                <span className="text-xs">客服</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-500 mt-6 mb-4">挑战自我 · 铸就黄金传奇</p>
      </div>

      {/* 编辑资料弹窗 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-[#0a0c12] border-amber-400/30">
          <DialogHeader>
            <DialogTitle className="text-amber-400">编辑资料</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">昵称</label>
              <Input 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)}
                className="bg-black/50 border-amber-400/30 text-white"
              />
            </div>
            <Button onClick={handleSaveProfile} className="w-full bg-amber-400 hover:bg-amber-500 text-black">
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 收益率图表组件
function ProfitChart({ data }: { data: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    const padding = 20;

    // 清除画布
    ctx.clearRect(0, 0, width, height);

    // 计算范围
    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const range = maxVal - minVal || 1;

    // 绘制网格
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding + (height - 2 * padding) * i / 4;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // 绘制数据线
    const stepX = (width - 2 * padding) / (data.length - 1);
    
    // 渐变填充
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(212, 175, 55, 0.3)');
    gradient.addColorStop(1, 'rgba(212, 175, 55, 0.0)');
    
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    data.forEach((val, i) => {
      const x = padding + i * stepX;
      const y = height - padding - ((val - minVal) / range) * (height - 2 * padding);
      if (i === 0) ctx.lineTo(x, y);
      else {
        const prevX = padding + (i - 1) * stepX;
        const prevY = height - padding - ((data[i - 1] - minVal) / range) * (height - 2 * padding);
        const cpX = (prevX + x) / 2;
        ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
        if (i === data.length - 1) ctx.lineTo(x, y);
      }
    });
    ctx.lineTo(width - padding, height - padding);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // 绘制线条
    ctx.beginPath();
    data.forEach((val, i) => {
      const x = padding + i * stepX;
      const y = height - padding - ((val - minVal) / range) * (height - 2 * padding);
      if (i === 0) ctx.moveTo(x, y);
      else {
        const prevX = padding + (i - 1) * stepX;
        const prevY = height - padding - ((data[i - 1] - minVal) / range) * (height - 2 * padding);
        const cpX = (prevX + x) / 2;
        ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
        if (i === data.length - 1) ctx.lineTo(x, y);
      }
    });
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 绘制数据点
    data.forEach((val, i) => {
      const x = padding + i * stepX;
      const y = height - padding - ((val - minVal) / range) * (height - 2 * padding);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#F9E0A0';
      ctx.fill();
      ctx.strokeStyle = '#0a0c12';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

  }, [data, canvasRef]);

  return <canvas ref={canvasRef} width={700} height={180} className="w-full h-full" />;
}

// Hook ref
function useEffectRef<T>(initial: T) {
  const [ref, setRef] = useState<T | null>(initial);
  return ref;
}
