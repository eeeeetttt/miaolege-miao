'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface EquityChartProps {
  data: Array<{
    time: number;
    timeLabel: string;
    equity: number;
    balance: number;
  }>;
  initialBalance: number;
}

export default function EquityChart({ data, initialBalance }: EquityChartProps) {
  if (data.length < 2) {
    return null;
  }

  return (
    <ResponsiveContainer width="100%" height={80}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <defs>
          <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
        <XAxis 
          dataKey="timeLabel" 
          tick={{ fontSize: 10, fill: '#6b7280' }}
          axisLine={{ stroke: '#333' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis 
          tick={{ fontSize: 10, fill: '#6b7280' }}
          axisLine={{ stroke: '#333' }}
          tickLine={false}
          tickFormatter={(v: number) => `$${v.toFixed(0)}`}
          width={50}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#1e2230', 
            border: '1px solid #333',
            borderRadius: '8px',
            fontSize: '12px'
          }}
          formatter={(value: number) => [`$${value.toFixed(2)}`, '净值']}
        />
        <ReferenceLine y={initialBalance} stroke="#D4AF37" strokeDasharray="3 3" />
        <Area 
          type="monotone" 
          dataKey="equity" 
          stroke="#22c55e" 
          strokeWidth={2}
          fill="url(#equityGradient)" 
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
