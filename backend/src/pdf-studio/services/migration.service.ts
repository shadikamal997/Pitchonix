import { Injectable, Logger } from '@nestjs/common';
import {
  Block,
  BlockDocument,
  LegacyDocument,
  LegacyPage,
  BlockType,
  BlockContent,
} from '../types/block-document.types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Migration Service
 *
 * Handles migration from v1 (page-based) documents to v2 (block-based) documents.
 * Ensures backward compatibility while enabling new block features.
 */
@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  /**
   * Main migration function: converts v1 document to v2 BlockDocument
   */
  async migrateDocumentToV2(document: LegacyDocument): Promise<BlockDocument> {
    // Check if already v2
    if (document.metadata?.version === '2.0') {
      this.logger.log(`Document ${document.id} is already v2.0, skipping migration`);
      return document as unknown as BlockDocument;
    }

    this.logger.log(`Migrating document ${document.id} from v1 to v2...`);

    const blocks: Block[] = [];
    let currentOrder = 0;

    // Convert each page to blocks
    if (document.pages && Array.isArray(document.pages)) {
      for (const page of document.pages) {
        const pageBlocks = await this.convertPageToBlocks(page, currentOrder);
        blocks.push(...pageBlocks);
        currentOrder += pageBlocks.length;
      }
    }

    const blockDocument: BlockDocument = {
      version: '2.0',
      blocks,
      metadata: {
        documentId: document.id,
        templateId: document.pages?.[0]?.templateId,
        brandKitId: document.brandKitId,
        title: document.title,
        description: document.metadata?.description,
        author: document.metadata?.author,
        lastModified: new Date().toISOString(),
        createdAt:
          typeof document.createdAt === 'string'
            ? document.createdAt
            : document.createdAt.toISOString(),
        tags: document.metadata?.tags || [],
        customData: {
          migratedFrom: 'v1',
          migrationDate: new Date().toISOString(),
          originalDocumentType: document.documentType,
          originalPageCount: document.pages?.length || 0,
        },
      },
    };

    this.logger.log(
      `Migration complete: ${blocks.length} blocks created from ${document.pages?.length || 0} pages`
    );

    return blockDocument;
  }

  /**
   * Convert a single v1 page to v2 blocks
   */
  private async convertPageToBlocks(
    page: LegacyPage,
    startingOrder: number
  ): Promise<Block[]> {
    const blocks: Block[] = [];
    let order = startingOrder;

    try {
      // Handle different page types
      switch (page.pageType) {
        case 'cover':
        case 'title':
          blocks.push(...this.convertCoverPage(page, order));
          break;

        case 'timeline':
          blocks.push(this.convertTimelinePage(page, order));
          break;

        case 'swot':
          blocks.push(this.convertSwotPage(page, order));
          break;

        case 'team':
          blocks.push(this.convertTeamPage(page, order));
          break;

        case 'kpi':
        case 'metrics':
          blocks.push(this.convertKpiPage(page, order));
          break;

        case 'testimonial':
          blocks.push(this.convertTestimonialPage(page, order));
          break;

        case 'features':
        case 'feature-grid':
          blocks.push(this.convertFeatureGridPage(page, order));
          break;

        case 'comparison':
          blocks.push(this.convertComparisonPage(page, order));
          break;

        case 'content':
        case 'text':
        default:
          blocks.push(...this.convertContentPage(page, order));
          break;
      }
    } catch (error) {
      this.logger.error(`Error converting page ${page.id}: ${error.message}`);
      // Fallback: create a basic paragraph block with page title
      blocks.push({
        id: uuidv4(),
        type: 'paragraph',
        order,
        content: { text: page.title || 'Untitled', html: `<p>${page.title || 'Untitled'}</p>` },
      });
    }

    return blocks;
  }

  /**
   * Convert cover/title page to blocks
   */
  private convertCoverPage(page: LegacyPage, order: number): Block[] {
    const blocks: Block[] = [];

    // Title as heading-1
    blocks.push({
      id: uuidv4(),
      type: 'heading-1',
      order: order++,
      content: { text: page.title || 'Untitled', html: `<h1>${page.title || 'Untitled'}</h1>` },
      config: { alignment: 'center', fontSize: 48, fontWeight: 700 },
    });

    // Subtitle if present
    if (page.content?.subtitle) {
      blocks.push({
        id: uuidv4(),
        type: 'heading-2',
        order: order++,
        content: { text: page.content.subtitle, html: `<h2>${page.content.subtitle}</h2>` },
        config: { alignment: 'center', fontSize: 24, fontWeight: 400 },
      });
    }

    // Description if present
    if (page.content?.description || page.content?.text) {
      const text = page.content.description || page.content.text;
      blocks.push({
        id: uuidv4(),
        type: 'paragraph',
        order: order++,
        content: { text, html: `<p>${text}</p>` },
        config: { alignment: 'center' },
      });
    }

    return blocks;
  }

  /**
   * Convert timeline page to timeline block
   */
  private convertTimelinePage(page: LegacyPage, order: number): Block {
    const events =
      page.content?.events?.map((event: any) => ({
        id: event.id || uuidv4(),
        date: event.date || event.year || '',
        title: event.title || event.milestone || '',
        description: event.description || '',
        color: event.color,
      })) || [];

    return {
      id: uuidv4(),
      type: 'timeline',
      order,
      content: { events },
    };
  }

  /**
   * Convert SWOT page to SWOT block
   */
  private convertSwotPage(page: LegacyPage, order: number): Block {
    return {
      id: uuidv4(),
      type: 'swot',
      order,
      content: {
        strengths: page.content?.strengths || [],
        weaknesses: page.content?.weaknesses || [],
        opportunities: page.content?.opportunities || [],
        threats: page.content?.threats || [],
      },
    };
  }

  /**
   * Convert team page to team-members block
   */
  private convertTeamPage(page: LegacyPage, order: number): Block {
    const members =
      page.content?.members?.map((member: any) => ({
        id: member.id || uuidv4(),
        name: member.name || '',
        role: member.role || member.title || '',
        bio: member.bio || member.description || '',
        image: member.image || member.avatar || member.photo,
        social: {
          linkedin: member.linkedin,
          twitter: member.twitter,
          email: member.email,
        },
      })) || [];

    return {
      id: uuidv4(),
      type: 'team-members',
      order,
      content: { members },
    };
  }

  /**
   * Convert KPI/metrics page to kpi-cards block
   */
  private convertKpiPage(page: LegacyPage, order: number): Block {
    const cards =
      page.content?.kpis?.map((kpi: any) => ({
        id: kpi.id || uuidv4(),
        title: kpi.title || kpi.label || '',
        value: kpi.value || kpi.metric || '',
        change: kpi.change || kpi.delta,
        trend: kpi.trend || (kpi.change?.startsWith('+') ? 'up' : kpi.change?.startsWith('-') ? 'down' : 'neutral'),
        icon: kpi.icon,
      })) ||
      page.content?.metrics?.map((metric: any) => ({
        id: metric.id || uuidv4(),
        title: metric.title || metric.label || '',
        value: metric.value || '',
        change: metric.change,
        trend: metric.trend,
        icon: metric.icon,
      })) ||
      [];

    return {
      id: uuidv4(),
      type: 'kpi-cards',
      order,
      content: { cards },
    };
  }

  /**
   * Convert testimonial page to testimonial block
   */
  private convertTestimonialPage(page: LegacyPage, order: number): Block {
    return {
      id: uuidv4(),
      type: 'testimonial',
      order,
      content: {
        quote: page.content?.quote || page.content?.text || '',
        author: page.content?.author || page.content?.name || '',
        role: page.content?.role || page.content?.title || '',
        company: page.content?.company || page.content?.organization || '',
        avatar: page.content?.avatar || page.content?.image,
        rating: page.content?.rating,
      },
    };
  }

  /**
   * Convert feature grid page to feature-grid block
   */
  private convertFeatureGridPage(page: LegacyPage, order: number): Block {
    const features =
      page.content?.features?.map((feature: any) => ({
        id: feature.id || uuidv4(),
        icon: feature.icon,
        title: feature.title || feature.name || '',
        description: feature.description || feature.text || '',
      })) || [];

    return {
      id: uuidv4(),
      type: 'feature-grid',
      order,
      content: { features },
    };
  }

  /**
   * Convert comparison page to comparison-table block
   */
  private convertComparisonPage(page: LegacyPage, order: number): Block {
    return {
      id: uuidv4(),
      type: 'comparison-table',
      order,
      content: {
        headers: page.content?.headers || [],
        rows:
          page.content?.rows?.map((row: any) => ({
            id: row.id || uuidv4(),
            label: row.label || row.name || '',
            values: row.values || row.data || [],
          })) || [],
      },
    };
  }

  /**
   * Convert generic content page to text blocks
   */
  private convertContentPage(page: LegacyPage, order: number): Block[] {
    const blocks: Block[] = [];
    let currentOrder = order;

    // Page title as heading-2
    if (page.title) {
      blocks.push({
        id: uuidv4(),
        type: 'heading-2',
        order: currentOrder++,
        content: { text: page.title, html: `<h2>${page.title}</h2>` },
      });
    }

    // Handle different content structures
    if (page.content?.sections && Array.isArray(page.content.sections)) {
      // Convert sections to heading + paragraph blocks
      for (const section of page.content.sections) {
        if (section.heading) {
          blocks.push({
            id: uuidv4(),
            type: 'heading-3',
            order: currentOrder++,
            content: { text: section.heading, html: `<h3>${section.heading}</h3>` },
          });
        }
        if (section.content || section.text) {
          const text = section.content || section.text;
          blocks.push({
            id: uuidv4(),
            type: 'paragraph',
            order: currentOrder++,
            content: { text, html: `<p>${text}</p>` },
          });
        }
      }
    } else if (page.content?.text || page.content?.body) {
      // Single text content
      const text = page.content.text || page.content.body;
      blocks.push({
        id: uuidv4(),
        type: 'paragraph',
        order: currentOrder++,
        content: { text, html: `<p>${text}</p>` },
      });
    } else if (page.content?.html) {
      // HTML content - parse and convert
      blocks.push(...this.parseHtmlToBlocks(page.content.html, currentOrder));
    } else {
      // Fallback: empty paragraph
      blocks.push({
        id: uuidv4(),
        type: 'paragraph',
        order: currentOrder++,
        content: { text: '', html: '<p></p>' },
      });
    }

    return blocks;
  }

  /**
   * Parse HTML content and convert to blocks (simplified)
   */
  private parseHtmlToBlocks(html: string, startingOrder: number): Block[] {
    const blocks: Block[] = [];
    let order = startingOrder;

    // Simple regex-based HTML parsing (could be improved with proper HTML parser)
    const headingRegex = /<h([1-6])>(.*?)<\/h\1>/gi;
    const paragraphRegex = /<p>(.*?)<\/p>/gi;

    let match: RegExpExecArray | null;

    // Extract headings
    while ((match = headingRegex.exec(html)) !== null) {
      const level = match[1];
      const text = match[2].replace(/<[^>]*>/g, ''); // strip inner HTML tags
      blocks.push({
        id: uuidv4(),
        type: `heading-${level}` as BlockType,
        order: order++,
        content: { text, html: match[0] },
      });
    }

    // Extract paragraphs
    while ((match = paragraphRegex.exec(html)) !== null) {
      const text = match[1].replace(/<[^>]*>/g, '');
      if (text.trim()) {
        blocks.push({
          id: uuidv4(),
          type: 'paragraph',
          order: order++,
          content: { text, html: match[0] },
        });
      }
    }

    // If no blocks were extracted, create a single paragraph with stripped HTML
    if (blocks.length === 0) {
      const text = html.replace(/<[^>]*>/g, '').trim();
      if (text) {
        blocks.push({
          id: uuidv4(),
          type: 'paragraph',
          order: order++,
          content: { text, html: `<p>${text}</p>` },
        });
      }
    }

    return blocks;
  }

  /**
   * Check if document needs migration
   */
  needsMigration(document: LegacyDocument): boolean {
    return document.metadata?.version !== '2.0';
  }

  /**
   * Validate block document structure
   */
  validateBlockDocument(document: BlockDocument): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (document.version !== '2.0') {
      errors.push('Invalid version: must be "2.0"');
    }

    if (!Array.isArray(document.blocks)) {
      errors.push('Blocks must be an array');
    }

    if (!document.metadata) {
      errors.push('Metadata is required');
    }

    if (!document.metadata?.lastModified) {
      errors.push('metadata.lastModified is required');
    }

    // Validate each block
    document.blocks?.forEach((block, index) => {
      if (!block.id) {
        errors.push(`Block ${index}: id is required`);
      }
      if (!block.type) {
        errors.push(`Block ${index}: type is required`);
      }
      if (block.order === undefined) {
        errors.push(`Block ${index}: order is required`);
      }
      if (!block.content) {
        errors.push(`Block ${index}: content is required`);
      }
    });

    return { valid: errors.length === 0, errors };
  }
}
