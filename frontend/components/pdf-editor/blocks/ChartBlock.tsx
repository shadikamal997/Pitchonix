'use client';

import React from 'react';
import { BarChart3, PieChart, LineChart, TrendingUp } from 'lucide-react';

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface ChartBlockProps {
  type?: 'bar' | 'line' | 'pie' | 'donut';
  data?: ChartDataPoint[];
  title?: string;
  subtitle?: string;
  showLegend?: boolean;
  height?: number;
  onChange?: (data: ChartDataPoint[]) => void;
}

const defaultData: ChartDataPoint[] = [
  { label: 'Q1', value: 45000, color: '#10b981' },
  { label: 'Q2', value: 52000, color: '#3b82f6' },
  { label: 'Q3', value: 61000, color: '#8b5cf6' },
  { label: 'Q4', value: 71000, color: '#f59e0b' },
];

export function ChartBlock({
  type = 'bar',
  data = defaultData,
  title = 'Quarterly Revenue',
  subtitle = 'Revenue performance across quarters',
  showLegend = true,
  height = 300,
  onChange,
}: ChartBlockProps) {
  const maxValue = Math.max(...data.map((d) => d.value));

  const formatValue = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  const renderBarChart = () => {
    return (
      <div className="flex items-end justify-between gap-4" style={{ height: `${height}px` }}>
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * (height - 60);
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-3">
              <div className="w-full flex flex-col items-center justify-end flex-1">
                <span className="text-sm font-bold text-[#111111] mb-2">{formatValue(item.value)}</span>
                <div
                  className="w-full rounded-t-xl transition-all hover:opacity-80 cursor-pointer"
                  style={{
                    height: `${barHeight}px`,
                    backgroundColor: item.color || '#10b981',
                  }}
                />
              </div>
              <span className="text-sm font-semibold text-[#6B6B6B]">{item.label}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderLineChart = () => {
    const chartHeight = height - 60;
    const chartWidth = 100;
    const points = data.map((item, index) => {
      const x = (index / (data.length - 1)) * chartWidth;
      const y = chartHeight - (item.value / maxValue) * chartHeight;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="relative" style={{ height: `${height}px` }}>
        <svg className="w-full" viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`} preserveAspectRatio="none">
          {/* Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((percentage, index) => (
            <line
              key={index}
              x1="0"
              y1={chartHeight * percentage}
              x2={chartWidth}
              y2={chartHeight * percentage}
              stroke="#e2e8f0"
              strokeWidth="0.5"
            />
          ))}

          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {data.map((item, index) => {
            const x = (index / (data.length - 1)) * chartWidth;
            const y = chartHeight - (item.value / maxValue) * chartHeight;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="2"
                fill={item.color || '#10b981'}
                className="cursor-pointer hover:r-3 transition-all"
              />
            );
          })}
        </svg>

        {/* X-Axis Labels */}
        <div className="flex justify-between mt-2">
          {data.map((item, index) => (
            <span key={index} className="text-sm font-semibold text-[#6B6B6B]">
              {item.label}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const renderPieChart = () => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = 0;

    return (
      <div className="flex items-center justify-center gap-8">
        <div className="relative" style={{ width: height, height }}>
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            {data.map((item, index) => {
              const percentage = item.value / total;
              const angle = percentage * 360;
              const startAngle = currentAngle;
              const endAngle = currentAngle + angle;
              currentAngle = endAngle;

              // Convert to radians
              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;

              // Calculate path
              const x1 = 50 + 40 * Math.cos(startRad);
              const y1 = 50 + 40 * Math.sin(startRad);
              const x2 = 50 + 40 * Math.cos(endRad);
              const y2 = 50 + 40 * Math.sin(endRad);
              const largeArc = angle > 180 ? 1 : 0;

              return (
                <path
                  key={index}
                  d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={item.color || `hsl(${index * 60}, 70%, 60%)`}
                  className="hover:opacity-80 cursor-pointer transition-opacity"
                />
              );
            })}
            {type === 'donut' && (
              <circle cx="50" cy="50" r="25" fill="white" />
            )}
          </svg>
        </div>

        {showLegend && (
          <div className="space-y-3">
            {data.map((item, index) => {
              const percentage = ((item.value / total) * 100).toFixed(1);
              return (
                <div key={index} className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: item.color || `hsl(${index * 60}, 70%, 60%)` }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#111111]">{item.label}</p>
                    <p className="text-xs text-[#9A9A9A]">{formatValue(item.value)} ({percentage}%)</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const getIcon = () => {
    switch (type) {
      case 'bar':
        return <BarChart3 className="h-6 w-6 text-[#4F7563]" />;
      case 'line':
        return <TrendingUp className="h-6 w-6 text-[#4F7563]" />;
      case 'pie':
      case 'donut':
        return <PieChart className="h-6 w-6 text-[#4F7563]" />;
    }
  };

  return (
    <div className="w-full py-8 bg-white border-2 border-[#E3E1DA] rounded-2xl p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {getIcon()}
        <div>
          {title && <h3 className="text-xl font-bold text-[#111111]">{title}</h3>}
          {subtitle && <p className="text-sm text-[#6B6B6B]">{subtitle}</p>}
        </div>
      </div>

      {/* Chart */}
      <div className="mt-6">
        {type === 'bar' && renderBarChart()}
        {type === 'line' && renderLineChart()}
        {(type === 'pie' || type === 'donut') && renderPieChart()}
      </div>
    </div>
  );
}

export default ChartBlock;
