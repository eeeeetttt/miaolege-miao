'use client';

import { useState, useEffect } from 'react';

interface EquityChartProps {
  data: Array<{
    date: string;
    time: string;
    equity: number;
    profit: number;
  }>;
  height?: number;
}

export default function EquityChart({ data, height = 200 }: EquityChartProps) {
  const [isClient, setIsClient] = useState(false);
  const [ChartComponent, setChartComponent] = useState<React.ComponentType<{
    data: typeof data;
    height?: number;
  }> | null>(null);

  useEffect(() => {
    setIsClient(true);
    // 动态导入 recharts 组件
    import('./equity-chart-inner').then((mod) => {
      setChartComponent(() => mod.EquityChartInner);
    });
  }, []);

  if (!isClient) {
    return (
      <div 
        className="h-48 flex items-center justify-center text-gray-400"
        style={{ height }}
      >
        加载图表...
      </div>
    );
  }

  if (!ChartComponent) {
    return (
      <div 
        className="h-48 flex items-center justify-center text-gray-400"
        style={{ height }}
      >
        加载图表...
      </div>
    );
  }

  return <ChartComponent data={data} height={height} />;
}
