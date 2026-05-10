import { Injectable } from '@nestjs/common';

/**
 * ContentNormalizerService
 *
 * Converts HTML or raw text into clean, normalized plain text.
 * Preserves: markdown headings, bullets, numbered lists, tables,
 * blockquotes, URLs, dates, currencies, metrics, and code blocks.
 * NEVER removes content — only normalizes format.
 */
@Injectable()
export class ContentNormalizerService {
  normalize(rawInput: string): string {
    if (!rawInput || !rawInput.trim()) return '';

    const isHtml = /<[a-z][\s\S]*>/i.test(rawInput);
    const text = isHtml ? this.htmlToStructuredText(rawInput) : rawInput;
    return this.normalizeWhitespace(text);
  }

  private htmlToStructuredText(html: string): string {
    return html
      // Headings → markdown (preserve level)
      .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, t) => `\n# ${this.stripTags(t).trim()}\n`)
      .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, t) => `\n## ${this.stripTags(t).trim()}\n`)
      .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, t) => `\n### ${this.stripTags(t).trim()}\n`)
      .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, t) => `\n#### ${this.stripTags(t).trim()}\n`)
      .replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, (_, t) => `\n##### ${this.stripTags(t).trim()}\n`)
      .replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, (_, t) => `\n###### ${this.stripTags(t).trim()}\n`)
      // Bold / italic → markdown (keeps emphasis, helps analysis)
      .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**')
      .replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '_$2_')
      // Blockquotes
      .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, t) => `\n> ${this.stripTags(t).trim()}\n`)
      // Code blocks
      .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, t) => `\n\`\`\`\n${this.decodeEntities(t)}\n\`\`\`\n`)
      .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
      // Paragraphs → double newline
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      // List items → markdown bullets / numbers
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, t) => `- ${this.stripTags(t).trim()}\n`)
      .replace(/<\/[uo]l>/gi, '\n')
      .replace(/<[uo]l[^>]*>/gi, '')
      // Horizontal rule
      .replace(/<hr\s*\/?>/gi, '\n---\n')
      // Table cells (simplified — preserve as text)
      .replace(/<\/th>/gi, ' | ')
      .replace(/<\/td>/gi, ' | ')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<t[dh][^>]*>/gi, '')
      .replace(/<\/?t(able|head|body|foot|r)[^>]*>/gi, '\n')
      // Links: keep display text + URL
      .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
        const t = this.stripTags(text).trim();
        return t && href !== t ? `${t} (${href})` : t || href;
      })
      // Line breaks
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      // Strip remaining HTML tags
      .replace(/<[^>]+>/g, '')
      // Decode entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
      .replace(/&[a-z]+;/gi, ' ');
  }

  private normalizeWhitespace(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove trailing spaces per line (but keep indentation for lists)
      .replace(/[ \t]+$/gm, '')
      // Collapse horizontal whitespace (NOT newlines) to single space
      .replace(/[ \t]{2,}/g, ' ')
      // Collapse 3+ blank lines to 2
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private stripTags(html: string): string {
    return html
      .replace(/<[^>]+>/g, '')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  private decodeEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  /** Return plain text without any markdown/formatting markers. */
  toPlainText(normalizedText: string): string {
    return normalizedText
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/[*_`~]/g, '')
      .replace(/^\s*[-*•]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/^\s*>\s+/gm, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }
}
