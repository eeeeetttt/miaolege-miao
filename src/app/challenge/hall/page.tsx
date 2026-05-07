'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';

interface Record {
  id: number;
  name: string;
  value: string;
  unit: string;
  holder: string;
  date: string;
  icon: string;
  category: string;
  desc: string;
}

export default function HallOfFamePage() {
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const res = await fetch('/api/challenge/hall-of-fame');
      const data = await res.json();
      if (data.records) {
        setRecords(data.records);
      } else {
        // 使用默认数据
        setRecords(defaultRecords);
      }
    } catch (error) {
      console.error('获取名人堂数据失败:', error);
      setRecords(defaultRecords);
    } finally {
      setLoading(false);
    }
  };

  const defaultRecords: Record[] = [
    { id: 1, name: "最高累计收益率", value: "2847.3", unit: "%", holder: "金手指·Aurelius", date: "2025-02", icon: "fa-chart-simple", category: "profit", desc: "赛季总收益 / 初始本金" },
    { id: 2, name: "最高单笔收益率", value: "812.6", unit: "%", holder: "伦敦猎手Luna", date: "2024-11", icon: "fa-bullseye", category: "profit", desc: "单笔平仓盈亏比本金" },
    { id: 3, name: "最大盈利总金额", value: "487,200", unit: "USD", holder: "GoldMaster", date: "2025-01", icon: "fa-sack-dollar", category: "profit", desc: "累计净利润峰值" },
    { id: 4, name: "最大单笔盈利金额", value: "124,800", unit: "USD", holder: "闪击·卡尔", date: "2024-12", icon: "fa-dollar-sign", category: "profit", desc: "单笔平仓盈利" },
    { id: 5, name: "最快翻倍记录", value: "3天2小时", unit: "", holder: "风暴·伊凡", date: "2025-03", icon: "fa-gauge-high", category: "profit", desc: "初始本金→200%用时" },
    { id: 6, name: "最高胜率", value: "87.3", unit: "%", holder: "精准猫", date: "2024-10", icon: "fa-chart-pie", category: "profit", desc: "盈利笔数/总笔数" },
    { id: 7, name: "最高盈亏比", value: "11.4:1", unit: "", holder: "稳健狙击手", date: "2025-01", icon: "fa-scale-balanced", category: "profit", desc: "平均盈利/平均亏损" },
    { id: 8, name: "最长连续盈利天数", value: "18", unit: "天", holder: "常胜将军", date: "2024-09", icon: "fa-calendar-check", category: "profit", desc: "连续每个交易日盈利" },
    { id: 9, name: "最高单日收益率", value: "212.5", unit: "%", holder: "日蚀", date: "2025-02", icon: "fa-sun", category: "profit", desc: "单日最高本金增长率" },
    { id: 10, name: "最多连胜次数", value: "23", unit: "笔", holder: "连击狂人", date: "2024-12", icon: "fa-fire-flame-curved", category: "profit", desc: "连续盈利交易笔数" },
    { id: 11, name: "最大亏损总金额", value: "98,500", unit: "USD", holder: "激进客·尼克", date: "2024-08", icon: "fa-chart-line", category: "risk", desc: "累计净亏损峰值" },
    { id: 12, name: "最大单笔亏损金额", value: "42,300", unit: "USD", holder: "夜鹰", date: "2024-07", icon: "fa-bomb", category: "risk", desc: "单笔平仓亏损" },
    { id: 13, name: "最大回撤率", value: "68.4", unit: "%", holder: "过山车玩家", date: "2025-01", icon: "fa-water", category: "risk", desc: "账户权益最大跌幅" },
    { id: 14, name: "爆仓次数最多", value: "9", unit: "次", holder: "不死鸟·强尼", date: "2024-12", icon: "fa-skull", category: "risk", desc: "累计穿仓/强平次数" },
    { id: 15, name: "最长连续亏损天数", value: "11", unit: "天", holder: "低迷苦行僧", date: "2024-06", icon: "fa-face-frown", category: "risk", desc: "连续亏损交易日" },
    { id: 16, name: "总交易笔数最多", value: "1,482", unit: "笔", holder: "高频机器", date: "2025-02", icon: "fa-chart-scatter", category: "action", desc: "赛季总开仓次数" },
    { id: 17, name: "单日交易笔数最多", value: "187", unit: "笔/日", holder: "闪电手", date: "2024-11", icon: "fa-clock", category: "action", desc: "单日疯狂交易记录" },
    { id: 18, name: "单笔持仓时间最长", value: "6天14小时", unit: "", holder: "耐心巨鳄", date: "2024-10", icon: "fa-hourglass-half", category: "action", desc: "单笔订单最长持有" },
    { id: 19, name: "最强抗压奖", value: "+346%", unit: "扭亏幅度", holder: "逆转神话", date: "2025-03", icon: "fa-hand-fist", category: "special", desc: "最大浮亏后扭亏为盈幅度" },
    { id: 20, name: "最佳新秀", value: "+128,700", unit: "USD", holder: "新人·阿瑞斯", date: "2025-02", icon: "fa-seedling", category: "special", desc: "首次参赛斩获总收益" },
    { id: 21, name: "最长存活时间", value: "124", unit: "天", holder: "不死图腾", date: "2024-12", icon: "fa-life-ring", category: "special", desc: "从入金到出金/爆仓天数" },
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'profit': return { icon: 'fa-chart-line', color: '#2ecc71', label: '收益荣耀' };
      case 'risk': return { icon: 'fa-exclamation-triangle', color: '#e67e22', label: '风险警示' };
      case 'action': return { icon: 'fa-bolt', color: '#3b82f6', label: '行为传奇' };
      case 'special': return { icon: 'fa-star', color: '#c084fc', label: '特殊纪念' };
      default: return { icon: 'fa-medal', color: '#D4AF37', label: '纪录' };
    }
  };

  const formatValue = (record: Record) => {
    if (record.name === "最快翻倍记录" || record.name === "单笔持仓时间最长") {
      return record.value;
    }
    return `${record.value}${record.unit ? ' ' + record.unit : ''}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'radial-gradient(circle at 10% 20%, #0a0c12 0%, #030406 100%)' }}>
        <div className="text-center">
          <i className="fas fa-crown text-6xl mb-4" style={{ color: '#D4AF37' }}></i>
          <p className="text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes" />
        <title>伦敦金挑战赛 · 名人堂 | 纪录之光</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,600;14..32,700;14..32,800&display=swap" rel="stylesheet" />
      </Head>

      <div className="min-h-screen pb-20" style={{ background: 'radial-gradient(circle at 10% 20%, #0a0c12 0%, #030406 100%)', fontFamily: 'Inter, sans-serif', color: '#edeef2' }}>
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* 页眉 */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600 bg-clip-text text-transparent flex items-center justify-center gap-4">
              <i className="fas fa-crown" style={{ background: 'none', color: '#D4AF37' }}></i>
              伦敦金名人堂
              <i className="fas fa-trophy" style={{ background: 'none', color: '#D4AF37' }}></i>
            </h1>
            <p className="text-lg text-gray-400 mt-4 border-t border-dashed border-yellow-700/40 inline-block pt-4">
              致敬传奇交易员 · 不朽纪录之光
            </p>
            <div className="text-sm text-gray-500 mt-3">
              🏆 每一道光芒都是极致的交易烙印 | 数据持续更新
            </div>
          </div>

          {/* 分类标签 */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <span className="px-4 py-2 rounded-full text-sm font-medium bg-black/30 backdrop-blur border-l-2" style={{ borderColor: '#2ecc71', color: '#b8f2d0' }}>
              <i className="fas fa-chart-line mr-2"></i>收益·荣耀
            </span>
            <span className="px-4 py-2 rounded-full text-sm font-medium bg-black/30 backdrop-blur border-l-2" style={{ borderColor: '#e67e22', color: '#ffcd94' }}>
              <i className="fas fa-chart-line mr-2"></i>风险·警示
            </span>
            <span className="px-4 py-2 rounded-full text-sm font-medium bg-black/30 backdrop-blur border-l-2" style={{ borderColor: '#3b82f6', color: '#b4d0ff' }}>
              <i className="fas fa-hand-sparkles mr-2"></i>行为·传奇
            </span>
            <span className="px-4 py-2 rounded-full text-sm font-medium bg-black/30 backdrop-blur border-l-2" style={{ borderColor: '#a855f7', color: '#e0bcff' }}>
              <i className="fas fa-star-of-life mr-2"></i>特殊纪念
            </span>
          </div>

          {/* 记录网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {records.map((record) => {
              const cat = getCategoryIcon(record.category);
              return (
                <div
                  key={record.id}
                  className="rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-yellow-600/60"
                  style={{
                    background: 'rgba(12, 15, 22, 0.75)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(212, 175, 55, 0.25)',
                    boxShadow: '0 12px 20px -12px rgba(0,0,0,0.5)'
                  }}
                >
                  {/* 卡片头部 */}
                  <div className="flex justify-between items-center mb-4 pb-3 border-b border-dashed border-yellow-700/30">
                    <span className="font-bold text-xl bg-gradient-to-r from-yellow-100 to-yellow-300 bg-clip-text text-transparent">
                      {record.name}
                    </span>
                    <i className={`fas ${cat.icon} text-2xl opacity-80`} style={{ color: cat.color }}></i>
                  </div>

                  {/* 记录值 */}
                  <div className="my-4">
                    <div className="text-4xl font-extrabold" style={{ color: record.category === 'risk' ? '#ffaa66' : '#F9E0A0', lineHeight: 1.2 }}>
                      {formatValue(record)}
                    </div>
                    <div className="text-xs uppercase tracking-wider mt-2" style={{ color: '#7e849b' }}>
                      {record.desc}
                    </div>
                  </div>

                  {/* 保持者信息 */}
                  <div className="flex justify-between items-center mt-4 bg-black/40 rounded-full px-4 py-2">
                    <div className="font-semibold flex items-center gap-2">
                      <i className="fas fa-crown" style={{ color: '#D4AF37', fontSize: '0.8rem' }}></i>
                      {record.holder}
                    </div>
                    <div className="text-xs" style={{ color: '#8a8f9f' }}>
                      <i className="far fa-calendar-alt mr-1"></i> {record.date}
                    </div>
                  </div>

                  {/* 分类标签 */}
                  <div className="mt-3 text-right text-xs opacity-60">
                    {cat.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 脚注 */}
          <div className="text-center mt-16 pt-8 border-t border-yellow-700/25 text-sm text-gray-500">
            <i className="fas fa-fire mr-2"></i> 纪录保持者由大赛组委会认证 | 挑战自我，刻印黄金史诗
          </div>
        </div>
      </div>
    </>
  );
}
