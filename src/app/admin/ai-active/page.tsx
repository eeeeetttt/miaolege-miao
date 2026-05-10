'use client';

import { useState, useEffect } from 'react';

export default function AIActiveAdmin() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('init');

  const handleAction = async (action: string) => {
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/cron/ai-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage(data.message);
        if (data.results) {
          console.log('Results:', data.results);
        }
        if (data.aiUsers) {
          setStatus(data);
        }
      } else {
        setMessage(data.error || '操作失败');
      }
    } catch (error) {
      setMessage('请求失败: ' + String(error));
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cron/ai-active');
      const data = await res.json();
      setStatus(data);
      if (data.success) {
        setMessage('状态已更新');
      }
    } catch (error) {
      setMessage('获取状态失败: ' + String(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-yellow-400">AI自主行为管理系统</h1>

        {/* Tab导航 */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'init', label: '初始化AI用户' },
            { id: 'join', label: '报名挑战赛' },
            { id: 'trade', label: '执行交易' },
            { id: 'status', label: '查看状态' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-yellow-500 text-black font-semibold'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 消息提示 */}
        {message && (
          <div className="mb-6 p-4 bg-blue-900/50 border border-blue-500 rounded-lg">
            {message}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {activeTab === 'init' && '初始化AI用户'}
            {activeTab === 'join' && '批量报名挑战赛'}
            {activeTab === 'trade' && '执行AI交易'}
            {activeTab === 'status' && 'AI用户状态'}
          </h2>

          {activeTab === 'init' && (
            <div className="space-y-4">
              <p className="text-gray-300">
                创建10个AI交易员用户，每个用户初始金币: <span className="text-yellow-400 font-bold">100,000</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleAction('init')}
                  disabled={loading}
                  className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-semibold disabled:opacity-50"
                >
                  {loading ? '初始化中...' : '初始化AI用户'}
                </button>
                <button
                  onClick={checkStatus}
                  disabled={loading}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg disabled:opacity-50"
                >
                  刷新状态
                </button>
              </div>
            </div>
          )}

          {activeTab === 'join' && (
            <div className="space-y-4">
              <p className="text-gray-300">
                让所有AI用户报名K线征途挑战赛（每人扣除1000金币报名费）
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleAction('join_challenge')}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold disabled:opacity-50"
                >
                  {loading ? '报名中...' : '批量报名'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'trade' && (
            <div className="space-y-4">
              <p className="text-gray-300">
                让AI用户执行交易（每次交易根据风险等级产生随机盈亏）
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleAction('trade')}
                  disabled={loading}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold disabled:opacity-50"
                >
                  {loading ? '交易中...' : '执行交易'}
                </button>
                <button
                  onClick={() => handleAction('trade')}
                  disabled={loading}
                  className="px-6 py-3 bg-orange-600 hover:bg-orange-500 rounded-lg font-semibold disabled:opacity-50"
                >
                  模拟交易（100%执行）
                </button>
              </div>
            </div>
          )}

          {activeTab === 'status' && (
            <div className="space-y-4">
              <p className="text-gray-300">查看所有AI用户的当前状态</p>
              <button
                onClick={checkStatus}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold disabled:opacity-50"
              >
                {loading ? '加载中...' : '刷新状态'}
              </button>
            </div>
          )}
        </div>

        {/* AI状态列表 */}
        {status?.aiUsers && (
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">AI用户状态</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4">AI名称</th>
                    <th className="text-left py-3 px-4">金币</th>
                    <th className="text-left py-3 px-4">交易风格</th>
                    <th className="text-left py-3 px-4">挑战状态</th>
                    <th className="text-left py-3 px-4">账户余额</th>
                  </tr>
                </thead>
                <tbody>
                  {status.aiUsers.map((user: any, index: number) => (
                    <tr key={index} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="py-3 px-4 font-semibold text-yellow-400">{user.name}</td>
                      <td className="py-3 px-4">{user.coins?.toLocaleString()}</td>
                      <td className="py-3 px-4">{user.tradingStyle}</td>
                      <td className="py-3 px-4">
                        {user.registration ? (
                          <span className={`px-2 py-1 rounded text-xs ${
                            user.registration.status === 'active' ? 'bg-green-600' :
                            user.registration.status === 'pending' ? 'bg-yellow-600' :
                            user.registration.status === 'completed' ? 'bg-blue-600' :
                            user.registration.status === 'failed' ? 'bg-red-600' :
                            'bg-gray-600'
                          }`}>
                            {user.registration.status}
                          </span>
                        ) : (
                          <span className="text-gray-500">未报名</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {user.account ? (
                          <span className={user.account.balance >= 2000 ? 'text-green-400' :
                            user.account.balance < 100 ? 'text-red-400' : ''}>
                            {parseFloat(user.account.balance).toFixed(2)} 银两
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 说明 */}
        <div className="mt-6 bg-gray-800/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-300">功能说明</h3>
          <ul className="space-y-2 text-gray-400 text-sm">
            <li>• <strong className="text-white">初始化AI用户</strong>：创建10个AI交易员，每个初始100,000金币</li>
            <li>• <strong className="text-white">报名挑战赛</strong>：让AI用户报名K线征途，扣除1000金币报名费</li>
            <li>• <strong className="text-white">执行交易</strong>：AI用户根据各自的风险等级和交易风格进行模拟交易</li>
            <li>• <strong className="text-white">Bug报告</strong>：AI遇到问题时会自动通过私信向管理员报告</li>
            <li>• <strong className="text-white">通关条件</strong>：账户余额达到2000银两即为通关，获得5000金币奖励</li>
            <li>• <strong className="text-white">失败条件</strong>：账户余额低于100银两即为失败</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
