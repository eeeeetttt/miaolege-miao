'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Database, Server, Settings } from 'lucide-react';

interface HealthStatus {
  status: string;
  timestamp: string;
  database: {
    configured: boolean;
    connected: boolean;
    host?: string;
    port?: string;
    database?: string;
    error?: string;
  };
  env: {
    MYSQL_HOST: boolean;
    MYSQL_USER: boolean;
    MYSQL_PASSWORD: boolean;
    MYSQL_DATABASE: boolean;
  };
  message?: string;
  solution?: string;
}

export default function DiagnosePage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const checkHealth = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      setError('无法连接到服务器，请检查服务是否正常运行');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const getStatusIcon = (status: boolean | undefined) => {
    if (status === true) {
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    } else if (status === false) {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
    return <AlertCircle className="w-5 h-5 text-yellow-500" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ok':
        return <Badge className="bg-green-500">正常</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500">警告</Badge>;
      case 'error':
        return <Badge className="bg-red-500">错误</Badge>;
      default:
        return <Badge variant="secondary">检查中</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            系统诊断
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            检查系统配置和数据库连接状态
          </p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-purple-600 mb-4" />
              <p className="text-gray-600">正在检查系统状态...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-red-200">
            <CardContent className="py-8">
              <div className="text-center">
                <XCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                <h2 className="text-xl font-semibold text-red-600 mb-2">连接失败</h2>
                <p className="text-gray-600 mb-4">{error}</p>
                <Button onClick={checkHealth}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重新检查
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : health ? (
          <div className="space-y-6">
            {/* 总体状态 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    系统状态
                  </CardTitle>
                  {getStatusBadge(health.status)}
                </div>
                <CardDescription>
                  检查时间: {new Date(health.timestamp).toLocaleString()}
                </CardDescription>
              </CardHeader>
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
                <div className="space-y-3">
                  {Object.entries(health.env).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <span className="font-mono text-sm">{key}</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(value)}
                        <span className={value ? 'text-green-600' : 'text-red-600'}>
                          {value ? '已配置' : '未配置'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 数据库连接 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  数据库连接
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">主机</p>
                      <p className="font-mono">{health.database.host || '-'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">端口</p>
                      <p className="font-mono">{health.database.port || '-'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg col-span-2">
                      <p className="text-sm text-gray-500 mb-1">数据库</p>
                      <p className="font-mono">{health.database.database || '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span>配置状态</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(health.database.configured)}
                      <span className={health.database.configured ? 'text-green-600' : 'text-red-600'}>
                        {health.database.configured ? '已配置' : '未配置'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span>连接状态</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(health.database.connected)}
                      <span className={health.database.connected ? 'text-green-600' : 'text-red-600'}>
                        {health.database.connected ? '已连接' : '连接失败'}
                      </span>
                    </div>
                  </div>

                  {health.database.error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg">
                      <p className="text-red-600 text-sm">
                        <strong>错误:</strong> {health.database.error}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 消息和解决方案 */}
            {(health.message || health.solution) && (
              <Card className={health.status === 'error' ? 'border-red-200' : 'border-yellow-200'}>
                <CardContent className="pt-6">
                  {health.message && (
                    <p className="text-gray-700 dark:text-gray-300 mb-2">{health.message}</p>
                  )}
                  {health.solution && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg mt-4">
                      <p className="text-blue-700 dark:text-blue-300 text-sm">
                        <strong>解决方案:</strong> {health.solution}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 操作按钮 */}
            <div className="flex justify-center gap-4">
              <Button onClick={checkHealth} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                重新检查
              </Button>
              <Button onClick={() => window.location.href = '/'}>
                返回首页
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
