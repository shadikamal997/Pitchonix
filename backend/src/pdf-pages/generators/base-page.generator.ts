import { Logger } from '@nestjs/common';
import { WizardInput } from '../../generation/slide-types/types';

export interface PageContent {
  pageNumber: number;
  type: string;
  title?: string;
  subtitle?: string;
  content: any;
  layout: 'cover' | 'content' | 'two-column' | 'chart' | 'table' | 'timeline';
  backgroundColor?: string;
  textColor?: string;
}

export abstract class BasePageGenerator {
  protected readonly logger = new Logger(BasePageGenerator.name);
  abstract readonly type: string;
  abstract readonly layout: 'cover' | 'content' | 'two-column' | 'chart' | 'table' | 'timeline';

  /**
   * Generate page content from wizard input
   */
  abstract generate(input: WizardInput, pageNumber: number): PageContent;

  /**
   * Validate that required input data exists
   */
  protected validateInput(input: WizardInput, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (!input[field]) {
        this.logger.warn(`Missing required field for ${this.type}: ${field}`);
      }
    }
  }

  /**
   * Create base page structure
   */
  protected createBasePage(pageNumber: number, type: string, layout: PageContent['layout']): PageContent {
    return {
      pageNumber,
      type,
      layout,
      content: {},
    };
  }

  /**
   * Format bullet points for PDF rendering
   */
  protected formatBulletPoints(items: string[]): string[] {
    return items.filter(item => item && item.trim().length > 0);
  }

  /**
   * Truncate text to max length
   */
  protected truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}
