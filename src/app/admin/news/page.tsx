'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Plus, Edit, Trash2, RefreshCw, CheckCircle2, XCircle, Calendar, User, Sparkles
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface NewsItem {
  id: number;
  title: string;
  content: string;
  author: string;
  news_date: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminNewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    author: '金查理',
    news_date: new Date().toISOString().split('T')[0],
    published: true,
  });

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/news?pageSize=50');
      const data = await res.json();
      if (data.success) {
        setNews(data.data);
      }
    } catch (err) {
      console.error('加载新闻失败:', err);
      setError('加载新闻失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const res = await fetch('/api/admin/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingNews?.id,
          ...formData,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(editingNews ? '新闻已更新' : '新闻已创建');
        setDialogOpen(false);
        setEditingNews(null);
        resetForm();
        loadNews();
      } else {
        setError(data.error || '保存失败');
      }
    } catch (err) {
      console.error('保存失败:', err);
      setError('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: NewsItem) => {
    setEditingNews(item);
    setFormData({
      title: item.title,
      content: item.content,
      author: item.author,
      news_date: item.news_date,
      published: item.published,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这篇新闻吗？')) return;

    try {
      const res = await fetch(`/api/admin/news?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSuccess('新闻已删除');
        loadNews();
      } else {
        setError(data.error || '删除失败');
      }
    } catch (err) {
      console.error('删除失败:', err);
      setError('删除失败');
    } finally {
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError('');

      const res = await fetch('/api/news/generate', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setSuccess(data.message || '新闻生成成功');
        loadNews();
      } else {
        setError(data.error || '生成失败');
      }
    } catch (err) {
      console.error('生成失败:', err);
      setError('生成失败');
    } finally {
      setGenerating(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      author: '金查理',
      news_date: new Date().toISOString().split('T')[0],
      published: true,
    });
  };

  const openNewDialog = () => {
    resetForm();
    setEditingNews(null);
    setDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>新闻管理</CardTitle>
              <CardDescription>管理金查理伦敦金日报</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleGenerate} disabled={generating} variant="outline">
                {generating ? <Spinner className="w-4 h-4 mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                AI生成今日新闻
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openNewDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    新建新闻
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingNews ? '编辑新闻' : '新建新闻'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">标题</label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="输入新闻标题"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">日期</label>
                        <Input
                          type="date"
                          value={formData.news_date}
                          onChange={(e) => setFormData({ ...formData, news_date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">作者</label>
                        <Input
                          value={formData.author}
                          onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">内容</label>
                      <Textarea
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        placeholder="输入新闻内容"
                        rows={12}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="published"
                        checked={formData.published}
                        onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                        className="rounded"
                      />
                      <label htmlFor="published" className="text-sm">立即发布</label>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        取消
                      </Button>
                      <Button onClick={handleSubmit} disabled={saving}>
                        {saving ? <Spinner className="w-4 h-4 mr-2" /> : null}
                        保存
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">{success}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : news.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">暂无新闻，点击上方按钮创建</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {news.map((item) => (
            <Card key={item.id} className={!item.published ? 'opacity-60' : ''}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium truncate">{item.title}</h3>
                      <Badge variant={item.published ? 'default' : 'secondary'}>
                        {item.published ? '已发布' : '草稿'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {item.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.news_date)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {item.content.substring(0, 150)}...
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
