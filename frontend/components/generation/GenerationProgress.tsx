'use client';

import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import { useProgressTracking, ProgressUpdate } from '@/hooks/useProgressTracking';

interface GenerationProgressProps {
  jobId: string;
  onComplete?: (jobId: string) => void;
  onError?: (error: string) => void;
}

interface Stage {
  id: ProgressUpdate['stage'];
  label: string;
  icon: any;
}

const STAGES: Stage[] = [
  { id: 'outline', label: 'Creating Outline', icon: Circle },
  { id: 'slides', label: 'Generating Slides', icon: Circle },
  { id: 'design', label: 'Applying Design', icon: Circle },
  { id: 'quality', label: 'Quality Check', icon: Circle },
  { id: 'complete', label: 'Complete', icon: CheckCircle2 },
];

export default function GenerationProgress({ jobId, onComplete, onError }: GenerationProgressProps) {
  const { progress, connected, error } = useProgressTracking(jobId);
  const [completedStages, setCompletedStages] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (progress?.stage) {
      // Mark current and previous stages as completed
      const stageIndex = STAGES.findIndex(s => s.id === progress.stage);
      if (stageIndex >= 0) {
        const completed = new Set<string>();
        for (let i = 0; i <= stageIndex; i++) {
          completed.add(STAGES[i].id);
        }
        setCompletedStages(completed);
      }

      // Handle completion
      if (progress.stage === 'complete' && onComplete) {
        setTimeout(() => onComplete(jobId), 500);
      }

      // Handle error
      if (progress.stage === 'error' && onError) {
        onError(progress.message);
      }
    }
  }, [progress, jobId, onComplete, onError]);

  if (!jobId) {
    return null;
  }

  return (
    <Card className="p-6 space-y-6">
      {/* Connection Status */}
      {!connected && !error && (
        <div className="flex items-center gap-2 text-sm text-[#9A9A9A]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Connecting to server...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-[#9a3737]">
          <XCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">
            {progress?.message || 'Preparing generation...'}
          </span>
          <span className="text-[#9A9A9A]">
            {progress?.progress || 0}%
          </span>
        </div>
        <Progress value={progress?.progress || 0} className="h-2" />
      </div>

      {/* Stage Indicators */}
      <div className="space-y-3">
        {STAGES.filter(s => s.id !== 'error').map((stage, index) => {
          const isCompleted = completedStages.has(stage.id);
          const isCurrent = progress?.stage === stage.id;
          const isError = progress?.stage === 'error';
          
          const StageIcon = isError ? XCircle : isCompleted ? CheckCircle2 : isCurrent ? Loader2 : Circle;

          return (
            <div
              key={stage.id}
              className={`flex items-center gap-3 transition-all ${
                isCurrent ? 'scale-105' : ''
              }`}
            >
              <StageIcon
                className={`w-5 h-5 flex-shrink-0 ${
                  isError
                    ? 'text-[#D96A6A]'
                    : isCompleted
                    ? 'text-green-500'
                    : isCurrent
                    ? 'text-[#4F7563] animate-spin'
                    : 'text-gray-300'
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  isError
                    ? 'text-[#9a3737]'
                    : isCompleted
                    ? 'text-[#4F7563]'
                    : isCurrent
                    ? 'text-[#4F7563]'
                    : 'text-[#C9C6BD]'
                }`}
              >
                {stage.label}
              </span>
              
              {isCurrent && progress?.details && (
                <span className="text-xs text-[#9A9A9A] ml-auto">
                  {progress.details.totalSlides && `${progress.details.totalSlides} slides`}
                  {progress.details.currentSlide && ` · Slide ${progress.details.currentSlide}`}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Error Message */}
      {progress?.stage === 'error' && (
        <div className="p-4 bg-[#FCF1F1] border border-[#F7E3E3] rounded-lg">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-[#D96A6A] flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#7a2929]">
                Generation Failed
              </p>
              <p className="text-sm text-[#9a3737]">
                {progress.message}
              </p>
              {progress.details?.error && (
                <p className="text-xs text-[#D96A6A] font-mono mt-2">
                  {progress.details.error}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {progress?.stage === 'complete' && (
        <div className="p-4 bg-[#EEF5F1] border border-[#DDE8E1] rounded-lg">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-green-800">
                {progress.message}
              </p>
              {progress.details?.totalSlides && (
                <p className="text-sm text-[#4F7563]">
                  Generated {progress.details.totalSlides} slides successfully
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Job ID (for debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-[#C9C6BD] font-mono">
          Job ID: {jobId}
        </div>
      )}
    </Card>
  );
}
