'use client';

import { useState } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { TensionEnhancement } from '@/types/storytelling';
import { AnalysisType } from '@/types/intelligence';
import { apiService } from '@/lib/api';
import { parseApiError } from '@/lib/errors';
import { toastError, toastSuccess } from '@/hooks/useToast';

interface TensionEnhancerProps {
  content: string;
  onEnhanced: (enhanced: string) => void;
  contentType?: AnalysisType;
  problemIntensity?: 'low' | 'medium' | 'high';
}

export function TensionEnhancer({
  content,
  onEnhanced,
  contentType,
  problemIntensity = 'medium',
}: TensionEnhancerProps) {
  const [loading, setLoading] = useState(false);
  const [enhancement, setEnhancement] = useState<TensionEnhancement | null>(null);

  const handleEnhance = async () => {
    if (!content.trim()) {
      toastError('No content', 'Please provide content to enhance');
      return;
    }

    setLoading(true);
    try {
      const result = await apiService.createTension<TensionEnhancement>(content, contentType, {
        problemIntensity,
      });

      setEnhancement(result);
      toastSuccess('Tension added!', 'Your content is now more engaging');
    } catch (error) {
      const appError = parseApiError(error);
      toastError('Enhancement failed', appError.userMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (enhancement) {
      onEnhanced(enhancement.enhancedContent);
      toastSuccess('Applied!', 'Enhanced content has been applied');
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-semibold">Tension Enhancer</h3>
        </div>
        <Badge variant="outline">AI-Powered</Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Add drama, urgency, and engagement to make your content impossible to ignore.
      </p>

      <Button onClick={handleEnhance} disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating Tension...
          </>
        ) : (
          <>
            <Zap className="w-4 h-4 mr-2" />
            Add Tension & Drama
          </>
        )}
      </Button>

      {/* Enhancement Result */}
      {enhancement && (
        <div className="space-y-4 pt-4 border-t">
          {/* Before/After Comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Tension Score</Label>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>Before</span>
                  <span className="font-medium">{enhancement.beforeAfter.tension}/10</span>
                </div>
                <Progress value={enhancement.beforeAfter.tension * 10} className="h-2" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Engagement Score</Label>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>After</span>
                  <span className="font-medium">{enhancement.beforeAfter.engagement}/10</span>
                </div>
                <Progress
                  value={enhancement.beforeAfter.engagement * 10}
                  className="h-2"
                />
              </div>
            </div>
          </div>

          {/* Enhanced Content */}
          <div className="space-y-2">
            <Label>Enhanced Content</Label>
            <Textarea
              value={enhancement.enhancedContent}
              readOnly
              rows={8}
              className="bg-muted"
            />
            <Button onClick={handleApply} className="w-full">
              Apply Enhanced Version
            </Button>
          </div>

          {/* Techniques Used */}
          {enhancement.tensionTechniques.length > 0 && (
            <div className="space-y-2">
              <Label>Tension Techniques Used</Label>
              <div className="flex flex-wrap gap-2">
                {enhancement.tensionTechniques.map((technique, i) => (
                  <Badge key={i} variant="secondary">
                    {technique}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Emotional Words */}
          {enhancement.emotionalWords.length > 0 && (
            <div className="space-y-2">
              <Label>Emotional Words Added</Label>
              <div className="flex flex-wrap gap-2">
                {enhancement.emotionalWords.map((word, i) => (
                  <Badge key={i} variant="outline" className="text-orange-600">
                    {word}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Comparison */}
          <div className="space-y-2">
            <Label>Original vs. Enhanced</Label>
            <div className="grid gap-3">
              <Card className="p-3 bg-red-50 dark:bg-red-950/20">
                <p className="text-xs text-muted-foreground mb-1">Original (Low Tension)</p>
                <p className="text-sm">{enhancement.originalContent}</p>
              </Card>
              <Card className="p-3 bg-green-50 dark:bg-green-950/20">
                <p className="text-xs text-muted-foreground mb-1">Enhanced (High Tension)</p>
                <p className="text-sm">{enhancement.enhancedContent}</p>
              </Card>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
