'use client';

import { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';

export interface Suggestion {
  value: string;
  label: string;
  confidence: number;
  source: 'template' | 'industry' | 'ai' | 'pattern';
  category?: string;
}

export interface SuggestionContext {
  industry?: string;
  documentType?: string;
  fieldName: string;
  currentValue?: string;
  relatedFields?: Record<string, string>;
}

export function useSuggestions(context: SuggestionContext) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = async (ctx: SuggestionContext) => {
    if (!ctx.fieldName) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(ctx),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data = await response.json();
      setSuggestions(data);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setError('Failed to load suggestions');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced fetch to avoid too many API calls
  const debouncedFetch = useCallback(
    debounce((ctx: SuggestionContext) => {
      fetchSuggestions(ctx);
    }, 500),
    []
  );

  useEffect(() => {
    // Only fetch if we have minimum required context
    if (context.fieldName && (context.industry || context.documentType)) {
      debouncedFetch(context);
    } else {
      setSuggestions([]);
    }

    return () => {
      debouncedFetch.cancel();
    };
  }, [
    context.fieldName,
    context.industry,
    context.documentType,
    context.currentValue,
    JSON.stringify(context.relatedFields),
  ]);

  const clearSuggestions = () => {
    setSuggestions([]);
  };

  return {
    suggestions,
    loading,
    error,
    clearSuggestions,
    refetch: () => fetchSuggestions(context),
  };
}
