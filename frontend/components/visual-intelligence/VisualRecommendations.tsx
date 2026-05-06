'use client';

import { useState } from 'react';
import { Eye, Loader2, TrendingUp, Layout, Image, Palette, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  VisualAnalysisResponse,
  ChartRecommendation,
  LayoutRecommendation,
  ImageRecommendation,
  CHART_TYPE_LABELS,
  LAYOUT_TYPE_LABELS,
  IMAGE_STYLE_LABELS,
} from '@/types/visual-intelligence';
import { apiService } from '@/lib/api';
import { parseApiError } from '@/lib/errors';
import { toastError, toastSuccess } from '@/hooks/useToast';

interface VisualRecommendationsProps {
  content: string;
  slideType?: string;
  onSelectChart?: (chart: ChartRecommendation) => void;
  onSelectLayout?: (layout: LayoutRecommendation) => void;
  onSelectImage?: (image: ImageRecommendation) => void;
  context?: {
    companyName?: string;
    industry?: string;
    designStyle?: string;
  };
}

export function VisualRecommendations({
  content,
  slideType,
  onSelectChart,
  onSelectLayout,
  onSelectImage,
  context,
}: VisualRecommendationsProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<VisualAnalysisResponse | null>(null);

  const handleAnalyze = async () => {
    if (!content.trim()) {
      toastError('No content', 'Please provide slide content to analyze');
      return;
    }

    setLoading(true);
    try {
      const result = await apiService.analyzeSlideContent<VisualAnalysisResponse>({
        content,
        slideType,
        context,
      });

      setAnalysis(result);
      toastSuccess('Analysis complete!', 'Visual recommendations are ready');
    } catch (error) {
      const appError = parseApiError(error);
      toastError('Analysis failed', appError.userMessage);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return 'High';
    if (confidence >= 60) return 'Medium';
    return 'Low';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Eye className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Visual Intelligence</h3>
          </div>
          <Badge variant="outline">AI-Powered</Badge>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Get AI-powered recommendations for charts, layouts, images, and colors that will make your slide more effective.
        </p>

        <Button onClick={handleAnalyze} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 mr-2" />
              Analyze Visual Needs
            </>
          )}
        </Button>
      </Card>

      {/* Results */}
      {analysis && (
        <Tabs defaultValue="charts" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="charts">
              <TrendingUp className="w-4 h-4 mr-2" />
              Charts
            </TabsTrigger>
            <TabsTrigger value="layouts">
              <Layout className="w-4 h-4 mr-2" />
              Layouts
            </TabsTrigger>
            <TabsTrigger value="images">
              <Image className="w-4 h-4 mr-2" />
              Images
            </TabsTrigger>
            <TabsTrigger value="colors">
              <Palette className="w-4 h-4 mr-2" />
              Colors
            </TabsTrigger>
            <TabsTrigger value="guidance">
              Guide
            </TabsTrigger>
          </TabsList>

          {/* Charts Tab */}
          <TabsContent value="charts" className="space-y-4">
            {analysis.charts.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">
                No chart recommendations. Your content may not contain quantitative data.
              </Card>
            ) : (
              analysis.charts.map((chart, i) => (
                <Card key={i} className="p-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold">{CHART_TYPE_LABELS[chart.type]}</h4>
                          <Badge variant="secondary">{getConfidenceBadge(chart.confidence)}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{chart.reason}</p>
                      </div>
                      <div className="text-right ml-4">
                        <div className={`text-2xl font-bold ${getConfidenceColor(chart.confidence)}`}>
                          {chart.confidence}%
                        </div>
                        <Progress value={chart.confidence} className="w-24 h-2 mt-1" />
                      </div>
                    </div>

                    {/* Example */}
                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">Example:</p>
                      <p className="text-sm">{chart.example}</p>
                    </div>

                    {/* Pros/Cons */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-green-600 mb-2">Pros:</p>
                        <ul className="space-y-1">
                          {chart.pros.map((pro, j) => (
                            <li key={j} className="text-xs text-muted-foreground flex items-start">
                              <CheckCircle2 className="w-3 h-3 mr-1 mt-0.5 text-green-600 flex-shrink-0" />
                              <span>{pro}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-red-600 mb-2">Cons:</p>
                        <ul className="space-y-1">
                          {chart.cons.map((con, j) => (
                            <li key={j} className="text-xs text-muted-foreground flex items-start">
                              <XCircle className="w-3 h-3 mr-1 mt-0.5 text-red-600 flex-shrink-0" />
                              <span>{con}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Action */}
                    {onSelectChart && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectChart(chart)}
                        className="w-full"
                      >
                        Use This Chart
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Layouts Tab */}
          <TabsContent value="layouts" className="space-y-4">
            {analysis.layouts.map((layout, i) => (
              <Card key={i} className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold">{LAYOUT_TYPE_LABELS[layout.type]}</h4>
                        <Badge variant="secondary">{getConfidenceBadge(layout.confidence)}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{layout.reason}</p>
                    </div>
                    <div className="text-right ml-4">
                      <div className={`text-2xl font-bold ${getConfidenceColor(layout.confidence)}`}>
                        {layout.confidence}%
                      </div>
                      <Progress value={layout.confidence} className="w-24 h-2 mt-1" />
                    </div>
                  </div>

                  {/* Structure */}
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-xs text-muted-foreground mb-2">Structure:</p>
                    <div className="space-y-1">
                      {layout.structure.sections.map((section, j) => (
                        <div key={j} className="text-sm flex items-center">
                          <div className="w-2 h-2 bg-primary rounded-full mr-2" />
                          {section}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>Emphasis:</strong> {layout.structure.emphasis}
                    </p>
                  </div>

                  {/* Preview */}
                  {layout.preview && (
                    <div className="bg-muted/50 p-3 rounded-md border-2 border-dashed">
                      <p className="text-xs text-muted-foreground mb-1">Layout Preview:</p>
                      <p className="text-sm whitespace-pre-line">{layout.preview}</p>
                    </div>
                  )}

                  {/* Action */}
                  {onSelectLayout && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectLayout(layout)}
                      className="w-full"
                    >
                      Use This Layout
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* Images Tab */}
          <TabsContent value="images" className="space-y-4">
            {analysis.images.map((image, i) => (
              <Card key={i} className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold">{IMAGE_STYLE_LABELS[image.style]}</h4>
                        <Badge variant="secondary">{getConfidenceBadge(image.confidence)}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{image.reason}</p>
                    </div>
                    <div className="text-right ml-4">
                      <div className={`text-2xl font-bold ${getConfidenceColor(image.confidence)}`}>
                        {image.confidence}%
                      </div>
                      <Progress value={image.confidence} className="w-24 h-2 mt-1" />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Placement:</p>
                      <Badge variant="outline">{image.placement}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Size:</p>
                      <Badge variant="outline">{image.size}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Style:</p>
                      <Badge variant="outline">{IMAGE_STYLE_LABELS[image.style]}</Badge>
                    </div>
                  </div>

                  {/* Search Keywords */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Search Keywords:</p>
                    <div className="flex flex-wrap gap-2">
                      {image.searchKeywords.map((keyword, j) => (
                        <Badge key={j} variant="secondary">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Action */}
                  {onSelectImage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectImage(image)}
                      className="w-full"
                    >
                      Use This Image Style
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* Colors Tab */}
          <TabsContent value="colors">
            <Card className="p-6">
              <h4 className="font-semibold mb-4">Recommended Color Palette</h4>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Primary</p>
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-12 h-12 rounded border"
                      style={{ backgroundColor: analysis.colorSuggestions.primary }}
                    />
                    <div>
                      <p className="text-sm font-mono">{analysis.colorSuggestions.primary}</p>
                      <p className="text-xs text-muted-foreground">Main brand color</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Accent</p>
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-12 h-12 rounded border"
                      style={{ backgroundColor: analysis.colorSuggestions.accent }}
                    />
                    <div>
                      <p className="text-sm font-mono">{analysis.colorSuggestions.accent}</p>
                      <p className="text-xs text-muted-foreground">Highlights & CTAs</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Background</p>
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-12 h-12 rounded border"
                      style={{ backgroundColor: analysis.colorSuggestions.background }}
                    />
                    <div>
                      <p className="text-sm font-mono">{analysis.colorSuggestions.background}</p>
                      <p className="text-xs text-muted-foreground">Slide background</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Text</p>
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-12 h-12 rounded border"
                      style={{ backgroundColor: analysis.colorSuggestions.text }}
                    />
                    <div>
                      <p className="text-sm font-mono">{analysis.colorSuggestions.text}</p>
                      <p className="text-xs text-muted-foreground">Body text</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm">
                  <strong>Why these colors?</strong> {analysis.colorSuggestions.reason}
                </p>
              </div>
            </Card>
          </TabsContent>

          {/* Guidance Tab */}
          <TabsContent value="guidance" className="space-y-4">
            {/* Overall Guidance */}
            <Card className="p-6">
              <h4 className="font-semibold mb-3">Overall Visual Principles</h4>
              <ul className="space-y-2">
                {analysis.overallGuidance.map((guidance, i) => (
                  <li key={i} className="text-sm flex items-start">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-xs font-bold text-primary">{i + 1}</span>
                    </div>
                    <span>{guidance}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Dos and Don'ts */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-6">
                <h4 className="font-semibold mb-3 text-green-600 flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Do This
                </h4>
                <ul className="space-y-2">
                  {analysis.dosDonts.dos.map((item, i) => (
                    <li key={i} className="text-sm flex items-start">
                      <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="p-6">
                <h4 className="font-semibold mb-3 text-red-600 flex items-center">
                  <XCircle className="w-4 h-4 mr-2" />
                  Avoid This
                </h4>
                <ul className="space-y-2">
                  {analysis.dosDonts.donts.map((item, i) => (
                    <li key={i} className="text-sm flex items-start">
                      <XCircle className="w-4 h-4 mr-2 mt-0.5 text-red-600 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
