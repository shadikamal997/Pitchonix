import { Injectable, Logger } from '@nestjs/common';
import { ContentBlock } from './content-block-extractor.service';
import { DocumentOutline, OutlineSection } from './outline-builder.service';

export interface PlannedPage {
  sectionId: string;
  sectionTitle: string;
  pageTitle: string;
  sectionType: string;
  pageTemplate: string;
  blocks: ContentBlock[];
  contentText: string;
  wordCount: number;
  isContinuation: boolean;
  pageIndexInSection: number;
  globalOrder: number;
}

/**
 * RuleBasedPagePlannerService
 *
 * Converts a DocumentOutline into PlannedPage[].
 *
 * Rules (in priority order):
 * 1. NEVER silently discard content.
 * 2. Never split a heading from its following body block.
 * 3. Never split a bullet/numbered list unless it is individually oversized.
 * 4. Respect semantic density targets per section type.
 * 5. Avoid pages <20% or >90% capacity (except cover/TOC).
 * 6. Continuation pages share the parent section title — no "(continued)" spam in TOC.
 */
@Injectable()
export class RuleBasedPagePlannerService {
  private readonly logger = new Logger(RuleBasedPagePlannerService.name);

  // Ideal words-per-page by section type
  private readonly TARGETS: Record<string, number> = {
    cover:      0,
    toc:        0,
    summary:    320,
    intro:      360,
    content:    380,
    financial:  300,
    chart:      200,
    timeline:   300,
    conclusion: 320,
    references: 380,
  };
  private readonly MIN_WORDS = 120;
  private readonly MAX_WORDS = 500;

  planPages(
    outline: DocumentOutline,
    config: {
      includeCoverPage?: boolean;
      includeTableOfContents?: boolean;
      title?: string;
      semanticSections?: any[]; // NEW: Pass semantic sections for TOC
    },
  ): PlannedPage[] {
    const pages: PlannedPage[] = [];
    let order = 0;

    // ── Cover page ──────────────────────────────────────────────────────────
    if (config.includeCoverPage !== false) {
      pages.push(this.makeCoverPage(outline, config.title, order++));
    }

    // ── TOC placeholder ─────────────────────────────────────────────────────
    let tocIdx = -1;
    const tocSections = this.getMeaningfulTocSections(config.semanticSections || outline.sections);
    if (config.includeTableOfContents && tocSections.length >= 5) {
      // Only include TOC if it has enough meaningful, unique semantic entries.
      tocIdx = pages.length;
      pages.push(this.makeTOCPage(order++, tocSections));
    }

    // ── Content sections ────────────────────────────────────────────────────
    for (const section of outline.sections) {
      if (section.blocks.length === 0 && section.wordCount === 0) continue;
      const sectionPages = this.planSection(section, order);
      order += sectionPages.length;
      pages.push(...sectionPages);
    }

    // ── Populate TOC with non-continuation section titles ───────────────────
    if (tocIdx >= 0) {
      const entries = pages
        .filter(p => p.sectionType !== 'cover' && p.sectionType !== 'toc' && !p.isContinuation)
        .map((p) => `${p.sectionTitle} ..... ${p.globalOrder + 1}`);
      pages[tocIdx].contentText = entries.join('\n');
    }

    let validatedPages = this.validatePageQuality(pages);
    const validatedTocEntries = validatedPages.filter(
      p => p.sectionType !== 'cover' && p.sectionType !== 'toc' && !p.isContinuation,
    );
    if (tocIdx >= 0 && validatedTocEntries.length < 5) {
      validatedPages = validatedPages.filter(p => p.sectionType !== 'toc');
    }

    this.logger.log(
      `Page plan complete: ${validatedPages.length} pages from ${outline.sections.length} sections`,
    );

    return validatedPages.map((page, index) => ({ ...page, globalOrder: index }));
  }

  // ── Section → pages ────────────────────────────────────────────────────────

