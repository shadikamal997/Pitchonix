'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/lib/api';
import { parseApiError } from '@/lib/errors';
import { ContentAnalysis, QuickCheck, AnalysisType } from '@/types/intelligence';

interface UseContentIntelligenceOptions {
  content: string;
  type: AnalysisType;
  context?: any;
  debounceMs?: number;
  enableQuickCheck?: boolean;
  enableFullAnalysis?: boolean;
}

export function useContentIntelligence({
  content,
  type,
  context,
  debounceMs = 1000,
  enableQuickCheck = true,
  enableFullAnalysis = false,
}: UseContentIntelligenceOptions) {
  const [quickCheck, setQuickCheck] = useState<QuickCheck | null>(null);
  const [analysis, setAnalysis] = useState<ContentAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick check (fast, no AI)
  const performQuickCheck = useCallback(async (text: string) => {
    if (!text || text.length < 10) {
      setQuickCheck(null);
      return;
    }

    try {
      const result = await apiService.quickCheck(text);
      setQuickCheck(result);
    } catch (err) {
      const appError = parseApiError(err);
      console.error('Quick check failed:', appError.userMessage);
    }
  }, []);

  // Full AI analysis
  const performFullAnalysis = useCallback(async (text: string) => {
    if (!text || text.length < 20) {
      setAnalysis(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiService.analyzeContent<ContentAnalysis>(text, type, context);
      setAnalysis(result);
    } catch (err) {
      const appError = parseApiError(err);
      setError(appError.userMessage);
      console.error('Analysis failed:', appError);
    } finally {
      setLoading(false);
    }
  }, [type, context]);

  // Debounced analysis
  useEffect(() => {
    if (!content) {
      setQuickCheck(null);
      setAnalysis(null);
      return;
    }

    const timer = setTimeout(() => {
      if (enableQuickCheck) {
        performQuickCheck(content);
      }
      
      if (enableFullAnalysis) {
        performFullAnalysis(content);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [content, debounceMs, enableQuickCheck, enableFullAnalysis, performQuickCheck, performFullAnalysis]);

  // Manual analysis trigger
  const triggerAnalysis = useCallback(() => {
    if (content && content.length >= 20) {
      performFullAnalysis(content);
    }
  }, [content, performFullAnalysis]);

  // Enhance content
  const enhance = useCallback(async (): Promise<string | null> => {
    if (!content || content.length < 20) return null;

    try {
      const result = await apiService.enhanceContent(content, type);
      return result.enhanced;
    } catch (err) {
      const appError = parseApiError(err);
      console.error('Enhancement failed:', appError.userMessage);
      return null;
    }
  }, [content, type]);

  return {
    quickCheck,
    analysis,
    loading,
    error,
    triggerAnalysis,
    enhance,
  };
}
