'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Database, 
  Server, 
  Settings,
  Shield,
  Key,
  ExternalLink,
  Copy,
  CheckCircle
} from 'lucide-react';

interface DiagnosticsData {
  timestamp: string;
  environment: {
    NODE_ENV: string;
    MYSQL_HOST: { set: boolean; value: string };
    MYSQL_PORT: { set: boolean; value: string };
    MYSQL_USER: { set: boolean; value: string };
    MYSQL_PASSWORD: { set: boolean; value: string; length: number };
    MYSQL_DATABASE: { set: boolean; value: string };
    NEXTAUTH_URL: { set: boolean; value: string };
    NEXTAUTH_SECRET: { set: boolean };
  };
  connection: {
    success: boolean;
    error?: string;
    errorCode?: string;
    errorSqlMessage?: string;
    serverVersion?: string;
    connectionId?: number;
  };
  suggestions: string[];
}

export default function DiagnosePage() {
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const checkHealth = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/debug-db');
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError('无法连接到服务器，请检查服务是否正常运行');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusIcon = (status: boolean | undefined) => {
    if (status === true) return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    if (status === false) return <XCircle className="w-5 h-5 text-red-500" />;
    return <AlertCircle className="w-5 h-5 text-yellow-500" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            数据库连接诊断
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            详细检查数据库配置和连接状态
          </p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-purple-600 mb-4" />
              <p className="text-gray-600">正在诊断中...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-red-200">
            <CardContent className="py-8 text-center">
              <XCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
              <h2 className="text-xl font-semibold text-red-600 mb-2">连接失败</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={checkHealth}>
                <RefreshCw className="w-4 h-4 mr-2" />
                重新检查
              </Button>
            </CardContent>
          </Card>
        ) : data ? (
          <div className="space-y-6">
            {/* 连接状态总览 */}
            <Card className={data.connection.success ? 'border-green-200' : 'border-red-200'}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    数据库连接状态
                  </CardTitle>
                  <Badge className={data.connection.success ? 'bg-green-500' : 'bg-red-500'}>
                    {data.connection.success ? '已连接' : '连接失败'}
                  </Badge>
                </div>
                <CardDescription>
                  检查时间: {new Date(data.timestamp).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.connection.success ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>数据库连接成功！</span>
                    </div>
                    {data.connection.serverVersion && (
                      <p className="text-sm text-gray-600">
                        MySQL 版本: {data.connection.serverVersion}
                      </p>
                    )}
                    {data.connection.connectionId && (
                      <p className="text-sm text-gray-600">
                        连接 ID: {data.connection.connectionId}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200">
                      <p className="text-red-700 dark:text-red-400 font-medium mb-2">
                        错误代码: {data.connection.errorCode || '未知'}
                      </p>
                      <p className="text-red-600 dark:text-red-300 text-sm">
                        {data.connection.error}
                      </p>
                      {data.connection.errorSqlMessage && (
                        <p className="text-red-600 dark:text-red-300 text-sm mt-2">
                          SQL消息: {data.connection.errorSqlMessage}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 环境变量配置 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  环境变量配置
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { key: 'MYSQL_HOST', data: data.environment.MYSQL_HOST, hasValue: true },
                    { key: 'MYSQL_PORT', data: data.environment.MYSQL_PORT, hasValue: true },
                    { key: 'MYSQL_USER', data: data.environment.MYSQL_USER, hasValue: true },
                    { key: 'MYSQL_PASSWORD', data: data.environment.MYSQL_PASSWORD, hasValue: true, showLength: true },
                    { key: 'MYSQL_DATABASE', data: data.environment.MYSQL_DATABASE, hasValue: true },
                    { key: 'NEXTAUTH_URL', data: data.environment.NEXTAUTH_URL, hasValue: true },
                    { key: 'NEXTAUTH_SECRET', data: data.environment.NEXTAUTH_SECRET, hasValue: false },
                  ].map((item) => {
                    const envData = item.data as { set: boolean; value?: string; length?: number };
                    return (
                      <div key={item.key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(envData.set)}
                          <span className="font-mono text-sm">{item.key}</span>
                        </div>
                        <div className="text-right">
                          {item.hasValue && envData.value ? (
                            <div className="text-right">
                              <span className="text-gray-600 dark:text-gray-400 text-sm">{envData.value}</span>
                              {item.showLength && envData.length && envData.length > 0 && (
                                <span className="text-gray-400 text-xs ml-2">({envData.length}字符)</span>
                              )}
                            </div>
                          ) : (
                            <span className={envData.set ? 'text-green-600' : 'text-red-600'}>
                              {envData.set ? '已设置' : '未设置'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 解决方案建议 */}
            {data.suggestions.length > 0 && (
              <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                    <AlertCircle className="w-5 h-5" />
                    解决方案建议
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {data.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start gap-2 text-yellow-800 dark:text-yellow-200">
                        <span className="text-yellow-500 mt-1">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* 腾讯云数据库配置说明 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  腾讯云数据库配置指南
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>重要提示</AlertTitle>
                  <AlertDescription>
                    腾讯云TDSQL-C需要在安全组中添加白名单才能访问
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <h4 className="font-semibold">1. 配置安全组白名单</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li>登录腾讯云控制台，进入 TDSQL-C 实例详情</li>
                    <li>点击「安全组」选项卡</li>
                    <li>添加入站规则，允许部署服务器的IP访问</li>
                    <li>或添加 <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">0.0.0.0/0</code> 允许所有IP（不推荐生产环境）</li>
                  </ol>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">2. NEXTAUTH_URL 配置</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    NEXTAUTH_URL 应该设置为您的网站完整地址，例如：
                  </p>
                  <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <code className="text-sm flex-1">https://您的域名.com</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard('https://您的域名.com')}
                    >
                      {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">3. 常见错误代码</h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex gap-2">
                      <code className="bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded text-red-600">ETIMEDOUT</code>
                      <span className="text-gray-600">- 连接超时，检查安全组白名单</span>
                    </div>
                    <div className="flex gap-2">
                      <code className="bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded text-red-600">ER_ACCESS_DENIED</code>
                      <span className="text-gray-600">- 用户名或密码错误</span>
                    </div>
                    <div className="flex gap-2">
                      <code className="bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded text-red-600">ER_BAD_DB_ERROR</code>
                      <span className="text-gray-600">- 数据库不存在</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 操作按钮 */}
            <div className="flex justify-center gap-4">
              <Button onClick={checkHealth} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                重新诊断
              </Button>
              <Button onClick={() => window.location.href = '/'}>
                返回首页
              </Button>
              <Button variant="outline" asChild>
                <a href="https://console.cloud.tencent.com/tdsql" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  腾讯云控制台
                </a>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
