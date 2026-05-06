import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AnalysisType, ContentScore, Suggestion, ContentAnalysisDto } from './dto/analyze-content.dto';

@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);
  private readonly openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Analyze content and provide scores, suggestions, and enhancements
   */
  async analyzeContent(
    content: string,
    type: AnalysisType,
    context?: any,
  ): Promise<ContentAnalysisDto> {
    this.logger.log(`Analyzing ${type} content (${content.length} chars)`);

    try {
      const prompt = this.buildAnalysisPrompt(content, type, context);
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert pitch deck consultant and business analyst. Analyze the provided content and provide actionable feedback to improve its effectiveness. Return your analysis as valid JSON.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      
      // Validate and structure the response
      const result: ContentAnalysisDto = {
        scores: this.parseScores(analysis.scores),
        suggestions: this.parseSuggestions(analysis.suggestions || []),
        enhancedContent: analysis.enhancedContent || analysis.enhanced_content,
        insights: Array.isArray(analysis.insights) ? analysis.insights : [],
        issues: Array.isArray(analysis.issues) ? analysis.issues : [],
      };

      this.logger.log(`Analysis complete. Overall score: ${result.scores.overall}`);
      return result;
    } catch (error) {
      this.logger.error('Content analysis failed:', error.message);
      throw error;
    }
  }

  /**
   * Build analysis prompt based on content type
   */
  private buildAnalysisPrompt(content: string, type: AnalysisType, context?: any): string {
    const contextInfo = context
      ? `\n\nContext:\n- Company: ${context.companyName || 'N/A'}\n- Industry: ${context.industry || 'N/A'}\n- Target Audience: ${context.targetAudience || 'Investors'}\n- Stage: ${context.businessStage || 'N/A'}`
      : '';

    const typeSpecificGuidance = this.getTypeSpecificGuidance(type);

    return `Analyze this ${type} statement and provide comprehensive feedback:${contextInfo}

Content to analyze:
"""
${content}
"""

${typeSpecificGuidance}

Return a JSON object with this structure:
{
  "scores": {
    "overall": <0-100>,
    "clarity": <0-100>,
    "impact": <0-100>,
    "specificity": <0-100>,
    "professionalism": <0-100>
  },
  "suggestions": [
    {
      "type": "improvement|warning|tip",
      "title": "Brief title",
      "description": "Detailed explanation",
      "example": "Optional example",
      "priority": "high|medium|low"
    }
  ],
  "enhancedContent": "Improved version of the content (optional)",
  "insights": ["Key insight 1", "Key insight 2"],
  "issues": ["Issue 1 (if any)", "Issue 2"]
}

Be specific, actionable, and constructive in your feedback.`;
  }

  /**
   * Get type-specific analysis guidance
   */
  private getTypeSpecificGuidance(type: AnalysisType): string {
    const guidance = {
      [AnalysisType.PROBLEM]: `
Evaluate the problem statement on:
1. Clarity: Is the problem clearly defined?
2. Urgency: Does it convey urgency and importance?
3. Scope: Is the market size and impact clear?
4. Relatability: Can investors/customers relate to this problem?
5. Specificity: Are there concrete examples or data?`,

      [AnalysisType.SOLUTION]: `
Evaluate the solution on:
1. Clarity: Is the solution easy to understand?
2. Differentiation: What makes it unique?
3. Feasibility: Does it seem achievable?
4. Value: Is the value proposition clear?
5. Completeness: Does it fully address the problem?`,

      [AnalysisType.MARKET]: `
Evaluate the market analysis on:
1. Size: Is TAM/SAM/SOM clearly defined?
2. Growth: Are growth trends mentioned?
3. Data: Are statistics and sources provided?
4. Segmentation: Are target segments identified?
5. Opportunity: Is the market opportunity compelling?`,

      [AnalysisType.DIFFERENTIATION]: `
Evaluate the differentiation on:
1. Uniqueness: What's truly unique?
2. Defensibility: Can it be easily copied?
3. Evidence: Is there proof of differentiation?
4. Importance: Does it matter to customers?
5. Sustainability: Can it be maintained long-term?`,

      [AnalysisType.VALUE_PROPOSITION]: `
Evaluate the value proposition on:
1. Clarity: Is the value immediately clear?
2. Specificity: Are benefits quantified?
3. Relevance: Does it address customer needs?
4. Differentiation: Why choose this over alternatives?
5. Credibility: Is it believable?`,

      [AnalysisType.PITCH]: `
Evaluate the pitch on:
1. Hook: Does it grab attention immediately?
2. Flow: Is the narrative logical?
3. Completeness: Does it cover all key points?
4. Emotion: Does it create excitement?
5. Call-to-action: Is the ask clear?`,

      [AnalysisType.GENERAL]: `
Evaluate the content on:
1. Clarity: Is it easy to understand?
2. Conciseness: Is it free of unnecessary words?
3. Impact: Is it compelling and memorable?
4. Structure: Is it well-organized?
5. Tone: Is it appropriate for the audience?`,
    };

    return guidance[type] || guidance[AnalysisType.GENERAL];
  }

  /**
   * Parse and validate scores
   */
  private parseScores(scores: any): ContentScore {
    const defaultScore = { overall: 50, clarity: 50, impact: 50, specificity: 50, professionalism: 50 };
    
    if (!scores || typeof scores !== 'object') {
      return defaultScore;
    }

    return {
      overall: this.clampScore(scores.overall),
      clarity: this.clampScore(scores.clarity),
      impact: this.clampScore(scores.impact),
      specificity: this.clampScore(scores.specificity),
      professionalism: this.clampScore(scores.professionalism),
    };
  }

  /**
   * Clamp score between 0 and 100
   */
  private clampScore(score: any): number {
    const num = parseInt(score, 10);
    if (isNaN(num)) return 50;
    return Math.max(0, Math.min(100, num));
  }

  /**
   * Parse and validate suggestions
   */
  private parseSuggestions(suggestions: any[]): Suggestion[] {
    if (!Array.isArray(suggestions)) {
      return [];
    }

    return suggestions
      .filter((s) => s && s.title && s.description)
      .map((s) => ({
        type: ['improvement', 'warning', 'tip'].includes(s.type) ? s.type : 'improvement',
        title: String(s.title),
        description: String(s.description),
        example: s.example ? String(s.example) : undefined,
        priority: ['high', 'medium', 'low'].includes(s.priority) ? s.priority : 'medium',
      }))
      .slice(0, 10); // Limit to 10 suggestions
  }

  /**
   * Quick content check (faster, simpler analysis)
   */
  async quickCheck(content: string): Promise<{ score: number; issues: string[] }> {
    const wordCount = content.trim().split(/\s+/).length;
    const issues: string[] = [];
    let score = 100;

    // Length checks
    if (wordCount < 10) {
      issues.push('Content is too short. Add more detail.');
      score -= 30;
    } else if (wordCount > 200) {
      issues.push('Content is too long. Be more concise.');
      score -= 10;
    }

    // Clarity checks
    if (content.includes('...') || content.includes('etc.')) {
      issues.push('Avoid vague terms like "..." or "etc." Be specific.');
      score -= 10;
    }

    // Jargon check (basic)
    const jargonWords = ['synergy', 'leverage', 'utilize', 'paradigm', 'disruptive', 'revolutionary'];
    jargonWords.forEach((word) => {
      if (content.toLowerCase().includes(word)) {
        issues.push(`Avoid overused buzzwords like "${word}". Use simpler language.`);
        score -= 5;
      }
    });

    // Confidence language
    const weakWords = ['might', 'maybe', 'perhaps', 'possibly', 'probably'];
    weakWords.forEach((word) => {
      if (content.toLowerCase().includes(word)) {
        issues.push(`Replace weak words like "${word}" with confident language.`);
        score -= 5;
      }
    });

    return {
      score: Math.max(0, Math.min(100, score)),
      issues,
    };
  }

  /**
   * Enhance content with specific improvements
   */
  async enhanceContent(content: string, type: AnalysisType): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at improving business content for pitch decks. Make the content more compelling, clear, and impactful while maintaining the core message.',
          },
          {
            role: 'user',
            content: `Improve this ${type} statement:\n\n"${content}"\n\nReturn only the improved version, no explanation.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      return response.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
    } catch (error) {
      this.logger.error('Content enhancement failed:', error.message);
      return content; // Return original if enhancement fails
    }
  }
}
