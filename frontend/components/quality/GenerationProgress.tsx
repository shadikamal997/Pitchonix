'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getGenerationStatus } from '@/lib/quality-api';
import { STAGE_NAMES, formatDuration, type GenerationStatus as GenerationStatusType } from '@/types/quality';

interface GenerationProgressProps {
  deckId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onComplete?: (status: GenerationStatusType) => void;
  onError?: (error: Error) => void;
}

export function GenerationProgress({
  deckId,
  autoRefresh = true,
  refreshInterval = 2000,
  onComplete,
  onError,
}: GenerationProgressProps) {
  const [status, setStatus] = useState<GenerationStatusType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch generation status
  const fetchStatus = async () => {
    try {
      const data = await getGenerationStatus(deckId);
      setStatus(data);
      setError(null);

      // Call onComplete callback if generation is complete
      if (data.completed && onComplete) {
        onComplete(data);
      }

      // Stop auto-refresh if completed or failed
      if (data.completed || data.status === 'FAILED') {
        return false; // Stop polling
      }

      return true; // Continue polling
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch status';
      setError(errorMessage);
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
      return false; // Stop polling on error
    } finally {
      setLoading(false);
    }
  };

  // Set up auto-refresh
  useEffect(() => {
    if (!autoRefresh) {
      fetchStatus();
      return;
    }

    let intervalId: NodeJS.Timeout | null = null;
    let shouldContinue = true;

    const startPolling = async () => {
      // Initial fetch
      shouldContinue = await fetchStatus();

      // Set up interval if should continue
      if (shouldContinue) {
        intervalId = setInterval(async () => {
          shouldContinue = await fetchStatus();
          if (!shouldContinue && intervalId) {
            clearInterval(intervalId);
          }
        }, refreshInterval);
      }
    };

    startPolling();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [deckId, autoRefresh, refreshInterval]);

  // Calculate elapsed time
  const getElapsedTime = () => {
    if (!status) return '0s';
    const start = new Date(status.startTime).getTime();
    const end = status.endTime ? new Date(status.endTime).getTime() : Date.now();
    return formatDuration(end - start);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#C9C6BD]" />
            <span className="ml-2 text-[#6B6B6B]">Loading status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!status) {
    return null;
  }

  // Determine status color and icon
  const getStatusDisplay = () => {
    if (status.status === 'FAILED') {
      return {
        icon: <XCircle className="w-5 h-5 text-[#D96A6A]" />,
        color: 'text-[#7a2929]',
        bgColor: 'bg-[#FCF1F1]',
        borderColor: 'border-[#F7E3E3]',
      };
    }
    if (status.completed) {
      return {
        icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
        color: 'text-[#355846]',
        bgColor: 'bg-[#EEF5F1]',
        borderColor: 'border-[#DDE8E1]',
      };
    }
    return {
      icon: <Loader2 className="w-5 h-5 animate-spin text-[#4F7563]" />,
      color: 'text-[#355846]',
      bgColor: 'bg-[#EEF5F1]',
      borderColor: 'border-[#DDE8E1]',
    };
  };

  const statusDisplay = getStatusDisplay();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {statusDisplay.icon}
            <span>Generation Progress</span>
          </div>
          <Badge variant={status.completed ? 'default' : 'secondary'}>
            {STAGE_NAMES[status.progress.stage as keyof typeof STAGE_NAMES] || status.progress.stage}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-[#111111]">
              {status.progress.message || 'Processing...'}
            </span>
            <span className="text-sm font-semibold text-[#111111]">
              {status.progress.percentage}%
            </span>
          </div>
          <Progress value={status.progress.percentage} className="h-2" />
        </div>

        {/* Slide Progress */}
        {status.progress.currentSlide > 0 && status.progress.totalSlides > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#6B6B6B]">Slides</span>
            <span className="font-medium text-[#111111]">
              {status.progress.currentSlide} / {status.progress.totalSlides}
            </span>
          </div>
        )}

        {/* Time Information */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#C9C6BD]" />
            <div>
              <p className="text-xs text-[#6B6B6B]">Elapsed</p>
              <p className="text-sm font-semibold text-[#111111]">{getElapsedTime()}</p>
            </div>
          </div>
          {status.progress.estimatedTimeRemaining && !status.completed && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#C9C6BD]" />
              <div>
                <p className="text-xs text-[#6B6B6B]">Remaining</p>
                <p className="text-sm font-semibold text-[#111111]">
                  {formatDuration(status.progress.estimatedTimeRemaining)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Status Message */}
        <div className={`${statusDisplay.bgColor} ${statusDisplay.borderColor} border rounded-lg p-3`}>
          <p className={`text-sm ${statusDisplay.color} font-medium`}>
            {status.completed
              ? '✓ Generation completed successfully'
              : status.status === 'FAILED'
              ? '✗ Generation failed'
              : '⏳ Generation in progress...'}
          </p>
        </div>

        {/* Errors */}
        {status.errors && status.errors.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#7a2929]">Errors:</p>
            {status.errors.map((err, idx) => (
              <Alert key={idx} variant="destructive" className="py-2">
                <AlertDescription className="text-sm">
                  <strong>{err.stage}:</strong> {err.error}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
