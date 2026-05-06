import { Injectable } from '@nestjs/common';
import { TemplateService, IndustryTemplate } from '../templates/template.service';

export interface Suggestion {
  value: string;
  label: string;
  confidence: number; // 0-1 score
  source: 'template' | 'industry' | 'ai' | 'pattern';
  category?: string;
}

export interface SuggestionContext {
  industry?: string;
  documentType?: string;
  fieldName: string;
  currentValue?: string;
  relatedFields?: Record<string, string>;
}

@Injectable()
export class SuggestionsService {
  constructor(private templateService: TemplateService) {}

  /**
   * Get intelligent suggestions for a field based on context
   */
  async getSuggestions(context: SuggestionContext): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // Get template-based suggestions
    if (context.industry || context.documentType) {
      const templateSuggestions = this.getTemplateSuggestions(context);
      suggestions.push(...templateSuggestions);
    }

    // Get industry-specific suggestions
    if (context.industry) {
      const industrySuggestions = this.getIndustrySuggestions(context);
      suggestions.push(...industrySuggestions);
    }

    // Get field-specific suggestions
    const fieldSuggestions = this.getFieldSpecificSuggestions(context);
    suggestions.push(...fieldSuggestions);

    // Get pattern-based suggestions
    if (context.relatedFields) {
      const patternSuggestions = this.getPatternSuggestions(context);
      suggestions.push(...patternSuggestions);
    }