  private planSection(section: OutlineSection, startOrder: number): PlannedPage[] {
    if (!section.blocks.length) return [];

    const target = this.TARGETS[section.sectionType] ?? this.TARGETS.content;
    const pages: PlannedPage[] = [];
    let currentBlocks: ContentBlock[] = [];
    let currentWords = 0;
    let pageIdx = 0;

    const flush = () => {
      if (currentBlocks.length === 0) return;
      pages.push(this.makeContentPage(section, currentBlocks, pageIdx, startOrder + pages.length));
      pageIdx++;
      currentBlocks = [];
      currentWords = 0;
    };

    for (let i = 0; i < section.blocks.length; i++) {
      const block = section.blocks[i];
      if (block.type === 'separator') continue; // visual breaks don't take space

      const wouldExceed = currentWords + block.wordCount > target;
      const hasMin      = currentWords >= this.MIN_WORDS;

      // ── Hard split needed ──────────────────────────────────────────────────
      if (wouldExceed && hasMin) {
        // Rule: heading must stay with the next content block
        if (block.mustStayWithNext) {
          flush();
          // heading goes onto the NEW page
        } else if (block.mustStayWithPrevious && currentBlocks.length > 0) {
          // list / quote after heading — allow minor overflow rather than orphan it
          currentBlocks.push(block);
          currentWords += block.wordCount;
          continue;
        } else {
          flush();
        }
      }

      // ── Oversized single block ─────────────────────────────────────────────
      if (block.wordCount > this.MAX_WORDS) {
        flush(); // save whatever we had
        if (block.type === 'bullet_list' || block.type === 'numbered_list') {
          pages.push(...this.splitList(block, section, startOrder + pages.length, target, pageIdx));
          pageIdx += pages.length - pageIdx; // re-align
        } else {
          pages.push(...this.splitParagraph(block, section, startOrder + pages.length, target, pageIdx));
          pageIdx += pages.length - pageIdx;
        }
        continue;
      }

      currentBlocks.push(block);
      currentWords += block.wordCount;
    }

    flush();

    // Mark continuations (only pages 2+ in a section)
    pages.forEach((p, i) => { p.isContinuation = i > 0; });

    return pages;
  }

  /**
   * Final quality gate for generated pages.
   *
   * This validator is intentionally word-count based rather than pixel based.
   * The composition layer can change typography, but weak generated pages are
   * always visible in text distribution first: heading-only pages, metadata-only
   * pages, and early low-content pages.
   */
  validatePageQuality(pages: PlannedPage[]): PlannedPage[] {
    if (pages.length <= 1) return pages;

    const result: PlannedPage[] = [];

    for (const page of pages) {
      if (!this.isSpecialPage(page) && page.wordCount > this.MAX_WORDS) {
        result.push(...this.splitOverfilledPlannedPage(page));
        continue;
      }

      const last = result[result.length - 1];

      if (this.isSpecialPage(page)) {
        result.push(page);
        continue;
      }

      const shouldMerge =
        this.isHeadingOnly(page) ||
        this.isMetadataOnly(page) ||
        page.wordCount < this.MIN_WORDS;

      if (
        shouldMerge &&
        last &&
        !this.isSpecialPage(last) &&
        last.sectionId === page.sectionId &&
        last.wordCount + page.wordCount <= this.MAX_WORDS
      ) {
        result[result.length - 1] = this.mergePlannedPages(last, page);
        continue;
      }

      result.push(page);
    }

    // Pull from the next compatible content page when the beginning is weak.
    for (let i = 0; i < Math.min(4, result.length - 1); i++) {
      const page = result[i];
      const next = result[i + 1];
      if (
        !this.isSpecialPage(page) &&
        !this.isSpecialPage(next) &&
        (page.wordCount < this.MIN_WORDS || this.isHeadingOnly(page)) &&
        page.sectionId === next.sectionId &&
        page.wordCount + next.wordCount <= this.MAX_WORDS
      ) {
        result[i] = this.mergePlannedPages(page, next);
        result.splice(i + 1, 1);
        i--;
      }
    }

    return result.filter(page => {
      if (this.isSpecialPage(page)) return true;
      return page.wordCount > 0 && !this.isHeadingOnly(page);
    });
  }

  private splitOverfilledPlannedPage(page: PlannedPage): PlannedPage[] {
    const target = this.TARGETS[page.sectionType] ?? this.TARGETS.content;
    const chunks: ContentBlock[][] = [];
    let current: ContentBlock[] = [];
    let currentWords = 0;

    const flush = () => {
      if (!current.length) return;
      chunks.push(current);
      current = [];
      currentWords = 0;
    };

    for (const block of page.blocks) {
      if (block.wordCount > this.MAX_WORDS && block.type !== 'bullet_list' && block.type !== 'numbered_list') {
        flush();
        const sentences = block.cleanText.split(/(?<=[.!?])\s+/).filter(Boolean);
        let sentenceChunk: string[] = [];
        let sentenceWords = 0;
        for (const sentence of sentences) {
          const words = sentence.split(/\s+/).filter(Boolean).length;
          if (sentenceWords + words > target && sentenceChunk.length) {
            const text = sentenceChunk.join(' ');
            chunks.push([{ ...block, cleanText: text, rawText: text, wordCount: sentenceWords }]);
            sentenceChunk = [];
            sentenceWords = 0;
          }
          sentenceChunk.push(sentence);
          sentenceWords += words;
        }
        if (sentenceChunk.length) {
          const text = sentenceChunk.join(' ');
          chunks.push([{ ...block, cleanText: text, rawText: text, wordCount: sentenceWords }]);
        }
        continue;
      }

      if (currentWords + block.wordCount > target && current.length) flush();
      current.push(block);
      currentWords += block.wordCount;
    }

    flush();

    if (chunks.length > 1) {
      const last = chunks[chunks.length - 1];
      const previous = chunks[chunks.length - 2];
      const lastWords = this.countWords(this.renderBlocks(last));
      const previousWords = this.countWords(this.renderBlocks(previous));
      if (lastWords < this.MIN_WORDS && previousWords + lastWords <= this.MAX_WORDS) {
        chunks[chunks.length - 2] = [...previous, ...last];
        chunks.pop();
      }
    }

    return chunks.map((blocks, index) => ({
      ...page,
      blocks,
      contentText: this.renderBlocks(blocks),
      wordCount: this.countWords(this.renderBlocks(blocks)),
      isContinuation: page.isContinuation || index > 0,
      pageIndexInSection: page.pageIndexInSection + index,
      pageTemplate: this.selectTemplate(page.sectionType, blocks),
    }));
  }

