import { Injectable, Logger } from '@nestjs/common';
import { ContentAnalysisResult } from './content-analysis.service';

export interface StructuredSection {
  id: string;
  title: string;
  type: string; // summary, content, financial, chart, timeline, conclusion, references
  content: string;
  order: number;
  pageTemplate: string; // Which template to use
  metadata?: any;
}

export interface StructuredDocument {
  title: string;
  sections: StructuredSection[];
  totalPages: number;
  documentType: string;
  hasTableOfContents: boolean;
  hasCoverPage: boolean;
}

@Injectable()
export class ContentStructureService {
  private readonly logger = new Logger(ContentStructureService.name);

  /**
   * Convert raw content into structured sections based on analysis
   */
  async structureContent(
    rawContent: string,
    analysis: ContentAnalysisResult,
    userConfig?: any,
  ): Promise<StructuredDocument> {
    this.logger.log(`Structuring content for type: ${analysis.detectedType}`);

    // Step 1: Split content into logical sections
    const contentSections = this.splitIntoSections(rawContent, analysis);

    // Step 2: Generate additional sections if needed
    const sections: StructuredSection[] = [];
    let sectionOrder = 0;

    // Add cover page if configured
    if (userConfig?.includeCoverPage !== false) {
      const coverTitle = userConfig?.title || analysis.suggestedTitle;
      sections.push({
        id: `section-cover`,
        title: coverTitle,
        type: 'cover',
        content: this.generateCoverContent(coverTitle, rawContent),
        order: sectionOrder++,
        pageTemplate: 'CoverPage',
      });
    }

    // Add table of contents only if explicitly requested
    if (userConfig?.includeTableOfContents === true) {
      sections.push({
        id: `section-toc`,
        title: 'Table of Contents',
        type: 'toc',
        content: '', // Will be generated after all sections are known
        order: sectionOrder++,
        pageTemplate: 'TableOfContentsPage',
      });
    }

    // Add introduction if configured
    if (userConfig?.generateIntro) {
      sections.push({
        id: `section-intro`,
        title: 'Introduction',
        type: 'content',
        content: this.generateIntroduction(rawContent, analysis),
        order: sectionOrder++,
        pageTemplate: 'SectionPage',
      });
    }

    // Add executive summary if applicable
    if (userConfig?.generateSummary && ['business', 'report'].includes(analysis.detectedType)) {
      sections.push({
        id: `section-summary`,
        title: 'Executive Summary',
        type: 'summary',
        content: this.generateExecutiveSummary(rawContent, analysis),
        order: sectionOrder++,
        pageTemplate: 'SectionPage',
      });
    }

    // Add main content sections (split large sections into multiple pages)
    this.logger.log(`Splitting ${contentSections.length} sections into pages`);
    contentSections.forEach((section, index) => {
      const sectionWords = section.content.split(/\s+/).filter(w => w.trim()).length;
      const pages = this.splitSectionIntoPages(section);
      this.logger.log(`Section "${section.title}": ${sectionWords} words → ${pages.length} pages`);

      pages.forEach((page, pageIndex) => {
        sections.push({
          id: `section-${index}-${pageIndex}`,
          title: pageIndex === 0 ? section.title : `${section.title} (continued)`,
          type: section.type,
          content: page.content,
          order: sectionOrder++,
          pageTemplate: this.selectTemplate(section.type, page.content),
          metadata: section.metadata,
        });
      });
    });
    this.logger.log(`Total sections created: ${sections.length}`);

    // Add conclusion if configured
    if (userConfig?.generateConclusion) {
      sections.push({
        id: `section-conclusion`,
        title: 'Conclusion',
        type: 'conclusion',
        content: this.generateConclusion(rawContent, analysis),
        order: sectionOrder++,
        pageTemplate: 'ConclusionPage',
      });
    }

    // Calculate total pages (rough estimate)
    const totalPages = sections.reduce((total, section) => {
      return total + this.estimatePages(section.content);
    }, 0);

    const structuredDoc: StructuredDocument = {
      title: analysis.suggestedTitle,
      sections,
      totalPages,
      documentType: analysis.detectedType,
      hasTableOfContents: userConfig?.includeTableOfContents !== false,
      hasCoverPage: userConfig?.includeCoverPage !== false,
    };

    // Populate TOC content now that all sections are known
    const tocSection = sections.find(s => s.type === 'toc');
    if (tocSection) {
      const contentSections = sections.filter(s => s.type !== 'cover' && s.type !== 'toc');
      tocSection.content = contentSections
        .map((s, i) => `${i + 1}. ${s.title}`)
        .join('\n');
    }

    this.logger.log(
      `Created structured document with ${sections.length} sections, ~${totalPages} pages`,
    );

    return structuredDoc;
  }

