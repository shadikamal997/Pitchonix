'use client';

import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { QualityDimensions } from '@/types/quality';

interface QualityDimensionChartProps {
  dimensions: QualityDimensions;
  title?: string;
  description?: string;
}

export function QualityDimensionChart({
  dimensions,
  title = 'Quality Dimensions',
  description = 'Breakdown of quality scores across four key areas',
}: QualityDimensionChartProps) {
  // Transform dimensions into chart data
  const chartData = [
    {
      dimension: 'Content',
      value: dimensions.content,
      fullMark: 100,
      description: 'Completeness and relevance of content',
    },
    {
      dimension: 'Visual',
      value: dimensions.visual,
      fullMark: 100,
      description: 'Design quality and aesthetics',
    },
    {
      dimension: 'AI Enhancement',
      value: dimensions.aiEnhancement,
      fullMark: 100,
      description: 'Quality of AI-generated enhancements',
    },
    {
      dimension: 'Export',
      value: dimensions.exportReadiness,
      fullMark: 100,
      description: 'Export compatibility and completeness',
    },
  ];

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-[#E3E1DA]">
          <p className="font-semibold text-[#111111]">{data.dimension}</p>
          <p className="text-sm text-[#6B6B6B] mb-2">{data.description}</p>
          <p className="text-lg font-bold text-[#355846]">{data.value}/100</p>
          <div className="mt-2 h-2 bg-[#E3E1DA] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#4F7563] rounded-full transition-all duration-300"
              style={{ width: `${data.value}%` }}
            />
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate average score
  const averageScore = (
    (dimensions.content +
      dimensions.visual +
      dimensions.aiEnhancement +
      dimensions.exportReadiness) /
    4
  ).toFixed(1);

  // Determine color based on average
  const getColor = (score: number) => {
    if (score >= 90) return '#10b981'; // Green
    if (score >= 80) return '#84cc16'; // Yellow-green
    if (score >= 70) return '#f59e0b'; // Yellow
    if (score >= 60) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const chartColor = getColor(Number(averageScore));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <span className="text-sm font-normal text-[#6B6B6B]">
            Avg: <span className="font-semibold text-[#111111]">{averageScore}</span>
          </span>
        </CardTitle>
        {description && <p className="text-sm text-[#6B6B6B] mt-1">{description}</p>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={chartData}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: '#6b7280', fontSize: 10 }}
            />
            <Radar
              name="Quality Score"
              dataKey="value"
              stroke={chartColor}
              fill={chartColor}
              fillOpacity={0.6}
              strokeWidth={2}
              dot={{
                r: 4,
                fill: chartColor,
                strokeWidth: 2,
                stroke: '#fff',
              }}
              activeDot={{
                r: 6,
                strokeWidth: 2,
              }}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>

        {/* Dimension Details */}
        <div className="mt-4 space-y-2">
          {chartData.map((item) => (
            <div key={item.dimension} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getColor(item.value) }}
                />
                <span className="text-sm text-[#111111]">{item.dimension}</span>
              </div>
              <span className="text-sm font-semibold text-[#111111]">{item.value}/100</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
