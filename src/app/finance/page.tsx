'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  CreditCard, 
  Percent,
  Users,
  Crown,
  Lock,
  Unlock,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  AlertCircle,
  Check,
  X,
  Wallet
} from 'lucide-react';

interface Bank {
  bank_id: string;
  name: string;
  price: number;
  owner_id: string | null;
  owner_name?: string;
  interest_rate: string;
  max_loan: number;
  daily_output: number;
  status: string;
  user_loan?: number;
  user_total_interest?: number;
  interestRate?: number;
  maxLoan?: number;
  currentLoan?: number;
  isOwned?: boolean;
}

interface Exchange {
  exchange_id: string;
  name: string;
  price: number;
  owner_id: string | null;
  owner_name?: string;
  fee_rate: string;
  total_fee_earned: string;
  status: string;
  feeRate?: number;
  totalFeeEarned?: number;
  isOwned?: boolean;
}

export default function FinancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'banks' | 'exchanges'>('banks');
  const [banks, setBanks] = useState<Bank[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userBalance, setUserBalance] = useState({ goldBalance: 0, coinBalance: 0 });
  
  // 借款/还款 Modal
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [loanAmount, setLoanAmount] = useState('');
  const [loanType, setLoanType] = useState<'borrow' | 'repay'>('borrow');
  
  // 购买 Modal
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyType, setBuyType] = useState<'bank' | 'exchange'>('bank');
  const [selectedItem, setSelectedItem] = useState<Bank | Exchange | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [banksRes, exchangesRes, balanceRes] = await Promise.all([
        fetch('/api/banks'),
        fetch('/api/exchanges'),
        fetch('/api/balance'),
      ]);
      const banksData = await banksRes.json();
      const exchangesData = await exchangesRes.json();
      const balanceData = await balanceRes.json();
      
      if (banksData.success) setBanks(banksData.banks);
      if (exchangesData.success) setExchanges(exchangesData.exchanges);
      if (balanceData.goldBalance !== undefined) {
        setUserBalance({
          goldBalance: balanceData.goldBalance || 0,
          coinBalance: balanceData.coinBalance || 0,
        });
      }
    } catch (error) {
      console.error('获取数据失败:', error);
      setMessage({ type: 'error', text: '加载失败，请刷新页面重试' });
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // 借款
  const handleBorrow = async () => {
    if (!selectedBank || !loanAmount) return;
    
    const amount = parseFloat(loanAmount);
    if (isNaN(amount) || amount <= 0) {
      showMessage('error', '请输入有效的借款金额');
      return;
    }
    
    if (amount > selectedBank.max_loan) {
      showMessage('error', `单次借款不能超过 ${selectedBank.max_loan.toLocaleString()} 两`);
      return;
    }

    setActionLoading('borrow');
    try {
      const res = await fetch('/api/bank-loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'borrow',
          bankId: selectedBank.bank_id,
          amount,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        showMessage('success', `成功借款 ${amount.toLocaleString()} 两！`);
        setShowLoanModal(false);
        setLoanAmount('');
        fetchData();
      } else {
        showMessage('error', data.message || '借款失败');
      }
    } catch {
      showMessage('error', '网络错误，请重试');
    } finally {
      setActionLoading(null);
    }
  };

  // 还款
  const handleRepay = async () => {
    if (!selectedBank || !loanAmount) return;
    
    const amount = parseFloat(loanAmount);
    if (isNaN(amount) || amount <= 0) {
      showMessage('error', '请输入有效的还款金额');
      return;
    }

    setActionLoading('repay');
    try {
      const res = await fetch('/api/bank-loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'repay',
          bankId: selectedBank.bank_id,
          amount,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        showMessage('success', `成功还款 ${amount.toLocaleString()} 两！`);
        setShowLoanModal(false);
        setLoanAmount('');
        fetchData();
      } else {
        showMessage('error', data.message || '还款失败');
      }
    } catch {
      showMessage('error', '网络错误，请重试');
    } finally {
      setActionLoading(null);
    }
  };

  // 购买钱庄/交易所
  const handleBuy = async () => {
    if (!selectedItem) return;

    setActionLoading('buy');
    try {
      const isBank = 'interest_rate' in selectedItem;
      const res = await fetch(isBank ? '/api/banks' : '/api/exchanges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'buy',
          [isBank ? 'bankId' : 'exchangeId']: isBank 
            ? (selectedItem as Bank).bank_id 
            : (selectedItem as Exchange).exchange_id,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        showMessage('success', `成功购买 ${selectedItem.name}！`);
        setShowBuyModal(false);
        fetchData();
      } else {
        showMessage('error', data.message || '购买失败');
      }
    } catch {
      showMessage('error', '网络错误，请重试');
    } finally {
      setActionLoading(null);
    }
  };

  // 打开借款/还款 Modal
  const openLoanModal = (bank: Bank, type: 'borrow' | 'repay') => {
    setSelectedBank(bank);
    setLoanType(type);
    setLoanAmount('');
    setShowLoanModal(true);
  };

  // 打开购买 Modal
  const openBuyModal = (item: Bank | Exchange, type: 'bank' | 'exchange') => {
    setSelectedItem(item);
    setBuyType(type);
    setShowBuyModal(true);
  };

  const userId = session?.user?.id;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white pb-20">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-yellow-600/30">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-7 h-7 text-yellow-500" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
                金融中心
              </h1>
            </div>
            <div className="text-sm text-gray-400">
              银两: <span className="text-yellow-400 font-bold">{userBalance.goldBalance?.toLocaleString() || 0}</span>
            </div>
          </div>
          
          {/* Tab 切换 */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('banks')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === 'banks'
                  ? 'bg-yellow-500 text-black'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              钱庄
            </button>
            <button
              onClick={() => setActiveTab('exchanges')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === 'exchanges'
                  ? 'bg-yellow-500 text-black'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              交易所
            </button>
          </div>
        </div>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-full text-sm font-medium ${
          message.type === 'success' 
            ? 'bg-green-500/90 text-white' 
            : 'bg-red-500/90 text-white'
        }`}>
          {message.type === 'success' ? <Check className="w-4 h-4 inline mr-1" /> : <X className="w-4 h-4 inline mr-1" />}
          {message.text}
        </div>
      )}

      {/* 内容区域 */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'banks' ? (
          /* 钱庄列表 */
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-gray-400">
                <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p>加载中...</p>
              </div>
            ) : banks.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Building2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>暂无钱庄数据</p>
                <p className="text-sm mt-2">请联系管理员初始化数据</p>
              </div>
            ) : banks.map((bank) => {
              const isOwner = bank.owner_id === userId;
              const hasLoan = bank.user_loan && bank.user_loan > 0;
              
              return (
                <div 
                  key={bank.bank_id}
                  className={`bg-gray-900/80 border rounded-2xl overflow-hidden ${
                    isOwner 
                      ? 'border-yellow-500/60' 
                      : 'border-gray-700/50'
                  }`}
                >
                  {/* 顶部装饰 */}
                  <div className={`h-1 ${isOwner ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-gray-700'}`} />
                  
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isOwner ? 'bg-yellow-500/20' : 'bg-gray-800'
                        }`}>
                          <Building2 className={`w-6 h-6 ${isOwner ? 'text-yellow-500' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{bank.name}</h3>
                          <p className="text-sm text-gray-400">
                            {isOwner ? (
                              <span className="text-yellow-400 flex items-center gap-1">
                                <Crown className="w-3 h-3" /> 您是庄主
                              </span>
                            ) : bank.owner_name ? (
                              `庄主: ${bank.owner_name}`
                            ) : (
                              <span className="text-green-400">系统直营</span>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      {/* 价格/日利率 */}
                      <div className="text-right">
                        <div className="text-xs text-gray-400">日利率</div>
                        <div className="text-lg font-bold text-yellow-400">
                          {(parseFloat(bank.interest_rate) * 100).toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    {/* 借款信息 */}
                    {hasLoan && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">当前欠款:</span>
                          <span className="text-red-400 font-bold">
                            {bank.user_loan?.toLocaleString()} 两
                          </span>
                        </div>
                        {bank.user_total_interest && bank.user_total_interest > 0 && (
                          <div className="flex items-center justify-between text-sm mt-1">
                            <span className="text-gray-400">累计利息:</span>
                            <span className="text-orange-400">
                              {bank.user_total_interest?.toLocaleString()} 两
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => openLoanModal(bank, 'borrow')}
                        className="flex-1 bg-green-600/80 hover:bg-green-500 text-white py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                      >
                        <ArrowDownRight className="w-4 h-4" />
                        借款
                      </button>
                      
                      {hasLoan ? (
                        <button
                          onClick={() => openLoanModal(bank, 'repay')}
                          className="flex-1 bg-blue-600/80 hover:bg-blue-500 text-white py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                          还款
                        </button>
                      ) : (
                        <button
                          onClick={() => openBuyModal(bank, 'bank')}
                          className="flex-1 bg-yellow-600/80 hover:bg-yellow-500 text-black py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                          <Coins className="w-4 h-4" />
                          购买 ({bank.price.toLocaleString()}两)
                        </button>
                      )}
                    </div>

                    {/* 借款上限提示 */}
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      单次借款上限: {bank.max_loan.toLocaleString()} 两
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* 交易所列表 */
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-gray-400">
                <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p>加载中...</p>
              </div>
            ) : exchanges.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>暂无交易所数据</p>
                <p className="text-sm mt-2">请联系管理员初始化数据</p>
              </div>
            ) : exchanges.map((exchange) => {
              const isOwner = exchange.owner_id === userId;
              
              return (
                <div 
                  key={exchange.exchange_id}
                  className={`bg-gray-900/80 border rounded-2xl overflow-hidden ${
                    isOwner 
                      ? 'border-yellow-500/60' 
                      : 'border-gray-700/50'
                  }`}
                >
                  {/* 顶部装饰 */}
                  <div className={`h-1 ${isOwner ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-gray-700'}`} />
                  
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isOwner ? 'bg-yellow-500/20' : 'bg-gray-800'
                        }`}>
                          <TrendingUp className={`w-6 h-6 ${isOwner ? 'text-yellow-500' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{exchange.name}</h3>
                          <p className="text-sm text-gray-400">
                            {isOwner ? (
                              <span className="text-yellow-400 flex items-center gap-1">
                                <Crown className="w-3 h-3" /> 您是席主
                              </span>
                            ) : exchange.owner_name ? (
                              `席主: ${exchange.owner_name}`
                            ) : (
                              <span className="text-green-400">系统直营</span>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      {/* 费率 */}
                      <div className="text-right">
                        <div className="text-xs text-gray-400">手续费率</div>
                        <div className="text-lg font-bold text-blue-400">
                          {(parseFloat(exchange.fee_rate) * 100).toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    {/* 席主收入 */}
                    {isOwner && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">累计收入:</span>
                          <span className="text-yellow-400 font-bold">
                            {parseFloat(exchange.total_fee_earned).toLocaleString()} 两
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex gap-2">
                      {!isOwner && (
                        <button
                          onClick={() => openBuyModal(exchange, 'exchange')}
                          className="flex-1 bg-yellow-600/80 hover:bg-yellow-500 text-black py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                          <Coins className="w-4 h-4" />
                          购买 ({exchange.price.toLocaleString()}两)
                        </button>
                      )}
                    </div>

                    {/* 提示 */}
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      所有交易将扣除 {((parseFloat(exchange.fee_rate) * 100)).toFixed(2)}% 手续费给席主
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 借款/还款 Modal */}
      {showLoanModal && selectedBank && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              {loanType === 'borrow' ? (
                <>
                  <ArrowDownRight className="w-5 h-5 text-green-500" />
                  向 {selectedBank.name} 借款
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-5 h-5 text-blue-500" />
                  向 {selectedBank.name} 还款
                </>
              )}
            </h3>
            
            {loanType === 'repay' && selectedBank.user_loan && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">当前欠款:</span>
                  <span className="text-red-400 font-bold">
                    {selectedBank.user_loan.toLocaleString()} 两
                  </span>
                </div>
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">
                {loanType === 'borrow' ? '借款金额' : '还款金额'}
              </label>
              <input
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                placeholder="请输入金额"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500"
              />
              {loanType === 'borrow' && (
                <p className="text-xs text-gray-500 mt-2">
                  借款上限: {selectedBank.max_loan.toLocaleString()} 两
                </p>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowLoanModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={loanType === 'borrow' ? handleBorrow : handleRepay}
                disabled={actionLoading !== null}
                className={`flex-1 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                  loanType === 'borrow'
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                } disabled:opacity-50`}
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : loanType === 'borrow' ? (
                  <>确认借款</>
                ) : (
                  <>确认还款</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 购买 Modal */}
      {showBuyModal && selectedItem && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-500" />
              购买 {selectedItem.name}
            </h3>
            
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">购买价格:</span>
                <span className="text-2xl font-bold text-yellow-400">
                  {(selectedItem as Bank).price 
                    ? (selectedItem as Bank).price.toLocaleString()
                    : (selectedItem as Exchange).price.toLocaleString()
                  } 两
                </span>
              </div>
              <p className="text-xs text-gray-500">
                购买后将获得 {selectedItem.name} 的所有权，可设置利率/费率获取收益
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowBuyModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleBuy}
                disabled={actionLoading !== null}
                className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-black py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>确认购买</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
