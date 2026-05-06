'use client';

import React from 'react';
import { AlertCircle, AlertTriangle, Info, ChevronRight, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SEVERITY_COLORS, type ValidationIssue, type ValidationSeverity } from '@/types/quality';

interface ValidationIssueCardProps {
  issue: ValidationIssue;
  onSlideClick?: (slideIndex: number) => void;
  onDismiss?: (issue: ValidationIssue) => void;
}

const SEVERITY_ICONS: Record<ValidationSeverity, React.ReactNode> = {
  ERROR: <AlertCircle className="w-4 h-4" />,
  WARNING: <AlertTriangle className="w-4 h-4" />,
  INFO: <Info className="w-4 h-4" />,
};

export function ValidationIssueCard({ issue, onSlideClick, onDismiss }: ValidationIssueCardProps) {
  const colors = SEVERITY_COLORS[issue.severity];

  return (
    <Card className={`${colors.bg} border-l-4 ${colors.icon.replace('text-', 'border-')}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Severity Icon */}
          <div className={`${colors.icon} mt-0.5`}>
            {SEVERITY_ICONS[issue.severity]}
          </div>

          {/* Issue Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant={issue.severity === 'ERROR' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {issue.severity}
                </Badge>
                <span className={`text-xs ${colors.text} font-medium`}>
                  {issue.rule}
                </span>
              </div>
              {issue.slideIndex !== undefined && (
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  Slide {issue.slideIndex + 1}
                </Badge>
              )}
            </div>

            {/* Message */}
            <p className={`${colors.text} text-sm font-medium mb-2`}>
              {issue.message}
            </p>

            {/* Suggestion */}
            {issue.suggestion && (
              <div className="bg-white/50 rounded-md p-2 mb-3">
                <p className="text-xs text-gray-700">
                  <span className="font-semibold">Suggestion:</span> {issue.suggestion}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              {issue.slideIndex !== undefined && onSlideClick && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSlideClick(issue.slideIndex!)}
                  className="text-xs h-7"
                >
                  Go to Slide
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => window.open(`/docs/validation/${issue.rule}`, '_blank')}
              >
                Learn More
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>

              {issue.severity === 'INFO' && onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDismiss(issue)}
                  className="text-xs h-7 ml-auto"
                >
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
