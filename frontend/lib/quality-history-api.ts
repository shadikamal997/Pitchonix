/**
 * Quality History API Client
 * Phase 10: Quality Trends Tracking
 */

import api from './api';
import {
  QualityHistoryEntry,
  QualityStatistics,
  TrendData,
  DimensionTrends,
  QualityComparison,
} from '@/types/export';

/**
 * Get quality history for a deck
 */
export async function getQualityHistory(
  deckId: string
): Promise<{ history: QualityHistoryEntry[]; statistics: QualityStatistics }> {
  const response = await api.get(`/generate/history/${deckId}`);
  return response.data;
}

/**
 * Get quality trends over time
 */
export async function getQualityTrends(
  deckId: string
): Promise<{ overall: TrendData[]; dimensions: DimensionTrends }> {
  const response = await api.get(`/generate/trends/${deckId}`);
  return response.data;
}

/**
 * Compare quality between versions
 */
export async function compareQualityVersions(
  deckId: string
): Promise<QualityComparison | { message: string; availableVersions: number }> {
  const response = await api.get(`/generate/compare/${deckId}`);
  return response.data;
}

/**
 * Run manual quality check and record in history
 */
export async function runQualityCheck(deckId: string): Promise<{
  qualityScore: any;
  validation: any;
}> {
  const response = await api.post(`/generate/quality-check/${deckId}`);
  return response.data;
}
