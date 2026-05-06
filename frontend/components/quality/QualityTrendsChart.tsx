/**
 * Quality Trends Chart Component
 * Phase 10: Quality Trends Visualization
 */

'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendData, DimensionTrends } from '@/types/export';
import { getQualityTrends } from '@/lib/quality-history-api';

interface QualityTrendsChartProps {
  deckId: string;
  showDimensions?: boolean;
}

export function QualityTrendsChart({ deckId, showDimensions = false }: QualityTrendsChartProps) {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [dimensionTrends, setDimensionTrends] = useState<DimensionTrends | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overall' | 'dimensions'>('overall');

  useEffect(() => {
    loadTrends();
  }, [deckId]);

  const loadTrends = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getQualityTrends(deckId);
      setTrends(data.overall);
      setDimensionTrends(data.dimensions);
    } catch (err: any) {
      setError(err.message || 'Failed to load trends');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="p-8 text-center">
        <svg
          className="w-16 h-16 text-gray-300 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <h3 className="text-sm font-medium text-gray-900 mb-1">No Trend Data</h3>
        <p className="text-sm text-gray-600">
          Quality checks need to be performed over time to see trends.
        </p>
      </div>
    );
  }

  // Prepare chart data
  const chartData = trends.map((trend) => {
    const date = new Date(trend.date);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: trend.date,
      score: trend.score,
      grade: trend.grade,
    };
  });

  // Prepare dimension chart data
  const dimensionChartData = dimensionTrends
    ? trends.map((_, index) => ({
        date: new Date(trends[index].date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        content: dimensionTrends.content[index]?.score || 0,
        visual: dimensionTrends.visual[index]?.score || 0,
        ai: dimensionTrends.ai[index]?.score || 0,
        export: dimensionTrends.export[index]?.score || 0,
      }))
    : [];

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-xs text-gray-600 mb-2">{data.date}</p>
        {viewMode === 'overall' ? (
          <>
            <p className="text-sm font-medium text-gray-900">
              Score: {data.score.toFixed(1)}/100
            </p>
            <p className="text-xs text-gray-600">Grade: {data.grade}</p>
          </>
        ) : (
          <div className="space-y-1">
            {payload.map((entry: any) => (
              <div key={entry.name} className="flex items-center justify-between space-x-4">
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs text-gray-600 capitalize">{entry.name}:</span>
                </div>
                <span className="text-xs font-medium text-gray-900">
                  {entry.value.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      {showDimensions && dimensionTrends && (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('overall')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'overall'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Overall Score
          </button>
          <button
            onClick={() => setViewMode('dimensions')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'dimensions'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            By Dimension
          </button>
        </div>
      )}

      {/* Chart */}
      <div className="bg-white p-6 border border-gray-200 rounded-lg">
        <ResponsiveContainer width="100%" height={300}>
          {viewMode === 'overall' ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '14px' }}
                iconType="line"
              />
              <Line
                type="monotone"
                dataKey="score"
                name="Quality Score"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          ) : (
            <LineChart data={dimensionChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '14px' }}
                iconType="line"
              />
              <Line
                type="monotone"
                dataKey="content"
                name="Content"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="visual"
                name="Visual"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="ai"
                name="AI"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: '#f59e0b', r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="export"
                name="Export"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 3 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Trend Summary */}
      {trends.length >= 2 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'First Check',
              value: trends[0].score.toFixed(1),
              grade: trends[0].grade,
            },
            {
              label: 'Latest Check',
              value: trends[trends.length - 1].score.toFixed(1),
              grade: trends[trends.length - 1].grade,
            },
            {
              label: 'Change',
              value: (trends[trends.length - 1].score - trends[0].score > 0 ? '+' : '') + 
                     (trends[trends.length - 1].score - trends[0].score).toFixed(1),
              color: trends[trends.length - 1].score >= trends[0].score ? 'green' : 'red',
            },
            {
              label: 'Total Checks',
              value: trends.length.toString(),
            },
          ].map((stat) => (
            <div key={stat.label} className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">{stat.label}</p>
              <p
                className={`text-xl font-semibold ${
                  stat.color === 'green'
                    ? 'text-green-600'
                    : stat.color === 'red'
                    ? 'text-red-600'
                    : 'text-gray-900'
                }`}
              >
                {stat.value}
              </p>
              {stat.grade && (
                <p className="text-xs text-gray-600 mt-1">Grade: {stat.grade}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
