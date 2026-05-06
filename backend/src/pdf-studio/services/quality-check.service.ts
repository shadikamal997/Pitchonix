import { Injectable, Logger } from '@nestjs/common';

export interface QualityCheckResult {
  overallScore: number;
  grade: string;
  scores: {
    structureClarity: number;
    grammarQuality: number;
    readability: number;
    logicalFlow: number;
    completeness: number;
  };
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    category: string;
    message: string;
    location?: string;
  }>;
  suggestions: Array<{
    priority: 'high' | 'medium' | 'low';
    message: string;
    actionable: boolean;
  }>;
  validationPassed: boolean;
}

@Injectable()
export class QualityCheckService {
  private readonly logger = new Logger(QualityCheckService.name);

  /**
   * Perform comprehensive quality check on document
   */
  async checkQuality(document: {
    title: string;
    pages: Array<{ title?: string; content: any; pageType: string }>;
  }): Promise<QualityCheckResult> {
    this.logger.log(`Checking quality for document: ${document.title}`);

    const issues: QualityCheckResult['issues'] = [];
    const suggestions: QualityCheckResult['suggestions'] = [];

    // Combine all content
    const allContent = document.pages
      .map((p) => (p.content?.text || '').trim())
      .filter((t) => t)
      .join('\n\n');

    // 1. Structure Clarity (0-100)
    const structureScore = this.checkStructureClarity(document, issues, suggestions);

    // 2. Grammar Quality (0-100)
    const grammarScore = this.checkGrammar(allContent, issues, suggestions);

    // 3. Readability (0-100)
    const readabilityScore = this.checkReadability(allContent, issues, suggestions);

    // 4. Logical Flow (0-100)
    const logicalFlowScore = this.checkLogicalFlow(document, issues, suggestions);

    // 5. Completeness (0-100)
    const completenessScore = this.checkCompleteness(document, issues, suggestions);

    // Calculate overall score (weighted average)
    const overallScore = Math.round(
      structureScore * 0.25 +
        grammarScore * 0.2 +
        readabilityScore * 0.2 +
        logicalFlowScore * 0.2 +
        completenessScore * 0.15,
    );

    // Determine grade
    const grade = this.getGrade(overallScore);

    // Validation passed if no errors and score >= 60
    const validationPassed =
      !issues.some((i) => i.severity === 'error') && overallScore >= 60;

    const result: QualityCheckResult = {
      overallScore,
      grade,
      scores: {
        structureClarity: structureScore,
        grammarQuality: grammarScore,
        readability: readabilityScore,
        logicalFlow: logicalFlowScore,
        completeness: completenessScore,
      },
      issues,
      suggestions,
      validationPassed,
    };

    this.logger.log(
      `Quality check complete: ${overallScore}/100 (${grade}) - ${issues.length} issues, ${suggestions.length} suggestions`,
    );

    return result;
  }

  /**
   * Check structure clarity
   */
  private checkStructureClarity(
    document: any,
    issues: QualityCheckResult['issues'],
    suggestions: QualityCheckResult['suggestions'],
  ): number {
    let score = 100;

    // Check if document has title
    if (!document.title || document.title.trim().length === 0) {
      issues.push({
        severity: 'error',
        category: 'structure',
        message: 'Document is missing a title',
      });
      score -= 20;
    }

    // Check if document has pages
    if (!document.pages || document.pages.length === 0) {
      issues.push({
        severity: 'error',
        category: 'structure',
        message: 'Document has no content pages',
      });
      return 0;
    }

    // Check for cover page
    const hasCover = document.pages.some((p) => p.pageType === 'cover');
    if (!hasCover) {
      suggestions.push({
        priority: 'medium',
        message: 'Consider adding a cover page for better presentation',
        actionable: true,
      });
      score -= 5;
    }

    // Check for table of contents
    const hasToc = document.pages.some((p) => p.pageType === 'toc');
    if (!hasToc && document.pages.length > 5) {
      suggestions.push({
        priority: 'medium',
        message: 'Add table of contents for better navigation',
        actionable: true,
      });
      score -= 5;
    }

    // Check for logical page order
    const pageTypes = document.pages.map((p) => p.pageType);
    if (pageTypes.includes('conclusion') && pageTypes.indexOf('conclusion') < pageTypes.length - 2) {
      issues.push({
        severity: 'warning',
        category: 'structure',
        message: 'Conclusion should be near the end of document',
      });
      score -= 10;
    }

    // Check for section titles
    const pagesWithoutTitles = document.pages.filter(
      (p) => !['cover', 'toc'].includes(p.pageType) && (!p.title || p.title.trim().length === 0),
    );
    if (pagesWithoutTitles.length > 0) {
      issues.push({
        severity: 'warning',
        category: 'structure',
        message: `${pagesWithoutTitles.length} page(s) are missing titles`,
      });
      score -= pagesWithoutTitles.length * 5;
    }

    return Math.max(0, score);
  }

