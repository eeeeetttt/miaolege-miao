'use client';

import { useState, useEffect } from 'react';

interface AIRole {
  id: number;
  name: string;
  enabled: boolean;
  replyProbability: number;
  maxResponseLength: number;
  systemPrompt: string;
  triggerKeyword: string;
  avatarUrl: string;
  sortOrder: number;
}

export default function AIConfigPanel() {
  const [roles, setRoles] = useState<AIRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingRole, setEditingRole] = useState<AIRole | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const res = await fetch('/api/admin/ai-config');
      const data = await res.json();
      if (Array.isArray(data)) {
        setRoles(data);
      }
    } catch (error) {
      console.error('加载角色列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    const newRole: AIRole = {
      id: 0,
      name: '新角色',
      enabled: true,
      replyProbability: 50,
      maxResponseLength: 200,
      systemPrompt: '你是茶馆的工作人员，愿意帮助客人解答问题。',
      triggerKeyword: '',
      avatarUrl: '',
      sortOrder: roles.length + 1,
    };
    setEditingRole(newRole);
  };

  const handleEdit = (role: AIRole) => {
    setEditingRole({ ...role });
  };

  const handleSave = async () => {
    if (!editingRole) return;

    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editingRole.id === 0 ? 'create' : 'update',
          ...editingRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(editingRole.id === 0 ? '角色已创建' : '角色已更新');
        setEditingRole(null);
        loadRoles();
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

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个角色吗？')) return;

    try {
      const res = await fetch('/api/admin/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('角色已删除');
        loadRoles();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.error || '删除失败');
      }
    } catch (error) {
      setMessage('删除失败');
    }
  };

  const handleToggle = async (role: AIRole) => {
    const updated = { ...role, enabled: !role.enabled };
    try {
      await fetch('/api/admin/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', ...updated }),
      });
      loadRoles();
    } catch (error) {
      console.error('切换状态失败:', error);
    }
  };

  if (loading) {
    return <div className="text-gray-400">加载中...</div>;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">AI角色管理</h2>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          + 添加角色
        </button>
      </div>

      {/* 角色列表 */}
      <div className="space-y-4 mb-6">
        {roles.map((role) => (
          <div
            key={role.id}
            className={`bg-gray-700 rounded-lg p-4 ${role.enabled ? 'border-l-4 border-green-500' : 'border-l-4 border-gray-500 opacity-60'}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* 头像占位 */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                  {role.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-white font-medium">{role.name}</h3>
                  <p className="text-gray-400 text-sm">
                    回复概率: {role.replyProbability}% | 
                    最大字数: {role.maxResponseLength} |
                    {role.triggerKeyword ? ` 触发词: ${role.triggerKeyword}` : ' 无触发词'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* 启用开关 */}
                <button
                  onClick={() => handleToggle(role)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    role.enabled ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      role.enabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
                <button
                  onClick={() => handleEdit(role)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(role.id)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {roles.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          暂无AI角色，点击上方按钮添加
        </div>
      )}

      {/* 编辑弹窗 */}
      {editingRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-6">
              {editingRole.id === 0 ? '添加新角色' : '编辑角色'}
            </h3>

            <div className="space-y-6">
              {/* 角色名称 */}
              <div>
                <label className="text-white font-medium">角色名称</label>
                <input
                  type="text"
                  value={editingRole.name}
                  onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                  className="mt-1 w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="例如：店小二、茶艺师、客服小妹"
                />
              </div>

              {/* 触发关键词 */}
              <div>
                <label className="text-white font-medium">触发关键词</label>
                <p className="text-gray-400 text-sm mt-1">用户发送包含此关键词的消息时会触发该角色回复（留空则根据概率随机触发）</p>
                <input
                  type="text"
                  value={editingRole.triggerKeyword}
                  onChange={(e) => setEditingRole({ ...editingRole, triggerKeyword: e.target.value })}
                  className="mt-1 w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="@店小二"
                />
              </div>

              {/* 启用状态 */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-white font-medium">启用角色</label>
                  <p className="text-gray-400 text-sm mt-1">关闭后该角色不会自动回复</p>
                </div>
                <button
                  onClick={() => setEditingRole({ ...editingRole, enabled: !editingRole.enabled })}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    editingRole.enabled ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      editingRole.enabled ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* 回复概率 */}
              <div>
                <label className="text-white font-medium">回复概率</label>
                <p className="text-gray-400 text-sm mt-1">当用户触发该角色时，回复的概率</p>
                <div className="flex items-center gap-4 mt-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={editingRole.replyProbability}
                    onChange={(e) =>
                      setEditingRole({ ...editingRole, replyProbability: parseInt(e.target.value) })
                    }
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-white font-mono w-16 text-right">{editingRole.replyProbability}%</span>
                </div>
              </div>

              {/* 最大回复长度 */}
              <div>
                <label className="text-white font-medium">最大回复字数</label>
                <p className="text-gray-400 text-sm mt-1">该角色每次回复的最大字符数</p>
                <input
                  type="number"
                  min="50"
                  max="500"
                  value={editingRole.maxResponseLength}
                  onChange={(e) =>
                    setEditingRole({ ...editingRole, maxResponseLength: parseInt(e.target.value) || 200 })
                  }
                  className="mt-1 w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 系统提示词 */}
              <div>
                <label className="text-white font-medium">角色设定</label>
                <p className="text-gray-400 text-sm mt-1">定义该角色的性格、说话风格和专业领域</p>
                <textarea
                  value={editingRole.systemPrompt}
                  onChange={(e) => setEditingRole({ ...editingRole, systemPrompt: e.target.value })}
                  rows={6}
                  className="mt-1 w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="例如：你是金火火茶馆的店小二，性格热情好客，说话简洁友好..."
                />
              </div>

              {/* 排序 */}
              <div>
                <label className="text-white font-medium">排序权重</label>
                <p className="text-gray-400 text-sm mt-1">数值越小排序越靠前</p>
                <input
                  type="number"
                  min="0"
                  value={editingRole.sortOrder}
                  onChange={(e) =>
                    setEditingRole({ ...editingRole, sortOrder: parseInt(e.target.value) || 0 })
                  }
                  className="mt-1 w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setEditingRole(null)}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>

            {message && (
              <p className={`mt-4 text-center ${message.includes('成功') ? 'text-green-400' : 'text-red-400'}`}>
                {message}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
