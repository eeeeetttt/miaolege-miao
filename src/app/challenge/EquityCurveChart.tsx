'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';

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
  if (equityHistory.length === 0) {
    return null;
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={equityHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
          <XAxis 
            dataKey="time" 
            stroke="#888"
            fontSize={10}
            tickFormatter={(value, index) => {
              if (index === 0 || index === equityHistory.length - 1) return value;
              return '';
            }}
          />
          <YAxis 
            stroke="#888"
            fontSize={10}
            domain={['dataMin - 50', 'dataMax + 50']}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1a1a1a', 
              border: '1px solid #333',
              borderRadius: '8px',
              color: '#fff'
            }}
            labelStyle={{ color: '#888' }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, '净值']}
          />
          {currentLevelConfig && (
            <ReferenceLine 
              y={currentLevelConfig.targetBalance} 
              stroke="#22c55e" 
              strokeDasharray="5 5"
              label={{ value: '目标', fill: '#22c55e', fontSize: 10 }}
            />
          )}
          {currentLevelConfig && (
            <ReferenceLine 
              y={currentLevelConfig.failBalance} 
              stroke="#ef4444" 
              strokeDasharray="5 5"
              label={{ value: '底线', fill: '#ef4444', fontSize: 10 }}
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
      </ResponsiveContainer>
    </>
  );
}