  /**
   * Split raw content into logical sections
   */
  private splitIntoSections(
    content: string,
    analysis: ContentAnalysisResult,
  ): Array<{ title: string; type: string; content: string; metadata?: any }> {
    const sections: Array<{ title: string; type: string; content: string; metadata?: any }> = [];

    // If content has headings, use them as section boundaries
    if (analysis.hasHeadings) {
      return this.splitByHeadings(content);
    }

    // Otherwise, use the suggested section structure
    if (analysis.suggestedSections && analysis.suggestedSections.length > 0) {
      return this.splitBySuggestedStructure(content, analysis.suggestedSections);
    }

    // Fallback: split by paragraphs and group
    return this.splitByParagraphs(content);
  }

  /**
   * Split content by existing headings
   */
  private splitByHeadings(content: string): Array<{
    title: string;
    type: string;
    content: string;
  }> {
    const sections: Array<{ title: string; type: string; content: string }> = [];
    const lines = content.split('\n');

    let currentSection: { title: string; content: string[] } | null = null;

    lines.forEach((line) => {
      const trimmed = line.trim();

      // Check if line is a heading
      if (this.isHeading(trimmed)) {
        // Save previous section
        if (currentSection) {
          sections.push({
            title: currentSection.title,
            type: this.inferSectionType(currentSection.title),
            content: currentSection.content.join('\n').trim(),
          });
        }

        // Start new section
        currentSection = {
          title: this.extractHeadingText(trimmed),
          content: [],
        };
      } else if (currentSection && trimmed) {
        currentSection.content.push(line);
      }
    });

    // Add final section
    if (currentSection && currentSection.content.length > 0) {
      sections.push({
        title: currentSection.title,
        type: this.inferSectionType(currentSection.title),
        content: currentSection.content.join('\n').trim(),
      });
    }

    return sections;
  }

  /**
   * Check if line is a heading
   */
  private isHeading(line: string): boolean {
    return (
      /^#{1,6}\s+.+$/.test(line) || // Markdown heading
      /^[A-Z][^.!?]*:$/.test(line) || // Title case with colon
      /^\d+\.\s+[A-Z].+$/.test(line) // Numbered heading
    );
  }

  /**
   * Extract heading text
   */
  private extractHeadingText(heading: string): string {
    return heading
      .replace(/^#{1,6}\s+/, '') // Remove markdown
      .replace(/:$/, '') // Remove trailing colon
      .replace(/^\d+\.\s+/, '') // Remove numbering
      .trim();
  }

  /**
   * Split content by suggested structure
   */
  private splitBySuggestedStructure(
    content: string,
    suggestedSections: any[],
  ): Array<{ title: string; type: string; content: string }> {
    const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim());
    const sections: Array<{ title: string; type: string; content: string }> = [];

    const paragraphsPerSection = Math.ceil(
      paragraphs.length / suggestedSections.length,
    );

    suggestedSections.forEach((suggested, index) => {
      const start = index * paragraphsPerSection;
      const end = Math.min(start + paragraphsPerSection, paragraphs.length);
      const sectionContent = paragraphs.slice(start, end).join('\n\n');

      if (sectionContent.trim()) {
        sections.push({
          title: suggested.title,
          type: suggested.type,
          content: sectionContent,
        });
      }
    });

    return sections;
  }

  /**
   * Split content by paragraphs (fallback)
   * Creates sections with reasonable word counts
   */
  private splitByParagraphs(content: string): Array<{
    title: string;
    type: string;
    content: string;
  }> {
    const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim());
    const sections: Array<{ title: string; type: string; content: string }> = [];