    // Sort by confidence and deduplicate
    return this.deduplicate(suggestions)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10); // Top 10 suggestions
  }

  /**
   * Get suggestions from similar templates
   */
  private getTemplateSuggestions(context: SuggestionContext): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const templates = this.templateService.getAllTemplates();

    // Filter templates by industry or document type
    const relevantTemplates = templates.filter(t => {
      if (context.industry && t.industry !== context.industry) return false;
      if (context.documentType && t.documentType !== context.documentType) return false;
      return true;
    });

    // Extract suggestions from template prefilled data
    relevantTemplates.forEach(template => {
      const value = this.getFieldFromTemplate(template, context.fieldName);
      if (value && value !== '[Your Company]' && value.length > 10) {
        suggestions.push({
          value,
          label: `From ${template.name}`,
          confidence: 0.8,
          source: 'template',
          category: template.category,
        });
      }
    });

    return suggestions;
  }

  /**
   * Get industry-specific common suggestions
   */
  private getIndustrySuggestions(context: SuggestionContext): Suggestion[] {
    const industryData = this.getIndustryKnowledgeBase();
    const industry = context.industry;

    if (!industry || !industryData[industry]) {
      return [];
    }

    const suggestions: Suggestion[] = [];
    const data = industryData[industry];

    switch (context.fieldName) {
      case 'targetCustomers':
        if (data.commonCustomers) {
          data.commonCustomers.forEach(customer => {
            suggestions.push({
              value: customer,
              label: `Common in ${industry}`,
              confidence: 0.7,
              source: 'industry',
            });
          });
        }
        break;

      case 'competitors':
        if (data.commonCompetitors) {
          data.commonCompetitors.forEach(competitor => {
            suggestions.push({
              value: competitor,
              label: `Industry competitor`,
              confidence: 0.7,
              source: 'industry',
            });
          });
        }
        break;

      case 'revenueModel':
        if (data.commonBusinessModels) {
          data.commonBusinessModels.forEach(model => {
            suggestions.push({
              value: model,
              label: `Popular in ${industry}`,
              confidence: 0.7,
              source: 'industry',
            });
          });
        }
        break;

      case 'marketOpportunity':
        if (data.marketSize) {
          suggestions.push({
            value: data.marketSize,
            label: `${industry} market data`,
            confidence: 0.6,
            source: 'industry',
          });
        }
        break;
    }

    return suggestions;
  }

  /**
   * Get field-specific smart suggestions
   */
  private getFieldSpecificSuggestions(context: SuggestionContext): Suggestion[] {
    const suggestions: Suggestion[] = [];

    switch (context.fieldName) {
      case 'problem':
        suggestions.push(
          {
            value: 'Customers struggle with [pain point] costing them $[amount] annually',
            label: 'Problem template',
            confidence: 0.5,
            source: 'pattern',
          },
          {
            value: 'Current solutions are [expensive/slow/complex], creating [specific impact]',
            label: 'Problem template',
            confidence: 0.5,
            source: 'pattern',
          },
        );
        break;

      case 'solution':
        suggestions.push(
          {
            value: 'Our platform [action verb] by [key benefit], delivering [outcome]',
            label: 'Solution template',
            confidence: 0.5,
            source: 'pattern',
          },
          {
            value: '[Product name] is a [category] that helps [target] achieve [goal]',
            label: 'Solution template',
            confidence: 0.5,
            source: 'pattern',
          },
        );
        break;

      case 'differentiation':
        suggestions.push(
          {
            value: 'Unlike competitors, we [unique approach] resulting in [X%] better [metric]',
            label: 'Differentiation template',
            confidence: 0.5,
            source: 'pattern',
          },
          {
            value: 'First-to-market with [innovation], [X]x faster than [competitor]',
            label: 'Differentiation template',
            confidence: 0.5,
            source: 'pattern',
          },
        );
        break;

      case 'traction':
        suggestions.push(
          {
            value: '[X] customers, $[Y] MRR, growing [Z]% month-over-month',
            label: 'Traction template',
            confidence: 0.5,
            source: 'pattern',
          },
          {
            value: '[X] users, [Y]% retention rate, featured in [publication]',
            label: 'Traction template',
            confidence: 0.5,
            source: 'pattern',
          },
        );
        break;

      case 'fundingAsk':
        suggestions.push(
          {
            value: '$[X]M Series [A/B/C] to [use 1], [use 2], and [use 3]',
            label: 'Funding template',
            confidence: 0.5,
            source: 'pattern',
          },
          {
            value: 'Raising $[X]M with [Y]-month runway to reach [milestone]',
            label: 'Funding template',
            confidence: 0.5,
            source: 'pattern',
          },
        );
        break;
    }

    return suggestions;
  }

  /**
   * Get suggestions based on relationships between fields
   */
  private getPatternSuggestions(context: SuggestionContext): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const { relatedFields, fieldName } = context;

    // If problem is filled, suggest related solution
    if (fieldName === 'solution' && relatedFields?.problem) {
      const problem = relatedFields.problem.toLowerCase();
      
      if (problem.includes('expensive') || problem.includes('cost')) {
        suggestions.push({
          value: 'Affordable solution with [X]% lower cost through [approach]',
          label: 'Based on your problem statement',
          confidence: 0.6,
          source: 'pattern',
        });
      }
      
      if (problem.includes('slow') || problem.includes('time')) {
        suggestions.push({
          value: '[X]x faster processing using [technology], reducing time from [before] to [after]',
          label: 'Based on your problem statement',
          confidence: 0.6,
          source: 'pattern',
        });
      }
      
      if (problem.includes('complex') || problem.includes('difficult')) {
        suggestions.push({
          value: 'Simple, intuitive interface that [benefit], no training required',
          label: 'Based on your problem statement',
          confidence: 0.6,
          source: 'pattern',
        });
      }
    }

    // If target customers are filled, suggest related marketing channels
    if (fieldName === 'revenueModel' && relatedFields?.targetCustomers) {
      const customers = relatedFields.targetCustomers.toLowerCase();
      
      if (customers.includes('enterprise') || customers.includes('b2b')) {
        suggestions.push({
          value: 'Enterprise SaaS model: $[X]/user/month with annual contracts and volume discounts',
          label: 'For B2B/Enterprise customers',
          confidence: 0.7,
          source: 'pattern',
        });
      }
      
      if (customers.includes('consumer') || customers.includes('b2c')) {
        suggestions.push({
          value: 'Freemium model: Free tier to $[X]/month premium, with in-app upgrades',
          label: 'For consumer customers',
          confidence: 0.7,
          source: 'pattern',
        });
      }
    }

    return suggestions;
  }

  /**
   * Extract specific field value from template
   */
  private getFieldFromTemplate(template: IndustryTemplate, fieldName: string): string | null {
    const fieldMap: Record<string, keyof IndustryTemplate['prefilled']> = {
      problem: 'problem',
      solution: 'solution',
      targetCustomers: 'targetCustomers',
      marketOpportunity: 'marketOpportunity',
      competitors: 'competitors',
      differentiation: 'differentiation',
      revenueModel: 'revenueModel',
      pricing: 'pricing',
      traction: 'currentTraction',
      team: 'team',
      fundingAsk: 'fundingAsk',
      roadmap: 'roadmap',
    };

    const templateField = fieldMap[fieldName];
    if (templateField) {
      return template.prefilled[templateField];
    }

    return null;
  }

  /**
   * Remove duplicate suggestions
   */
  private deduplicate(suggestions: Suggestion[]): Suggestion[] {
    const seen = new Set<string>();
    return suggestions.filter(s => {
      const key = s.value.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Industry knowledge base for suggestions
   */
  private getIndustryKnowledgeBase(): Record<string, any> {
    return {
      'Technology': {
        commonCustomers: [
          'Tech-savvy millennials (25-40 years old) in urban areas',
          'SMBs (50-500 employees) seeking digital transformation',
          'Enterprise IT departments (1000+ employees)',
          'Developers and technical teams',
        ],
        commonCompetitors: [
          'Established SaaS platforms ($50-150/user/month)',
          'Open-source alternatives (free, self-hosted)',
          'Legacy enterprise software (expensive, complex)',
          'Manual processes (spreadsheets, emails)',
        ],
        commonBusinessModels: [
          'SaaS subscription: Tiered pricing from $X to $Y per user/month',
          'Freemium: Free basic tier, paid premium features',
          'Usage-based: Pay per API call, transaction, or compute hour',
          'Enterprise licenses: Custom pricing with SLA and support',
        ],
        marketSize: 'TAM: $XB (Global market), SAM: $YB (Addressable segment), SOM: $ZM (Target capture)',
      },
      'Finance': {
        commonCustomers: [
          'SMBs and freelancers ($50K-$2M annual revenue)',
          'Financial advisors and wealth managers',
          'Enterprise finance departments',
          'Individual consumers (25-55 years old)',
        ],
        commonCompetitors: [
          'Traditional banks (slow, expensive)',
          'Incumbent fintech platforms (limited features)',
          'Manual accounting (error-prone, time-consuming)',
        ],
        commonBusinessModels: [
          'Transaction fees: X% per transaction or $Y per transfer',
          'Subscription: $X/month for unlimited transactions',
          'Interest/float: Revenue from deposits and lending',
        ],
        marketSize: 'TAM: $XB (Financial services market), SAM: $YB (Digital fintech), SOM: $ZM',
      },
      'Healthcare': {
        commonCustomers: [
          'Patients in underserved areas (rural, remote)',
          'Busy professionals seeking convenient care',
          'Chronic disease patients requiring regular monitoring',
          'Healthcare providers and hospital systems',
        ],
        commonCompetitors: [
          'Traditional in-person healthcare (slow, expensive)',
          'Telemedicine platforms ($50-100 per visit)',
          'Manual health tracking (ineffective)',
        ],
        commonBusinessModels: [
          'Per-visit fees: $X per consultation',
          'Subscription: $Y/month for unlimited access',
          'Insurance partnerships: Covered visits with copays',
        ],
        marketSize: 'TAM: $XB (Healthcare market), SAM: $YB (Digital health), SOM: $ZM',
      },
      'E-commerce': {
        commonCustomers: [
          'Online shoppers (25-45 years old, $40K+ income)',
          'Environmentally conscious consumers',
          'Urban millennials and Gen Z',
          'Gift buyers and special occasion shoppers',
        ],
        commonCompetitors: [
          'Amazon and major marketplaces (commoditized)',
          'DTC brands ($X price point)',
          'Traditional retail (limited selection)',
        ],
        commonBusinessModels: [
          'Direct-to-consumer: X% gross margin on product sales',
          'Marketplace: Y% commission on seller transactions',
          'Subscription boxes: $Z/month recurring revenue',
        ],
        marketSize: 'TAM: $XB (E-commerce market), SAM: $YB (Category), SOM: $ZM',
      },
    };
  }
}
