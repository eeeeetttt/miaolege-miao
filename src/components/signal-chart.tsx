'use client';

import { useMemo } from 'react';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, BarChart3, PieChart as PieChartIcon } from 'lucide-react';

interface Signal {
  id: number;
  createdAt: string;
  symbol: string;
  orderType: string;
  volume: string;
  dealProfit: string | null;
}

interface SignalChartProps {
  signals: Signal[];
}

const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1'];

export function SignalChart({ signals }: SignalChartProps) {
  const chartData = useMemo(() => {
    // 按日期分组统计收益
    const dailyProfit: { [date: string]: number } = {};
    const symbolCount: { [symbol: string]: number } = {};
    const orderTypeCount: { [type: string]: number } = { BUY: 0, SELL: 0 };
    
    let totalProfit = 0;
    let winCount = 0;
    let totalTrades = 0;

    signals.forEach(signal => {
      // 按日期分组
      const date = new Date(signal.createdAt).toLocaleDateString();
      const profit = parseFloat(signal.dealProfit || '0');
      dailyProfit[date] = (dailyProfit[date] || 0) + profit;

      // 按品种统计
      symbolCount[signal.symbol] = (symbolCount[signal.symbol] || 0) + 1;

      // 按方向统计
      if (signal.orderType === 'BUY' || signal.orderType === 'SELL') {
        orderTypeCount[signal.orderType]++;
      }

      // 胜率计算
      if (signal.dealProfit) {
        totalProfit += profit;
        if (profit > 0) winCount++;
        totalTrades++;
      }
    });

    // 累计收益曲线
    const profitCurve = Object.entries(dailyProfit)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .reduce<{ date: string; profit: number; cumulative: number }[]>((acc, [date, profit]) => {
        const prevCumulative = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;
        acc.push({
          date,
          profit: parseFloat(profit.toFixed(2)),
          cumulative: parseFloat((prevCumulative + profit).toFixed(2)),
        });
        return acc;
      }, []);

    // 品种分布
    const symbolDistribution = Object.entries(symbolCount)
      .map(([symbol, count]) => ({ symbol, count, name: symbol }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);

    // 方向分布
    const orderDistribution = [
      { name: '做多', value: orderTypeCount.BUY, fill: '#10B981' },
      { name: '做空', value: orderTypeCount.SELL, fill: '#EF4444' },
    ];

    return {
      profitCurve,
      symbolDistribution,
      orderDistribution,
      stats: {
        totalProfit,
        winRate: totalTrades > 0 ? ((winCount / totalTrades) * 100).toFixed(1) : '0',
        totalTrades: signals.length,
        winCount,
      },
    };
  }, [signals]);

  const profitChartConfig: ChartConfig = {
    profit: {
      label: '当日收益',
      color: '#8B5CF6',
    },
    cumulative: {
      label: '累计收益',
      color: '#3B82F6',
    },
  };

  const symbolChartConfig: ChartConfig = chartData.symbolDistribution.reduce((acc, item, index) => {
    acc[item.symbol] = {
      label: item.symbol,
      color: COLORS[index % COLORS.length],
    };
    return acc;
  }, {} as ChartConfig);

  const orderChartConfig: ChartConfig = {
    BUY: { label: '做多', color: '#10B981' },
    SELL: { label: '做空', color: '#EF4444' },
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              {chartData.stats.totalProfit >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">总收益</p>
                <p className={`text-lg font-bold ${chartData.stats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${chartData.stats.totalProfit.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">总交易</p>
                <p className="text-lg font-bold">{chartData.stats.totalTrades}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">胜率</p>
                <p className="text-lg font-bold text-green-600">{chartData.stats.winRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">盈利交易</p>
                <p className="text-lg font-bold">{chartData.stats.winCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {signals.length > 0 && (
        <Tabs defaultValue="profit" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profit">收益曲线</TabsTrigger>
            <TabsTrigger value="symbol">品种分布</TabsTrigger>
            <TabsTrigger value="direction">方向分布</TabsTrigger>
          </TabsList>

          <TabsContent value="profit">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">收益曲线</CardTitle>
                <CardDescription>每日收益和累计收益趋势</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={profitChartConfig} className="h-[300px] w-full">
                  <AreaChart data={chartData.profitCurve}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      stroke="#3B82F6"
                      fill="url(#blueGradient)"
                      strokeWidth={2}
                    />
                    <defs>
                      <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="symbol">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">品种分布</CardTitle>
                <CardDescription>交易品种频次统计</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={symbolChartConfig} className="h-[300px] w-full">
                  <BarChart data={chartData.symbolDistribution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="symbol" 
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {chartData.symbolDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="direction">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">方向分布</CardTitle>
                <CardDescription>做多做空比例</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={orderChartConfig} className="h-[300px] w-full">
                  <PieChart>
                    <Pie
                      data={chartData.orderDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {chartData.orderDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
