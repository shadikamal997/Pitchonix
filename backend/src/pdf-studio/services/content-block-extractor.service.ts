import { Injectable } from '@nestjs/common';

export type BlockType =
  | 'title'
  | 'heading'
  | 'subheading'
  | 'paragraph'
  | 'bullet_list'
  | 'numbered_list'
  | 'metric'
  | 'quote'
  | 'table'
  | 'code_block'
  | 'separator'
  | 'cta'
  | 'contact_info';

export interface ContentBlock {
  id: string;
  type: BlockType;
  rawText: string;
  cleanText: string;
  level?: number;
  items?: string[];
  sourceIndex: number;
  wordCount: number;
  importanceScore: number;
  semanticRole: string;
  mustStayWithNext: boolean;
  mustStayWithPrevious: boolean;
}

/**
 * ContentBlockExtractorService
 *
 * Parses normalized plain text (with markdown) into typed content blocks.
 * NEVER discards content — every input line ends up in exactly one block.
 */
@Injectable()
export class ContentBlockExtractorService {
  extract(normalizedText: string): ContentBlock[] {
    if (!normalizedText?.trim()) return [];

    const blocks: ContentBlock[] = [];
    const lines = normalizedText.split('\n');
    let i = 0;
    let idx = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // ── blank line ─────────────────────────────────────────────────────────
      if (!trimmed) { i++; continue; }

      // ── fenced code block ──────────────────────────────────────────────────
      if (trimmed.startsWith('```')) {
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // closing ```
        blocks.push(this.make(idx++, 'code_block', codeLines.join('\n'), {}));
        continue;
      }

      // ── horizontal rule ────────────────────────────────────────────────────
      if (/^([-*_]){3,}$/.test(trimmed)) {
        blocks.push(this.make(idx++, 'separator', '---', {}));
        i++;
        continue;
      }

      // ── markdown heading ───────────────────────────────────────────────────
      const mdHeading = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (mdHeading) {
        const level = mdHeading[1].length;
        const text = mdHeading[2].trim();
        const type: BlockType =
          level === 1 ? 'title' : level === 2 ? 'heading' : 'subheading';
        blocks.push(this.make(idx++, type, text, { level, mustStayWithNext: true }));
        i++;
        continue;
      }

      // ── uppercase / title-case heading line ────────────────────────────────
      // Detect standalone lines that look like headings throughout the document
      if (
        trimmed.length >= 3 &&
        trimmed.length <= 90 &&
        !trimmed.endsWith('.') &&
        !trimmed.endsWith(',') &&
        !trimmed.endsWith(';') &&
        !trimmed.endsWith('?') &&
        !trimmed.endsWith('!') &&
        /^[A-Z]/.test(trimmed) &&
        !/^[-*•]\s/.test(trimmed) &&
        !/^\d+[.)]\s/.test(trimmed) &&
        !trimmed.includes('|') &&
        (
          /^[A-Z][A-Z\s:,&()\-/]+$/.test(trimmed) || // ALL CAPS (e.g., "EXECUTIVE SUMMARY")
          (blocks.length === 0 && !trimmed.includes(' ') === false) || // First non-blank line
          (
            // Title Case or standalone short line (e.g., "Problem Statement", "Our Solution")
            trimmed.length <= 60 &&
            /^[A-Z][a-z]/.test(trimmed) && // Starts with capital letter followed by lowercase
            trimmed.split(/\s+/).length <= 6 && // Max 6 words
            !trimmed.match(/\b(is|are|was|were|has|have|had|will|would|can|could|should|the|a|an|and|or|but|in|on|at|to|for|of|with)\b/i) // Not a sentence (no common verbs/articles at start)
          )
        )
      ) {
        const type: BlockType = blocks.length === 0 ? 'title' : 'heading';
        blocks.push(this.make(idx++, type, trimmed, { mustStayWithNext: true }));
        i++;
        continue;
      }

      // ── blockquote ─────────────────────────────────────────────────────────
      if (trimmed.startsWith('> ') || trimmed === '>') {
        const quoteLines: string[] = [trimmed.replace(/^>\s*/, '')];
        i++;
        while (i < lines.length && (lines[i].trim().startsWith('> ') || lines[i].trim() === '>')) {
          quoteLines.push(lines[i].trim().replace(/^>\s*/, ''));
          i++;
        }
        blocks.push(this.make(idx++, 'quote', quoteLines.join('\n'), { mustStayWithPrevious: true }));
        continue;
      }

