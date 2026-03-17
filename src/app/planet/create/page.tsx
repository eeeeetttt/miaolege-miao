'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function CreatePlanetPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rules: '',
    ticketPrice: '0',
    inviteCode: '',
    maxPublishers: '3',
    durationDays: '365',
  });

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/planet/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ticketPrice: parseInt(formData.ticketPrice) || 0,
          maxPublishers: parseInt(formData.maxPublishers) || 3,
          durationDays: parseInt(formData.durationDays) || 365,
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>创建星球</CardTitle>
            <CardDescription>
              创建您的专属星球，邀请信号发布者和跟单者加入
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">邀请码（可选）</Label>
                  <Input
                    id="inviteCode"
                    placeholder="设置邀请码"
                    value={formData.inviteCode}
                    onChange={(e) => setFormData({ ...formData, inviteCode: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="durationDays">会员有效期（天）</Label>
                  <Input
                    id="durationDays"
                    type="number"
                    min="1"
                    placeholder="365"
                    value={formData.durationDays}
                    onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
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
              <Button type="submit" disabled={loading}>
                {loading ? '创建中...' : '创建星球'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
