'use client';

import { useState } from 'react';
import { Sparkles, BookOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  StoryFramework,
  ToneStyle,
  StoryTransformation,
  STORY_FRAMEWORK_LABELS,
  STORY_FRAMEWORK_DESCRIPTIONS,
  TONE_STYLE_LABELS,
  TONE_STYLE_DESCRIPTIONS,
} from '@/types/storytelling';
import { AnalysisType } from '@/types/intelligence';
import { apiService } from '@/lib/api';
import { parseApiError } from '@/lib/errors';
import { toastError, toastSuccess } from '@/hooks/useToast';

interface StoryTransformerProps {
  content: string;
  onTransformed: (story: string) => void;
  contentType?: AnalysisType;
  context?: {
    companyName?: string;
    industry?: string;
    targetAudience?: string;
  };
}

export function StoryTransformer({ content, onTransformed, contentType, context }: StoryTransformerProps) {
  const [framework, setFramework] = useState<StoryFramework>(StoryFramework.PAS);
  const [tone, setTone] = useState<ToneStyle>(ToneStyle.PROFESSIONAL);
  const [loading, setLoading] = useState(false);
  const [transformation, setTransformation] = useState<StoryTransformation | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleTransform = async () => {
    if (!content.trim()) {
      toastError('No content', 'Please provide content to transform');
      return;
    }

    if (content.length < 50) {
      toastError('Too short', 'Content must be at least 50 characters');
      return;
    }

    setLoading(true);
    try {
      const result = await apiService.transformToStory<StoryTransformation>({
        content,
        framework,
        tone,
        contentType,
        context: {
          ...context,
          emotionalGoal: getEmotionalGoal(tone),
        },
      });

      setTransformation(result);
      setShowDetails(true);
      toastSuccess('Story created!', 'Your content has been transformed');
    } catch (error) {
      const appError = parseApiError(error);
      toastError('Transformation failed', appError.userMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (transformation) {
      onTransformed(transformation.transformedStory);
      toastSuccess('Applied!', 'Story has been applied to your content');
    }
  };

  const getEmotionalGoal = (toneStyle: ToneStyle): string => {
    const goals: Record<ToneStyle, string> = {
      [ToneStyle.INSPIRATIONAL]: 'inspiration',
      [ToneStyle.PROFESSIONAL]: 'trust',
      [ToneStyle.CONVERSATIONAL]: 'connection',
      [ToneStyle.URGENT]: 'urgency',
      [ToneStyle.CONFIDENT]: 'confidence',
      [ToneStyle.EMPATHETIC]: 'empathy',
    };
    return goals[toneStyle];
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Story Transformer</h3>
        </div>
        <Badge variant="outline">AI-Powered</Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Transform your business content into compelling narratives that engage and persuade.
      </p>

      {/* Framework Selection */}
      <div className="space-y-2">
        <Label>Story Framework</Label>
        <Select value={framework} onValueChange={(v) => setFramework(v as StoryFramework)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STORY_FRAMEWORK_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                <div className="flex flex-col items-start">
                  <span className="font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">
                    {STORY_FRAMEWORK_DESCRIPTIONS[value as StoryFramework]}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tone Selection */}
      <div className="space-y-2">
        <Label>Tone Style</Label>
        <Select value={tone} onValueChange={(v) => setTone(v as ToneStyle)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TONE_STYLE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                <div className="flex flex-col items-start">
                  <span className="font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">
                    {TONE_STYLE_DESCRIPTIONS[value as ToneStyle]}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transform Button */}
      <Button onClick={handleTransform} disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Transforming...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Transform to Story
          </>
        )}
      </Button>

      {/* Transformation Result */}
      {transformation && (
        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Transformed Story</Label>
              <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)}>
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Button>
            </div>
            <Textarea
              value={transformation.transformedStory}
              readOnly
              rows={10}
              className="bg-muted"
            />
            <Button onClick={handleApply} className="w-full">
              Apply This Story
            </Button>
          </div>

          {/* Story Details */}
          {showDetails && (
            <>
              {/* Emotional Arc */}
              {transformation.emotionalArc && (
                <div className="space-y-2">
                  <Label>Emotional Arc</Label>
                  <p className="text-sm text-muted-foreground">{transformation.emotionalArc}</p>
                </div>
              )}

              {/* Story Elements */}
              {transformation.elements.length > 0 && (
                <div className="space-y-2">
                  <Label>Story Structure</Label>
                  <div className="space-y-2">
                    {transformation.elements.map((element, i) => (
                      <Card key={i} className="p-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary">{element.element}</Badge>
                            <span className="text-xs text-muted-foreground">{element.purpose}</span>
                          </div>
                          <p className="text-sm">{element.content}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Alternative Hooks */}
              {transformation.hooks.length > 0 && (
                <div className="space-y-2">
                  <Label>Alternative Opening Lines</Label>
                  <ul className="space-y-1">
                    {transformation.hooks.map((hook, i) => (
                      <li key={i} className="text-sm text-muted-foreground">
                        • {hook}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Metaphors Used */}
              {transformation.metaphors.length > 0 && (
                <div className="space-y-2">
                  <Label>Metaphors & Analogies</Label>
                  <ul className="space-y-1">
                    {transformation.metaphors.map((metaphor, i) => (
                      <li key={i} className="text-sm text-muted-foreground">
                        • {metaphor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tension Points */}
              {transformation.tensionPoints.length > 0 && (
                <div className="space-y-2">
                  <Label>Tension & Engagement Points</Label>
                  <ul className="space-y-1">
                    {transformation.tensionPoints.map((point, i) => (
                      <li key={i} className="text-sm text-muted-foreground">
                        • {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Before/After Improvements */}
              {transformation.improvements.length > 0 && (
                <div className="space-y-2">
                  <Label>Key Improvements</Label>
                  <div className="space-y-3">
                    {transformation.improvements.map((improvement, i) => (
                      <Card key={i} className="p-3">
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-medium text-[#9a3737]">Before:</span>
                            <p className="text-sm text-muted-foreground italic">{improvement.before}</p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-[#4F7563]">After:</span>
                            <p className="text-sm">{improvement.after}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            <strong>Why:</strong> {improvement.reason}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
}
