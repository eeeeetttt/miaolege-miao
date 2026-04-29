'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

interface EquityPoint {
  time: string;
  equity: number;
}

interface LevelConfig {
  level: number;
  name: string;
  description: string | null;
  targetBalance: number;
  initialBalance: number;
  failBalance: number;
}

interface EquityCurveChartProps {
  equityHistory: EquityPoint[];
  currentLevelConfig: LevelConfig | null;
  currentEquity: number;
}

export default function EquityCurveChart({ equityHistory, currentLevelConfig, currentEquity }: EquityCurveChartProps) {
  const chartConfig: ChartConfig = useMemo(() => ({
    equity: {
      label: '净值',
      color: '#f59e0b',
    },
    target: {
      label: '目标',
      color: '#22c55e',
    },
    fail: {
      label: '底线',
      color: '#ef4444',
    },
  }), []);

  if (equityHistory.length === 0) {
    return null;
  }

  const minEquity = Math.min(...equityHistory.map(p => p.equity));
  const maxEquity = Math.max(...equityHistory.map(p => p.equity));
  const padding = (maxEquity - minEquity) * 0.1 || 100;
  const domainMin = Math.floor((minEquity - padding) / 100) * 100;
  const domainMax = Math.ceil((maxEquity + padding) / 100) * 100;

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <LineChart 
        data={equityHistory} 
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="time" 
          tick={{ fontSize: 10 }}
          className="text-muted-foreground"
          tickFormatter={(value, index) => {
            if (index === 0 || index === equityHistory.length - 1) return value;
            return '';
          }}
        />
        <YAxis 
          tick={{ fontSize: 10 }}
          className="text-muted-foreground"
          domain={[domainMin, domainMax]}
          tickFormatter={(value) => `$${value}`}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        {currentLevelConfig && (
          <ReferenceLine 
            y={currentLevelConfig.targetBalance} 
            stroke="#22c55e" 
            strokeDasharray="5 5"
          />
        )}
        {currentLevelConfig && (
          <ReferenceLine 
            y={currentLevelConfig.failBalance} 
            stroke="#ef4444" 
            strokeDasharray="5 5"
          />
        )}
        <Line 
          type="monotone" 
          dataKey="equity" 
          stroke="#f59e0b" 
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#f59e0b' }}
        />
      </LineChart>
    </ChartContainer>
  );
}
