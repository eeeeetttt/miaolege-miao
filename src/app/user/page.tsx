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
import { ImageUploader } from '@/components/image-uploader';
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
  Lightbulb,
  QrCode,
  ArrowRight,
  Bot,
  Send,
  Search,
  UserPlus,
  UserCheck,
  UserX,
  ArrowRightLeft,
  RefreshCw,
  ChevronRight,
  Calendar,
  Trophy,
  X,
  Image,
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

// 社交相关类型
interface Conversation {
  userId: string;
  userName: string;
  userAvatar: string | null;
  uBalance?: number;
  lastMessage: {
    id: number;
    content: string;
    senderId: string;
    createdAt: string;
  };
  unreadCount: number;
}

interface ChatMessage {
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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // 头像和昵称相关状态
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [nameLoading, setNameLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [canChangeName, setCanChangeName] = useState(true);
  const [nextNameChangeDate, setNextNameChangeDate] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 社交相关状态
  const [socialSection, setSocialSection] = useState<'messages' | 'transfer' | 'search' | 'follow'>('messages');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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

  // 社交相关函数
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
        setPreviewImage(null);
        await loadMessages(selectedConversation.userId);
        await loadConversations();
      } else {
        setError(data.error || '发送失败');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('发送失败');
    } finally {
      setSendLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('仅支持 JPG、PNG、GIF、WebP 格式');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('文件大小不能超过 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreviewImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

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

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setPreviewImage(null);
  };

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

  const handleTransfer = async () => {
    if (!transferForm.toEmail || !transferForm.amount) return;
    
    setTransferError('');
    setTransferSuccess('');
    
    const amount = parseInt(transferForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setTransferError('请输入有效金额');
      return;
    }
    
    if ((user?.coinBalance || 0) < amount) {
      setTransferError(`余额不足，当前余额: ${user?.coinBalance || 0} U`);
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
        fetchData();
      } else {
        setTransferError(data.error);
      }
    } catch (err) {
      setTransferError('转账失败');
    } finally {
      setTransferLoading(false);
    }
  };

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

  // 初始化社交数据
  useEffect(() => {
    if (user) {
      loadConversations();
      loadTransfers();
      loadFollowList('following');
    }
  }, [user]);

