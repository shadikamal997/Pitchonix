import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  AnalyzeSlideContentRequest,
  VisualAnalysisResponse,
  GenerateChartDataRequest,
  ChartDataResponse,
  ChartType,
  LayoutType,
  ImageStyle,
} from './dto/visual-intelligence.dto';

@Injectable()
export class VisualIntelligenceService {
  private readonly logger = new Logger(VisualIntelligenceService.name);
  private readonly openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Analyze slide content and recommend optimal visuals
   */
  async analyzeSlideContent(dto: AnalyzeSlideContentRequest): Promise<VisualAnalysisResponse> {
    this.logger.log(`Analyzing visual requirements for ${dto.slideType || 'slide'}`);

    try {
      const prompt = this.buildAnalysisPrompt(dto);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert presentation designer and data visualization specialist. Your job is to analyze slide content and recommend the most effective visual treatments—charts, layouts, images, and colors—that will make the message clear, memorable, and persuasive.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const result = JSON.parse(completion.choices[0].message.content);
      
      return {
        slideType: dto.slideType || 'general',
        charts: result.charts || [],
        layouts: result.layouts || [],
        images: result.images || [],
        colorSuggestions: result.colorSuggestions || this.getDefaultColors(dto.context?.designStyle),
        overallGuidance: result.overallGuidance || [],
        dosDonts: result.dosDonts || { dos: [], donts: [] },
      };
    } catch (error) {
      this.logger.error('Visual analysis failed', error);
      throw error;
    }
  }

  /**
   * Generate realistic chart data based on description
   */
  async generateChartData(dto: GenerateChartDataRequest): Promise<ChartDataResponse> {
    this.logger.log(`Generating chart data for ${dto.chartType}`);

    try {
      const prompt = `Generate realistic chart data for: "${dto.description}"

Chart Type: ${dto.chartType}
Number of Data Points: ${dto.dataPoints || 5}

Create data that:
- Is realistic and believable for the context
- Shows clear trends or patterns
- Has appropriate labels and values
- Tells a compelling story

Return JSON with this structure:
{
  "title": "string",
  "subtitle": "string (optional)",
  "labels": ["label1", "label2"],
  "values": [value1, value2],
  "categories": ["cat1", "cat2"] (if multi-series),
  "formatting": {
    "showLegend": boolean,
    "showValues": boolean,
    "showGrid": boolean,
    "colorScheme": ["#color1", "#color2"]
  }
}`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a data visualization expert who generates realistic, compelling chart data.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6,
      });

      const result = JSON.parse(completion.choices[0].message.content);

