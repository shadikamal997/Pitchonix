'use client';

import { useState } from 'react';
import { Lightbulb, Loader2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MetaphorSuggestion } from '@/types/storytelling';
import { apiService } from '@/lib/api';
import { parseApiError } from '@/lib/errors';
import { toastError, toastSuccess } from '@/hooks/useToast';

interface MetaphorGeneratorProps {
  concept?: string;
  industry?: string;
  targetAudience?: string;
  onSelect?: (metaphor: string) => void;
}

export function MetaphorGenerator({
  concept: initialConcept = '',
  industry,
  targetAudience,
  onSelect,
}: MetaphorGeneratorProps) {
  const [concept, setConcept] = useState(initialConcept);
  const [loading, setLoading] = useState(false);
  const [metaphors, setMetaphors] = useState<MetaphorSuggestion[]>([]);

  const handleGenerate = async () => {
    if (!concept.trim()) {
      toastError('No concept', 'Please enter a concept to create metaphors for');
      return;
    }

    setLoading(true);
    try {
      const result = await apiService.generateMetaphors<MetaphorSuggestion[]>(
        concept,
        industry,
        targetAudience
      );

      setMetaphors(result);
      toastSuccess('Metaphors generated!', `Found ${result.length} creative analogies`);
    } catch (error) {
      const appError = parseApiError(error);
      toastError('Generation failed', appError.userMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toastSuccess('Copied!', 'Metaphor copied to clipboard');
  };

  const handleSelect = (metaphor: MetaphorSuggestion) => {
    if (onSelect) {
      onSelect(metaphor.example);
      toastSuccess('Applied!', 'Metaphor has been added');
    }
  };

  const getEffectivenessColor = (score: number) => {
    if (score >= 8) return 'bg-[#4F7563]';
    if (score >= 6) return 'bg-[#D9A441]';
    return 'bg-[#D9A441]';
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold">Metaphor Generator</h3>
        </div>
        <Badge variant="outline">AI-Powered</Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Make abstract concepts tangible with creative metaphors and analogies.
      </p>

      {/* Input */}
      <div className="space-y-2">
        <Label>Concept to Explain</Label>
        <Input
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder="e.g., AI-powered data analysis"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleGenerate();
          }}
        />
        <p className="text-xs text-muted-foreground">
          Enter an abstract or complex concept you want to make more relatable
        </p>
      </div>

      <Button onClick={handleGenerate} disabled={loading || !concept.trim()} className="w-full">
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating Metaphors...
          </>
        ) : (
          <>
            <Lightbulb className="w-4 h-4 mr-2" />
            Generate Metaphors
          </>
        )}
      </Button>

      {/* Metaphor Results */}
      {metaphors.length > 0 && (
        <div className="space-y-4 pt-4 border-t">
          <Label>Generated Metaphors</Label>
          <div className="space-y-3">
            {metaphors.map((metaphor, i) => (
              <Card key={i} className="p-4 hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{metaphor.metaphor}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {metaphor.explanation}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      <div className={`w-8 h-8 rounded-full ${getEffectivenessColor(metaphor.effectiveness)} flex items-center justify-center text-white text-xs font-bold`}>
                        {metaphor.effectiveness}
                      </div>
                    </div>
                  </div>

                  {/* Example */}
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Example Usage:</p>
                    <p className="text-sm italic">"{metaphor.example}"</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(metaphor.example)}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                    {onSelect && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleSelect(metaphor)}
                      >
                        Use This Metaphor
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
