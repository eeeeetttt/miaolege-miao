'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Send, Users, Settings, AlertCircle } from 'lucide-react';

interface ChatMessage {
  id: number;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  content: string;
  is_system: number;
  is_premium: number;
  created_at: string;
}

export function ChatHall() {
  const router = useRouter();
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [muteExpiresAt, setMuteExpiresAt] = useState<string | null>(null);
  const [remainingCount, setRemainingCount] = useState(3);
  const [hourlyLimit, setHourlyLimit] = useState(3);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const userRole = session?.user?.role as string | undefined;
  const isPremium = userRole === 'premium' || userRole === 'vip' || userRole === 'admin';
  const currentUserId = session?.user?.id as string | undefined;

  // 点击用户头像/昵称进入私信
  const handleUserClick = (msg: ChatMessage) => {
    if (msg.user_id !== currentUserId && !msg.is_system) {
      router.push(`/social?section=messages&userId=${msg.user_id}&name=${encodeURIComponent(msg.user_name)}`);
    }
  };

  // 加载消息
  const loadMessages = async () => {
    try {
      const res = await fetch('/api/chat-hall');
      const data = await res.json();
      if (data.success) {
        setMessages(data.data || []);
        setIsMuted(data.userStatus?.isMuted || false);
        setMuteExpiresAt(data.userStatus?.muteExpiresAt);
        setRemainingCount(data.remainingCount ?? 3);
        if (data.config?.hourlyLimit) {
          setHourlyLimit(data.config.hourlyLimit);
        }
      } else {
        setError(data.error || '加载消息失败');
      }
    } catch (err) {
      console.error('Load messages error:', err);
      setError('加载消息失败，请刷新重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    // 每10秒刷新一次
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 发送消息
  const handleSend = async () => {
    if (!newMessage.trim() || sending || isMuted || remainingCount <= 0) return;

    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/chat-hall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setNewMessage('');
        await loadMessages();
      } else if (res.status === 429) {
        setError(data.error || '发言次数已用完');
        setRemainingCount(0);
      } else if (res.status === 403) {
        setIsMuted(true);
        setError(data.error || '您已被禁言');
      } else {
        setError(data.error || '发送失败');
      }
    } catch (err) {
      console.error('Send message error:', err);
      setError('发送失败，请重试');
    } finally {
      setSending(false);
    }
  };

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  // 获取消息样式
  const getMessageStyle = (msg: ChatMessage) => {
    if (msg.is_system === 1) {
      return 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800';
    }
    if (msg.is_premium === 1) {
      return 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800';
    }
    return 'bg-white dark:bg-gray-800';
  };

  // 获取用户名样式
  const getUserNameStyle = (msg: ChatMessage) => {
    if (msg.is_system === 1) {
      return 'text-amber-600 dark:text-amber-400 font-semibold';
    }
    if (msg.is_premium === 1) {
      // 高级会员彩色名字
      const colors = [
        'text-pink-500',
        'text-purple-500',
        'text-blue-500',
        'text-green-500',
        'text-amber-500',
        'text-red-500',
      ];
      const colorIndex = msg.user_id.charCodeAt(0) % colors.length;
      return `${colors[colorIndex]} font-semibold`;
    }
    return 'text-gray-700 dark:text-gray-300';
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="flex-row items-center justify-between pb-4 border-b">
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-500" />
          茶馆·闲聊室
        </CardTitle>
        <span className="text-xs text-gray-400">仅保留最近24小时的聊天记录</span>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Spinner />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>暂无消息，快来发言吧</p>
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                className={`rounded-lg p-3 ${getMessageStyle(msg)}`}
              >
                {msg.is_system === 1 ? (
                  // 系统消息样式
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">📢</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                        {msg.content}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                ) : (
                  // 用户消息样式
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => handleUserClick(msg)}
                      className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                      disabled={msg.user_id === currentUserId}
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className={msg.is_premium === 1 ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs' : 'bg-gray-200 dark:bg-gray-700 text-xs'}>
                          {msg.user_name.slice(0, 1)}
                        </AvatarFallback>
                        {msg.user_avatar && <AvatarImage src={msg.user_avatar} />}
                      </Avatar>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUserClick(msg)}
                          className={`text-sm ${getUserNameStyle(msg)} cursor-pointer hover:underline ${msg.user_id === currentUserId ? 'pointer-events-none' : ''}`}
                        >
                          {msg.user_name}
                          {msg.is_premium === 1 && (
                            <Badge variant="secondary" className="ml-1 text-xs py-0 px-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                              VIP
                            </Badge>
                          )}
                        </button>
                        <span className="text-xs text-gray-400">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                      <p className={`text-sm mt-0.5 whitespace-pre-wrap ${
                        msg.is_premium === 1 ? 'font-medium' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {msg.content}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
              {isMuted && muteExpiresAt && (
                <span className="text-xs">
                  解封时间: {new Date(muteExpiresAt).toLocaleString()}
                </span>
              )}
            </p>
          </div>
        )}

        {/* 输入框 */}
        <div className="p-4 border-t bg-gray-50 dark:bg-gray-800/50">
          {isMuted ? (
            <div className="text-center text-gray-500">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">您已被禁言，无法发言</p>
              {muteExpiresAt && (
                <p className="text-xs mt-1">
                  解封时间: {new Date(muteExpiresAt).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  剩余发言次数: <span className={remainingCount <= 0 ? 'text-red-500 font-bold' : remainingCount <= 1 ? 'text-amber-500 font-bold' : 'text-green-500 font-bold'}>{remainingCount}</span> / {hourlyLimit} 条
                </span>
                <span className="text-xs text-gray-400">每小时重置</span>
              </div>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder={remainingCount <= 0 ? '今日发言次数已用完' : '输入消息...'}
                  disabled={sending || remainingCount <= 0}
                  maxLength={200}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={sending || !newMessage.trim() || remainingCount <= 0}
                  className={isPremium ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600' : ''}
                >
                  {sending ? <Spinner className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