      // ── bullet list ────────────────────────────────────────────────────────
      if (/^[-*•]\s+/.test(trimmed)) {
        const items: string[] = [trimmed.replace(/^[-*•]\s+/, '')];
        i++;
        while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
          items.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
          i++;
        }
        const block = this.make(idx++, 'bullet_list', items.join('\n'), { mustStayWithPrevious: true });
        block.items = items;
        blocks.push(block);
        continue;
      }

      // ── numbered list ──────────────────────────────────────────────────────
      if (/^\d+[.)]\s+/.test(trimmed)) {
        const items: string[] = [trimmed.replace(/^\d+[.)]\s+/, '')];
        i++;
        while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
          items.push(lines[i].trim().replace(/^\d+[.)]\s+/, ''));
          i++;
        }
        const block = this.make(idx++, 'numbered_list', items.join('\n'), { mustStayWithPrevious: true });
        block.items = items;
        blocks.push(block);
        continue;
      }

      // ── table ──────────────────────────────────────────────────────────────
      if (trimmed.includes('|') && trimmed.startsWith('|')) {
        const tableLines: string[] = [trimmed];
        i++;
        while (i < lines.length && lines[i].trim().includes('|') && lines[i].trim().startsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }
        blocks.push(this.make(idx++, 'table', tableLines.join('\n'), {}));
        continue;
      }

      // ── paragraph (accumulate multi-line) ─────────────────────────────────
      const paraLines: string[] = [trimmed];
      i++;
      while (
        i < lines.length &&
        lines[i].trim() &&
        !this.isBlockBoundary(lines[i].trim())
      ) {
        paraLines.push(lines[i].trim());
        i++;
      }
      const paraText = paraLines.join(' ');

      // Classify paragraph
      const type = this.classifyParagraph(paraText);
      blocks.push(this.make(idx++, type, paraText, {}));
    }

    // Score importance
    const total = blocks.length;
    blocks.forEach((b, pos) => {
      b.importanceScore = this.scoreImportance(b, pos, total);
    });

    return blocks;
  }

  // ── private helpers ──────────────────────────────────────────────────────

  private make(
    index: number,
    type: BlockType,
    text: string,
    opts: { level?: number; mustStayWithNext?: boolean; mustStayWithPrevious?: boolean },
  ): ContentBlock {
    const cleanText = text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^>\s+/gm, '')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      id: `block-${index}`,
      type,
      rawText: text,
      cleanText,
      level: opts.level,
      items: undefined,
      sourceIndex: index,
      wordCount: cleanText.split(/\s+/).filter(Boolean).length,
      importanceScore: 50,
      semanticRole: this.semanticRole(type),
      mustStayWithNext: opts.mustStayWithNext ?? false,
      mustStayWithPrevious: opts.mustStayWithPrevious ?? false,
    };
  }

  private classifyParagraph(text: string): BlockType {
    if (this.isContactInfo(text)) return 'contact_info';
    if (this.isCTA(text)) return 'cta';
    if (this.isMetricHeavy(text)) return 'metric';
    return 'paragraph';
  }

  private isMetricHeavy(text: string): boolean {
    const patterns = [/\$[\d,]+[KMB]?/, /\d+%/, /\d+[KMB]\b/, /\bROI\b/, /\bARR\b/, /\bMRR\b/, /\bCAGR\b/];
    const hits = patterns.filter(p => p.test(text)).length;
    return hits >= 2 && text.split(/\s+/).length < 60;
  }

  private isCTA(text: string): boolean {
    return /\b(contact us|get started|sign up|learn more|schedule a|book a|register now|apply now|join us|subscribe)\b/i.test(text);
  }

  private isContactInfo(text: string): boolean {
    const hasEmail = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(text);
    const hasPhone = /\+?[\d\s\-().]{10,}/.test(text);
    return hasEmail || (hasPhone && text.split(/\s+/).length < 20);
  }

  private isBlockBoundary(line: string): boolean {
    return (
      /^#{1,6}\s+/.test(line) ||
      /^[-*•]\s+/.test(line) ||
      /^\d+[.)]\s+/.test(line) ||
      /^>\s?/.test(line) ||
      line.startsWith('```') ||
      /^([-*_]){3,}$/.test(line) ||
      (line.startsWith('|') && line.includes('|'))
    );
  }

  private scoreImportance(block: ContentBlock, pos: number, total: number): number {
    let score = 50;

    // Position: beginning and end are important
    const relPos = pos / Math.max(1, total - 1);
    if (relPos < 0.1 || relPos > 0.9) score += 15;

    // Type bonuses
    switch (block.type) {
      case 'title':        score += 45; break;
      case 'heading':      score += 30; break;
      case 'subheading':   score += 18; break;
      case 'metric':       score += 25; break;
      case 'cta':          score += 18; break;
      case 'quote':        score += 10; break;
      case 'table':        score += 20; break;
      case 'separator':    score  = 5;  break;
      case 'contact_info': score += 15; break;
    }

    // Contains data → important
    if (/\d+%|\$[\d,]+|\d+[KMB]/.test(block.rawText)) score += 15;
    if (/\b(critical|key|important|essential|must|core|primary)\b/i.test(block.rawText)) score += 8;

    // Short blocks are usually less important (unless heading)
    if (block.wordCount < 5 && !['title', 'heading', 'subheading'].includes(block.type)) score -= 20;

    return Math.max(0, Math.min(100, score));
  }

  private semanticRole(type: BlockType): string {
    const map: Record<BlockType, string> = {
      title:        'document_title',
      heading:      'section_heading',
      subheading:   'subsection_heading',
      paragraph:    'body_text',
      bullet_list:  'enumeration',
      numbered_list:'ordered_steps',
      metric:       'data_point',
      quote:        'emphasis',
      table:        'tabular_data',
      code_block:   'technical_content',
      separator:    'visual_break',
      cta:          'call_to_action',
      contact_info: 'contact',
    };
    return map[type] ?? 'unknown';
  }
}