  /**
   * Check grammar quality
   */
  private checkGrammar(
    content: string,
    issues: QualityCheckResult['issues'],
    suggestions: QualityCheckResult['suggestions'],
  ): number {
    let score = 100;

    if (!content || content.trim().length === 0) {
      return 0;
    }

    // Check for common grammar issues
    const grammarPatterns = [
      { pattern: /\btheir\s+is\b/gi, message: 'Incorrect use of "their" (should be "there")' },
      { pattern: /\btheir\s+are\b/gi, message: 'Incorrect use of "their" (should be "there")' },
      { pattern: /\byour\s+(doing|going|being)\b/gi, message: 'Incorrect use of "your" (should be "you\'re")' },
      { pattern: /\bits\s+(a|the|an)\s/gi, message: 'Incorrect use of "its" (should be "it\'s")' },
      { pattern: /\bi\s+[a-z]/g, message: 'Lowercase "i" should be capitalized' },
    ];

    grammarPatterns.forEach(({ pattern, message }) => {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({
          severity: 'warning',
          category: 'grammar',
          message: `${message} (${matches.length} occurrence${matches.length > 1 ? 's' : ''})`,
        });
        score -= matches.length * 2;
      }
    });

    // Check for repeated words
    const repeatedWords = content.match(/\b(\w+)\s+\1\b/gi);
    if (repeatedWords && repeatedWords.length > 0) {
      issues.push({
        severity: 'info',
        category: 'grammar',
        message: `Found ${repeatedWords.length} repeated word(s)`,
      });
      score -= repeatedWords.length;
    }

