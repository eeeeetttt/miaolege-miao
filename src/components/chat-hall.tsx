'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Users, 
  AlertCircle, 
  Clock
} from 'lucide-react';

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

// 店小二配置
const DIAN_XIAO_ER = {
  user_id: 'dianxiaoer_001',
  user_name: '店小二',
  is_system: 0,
  is_premium: 1,
};

// 店小二的系统提示词
const SYSTEM_PROMPT = `你是金火火茶馆的店小二，为来往的客人服务。

性格特点：
- 热情好客，说话亲切有礼貌
- 熟悉各种EA交易工具和策略
- 善于用简洁易懂的语言解释复杂问题
- 可以适当使用口语化的表达
- 如果客人询问关于EA、MT4/MT5、交易策略等问题，给出专业且实用的建议

对话风格：
- 自称"小二"或"小的"
- 称呼客人为"客官"
- 语气热情但不过分谄媚
- 遇到不懂的问题会诚实说不知道

当前茶馆提供的产品：
- EA智能交易机器人（趋势型、震荡型、马丁型等）
- 技术指标
- 脚本工具
- 支持MT4和MT5平台

请用简洁友好的方式回复，不要太长，保持对话自然流畅。`;

export function ChatHall() {
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
  const [isOpen, setIsOpen] = useState(true);
  const [openTimeStart, setOpenTimeStart] = useState<string | null>(null);
  const [openTimeEnd, setOpenTimeEnd] = useState<string | null>(null);
  const [aiTyping, setAiTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]); // 使用 ref 存储最新消息

  const userRole = session?.user?.role as string | undefined;
  const isPremium = userRole === 'premium' || userRole === 'vip' || userRole === 'admin';
  const currentUserId = session?.user?.id as string | undefined;
  const currentUserName = session?.user?.name || '匿名用户';

  // 加载聊天室消息
  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/chat-hall');
      const data = await res.json();
      if (data.success) {
        setMessages(data.data || []);
        messagesRef.current = data.data || []; // 更新 ref
        setIsMuted(data.userStatus?.isMuted || false);
        setMuteExpiresAt(data.userStatus?.muteExpiresAt);
        setRemainingCount(data.userStatus?.remainingCount ?? 3);
        if (data.config) {
          setHourlyLimit(data.config.hourlyLimit || 3);
          setIsOpen(data.config.isOpen !== false);
          setOpenTimeStart(data.config.openTimeStart);
          setOpenTimeEnd(data.config.openTimeEnd);
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
  }, []);

  useEffect(() => {
    loadMessages();
    // 每10秒刷新一次
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 调用AI回复
  const getAIResponse = async (userMessage: string) => {
    try {
      // 使用 ref 获取最新的消息历史
      const recentMessages = messagesRef.current.slice(-10);
      const chatMessages = recentMessages.map(msg => ({
        role: msg.user_id === DIAN_XIAO_ER.user_id ? 'assistant' : 'user',
        content: `${msg.user_name}说：${msg.content}`
      }));
      chatMessages.push({ role: 'user', content: userMessage });

      console.log('[店小二] 正在获取AI回复...');

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatMessages }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'AI服务暂时不可用');
      }

      // 处理流式响应
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  aiContent += parsed.content;
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }
      }

      console.log('[店小二] AI回复内容:', aiContent);
      return aiContent;
    } catch (err) {
      console.error('[店小二] AI响应错误:', err);
      return null;
    }
  };

  // 保存AI消息到数据库
  const saveAIMessage = async (content: string) => {
    try {
      console.log('[店小二] 保存消息到数据库:', content);
      const res = await fetch('/api/chat-hall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content,
          isAIMessage: true,
          aiUserId: DIAN_XIAO_ER.user_id,
          aiUserName: DIAN_XIAO_ER.user_name,
        }),
      });
      const data = await res.json();
      console.log('[店小二] 保存结果:', data);
      return data.success;
    } catch (err) {
      console.error('[店小二] 保存消息错误:', err);
      return false;
    }
  };

  // 检查是否需要AI回复（只针对@店小二或明确的提问）
  const shouldAIReply = (content: string): boolean => {
    const trimmedContent = content.trim();
    // 只在明确@店小二时回复
    return trimmedContent.includes('@店小二');
  };

  // 发送聊天室消息
  const handleSend = async () => {
    if (!newMessage.trim() || sending || isMuted || remainingCount <= 0) return;

    setSending(true);
    setError('');
    
    const messageContent = newMessage.trim();
    setNewMessage('');

    // 记录是否需要AI回复
    const needAI = shouldAIReply(messageContent);
    console.log('[发送消息]', messageContent, '需要AI回复:', needAI);

    try {
      const res = await fetch('/api/chat-hall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageContent }),
      });
      const data = await res.json();

      if (data.success) {
        await loadMessages();
        
        // 如果需要AI回复
        if (needAI && !aiTyping) {
          setAiTyping(true);
          
          // 延迟一下再请求，让用户看到消息已发送
          setTimeout(async () => {
            console.log('[店小二] 开始获取AI回复...');
            const response = await getAIResponse(messageContent);
            
            if (response && response.trim()) {
              console.log('[店小二] 获取到回复，准备保存...');
              const saved = await saveAIMessage(response);
              if (saved) {
                console.log('[店小二] 保存成功，刷新消息列表');
                await loadMessages();
              }
            } else {
              console.log('[店小二] 未获取到有效回复');
            }
            
            setAiTyping(false);
          }, 1000);
        }
      } else if (res.status === 429) {
        // 429 错误时也更新剩余次数
        if (data.remainingCount !== undefined) {
          setRemainingCount(data.remainingCount);
        }
        if (data.hourlyLimit !== undefined) {
          setHourlyLimit(data.hourlyLimit);
        }
        setError(data.error || '发言次数已用完');
        setRemainingCount(0);
      } else if (res.status === 403) {
        setIsMuted(true);
        setError(data.error || '您已被禁言');
      } else {
        setError(data.error || '发送失败');
        setNewMessage(messageContent); // 恢复消息
      }
    } catch (err) {
      console.error('Send message error:', err);
      setError('发送失败，请重试');
      setNewMessage(messageContent); // 恢复消息
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
    if (msg.user_id === DIAN_XIAO_ER.user_id) {
      return 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800';
    }
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
    if (msg.user_id === DIAN_XIAO_ER.user_id) {
      return 'text-amber-600 dark:text-amber-400 font-semibold';
    }
    if (msg.is_system === 1) {
      return 'text-amber-600 dark:text-amber-400 font-semibold';
    }
    if (msg.is_premium === 1) {
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
          {isOpen ? (
            <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span>
              开放中
            </Badge>
          ) : (
            <Badge variant="secondary" className="ml-2 bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <span className="w-2 h-2 rounded-full bg-gray-400 mr-1"></span>
              休息中
            </Badge>
          )}
          {aiTyping && (
            <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <Spinner className="w-3 h-3 mr-1" />
              店小二回复中...
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
            {openTimeStart && openTimeEnd && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {openTimeStart} - {openTimeEnd}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* 聊天区域 */}
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
                <p className="text-xs mt-2">可以@店小二 提问哦</p>
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                className={`rounded-lg p-3 ${getMessageStyle(msg)}`}
              >
                {msg.is_system === 1 ? (
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
                  <div className="flex items-start gap-2">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      {msg.user_id === DIAN_XIAO_ER.user_id ? (
                        <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-500 text-white text-xs">
                          店
                        </AvatarFallback>
                      ) : msg.is_premium === 1 ? (
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                          {msg.user_name.slice(0, 1)}
                        </AvatarFallback>
                      ) : (
                        <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-xs">
                          {msg.user_name.slice(0, 1)}
                        </AvatarFallback>
                      )}
                      {msg.user_avatar && <AvatarImage src={msg.user_avatar} />}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${getUserNameStyle(msg)}`}>
                          {msg.user_name}
                          {msg.is_premium === 1 && msg.user_id !== DIAN_XIAO_ER.user_id && (
                            <Badge variant="secondary" className="ml-1 text-xs py-0 px-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                              VIP
                            </Badge>
                          )}
                        </span>
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
          {!isOpen ? (
            <div className="text-center text-gray-500 py-4">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">聊天室休息中</p>
              {openTimeStart && openTimeEnd && (
                <p className="text-xs mt-1">
                  开放时间: {openTimeStart} - {openTimeEnd}
                </p>
              )}
            </div>
          ) : isMuted ? (
            <div className="text-center text-gray-500 py-4">
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
                  placeholder={remainingCount <= 0 ? '今日发言次数已用完' : '输入消息...（@店小二 提问）'}
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
