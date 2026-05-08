'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Building2, TrendingUp, Loader2, Check, AlertCircle } from 'lucide-react';

export default function InitFinancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const handleInit = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/init-banks', { method: 'POST' });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, message: '初始化失败' });
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white p-6">
      <div className="max-w-md mx-auto mt-20">
        <div className="bg-gray-900/80 border border-gray-700/50 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold">初始化金融系统</h1>
              <p className="text-sm text-gray-400">钱庄和交易所</p>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
            <h2 className="font-medium mb-3">将初始化以下内容：</h2>
            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-yellow-500" />
                <span>5 个钱庄（聚宝庄、通宝庄、万利庄、汇源庄、瑞丰庄）</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span>3 个交易所（太白、金源、洪武）</span>
              </div>
            </div>
          </div>

          {result && (
            <div className={`mb-6 p-4 rounded-xl ${result.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              <div className="flex items-center gap-2">
                {result.success ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <span>{result.message}</span>
              </div>
            </div>
          )}

          <button
            onClick={handleInit}
            disabled={loading}
            className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-600 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                初始化中...
              </>
            ) : (
              '立即初始化'
            )}
          </button>

          {result?.success && (
            <button
              onClick={() => router.push('/finance')}
              className="w-full mt-3 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-xl transition-colors"
            >
              前往金融中心
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
