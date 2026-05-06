'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import {
  Wand2,
  Minimize2,
  Maximize2,
  Briefcase,
  Target,
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface EnhancementPanelProps {
  slideId: string;
  deckId: string;
  onEnhancementComplete: () => void;
}

export default function EnhancementPanel({
  slideId,
  deckId,
  onEnhancementComplete,
}: EnhancementPanelProps) {
  const [enhancing, setEnhancing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleEnhancement = async (type: string, endpoint: string) => {
    setEnhancing(type);
    setMessage(null);

    try {
      const response = await api.post(endpoint);
      
      if (response.data.success) {
        setMessage({
          type: 'success',
          text: response.data.message || 'Enhancement completed successfully!',
        });
        onEnhancementComplete();
      } else {
        setMessage({
          type: 'error',
          text: response.data.message || 'Enhancement failed',
        });
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to enhance. Please try again.',
      });
    } finally {
      setEnhancing(null);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleImprove = () => handleEnhancement('improve', `/enhance/improve/${slideId}`);
  const handleShorten = () => handleEnhancement('shorten', `/enhance/shorten/${slideId}`);
  const handleExpand = () => handleEnhancement('expand', `/enhance/expand/${slideId}`);
  const handleMakeProfessional = () => handleEnhancement('professional', `/enhance/professional/${slideId}`);
  const handleMakeInvestorReady = () => handleEnhancement('investor', `/enhance/investor/${slideId}`);
  const handleRegenerateSlide = () => handleEnhancement('regenerate', `/enhance/regenerate/${slideId}`);
  const handleFixStructure = () => handleEnhancement('fixStructure', `/enhance/fix-structure/${deckId}`);
  const handleFixAllIssues = () => handleEnhancement('fixAll', `/enhance/fix-all/${deckId}`);

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-purple-600" />
          AI Enhancements
        </CardTitle>
        <CardDescription>
          Use AI to improve, adjust, or regenerate content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Message Display */}
        {message && (
          <div
            className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            {message.text}
          </div>
        )}

        {/* Content Enhancement */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">Content Enhancement</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleImprove}
              disabled={enhancing !== null}
              className="justify-start"
            >
              {enhancing === 'improve' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              Improve
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleShorten}
              disabled={enhancing !== null}
              className="justify-start"
            >
              {enhancing === 'shorten' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Minimize2 className="h-4 w-4 mr-2" />
              )}
              Shorten
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExpand}
              disabled={enhancing !== null}
              className="justify-start"
            >
              {enhancing === 'expand' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Maximize2 className="h-4 w-4 mr-2" />
              )}
              Expand
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleMakeProfessional}
              disabled={enhancing !== null}
              className="justify-start"
            >
              {enhancing === 'professional' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Briefcase className="h-4 w-4 mr-2" />
              )}
              Professional
            </Button>
          </div>
        </div>

        <Separator />

        {/* Audience Optimization */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">Audience Optimization</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={handleMakeInvestorReady}
            disabled={enhancing !== null}
            className="w-full justify-start"
          >
            {enhancing === 'investor' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Target className="h-4 w-4 mr-2" />
            )}
            Make Investor-Ready
          </Button>
        </div>

        <Separator />

        {/* Regenerate */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">Regenerate</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerateSlide}
            disabled={enhancing !== null}
            className="w-full justify-start"
          >
            {enhancing === 'regenerate' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCw className="h-4 w-4 mr-2" />
            )}
            Regenerate This Slide
          </Button>
        </div>

        <Separator />

        {/* Deck-level Actions */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            Deck-Level Actions
            <Badge variant="secondary" className="text-xs">
              All Slides
            </Badge>
          </h4>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFixStructure}
              disabled={enhancing !== null}
              className="w-full justify-start text-orange-600 hover:text-orange-700"
            >
              {enhancing === 'fixStructure' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <AlertTriangle className="h-4 w-4 mr-2" />
              )}
              Fix Structure
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleFixAllIssues}
              disabled={enhancing !== null}
              className="w-full justify-start text-red-600 hover:text-red-700"
            >
              {enhancing === 'fixAll' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <AlertTriangle className="h-4 w-4 mr-2" />
              )}
              Fix All Issues
            </Button>
          </div>
        </div>

        {/* Enhancement Tips */}
        <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800 border border-blue-200">
          <p className="font-semibold mb-1">💡 Tips</p>
          <ul className="space-y-1 ml-4 list-disc">
            <li>Use "Improve" to enhance clarity and impact</li>
            <li>Use "Shorten" to reduce text density</li>
            <li>Use "Expand" to add more detail</li>
            <li>"Fix All" will improve all low-scoring slides</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
