/**
 * Quality Comparison Component
 * Phase 10: Version Comparison
 */

'use client';

import { useState, useEffect } from 'react';
import { QualityComparison as QualityComparisonType } from '@/types/export';
import { compareQualityVersions } from '@/lib/quality-history-api';
import { GRADE_COLORS } from '@/types/quality';

interface QualityComparisonProps {
  deckId: string;
}

export function QualityComparison({ deckId }: QualityComparisonProps) {
  const [comparison, setComparison] = useState<QualityComparisonType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noData, setNoData] = useState(false);

  useEffect(() => {
    loadComparison();
  }, [deckId]);

  const loadComparison = async () => {
    try {
      setLoading(true);
      setError(null);
      setNoData(false);
      
      const result = await compareQualityVersions(deckId);
      
      if ('message' in result) {
        setNoData(true);
      } else {
        setComparison(result);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load comparison');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4F7563]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-[#FCF1F1] border border-[#F7E3E3] rounded-lg">
        <p className="text-sm text-[#9a3737]">{error}</p>
      </div>
    );
  }

  if (noData) {
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
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="text-sm font-medium text-[#111111] mb-1">Not Enough History</h3>
        <p className="text-sm text-[#6B6B6B]">
          At least 2 quality checks are needed to show comparisons.
        </p>
      </div>
    );
  }

  if (!comparison) return null;

  const scoreDelta = comparison.scoreDelta;
  const isDeltaPositive = scoreDelta >= 0;

  return (
    <div className="space-y-6">
      {/* Score Comparison */}
      <div className="bg-white p-6 border border-[#E3E1DA] rounded-lg">
        <h3 className="text-sm font-medium text-[#111111] mb-4">Overall Score Change</h3>
        
        <div className="flex items-center justify-between mb-6">
          {/* Previous */}
          <div className="text-center">
            <p className="text-xs text-[#6B6B6B] mb-2">Version {comparison.previous.version}</p>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-[#111111]">
                {comparison.previous.overallScore.toFixed(1)}
              </span>
              <span
                className={`mt-1 px-3 py-1 text-sm font-bold rounded`}
                style={{
                  backgroundColor: GRADE_COLORS[comparison.previous.grade as keyof typeof GRADE_COLORS]?.bg || '#gray',
                  color: '#fff',
                }}
              >
                {comparison.previous.grade}
              </span>
            </div>
            <p className="text-xs text-[#6B6B6B] mt-2">
              {new Date(comparison.previous.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* Arrow */}
          <div className="flex flex-col items-center mx-8">
            <svg
              className={`w-8 h-8 ${isDeltaPositive ? 'text-[#4F7563]' : 'text-[#9a3737]'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={isDeltaPositive ? 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' : 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6'}
              />
            </svg>
            <span
              className={`mt-2 text-lg font-bold ${
                isDeltaPositive ? 'text-[#4F7563]' : 'text-[#9a3737]'
              }`}
            >
              {isDeltaPositive ? '+' : ''}{scoreDelta.toFixed(1)}
            </span>
          </div>

          {/* Current */}
          <div className="text-center">
            <p className="text-xs text-[#6B6B6B] mb-2">Version {comparison.current.version}</p>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-[#111111]">
                {comparison.current.overallScore.toFixed(1)}
              </span>
              <span
                className={`mt-1 px-3 py-1 text-sm font-bold rounded`}
                style={{
                  backgroundColor: GRADE_COLORS[comparison.current.grade as keyof typeof GRADE_COLORS]?.bg || '#gray',
                  color: '#fff',
                }}
              >
                {comparison.current.grade}
              </span>
            </div>
            <p className="text-xs text-[#6B6B6B] mt-2">
              {new Date(comparison.current.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Grade Change */}
        <div className="pt-4 border-t border-[#E3E1DA]">
          <p className="text-sm text-[#6B6B6B]">
            Grade: <span className="font-medium">{comparison.gradeDelta}</span>
          </p>
        </div>
      </div>

      {/* Dimension Changes */}
      <div className="bg-white p-6 border border-[#E3E1DA] rounded-lg">
        <h3 className="text-sm font-medium text-[#111111] mb-4">Dimension Scores</h3>
        
        <div className="space-y-4">
          {[
            { key: 'contentScore', label: 'Content', color: '#10b981' },
            { key: 'visualScore', label: 'Visual', color: '#8b5cf6' },
            { key: 'aiScore', label: 'AI Enhancement', color: '#f59e0b' },
            { key: 'exportScore', label: 'Export Readiness', color: '#3b82f6' },
          ].map((dimension) => {
            const prevScore = comparison.previous[dimension.key as keyof typeof comparison.previous] as number;
            const currScore = comparison.current[dimension.key as keyof typeof comparison.current] as number;
            const delta = currScore - prevScore;
            const isPositive = delta >= 0;

            return (
              <div key={dimension.key}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#111111]">{dimension.label}</span>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-[#6B6B6B]">
                      {prevScore.toFixed(1)} → {currScore.toFixed(1)}
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        isPositive ? 'text-[#4F7563]' : 'text-[#9a3737]'
                      }`}
                    >
                      {isPositive ? '+' : ''}{delta.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-[#E3E1DA] rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${currScore}%`,
                      backgroundColor: dimension.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Improvements */}
      {comparison.improvements.length > 0 && (
        <div className="bg-[#EEF5F1] border border-[#DDE8E1] rounded-lg p-6">
          <h3 className="text-sm font-medium text-green-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Improvements
          </h3>
          <ul className="space-y-2">
            {comparison.improvements.map((improvement, index) => (
              <li key={index} className="text-sm text-green-800 flex items-start">
                <span className="mr-2">•</span>
                <span>{improvement}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Regressions */}
      {comparison.regressions.length > 0 && (
        <div className="bg-[#FAEEDB] border border-[#F2DCAE] rounded-lg p-6">
          <h3 className="text-sm font-medium text-amber-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Areas to Improve
          </h3>
          <ul className="space-y-2">
            {comparison.regressions.map((regression, index) => (
              <li key={index} className="text-sm text-[#735008] flex items-start">
                <span className="mr-2">•</span>
                <span>{regression}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
