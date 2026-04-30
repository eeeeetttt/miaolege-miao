'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/card';
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

// Canvas火焰背景组件
function FireCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationId: number;
    
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    
    resize();
    window.addEventListener('resize', resize);
    
    // 火焰粒子
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      hue: number;
    }> = [];
    
    const createParticle = () => {
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -Math.random() * 2 - 1,
        size: Math.random() * 3 + 1,
        alpha: Math.random() * 0.5 + 0.3,
        hue: Math.random() * 30 + 15 // 火焰色：15-45（橙到黄）
      });
    };
    
    const animate = () => {
      ctx.fillStyle = 'rgba(20, 10, 5, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 随机生成粒子
      if (Math.random() < 0.3) {
        createParticle();
      }
      
      // 更新和绘制粒子
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.003;
        p.size *= 0.99;
        
        if (p.alpha <= 0 || p.y < 0 || p.size < 0.5) {
          particles.splice(i, 1);
          continue;
        }
        
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        gradient.addColorStop(0, `hsla(${p.hue}, 100%, 70%, ${p.alpha})`);
        gradient.addColorStop(0.5, `hsla(${p.hue}, 100%, 50%, ${p.alpha * 0.5})`);
        gradient.addColorStop(1, `hsla(${p.hue}, 100%, 30%, 0)`);
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }
      
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);
  
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: 'none' }}
    />
  );
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
  const [hourlyLimit, setHourlyLimit] = useState(30);
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
        setRemainingCount(data.userStatus?.remainingCount ?? 30);
        if (data.config) {
          setHourlyLimit(data.config.hourlyLimit || 30);
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
    // 每3秒刷新一次，确保能及时看到AI回复
    const interval = setInterval(loadMessages, 3000);
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

  // 获取消息样式 - 篝火夜谈风格
  const getMessageStyle = (msg: ChatMessage) => {
    if (msg.user_id === DIAN_XIAO_ER.user_id) {
      return 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-md border border-amber-500/30';
    }
    if (msg.is_system === 1) {
      return 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-md border border-amber-500/30';
    }
    if (msg.is_premium === 1) {
      return 'bg-gradient-to-r from-purple-500/15 to-pink-500/15 backdrop-blur-md border border-purple-500/30';
    }
    // 普通用户 - 透明磨砂效果
    return 'bg-white/10 dark:bg-gray-900/30 backdrop-blur-md border border-white/20 dark:border-gray-700/30';
  };

  // 获取用户名样式
  const getUserNameStyle = (msg: ChatMessage) => {
    if (msg.user_id === DIAN_XIAO_ER.user_id) {
      return 'text-amber-300 font-semibold';
    }
    if (msg.is_system === 1) {
      return 'text-amber-300 font-semibold';
    }
    if (msg.is_premium === 1) {
      const colors = [
        'text-pink-400',
        'text-purple-400',
        'text-blue-400',
        'text-green-400',
        'text-amber-400',
        'text-red-400',
      ];
      const colorIndex = msg.user_id.charCodeAt(0) % colors.length;
      return `${colors[colorIndex]} font-semibold`;
    }
    return 'text-gray-200';
  };

  return (
    <div className="relative h-full rounded-2xl overflow-hidden" style={{
      background: 'linear-gradient(135deg, rgba(40, 20, 10, 0.95) 0%, rgba(20, 10, 5, 0.98) 100%)',
      boxShadow: 'inset 0 0 100px rgba(255, 150, 50, 0.1), 0 0 50px rgba(255, 100, 50, 0.2)'
    }}>
      {/* 火焰背景 */}
      <FireCanvas />
      
      {/* 顶部标题栏 */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/30 backdrop-blur-sm flex items-center justify-center border border-amber-500/30">
            <Users className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-amber-100">茶馆·闲聊室</h2>
            <div className="flex items-center gap-2 mt-0.5">
              {isOpen ? (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                  开放中
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                  休息中
                </span>
              )}
              {aiTyping && (
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <Spinner className="w-3 h-3" />
                  店小二回复中...
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {openTimeStart && openTimeEnd && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {openTimeStart} - {openTimeEnd}
            </span>
          )}
        </div>
      </div>

      {/* 聊天区域 */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-3 h-[calc(100%-140px)]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Users className="w-8 h-8 text-amber-400/50" />
              </div>
              <p className="text-amber-200/70">围坐在篝火旁，畅所欲言</p>
              <p className="text-xs mt-2 text-gray-500">暂无消息，快来发言吧</p>
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`rounded-xl p-3 ${getMessageStyle(msg)}`}
            >
              {msg.is_system === 1 ? (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 border border-amber-500/30">
                    <span className="text-sm">📢</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-amber-200 whitespace-pre-wrap">
                      {msg.content}
                    </p>
                    <p className="text-xs text-amber-400/50 mt-1">
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <Avatar className="w-8 h-8 flex-shrink-0 ring-2 ring-amber-500/20">
                    {msg.user_id === DIAN_XIAO_ER.user_id ? (
                      <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-500 text-white text-xs">
                        店
                      </AvatarFallback>
                    ) : msg.is_premium === 1 ? (
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                        {msg.user_name.slice(0, 1)}
                      </AvatarFallback>
                    ) : (
                      <AvatarFallback className="bg-white/20 text-white text-xs">
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
                          <Badge variant="secondary" className="ml-1 text-xs py-0 px-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                            VIP
                          </Badge>
                        )}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                    <p className={`text-sm mt-1 whitespace-pre-wrap ${
                      msg.is_premium === 1 ? 'font-medium text-gray-100' : 'text-gray-200'
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
        <div className="relative z-10 px-4 py-2 bg-red-500/20 border-t border-red-500/30">
          <p className="text-sm text-red-300 flex items-center gap-2">
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
      <div className="relative z-10 p-4 border-t border-amber-500/20" style={{
        background: 'linear-gradient(to top, rgba(30, 15, 5, 0.9), rgba(30, 15, 5, 0.6))'
      }}>
        {!isOpen ? (
          <div className="text-center text-gray-400 py-4">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">聊天室休息中</p>
            {openTimeStart && openTimeEnd && (
              <p className="text-xs mt-1 text-amber-400/50">
                开放时间: {openTimeStart} - {openTimeEnd}
              </p>
            )}
          </div>
        ) : isMuted ? (
          <div className="text-center text-gray-400 py-4">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">您已被禁言，无法发言</p>
            {muteExpiresAt && (
              <p className="text-xs mt-1 text-amber-400/50">
                解封时间: {new Date(muteExpiresAt).toLocaleString()}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="围坐在篝火旁..."
                disabled={sending}
                maxLength={500}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-amber-500/30 text-white placeholder-gray-400 focus:outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-500/20 transition-all disabled:opacity-50"
              />
              <Button
                onClick={handleSend}
                disabled={sending || !newMessage.trim() || remainingCount <= 0}
                className={`rounded-xl ${
                  isPremium 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600' 
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                }`}
              >
                {sending ? <Spinner className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            {/* 剩余次数提示 */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">
                剩余发言: <span className="text-amber-400">{remainingCount}</span> / {hourlyLimit}
              </span>
              <span className="text-gray-500">@店小二 获得AI回复</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
