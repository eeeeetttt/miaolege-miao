'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Coins, Clock, Infinity, Sparkles } from 'lucide-react';

interface DurationOption {
  value: number;
  label: string;
  price: number;
  icon: any;
  description: string;
  popular?: boolean;
}

export default function CreatePlanetPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userBalance, setUserBalance] = useState(0);
  const [durationOptions, setDurationOptions] = useState<DurationOption[]>([
    { value: 7, label: '7天', price: 0, icon: Clock, description: '免费体验' },
    { value: 365, label: '一年', price: 1999, icon: Clock, description: '适合短期运营' },
    { value: 1095, label: '三年', price: 2999, icon: Clock, description: '性价比之选', popular: true },
    { value: 0, label: '永久', price: 4999, icon: Infinity, description: '一次付费永久使用' },
  ]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rules: '',
    ticketPrice: '0',
    inviteCode: '',
    maxPublishers: '3',
    durationDays: 365,
  });

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserBalance();
      fetchSystemConfig();
    }
  }, [session]);

  const fetchUserBalance = async () => {
    try {
      const res = await fetch('/api/user/info');
      const data = await res.json();
      if (data.user) {
        setUserBalance(data.user.coinBalance || 0);
      }
    } catch (error) {
      console.error('Failed to fetch user balance:', error);
    }
  };

  const fetchSystemConfig = async () => {
    try {
      const res = await fetch('/api/admin/config');
      if (res.ok) {
        const data = await res.json();
        const config = data.config || {};
        setDurationOptions([
          { value: 7, label: '7天', price: parseInt(config.planet_price_7days || '0'), icon: Clock, description: '免费体验' },
          { value: 365, label: '一年', price: parseInt(config.planet_price_1year || '1999'), icon: Clock, description: '适合短期运营' },
          { value: 1095, label: '三年', price: parseInt(config.planet_price_3years || '2999'), icon: Clock, description: '性价比之选', popular: true },
          { value: 0, label: '永久', price: parseInt(config.planet_price_permanent || '4999'), icon: Infinity, description: '一次付费永久使用' },
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch system config:', error);
    }
  };

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  const selectedOption = durationOptions.find(opt => opt.value === formData.durationDays);
  const totalPrice = selectedOption?.price || 0;
  const canAfford = userBalance >= totalPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!canAfford && totalPrice > 0) {
      setError(`星球币不足，需要 ${totalPrice} 星球币，当前余额 ${userBalance} 星球币`);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/planet/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ticketPrice: parseInt(formData.ticketPrice) || 0,
          maxPublishers: parseInt(formData.maxPublishers) || 3,
          durationDays: formData.durationDays,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '创建失败');
      } else {
        router.push(`/planet/${data.planetId}`);
      }
    } catch (err) {
      setError('创建失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 余额提示 */}
        <div className="mb-6 flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-500" />
            <span className="text-gray-600 dark:text-gray-400">我的星球币余额：</span>
            <span className="font-bold text-lg text-purple-600">{userBalance}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push('/recharge')}>
            充值
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              创建星球
            </CardTitle>
            <CardDescription>
              创建您的专属星球，邀请信号发布者和跟单者加入
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* 时长选择 */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">选择星球时长</Label>
                <RadioGroup
                  value={formData.durationDays.toString()}
                  onValueChange={(value) => setFormData({ ...formData, durationDays: parseInt(value) })}
                  className="grid grid-cols-2 gap-3"
                >
                  {durationOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <div
                        key={option.value}
                        className={`relative cursor-pointer rounded-lg border-2 transition-all ${
                          formData.durationDays === option.value
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 hover:border-purple-300 dark:border-gray-700'
                        }`}
                        onClick={() => setFormData({ ...formData, durationDays: option.value })}
                      >
                        {option.popular && (
                          <Badge className="absolute -top-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500">
                            推荐
                          </Badge>
                        )}
                        <RadioGroupItem value={option.value.toString()} className="sr-only" />
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className={`w-5 h-5 ${formData.durationDays === option.value ? 'text-purple-500' : 'text-gray-400'}`} />
                            <span className="font-semibold">{option.label}</span>
                          </div>
                          <div className="text-sm text-gray-500 mb-2">{option.description}</div>
                          <div className="font-bold text-lg">
                            {option.price === 0 ? (
                              <span className="text-green-500">免费</span>
                            ) : (
                              <span className="text-purple-600">{option.price} 星球币</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>

              {/* 费用汇总 */}
              {totalPrice > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 dark:text-gray-400">星球时长费用</span>
                    <span className="font-medium">{totalPrice} 星球币</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-gray-600 dark:text-gray-400">应付金额</span>
                    <span className={`font-bold text-lg ${canAfford ? 'text-purple-600' : 'text-red-500'}`}>
                      {totalPrice} 星球币
                    </span>
                  </div>
                  {!canAfford && (
                    <div className="mt-2 text-sm text-red-500">
                      余额不足，请先充值
                    </div>
                  )}
                </div>
              )}

              <div className="border-t pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">星球名称 *</Label>
                  <Input
                    id="name"
                    placeholder="给您的星球起个名字"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">星球描述</Label>
                  <Textarea
                    id="description"
                    placeholder="描述一下您的星球特色..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rules">星球公告</Label>
                  <Textarea
                    id="rules"
                    placeholder="设定一些星球公告..."
                    value={formData.rules}
                    onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ticketPrice">门票价格（星球币）</Label>
                    <Input
                      id="ticketPrice"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.ticketPrice}
                      onChange={(e) => setFormData({ ...formData, ticketPrice: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxPublishers">最大发布者数</Label>
                    <Input
                      id="maxPublishers"
                      type="number"
                      min="1"
                      placeholder="3"
                      value={formData.maxPublishers}
                      onChange={(e) => setFormData({ ...formData, maxPublishers: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inviteCode">邀请码（可选）</Label>
                  <Input
                    id="inviteCode"
                    placeholder="设置邀请码"
                    value={formData.inviteCode}
                    onChange={(e) => setFormData({ ...formData, inviteCode: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={loading || (!canAfford && totalPrice > 0)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {loading ? '创建中...' : totalPrice > 0 ? `支付 ${totalPrice} 星球币并创建` : '免费创建'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
