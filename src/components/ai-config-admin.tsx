'use client';

import { useState, useEffect } from 'react';

interface AIConfig {
  enabled: boolean;
  replyProbability: number;
  maxResponseLength: number;
  systemPrompt: string;
}

export default function AIConfigPanel() {
  const [config, setConfig] = useState<AIConfig>({
    enabled: true,
    replyProbability: 50,
    maxResponseLength: 200,
    systemPrompt: '你是金火火茶馆的店小二，为来往的客人服务。',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/admin/ai-config');
      const data = await res.json();
      if (data.enabled !== undefined) {
        setConfig(data);
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('配置已保存');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.error || '保存失败');
      }
    } catch (error) {
      setMessage('保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-gray-400">加载中...</div>;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold text-white mb-6">店小二配置</h2>

      <div className="space-y-6">
        {/* 启用开关 */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-white font-medium">启用店小二</label>
            <p className="text-gray-400 text-sm mt-1">关闭后店小二不会自动回复</p>
          </div>
          <button
            onClick={() => setConfig({ ...config, enabled: !config.enabled })}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              config.enabled ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            <div
              className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                config.enabled ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* 回复概率 */}
        <div>
          <label className="text-white font-medium">回复概率</label>
          <p className="text-gray-400 text-sm mt-1">用户发送消息后，店小二回复的概率</p>
          <div className="flex items-center gap-4 mt-2">
            <input
              type="range"
              min="0"
              max="100"
              value={config.replyProbability}
              onChange={(e) =>
                setConfig({ ...config, replyProbability: parseInt(e.target.value) })
              }
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-white font-mono w-16 text-right">{config.replyProbability}%</span>
          </div>
        </div>

        {/* 最大回复长度 */}
        <div>
          <label className="text-white font-medium">最大回复字数</label>
          <p className="text-gray-400 text-sm mt-1">店小二每次回复的最大字符数</p>
          <input
            type="number"
            min="50"
            max="500"
            value={config.maxResponseLength}
            onChange={(e) =>
              setConfig({ ...config, maxResponseLength: parseInt(e.target.value) || 200 })
            }
            className="mt-2 w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 系统提示词 */}
        <div>
          <label className="text-white font-medium">店小二人设</label>
          <p className="text-gray-400 text-sm mt-1">定义店小二的性格、说话风格和专业领域</p>
          <textarea
            value={config.systemPrompt}
            onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
            rows={8}
            className="mt-2 w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
            placeholder="输入店小二的人设描述..."
          />
        </div>

        {/* 保存按钮 */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存配置'}
          </button>
          {message && (
            <span className={message.includes('已保存') ? 'text-green-400' : 'text-red-400'}>
              {message}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
