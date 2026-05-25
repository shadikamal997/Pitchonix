'use client';

import { Lightbulb, AlertTriangle, TrendingUp, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ContentScore, Suggestion } from '@/types/intelligence';
import { cn } from '@/lib/utils';

interface ContentScoreDisplayProps {
  scores: ContentScore;
  compact?: boolean;
}

export function ContentScoreDisplay({ scores, compact = false }: ContentScoreDisplayProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#4F7563]';
    if (score >= 60) return 'text-[#8c6210]';
    return 'text-[#9a3737]';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Work';
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground">Score:</span>
        <span className={cn('text-lg font-semibold', getScoreColor(scores.overall))}>
          {scores.overall}
        </span>
        <Badge variant={scores.overall >= 80 ? 'default' : 'secondary'}>
          {getScoreLabel(scores.overall)}
        </Badge>
      </div>
    );
  }

  const scoreItems = [
    { label: 'Overall', value: scores.overall },
    { label: 'Clarity', value: scores.clarity },
    { label: 'Impact', value: scores.impact },
    { label: 'Specificity', value: scores.specificity },
    { label: 'Professionalism', value: scores.professionalism },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Content Quality</span>
          <Badge variant={scores.overall >= 80 ? 'default' : 'secondary'} className="text-lg px-3 py-1">
            {scores.overall}/100
          </Badge>
        </CardTitle>
        <CardDescription>{getScoreLabel(scores.overall)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {scoreItems.map((item) => (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className={cn('font-semibold', getScoreColor(item.value))}>
                {item.value}
              </span>
            </div>
            <Progress value={item.value} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

interface SuggestionListProps {
  suggestions: Suggestion[];
  onApply?: (suggestion: Suggestion) => void;
}

export function SuggestionList({ suggestions, onApply }: SuggestionListProps) {
  if (suggestions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No suggestions yet. Keep writing!</p>
        </CardContent>
      </Card>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-[#8c6210]" />;
      case 'tip':
        return <Lightbulb className="w-5 h-5 text-[#4F7563]" />;
      default:
        return <TrendingUp className="w-5 h-5 text-[#4F7563]" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-500';
      case 'medium':
        return 'border-yellow-500';
      default:
        return 'border-[#4F7563]';
    }
  };

  return (
    <div className="space-y-3">
      {suggestions.map((suggestion, index) => (
        <Card key={index} className={cn('border-l-4', getPriorityColor(suggestion.priority))}>
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <div className="mt-1">{getIcon(suggestion.type)}</div>
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <h4 className="font-semibold">{suggestion.title}</h4>
                  <Badge variant="outline" className="ml-2">
                    {suggestion.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                {suggestion.example && (
                  <Alert className="mt-2">
                    <Sparkles className="w-4 h-4" />
                    <AlertDescription className="text-sm">
                      <strong>Example:</strong> {suggestion.example}
                    </AlertDescription>
                  </Alert>
                )}
                {onApply && (
                  <Button variant="outline" size="sm" onClick={() => onApply(suggestion)}>
                    Apply Suggestion
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
