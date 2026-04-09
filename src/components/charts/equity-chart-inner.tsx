'use client';

import { 
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface EquityChartInnerProps {
  data: Array<{
    date: string;
    time: string;
    equity: number;
    profit: number;
  }>;
  height?: number;
}

export function EquityChartInner({ data, height = 200 }: EquityChartInnerProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data}>
        <defs>
          <linearGradient id="colorEquityChart" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis 
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value}`}
          domain={['auto', 'auto']}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
          formatter={(value: number) => [`$${value.toFixed(2)}`, '净值']}
          labelFormatter={(label) => `日期: ${label}`}
        />
        <ReferenceLine y={1000} stroke="#9ca3af" strokeDasharray="3 3" label="起始净值" />
        <Area
          type="monotone"
          dataKey="equity"
          stroke="#8b5cf6"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorEquityChart)"
        />
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}

export default EquityChartInner;
