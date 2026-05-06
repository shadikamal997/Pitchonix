'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  Palette,
  Shield,
  Package,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { STAGE_NAMES, type GenerationStage } from '@/types/quality';

interface StageIndicatorProps {
  currentStage: GenerationStage;
  completedStages: GenerationStage[];
  failedStages?: GenerationStage[];
  stageTimes?: Record<string, number>;
}

const STAGE_ORDER: GenerationStage[] = [
  'PENDING',
  'BASE_GENERATION',
  'AI_ENHANCEMENT',
  'VISUAL_GENERATION',
  'QUALITY_CHECK',
  'EXPORT',
  'COMPLETE',
];

const STAGE_ICONS: Record<GenerationStage, React.ReactNode> = {
  PENDING: <Clock className="w-4 h-4" />,
  BASE_GENERATION: <Circle className="w-4 h-4" />,
  AI_ENHANCEMENT: <Sparkles className="w-4 h-4" />,
  VISUAL_GENERATION: <Palette className="w-4 h-4" />,
  QUALITY_CHECK: <Shield className="w-4 h-4" />,
  EXPORT: <Package className="w-4 h-4" />,
  COMPLETE: <CheckCircle2 className="w-4 h-4" />,
  FAILED: <XCircle className="w-4 h-4" />,
};

export function StageIndicator({
  currentStage,
  completedStages,
  failedStages = [],
  stageTimes,
}: StageIndicatorProps) {
  // Determine stage status
  const getStageStatus = (stage: GenerationStage) => {
    if (failedStages.includes(stage)) return 'failed';
    if (completedStages.includes(stage)) return 'completed';
    if (stage === currentStage) return 'current';
    return 'pending';
  };

  // Format stage time
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Get stage color classes
  const getStageColor = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          bg: 'bg-green-100',
          border: 'border-green-500',
          text: 'text-green-700',
          icon: 'text-green-500',
        };
      case 'current':
        return {
          bg: 'bg-blue-100',
          border: 'border-blue-500',
          text: 'text-blue-700',
          icon: 'text-blue-500',
        };
      case 'failed':
        return {
          bg: 'bg-red-100',
          border: 'border-red-500',
          text: 'text-red-700',
          icon: 'text-red-500',
        };
      default:
        return {
          bg: 'bg-gray-100',
          border: 'border-gray-300',
          text: 'text-gray-600',
          icon: 'text-gray-400',
        };
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generation Stages</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Vertical Timeline Line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

          {/* Stages */}
          <div className="space-y-4">
            {STAGE_ORDER.map((stage, index) => {
              const status = getStageStatus(stage);
              const colors = getStageColor(status);
              const stageTime = stageTimes?.[stage];

              return (
                <motion.div
                  key={stage}
                  className="relative flex items-start gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {/* Stage Icon */}
                  <div
                    className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${colors.bg} ${colors.border} border-2 ${colors.icon}`}
                  >
                    {status === 'current' ? (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        {STAGE_ICONS[stage]}
                      </motion.div>
                    ) : (
                      STAGE_ICONS[stage]
                    )}
                  </div>

                  {/* Stage Content */}
                  <div className="flex-1 min-w-0 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-medium ${colors.text}`}>
                          {STAGE_NAMES[stage]}
                        </p>
                        {status === 'current' && (
                          <p className="text-xs text-gray-500 mt-0.5">In progress...</p>
                        )}
                        {status === 'completed' && stageTime && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            Completed in {formatTime(stageTime)}
                          </p>
                        )}
                        {status === 'failed' && (
                          <p className="text-xs text-red-600 mt-0.5">Failed</p>
                        )}
                      </div>

                      {/* Status Indicator */}
                      {status === 'completed' && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </motion.div>
                      )}
                      {status === 'current' && (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        >
                          <Clock className="w-5 h-5 text-blue-500" />
                        </motion.div>
                      )}
                      {status === 'failed' && (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