  private isSpecialPage(page: PlannedPage): boolean {
    return page.sectionType === 'cover' || page.sectionType === 'toc';
  }

  private isHeadingOnly(page: PlannedPage): boolean {
    const contentBlocks = page.blocks.filter(b => b.type !== 'separator');
    return contentBlocks.length === 1 && ['title', 'heading', 'subheading'].includes(contentBlocks[0].type);
  }

  private isMetadataOnly(page: PlannedPage): boolean {
    if (page.wordCount > 80) return false;
    return /^(date|author|prepared|overview|table of contents|metadata)/i.test(page.contentText.trim());
  }

  private mergePlannedPages(page1: PlannedPage, page2: PlannedPage): PlannedPage {
    const blocks = [...page1.blocks, ...page2.blocks];
    return {
      ...page1,
      blocks,
      contentText: this.renderBlocks(blocks),
      wordCount: this.countWords(this.renderBlocks(blocks)),
      isContinuation: page1.isContinuation,
      pageTemplate: this.selectTemplate(page1.sectionType, blocks),
    };
  }

  private getMeaningfulTocSections(sections: any[]): any[] {
    const seen = new Set<string>();
    const blocked = new Set(['cover', 'table of contents', 'toc']);

    return sections.filter(section => {
      const rawTitle = String(section.title || section.sectionTitle || '').trim();
      const title = rawTitle.replace(/\s*\(continued\)\s*$/i, '');
      const key = title.toLowerCase();

      if (!title || blocked.has(key) || seen.has(key)) return false;
      if (/^(executive summary|key findings)$/i.test(title) && seen.has(key)) return false;

      seen.add(key);
      section.title = title;
      return true;
    });
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(Boolean).length;
  }

  // ── Block splitting ────────────────────────────────────────────────────────

  private splitList(
    block: ContentBlock,
    section: OutlineSection,
    startOrder: number,
    target: number,
    pageIdxStart: number,
  ): PlannedPage[] {
    const items = block.items ?? block.rawText.split('\n').map(l => l.replace(/^[-*•\d.)]\s*/, ''));
    const pages: PlannedPage[] = [];
    let current: string[] = [];
    let currentW = 0;
    let pIdx = pageIdxStart;

    const flushItems = () => {
      if (!current.length) return;
      const sub: ContentBlock = {
        ...block,
        id: `${block.id}-p${pIdx}`,
        items: current,
        rawText: current.map(i => `- ${i}`).join('\n'),
        cleanText: current.join('\n'),
        wordCount: currentW,
      };
      pages.push(this.makeContentPage(section, [sub], pIdx++, startOrder + pages.length));
      current = [];
      currentW = 0;
    };

