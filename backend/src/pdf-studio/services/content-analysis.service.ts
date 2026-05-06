import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PerformanceService } from '../../common/performance.service';
const nlp = require('compromise');

export interface ContentIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  title: string;
  description: string;
  affectedText?: string;
  suggestedFix: string;
}

export interface ContentAnalysisResult {
  detectedType: string;
  confidence: number;
  categories: string[];
  keywords: string[];
  topics: string[];
  hasTitle: boolean;
  hasHeadings: boolean;
  hasBullets: boolean;
  hasNumbers: boolean;
  sectionCount: number;
  paragraphCount: number;
  wordCount: number;
  characterCount: number;
  readabilityScore: number;
  grammarIssues: number;
  spellingIssues: number;
  clarityScore: number;
  extractedData: any;
  suggestedTitle: string;
  suggestedSections: any[];
  issues: ContentIssue[];
  recommendedEnhancements: string[];
}

@Injectable()
export class ContentAnalysisService {
  private readonly logger = new Logger(ContentAnalysisService.name);

  constructor(
    private prisma: PrismaService,
    private performanceService: PerformanceService,
  ) {}

  /**
   * Analyze raw content and detect type, structure, and quality
   */
  async analyzeContent(rawContent: string): Promise<ContentAnalysisResult> {
    this.logger.log(`Analyzing content (${rawContent.length} chars)`);

    // Use performance metrics and caching
    const contentHash = this.hashContent(rawContent);
    const cacheKey = `content-analysis:${contentHash}`;

    return this.performanceService.cached(
      cacheKey,
      async () => {
        return this.performanceService.measure(
          'content-analysis',
          async () => {
            return this.performAnalysis(rawContent);
          },
        );
      },
      300, // Cache for 5 minutes
    );
  }

