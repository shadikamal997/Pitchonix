/**
 * Quality History Table Component
 * Phase 10: Quality History Display
 */

'use client';

import { useState, useEffect } from 'react';
import { QualityHistoryEntry, QualityStatistics } from '@/types/export';
import { getQualityHistory } from '@/lib/quality-history-api';
import { GRADE_COLORS } from '@/types/quality';

interface QualityHistoryTableProps {
  deckId: string;
}

export function QualityHistoryTable({ deckId }: QualityHistoryTableProps) {
  const [history, setHistory] = useState<QualityHistoryEntry[]>([]);
  const [statistics, setStatistics] = useState<QualityStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof QualityHistoryEntry>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadHistory();
  }, [deckId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getQualityHistory(deckId);
      setHistory(data.history);
      setStatistics(data.statistics);
    } catch (err: any) {
      setError(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof QualityHistoryEntry) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedHistory = [...history].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (aValue === undefined || bValue === undefined) return 0;
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

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

  if (history.length === 0) {
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
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="text-sm font-medium text-gray-900 mb-1">No History Yet</h3>
        <p className="text-sm text-gray-600">
          Quality checks will appear here once performed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Summary */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-600 font-medium mb-1">Average Score</p>
            <p className="text-2xl font-bold text-blue-900">
              {statistics.averageScore.toFixed(1)}
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-xs text-green-600 font-medium mb-1">Pass Rate</p>
            <p className="text-2xl font-bold text-green-900">
              {(statistics.passRate * 100).toFixed(0)}%
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-xs text-purple-600 font-medium mb-1">Total Checks</p>
            <p className="text-2xl font-bold text-purple-900">
              {statistics.totalChecks}
            </p>
          </div>
          <div className="p-4 bg-amber-50 rounded-lg">
            <p className="text-xs text-amber-600 font-medium mb-1">Current Streak</p>
            <p className="text-2xl font-bold text-amber-900">
              {statistics.currentStreak}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('version')}
                >
                  <div className="flex items-center">
                    Version
                    {sortField === 'version' && (
                      <svg
                        className={`w-4 h-4 ml-1 transform ${
                          sortDirection === 'desc' ? 'rotate-180' : ''
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center">
                    Date
                    {sortField === 'createdAt' && (
                      <svg
                        className={`w-4 h-4 ml-1 transform ${
                          sortDirection === 'desc' ? 'rotate-180' : ''
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('overallScore')}
                >
                  <div className="flex items-center">
                    Score
                    {sortField === 'overallScore' && (
                      <svg
                        className={`w-4 h-4 ml-1 transform ${
                          sortDirection === 'desc' ? 'rotate-180' : ''
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dimensions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trigger
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedHistory.map((entry) => (
                <>
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      v{entry.version}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(entry.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {entry.overallScore.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="px-3 py-1 text-xs font-bold rounded"
                        style={{
                          backgroundColor: GRADE_COLORS[entry.grade as keyof typeof GRADE_COLORS]?.bg || '#gray',
                          color: '#fff',
                        }}
                      >
                        {entry.grade}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex space-x-2">
                        <span title="Content">{entry.contentScore.toFixed(0)}</span>
                        <span title="Visual">{entry.visualScore.toFixed(0)}</span>
                        <span title="AI">{entry.aiScore.toFixed(0)}</span>
                        <span title="Export">{entry.exportScore.toFixed(0)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          entry.validationPassed
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {entry.validationPassed ? 'Pass' : 'Fail'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded capitalize">
                        {entry.trigger}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() =>
                          setExpandedRow(expandedRow === entry.id ? null : entry.id)
                        }
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {expandedRow === entry.id ? 'Collapse' : 'Details'}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Row */}
                  {expandedRow === entry.id && (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 bg-gray-50">
                        <div className="space-y-4">
                          {/* Dimension Details */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">
                              Dimension Scores
                            </h4>
                            <div className="grid grid-cols-4 gap-4">
                              {[
                                { label: 'Content', value: entry.contentScore, color: '#10b981' },
                                { label: 'Visual', value: entry.visualScore, color: '#8b5cf6' },
                                { label: 'AI', value: entry.aiScore, color: '#f59e0b' },
                                { label: 'Export', value: entry.exportScore, color: '#3b82f6' },
                              ].map((dim) => (
                                <div key={dim.label} className="bg-white p-3 rounded">
                                  <p className="text-xs text-gray-600 mb-1">{dim.label}</p>
                                  <p className="text-lg font-semibold" style={{ color: dim.color }}>
                                    {dim.value.toFixed(1)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Validation Issues */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">
                              Validation Issues
                            </h4>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="bg-white p-3 rounded">
                                <p className="text-xs text-red-600 mb-1">Errors</p>
                                <p className="text-lg font-semibold text-red-900">
                                  {entry.errorCount}
                                </p>
                              </div>
                              <div className="bg-white p-3 rounded">
                                <p className="text-xs text-amber-600 mb-1">Warnings</p>
                                <p className="text-lg font-semibold text-amber-900">
                                  {entry.warningCount}
                                </p>
                              </div>
                              <div className="bg-white p-3 rounded">
                                <p className="text-xs text-blue-600 mb-1">Info</p>
                                <p className="text-lg font-semibold text-blue-900">
                                  {entry.infoCount}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