      return {
        type: dto.chartType,
        data: {
          labels: result.labels || [],
          values: result.values || [],
          categories: result.categories,
        },
        title: result.title || dto.description,
        subtitle: result.subtitle,
        formatting: result.formatting || this.getDefaultFormatting(dto.chartType),
      };
    } catch (error) {
      this.logger.error('Chart data generation failed', error);
      throw error;
    }
  }

  /**
   * Build visual analysis prompt
   */
  private buildAnalysisPrompt(dto: AnalyzeSlideContentRequest): string {
    return `Analyze this slide content and recommend optimal visual treatments:

**Content:**
"${dto.content}"

${dto.slideType ? `**Slide Type:** ${dto.slideType}` : ''}
${dto.dataPoints ? `**Has Data:** ${JSON.stringify(dto.dataPoints)}` : ''}
${dto.context?.companyName ? `**Company:** ${dto.context.companyName}` : ''}
${dto.context?.industry ? `**Industry:** ${dto.context.industry}` : ''}
${dto.context?.designStyle ? `**Design Style:** ${dto.context.designStyle}` : ''}

**Your Task:**
Recommend the most effective visual treatments for this slide. Consider:

1. **Charts** - If data should be visualized, what chart types work best?
2. **Layouts** - How should content be arranged for maximum impact?
3. **Images** - What imagery would support the message?
4. **Colors** - What color palette fits the content and mood?

**Chart Recommendations:**
For each recommended chart type, provide:
- Type: ${Object.values(ChartType).join(', ')}
- Confidence (0-100): How confident are you this chart fits?
- Reason: Why this chart type?
- Example: What would the chart show?
- Pros: Benefits of this chart type
- Cons: Potential downsides

Only recommend charts if the content contains or implies quantitative data.

**Layout Recommendations:**
For each recommended layout:
- Type: ${Object.values(LayoutType).join(', ')}
- Confidence (0-100)
- Reason: Why this layout?
- Structure: What sections and what emphasis?
- Preview: Brief text description of layout

**Image Recommendations:**
For each recommended image style:
- Style: ${Object.values(ImageStyle).join(', ')}
- Confidence (0-100)
- Search Keywords: Keywords to find appropriate images
- Placement: left | right | center | background | full
- Size: small | medium | large
- Reason: Why this image style?

**Color Suggestions:**
Recommend a color palette with:
- Primary color (hex)
- Accent color (hex)
- Background color (hex)
- Text color (hex)
- Reason: Why these colors fit the content and mood?

**Overall Guidance:**
Provide 3-5 high-level visual principles for this slide.

**Dos and Don'ts:**
- Dos: 3-5 specific things to do
- Don'ts: 3-5 specific things to avoid

Return as JSON:
{
  "charts": [
    {
      "type": "string",
      "confidence": number,
      "reason": "string",
      "example": "string",
      "pros": ["string"],
      "cons": ["string"]
    }
  ],
  "layouts": [
    {
      "type": "string",
      "confidence": number,
      "reason": "string",
      "structure": {
        "sections": ["string"],
        "emphasis": "string"
      },
      "preview": "string"
    }
  ],
  "images": [
    {
      "style": "string",
      "confidence": number,
      "searchKeywords": ["string"],
      "placement": "string",
      "size": "string",
      "reason": "string"
    }
  ],
  "colorSuggestions": {
    "primary": "#hex",
    "accent": "#hex",
    "background": "#hex",
    "text": "#hex",
    "reason": "string"
  },
  "overallGuidance": ["string"],
  "dosDonts": {
    "dos": ["string"],
    "donts": ["string"]
  }
}`;
  }

  /**
   * Get default colors based on design style
   */
  private getDefaultColors(designStyle?: string) {
    const styles = {
      modern: {
        primary: '#6366F1',
        accent: '#F59E0B',
        background: '#FFFFFF',
        text: '#1F2937',
        reason: 'Modern style with bold primary and vibrant accent',
      },
      minimal: {
        primary: '#000000',
        accent: '#6B7280',
        background: '#FFFFFF',
        text: '#111827',
        reason: 'Minimal style with monochrome palette',
      },
      bold: {
        primary: '#DC2626',
        accent: '#FBBF24',
        background: '#111827',
        text: '#FFFFFF',
        reason: 'Bold style with high contrast and energy',
      },
      professional: {
        primary: '#2563EB',
        accent: '#10B981',
        background: '#F9FAFB',
        text: '#1F2937',
        reason: 'Professional style with trustworthy blue and growth green',
      },
    };

    return styles[designStyle] || styles.professional;
  }

  /**
   * Get default formatting for chart type
   */
  private getDefaultFormatting(chartType: ChartType) {
    const defaults = {
      [ChartType.BAR]: {
        showLegend: false,
        showValues: true,
        showGrid: true,
        colorScheme: ['#6366F1', '#8B5CF6', '#EC4899'],
      },
      [ChartType.LINE]: {
        showLegend: true,
        showValues: false,
        showGrid: true,
        colorScheme: ['#3B82F6', '#10B981'],
      },
      [ChartType.PIE]: {
        showLegend: true,
        showValues: true,
        showGrid: false,
        colorScheme: ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'],
      },
      [ChartType.DONUT]: {
        showLegend: true,
        showValues: true,
        showGrid: false,
        colorScheme: ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B'],
      },
      [ChartType.AREA]: {
        showLegend: true,
        showValues: false,
        showGrid: true,
        colorScheme: ['#3B82F6', '#10B981'],
      },
      [ChartType.FUNNEL]: {
        showLegend: false,
        showValues: true,
        showGrid: false,
        colorScheme: ['#6366F1', '#8B5CF6', '#EC4899'],
      },
    };

    return defaults[chartType] || defaults[ChartType.BAR];
  }
}
