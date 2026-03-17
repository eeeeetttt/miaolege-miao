'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { 
  FileText, 
  BookOpen, 
  HelpCircle, 
  TrendingUp, 
  Info,
  ChevronRight,
  Eye,
  Clock
} from 'lucide-react';

interface Document {
  id: number;
  title: string;
  slug: string;
  content: string;
  category: string;
  sortOrder: number;
  status: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_CONFIG: Record<string, { name: string; icon: any; color: string }> = {
  'getting-started': { name: '新手入门', icon: BookOpen, color: 'text-blue-500' },
  'trading': { name: '交易指南', icon: TrendingUp, color: 'text-green-500' },
  'faq': { name: '常见问题', icon: HelpCircle, color: 'text-orange-500' },
  'other': { name: '其他', icon: Info, color: 'text-purple-500' },
  'general': { name: '通用', icon: FileText, color: 'text-gray-500' },
};

export default function DocsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [docLoading, setDocLoading] = useState(false);

  const slug = searchParams.get('slug');

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (slug && documents.length > 0) {
      const doc = documents.find(d => d.slug === slug);
      if (doc) {
        fetchDocumentDetail(slug);
      }
    } else if (!slug) {
      setSelectedDoc(null);
    }
  }, [slug, documents]);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/docs');
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentDetail = async (docSlug: string) => {
    setDocLoading(true);
    try {
      const res = await fetch(`/api/docs?slug=${docSlug}`);
      const data = await res.json();
      if (data.document) {
        setSelectedDoc(data.document);
      }
    } catch (error) {
      console.error('Failed to fetch document detail:', error);
    } finally {
      setDocLoading(false);
    }
  };

  const handleDocClick = (doc: Document) => {
    router.push(`/docs?slug=${doc.slug}`);
  };

  const handleBackToList = () => {
    router.push('/docs');
  };

  // 按分类分组文档
  const groupedDocs = documents.reduce((acc, doc) => {
    const category = doc.category || 'general';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  // 简单的 Markdown 渲染
  const renderMarkdown = (content: string) => {
    return content
      .split('\n')
      .map((line, index) => {
        // 标题
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-xl font-bold mt-6 mb-3 text-gray-800 dark:text-gray-200">{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-lg font-semibold mt-4 mb-2 text-gray-700 dark:text-gray-300">{line.slice(4)}</h3>;
        }
        // 列表
        if (line.startsWith('- ')) {
          return <li key={index} className="ml-4 text-gray-600 dark:text-gray-400">{line.slice(2)}</li>;
        }
        if (line.match(/^\d+\.\s/)) {
          return <li key={index} className="ml-4 text-gray-600 dark:text-gray-400 list-decimal">{line.replace(/^\d+\.\s/, '')}</li>;
        }
        // 引用
        if (line.startsWith('> ')) {
          return <blockquote key={index} className="border-l-4 border-blue-500 pl-4 my-2 text-gray-600 dark:text-gray-400 italic">{line.slice(2)}</blockquote>;
        }
        // 代码块
        if (line.startsWith('```')) {
          return null; // 简化处理
        }
        // 代码
        if (line.startsWith('`') && line.endsWith('`')) {
          return <code key={index} className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-sm">{line.slice(1, -1)}</code>;
        }
        // 分隔线
        if (line === '---') {
          return <hr key={index} className="my-4 border-gray-200 dark:border-gray-700" />;
        }
        // 普通段落
        if (line.trim()) {
          // 处理加粗
          const boldText = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
          if (boldText !== line) {
            return <p key={index} className="text-gray-600 dark:text-gray-400 my-1" dangerouslySetInnerHTML={{ __html: boldText }} />;
          }
          return <p key={index} className="text-gray-600 dark:text-gray-400 my-1">{line}</p>;
        }
        return null;
      })
      .filter(Boolean);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Spinner className="w-8 h-8" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            文档中心
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            快速了解平台功能，开始您的跟单之旅
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* 左侧导航 */}
          <div className="lg:w-64 flex-shrink-0">
            <Card className="sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">文档目录</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <nav className="space-y-1">
                  {Object.entries(groupedDocs).map(([category, docs]) => {
                    const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['general'];
                    const Icon = config.icon;
                    return (
                      <div key={category} className="mb-3">
                        <div className={`flex items-center gap-2 text-sm font-medium ${config.color} mb-1`}>
                          <Icon className="w-4 h-4" />
                          {config.name}
                        </div>
                        {docs.map((doc) => (
                          <button
                            key={doc.id}
                            onClick={() => handleDocClick(doc)}
                            className={`w-full text-left text-sm px-3 py-1.5 rounded transition-colors ${
                              selectedDoc?.id === doc.id
                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                          >
                            {doc.title}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* 右侧内容区 */}
          <div className="flex-1 min-w-0">
            {selectedDoc ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={handleBackToList}>
                      <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
                      返回列表
                    </Button>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {selectedDoc.viewCount || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(selectedDoc.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <CardTitle className="text-2xl mt-2">{selectedDoc.title}</CardTitle>
                  <CardDescription>
                    <Badge variant="outline" className="mt-2">
                      {CATEGORY_CONFIG[selectedDoc.category]?.name || '通用'}
                    </Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {docLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Spinner className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="prose dark:prose-invert max-w-none">
                      {renderMarkdown(selectedDoc.content)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedDocs).map(([category, docs]) => {
                  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['general'];
                  const Icon = config.icon;
                  return (
                    <Card key={category}>
                      <CardHeader className="pb-3">
                        <CardTitle className={`flex items-center gap-2 text-lg ${config.color}`}>
                          <Icon className="w-5 h-5" />
                          {config.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-3">
                          {docs.map((doc) => (
                            <button
                              key={doc.id}
                              onClick={() => handleDocClick(doc)}
                              className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left group"
                            >
                              <div>
                                <h3 className="font-medium text-gray-800 dark:text-gray-200 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                                  {doc.title}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                                  {doc.content.slice(0, 80).replace(/[#*`]/g, '')}...
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-400">
                                  {doc.viewCount || 0} 次浏览
                                </span>
                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-500" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
