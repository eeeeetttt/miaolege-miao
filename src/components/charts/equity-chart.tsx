'use client';

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
  if (!data || data.length === 0) {
    return (
      <div 
        className="flex items-center justify-center text-gray-400"
        style={{ height }}
      >
        暂无数据
      </div>
    );
  }

  // 找到最小值和最大值用于计算
  const values = data.map(d => d.equity);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;
  const padding = range * 0.1;
  const chartHeight = height - 40;
  
  // 计算 SVG 路径
  const width = 100; // 百分比
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = chartHeight - ((d.equity - minValue + padding) / (range + padding * 2)) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${chartHeight} ${points} ${width},${chartHeight}`;

  return (
    <div style={{ height }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${chartHeight + 20}`} preserveAspectRatio="none">
        {/* 背景网格线 */}
        <line x1="0" y1={chartHeight * 0.25} x2={width} y2={chartHeight * 0.25} stroke="#e5e7eb" strokeDasharray="3 3" />
        <line x1="0" y1={chartHeight * 0.5} x2={width} y2={chartHeight * 0.5} stroke="#e5e7eb" strokeDasharray="3 3" />
        <line x1="0" y1={chartHeight * 0.75} x2={width} y2={chartHeight * 0.75} stroke="#e5e7eb" strokeDasharray="3 3" />
        
        {/* 起始净值参考线 */}
        <line x1="0" y1={chartHeight - ((1000 - minValue + padding) / (range + padding * 2)) * chartHeight} 
              x2={width} 
              y2={chartHeight - ((1000 - minValue + padding) / (range + padding * 2)) * chartHeight} 
              stroke="#9ca3af" strokeDasharray="3 3" />
        
        {/* 面积填充 */}
        <polygon points={areaPoints} fill="url(#chartGradient)" opacity="0.3" />
        
        {/* 渐变定义 */}
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity="1" />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        
        {/* 折线 */}
        <polyline points={points} fill="none" stroke="#8b5cf6" strokeWidth="2" />
        
        {/* 数据点 */}
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * width;
          const y = chartHeight - ((d.equity - minValue + padding) / (range + padding * 2)) * chartHeight;
          return <circle key={i} cx={x} cy={y} r="3" fill="#8b5cf6" />;
        })}
      </svg>
      
      {/* 标签 */}
      <div className="flex justify-between text-xs text-gray-400 px-2" style={{ height: 20 }}>
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}
