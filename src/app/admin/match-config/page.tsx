'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { 
  Target, Trophy, Zap, Crown, Medal, 
  Save, RefreshCw, Check, AlertCircle,
  Settings, Info
} from 'lucide-react';

type MatchType = 'kline' | 'ladder' | 'daily' | 'master' | 'monthly';

interface MatchMeta {
  name: string;
  icon: string;
  color: string;
}

interface MatchConfig {
  value: string;
  description: string;
}

interface MatchData {
  meta: MatchMeta;
  config: Record<string, MatchConfig>;
}

const MATCH_ICONS: Record<string, React.ReactNode> = {
  kline: <Target className="w-5 h-5" />,
  ladder: <Trophy className="w-5 h-5" />,
  daily: <Zap className="w-5 h-5" />,
  master: <Crown className="w-5 h-5" />,
  monthly: <Medal className="w-5 h-5" />,
};

const MATCH_COLORS: Record<string, string> = {
  kline: '#3b82f6',
  ladder: '#10b981',
  daily: '#f59e0b',
  master: '#a78bfa',
  monthly: '#ec4899',
};

const MATCH_NAMES: Record<MatchType, string> = {
  kline: 'K线征途',
  ladder: '天梯赛',
  daily: '每日挑战',
  master: '大师邀请',
  monthly: '月度决赛',
};

// 配置项中文标签
const CONFIG_LABELS: Record<string, string> = {
  enabled: '启用状态',
  description: '比赛描述',
  entry_fee_gold: '报名费（金币）',
  initial_capital_silver: '初始银两',
  fail_threshold: '失败底线净值',
  level_targets: '关卡目标（JSON数组）',
  completion_reward_gold: '通关奖励（金币）',
  completion_title: '通关称号',
  entry_capital_silver: '初始银两',
  season_days: '赛季天数',
  reward_tiers: '奖励档次（JSON）',
  start_hour: '报名开始小时',
  end_hour: '报名截止小时',
  reward_gold: '第一名奖励（金币）',
  reward_silver: '第一名奖励（银两）',
  required_title: '参赛所需称号',
  match_format: '比赛形式',
  rounds_per_week: '每周轮数',
  champion_reward_gold: '冠军奖励（金币）',
  champion_title: '冠军称号',
  qualifying_top_n: '参赛资格（天梯前N名）',
  match_duration_days: '比赛天数',
  required_debt_zero: '要求负债为0',
};