    for (const item of items) {
      const w = item.split(/\s+/).length;
      if (currentW + w > target && current.length > 0) flushItems();
      current.push(item);
      currentW += w;
    }
    flushItems();
    return pages;
  }

  private splitParagraph(
    block: ContentBlock,
    section: OutlineSection,
    startOrder: number,
    target: number,
    pageIdxStart: number,
  ): PlannedPage[] {
    // Split on sentence boundaries
    const sentences = block.cleanText.split(/(?<=[.!?])\s+/).filter(s => s.trim());
    const pages: PlannedPage[] = [];
    let current: string[] = [];
    let currentW = 0;
    let pIdx = pageIdxStart;

    const flush = () => {
      if (!current.length) return;
      const text = current.join(' ');
      const sub: ContentBlock = { ...block, id: `${block.id}-p${pIdx}`, cleanText: text, rawText: text, wordCount: currentW };
      pages.push(this.makeContentPage(section, [sub], pIdx++, startOrder + pages.length));
      current = [];
      currentW = 0;
    };

    for (const sent of sentences) {
      const w = sent.split(/\s+/).length;
      if (currentW + w > target && current.length > 0) flush();
      current.push(sent);
      currentW += w;
    }
    flush();
    return pages;
  }

  // ── Page factories ─────────────────────────────────────────────────────────

  private makeCoverPage(outline: DocumentOutline, titleOverride: string | undefined, order: number): PlannedPage {
    const title    = titleOverride || outline.title;
    const subtitle = outline.sections.length > 0 ? outline.sections[0].title : '';
    const date     = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Build more substantial cover content
    const lines = [title];
    
    if (subtitle && subtitle !== title) {
      lines.push(subtitle);
    }
    
    // Add a brief overview line if available
    if (outline.sections.length > 1) {
      const sectionTitles = outline.sections.slice(0, 3).map(s => s.title).join(', ');
      lines.push(`Overview: ${sectionTitles}`);
    }
    
    lines.push(date);

    return {
      sectionId:          'cover',
      sectionTitle:       title,
      pageTitle:          title,
      sectionType:        'cover',
      pageTemplate:       'CoverPage',
      blocks:             [],
      contentText:        lines.join('\n\n'),
      wordCount:          lines.join(' ').split(/\s+/).length,
      isContinuation:     false,
      pageIndexInSection: 0,
      globalOrder:        order,
    };
  }

  private makeTOCPage(order: number, sections: any[]): PlannedPage {
    // Generate TOC content from sections
    const tocLines: string[] = ['# Table of Contents', ''];
    
    sections.forEach((section, index) => {
      if (section.title && section.title !== 'Cover' && section.title !== 'Table of Contents') {
        const pageNum = index + 2; // Approximate page numbers (after cover + TOC)
        tocLines.push(`${section.title} ..... ${pageNum}`);
      }
    });

    const contentText = tocLines.join('\n');

    return {
      sectionId:          'toc',
      sectionTitle:       'Table of Contents',
      pageTitle:          'Table of Contents',
      sectionType:        'toc',
      pageTemplate:       'TableOfContentsPage',
      blocks:             [],
      contentText,
      wordCount:          contentText.split(/\s+/).length,
      isContinuation:     false,
      pageIndexInSection: 0,
      globalOrder:        order,
    };
  }

  private makeContentPage(
    section: OutlineSection,
    blocks: ContentBlock[],
    pageIdx: number,
    order: number,
  ): PlannedPage {
    const contentText = this.renderBlocks(blocks);
    const wordCount   = this.countWords(contentText);

    return {
      sectionId:          section.id,
      sectionTitle:       section.title,
      pageTitle:          section.title,
      sectionType:        section.sectionType,
      pageTemplate:       this.selectTemplate(section.sectionType, blocks),
      blocks,
      contentText,
      wordCount,
      isContinuation:     pageIdx > 0,
      pageIndexInSection: pageIdx,
      globalOrder:        order,
    };
  }

  // ── Content renderer ───────────────────────────────────────────────────────

  renderBlocks(blocks: ContentBlock[]): string {
    return blocks
      .filter(b => b.type !== 'separator')
      .map(b => {
        switch (b.type) {
          case 'title':        return `# ${b.cleanText}`;
          case 'heading':      return `## ${b.cleanText}`;
          case 'subheading':   return `### ${b.cleanText}`;
          case 'bullet_list':
            return (b.items ?? b.rawText.split('\n'))
              .map(item => `- ${item.replace(/^[-*•]\s*/, '')}`)
              .join('\n');
          case 'numbered_list':
            return (b.items ?? b.rawText.split('\n'))
              .map((item, n) => `${n + 1}. ${item.replace(/^\d+[.)]\s*/, '')}`)
              .join('\n');
          case 'quote':      return `> ${b.cleanText}`;
          case 'table':      return b.rawText;
          case 'code_block': return `\`\`\`\n${b.rawText}\n\`\`\``;
          default:           return b.cleanText;
        }
      })
      .join('\n\n');
  }

  private selectTemplate(sectionType: string, blocks: ContentBlock[]): string {
    const hasTable   = blocks.some(b => b.type === 'table');
    const hasBullets = blocks.some(b => b.type === 'bullet_list' || b.type === 'numbered_list');

    if (hasTable) return 'TablePage';

    const map: Record<string, string> = {
      cover:      'CoverPage',
      toc:        'TableOfContentsPage',
      summary:    'SectionPage',
      intro:      'SectionPage',
      content:    hasBullets ? 'BulletPage' : 'TextPage',
      financial:  'TablePage',
      chart:      'ChartPage',
      timeline:   'TimelinePage',
      conclusion: 'ConclusionPage',
      references: 'TextPage',
    };

    return map[sectionType] ?? 'TextPage';
  }
}