  /**
   * Generate a hash of content for caching
   */
  private hashContent(content: string): string {
    // Simple hash for demo - use crypto.createHash in production
    return Buffer.from(content)
      .toString('base64')
      .substring(0, 32)
      .replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Perform the actual analysis
   */
  private async performAnalysis(rawContent: string): Promise<ContentAnalysisResult> {

    const startTime = Date.now();

    // Step 1: Basic statistics
    const contentLength = rawContent.length;
    const wordCount = this.countWords(rawContent);
    const paragraphCount = this.countParagraphs(rawContent);
    const sectionCount = this.countSections(rawContent);

    // Step 2: Structure detection
    const hasTitle = this.detectTitle(rawContent);
    const hasHeadings = this.detectHeadings(rawContent);
    const hasBullets = this.detectBullets(rawContent);
    const hasNumbers = this.detectNumbers(rawContent);

    // Step 3: Content type detection (improved with fallback)
    let { detectedType, confidence } = this.detectContentType(rawContent, {
      hasHeadings,
      hasBullets,
      hasNumbers,
      paragraphCount,
      wordCount,
    });

    // Ensure type is never empty - apply fallback logic
    if (!detectedType || detectedType.trim() === '') {
      detectedType = this.getFallbackDocumentType(rawContent);
      confidence = 0.5;
    }

    // Step 4: Extract keywords and topics
    const keywords = this.extractKeywords(rawContent);
    const topics = this.extractTopics(rawContent);
    const categories = this.categorizeContent(rawContent, detectedType);

    // Step 5: Quality analysis with safe fallbacks
    let readabilityScore = this.calculateReadability(rawContent);
    let clarityScore = this.calculateClarity(rawContent);

    // Ensure no NaN values - use safe fallbacks
    if (isNaN(readabilityScore) || readabilityScore === null || readabilityScore === undefined) {
      readabilityScore = 40; // Safe fallback
    }
    if (isNaN(clarityScore) || clarityScore === null || clarityScore === undefined) {
      clarityScore = 35; // Safe fallback
    }

    // Adjust based on content quality
    if (hasHeadings && hasBullets) {
      readabilityScore = Math.min(100, readabilityScore + 10);
      clarityScore = Math.min(100, clarityScore + 10);
    }

    // Step 6: Detect real issues
    let issues = this.detectIssues(rawContent, {
      hasTitle,
      hasHeadings,
      hasBullets,
      sectionCount,
      paragraphCount,
      wordCount,
      detectedType,
    });

    // Add metric-based issues
    issues = this.addMetricBasedIssues(issues, readabilityScore, clarityScore, sectionCount);

    const grammarIssues = issues.filter((i) => i.type === 'grammar').length;
    const spellingIssues = issues.filter((i) => i.type === 'spelling').length;

    // Step 7: Generate recommendations
    const recommendedEnhancements = this.generateRecommendations(
      issues,
      detectedType,
    );

    // Step 8: Extract structured data
    const extractedData = this.extractStructuredData(rawContent);

    // Step 9: Generate suggestions
    const suggestedTitle = this.generateTitle(rawContent, detectedType);
    const suggestedSections = this.generateSectionStructure(
      rawContent,
      detectedType,
      wordCount,
    );

    const processingTime = Date.now() - startTime;
    this.logger.log(
      `Content analysis completed in ${processingTime}ms - Type: ${detectedType} (${Math.round(confidence * 100)}% confidence)`,
    );

    return {
      detectedType,
      confidence,
      categories,
      keywords,
      topics,
      hasTitle,
      hasHeadings,
      hasBullets,
      hasNumbers,
      sectionCount,
      paragraphCount,
      wordCount,
      characterCount: contentLength,
      readabilityScore,
      grammarIssues,
      spellingIssues,
      clarityScore,
      extractedData,
      suggestedTitle,
      suggestedSections,
      issues,
      recommendedEnhancements,
    };
  }

  /**
   * Detect content type from raw text (improved algorithm)
   */
  private detectContentType(
    content: string,
    features: any,
  ): { detectedType: string; confidence: number } {
    const lowerContent = content.toLowerCase();
    const wordCount = features.wordCount || this.countWords(content);

    // Startup/Business pitch patterns (high priority)
    const startupKeywords = [
      'startup',
      'pitch',
      'investor',
      'funding',
      'vision',
      'mission',
      'founder',
      'co-founder',
      'venture',
      'seed',
      'series',
      'valuation',
      'mvp',
      'product-market fit',
      'traction',
      'go-to-market',
      'scalable',
      'disrupt',
      'innovate',
      'problem we solve',
      'our solution',
      'target audience',
      'competitive advantage',
      'business model',
      'revenue model',
    ];
    const startupScore = this.countMatches(lowerContent, startupKeywords);

    // Business document patterns
    const businessKeywords = [
      'revenue',
      'market',
      'customer',
      'strategy',
      'business',
      'profit',
      'sales',
      'investment',
      'roi',
      'growth',
      'company',
      'product',
      'service',
      'clients',
      'partnership',
      'competitive',
      'industry',
      'enterprise',
      'commercial',
      'b2b',
      'b2c',
    ];
    const businessScore = this.countMatches(lowerContent, businessKeywords);

    // Academic patterns
    const academicKeywords = [
      'abstract',
      'introduction',
      'methodology',
      'analysis',
      'conclusion',
      'research',
      'study',
      'hypothesis',
      'literature',
      'findings',
      'references',
      'peer-reviewed',
      'journal',
      'citation',
      'experimental',
    ];
    const academicScore = this.countMatches(lowerContent, academicKeywords);

    // Report patterns
    const reportKeywords = [
      'summary',
      'findings',
      'recommendation',
      'overview',
      'analysis',
      'data',
      'results',
      'insights',
      'executive summary',
      'key findings',
      'metrics',
      'kpi',
      'performance',
      'quarterly',
      'annual',
    ];
    const reportScore = this.countMatches(lowerContent, reportKeywords);

    // Technical documentation patterns
    const technicalKeywords = [
      'function',
      'method',
      'class',
      'api',
      'configuration',
      'installation',
      'setup',
      'parameter',
      'example',
      'usage',
      'documentation',
      'code',
      'syntax',
      'command',
      'terminal',
    ];
    const technicalScore = this.countMatches(lowerContent, technicalKeywords);

    // Calculate weighted scores
    const scores: Record<string, number> = {
      startup: startupScore * 4, // Highest weight for startup content
      business: businessScore * 3,
      academic: academicScore * 3,
      report: reportScore * 3,
      technical: technicalScore * 2,
      notes:
        features.hasBullets && !features.hasHeadings && wordCount < 500 ? 3 : 0,
    };

    // Special case: detect mixed business/startup content
    if (startupScore > 0 && businessScore > 0) {
      scores.business = Math.max(scores.startup, scores.business);
    }

    // Find highest score
    let maxScore = 0;
    let detectedType = 'business'; // Default to business instead of article
    let secondMaxScore = 0;

    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        secondMaxScore = maxScore;
        maxScore = score;
        detectedType = type;
      } else if (score > secondMaxScore) {
        secondMaxScore = score;
      }
    }

