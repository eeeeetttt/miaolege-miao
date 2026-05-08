'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Building2, TrendingUp, Loader2, Check, AlertCircle, Database } from 'lucide-react';

export default function InitFinancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState<'init' | 'loading' | 'success' | 'error'>('init');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const handleCreateTables = async () => {
    setStep('loading');
    setMessage('正在创建数据库表...');
    try {
      const res = await fetch('/api/admin/create-finance-tables', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'admin123' })
      });
      const data = await res.json();
      
      if (data.success) {
        setStep('success');
        setMessage(data.message);
      } else {
        setStep('error');
        setError(data.error || data.details || '创建失败');
      }
    } catch (e) {
      setStep('error');
      setError('网络错误，请重试');
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
              <Database className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold">初始化金融系统</h1>
              <p className="text-sm text-gray-400">创建钱庄和交易所</p>
            </div>
          </div>

          {step === 'init' && (
            <>
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                <p className="text-red-400 text-sm">
                  检测到数据库中缺少钱庄和交易所表，需要先创建表结构。
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
                <h2 className="font-medium mb-3">将创建以下内容：</h2>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>4 个数据库表（banks, bank_loans, exchanges, exchange_trades）</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>5 个钱庄（聚宝庄、通宝庄、万利庄、汇源庄、瑞丰庄）</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>3 个交易所（太白、金源、洪武）</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCreateTables}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Database className="w-5 h-5" />
                创建并初始化
              </button>
            </>
          )}

          {step === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 animate-spin text-yellow-500 mx-auto mb-4" />
              <p className="text-gray-400">{message}</p>
            </div>
          )}

          {step === 'success' && (
            <>
              <div className="bg-green-500/20 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 text-green-400">
                  <Check className="w-5 h-5" />
                  <span>{message}</span>
                </div>
              </div>

              <button
                onClick={() => router.push('/finance')}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Building2 className="w-5 h-5" />
                前往金融中心
              </button>
            </>
          )}

          {step === 'error' && (
            <>
              <div className="bg-red-500/20 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              </div>

              <button
                onClick={handleCreateTables}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                重试
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
