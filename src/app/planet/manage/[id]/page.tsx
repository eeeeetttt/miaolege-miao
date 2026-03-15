'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface Application {
  id: number;
  userId: string;
  userName: string;
  userEmail: string;
  appliedAt: string;
  status: string;
}

interface Member {
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  joinMethod: string;
  ticketPaid: number;
  joinedAt: string;
  expiryDate: string;
}

export default function PlanetManagePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [planet, setPlanet] = useState<any>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState({ totalMembers: 0, totalEarnings: 0 });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, params.id]);

  const fetchData = async () => {
    try {
      // Fetch planet detail
      const planetRes = await fetch(`/api/planet/${params.id}`);
      const planetData = await planetRes.json();
      
      if (planetData.userRole !== 'owner') {
        router.push('/planet');
        return;
      }

      setPlanet(planetData.planet);
      setStats({ totalMembers: planetData.memberCount, totalEarnings: 0 });

      // Fetch applications
      const appRes = await fetch(`/api/planet/applications?planetId=${params.id}`);
      const appData = await appRes.json();
      setApplications(appData.applications || []);

      // Fetch members
      const membersRes = await fetch(`/api/planet/members?planetId=${params.id}`);
      const membersData = await membersRes.json();
      setMembers(membersData.members || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      const res = await fetch('/api/planet/approve-publisher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planetId: parseInt(params.id as string), userId }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const res = await fetch('/api/planet/reject-publisher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planetId: parseInt(params.id as string), userId }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>加载中...</p>
      </div>
    );
  }

  const pendingApplications = applications.filter(app => app.status === 'pending');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">管理星球: {planet?.name}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              管理成员、发布者和设置
            </p>
          </div>
          <Link href={`/planet/${params.id}`}>
            <Button variant="outline">查看星球</Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>总成员数</CardDescription>
              <CardTitle className="text-3xl">{stats.totalMembers}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>待审核申请</CardDescription>
              <CardTitle className="text-3xl">{pendingApplications.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>门票价格</CardDescription>
              <CardTitle className="text-3xl">
                {planet?.ticketPrice || 0} 星球币
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="applications">
          <TabsList>
            <TabsTrigger value="applications">申请管理</TabsTrigger>
            <TabsTrigger value="members">成员列表</TabsTrigger>
          </TabsList>

          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle>发布者申请</CardTitle>
                <CardDescription>审核成为发布者的申请</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingApplications.length === 0 ? (
                  <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                    暂无待审核申请
                  </p>
                ) : (
                  <div className="space-y-4">
                    {pendingApplications.map((app) => (
                      <div key={app.id} className="flex justify-between items-center border-b pb-4">
                        <div>
                          <p className="font-medium">{app.userName || '未知用户'}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {app.userEmail} · {new Date(app.appliedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleApprove(app.userId)}>
                            批准
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleReject(app.userId)}>
                            拒绝
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>成员列表</CardTitle>
                <CardDescription>查看所有星球成员</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {members.map((member) => (
                    <div key={member.userId} className="flex justify-between items-center border-b pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{member.userName || '未知用户'}</p>
                          <Badge>
                            {member.role === 'owner' ? '星主' : member.role === 'publisher' ? '发布者' : '跟单者'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {member.userEmail} · 加入于 {new Date(member.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        支付: {member.ticketPaid} 星球币
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
