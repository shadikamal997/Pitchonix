import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { SlideContent, WizardInput } from './slide-types/types';
import { RateLimiter, RetryStrategy, CostTracker } from './ai-utils';

/**
 * AI Enhancement Service
 * Uses OpenAI GPT-4 to enhance slide content quality
 */
@Injectable()
export class AIEnhancementService {
  private readonly logger = new Logger(AIEnhancementService.name);
  private openai: OpenAI;
  private isEnabled: boolean;
  private rateLimiter: RateLimiter;
  private retryStrategy: RetryStrategy;
  private costTracker: CostTracker;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey || apiKey === 'your-openai-api-key-here') {
      this.logger.warn('OpenAI API key not configured. AI enhancement disabled.');
      this.isEnabled = false;
    } else {
      this.openai = new OpenAI({ apiKey });
      this.isEnabled = true;
      this.rateLimiter = new RateLimiter(10, 2); // 10 max, 2 per second
      this.retryStrategy = new RetryStrategy(3, 1000, 10000, 2);
      this.costTracker = new CostTracker();
      this.logger.log('AI Enhancement Service initialized');
    }
  }

  /**
   * Check if AI enhancement is available
   */
  isAvailable(): boolean {
    return this.isEnabled;
  }

  /**
   * Enhance slide content using GPT-4
   */
  async enhanceSlide(
    slide: SlideContent,
    input: WizardInput,
    options?: {
      enhanceContent?: boolean;
      enhanceSpeakerNotes?: boolean;
      improveClarity?: boolean;
    },
  ): Promise<SlideContent> {
    if (!this.isEnabled) {
      this.logger.debug('AI enhancement skipped (not enabled)');
      return slide;
    }

    const {
      enhanceContent = true,
      enhanceSpeakerNotes = true,
      improveClarity = true,
    } = options || {};

    try {
      let enhancedSlide = { ...slide };

      // Enhance main content
      if (enhanceContent && improveClarity) {
        enhancedSlide = await this.enhanceSlideContent(enhancedSlide, input);
      }

      // Enhance speaker notes
      if (enhanceSpeakerNotes && input.includeSpeakerNotes) {
        enhancedSlide.speakerNotes = await this.enhanceSpeakerNotes(
          enhancedSlide,
          input,
        );
      }

      return enhancedSlide;
    } catch (error) {
      this.logger.error(`Failed to enhance slide: ${error.message}`, error.stack);
      // Return original slide on error
      return slide;
    }
  }

  /**
   * Enhance entire deck
   */
  async enhanceDeck(
    slides: SlideContent[],
    input: WizardInput,
  ): Promise<SlideContent[]> {
    if (!this.isEnabled) {
      this.logger.debug('Deck enhancement skipped (AI not enabled)');
      return slides;
    }

    this.logger.log(`Enhancing deck with ${slides.length} slides`);

    // Enhance slides in parallel (with concurrency limit)
    const enhancedSlides = await this.enhanceInBatches(slides, input, 3);

    // Post-process for coherence
    const coherentSlides = await this.ensureCoherence(enhancedSlides, input);

    // Log usage summary
    this.costTracker.logSummary();

    return coherentSlides;
  }

  /**
   * Get API usage summary
   */
  getUsageSummary(): { requests: number; tokens: number; estimatedCost: number } {
    return this.costTracker.getSummary();
  }

  /**
   * Enhance slide content
   */
  private async enhanceSlideContent(
    slide: SlideContent,
    input: WizardInput,
  ): Promise<SlideContent> {
    const prompt = this.buildContentEnhancementPrompt(slide, input);

    // Wait for rate limiter
    await this.rateLimiter.waitForToken();

    // Execute with retry
    const response = await this.retryStrategy.execute(
      async () => {
        return await this.openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(input),
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        });
      },
      `Enhance slide content [${slide.type}]`,
    );

    // Track usage
    if (response.usage) {
      this.costTracker.trackRequest(
        response.usage.prompt_tokens,
        response.usage.completion_tokens,
      );
    }

    const enhancedContent = response.choices[0]?.message?.content;

    if (!enhancedContent) {
      throw new Error('No response from OpenAI');
    }

    // Parse and merge enhanced content
    try {
      const parsed = JSON.parse(enhancedContent);
      return {
        ...slide,
        content: {
          ...slide.content,
          ...parsed,
        },
      };
    } catch (e) {
      this.logger.warn(`Failed to parse AI response: ${e.message}`);
      return slide;
    }
  }

  /**
   * Enhance speaker notes
   */
  private async enhanceSpeakerNotes(
    slide: SlideContent,
    input: WizardInput,
  ): Promise<string> {
    const prompt = this.buildSpeakerNotesPrompt(slide, input);

    // Wait for rate limiter
    await this.rateLimiter.waitForToken();

    // Execute with retry
    const response = await this.retryStrategy.execute(
      async () => {
        return await this.openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(input),
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.8,
          max_tokens: 500,
        });
      },
      `Enhance speaker notes [${slide.type}]`,
    );

    // Track usage
    if (response.usage) {
      this.costTracker.trackRequest(
        response.usage.prompt_tokens,
        response.usage.completion_tokens,
      );
    }

    return response.choices[0]?.message?.content || slide.speakerNotes || '';
  }

  /**
   * Build system prompt based on input context
   */
  private getSystemPrompt(input: WizardInput): string {
    const toneDescriptions: Record<string, string> = {
      professional: 'formal, authoritative, and credible',
      casual: 'friendly, approachable, and conversational',
      technical: 'precise, detailed, and technically accurate',
      inspirational: 'motivating, visionary, and aspirational',
    };

    const audienceDescriptions: Record<string, string> = {
      investors: 'focus on ROI, market opportunity, and growth potential',
      customers: 'emphasize benefits, ease of use, and value proposition',
      team: 'highlight collaboration, vision, and company culture',
      partners: 'stress mutual benefits, synergies, and strategic alignment',
      general: 'keep it accessible and broadly appealing',
    };

    const tone = toneDescriptions[input.tone] || 'professional and clear';
    const audience = audienceDescriptions[input.audience] || 'general audience';

    return `You are an expert presentation writer helping create a ${input.documentType.replace('_', ' ')}.

Style & Tone: Write in a ${tone} style.
Target Audience: ${input.audience} - ${audience}.
Industry: ${input.industry}

Your task is to enhance slide content while maintaining accuracy and authenticity. 
- Improve clarity and impact
- Adapt language to the audience
- Keep technical details accurate
- Make content more compelling and memorable
- Use active voice and strong verbs
- Avoid clichés and buzzwords unless industry-appropriate

Return only valid JSON. Do not add explanations or markdown formatting.`;
  }

  /**
   * Build content enhancement prompt
   */
  private buildContentEnhancementPrompt(
    slide: SlideContent,
    input: WizardInput,
  ): string {
    return `Enhance the content for this slide:

Slide Type: ${slide.type}
Title: ${slide.title}
Current Content: ${JSON.stringify(slide.content, null, 2)}

Company Context: ${input.companyName} - ${input.shortDescription}

Instructions:
1. Improve clarity and impact of the content
2. Adapt language to ${input.tone} tone for ${input.audience}
3. Make text more compelling and memorable
4. Keep all data points accurate (don't change numbers)
5. Maintain the same JSON structure

Return the enhanced content as valid JSON with the same structure.`;
  }

  /**
   * Build speaker notes prompt
   */
  private buildSpeakerNotesPrompt(
    slide: SlideContent,
    input: WizardInput,
  ): string {
    return `Create detailed speaker notes for this slide:

Slide Type: ${slide.type}
Title: ${slide.title}
Content: ${JSON.stringify(slide.content, null, 2)}

Current Notes: ${slide.speakerNotes || 'None'}

Context:
- Company: ${input.companyName}
- Audience: ${input.audience}
- Tone: ${input.tone}
- Document Type: ${input.documentType}

Write 3-5 sentences that:
1. Guide the presenter on what to emphasize
2. Suggest transitions to the next slide
3. Include tips for engaging the audience
4. Highlight key talking points
5. Maintain ${input.tone} tone

Return only the speaker notes text, no formatting or labels.`;
  }

  /**
   * Enhance slides in batches to avoid rate limits
   */
  private async enhanceInBatches(
    slides: SlideContent[],
    input: WizardInput,
    batchSize: number,
  ): Promise<SlideContent[]> {
    const enhanced: SlideContent[] = [];

    for (let i = 0; i < slides.length; i += batchSize) {
      const batch = slides.slice(i, i + batchSize);
      
      this.logger.debug(
        `Enhancing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(slides.length / batchSize)}`,
      );

      const batchResults = await Promise.all(
        batch.map((slide) => this.enhanceSlide(slide, input)),
      );

      enhanced.push(...batchResults);

      // Rate limiting delay between batches
      if (i + batchSize < slides.length) {
        await this.delay(1000); // 1 second delay
      }
    }

    return enhanced;
  }

  /**
   * Ensure coherence across deck
   */
  private async ensureCoherence(
    slides: SlideContent[],
    input: WizardInput,
  ): Promise<SlideContent[]> {
    // For now, just return slides as-is
    // Future: Add cross-slide coherence checking
    return slides;
  }

  /**
   * Generate executive summary using AI
   */
  async generateExecutiveSummary(input: WizardInput): Promise<string> {
    if (!this.isEnabled) {
      return `${input.companyName} executive summary`;
    }

    const prompt = `Create a compelling 2-3 sentence executive summary for:

Company: ${input.companyName}
Description: ${input.shortDescription}
Problem: ${input.problem}
Solution: ${input.solution}
Market: ${input.marketOpportunity}
Traction: ${input.traction}

Target audience: ${input.audience}
Tone: ${input.tone}

Write a concise, impactful summary that captures the essence of the business.`;

    try {
      // Wait for rate limiter
      await this.rateLimiter.waitForToken();

      // Execute with retry
      const response = await this.retryStrategy.execute(
        async () => {
          return await this.openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
              {
                role: 'system',
                content: this.getSystemPrompt(input),
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.8,
            max_tokens: 200,
          });
        },
        'Generate executive summary',
      );

      // Track usage
      if (response.usage) {
        this.costTracker.trackRequest(
          response.usage.prompt_tokens,
          response.usage.completion_tokens,
        );
      }

      return response.choices[0]?.message?.content || `${input.companyName} executive summary`;
    } catch (error) {
      this.logger.error(`Failed to generate executive summary: ${error.message}`);
      return `${input.companyName} executive summary`;
    }
  }

  /**
   * Improve bullet points with AI
   */
  async improveBulletPoints(
    points: string[],
    context: string,
    input: WizardInput,
  ): Promise<string[]> {
    if (!this.isEnabled || points.length === 0) {
      return points;
    }

    const prompt = `Improve these bullet points:

${points.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Context: ${context}
Audience: ${input.audience}
Tone: ${input.tone}

Make them:
- More concise and impactful
- Action-oriented with strong verbs
- Parallel in structure
- ${input.tone} in tone

Return as JSON array of strings.`;

    try {
      // Wait for rate limiter
      await this.rateLimiter.waitForToken();

      // Execute with retry
      const response = await this.retryStrategy.execute(
        async () => {
          return await this.openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
              {
                role: 'system',
                content: 'You are an expert copywriter. Return only valid JSON.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 300,
          });
        },
        'Improve bullet points',
      );

      // Track usage
      if (response.usage) {
        this.costTracker.trackRequest(
          response.usage.prompt_tokens,
          response.usage.completion_tokens,
        );
      }

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        return Array.isArray(parsed) ? parsed : points;
      }
    } catch (error) {
      this.logger.warn(`Failed to improve bullet points: ${error.message}`);
    }

    return points;
  }

  /**
   * Improve slide content (called by enhancement service)
   */
  async improveSlideContent(content: any, slideType: string): Promise<any> {
    if (!this.isEnabled) {
      return content;
    }

    const prompt = `Improve this slide content for better clarity and impact:

Slide Type: ${slideType}
Current Content: ${JSON.stringify(content, null, 2)}

Make it:
- More clear and concise
- More impactful and memorable
- Better structured
- More professional

Return enhanced content as valid JSON with the same structure.`;

    try {
      await this.rateLimiter.waitForToken();
      
      const response = await this.retryStrategy.execute(
        async () => {
          return await this.openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
              { role: 'system', content: 'You are an expert content editor. Return only valid JSON.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 800,
          });
        },
        'Improve slide content',
      );

      if (response.usage) {
        this.costTracker.trackRequest(response.usage.prompt_tokens, response.usage.completion_tokens);
      }

      const result = response.choices[0]?.message?.content;
      return result ? JSON.parse(result) : content;
    } catch (error) {
      this.logger.warn(`Failed to improve content: ${error.message}`);
      return content;
    }
  }

  /**
   * Shorten slide content
   */
  async shortenContent(content: any, slideType: string): Promise<any> {
    if (!this.isEnabled) {
      return content;
    }

    const prompt = `Shorten this slide content by 30-40% while keeping key messages:

Slide Type: ${slideType}
Current Content: ${JSON.stringify(content, null, 2)}

Make it:
- More concise (remove redundancy)
- Keep only essential information
- Maintain clarity
- Preserve key data points

Return shortened content as valid JSON with the same structure.`;

    try {
      await this.rateLimiter.waitForToken();
      
      const response = await this.retryStrategy.execute(
        async () => {
          return await this.openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
              { role: 'system', content: 'You are an expert content editor. Return only valid JSON.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.6,
            max_tokens: 600,
          });
        },
        'Shorten content',
      );

      if (response.usage) {
        this.costTracker.trackRequest(response.usage.prompt_tokens, response.usage.completion_tokens);
      }

      const result = response.choices[0]?.message?.content;
      return result ? JSON.parse(result) : content;
    } catch (error) {
      this.logger.warn(`Failed to shorten content: ${error.message}`);
      return content;
    }
  }

  /**
   * Expand slide content with more detail
   */
  async expandContent(content: any, slideType: string): Promise<any> {
    if (!this.isEnabled) {
      return content;
    }

    const prompt = `Expand this slide content with more detail and supporting information:

Slide Type: ${slideType}
Current Content: ${JSON.stringify(content, null, 2)}

Add:
- Supporting details
- Examples
- Additional context
- More explanation
- Keep it professional and valuable

Return expanded content as valid JSON with the same structure.`;

    try {
      await this.rateLimiter.waitForToken();
      
      const response = await this.retryStrategy.execute(
        async () => {
          return await this.openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
              { role: 'system', content: 'You are an expert content editor. Return only valid JSON.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.8,
            max_tokens: 1000,
          });
        },
        'Expand content',
      );

      if (response.usage) {
        this.costTracker.trackRequest(response.usage.prompt_tokens, response.usage.completion_tokens);
      }

      const result = response.choices[0]?.message?.content;
      return result ? JSON.parse(result) : content;
    } catch (error) {
      this.logger.warn(`Failed to expand content: ${error.message}`);
      return content;
    }
  }

  /**
   * Make content more professional
   */
  async makeProfessional(content: any, slideType: string): Promise<any> {
    if (!this.isEnabled) {
      return content;
    }

    const prompt = `Make this slide content more professional and polished:

Slide Type: ${slideType}
Current Content: ${JSON.stringify(content, null, 2)}

Improve:
- Use formal, authoritative language
- Remove casual expressions
- Add credibility and gravitas
- Use industry-appropriate terminology
- Sound more executive-level

Return professional content as valid JSON with the same structure.`;

    try {
      await this.rateLimiter.waitForToken();
      
      const response = await this.retryStrategy.execute(
        async () => {
          return await this.openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
              { role: 'system', content: 'You are an expert business writer. Return only valid JSON.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 800,
          });
        },
        'Make professional',
      );

      if (response.usage) {
        this.costTracker.trackRequest(response.usage.prompt_tokens, response.usage.completion_tokens);
      }

      const result = response.choices[0]?.message?.content;
      return result ? JSON.parse(result) : content;
    } catch (error) {
      this.logger.warn(`Failed to make professional: ${error.message}`);
      return content;
    }
  }

  /**
   * Optimize content for investor audience
   */
  async makeInvestorReady(content: any, slideType: string): Promise<any> {
    if (!this.isEnabled) {
      return content;
    }

    const prompt = `Optimize this slide content for investor audience:

Slide Type: ${slideType}
Current Content: ${JSON.stringify(content, null, 2)}

Focus on:
- ROI and financial returns
- Market opportunity and growth potential
- Competitive advantages
- Scalability
- Risk mitigation
- Clear value proposition
- Data-driven insights

Return investor-optimized content as valid JSON with the same structure.`;

    try {
      await this.rateLimiter.waitForToken();
      
      const response = await this.retryStrategy.execute(
        async () => {
          return await this.openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
              { role: 'system', content: 'You are an expert investor pitch consultant. Return only valid JSON.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 900,
          });
        },
        'Make investor-ready',
      );

      if (response.usage) {
        this.costTracker.trackRequest(response.usage.prompt_tokens, response.usage.completion_tokens);
      }

      const result = response.choices[0]?.message?.content;
      return result ? JSON.parse(result) : content;
    } catch (error) {
      this.logger.warn(`Failed to make investor-ready: ${error.message}`);
      return content;
    }
  }

  /**
   * Utility: delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
