'use client';

import { useState } from 'react';
import { Sparkles, Lightbulb, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useContentIntelligence } from '@/hooks/useContentIntelligence';
import { ContentScoreDisplay, SuggestionList } from './ContentScoreDisplay';
import { AnalysisType } from '@/types/intelligence';
import { toastSuccess } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface SmartTextareaProps {
  value: string;
  onChange: (value: string) => void;
  analysisType: AnalysisType;
  placeholder?: string;
  context?: any;
  rows?: number;
  maxLength?: number;
  label?: string;
  description?: string;
  disabled?: boolean;
  showQuickCheck?: boolean;
  showFullAnalysis?: boolean;
}

export function SmartTextarea({
  value,
  onChange,
  analysisType,
  placeholder,
  context,
  rows = 6,
  maxLength = 1000,
  label,
  description,
  disabled = false,
  showQuickCheck = true,
  showFullAnalysis = false,
}: SmartTextareaProps) {
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

  const { quickCheck, analysis, loading, triggerAnalysis, enhance } = useContentIntelligence({
    content: value,
    type: analysisType,
    context,
    enableQuickCheck: showQuickCheck,
    enableFullAnalysis: showFullAnalysis,
  });

  const handleEnhance = async () => {
    const enhanced = await enhance();
    if (enhanced) {
      onChange(enhanced);
      toastSuccess('Content enhanced!', 'Your text has been improved by AI');
    }
  };

  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
  const charCount = value.length;

  const getQuickCheckColor = () => {
    if (!quickCheck) return 'text-muted-foreground';
    if (quickCheck.score >= 80) return 'text-[#4F7563]';
    if (quickCheck.score >= 60) return 'text-[#8c6210]';
    return 'text-[#9a3737]';
  };

  return (
    <div className="space-y-2">
      {/* Label and Description */}
      {(label || description) && (
        <div>
          {label && (
            <label className="text-sm font-medium flex items-center justify-between">
              <span>{label}</span>
              {quickCheck && showQuickCheck && (
                <Badge variant="outline" className={cn('ml-2', getQuickCheckColor())}>
                  Score: {quickCheck.score}
                </Badge>
              )}
            </label>
          )}
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      )}

      {/* Textarea with Actions */}
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          disabled={disabled}
          className="pr-32"
        />

        {/* Action Buttons */}
        <div className="absolute bottom-2 right-2 flex items-center space-x-2">
          {value.length >= 20 && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleEnhance}
                disabled={disabled}
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Enhance
              </Button>

              <Popover open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!analysis) triggerAnalysis();
                      setIsAnalysisOpen(true);
                    }}
                    disabled={disabled}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Lightbulb className="w-4 h-4 mr-1" />
                    )}
                    Analyze
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 max-h-[600px] overflow-y-auto" align="end">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Content Analysis</h3>
                    
                    {loading && (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    )}

                    {analysis && !loading && (
                      <>
                        {/* Scores */}
                        <ContentScoreDisplay scores={analysis.scores} compact />

                        {/* Insights */}
                        {analysis.insights.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Key Insights</h4>
                            <ul className="space-y-1">
                              {analysis.insights.map((insight, i) => (
                                <li key={i} className="text-sm text-muted-foreground">
                                  • {insight}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Suggestions */}
                        {analysis.suggestions.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Suggestions</h4>
                            <SuggestionList suggestions={analysis.suggestions.slice(0, 3)} />
                          </div>
                        )}

                        {/* Enhanced Content Preview */}
                        {analysis.enhancedContent && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Enhanced Version</h4>
                            <div className="p-3 bg-muted rounded-md text-sm">
                              {analysis.enhancedContent}
                            </div>
                            <Button
                              size="sm"
                              className="mt-2 w-full"
                              onClick={() => {
                                onChange(analysis.enhancedContent!);
                                setIsAnalysisOpen(false);
                                toastSuccess('Applied!', 'Enhanced content applied');
                              }}
                            >
                              Use Enhanced Version
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          <span>{wordCount} words</span>
          <span>
            {charCount}/{maxLength} characters
          </span>
        </div>

        {/* Quick Check Issues */}
        {quickCheck && quickCheck.issues.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                {quickCheck.issues.length} issue{quickCheck.issues.length > 1 ? 's' : ''} found
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Quick Check Issues</h4>
                <ul className="space-y-1">
                  {quickCheck.issues.map((issue, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start">
                      <span className="mr-2">•</span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