    // Check for missing punctuation
    const sentences = content.split(/\n+/);
    const missingPunctuation = sentences.filter(
      (s) => s.trim().length > 10 && !/[.!?]$/.test(s.trim()),
    );
    if (missingPunctuation.length > 0) {
      issues.push({
        severity: 'info',
        category: 'grammar',
        message: `${missingPunctuation.length} line(s) may be missing punctuation`,
      });
      score -= missingPunctuation.length;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Check readability
   */
  private checkReadability(
    content: string,
    issues: QualityCheckResult['issues'],
    suggestions: QualityCheckResult['suggestions'],
  ): number {
    let score = 100;

    if (!content || content.trim().length === 0) {
      return 0;
    }

    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const words = content.split(/\s+/).filter((w) => w.length > 0);

    if (sentences.length === 0 || words.length === 0) {
      return 50;
    }

    const avgWordsPerSentence = words.length / sentences.length;

    // Check average sentence length
    if (avgWordsPerSentence > 30) {
      issues.push({
        severity: 'warning',
        category: 'readability',
        message: `Average sentence length is too long (${Math.round(avgWordsPerSentence)} words). Aim for 15-20 words per sentence.`,
      });
      score -= 20;
      suggestions.push({
        priority: 'high',
        message: 'Break long sentences into shorter ones for better readability',
        actionable: true,
      });
    } else if (avgWordsPerSentence < 10) {
      issues.push({
        severity: 'info',
        category: 'readability',
        message: `Average sentence length is very short (${Math.round(avgWordsPerSentence)} words). Consider combining some sentences.`,
      });
      score -= 5;
    }

    // Check paragraph length
    const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim());
    const avgSentencesPerParagraph = sentences.length / (paragraphs.length || 1);

    if (avgSentencesPerParagraph > 10) {
      issues.push({
        severity: 'warning',
        category: 'readability',
        message: 'Paragraphs are too long. Break them into smaller sections.',
      });
      score -= 10;
    }

    // Calculate Flesch Reading Ease
    const syllables = words.reduce((count, word) => count + this.countSyllables(word), 0);
    const fleschScore = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * (syllables / words.length);

    if (fleschScore < 30) {
      issues.push({
        severity: 'warning',
        category: 'readability',
        message: 'Content is very difficult to read. Simplify language and sentence structure.',
      });
      score -= 15;
    } else if (fleschScore < 50) {
      suggestions.push({
        priority: 'medium',
        message: 'Content readability could be improved with simpler language',
        actionable: true,
      });
      score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Check logical flow
   */
  private checkLogicalFlow(
    document: any,
    issues: QualityCheckResult['issues'],
    suggestions: QualityCheckResult['suggestions'],
  ): number {
    let score = 100;

    const pageTypes = document.pages.map((p) => p.pageType);

    // Check for introduction
    const hasIntro = pageTypes.some((t) => ['intro', 'summary', 'cover'].includes(t));
    if (!hasIntro && document.pages.length > 1) {
      suggestions.push({
        priority: 'high',
        message: 'Add an introduction to set context for readers',
        actionable: true,
      });
      score -= 10;
    }

    // Check for conclusion
    const hasConclusion = pageTypes.some((t) => ['conclusion', 'summary'].includes(t));
    if (!hasConclusion && document.pages.length > 3) {
      suggestions.push({
        priority: 'medium',
        message: 'Add a conclusion to summarize key points',
        actionable: true,
      });
      score -= 10;
    }

    // Check for abrupt transitions
    for (let i = 0; i < document.pages.length - 1; i++) {
      const currentType = document.pages[i].pageType;
      const nextType = document.pages[i + 1].pageType;

      // Warn about odd transitions
      if (currentType === 'conclusion' && !['references', 'toc'].includes(nextType)) {
        issues.push({
          severity: 'warning',
          category: 'flow',
          message: `Unexpected content after conclusion (page ${i + 2})`,
        });
        score -= 5;
      }
    }

    // Check for duplicate sections
    const titles = document.pages
      .map((p) => p.title)
      .filter((t) => t)
      .map((t) => t.toLowerCase().trim());

    const duplicates = titles.filter((t, i) => titles.indexOf(t) !== i);
    if (duplicates.length > 0) {
      issues.push({
        severity: 'warning',
        category: 'flow',
        message: `Found ${duplicates.length} duplicate section title(s)`,
      });
      score -= duplicates.length * 5;
    }

    return Math.max(0, score);
  }

  /**
   * Check completeness
   */
  private checkCompleteness(
    document: any,
    issues: QualityCheckResult['issues'],
    suggestions: QualityCheckResult['suggestions'],
  ): number {
    let score = 100;

    // Check minimum page count
    if (document.pages.length < 2) {
      issues.push({
        severity: 'error',
        category: 'completeness',
        message: 'Document is too short (minimum 2 pages required)',
      });
      score -= 50;
    }

    // Check for empty pages
    const emptyPages = document.pages.filter((p) => {
      const text = p.content?.text || '';
      return text.trim().length === 0 && p.pageType !== 'cover' && p.pageType !== 'toc';
    });

    if (emptyPages.length > 0) {
      issues.push({
        severity: 'error',
        category: 'completeness',
        message: `${emptyPages.length} page(s) are empty`,
      });
      score -= emptyPages.length * 10;
    }

    // Check for very short pages
    const shortPages = document.pages.filter((p) => {
      const text = p.content?.text || '';
      return text.trim().length > 0 && text.trim().length < 50;
    });

    if (shortPages.length > 0) {
      suggestions.push({
        priority: 'medium',
        message: `${shortPages.length} page(s) have very little content. Consider expanding or merging.`,
        actionable: true,
      });
      score -= shortPages.length * 5;
    }

    // Check for missing key sections (business documents)
    const contentPages = document.pages.filter((p) => p.pageType === 'content');
    if (contentPages.length === 0 && document.pages.length > 2) {
      issues.push({
        severity: 'warning',
        category: 'completeness',
        message: 'Document lacks substantive content sections',
      });
      score -= 20;
    }

    return Math.max(0, score);
  }

  /**
   * Count syllables in a word
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;

    const matches = word.match(/[aeiouy]{1,2}/g);
    let count = matches ? matches.length : 1;

    if (word.endsWith('e')) count--;
    if (word.endsWith('le') && word.length > 2) count++;

    return Math.max(1, count);
  }

  /**
   * Get grade from score
   */
  private getGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
}