    // If no clear winner and has business keywords, classify as business
    if (maxScore < 3 && (businessScore > 0 || startupScore > 0)) {
      detectedType = 'business';
      maxScore = Math.max(businessScore, startupScore);
    }

    // Calculate confidence with better algorithm
    // Confidence is higher when there's a clear winner
    let confidence = 0.5; // Base confidence
    if (maxScore > 0) {
      const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
      if (totalScore > 0) {
        // Ratio of winner to total
        const dominance = maxScore / totalScore;
        // Gap between winner and second place
        const gap = maxScore - secondMaxScore;
        // Combined confidence metric
        confidence = Math.min(dominance * 0.6 + gap / maxScore * 0.4, 0.95);
      }
      // Boost confidence if score is high
      if (maxScore > 10) {
        confidence = Math.min(confidence + 0.15, 0.95);
      }
    }

    // Ensure minimum confidence
    confidence = Math.max(confidence, 0.4);

    return { detectedType, confidence };
  }

  /**
   * Count matches of keywords in content
   */
  private countMatches(content: string, keywords: string[]): number {
    return keywords.reduce((count, keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = content.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  /**
   * Count words in content (fix NaN issue)
   */
  private countWords(content: string): number {
    const words = content
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    return words.length;
  }

  /**
   * Detect issues in content (grammar, structure, repetition, tone)
   */
  private detectIssues(content: string, features: any): ContentIssue[] {
    const issues: ContentIssue[] = [];
    const lowerContent = content.toLowerCase();

    // Check for missing title
    if (!features.hasTitle) {
      issues.push({
        severity: 'medium',
        type: 'structure',
        title: 'Missing title',
        description:
          'Your content does not have a clear title at the beginning.',
        suggestedFix: 'Add a descriptive title to make your document professional.',
      });
    }

    // Check for missing sections/structure
    if (features.sectionCount === 0) {
      issues.push({
        severity: 'high',
        type: 'structure',
        title: 'No clear sections found',
        description:
          'Your content has no clear sections or headings. This makes it hard to follow.',
        suggestedFix:
          'Break your content into logical sections with clear headings.',
      });
    } else if (features.sectionCount < 2 && features.wordCount > 200) {
      issues.push({
        severity: 'high',
        type: 'structure',
        title: 'Weak structure',
        description:
          'Your content lacks clear sections or headings. This makes it hard to follow.',
        suggestedFix:
          'Break your content into logical sections with clear headings.',
      });
    }

    // Check for repetition
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const repeatedPhrases = this.findRepeatedPhrases(content);
    if (repeatedPhrases.length > 0) {
      issues.push({
        severity: 'medium',
        type: 'repetition',
        title: 'Repeated ideas',
        description: `Found ${repeatedPhrases.length} repeated phrases or ideas.`,
        affectedText: repeatedPhrases.slice(0, 3).join(', '),
        suggestedFix: 'Merge repeated points into concise statements.',
      });
    }

    // Check for informal tone (business context)
    if (features.detectedType === 'business' || features.detectedType === 'startup') {
      const informalWords = ['gonna', 'wanna', 'kinda', 'sorta', 'yeah', 'nope', 'yep'];
      const foundInformal = informalWords.filter((w) =>
        lowerContent.includes(w),
      );
      if (foundInformal.length > 0) {
        issues.push({
          severity: 'medium',
          type: 'tone',
          title: 'Informal tone detected',
          description:
            'Your content contains informal language that may not be suitable for business documents.',
          affectedText: foundInformal.join(', '),
          suggestedFix:
            'Use professional language appropriate for business communication.',
        });
      }
    }

    // Check for grammar issues
    const grammarIssues = this.detectGrammarIssues(content);
    if (grammarIssues > 0) {
      issues.push({
        severity: 'high',
        type: 'grammar',
        title: `${grammarIssues} grammar issue${grammarIssues > 1 ? 's' : ''}`,
        description: 'Detected potential grammar problems in your content.',
        suggestedFix: 'Fix grammar issues to improve readability.',
      });
    }

    // Check for very long paragraphs
    const paragraphs = content.split(/\n\s*\n/);
    const longParagraphs = paragraphs.filter((p) => p.split(/\s+/).length > 100);
    if (longParagraphs.length > 0) {
      issues.push({
        severity: 'low',
        type: 'readability',
        title: 'Very long paragraphs',
        description: `Found ${longParagraphs.length} paragraph${longParagraphs.length > 1 ? 's' : ''} with more than 100 words.`,
        suggestedFix: 'Break long paragraphs into smaller chunks for better readability.',
      });
    }

    // Check for missing conclusion
    const hasConclusion =
      lowerContent.includes('conclusion') ||
      lowerContent.includes('in summary') ||
      lowerContent.includes('to conclude') ||
      lowerContent.includes('finally');
    if (!hasConclusion && features.wordCount > 300) {
      issues.push({
        severity: 'medium',
        type: 'structure',
        title: 'Missing conclusion',
        description: 'Your document does not have a clear conclusion or summary.',
        suggestedFix:
          'Add a conclusion to summarize key points and provide closure.',
      });
    }

    // Check for too much text without bullets
    if (!features.hasBullets && features.wordCount > 500) {
      issues.push({
        severity: 'low',
        type: 'readability',
        title: 'No bullet points',
        description:
          'Long text without bullet points can be hard to scan quickly.',
        suggestedFix:
          'Use bullet points to break down lists and key information.',
      });
    }

    return issues;
  }

  /**
   * Get fallback document type when detection fails
   */
  private getFallbackDocumentType(content: string): string {
    const lowerContent = content.toLowerCase();

    // Check for business/startup terms
    const businessTerms = ['business', 'startup', 'product', 'company', 'platform', 'service', 'market', 'customer'];
    const hasBusinessTerms = businessTerms.some(term => lowerContent.includes(term));
    if (hasBusinessTerms) {
      return 'Business Overview';
    }

    // Check for report terms
    const reportTerms = ['findings', 'results', 'analysis', 'data', 'metrics', 'summary'];
    const hasReportTerms = reportTerms.some(term => lowerContent.includes(term));
    if (hasReportTerms) {
      return 'Report';
    }

    // Check if content is very short or unstructured
    const wordCount = this.countWords(content);
    if (wordCount < 300 || !this.detectHeadings(content)) {
      return 'Notes Document';
    }

    // Final fallback
    return 'General Document';
  }

  /**
   * Add issues based on quality metrics
   */
  private addMetricBasedIssues(issues: ContentIssue[], readability: number, clarity: number, sectionCount: number): ContentIssue[] {
    // Issue if sections = 0 (already handled in detectIssues)
    
    // Issue if readability < 50
    if (readability < 50) {
      issues.push({
        severity: 'medium',
        type: 'readability',
        title: 'Readability needs improvement',
        description: `Content readability score is ${Math.round(readability)}/100. This may be difficult to read.`,
        suggestedFix: 'Simplify sentences, use shorter words, and break up long paragraphs.',
      });
    }

    // Issue if clarity < 50
    if (clarity < 50) {
      issues.push({
        severity: 'medium',
        type: 'clarity',
        title: 'Clarity needs improvement',
        description: `Content clarity score is ${Math.round(clarity)}/100. Ideas may be unclear.`,
        suggestedFix: 'Use clearer language, add examples, and organize information better.',
      });
    }

    return issues;
  }

  /**
   * Find repeated phrases (3+ words appearing multiple times)
   */
  private findRepeatedPhrases(content: string): string[] {
    const words = content.toLowerCase().split(/\s+/);
    const phrases: Map<string, number> = new Map();

    // Look for 3-5 word phrases
    for (let len = 3; len <= 5; len++) {
      for (let i = 0; i <= words.length - len; i++) {
        const phrase = words.slice(i, i + len).join(' ');
        if (phrase.length > 15) {
          // Minimum length
          phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
        }
      }
    }

    // Return phrases that appear 2+ times
    return Array.from(phrases.entries())
      .filter(([, count]) => count >= 2)
      .map(([phrase]) => phrase)
      .slice(0, 10); // Limit to top 10
  }

  /**
   * Generate recommendations based on detected issues
   */
  private generateRecommendations(
    issues: ContentIssue[],
    detectedType: string,
  ): string[] {
    const recommendations: string[] = [];

    const hasGrammar = issues.some((i) => i.type === 'grammar');
    const hasRepetition = issues.some((i) => i.type === 'repetition');
    const hasStructure = issues.some((i) => i.type === 'structure');
    const hasTone = issues.some((i) => i.type === 'tone');

    if (hasGrammar) {
      recommendations.push('Fix grammar and spelling errors');
    }

    if (hasRepetition) {
      recommendations.push('Remove repeated ideas and consolidate content');
    }

    if (hasStructure) {
      recommendations.push('Add clear sections with descriptive headings');
      recommendations.push('Include a strong introduction and conclusion');
    }

    if (hasTone) {
      recommendations.push('Rewrite informal sentences professionally');
    }

    // Type-specific recommendations
    if (detectedType === 'business' || detectedType === 'startup') {
      if (!hasStructure) {
        recommendations.push('Organize content with business-focused structure');
      }
      recommendations.push('Enhance with data and metrics where applicable');
    }

    if (recommendations.length === 0) {
      recommendations.push('Minor improvements for clarity and flow');
      recommendations.push('Enhance formatting and visual structure');
    }

    return recommendations;
  }

  /**
   * Count paragraphs in content
   */
  private countParagraphs(content: string): number {
    return content.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;
  }

  /**
   * Count sections (based on headings) - never returns NaN
   */
  private countSections(content: string): number {
    if (!content || content.trim() === '') {
      return 0;
    }

    const headingPatterns = [
      /^#{1,6}\s+.+$/gm, // Markdown headers
      /^[A-Z][^.!?]*:$/gm, // Title case with colon
      /^\d+\.\s+[A-Z].+$/gm, // Numbered sections
    ];

    let count = 0;
    for (const pattern of headingPatterns) {
      const matches = content.match(pattern);
      if (matches) count += matches.length;
    }

    return count || 0; // Ensure 0 instead of NaN
  }

  /**
   * Detect if content has a title
   */
  private detectTitle(content: string): boolean {
    const lines = content.trim().split('\n');
    if (lines.length === 0) return false;

    const firstLine = lines[0].trim();
    // Title is likely if first line is short, capitalized, and no period
    return (
      firstLine.length > 0 &&
      firstLine.length < 100 &&
      !firstLine.endsWith('.') &&
      /^[A-Z]/.test(firstLine)
    );
  }

  /**
   * Detect if content has headings
   */
  private detectHeadings(content: string): boolean {
    return (
      /^#{1,6}\s+.+$/m.test(content) || // Markdown
      /^[A-Z][^.!?]*:$/m.test(content) || // Colon headings
      /^\d+\.\s+[A-Z].+$/m.test(content) // Numbered headings
    );
  }

  /**
   * Detect if content has bullet points
   */
  private detectBullets(content: string): boolean {
    return (
      /^[\s]*[-*•]\s+/m.test(content) || // Bullet markers
      /^[\s]*\d+\.\s+/m.test(content) // Numbered lists
    );
  }

  /**
   * Detect if content has numbers/metrics
   */
  private detectNumbers(content: string): boolean {
    return /\d+%|\$\d+|\d+[KMB]|\d+:\d+/.test(content);
  }

  /**
   * Extract keywords from content
   */
  /**
   * Extract keywords using NLP (Enhanced with compromise)
   */
  private extractKeywords(content: string): string[] {
    if (!content || content.trim() === '') {
      return [];
    }

    // Use compromise for NLP-based keyword extraction
    const doc = nlp(content);
    
    // Extract nouns and topics
    const nouns = doc.nouns().out('array') as string[];
    const topics = doc.topics().out('array') as string[];
    
    // Combine with frequency-based approach for better results
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 4);

    const wordFreq: Record<string, number> = {};
    words.forEach((word) => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Combine NLP and frequency approaches
    const nlpKeywords = [...new Set([...nouns, ...topics])]
      .map(k => k.toLowerCase())
      .filter(k => k.length > 3);

    // Merge with frequency-based keywords
    const freqKeywords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map((entry) => entry[0]);

    // Return combined unique keywords
    return [...new Set([...nlpKeywords.slice(0, 10), ...freqKeywords])].slice(0, 20);
  }

  /**
   * Extract topics using NLP and keyword matching
   */
  private extractTopics(content: string): string[] {
    if (!content || content.trim() === '') {
      return [];
    }

    // Use compromise to extract entities
    const doc = nlp(content);
    const organizations = doc.organizations().out('array') as string[];
    const places = doc.places().out('array') as string[];
    
    // Simple topic extraction based on common themes
    const topicKeywords = {
      business: ['business', 'company', 'market', 'revenue', 'profit'],
      technology: ['technology', 'software', 'platform', 'data', 'system'],
      finance: ['finance', 'investment', 'capital', 'funding', 'financial'],
      marketing: ['marketing', 'customer', 'brand', 'sales', 'campaign'],
      operations: ['operations', 'process', 'workflow', 'team', 'management'],
      product: ['product', 'feature', 'solution', 'development', 'design'],
    };

    const lowerContent = content.toLowerCase();
    const topics: string[] = [];

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      const matches = this.countMatches(lowerContent, keywords);
      if (matches >= 2) {
        topics.push(topic);
      }
    }

    // Add entities as topics
    [...organizations, ...places].forEach(entity => {
      if (entity && entity.length > 0 && topics.length < 10) {
        topics.push(entity);
      }
    });

    return [...new Set(topics)];
  }

  /**
   * Categorize content
   */
  private categorizeContent(content: string, detectedType: string): string[] {
    const categories: string[] = [detectedType];

    const lowerContent = content.toLowerCase();

    // Add additional categories based on content
    if (this.countMatches(lowerContent, ['strategy', 'plan', 'goal']) > 2) {
      categories.push('strategic');
    }
    if (this.countMatches(lowerContent, ['data', 'analysis', 'metrics']) > 2) {
      categories.push('analytical');
    }
    if (this.countMatches(lowerContent, ['pitch', 'investment', 'funding']) > 2) {
      categories.push('pitch');
    }

    return categories;
  }

  /**
   * Calculate readability score (Flesch Reading Ease) - never returns NaN
   */
  private calculateReadability(content: string): number {
    if (!content || content.trim() === '') {
      return 40; // Safe fallback
    }

    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const words = content.split(/\s+/).filter((w) => w.length > 0);
    
    if (sentences.length === 0 || words.length === 0) {
      return 40; // Safe fallback
    }

    const syllables = words.reduce((count, word) => count + this.countSyllables(word), 0);

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    // Flesch Reading Ease formula
    const score = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;

    // Ensure valid number
    if (isNaN(score)) {
      return 40; // Safe fallback
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Count syllables in a word (simplified)
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;

    const matches = word.match(/[aeiouy]{1,2}/g);
    let count = matches ? matches.length : 1;

    // Adjust for silent e
    if (word.endsWith('e')) count--;
    if (word.endsWith('le') && word.length > 2) count++;

    return Math.max(1, count);
  }

  /**
   * Detect grammar issues (simplified)
   */
  private detectGrammarIssues(content: string): number {
    let issues = 0;

    // Check for common grammar issues
    const patterns = [
      /\s+their\s+is\s+/gi, // their/there confusion
      /\s+your\s+(doing|going|being)\s+/gi, // your/you're
      /\s+its\s+(a|the|an)\s+/gi, // its/it's
      /\bi\s+[a-z]/g, // lowercase i
      /\.\s*[a-z]/g, // lowercase after period
    ];

    patterns.forEach((pattern) => {
      const matches = content.match(pattern);
      if (matches) issues += matches.length;
    });

    return issues;
  }

  /**
   * Detect spelling issues (simplified)
   */
  private detectSpellingIssues(content: string): number {
    // Simple check for repeated characters (likely typos)
    const repeatedChars = content.match(/([a-z])\1{2,}/gi);
    return repeatedChars ? repeatedChars.length : 0;
  }

  /**
   * Calculate clarity score (0-100 range) - never returns NaN
   */
  private calculateClarity(content: string): number {
    if (!content || content.trim() === '') {
      return 35; // Safe fallback
    }

    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const words = content.split(/\s+/).filter((w) => w.length > 0);

    if (sentences.length === 0 || words.length === 0) {
      return 35; // Safe fallback
    }

    const avgWordsPerSentence = words.length / sentences.length;

    // Start with base score
    let clarityScore = 70; // Start at 70/100

    // Penalize very long sentences (harder to understand)
    // Optimal: 15-20 words per sentence
    if (avgWordsPerSentence > 30) {
      clarityScore -= 30;
    } else if (avgWordsPerSentence > 25) {
      clarityScore -= 20;
    } else if (avgWordsPerSentence > 20) {
      clarityScore -= 10;
    }

    // Reward good structure
    if (this.detectBullets(content)) {
      clarityScore += 10;
    }
    if (this.detectHeadings(content)) {
      clarityScore += 10;
    }

    const finalScore = Math.max(0, Math.min(100, Math.round(clarityScore)));

    // Ensure valid number
    if (isNaN(finalScore)) {
      return 35; // Safe fallback
    }

    return finalScore;
  }

  /**
   * Extract structured data (names, dates, numbers, etc.)
   */
  private extractStructuredData(content: string): any {
    return {
      emails: this.extractEmails(content),
      urls: this.extractUrls(content),
      dates: this.extractDates(content),
      numbers: this.extractNumbers(content),
      currencies: this.extractCurrencies(content),
    };
  }

  private extractEmails(content: string): string[] {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    return content.match(emailRegex) || [];
  }

  private extractUrls(content: string): string[] {
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    return content.match(urlRegex) || [];
  }

  private extractDates(content: string): string[] {
    const dateRegex = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/gi;
    return content.match(dateRegex) || [];
  }

  private extractNumbers(content: string): string[] {
    const numberRegex = /\b\d+\.?\d*%?|\$\d+(?:,\d{3})*(?:\.\d+)?[KMB]?/g;
    return content.match(numberRegex) || [];
  }

  private extractCurrencies(content: string): string[] {
    const currencyRegex = /\$\d+(?:,\d{3})*(?:\.\d+)?[KMB]?|£\d+|€\d+|¥\d+/g;
    return content.match(currencyRegex) || [];
  }

  /**
   * Generate a title from content
   */
  private generateTitle(content: string, detectedType: string): string {
    const lines = content.trim().split('\n');

    // If first line looks like a title, use it
    if (this.detectTitle(content)) {
      return lines[0].trim();
    }

    // Otherwise, generate based on content type
    const typeDefaults: Record<string, string> = {
      business: 'Business Document',
      academic: 'Research Paper',
      report: 'Report',
      technical: 'Technical Documentation',
      article: 'Article',
      notes: 'Notes',
      mixed: 'Document',
    };

    return typeDefaults[detectedType] || 'Untitled Document';
  }

  /**
   * Generate section structure based on content type
   */
  /**
   * Generate context-aware section structure (improved)
   */
  private generateSectionStructure(
    content: string,
    detectedType: string,
    wordCount: number,
  ): any[] {
    const lowerContent = content.toLowerCase();

    // Startup/pitch structure (specific for startup content)
    if (detectedType === 'startup') {
      const structure = [
        { title: 'Overview', type: 'summary' },
        { title: 'Problem', type: 'content' },
        { title: 'Solution', type: 'content' },
        { title: 'Product', type: 'content' },
        { title: 'Market', type: 'content' },
        { title: 'Features', type: 'content' },
        { title: 'Vision', type: 'content' },
        { title: 'Conclusion', type: 'conclusion' },
      ];
      // Adapt based on content
      if (!lowerContent.includes('market')) {
        structure.splice(4, 1); // Remove Market
      }
      if (!lowerContent.includes('vision')) {
        structure.splice(
          structure.findIndex((s) => s.title === 'Vision'),
          1,
        );
      }
      return structure;
    }

    // Business document structure (comprehensive)
    if (detectedType === 'business') {
      if (lowerContent.includes('pitch') || lowerContent.includes('startup')) {
        // Business pitch detected
        return [
          { title: 'Executive Summary', type: 'summary' },
          { title: 'Problem Statement', type: 'content' },
          { title: 'Our Solution', type: 'content' },
          { title: 'Product Overview', type: 'content' },
          { title: 'Market Opportunity', type: 'content' },
          { title: 'Business Model', type: 'content' },
          { title: 'Competitive Advantage', type: 'content' },
          { title: 'Financial Overview', type: 'financial' },
          { title: 'Conclusion', type: 'conclusion' },
        ];
      } else {
        // General business document
        return [
          { title: 'Executive Summary', type: 'summary' },
          { title: 'Company Overview', type: 'content' },
          { title: 'Products & Services', type: 'content' },
          { title: 'Market Analysis', type: 'content' },
          { title: 'Strategy', type: 'content' },
          { title: 'Financial Highlights', type: 'financial' },
          { title: 'Conclusion', type: 'conclusion' },
        ];
      }
    }

    // Academic paper structure
    if (detectedType === 'academic') {
      return [
        { title: 'Abstract', type: 'summary' },
        { title: 'Introduction', type: 'content' },
        { title: 'Literature Review', type: 'content' },
        { title: 'Methodology', type: 'content' },
        { title: 'Results', type: 'content' },
        { title: 'Discussion', type: 'content' },
        { title: 'Conclusion', type: 'conclusion' },
        { title: 'References', type: 'references' },
      ];
    }

    // Report structure
    if (detectedType === 'report') {
      return [
        { title: 'Executive Summary', type: 'summary' },
        { title: 'Overview', type: 'content' },
        { title: 'Key Findings', type: 'content' },
        { title: 'Analysis', type: 'content' },
        { title: 'Recommendations', type: 'content' },
        { title: 'Conclusion', type: 'conclusion' },
        { title: 'Appendix', type: 'references' },
      ];
    }

    // Technical documentation structure
    if (detectedType === 'technical') {
      return [
        { title: 'Introduction', type: 'content' },
        { title: 'Installation', type: 'content' },
        { title: 'Configuration', type: 'content' },
        { title: 'Usage Guide', type: 'content' },
        { title: 'Examples', type: 'content' },
        { title: 'API Reference', type: 'references' },
        { title: 'Troubleshooting', type: 'content' },
      ];
    }

    // Notes structure (short form)
    if (detectedType === 'notes' || wordCount < 300) {
      return [
        { title: 'Overview', type: 'summary' },
        { title: 'Key Points', type: 'content' },
        { title: 'Details', type: 'content' },
        { title: 'Summary', type: 'conclusion' },
      ];
    }

    // Fallback: use business structure instead of generic
    // This ensures we never have a 4-section generic structure
    return [
      { title: 'Overview', type: 'summary' },
      { title: 'Main Content', type: 'content' },
      { title: 'Key Details', type: 'content' },
      { title: 'Supporting Information', type: 'content' },
      { title: 'Summary', type: 'conclusion' },
    ];
  }

  /**
   * Save analysis to database
   */
  async saveAnalysis(
    documentId: string,
    rawContent: string,
    analysisResult: ContentAnalysisResult,
  ): Promise<void> {
    await this.prisma.contentAnalysis.create({
      data: {
        documentId,
        rawContent,
        contentLength: rawContent.length,
        detectedType: analysisResult.detectedType,
        confidence: analysisResult.confidence,
        primaryLanguage: 'en',
        categories: analysisResult.categories,
        keywords: analysisResult.keywords,
        topics: analysisResult.topics,
        hasTitle: analysisResult.hasTitle,
        hasHeadings: analysisResult.hasHeadings,
        hasBullets: analysisResult.hasBullets,
        hasNumbers: analysisResult.hasNumbers,
        sectionCount: analysisResult.sectionCount,
        paragraphCount: analysisResult.paragraphCount,
        readabilityScore: analysisResult.readabilityScore,
        grammarIssues: analysisResult.grammarIssues,
        spellingIssues: analysisResult.spellingIssues,
        clarityScore: analysisResult.clarityScore,
        extractedData: analysisResult.extractedData,
        suggestedTitle: analysisResult.suggestedTitle,
        suggestedSections: analysisResult.suggestedSections,
        processingTime: 0,
        aiModel: 'rule-based',
      },
    });

    this.logger.log(`Saved content analysis for document ${documentId}`);
  }
}
