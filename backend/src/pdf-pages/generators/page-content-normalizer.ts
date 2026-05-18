/**
 * PageContentNormalizer
 * Converts generated page content into a unified format with text and html fields
 * This ensures all pages can be properly displayed in preview, editor, and export
 */
export class PageContentNormalizer {
  /**
   * Normalize page content to include text field for consistent rendering
   */
  static normalize(content: any, title: string = '', pageType: string = ''): any {
    if (!content) return { text: '', html: '' };

    // If content already has a non-empty string text field, return as-is.
    // Do NOT short-circuit when content.text is a structured object — fall through
    // to the type-specific normalizer so the object gets properly flattened.
    if (typeof content.text === 'string' && content.text.trim()) {
      return content;
    }

    // Handle different content structures
    if (pageType === 'EXECUTIVE_SUMMARY') {
      return this.normalizeExecutiveSummary(content, title);
    }

    if (pageType === 'TABLE_OF_CONTENTS') {
      return this.normalizeTableOfContents(content, title);
    }

    if (pageType === 'COMPANY_OVERVIEW') {
      return this.normalizeCompanyOverview(content, title);
    }

    if (pageType === 'PROBLEM' || pageType === 'SOLUTION' || pageType === 'MARKET_ANALYSIS') {
      return this.normalizeContentPage(content, title);
    }

    // Generic normalization
    return this.normalizeGeneric(content, title);
  }

  private static normalizeExecutiveSummary(content: any, title: string): any {
    const parts: string[] = [];

    // Add overview text
    if (content.overview) {
      parts.push(content.overview);
    }

    // Add key points
    if (Array.isArray(content.keyPoints) && content.keyPoints.length > 0) {
      parts.push('Key Points:');
      parts.push(content.keyPoints.map((p: string) => `• ${p}`).join('\n'));
    }

    // Add highlights
    if (Array.isArray(content.highlights) && content.highlights.length > 0) {
      parts.push('Highlights:');
      parts.push(content.highlights.map((h: string) => `• ${h}`).join('\n'));
    }

    const text = parts.filter(p => p.trim()).join('\n\n');

    return {
      ...content,
      text: text || 'Executive Summary',
    };
  }

  private static normalizeTableOfContents(content: any, title: string): any {
    if (!content.sections) {
      return { ...content, text: 'Table of Contents' };
    }

    const entries = Array.isArray(content.sections) ? content.sections : [];
    const text = entries
      .map((entry: any) => {
        if (typeof entry === 'string') return entry;
        if (entry.section) return `${entry.section}${entry.pageNumber ? ` ........................ ${entry.pageNumber}` : ''}`;
        return '';
      })
      .filter((line: string) => line.trim())
      .join('\n');

    return {
      ...content,
      text: text || 'Table of Contents',
    };
  }

  private static normalizeCompanyOverview(content: any, title: string): any {
    if (!content.sections) {
      return { ...content, text: title || 'Company Overview' };
    }

    const sections = Array.isArray(content.sections) ? content.sections : [];
    const parts: string[] = [];

    for (const section of sections) {
      if (section.heading) {
        parts.push(`# ${section.heading}`);
      }
      if (section.content) {
        parts.push(section.content);
      }
      if (Array.isArray(section.bullets) && section.bullets.length > 0) {
        parts.push(section.bullets.map((b: string) => `• ${b}`).join('\n'));
      }
    }

    const text = parts.filter(p => p.trim()).join('\n\n') || 'Company Overview';

    return {
      ...content,
      text,
    };
  }

  private static normalizeContentPage(content: any, title: string): any {
    if (content.text) {
      return content;
    }

    const parts: string[] = [];

    if (content.sections && Array.isArray(content.sections)) {
      for (const section of content.sections) {
        if (section.heading) parts.push(`## ${section.heading}`);
        if (section.content) parts.push(section.content);
        if (Array.isArray(section.bullets) && section.bullets.length > 0) {
          parts.push(section.bullets.map((b: string) => `• ${b}`).join('\n'));
        }
      }
    }

    if (content.bullets && Array.isArray(content.bullets)) {
      parts.push(content.bullets.map((b: string) => `• ${b}`).join('\n'));
    }

    const text = parts.filter(p => p.trim()).join('\n\n') || title || 'Content';

    return {
      ...content,
      text,
    };
  }

  private static normalizeGeneric(content: any, title: string): any {
    // Try to find or create text content
    let text = content.text || content.content || content.body || content.description || '';

    if (!text && typeof content === 'object') {
      const parts: string[] = [];

      // Handle special structures
      if (Array.isArray(content.tables)) {
        for (const table of content.tables) {
          if (table.title) parts.push(`## ${table.title}`);
          if (Array.isArray(table.rows)) {
            const headers = table.rows.length > 0 ? Object.keys(table.rows[0]).join(' | ') : '';
            if (headers) parts.push(headers);
            for (const row of table.rows) {
              const values = Object.values(row).join(' | ');
              parts.push(String(values));
            }
          }
        }
      }

      if (Array.isArray(content.notes)) {
        parts.push(content.notes.map((n: any) => `• ${n}`).join('\n'));
      }

      if (content.steps && Array.isArray(content.steps)) {
        parts.push(content.steps.map((s: any, i: number) => `${i + 1}. ${s}`).join('\n'));
      }

      if (content.timeline && Array.isArray(content.timeline)) {
        parts.push(content.timeline.map((t: any) => `${t.phase || 'Phase'}: ${t.description || ''}`).join('\n'));
      }

      // Generic field extraction
      const fields = Object.keys(content)
        .filter(k => !['text', 'html', 'tables', 'notes', 'steps', 'timeline'].includes(k))
        .map(k => {
          const value = content[k];
          if (typeof value === 'string' && value.trim()) {
            return value;
          }
          if (Array.isArray(value) && value.length > 0) {
            return value.filter((v: any) => typeof v === 'string' && v.trim()).join('\n');
          }
          return '';
        })
        .filter((f: string) => f.trim());

      parts.push(...fields);
      text = parts.filter(p => p.trim()).join('\n\n');
    }

    return {
      ...content,
      text: text || title || 'Content',
    };
  }
}
