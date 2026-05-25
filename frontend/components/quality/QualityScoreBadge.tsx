'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GRADE_COLORS, type QualityDimensions } from '@/types/quality';

interface QualityScoreBadgeProps {
  score: number;
  grade: string;
  dimensions?: QualityDimensions;
  size?: 'sm' | 'md' | 'lg';
  showTrend?: boolean;
  previousScore?: number;
}

export function QualityScoreBadge({
  score,
  grade,
  dimensions,
  size = 'md',
  showTrend = false,
  previousScore,
}: QualityScoreBadgeProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const colors = GRADE_COLORS[grade] || GRADE_COLORS['F'];

  // Animate score count-up
  useEffect(() => {
    const duration = 500;
    const steps = 30;
    const increment = score / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score]);

  // Calculate trend
  const trend = previousScore ? score - previousScore : 0;
  const trendPercent = previousScore ? ((trend / previousScore) * 100).toFixed(1) : '0';

  // Size-based styling
  const sizeClasses = {
    sm: {
      card: 'p-3',
      scoreText: 'text-2xl',
      gradeText: 'text-base',
      labelText: 'text-xs',
    },
    md: {
      card: 'p-4',
      scoreText: 'text-4xl',
      gradeText: 'text-lg',
      labelText: 'text-sm',
    },
    lg: {
      card: 'p-6',
      scoreText: 'text-6xl',
      gradeText: 'text-2xl',
      labelText: 'text-base',
    },
  };

  const styles = sizeClasses[size];

  return (
    <Card className={`${styles.card} transition-all duration-300 hover:shadow-lg`}>
      <CardContent className="p-0">
        <div className="flex items-center justify-between">
          {/* Score Display */}
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <motion.span
                className={`${styles.scoreText} font-bold text-[#111111]`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {displayScore}
              </motion.span>
              <span className={`${styles.labelText} text-[#9A9A9A]`}>/100</span>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <p className={`${styles.labelText} text-[#6B6B6B] font-medium`}>
                Quality Score
              </p>
              {showTrend && previousScore && trend !== 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge
                        variant={trend > 0 ? 'default' : 'destructive'}
                        className="flex items-center gap-1"
                      >
                        {trend > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {trend > 0 ? '+' : ''}
                        {trendPercent}%
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {trend > 0 ? 'Improved' : 'Decreased'} by {Math.abs(trend)} points from
                        previous score ({previousScore})
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>

          {/* Grade Badge */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div
              className={`${colors.bg} ${colors.text} ${colors.border} border-2 rounded-full w-16 h-16 flex flex-col items-center justify-center shadow-md`}
            >
              <Award className="w-5 h-5 mb-1" />
              <span className={`${styles.gradeText} font-bold`}>{grade}</span>
            </div>
          </motion.div>
        </div>

        {/* Dimension Breakdown (if provided) */}
        {dimensions && size !== 'sm' && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mt-4 pt-4 border-t border-[#E3E1DA]">
                  <div className="grid grid-cols-2 gap-3">
                    <DimensionBar
                      label="Content"
                      value={dimensions.content}
                      color="bg-[#4F7563]"
                    />
                    <DimensionBar
                      label="Visual"
                      value={dimensions.visual}
                      color="bg-[#4F7563]"
                    />
                    <DimensionBar
                      label="AI"
                      value={dimensions.aiEnhancement}
                      color="bg-[#4F7563]"
                    />
                    <DimensionBar
                      label="Export"
                      value={dimensions.exportReadiness}
                      color="bg-[#4F7563]"
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-2">
                  <p className="font-semibold">Quality Dimensions</p>
                  <div className="text-sm space-y-1">
                    <p><strong>Content:</strong> {dimensions.content}/100 - Completeness and relevance</p>
                    <p><strong>Visual:</strong> {dimensions.visual}/100 - Design and aesthetics</p>
                    <p><strong>AI Enhancement:</strong> {dimensions.aiEnhancement}/100 - AI-generated quality</p>
                    <p><strong>Export Readiness:</strong> {dimensions.exportReadiness}/100 - Export compatibility</p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}

// Mini dimension progress bar
interface DimensionBarProps {
  label: string;
  value: number;
  color: string;
}

function DimensionBar({ label, value, color }: DimensionBarProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-[#6B6B6B]">{label}</span>
        <span className="text-xs font-semibold text-[#111111]">{value}</span>
      </div>
      <div className="h-1.5 bg-[#E3E1DA] rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5, delay: 0.3 }}
        />
      </div>
    </div>
  );
}