    // Target: 800-1200 words per section (will be further split into pages later)
    const TARGET_WORDS_PER_SECTION = 1000;
    let currentSection: string[] = [];
    let currentWordCount = 0;
    let sectionNumber = 1;

    for (const paragraph of paragraphs) {
      const paragraphWords = paragraph.split(/\s+/).length;
      
      // If adding this paragraph would exceed target and we have content
      if (currentWordCount + paragraphWords > TARGET_WORDS_PER_SECTION && currentSection.length > 0) {
        // Save current section and start new one
        const sectionContent = currentSection.join('\n\n');
        sections.push({
          title: this.generateSectionTitle(currentSection[0], sectionNumber),
          type: 'content',
          content: sectionContent,
        });
        
        sectionNumber++;
        currentSection = [paragraph];
        currentWordCount = paragraphWords;
      } else {
        // Add paragraph to current section
        currentSection.push(paragraph);
        currentWordCount += paragraphWords;
      }
    }

    // Add remaining content as last section
    if (currentSection.length > 0) {
      const sectionContent = currentSection.join('\n\n');
      sections.push({
        title: this.generateSectionTitle(currentSection[0], sectionNumber),
        type: 'content',
        content: sectionContent,
      });
    }

    return sections;
  }

  /**
   * Generate section title from content
   */
  private generateSectionTitle(firstParagraph: string, sectionNumber: number): string {
    // Take first sentence and extract key words
    const firstSentence = firstParagraph.split(/[.!?]/)[0];
    const words = firstSentence
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 5);

    if (words.length >= 3) {
      return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    return `Section ${sectionNumber}`;
  }

  /**
   * Infer section type from title
   */
  private inferSectionType(title: string): string {
    const lowerTitle = title.toLowerCase();

    if (
      lowerTitle.includes('summary') ||
      lowerTitle.includes('abstract') ||
      lowerTitle.includes('overview')
    ) {
      return 'summary';
    }

    if (
      lowerTitle.includes('introduction') ||
      lowerTitle.includes('background') ||
      lowerTitle.includes('context')
    ) {
      return 'intro';
    }

    if (
      lowerTitle.includes('conclusion') ||
      lowerTitle.includes('closing') ||
      lowerTitle.includes('summary')
    ) {
      return 'conclusion';
    }

    if (
      lowerTitle.includes('financial') ||
      lowerTitle.includes('budget') ||
      lowerTitle.includes('revenue') ||
      lowerTitle.includes('cost')
    ) {
      return 'financial';
    }

    if (
      lowerTitle.includes('timeline') ||
      lowerTitle.includes('roadmap') ||
      lowerTitle.includes('schedule')
    ) {
      return 'timeline';
    }

    if (
      lowerTitle.includes('data') ||
      lowerTitle.includes('analysis') ||
      lowerTitle.includes('metrics')
    ) {
      return 'chart';
    }

    if (
      lowerTitle.includes('reference') ||
      lowerTitle.includes('bibliography') ||
      lowerTitle.includes('citation')
    ) {
      return 'references';
    }

    return 'content';
  }

  /**
   * Split large sections into page-sized chunks
   * Target: 500-800 words per page for readability
   */
  private splitSectionIntoPages(section: {
    title: string;
    type: string;
    content: string;
    metadata?: any;
  }): Array<{ content: string }> {
    const WORDS_PER_PAGE = 300; // Target words per page (aggressive splitting for better pagination)
    const MIN_WORDS_PER_PAGE = 200; // Minimum to avoid tiny pages
    const MAX_WORDS_PER_PAGE = 400; // Maximum before forced split (set to split 418-word content)
    
    const words = section.content.split(/\s+/).filter(w => w.trim());
    const totalWords = words.length;

    // If content is small enough for one page, return as-is
    if (totalWords <= MAX_WORDS_PER_PAGE) {
      return [{ content: section.content }];
    }

    // Try to split on paragraph boundaries first (double line breaks)
    let paragraphs = section.content.split(/\n\s*\n/).filter((p) => p.trim());

    // If no paragraphs (content is one big block), split on single line breaks
    if (paragraphs.length === 1) {
      paragraphs = section.content.split(/\n/).filter((p) => p.trim());
    }

    // If still one big block (no line breaks at all), split by sentences
    if (paragraphs.length === 1) {
      paragraphs = section.content.split(/\.\s+/).filter((s) => s.trim());
    }

    // If STILL one block, force split by word count
    if (paragraphs.length === 1 && totalWords > MAX_WORDS_PER_PAGE) {
      const allWords = section.content.split(/\s+/);
      const pages: Array<{ content: string }> = [];
      for (let i = 0; i < allWords.length; i += WORDS_PER_PAGE) {
        const chunk = allWords.slice(i, i + WORDS_PER_PAGE).join(' ');
        pages.push({ content: chunk });
      }
      return pages;
    }
    
    const pages: Array<{ content: string }> = [];
    let currentPage: string[] = [];
    let currentWordCount = 0;
    
    for (const paragraph of paragraphs) {
      const paragraphWords = paragraph.split(/\s+/).filter(w => w.trim()).length;
      
      // If this single paragraph is huge (>650 words), split it by word count
      if (paragraphWords > MAX_WORDS_PER_PAGE) {
        // Save current page if it has content
        if (currentPage.length > 0) {
          pages.push({ content: currentPage.join('\n\n') });
          currentPage = [];
          currentWordCount = 0;
        }
        
        // Split the huge paragraph by words
        const paraWords = paragraph.split(/\s+/);
        for (let i = 0; i < paraWords.length; i += WORDS_PER_PAGE) {
          const chunk = paraWords.slice(i, i + WORDS_PER_PAGE).join(' ');
          pages.push({ content: chunk });
        }
        continue;
      }
      
      // If adding this paragraph exceeds page limit and we have content
      if (currentWordCount + paragraphWords > WORDS_PER_PAGE && currentWordCount >= MIN_WORDS_PER_PAGE) {
        // Save current page and start new one
        pages.push({ content: currentPage.join('\n\n') });
        currentPage = [paragraph];
        currentWordCount = paragraphWords;
      } else {
        // Add paragraph to current page
        currentPage.push(paragraph);
        currentWordCount += paragraphWords;
      }
    }
    
    // Add remaining content as last page
    if (currentPage.length > 0) {
      pages.push({ content: currentPage.join('\n\n') });
    }
    
    this.logger.log(
      `Split section "${section.title}" (${totalWords} words) into ${pages.length} pages`,
    );
    
    return pages.length > 0 ? pages : [{ content: section.content }];
  }

  /**
   * Select appropriate template for section
   */
  private selectTemplate(type: string, content: string): string {
    const templateMap: Record<string, string> = {
      cover: 'CoverPage',
      toc: 'TableOfContentsPage',
      summary: 'SectionPage',
      intro: 'SectionPage',
      content: 'TextPage',
      financial: 'TablePage',
      chart: 'ChartPage',
      timeline: 'TimelinePage',
      conclusion: 'ConclusionPage',
      references: 'TextPage',
    };

    // Check if content suggests a specific template
    if (this.hasBullets(content) && this.hasMultipleColumns(content)) {
      return 'TwoColumnPage';
    }

    if (this.hasTable(content)) {
      return 'TablePage';
    }

    return templateMap[type] || 'TextPage';
  }

  private hasBullets(content: string): boolean {
    return /^[\s]*[-*•]\s+/m.test(content);
  }

  private hasMultipleColumns(content: string): boolean {
    // Detect if content is organized in columns (simplified check)
    return /\|\s+.+\s+\|/m.test(content);
  }

  private hasTable(content: string): boolean {
    return /\|.+\|/.test(content) || /\t.+\t/.test(content);
  }

  /**
   * Generate cover content as clean readable text (NOT JSON).
   * The editor and preview both render this as plain markdown.
   */
  private generateCoverContent(title: string, rawContent: string): string {
    const subtitle = this.extractSubtitle(rawContent);
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const lines = [`# ${title}`];
    if (subtitle) lines.push(subtitle);
    lines.push(date);
    return lines.join('\n\n');
  }

  private extractSubtitle(content: string): string {
    const lines = content.split('\n').filter((l) => l.trim());
    if (lines.length > 1) {
      return lines[1].trim().substring(0, 100);
    }
    return '';
  }

  /**
   * Generate introduction
   */
  private generateIntroduction(
    rawContent: string,
    analysis: ContentAnalysisResult,
  ): string {
    // Extract first paragraph as intro
    const paragraphs = rawContent.split(/\n\s*\n/).filter((p) => p.trim());

    if (paragraphs.length > 0) {
      return `This document provides ${analysis.detectedType === 'business' ? 'a comprehensive overview of the business opportunity and strategy' : 'an analysis and insights on the topic'}.\n\n${paragraphs[0]}`;
    }

    return `This document provides valuable insights and information on the topic at hand.`;
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(
    rawContent: string,
    analysis: ContentAnalysisResult,
  ): string {
    const paragraphs = rawContent.split(/\n\s*\n/).filter((p) => p.trim());

    // Extract key points from content
    const keyPoints: string[] = [];

    paragraphs.slice(0, 5).forEach((para) => {
      const sentences = para.split(/[.!?]+/).filter((s) => s.trim());
      if (sentences.length > 0) {
        keyPoints.push(sentences[0].trim());
      }
    });

    let summary = '**Executive Summary**\n\n';
    summary += 'Key highlights:\n\n';
    keyPoints.forEach((point, index) => {
      summary += `${index + 1}. ${point}\n`;
    });

    return summary;
  }

  /**
   * Generate conclusion
   */
  private generateConclusion(
    rawContent: string,
    analysis: ContentAnalysisResult,
  ): string {
    const paragraphs = rawContent.split(/\n\s*\n/).filter((p) => p.trim());

    // Use last paragraph or generate
    if (paragraphs.length > 0) {
      const lastPara = paragraphs[paragraphs.length - 1];
      return `**Conclusion**\n\n${lastPara}\n\nThis document has outlined ${analysis.detectedType === 'business' ? 'the key business opportunities and strategic approach' : 'the main findings and recommendations'}.`;
    }

    return `**Conclusion**\n\nThis document has provided a comprehensive overview of the subject matter, offering valuable insights and actionable recommendations.`;
  }

  /**
   * Estimate pages needed for content
   */
  private estimatePages(content: string): number {
    // Rough estimate: ~500 words per page
    const words = content.split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 500));
  }

  /**
   * Merge duplicate sections
   */
  mergeDuplicateSections(sections: StructuredSection[]): StructuredSection[] {
    const merged: StructuredSection[] = [];
    const seenTitles = new Set<string>();

    sections.forEach((section) => {
      // Never deduplicate structural pages — their content is not prose
      if (section.type === 'cover' || section.type === 'toc') {
        merged.push(section);
        return;
      }

      const normalizedTitle = section.title.toLowerCase().trim();

      if (!seenTitles.has(normalizedTitle)) {
        merged.push(section);
        seenTitles.add(normalizedTitle);
      } else {
        const existing = merged.find(
          (s) => s.title.toLowerCase().trim() === normalizedTitle,
        );
        if (existing) {
          existing.content += '\n\n' + section.content;
        }
      }
    });

    // Re-index order to close any gaps left by deduplication
    merged.forEach((s, i) => { s.order = i; });

    return merged;
  }

  /**
   * Remove redundancy — safe version.
   * Only removes sentences that are EXACTLY byte-identical (same casing, same spacing).
   * Cover and TOC sections are never touched.
   * NEVER removes sentences that merely sound similar.
   */
  removeRedundancy(sections: StructuredSection[]): StructuredSection[] {
    return sections.map((section) => {
      if (section.type === 'cover' || section.type === 'toc') {
        return section;
      }

      const sentenceMatches = section.content.match(/[^.!?]*[.!?]+/g);
      if (!sentenceMatches || sentenceMatches.length === 0) return section;

      const seen = new Set<string>();
      const kept: string[] = [];
      for (const sentence of sentenceMatches) {
        const key = sentence.trim();
        if (key && !seen.has(key)) {
          seen.add(key);
          kept.push(sentence);
        }
      }

      const result = kept.join('');
      return { ...section, content: result.trim() || section.content };
    });
  }
}
