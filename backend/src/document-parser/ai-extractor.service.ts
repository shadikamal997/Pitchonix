import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ExtractedData } from './dto/document-upload.dto';

@Injectable()
export class AIExtractorService {
  private readonly logger = new Logger(AIExtractorService.name);
  private readonly openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not found in environment variables');
    }
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Extract structured data from document text using AI
   */
  async extractStructuredData(text: string): Promise<ExtractedData> {
    this.logger.log('Extracting structured data with AI...');

    try {
      const prompt = this.buildExtractionPrompt(text);
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting business information from pitch decks, business plans, and presentations. 
Extract key business information from the provided text and return it as valid JSON.
If information is not found, use null for that field. Be thorough and accurate.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content;
      const extractedData = JSON.parse(content) as ExtractedData;

      // Calculate confidence score
      const confidence = this.calculateConfidence(extractedData);
      extractedData.confidence = confidence;

      this.logger.log(`Data extracted with ${confidence}% confidence`);

      return extractedData;
    } catch (error) {
      this.logger.error('AI extraction failed:', error.message);
      throw error;
    }
  }

  /**
   * Build extraction prompt
   */
  private buildExtractionPrompt(text: string): string {
    // Truncate text if too long (to fit within token limits)
    const maxLength = 12000; // ~3000 tokens
    const truncatedText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;

    return `Extract the following business information from this document:

Document Text:
"""
${truncatedText}
"""

Extract and return a JSON object with these fields:

{
  "companyName": "Company or project name",
  "industry": "Industry or sector (e.g., Healthcare, FinTech, SaaS, E-commerce)",
  "businessStage": "Stage (e.g., Idea, MVP, Early Revenue, Growth, Established)",
  "country": "Country of operation",
  "website": "Company website URL if mentioned",
  
  "problem": "Problem statement or pain point being addressed",
  "solution": "Solution or product description",
  "targetCustomers": "Target customer segments or audience",
  "differentiation": "Unique value proposition or competitive advantages",
  "marketSize": "Market size information (TAM, SAM, SOM)",
  "competitors": "Key competitors or competitive landscape",
  "revenueModel": "Revenue model or how the company makes money",
  "pricingStrategy": "Pricing strategy or pricing tiers",
  "traction": "Traction metrics (users, revenue, growth)",
  "teamInfo": "Team information (founders, key members)",
  "fundingStatus": "Funding status (bootstrapped, seed, Series A, etc.)",
  "roadmap": "Product roadmap or future plans"
}

Return ONLY valid JSON. Use null for fields where information is not found. Be specific and extract actual data from the text.`;
  }

  /**
   * Calculate confidence score based on filled fields
   */
  private calculateConfidence(data: ExtractedData): number {
    const criticalFields = [
      'companyName',
      'problem',
      'solution',
      'targetCustomers',
    ];
    const importantFields = [
      'industry',
      'differentiation',
      'marketSize',
      'revenueModel',
    ];
    const optionalFields = [
      'businessStage',
      'country',
      'website',
      'competitors',
      'pricingStrategy',
      'traction',
      'teamInfo',
      'fundingStatus',
      'roadmap',
    ];

    let score = 0;

    // Critical fields: 40 points (10 points each)
    criticalFields.forEach((field) => {
      if (data[field] && data[field].length > 10) {
        score += 10;
      }
    });

    // Important fields: 40 points (10 points each)
    importantFields.forEach((field) => {
      if (data[field] && data[field].length > 10) {
        score += 10;
      }
    });

    // Optional fields: 20 points (2 points each)
    optionalFields.forEach((field) => {
      if (data[field] && data[field].length > 10) {
        score += 2;
      }
    });

    return Math.min(100, Math.round(score));
  }

  /**
   * Enhance extracted data with industry insights
   */
  async enhanceWithInsights(data: ExtractedData): Promise<ExtractedData> {
    if (!data.industry || !data.companyName) {
      return data;
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a business analyst. Enhance the provided business information with industry context and insights.',
          },
          {
            role: 'user',
            content: `Company: ${data.companyName}
Industry: ${data.industry}
Problem: ${data.problem || 'Not provided'}
Solution: ${data.solution || 'Not provided'}

Provide brief enhancements:
1. If market size is missing, estimate the TAM
2. If competitors are missing, list 3-5 major competitors
3. If differentiation is weak, suggest potential differentiators

Return as JSON with enhanced fields.`,
          },
        ],
        temperature: 0.5,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const enhancements = JSON.parse(response.choices[0].message.content);

      return {
        ...data,
        marketSize: data.marketSize || enhancements.marketSize,
        competitors: data.competitors || enhancements.competitors,
        differentiation: data.differentiation || enhancements.differentiation,
      };
    } catch (error) {
      this.logger.error('Enhancement failed:', error.message);
      return data; // Return original data if enhancement fails
    }
  }

  /**
   * Validate and clean extracted data
   */
  validateExtractedData(data: ExtractedData): ExtractedData {
    // Clean up null/undefined values
    const cleaned: ExtractedData = {};

    Object.keys(data).forEach((key) => {
      const value = data[key];
      if (value && typeof value === 'string' && value.trim().length > 0) {
        // Remove common AI artifacts
        cleaned[key] = value
          .replace(/^["']|["']$/g, '') // Remove quotes
          .replace(/\\n/g, '\n') // Fix escaped newlines
          .trim();
      } else if (value !== null && value !== undefined) {
        cleaned[key] = value;
      }
    });

    return cleaned;
  }
}
