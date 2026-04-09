'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserCardSkeleton } from '@/components/loading-skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Wallet, 
  User as UserIcon, 
  Link2, 
  Unlink, 
  CheckCircle2,
  XCircle,
  AlertCircle,
  Coins,
  Shield,
  Camera,
  Edit3,
  Clock,
  Gift,
  Zap,
  Globe,
  TrendingUp,
  Crown,
  Star,
  Ban,
  MessageSquare,
  Send,
  ArrowRightLeft,
  Search,
  UserPlus,
  UserCheck,
  UserX,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

interface UserInfo {
  userId: string;
  email: string;
  name: string;
  avatar: string | null;
  coinBalance: number;
  createdAt: string;
  nameUpdatedAt: string | null;
}

interface MTAccount {
  id: number;
  accountNumber: string;
  broker: string;
  platform: string;
  isVerified: boolean;
  createdAt: string;
}

interface FollowInfo {
  id: number;
  planetId: number;
  planetName: string;
  signalAccount: string;
  status: string;
  createdAt: string;
}

// 会员等级配置
const MEMBER_LEVELS = [
  { name: '普通会员', minCoins: 0, icon: Star, color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  { name: '银牌会员', minCoins: 500, icon: Star, color: 'text-gray-400', bgColor: 'bg-gray-200 dark:bg-gray-700' },
  { name: '金牌会员', minCoins: 1000, icon: Star, color: 'text-yellow-500', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  { name: '白金会员', minCoins: 2000, icon: Crown, color: 'text-purple-500', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  { name: '钻石会员', minCoins: 5000, icon: Crown, color: 'text-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
];

// 获取会员等级
function getMemberLevel(totalRecharged: number) {
  for (let i = MEMBER_LEVELS.length - 1; i >= 0; i--) {
    if (totalRecharged >= MEMBER_LEVELS[i].minCoins) {
      return MEMBER_LEVELS[i];
    }
  }
  return MEMBER_LEVELS[0];
}

const RECHARGE_OPTIONS = [
  { amount: 100, bonus: 0, popular: false },
  { amount: 200, bonus: 10, popular: false },
  { amount: 500, bonus: 30, popular: true },
  { amount: 1000, bonus: 80, popular: false },
  { amount: 2000, bonus: 200, popular: false },
  { amount: 5000, bonus: 600, popular: false },
];

// 充值功能是否禁用
const RECHARGE_DISABLED = true;

// ============ 社交功能组件 ============
interface Conversation {
  userId: string;
  userName: string;
  userAvatar: string | null;
  lastMessage: {
    id: number;
    content: string;
    senderId: string;
    createdAt: string;
  };
  unreadCount: number;
}

interface Message {
  id: number;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: number;
  created_at: string;
}

interface TransferRecord {
  id: number;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar: string | null;
  toUserId: string;
  toUserName: string;
  toUserAvatar: string | null;
  amount: number;
  remark: string | null;
  status: string;
  createdAt: string;
  isSent: boolean;
}

interface SearchedUser {
  userId: string;
  name: string;
  avatar: string | null;
}

function SocialTab({ userId, coinBalance }: { userId?: string; coinBalance?: number }) {
  const [activeSection, setActiveSection] = useState<'messages' | 'transfer' | 'search'>('messages');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  
  // 转账相关状态
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferForm, setTransferForm] = useState({ toUserId: '', amount: '', remark: '' });
  const [transferSuccess, setTransferSuccess] = useState('');
  const [transferError, setTransferError] = useState('');
  
  // 搜索相关状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  // 加载会话列表
  const loadConversations = async () => {
    setConversationsLoading(true);
    try {
      const res = await fetch('/api/message/conversations');
      const data = await res.json();
      if (data.success) {
        setConversations(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setConversationsLoading(false);
    }
  };

  // 加载与某用户的聊天记录
  const loadMessages = async (targetUserId: string) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/message/send?userId=${targetUserId}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  // 发送消息
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sendLoading) return;
    
    setSendLoading(true);
    try {
      const res = await fetch('/api/message/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedConversation.userId,
          content: newMessage.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewMessage('');
        loadMessages(selectedConversation.userId);
        loadConversations();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSendLoading(false);
    }
  };

  // 加载转账记录
  const loadTransfers = async () => {
    setTransferLoading(true);
    try {
      const res = await fetch('/api/coin/transfer');
      const data = await res.json();
      if (data.success) {
        setTransfers(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load transfers:', err);
    } finally {
      setTransferLoading(false);
    }
  };

  // 执行转账
  const handleTransfer = async () => {
    if (!transferForm.toUserId || !transferForm.amount) return;
    
    setTransferError('');
    setTransferSuccess('');
    
    const amount = parseInt(transferForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setTransferError('请输入有效金额');
      return;
    }
    
    if ((coinBalance || 0) < amount) {
      setTransferError(`余额不足，当前余额: ${coinBalance || 0} 星球币`);
      return;
    }
    
    setTransferLoading(true);
    try {
      const res = await fetch('/api/coin/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId: transferForm.toUserId,
          amount,
          remark: transferForm.remark,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTransferSuccess(data.message);
        setTransferForm({ toUserId: '', amount: '', remark: '' });
        loadTransfers();
      } else {
        setTransferError(data.error);
      }
    } catch (err) {
      setTransferError('转账失败');
    } finally {
      setTransferLoading(false);
    }
  };

  // 搜索用户
  const handleSearch = async () => {
    if (!searchKeyword.trim()) return;
    
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/user/search?keyword=${encodeURIComponent(searchKeyword)}`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data || []);
        // 检查关注状态
        const ids = data.data?.map((u: SearchedUser) => u.userId) || [];
        checkFollowStatus(ids);
      }
    } catch (err) {
      console.error('Failed to search users:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  // 检查关注状态
  const checkFollowStatus = async (userIds: string[]) => {
    const newFollowing = new Set<string>();
    for (const uid of userIds) {
      try {
        const res = await fetch(`/api/user/follow?followedId=${uid}`);
        const data = await res.json();
        if (data.success && data.isFollowing) {
          newFollowing.add(uid);
        }
      } catch {}
    }
    setFollowingIds(newFollowing);
  };

  // 关注/取消关注
  const handleFollow = async (targetUserId: string) => {
    try {
      const res = await fetch('/api/user/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followedId: targetUserId }),
      });
      const data = await res.json();
      if (data.success) {
        setFollowingIds(prev => {
          const newSet = new Set(prev);
          if (data.isFollowing) {
            newSet.add(targetUserId);
          } else {
            newSet.delete(targetUserId);
          }
          return newSet;
        });
      }
    } catch (err) {
      console.error('Failed to follow/unfollow:', err);
    }
  };

  // 初始化
  useEffect(() => {
    if (userId) {
      loadConversations();
      loadTransfers();
    }
  }, [userId]);

  // 选中会话时加载消息
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.userId);
    }
  }, [selectedConversation]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 左侧导航 */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            社交中心
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <button
            onClick={() => { setActiveSection('messages'); setSelectedConversation(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeSection === 'messages' ? 'bg-purple-100 dark:bg-purple-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span>私信</span>
          </button>
          <button
            onClick={() => { setActiveSection('transfer'); setSelectedConversation(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeSection === 'transfer' ? 'bg-purple-100 dark:bg-purple-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <ArrowRightLeft className="w-5 h-5" />
            <span>转账</span>
          </button>
          <button
            onClick={() => { setActiveSection('search'); setSelectedConversation(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeSection === 'search' ? 'bg-purple-100 dark:bg-purple-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Search className="w-5 h-5" />
            <span>搜索用户</span>
          </button>
        </CardContent>
      </Card>

      {/* 右侧内容区 */}
      <div className="lg:col-span-2">
        {/* 私信列表/聊天 */}
        {activeSection === 'messages' && !selectedConversation && (
          <Card>
            <CardHeader>
              <CardTitle>私信</CardTitle>
              <CardDescription>与用户的对话列表</CardDescription>
            </CardHeader>
            <CardContent>
              {conversationsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <div className="w-12 h-12 bg-gray-300 dark:bg-gray-700 rounded-full" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-2" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无私信记录</p>
                  <p className="text-sm mt-2">在搜索用户中找到感兴趣的人，给他发私信吧</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map(conv => (
                    <button
                      key={conv.userId}
                      onClick={() => setSelectedConversation(conv)}
                      className="w-full flex items-center gap-4 p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                          {conv.userName.slice(0, 1)}
                        </AvatarFallback>
                        {conv.userAvatar && <AvatarImage src={conv.userAvatar} />}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{conv.userName}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(conv.lastMessage.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {conv.lastMessage.senderId === userId ? '我: ' : ''}
                          {conv.lastMessage.content}
                        </p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <Badge className="bg-red-500">{conv.unreadCount}</Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 聊天界面 */}
        {activeSection === 'messages' && selectedConversation && (
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="flex-row items-center gap-4 pb-4 border-b">
              <Button variant="ghost" size="sm" onClick={() => setSelectedConversation(null)}>
                ← 返回
              </Button>
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                  {selectedConversation.userName.slice(0, 1)}
                </AvatarFallback>
                {selectedConversation.userAvatar && <AvatarImage src={selectedConversation.userAvatar} />}
              </Avatar>
              <CardTitle className="text-lg">{selectedConversation.userName}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading ? (
                <div className="text-center py-8">加载中...</div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">暂无消息，开始对话吧</div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] px-4 py-2 rounded-lg ${
                        msg.sender_id === userId
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p className={`text-xs mt-1 ${
                        msg.sender_id === userId ? 'text-purple-200' : 'text-gray-500'
                      }`}>
                        {new Date(msg.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
            <div className="p-4 border-t flex gap-2">
              <Input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="输入消息..."
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                disabled={sendLoading}
              />
              <Button onClick={handleSendMessage} disabled={sendLoading || !newMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* 转账界面 */}
        {activeSection === 'transfer' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5" />
                  转账
                </CardTitle>
                <CardDescription>
                  向其他用户转账星球币，当前余额: <span className="font-bold text-purple-600">{coinBalance || 0}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {transferSuccess && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700">{transferSuccess}</AlertDescription>
                  </Alert>
                )}
                {transferError && (
                  <Alert className="border-red-200 bg-red-50">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700">{transferError}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>收款方用户ID</Label>
                    <Input
                      value={transferForm.toUserId}
                      onChange={e => setTransferForm({ ...transferForm, toUserId: e.target.value })}
                      placeholder="输入用户ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>转账金额</Label>
                    <Input
                      type="number"
                      value={transferForm.amount}
                      onChange={e => setTransferForm({ ...transferForm, amount: e.target.value })}
                      placeholder="输入转账金额"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>备注 (可选)</Label>
                    <Input
                      value={transferForm.remark}
                      onChange={e => setTransferForm({ ...transferForm, remark: e.target.value })}
                      placeholder="输入备注"
                    />
                  </div>
                  <Button
                    onClick={handleTransfer}
                    disabled={transferLoading || !transferForm.toUserId || !transferForm.amount}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600"
                  >
                    {transferLoading ? '转账中...' : '确认转账'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  转账记录
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transferLoading && transfers.length === 0 ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <div className="flex-1">
                          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-2" />
                          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : transfers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">暂无转账记录</div>
                ) : (
                  <div className="space-y-3">
                    {transfers.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-sm">
                              {(t.isSent ? t.toUserName : t.fromUserName).slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {t.isSent ? `转给 ${t.toUserName}` : `收到 ${t.fromUserName}`}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(t.createdAt).toLocaleString()}
                              {t.remark && ` · ${t.remark}`}
                            </p>
                          </div>
                        </div>
                        <span className={`font-bold ${t.isSent ? 'text-red-500' : 'text-green-500'}`}>
                          {t.isSent ? '-' : '+'}{t.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 搜索用户 */}
        {activeSection === 'search' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                搜索用户
              </CardTitle>
              <CardDescription>搜索并关注其他用户，或给他们发私信</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={searchKeyword}
                  onChange={e => setSearchKeyword(e.target.value)}
                  placeholder="输入用户昵称或ID搜索..."
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={searchLoading}>
                  {searchLoading ? '搜索中...' : '搜索'}
                </Button>
              </div>

              {searchResults.length === 0 && !searchLoading && (
                <div className="text-center py-8 text-gray-500">
                  <UserIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>搜索用户以关注或发私信</p>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-3">
                  {searchResults.map(user => (
                    <div key={user.userId} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                            {user.name.slice(0, 1)}
                          </AvatarFallback>
                          {user.avatar && <AvatarImage src={user.avatar} />}
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-gray-500">ID: {user.userId}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={followingIds.has(user.userId) ? 'outline' : 'default'}
                          size="sm"
                          onClick={() => handleFollow(user.userId)}
                          className={followingIds.has(user.userId) ? '' : 'bg-purple-600'}
                        >
                          {followingIds.has(user.userId) ? (
                            <>
                              <UserCheck className="w-4 h-4 mr-1" />
                              已关注
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4 mr-1" />
                              关注
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActiveSection('messages');
                            setSelectedConversation({
                              userId: user.userId,
                              userName: user.name,
                              userAvatar: user.avatar,
                              lastMessage: { id: 0, content: '', senderId: '', createdAt: '' },
                              unreadCount: 0,
                            });
                          }}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ============ 主页面组件 ============

export default function UserCenterPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [mtAccount, setMtAccount] = useState<MTAccount | null>(null);
  const [followInfo, setFollowInfo] = useState<FollowInfo[]>([]);
  const [totalRecharged, setTotalRecharged] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mtForm, setMtForm] = useState({
    accountNumber: '',
    platform: 'MT5',
  });
  const [mtLoading, setMtLoading] = useState(false);
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // 头像和昵称相关状态
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [nameLoading, setNameLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [canChangeName, setCanChangeName] = useState(true);
  const [nextNameChangeDate, setNextNameChangeDate] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchData();
    }
  }, [status]);

  const fetchData = async () => {
    try {
      const [userRes, mtRes, followRes] = await Promise.all([
        fetch('/api/user/info'),
        fetch('/api/mt-account'),
        fetch('/api/follow/my'),
      ]);
      
      const userData = await userRes.json();
      const mtData = await mtRes.json();
      const followData = await followRes.json();
      
      setUser(userData.user);
      setMtAccount(mtData.account);
      setFollowInfo(followData.follows || []);
      setTotalRecharged(userData.totalRecharged || 0);
      setNewName(userData.user?.name || '');
      
      // 检查昵称修改限制
      checkNameChangeLimit(userData.user);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkNameChangeLimit = (userData: UserInfo) => {
    if (!userData?.nameUpdatedAt) {
      setCanChangeName(true);
      return;
    }
    
    const lastUpdate = new Date(userData.nameUpdatedAt);
    const oneYearLater = new Date(lastUpdate);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    
    if (new Date() < oneYearLater) {
      setCanChangeName(false);
      setNextNameChangeDate(oneYearLater.toLocaleDateString());
    } else {
      setCanChangeName(true);
    }
  };

  const handleBindMTAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setMtLoading(true);

    try {
      const res = await fetch('/api/mt-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mtForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '绑定失败');
      } else {
        setSuccess('MT账号绑定成功！');
        fetchData();
        setMtForm({ accountNumber: '', platform: 'MT5' });
      }
    } catch (err) {
      setError('绑定失败，请稍后重试');
    } finally {
      setMtLoading(false);
    }
  };

  const handleUnbindMTAccount = async () => {
    if (!confirm('确定要解绑MT账号吗？解绑后将无法接收跟单信号。')) {
      return;
    }

    setMtLoading(true);
    try {
      const res = await fetch('/api/mt-account', { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '解绑失败');
      } else {
        setSuccess('MT账号已解绑');
        setMtAccount(null);
      }
    } catch (err) {
      setError('解绑失败，请稍后重试');
    } finally {
      setMtLoading(false);
    }
  };

  const handleRecharge = async (amount: number) => {
    if (RECHARGE_DISABLED) {
      setError('充值功能暂未开放，敬请期待');
      return;
    }
    
    setError('');
    setSuccess('');
    setRechargeLoading(true);

    try {
      const res = await fetch('/api/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, paymentMethod: 'system' }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '充值失败');
      } else {
        setSuccess(`充值成功！到账 ${amount} 星球币`);
        fetchData();
        setSelectedAmount(null);
        setCustomAmount('');
      }
    } catch (err) {
      setError('充值失败，请稍后重试');
    } finally {
      setRechargeLoading(false);
    }
  };

  const handleCustomRecharge = () => {
    const amount = parseInt(customAmount);
    if (!amount || amount < 10 || amount > 50000) {
      setError('充值金额需在10-50000之间');
      return;
    }
    handleRecharge(amount);
  };

  // 头像上传处理
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('图片大小不能超过 2MB');
      return;
    }

    setAvatarLoading(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          
          const res = await fetch('/api/user/avatar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ avatar: base64 }),
          });

          const data = await res.json();

          if (!res.ok) {
            setError(data.error || '上传头像失败');
          } else {
            setSuccess('头像更新成功！');
            fetchData();
          }
        } catch (err) {
          setError('上传头像失败');
        } finally {
          setAvatarLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('上传头像失败');
      setAvatarLoading(false);
    }
  };

  // 昵称修改处理
  const handleNameChange = async () => {
    if (!newName.trim()) {
      setError('昵称不能为空');
      return;
    }

    if (newName === user?.name) {
      setError('新昵称与当前昵称相同');
      return;
    }

    if (!canChangeName) {
      setError(`一年只能修改一次昵称，下次可修改时间：${nextNameChangeDate}`);
      return;
    }

    setNameLoading(true);
    setError('');

    try {
      const res = await fetch('/api/user/name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '修改昵称失败');
      } else {
        setSuccess('昵称修改成功！');
        fetchData();
      }
    } catch (err) {
      setError('修改昵称失败');
    } finally {
      setNameLoading(false);
    }
  };

  // 获取会员等级
  const memberLevel = getMemberLevel(totalRecharged);
  const LevelIcon = memberLevel.icon;
  
  // 是否可以创建星球
  const canCreatePlanet = totalRecharged >= 2000;

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <UserCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            个人中心
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            管理您的账户、MT账号和跟单服务
          </p>
        </div>

        {/* 顶部卡片区域 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* 用户头像和会员等级 */}
          <Card className="overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <Avatar 
                    className="w-20 h-20 cursor-pointer border-2 border-gray-200 dark:border-gray-700"
                    onClick={handleAvatarClick}
                  >
                    <AvatarImage src={user?.avatar || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-2xl font-bold">
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div 
                    className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={handleAvatarClick}
                  >
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-xl">{user?.name}</h3>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                  <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${memberLevel.bgColor}`}>
                    <LevelIcon className={`w-4 h-4 ${memberLevel.color}`} />
                    <span className={`text-sm font-medium ${memberLevel.color}`}>{memberLevel.name}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 状态信息 */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4">
                {/* 星球币余额 */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Coins className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs text-gray-500">余额</span>
                  </div>
                  <p className="text-xl font-bold">{user?.coinBalance || 0}</p>
                  <p className="text-xs text-gray-400">星球币</p>
                </div>
                
                {/* MT账号 */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Link2 className="w-4 h-4 text-blue-500" />
                    <span className="text-xs text-gray-500">MT账号</span>
                  </div>
                  <p className="text-sm font-bold truncate">
                    {mtAccount ? mtAccount.accountNumber : '未绑定'}
                  </p>
                  {mtAccount && (
                    <Badge variant="outline" className="text-xs mt-1">{mtAccount.platform}</Badge>
                  )}
                </div>
                
                {/* 创建星球权限 */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {canCreatePlanet ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Ban className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-xs text-gray-500">创建星球</span>
                  </div>
                  <p className={`text-sm font-bold ${canCreatePlanet ? 'text-green-600' : 'text-gray-400'}`}>
                    {canCreatePlanet ? '已解锁' : '需2000+'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50 dark:bg-green-900/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-400">{success}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              个人资料
            </TabsTrigger>
            <TabsTrigger value="follow" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              跟单信息
            </TabsTrigger>
            <TabsTrigger value="mt-account" className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              MT账号
            </TabsTrigger>
            <TabsTrigger value="recharge" className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              充值
            </TabsTrigger>
            <TabsTrigger value="social" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              社交
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 昵称设置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-blue-500" />
                    昵称设置
                  </CardTitle>
                  <CardDescription>
                    修改您的昵称，一年仅能修改一次
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nickname">昵称</Label>
                    <Input
                      id="nickname"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="输入新昵称"
                      maxLength={20}
                      disabled={!canChangeName}
                    />
                    <p className="text-xs text-gray-500">
                      {newName.length}/20 字符
                    </p>
                  </div>

                  {!canChangeName && (
                    <Alert>
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        一年只能修改一次昵称，下次可修改时间：<strong>{nextNameChangeDate}</strong>
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    onClick={handleNameChange}
                    disabled={!canChangeName || nameLoading || newName === user?.name}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {nameLoading ? (
                      <>
                        <Spinner className="w-4 h-4 mr-2" />
                        修改中...
                      </>
                    ) : (
                      '保存昵称'
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* 账户信息 */}
              <Card>
                <CardHeader>
                  <CardTitle>账户信息</CardTitle>
                  <CardDescription>您的基本账户信息</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-600 dark:text-gray-400">邮箱</Label>
                      <Input value={user?.email || ''} disabled className="bg-gray-50 dark:bg-gray-800" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-600 dark:text-gray-400">昵称</Label>
                      <Input value={user?.name || ''} disabled className="bg-gray-50 dark:bg-gray-800" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-600 dark:text-gray-400">注册时间</Label>
                      <Input
                        value={user?.createdAt ? new Date(user.createdAt).toLocaleString() : ''}
                        disabled
                        className="bg-gray-50 dark:bg-gray-800"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-600 dark:text-gray-400">累计充值</Label>
                      <Input
                        value={`${totalRecharged} 星球币`}
                        disabled
                        className="bg-gray-50 dark:bg-gray-800"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 快捷操作 */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>快捷操作</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={() => router.push('/planet')}>
                      <Globe className="w-4 h-4 mr-2" />
                      浏览星球
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/planet/my')}>
                      我的星球
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => router.push('/planet/create')}
                      disabled={!canCreatePlanet}
                      title={canCreatePlanet ? '创建星球' : '充值2000+星球币后可创建星球'}
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      创建星球
                    </Button>
                    <Button variant="destructive" onClick={() => signOut({ callbackUrl: '/' })}>
                      退出登录
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Follow Info Tab */}
          <TabsContent value="follow">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  跟单信息
                </CardTitle>
                <CardDescription>
                  查看您当前跟单的信号源和所属星球
                </CardDescription>
              </CardHeader>
              <CardContent>
                {followInfo.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无跟单记录</p>
                    <p className="text-sm mt-2">加入星球后可以跟随信号源进行跟单</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => router.push('/planet')}
                    >
                      浏览星球
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {followInfo.map((follow) => (
                      <div 
                        key={follow.id}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                            {follow.signalAccount.slice(-3)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold">信号源: {follow.signalAccount}</span>
                              <Badge variant={follow.status === 'active' ? 'default' : 'secondary'} className={follow.status === 'active' ? 'bg-green-500' : ''}>
                                {follow.status === 'active' ? '跟单中' : '已暂停'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                              <Globe className="w-3 h-3" />
                              <span>星球: {follow.planetName}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              开始时间: {new Date(follow.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/planet/${follow.planetId}`)}
                        >
                          查看星球
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* MT Account Tab */}
          <TabsContent value="mt-account">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="w-5 h-5" />
                  MT4/MT5 账号绑定
                </CardTitle>
                <CardDescription>
                  绑定您的MT账号以接收跟单信号（每人只能绑定一个账号）
                </CardDescription>
              </CardHeader>
              <CardContent>
                {mtAccount ? (
                  <div className="space-y-4">
                    <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                            {mtAccount.platform === 'MT5' ? '5' : '4'}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold">{mtAccount.accountNumber}</h3>
                            <p className="text-gray-600 dark:text-gray-400">{mtAccount.broker || '未知经纪商'}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={mtAccount.platform === 'MT5' ? 'default' : 'secondary'}>
                                {mtAccount.platform}
                              </Badge>
                              <Badge variant={mtAccount.isVerified ? 'default' : 'outline'} className={mtAccount.isVerified ? 'bg-green-500' : ''}>
                                {mtAccount.isVerified ? '已验证' : '待验证'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleUnbindMTAccount}
                          disabled={mtLoading}
                        >
                          <Unlink className="w-4 h-4 mr-2" />
                          解绑
                        </Button>
                      </div>
                    </div>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        绑定后，您在该账号发布的信号将自动关联到您的星球。请确保EA已正确配置。
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : (
                  <form onSubmit={handleBindMTAccount} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="platform">平台类型 *</Label>
                        <select
                          id="platform"
                          value={mtForm.platform}
                          onChange={(e) => setMtForm({ ...mtForm, platform: e.target.value })}
                          className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-700"
                        >
                          <option value="MT5">MetaTrader 5</option>
                          <option value="MT4">MetaTrader 4</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="accountNumber">MT账号 *</Label>
                        <Input
                          id="accountNumber"
                          placeholder="输入您的MT账号"
                          value={mtForm.accountNumber}
                          onChange={(e) => setMtForm({ ...mtForm, accountNumber: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>注意：</strong>每人只能绑定一个MT账号。绑定后请确保EA配置正确，以便信号能正确上传。
                      </AlertDescription>
                    </Alert>

                    <Button type="submit" disabled={mtLoading} className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                      {mtLoading ? (
                        <>
                          <Spinner className="mr-2" />
                          绑定中...
                        </>
                      ) : (
                        '绑定账号'
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recharge Tab */}
          <TabsContent value="recharge">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="w-5 h-5" />
                  星球币充值
                </CardTitle>
                <CardDescription>
                  充值星球币用于购买星球门票，大额充值更有额外赠送
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {RECHARGE_DISABLED && (
                  <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
                    <Ban className="h-4 w-4 text-orange-500" />
                    <AlertDescription className="text-orange-700 dark:text-orange-400">
                      充值功能暂未开放，敬请期待
                    </AlertDescription>
                  </Alert>
                )}

                {/* 快捷充值选项 */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {RECHARGE_OPTIONS.map((option) => (
                    <button
                      key={option.amount}
                      onClick={() => {
                        if (!RECHARGE_DISABLED) {
                          setSelectedAmount(option.amount);
                          setCustomAmount('');
                        }
                      }}
                      disabled={rechargeLoading || RECHARGE_DISABLED}
                      className={`relative p-4 rounded-xl border-2 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                        selectedAmount === option.amount
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                      }`}
                    >
                      {option.popular && (
                        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                          热门
                        </div>
                      )}
                      {option.bonus > 0 && (
                        <div className="absolute -top-2 -left-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Gift className="w-3 h-3" />
                          +{option.bonus}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-5 h-5 text-yellow-500" />
                        <span className="text-2xl font-bold">{option.amount}</span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        星球币
                      </p>
                      {option.bonus > 0 && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          实际到账: {option.amount + option.bonus}
                        </p>
                      )}
                    </button>
                  ))}
                </div>

                {/* 自定义金额 */}
                <div className="pt-4 border-t">
                  <Label className="text-gray-600 dark:text-gray-400 mb-2 block">自定义金额</Label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="number"
                        placeholder="输入充值金额 (10-50000)"
                        value={customAmount}
                        onChange={(e) => {
                          setCustomAmount(e.target.value);
                          setSelectedAmount(null);
                        }}
                        className="pl-10"
                        min={10}
                        max={50000}
                        disabled={RECHARGE_DISABLED}
                      />
                    </div>
                    <Button 
                      onClick={handleCustomRecharge}
                      disabled={rechargeLoading || !customAmount || RECHARGE_DISABLED}
                      variant="outline"
                    >
                      充值
                    </Button>
                  </div>
                </div>

                {/* 充值按钮 */}
                {selectedAmount && !RECHARGE_DISABLED && (
                  <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div>
                      <p className="font-medium">已选择: {selectedAmount} 星球币</p>
                      <p className="text-sm text-gray-500">
                        实际支付: ¥{selectedAmount}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleRecharge(selectedAmount)}
                      disabled={rechargeLoading}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      {rechargeLoading ? (
                        <>
                          <Spinner className="w-4 h-4 mr-2" />
                          处理中...
                        </>
                      ) : (
                        '确认充值'
                      )}
                    </Button>
                  </div>
                )}

                {/* 会员等级说明 */}
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">会员等级说明</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {MEMBER_LEVELS.map((level, index) => {
                      const Icon = level.icon;
                      const isCurrentLevel = memberLevel.name === level.name;
                      return (
                        <div 
                          key={index}
                          className={`p-3 rounded-lg text-center ${level.bgColor} ${isCurrentLevel ? 'ring-2 ring-purple-500' : ''}`}
                        >
                          <Icon className={`w-5 h-5 mx-auto ${level.color}`} />
                          <p className={`text-sm font-medium mt-1 ${level.color}`}>{level.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">充值{level.minCoins}+</p>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    * 白金会员及以上（充值2000+星球币）可申请创建星球
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Social Tab */}
          <TabsContent value="social">
            <SocialTab userId={user?.userId} coinBalance={user?.coinBalance} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
