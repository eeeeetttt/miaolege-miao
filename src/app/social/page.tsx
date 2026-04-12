'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { 
  MessageSquare,
  Send,
  Search,
  UserIcon,
  UserPlus,
  UserCheck,
  UserX,
  ArrowRightLeft,
  RefreshCw,
  Coins,
  ChevronRight,
  Shield,
  Calendar,
  Trophy,
  X,
  CheckCircle2,
  XCircle,
  Image,
  Upload
} from 'lucide-react';

// 类型定义
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
  image_url: string | null;
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
  email: string | null;
  avatar: string | null;
}

interface UserProfile {
  userId: string;
  name: string;
  email: string | null;
  avatar: string | null;
  coinBalance: number;
  createdAt: string;
  medals: string[];
  bio: string | null;
}

export default function SocialPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [coinBalance, setCoinBalance] = useState<number>(0);
  const [activeSection, setActiveSection] = useState<'messages' | 'transfer' | 'search' | 'follow'>('messages');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // 转账相关状态
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferForm, setTransferForm] = useState({ toEmail: '', amount: '', remark: '' });
  const [transferSuccess, setTransferSuccess] = useState('');
  const [transferError, setTransferError] = useState('');
  
  // 搜索相关状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  
  // 关注列表相关状态
  const [followList, setFollowList] = useState<SearchedUser[]>([]);
  const [followListType, setFollowListType] = useState<'following' | 'followers'>('following');
  const [followLoading, setFollowLoading] = useState(false);

  // 用户资料弹窗
  const [viewingUser, setViewingUser] = useState<UserProfile | null>(null);
  const [viewProfileLoading, setViewProfileLoading] = useState(false);

  const userId = session?.user?.id || '';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated' && userId) {
      loadUserInfo();
      loadConversations();
      loadTransfers();
    }
  }, [status, userId]);

  // 加载用户信息
  const loadUserInfo = async () => {
    try {
      const res = await fetch('/api/user/info');
      const data = await res.json();
      if (data.user) {
        setCoinBalance(data.user.coinBalance || 0);
      }
    } catch (err) {
      console.error('Failed to load user info:', err);
    }
  };

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
    if ((!newMessage.trim() && !selectedImage) || !selectedConversation || sendLoading) return;
    
    setSendLoading(true);
    try {
      const res = await fetch('/api/message/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedConversation.userId,
          content: newMessage.trim(),
          imageUrl: selectedImage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewMessage('');
        setSelectedImage(null);
        loadMessages(selectedConversation.userId);
        loadConversations();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSendLoading(false);
    }
  };

  // 上传图片
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('仅支持 JPG、PNG、GIF、WebP 格式');
      return;
    }

    // 验证文件大小
    if (file.size > 2 * 1024 * 1024) {
      alert('文件大小不能超过 2MB');
      return;
    }

    // 预览图片
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreviewImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    // 上传图片
    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/message/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setSelectedImage(data.imageUrl);
      } else {
        alert(data.error || '上传失败');
        setPreviewImage(null);
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
      alert('上传失败');
      setPreviewImage(null);
    } finally {
      setUploadingImage(false);
    }
  };

  // 移除已选图片
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setPreviewImage(null);
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
    if (!transferForm.toEmail || !transferForm.amount) return;
    
    setTransferError('');
    setTransferSuccess('');
    
    const amount = parseInt(transferForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setTransferError('请输入有效金额');
      return;
    }
    
    if (coinBalance < amount) {
      setTransferError(`余额不足，当前余额: ${coinBalance} U`);
      return;
    }
    
    setTransferLoading(true);
    try {
      const res = await fetch('/api/coin/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: transferForm.toEmail,
          amount,
          remark: transferForm.remark,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTransferSuccess(data.message);
        setTransferForm({ toEmail: '', amount: '', remark: '' });
        loadTransfers();
        loadUserInfo();
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
        const ids = data.data?.map((u: SearchedUser) => u.userId) || [];
        checkFollowStatus(ids);
      }
    } catch (err) {
      console.error('Failed to search users:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  // 查看用户资料
  const handleViewProfile = async (targetUserId: string) => {
    setViewProfileLoading(true);
    try {
      const res = await fetch(`/api/user/profile?userId=${targetUserId}`);
      const data = await res.json();
      if (data.success) {
        setViewingUser(data.data);
      } else {
        alert('无法查看该用户资料');
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setViewProfileLoading(false);
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

  // 加载关注/粉丝列表
  const loadFollowList = async (type: 'following' | 'followers') => {
    setFollowLoading(true);
    try {
      const res = await fetch(`/api/user/follow/list?type=${type}`);
      const data = await res.json();
      if (data.success) {
        setFollowList(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load follow list:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  // 取消关注
  const handleUnfollow = async (targetUserId: string) => {
    try {
      const res = await fetch('/api/user/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, action: 'unfollow' }),
      });
      const data = await res.json();
      if (data.success) {
        loadFollowList('following');
        loadFollowList('followers');
      }
    } catch (err) {
      console.error('Failed to unfollow:', err);
    }
  };

  // 选中会话时加载消息
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.userId);
    }
  }, [selectedConversation]);

  // 初始化加载
  useEffect(() => {
    if (userId) {
      loadFollowList('following');
    }
  }, [userId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-gray-900 dark:via-amber-950/30 dark:to-orange-950/30 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl mb-4">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">社交中心</h1>
          <p className="text-gray-600 dark:text-gray-400">
            余额: <span className="font-bold text-amber-600">{coinBalance} U</span>
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧导航 */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                功能菜单
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button
                onClick={() => { setActiveSection('messages'); setSelectedConversation(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeSection === 'messages' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                <span>私信</span>
                {conversations.filter(c => c.unreadCount > 0).length > 0 && (
                  <Badge className="ml-auto bg-red-500">{conversations.filter(c => c.unreadCount > 0).length}</Badge>
                )}
              </button>
              <button
                onClick={() => { setActiveSection('follow'); setSelectedConversation(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeSection === 'follow' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <UserPlus className="w-5 h-5" />
                <span>关注列表</span>
              </button>
              <button
                onClick={() => { setActiveSection('transfer'); setSelectedConversation(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeSection === 'transfer' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <ArrowRightLeft className="w-5 h-5" />
                <span>转账</span>
              </button>
              <button
                onClick={() => { setActiveSection('search'); setSelectedConversation(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeSection === 'search' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
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
                    <div className="flex justify-center py-12">
                      <Spinner />
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
                            <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
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
                    <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                      {selectedConversation.userName.slice(0, 1)}
                    </AvatarFallback>
                    {selectedConversation.userAvatar && <AvatarImage src={selectedConversation.userAvatar} />}
                  </Avatar>
                  <CardTitle className="text-lg flex-1">{selectedConversation.userName}</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => handleViewProfile(selectedConversation.userId)}>
                    查看资料
                  </Button>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messagesLoading ? (
                    <div className="text-center py-8">
                      <Spinner />
                    </div>
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
                              ? 'bg-amber-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-800'
                          }`}
                        >
                          {msg.image_url && (
                            <img 
                              src={msg.image_url} 
                              alt="图片消息" 
                              className="rounded-lg mb-2 max-w-full cursor-pointer hover:opacity-90"
                              onClick={() => msg.image_url && window.open(msg.image_url, '_blank')}
                            />
                          )}
                          {msg.content && msg.content !== '[图片]' && <p>{msg.content}</p>}
                          <p className={`text-xs mt-1 ${
                            msg.sender_id === userId ? 'text-amber-200' : 'text-gray-500'
                          }`}>
                            {new Date(msg.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
                <div className="p-4 border-t space-y-3">
                  {/* 图片预览 */}
                  {previewImage && (
                    <div className="relative inline-block">
                      <img 
                        src={previewImage} 
                        alt="预览" 
                        className="w-20 h-20 object-cover rounded-lg border" 
                      />
                      <button
                        onClick={handleRemoveImage}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {uploadingImage && (
                        <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                          <Spinner className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="file"
                      id="message-image"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                    <label
                      htmlFor="message-image"
                      className={`p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Image className="w-5 h-5 text-gray-500" />
                    </label>
                    <div className="flex-1">
                      <Input
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="输入消息..."
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                        disabled={sendLoading}
                      />
                    </div>
                    <Button onClick={handleSendMessage} disabled={sendLoading || (!newMessage.trim() && !selectedImage)}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
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
                      向其他用户转账 U，当前余额: <span className="font-bold text-amber-600">{coinBalance}</span>
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
                        <Label>收款方邮箱</Label>
                        <Input
                          type="email"
                          value={transferForm.toEmail}
                          onChange={e => setTransferForm({ ...transferForm, toEmail: e.target.value })}
                          placeholder="输入收款方邮箱"
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
                        disabled={transferLoading || !transferForm.toEmail || !transferForm.amount}
                        className="w-full bg-gradient-to-r from-amber-600 to-orange-600"
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
                      <div className="flex justify-center py-8">
                        <Spinner />
                      </div>
                    ) : transfers.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">暂无转账记录</div>
                    ) : (
                      <div className="space-y-3">
                        {transfers.map(t => (
                          <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-sm">
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
                      placeholder="输入昵称、邮箱或ID搜索..."
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
                          <button 
                            className="flex items-center gap-3 flex-1 text-left"
                            onClick={() => handleViewProfile(user.userId)}
                          >
                            <Avatar className="w-12 h-12">
                              <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                                {user.name.slice(0, 1)}
                              </AvatarFallback>
                              {user.avatar && <AvatarImage src={user.avatar} />}
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              {user.email && <p className="text-xs text-gray-500">{user.email}</p>}
                            </div>
                          </button>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewProfile(user.userId)}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                            <Button
                              variant={followingIds.has(user.userId) ? 'outline' : 'default'}
                              size="sm"
                              onClick={() => handleFollow(user.userId)}
                              className={followingIds.has(user.userId) ? '' : 'bg-amber-600'}
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

            {/* 关注列表 */}
            {activeSection === 'follow' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    关注列表
                  </CardTitle>
                  <CardDescription>管理您的关注和粉丝</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button 
                      variant={followListType === 'following' ? 'default' : 'outline'}
                      onClick={() => setFollowListType('following')}
                      className={followListType === 'following' ? 'bg-amber-600' : ''}
                    >
                      <UserCheck className="w-4 h-4 mr-1" />
                      我的关注 ({followList.length})
                    </Button>
                    <Button 
                      variant={followListType === 'followers' ? 'default' : 'outline'}
                      onClick={() => {
                        setFollowListType('followers');
                        loadFollowList('followers');
                      }}
                      className={followListType === 'followers' ? 'bg-amber-600' : ''}
                    >
                      <UserX className="w-4 h-4 mr-1" />
                      我的粉丝
                    </Button>
                  </div>
                  
                  {followLoading ? (
                    <div className="flex justify-center py-8">
                      <Spinner />
                    </div>
                  ) : followList.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <UserIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>{followListType === 'following' ? '暂无关注' : '暂无粉丝'}</p>
                      <p className="text-sm mt-2">在搜索用户中关注感兴趣的人吧</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {followList.map(item => (
                        <div key={item.userId} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <button 
                            className="flex items-center gap-3 flex-1 text-left"
                            onClick={() => handleViewProfile(item.userId)}
                          >
                            <Avatar className="w-12 h-12">
                              <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                                {item.name.slice(0, 1)}
                              </AvatarFallback>
                              {item.avatar && <AvatarImage src={item.avatar} />}
                            </Avatar>
                            <div>
                              <p className="font-medium">{item.name}</p>
                              {item.email && <p className="text-xs text-gray-500">{item.email}</p>}
                            </div>
                          </button>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setActiveSection('messages');
                                setSelectedConversation({
                                  userId: item.userId,
                                  userName: item.name,
                                  userAvatar: item.avatar,
                                  lastMessage: { id: 0, content: '', senderId: '', createdAt: '' },
                                  unreadCount: 0,
                                });
                              }}
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              发私信
                            </Button>
                            {followListType === 'following' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUnfollow(item.userId)}
                              >
                                取消关注
                              </Button>
                            )}
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
      </div>

      {/* 用户资料弹窗 */}
      {viewingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="relative">
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute top-2 right-2"
                onClick={() => setViewingUser(null)}
              >
                <X className="w-4 h-4" />
              </Button>
              <div className="flex flex-col items-center">
                <Avatar className="w-20 h-20 mb-4">
                  <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-2xl">
                    {viewingUser.name.slice(0, 1)}
                  </AvatarFallback>
                  {viewingUser.avatar && <AvatarImage src={viewingUser.avatar} />}
                </Avatar>
                <CardTitle className="text-2xl">{viewingUser.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* U */}
              <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <Coins className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-sm text-gray-500">拥有 U</p>
                  <p className="font-bold text-amber-600">{viewingUser.coinBalance?.toLocaleString() || 0}</p>
                </div>
              </div>

              {/* 勋章 */}
              <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Trophy className="w-5 h-5 text-purple-600" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">获得勋章</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {viewingUser.medals && viewingUser.medals.length > 0 ? (
                      viewingUser.medals.map((medal, idx) => (
                        <Badge key={idx} className="bg-purple-500">{medal}</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400">暂无勋章</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 注册时间 */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Calendar className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-500">注册时间</p>
                  <p className="font-medium">{viewingUser.createdAt ? new Date(viewingUser.createdAt).toLocaleDateString() : '-'}</p>
                </div>
              </div>

              {/* 个人介绍 */}
              {viewingUser.bio && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">个人介绍</p>
                  <p className="text-gray-700 dark:text-gray-300">{viewingUser.bio}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