  // 选中会话时加载消息
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.userId);
    }
  }, [selectedConversation]);

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
      
      if (data.success) {
        setSuccess('MT账号绑定成功');
        setMtAccount(data.account);
        setMtForm({ accountNumber: '', platform: 'MT5' });
      } else {
        setError(data.error || '绑定失败');
      }
    } catch (error) {
      setError('绑定失败，请稍后重试');
    } finally {
      setMtLoading(false);
    }
  };

  const handleUnbindMTAccount = async () => {
    if (!mtAccount) return;
    
    setError('');
    setSuccess('');
    setMtLoading(true);

    try {
      const res = await fetch(`/api/mt-account?id=${mtAccount.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      
      if (data.success) {
        setSuccess('MT账号已解绑');
        setMtAccount(null);
      } else {
        setError(data.error || '解绑失败');
      }
    } catch (error) {
      setError('解绑失败，请稍后重试');
    } finally {
      setMtLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // 从事件或 ref 获取文件
    let file: File | undefined;
    
    if (e.target.files?.[0]) {
      file = e.target.files[0];
    } else if (fileInputRef.current?.files?.[0]) {
      file = fileInputRef.current.files[0];
    }
    
    if (!file) {
      console.error('未选择文件');
      return;
    }
    
    setAvatarLoading(true);
    setError('');
    
    try {
      // 将图片转换为 base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: base64 }),
      });
      const data = await res.json();
      
      if (data.success) {
        setUser(prev => prev ? { ...prev, avatar: data.avatar } : null);
        setSuccess('头像更新成功');
      } else {
        setError(data.error || '头像更新失败');
      }
    } catch (err) {
      console.error('Avatar update error:', err);
      setError('头像更新失败，请稍后重试');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleNameChange = async () => {
    if (!newName.trim() || newName === user?.name) return;
    
    if (!canChangeName) {
      setError(`昵称修改已受限，下次可修改时间: ${nextNameChangeDate}`);
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
      
      if (data.success) {
        setUser(prev => prev ? { ...prev, name: newName.trim() } : null);
        setSuccess('昵称修改成功');
        checkNameChangeLimit({ ...user!, nameUpdatedAt: new Date().toISOString() });
      } else {
        setError(data.error || '昵称修改失败');
      }
    } catch (error) {
      setError('昵称修改失败，请稍后重试');
    } finally {
      setNameLoading(false);
    }
  };

  const memberLevel = getMemberLevel(totalRecharged);
  const LevelIcon = memberLevel.icon;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-gray-900 dark:via-amber-950/30 dark:to-orange-950/30 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">个人中心</h1>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UserCardSkeleton />
            <UserCardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-gray-900 dark:via-amber-950/30 dark:to-orange-950/30 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl mb-4">
            <UserIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">个人中心</h1>
          <p className="text-gray-600 dark:text-gray-400">
            余额: <span className="font-bold text-amber-600">{user?.coinBalance || 0} U</span>
          </p>
        </div>

        {/* 会员等级 */}
        <div className="mb-6">
          <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full ${memberLevel.bgColor}`}>
            <LevelIcon className={`w-5 h-5 ${memberLevel.color}`} />
            <span className={`font-semibold ${memberLevel.color}`}>{memberLevel.name}</span>
            <span className="text-gray-500 text-sm">累计充值 {totalRecharged} U</span>
          </div>
        </div>

        {/* 快捷入口 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:border-purple-400 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20"
            onClick={() => router.push('/user/ea')}
          >
            <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <span className="font-medium text-purple-700 dark:text-purple-400">我的EA产品</span>
              <span className="text-xs text-gray-500">上架销售EA工具</span>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:border-blue-400"
            onClick={() => router.push('/download')}
          >
            <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <ArrowRight className="w-6 h-6 text-white" />
              </div>
              <span className="font-medium text-blue-700 dark:text-blue-400">软件中心</span>
              <span className="text-xs text-gray-500">下载EA和工具</span>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              个人资料
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
                  {success && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-700">{success}</AlertDescription>
                    </Alert>
                  )}
                  {error && (
                    <Alert className="border-red-200 bg-red-50">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-700">{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label>新昵称</Label>
                    <Input
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="输入新昵称"
                      maxLength={20}
                    />
                    {!canChangeName && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        下次可修改时间: {nextNameChangeDate}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleNameChange}
                    disabled={nameLoading || !newName.trim() || newName === user?.name || !canChangeName}
                    className="w-full"
                  >
                    {nameLoading ? '保存中...' : '保存昵称'}
                  </Button>
                </CardContent>
              </Card>

              {/* 头像设置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-purple-500" />
                    头像设置
                  </CardTitle>
                  <CardDescription>
                    上传您的头像，建议尺寸 200x200
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-24 h-24">
                      <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-2xl">
                        {user?.name?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                      {user?.avatar && <AvatarImage src={user.avatar} />}
                    </Avatar>
                    <div>
                      <input
                        type="file"
                        id="avatar-upload"
                        ref={fileInputRef}
                        onChange={handleAvatarChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <label htmlFor="avatar-upload">
                        <Button
                          variant="outline"
                          asChild
                          disabled={avatarLoading}
                          className="cursor-pointer"
                        >
                          <span>{avatarLoading ? '上传中...' : '选择图片'}</span>
                        </Button>
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {mtAccount ? (
                      <Unlink className="w-5 h-5 text-red-500" />
                    ) : (
                      <Link2 className="w-5 h-5 text-green-500" />
                    )}
                    MT账号绑定
                  </CardTitle>
                  <CardDescription>
                    绑定您的MT4/MT5账号，用于接收跟单信号
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {mtAccount ? (
                    <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                          <Globe className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-lg">{mtAccount.accountNumber}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{mtAccount.platform}</Badge>
                            <Badge className={mtAccount.isVerified ? 'bg-green-500' : 'bg-yellow-500'}>
                              {mtAccount.isVerified ? '已验证' : '待验证'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleUnbindMTAccount}
                        disabled={mtLoading}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Unlink className="w-4 h-4 mr-1" />
                        解绑
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleBindMTAccount} className="space-y-4">
                      {error && (
                        <Alert className="border-red-200 bg-red-50">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-700">{error}</AlertDescription>
                        </Alert>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>MT账号</Label>
                          <Input
                            value={mtForm.accountNumber}
                            onChange={e => setMtForm({ ...mtForm, accountNumber: e.target.value })}
                            placeholder="输入MT账号"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>平台</Label>
                          <select
                            value={mtForm.platform}
                            onChange={e => setMtForm({ ...mtForm, platform: e.target.value })}
                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                          >
                            <option value="MT4">MT4</option>
                            <option value="MT5">MT5</option>
                          </select>
                        </div>
                      </div>
                      <Button type="submit" disabled={mtLoading} className="w-full">
                        {mtLoading ? '绑定中...' : '绑定账号'}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>

              {/* MT账号绑定 - 暂时隐藏 */}
              {/*
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-amber-500" />
                    我的跟单
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {followInfo.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>暂未跟单任何信号</p>
                      <p className="text-sm mt-2">去星球探索感兴趣的信号吧</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {followInfo.map(info => (
                        <div key={info.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                              <Globe className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-medium">{info.planetName}</p>
                              <p className="text-xs text-gray-500">信号账号: {info.signalAccount}</p>
                            </div>
                          </div>
                          <Badge className={info.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                            {info.status === 'active' ? '跟单中' : '已暂停'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 投诉和建议入口 */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-red-500" />
                    意见反馈
                  </CardTitle>
                  <CardDescription>
                    有问题或建议？我们随时为您服务
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <a href="/complaint" className="block">
                      <div className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors cursor-pointer">
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                          <MessageSquare className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <p className="font-semibold">意见投诉</p>
                          <p className="text-sm text-gray-500">提交您遇到的问题</p>
                        </div>
                      </div>
                    </a>
                    <a href="/suggestion" className="block">
                      <div className="flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors cursor-pointer">
                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                          <Lightbulb className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-semibold">意见建议</p>
                          <p className="text-sm text-gray-500">提出您的宝贵建议</p>
                        </div>
                      </div>
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Recharge Tab */}
          <TabsContent value="recharge">
            {/* 微信充值入口 */}
            <Card className="border-green-200 dark:border-green-800 max-w-xl mx-auto">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <QrCode className="w-5 h-5 text-green-500" />
                  充值 U
                </CardTitle>
                <CardDescription className="text-xs">
                  使用微信扫码支付，方便快捷
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a href="/wechat-recharge" className="block">
                  <Button 
                    variant="outline" 
                    className="w-full h-auto py-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <QrCode className="w-10 h-10 text-green-600" />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-lg text-green-700 dark:text-green-400">微信扫码充值</p>
                        <p className="text-xs text-gray-500 mt-1">点击进入充值页面 →</p>
                      </div>
                    </div>
                  </Button>
                </a>
                <p className="text-xs text-gray-500 text-center mt-4">
                  * 充值申请提交后，后台将在1-24小时内审核，审核通过后 U 将自动到账
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Social Tab */}
          <TabsContent value="social">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
                    onClick={() => { setSocialSection('messages'); setSelectedConversation(null); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      socialSection === 'messages' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span>私信</span>
                    {conversations.filter(c => c.unreadCount > 0).length > 0 && (
                      <Badge className="ml-auto bg-red-500">{conversations.filter(c => c.unreadCount > 0).length}</Badge>
                    )}
                  </button>
                  <button
                    onClick={() => { setSocialSection('follow'); setSelectedConversation(null); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      socialSection === 'follow' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <UserPlus className="w-5 h-5" />
                    <span>关注列表</span>
                  </button>
                  <button
                    onClick={() => { setSocialSection('transfer'); setSelectedConversation(null); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      socialSection === 'transfer' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <ArrowRightLeft className="w-5 h-5" />
                    <span>转账</span>
                  </button>
                  <button
                    onClick={() => { setSocialSection('search'); setSelectedConversation(null); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      socialSection === 'search' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Search className="w-5 h-5" />
                    <span>搜索用户</span>
                  </button>
                </CardContent>
              </Card>

              {/* 右侧内容区 */}
              <div className="lg:col-span-3">
                {/* 私信列表/聊天 */}
                {socialSection === 'messages' && !selectedConversation && (
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
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium truncate">{conv.userName}</span>
                                    {conv.uBalance !== undefined && (
                                      <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800">
                                        {conv.uBalance} U
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {new Date(conv.lastMessage.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500 truncate">
                                  {conv.lastMessage.senderId === user?.userId ? '我: ' : ''}
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
                {socialSection === 'messages' && selectedConversation && (
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
                      <CardTitle className="text-lg flex items-center gap-2">
                        {selectedConversation.userName}
                        {selectedConversation.uBalance !== undefined && (
                          <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800">
                            {selectedConversation.uBalance} U
                          </Badge>
                        )}
                      </CardTitle>
                      <Button variant="outline" size="sm" className="ml-auto" onClick={() => handleViewProfile(selectedConversation.userId)}>
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
                        messages.map(msg => {
                          const imageUrlMatch = msg.content?.match(/\[图片\](https?:\/\/[^\s]+)/);
                          const imageUrl = imageUrlMatch ? imageUrlMatch[1] : null;
                          const textContent = msg.content?.replace(/\[图片\]https?:\/\/[^\s]+/, '').trim() || '';
                          
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${msg.sender_id === user?.userId ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[70%] px-4 py-2 rounded-lg ${
                                  msg.sender_id === user?.userId
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800'
                                }`}
                              >
                                {imageUrl && (
                                  <img 
                                    src={imageUrl} 
                                    alt="图片消息" 
                                    className="rounded-lg mb-2 max-w-full cursor-pointer hover:opacity-90"
                                    onClick={() => window.open(imageUrl, '_blank')}
                                  />
                                )}
                                {textContent && <p>{textContent}</p>}
                                <p className={`text-xs mt-1 ${
                                  msg.sender_id === user?.userId ? 'text-amber-200' : 'text-gray-500'
                                }`}>
                                  {new Date(msg.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                    <div className="p-4 border-t space-y-3">
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
                          id="message-image-user"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                        />
                        <label
                          htmlFor="message-image-user"
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
                {socialSection === 'transfer' && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <ArrowRightLeft className="w-5 h-5" />
                          转账
                        </CardTitle>
                        <CardDescription>
                          向其他用户转账 U，当前余额: <span className="font-bold text-amber-600">{user?.coinBalance || 0}</span>
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
                {socialSection === 'search' && (
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
                          {searchResults.map(userResult => (
                            <div key={userResult.userId} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <button 
                                className="flex items-center gap-3 flex-1 text-left"
                                onClick={() => handleViewProfile(userResult.userId)}
                              >
                                <Avatar className="w-12 h-12">
                                  <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                                    {userResult.name.slice(0, 1)}
                                  </AvatarFallback>
                                  {userResult.avatar && <AvatarImage src={userResult.avatar} />}
                                </Avatar>
                                <div>
                                  <p className="font-medium">{userResult.name}</p>
                                  {userResult.email && <p className="text-xs text-gray-500">{userResult.email}</p>}
                                </div>
                              </button>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewProfile(userResult.userId)}
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant={followingIds.has(userResult.userId) ? 'outline' : 'default'}
                                  size="sm"
                                  onClick={() => handleFollow(userResult.userId)}
                                  className={followingIds.has(userResult.userId) ? '' : 'bg-amber-600'}
                                >
                                  {followingIds.has(userResult.userId) ? (
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
                                    setSocialSection('messages');
                                    setSelectedConversation({
                                      userId: userResult.userId,
                                      userName: userResult.name,
                                      userAvatar: userResult.avatar,
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
                {socialSection === 'follow' && (
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
                                    setSocialSection('messages');
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
                    <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <Coins className="w-5 h-5 text-amber-600" />
                      <div>
                        <p className="text-sm text-gray-500">拥有 U</p>
                        <p className="font-bold text-amber-600">{viewingUser.coinBalance?.toLocaleString() || 0}</p>
                      </div>
                    </div>

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

                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Calendar className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="text-sm text-gray-500">注册时间</p>
                        <p className="font-medium">{viewingUser.createdAt ? new Date(viewingUser.createdAt).toLocaleDateString() : '-'}</p>
                      </div>
                    </div>

                    {viewingUser.bio && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm text-gray-500 mb-1">个人介绍</p>
                        <p className="text-gray-700 dark:text-gray-300">{viewingUser.bio}</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant={followingIds.has(viewingUser.userId) ? 'outline' : 'default'}
                        className="flex-1"
                        onClick={() => {
                          handleFollow(viewingUser.userId);
                        }}
                      >
                        {followingIds.has(viewingUser.userId) ? (
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
                        className="flex-1"
                        onClick={() => {
                          setSocialSection('messages');
                          setSelectedConversation({
                            userId: viewingUser.userId,
                            userName: viewingUser.name,
                            userAvatar: viewingUser.avatar,
                            lastMessage: { id: 0, content: '', senderId: '', createdAt: '' },
                            unreadCount: 0,
                          });
                          setViewingUser(null);
                        }}
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        发私信
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