export default function MatchConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [matchConfigs, setMatchConfigs] = useState<Record<string, MatchData>>({});
  const [editedConfigs, setEditedConfigs] = useState<Record<string, Record<string, string>>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<MatchType>('kline');

  // 获取配置
  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/match-config');
      const data = await res.json();
      
      if (res.ok && data.success) {
        setMatchConfigs(data.data);
        // 初始化编辑状态
        const edits: Record<string, Record<string, string>> = {};
        for (const [matchType, matchData] of Object.entries(data.data)) {
          const config: Record<string, string> = {};
          for (const [key, cfg] of Object.entries((matchData as MatchData).config)) {
            config[key] = cfg.value;
          }
          edits[matchType] = config;
        }
        setEditedConfigs(edits);
      } else {
        setMessage({ type: 'error', text: data.error || '获取配置失败' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '网络错误' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  // 保存单个配置
  const handleSave = async (matchType: string, configKey: string, configValue: string) => {
    try {
      const res = await fetch('/api/admin/match-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchType, configKey, configValue }),
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: '保存成功' });
        setTimeout(() => setMessage(null), 2000);
        // 更新本地状态
        setEditedConfigs(prev => ({
          ...prev,
          [matchType]: {
            ...prev[matchType],
            [configKey]: configValue,
          },
        }));
      } else {
        setMessage({ type: 'error', text: data.error || '保存失败' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '网络错误' });
    }
  };

  // 批量保存
  const handleBatchSave = async (matchType: string) => {
    setSaving(true);
    setMessage(null);
    
    try {
      const configs = Object.entries(editedConfigs[matchType] || {}).map(([key, value]) => ({
        matchType,
        configKey: key,
        configValue: value,
      }));
      
      const res = await fetch('/api/admin/match-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'batchUpdate', configs }),
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: '批量保存成功' });
        fetchConfigs();
      } else {
        setMessage({ type: 'error', text: data.error || '保存失败' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '网络错误' });
    } finally {
      setSaving(false);
    }
  };

  // 初始化默认配置
  const handleInitDefaults = async () => {
    if (!confirm('确定要初始化所有赛事配置为默认值吗？这将覆盖现有配置。')) return;
    
    setInitializing(true);
    try {
      const res = await fetch('/api/admin/match-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initDefaults' }),
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: data.message });
        fetchConfigs();
      } else {
        setMessage({ type: 'error', text: data.error || '初始化失败' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '网络错误' });
    } finally {
      setInitializing(false);
    }
  };

  // 输入变化
  const handleInputChange = (matchType: string, key: string, value: string) => {
    setEditedConfigs(prev => ({
      ...prev,
      [matchType]: {
        ...prev[matchType],
        [key]: value,
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            赛事配置管理
          </h1>
          <p className="text-muted-foreground mt-1">
            配置五大赛事的参数和描述
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleInitDefaults}
            disabled={initializing}
          >
            {initializing ? <Spinner className="w-4 h-4 mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            初始化默认配置
          </Button>
        </div>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`flex items-center gap-2 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Tab切换 */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MatchType)}>
        <TabsList className="grid grid-cols-5 w-full">
          {(['kline', 'ladder', 'daily', 'master', 'monthly'] as MatchType[]).map((type) => (
            <TabsTrigger 
              key={type} 
              value={type}
              className="flex items-center gap-2"
              style={{ borderColor: activeTab === type ? MATCH_COLORS[type] : 'transparent' }}
            >
              <span style={{ color: MATCH_COLORS[type] }}>
                {MATCH_ICONS[type]}
              </span>
              <span className="hidden sm:inline">{MATCH_NAMES[type]}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {(['kline', 'ladder', 'daily', 'master', 'monthly'] as MatchType[]).map((type) => (
          <TabsContent key={type} value={type} className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-4" style={{ borderLeft: `4px solid ${MATCH_COLORS[type]}` }}>
                <CardTitle className="flex items-center gap-2">
                  <span style={{ color: MATCH_COLORS[type] }}>
                    {MATCH_ICONS[type]}
                  </span>
                  {MATCH_NAMES[type]} 配置
                </CardTitle>
                <CardDescription>
                  设置 {MATCH_NAMES[type]} 的各项参数
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 通用配置 */}
                <div className="grid gap-4">
                  {Object.entries(editedConfigs[type] || {}).map(([key, value]) => {
                    const configInfo = matchConfigs[type]?.config[key];
                    const label = CONFIG_LABELS[key] || key;
                    const isBoolean = value === 'true' || value === 'false';
                    const isEnabled = key === 'enabled';

                    return (
                      <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <Label className="text-sm font-medium flex items-center gap-2">
                            {label}
                            {isEnabled && (
                              <Badge variant={value === 'true' ? 'default' : 'secondary'} className="ml-2">
                                {value === 'true' ? '已启用' : '已禁用'}
                              </Badge>
                            )}
                          </Label>
                          {configInfo?.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {configInfo.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isBoolean ? (
                            <select
                              value={value}
                              onChange={(e) => handleInputChange(type, key, e.target.value)}
                              className="px-3 py-1.5 border rounded-md text-sm bg-background"
                            >
                              <option value="true">是</option>
                              <option value="false">否</option>
                            </select>
                          ) : key === 'level_targets' || key === 'reward_tiers' ? (
                            <textarea
                              value={value}
                              onChange={(e) => handleInputChange(type, key, e.target.value)}
                              className="px-3 py-1.5 border rounded-md text-sm bg-background w-48 h-20 font-mono"
                              placeholder="JSON格式"
                            />
                          ) : (
                            <Input
                              type={key.includes('fee') || key.includes('reward') || key.includes('capital') || key.includes('threshold') || key.includes('gold') || key.includes('silver') || key.includes('days') || key.includes('hour') || key.includes('rounds') || key.includes('top') || key.includes('duration') ? 'number' : 'text'}
                              value={value}
                              onChange={(e) => handleInputChange(type, key, e.target.value)}
                              className="w-40"
                            />
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleSave(type, key, value)}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 批量保存按钮 */}
                <div className="flex justify-end pt-4 border-t">
                  <Button 
                    onClick={() => handleBatchSave(type)}
                    disabled={saving}
                    style={{ backgroundColor: MATCH_COLORS[type] }}
                  >
                    {saving ? <Spinner className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    保存 {MATCH_NAMES[type]} 全部配置
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 配置说明 */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2 text-blue-800">
                  <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="text-sm space-y-1">
                    <p className="font-medium">配置说明：</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                      <li>enabled：是否启用该赛事，设为 false 则用户无法报名</li>
                      <li>entry_fee_gold/entry_capital_silver：报名时扣除的费用</li>
                      <li>initial_capital_silver：比赛账户初始银两</li>
                      <li>description：显示在赛事中心的描述文字</li>
                      <li>JSON格式字段（level_targets、reward_tiers）需保持正确格式</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
