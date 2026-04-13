'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

interface Complaint {
  id: number;
  title: string;
  content: string;
  status: 'pending' | 'replied' | 'closed';
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

export default function ComplaintPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
  });
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchComplaints = async () => {
    try {
      const res = await fetch('/api/complaint');
      const data = await res.json();
      if (data.success) {
        setComplaints(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      fetchComplaints();
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      showToast('请填写标题和内容', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/complaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        showToast('投诉提交成功', 'success');
        setFormData({ title: '', content: '' });
        setShowForm(false);
        fetchComplaints();
      } else {
        showToast(data.error || '提交失败', 'error');
      }
    } catch (err) {
      showToast('提交失败，请重试', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500">待处理</Badge>;
      case 'replied':
        return <Badge className="bg-green-500">已回复</Badge>;
      case 'closed':
        return <Badge className="bg-gray-500">已关闭</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'replied':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'closed':
        return <XCircle className="w-5 h-5 text-gray-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/user">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              返回
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-amber-500" />
            <h1 className="text-2xl font-bold">意见投诉</h1>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
              toast.type === 'success'
                ? 'bg-green-500 text-white'
                : 'bg-red-500 text-white'
            }`}
          >
            {toast.message}
          </div>
        )}

        {/* 提交投诉表单 */}
        {showForm ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>提交投诉</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">标题</label>
                  <Input
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="请输入投诉标题"
                    maxLength={200}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.title.length}/200
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">内容</label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    placeholder="请详细描述您的问题..."
                    rows={6}
                    maxLength={2000}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.content.length}/2000
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-amber-500 hover:bg-amber-600"
                  >
                    {submitting ? (
                      <>
                        <Spinner className="w-4 h-4 mr-2" />
                        提交中...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        提交投诉
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    取消
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Button
            onClick={() => setShowForm(true)}
            className="w-full mb-6 bg-amber-500 hover:bg-amber-600"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            提交投诉
          </Button>
        )}

        {/* 投诉列表 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            我的投诉 ({complaints.length})
          </h2>

          {complaints.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无投诉记录</p>
              </CardContent>
            </Card>
          ) : (
            complaints.map((complaint) => (
              <Card key={complaint.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(complaint.status)}
                      <CardTitle className="text-base">{complaint.title}</CardTitle>
                    </div>
                    {getStatusBadge(complaint.status)}
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(complaint.created_at).toLocaleString('zh-CN')}
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap">
                    {complaint.content}
                  </p>
                  {complaint.admin_reply && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-4">
                      <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                        管理员回复
                      </p>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {complaint.admin_reply}
                      </p>
                      {complaint.replied_at && (
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(complaint.replied_at).toLocaleString('zh-CN')}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
