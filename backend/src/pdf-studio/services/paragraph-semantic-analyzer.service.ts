import { Injectable, Logger } from '@nestjs/common';

/**
 * Semantic metadata for a single paragraph
 */
export interface ParagraphSemantics {
  paragraphId: number;
  text: string;
  keywords: string[];
  topicCategory: string;
  dominantTerms: string[];
  entityTerms: string[];
  numericDensity: number;
  technicalDensity: number;
  sentimentIndicators: string[];
  vocabularyLevel: 'simple' | 'moderate' | 'technical' | 'academic';
}

/**
 * Similarity between two paragraphs
 */
export interface ParagraphSimilarity {
  paragraph1Id: number;
  paragraph2Id: number;
  similarityScore: number;
  sharedKeywords: string[];
  transitionType: 'continuation' | 'evolution' | 'shift' | 'break';
}

/**
 * ParagraphSemanticAnalyzer
 * 
 * Deterministic semantic analysis of paragraphs without AI.
 * 
 * Uses:
 * - Keyword extraction (TF-IDF-like)
 * - Term frequency analysis
 * - Vocabulary pattern detection
 * - Entity recognition (basic)
 * - Contextual similarity (Jaccard, cosine)
 */
@Injectable()
export class ParagraphSemanticAnalyzer {
  private readonly logger = new Logger(ParagraphSemanticAnalyzer.name);

  // Common English stop words
  private readonly STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'this', 'but', 'they', 'have', 'had',
    'what', 'when', 'where', 'who', 'which', 'why', 'how', 'all', 'each',
    'or', 'can', 'may', 'also', 'into', 'than', 'over', 'some', 'such',
  ]);

  // Technical vocabulary indicators
  private readonly TECHNICAL_TERMS = new Set([
    'system', 'process', 'method', 'analysis', 'implementation', 'framework',
    'algorithm', 'data', 'model', 'architecture', 'infrastructure', 'protocol',
    'optimize', 'integrate', 'configure', 'deploy', 'validate', 'evaluate',
    'parameter', 'metric', 'threshold', 'coefficient', 'variable', 'function',
  ]);

  // Academic vocabulary indicators
  private readonly ACADEMIC_TERMS = new Set([
    'research', 'study', 'investigate', 'hypothesis', 'methodology', 'findings',
    'conclude', 'demonstrate', 'indicate', 'suggest', 'evidence', 'significant',
    'correlation', 'impact', 'factor', 'analysis', 'interpretation', 'implications',
  ]);

  /**
   * Analyze a collection of paragraphs
   */
  analyzeParagraphs(paragraphs: string[]): ParagraphSemantics[] {
    if (!paragraphs || paragraphs.length === 0) {
      return [];
    }

    this.logger.log(`Analyzing ${paragraphs.length} paragraphs...`);

    // Calculate document-level term frequency for TF-IDF
    const documentTerms = this.buildDocumentTermFrequency(paragraphs);

    // Analyze each paragraph
    const semantics = paragraphs.map((text, index) => 
      this.analyzeParagraph(text, index, documentTerms)
    );

    this.logger.log(`✓ Semantic analysis complete`);
    return semantics;
  }

  /**
   * Analyze a single paragraph
   */
  private analyzeParagraph(
    text: string,
    paragraphId: number,
    documentTerms: Map<string, number>,
  ): ParagraphSemantics {
    const words = this.tokenize(text);
    const terms = words.filter(w => !this.STOP_WORDS.has(w) && w.length > 2);

    // Extract keywords using TF-IDF-like scoring
    const keywords = this.extractKeywords(terms, documentTerms);

    // Find dominant terms (most frequent)
    const dominantTerms = this.findDominantTerms(terms);

    // Detect entity-like terms (capitalized, proper nouns)
    const entityTerms = this.detectEntityTerms(text);

    // Calculate densities
    const numericDensity = this.calculateNumericDensity(text);
    const technicalDensity = this.calculateTechnicalDensity(terms);

    // Detect sentiment indicators
    const sentimentIndicators = this.detectSentimentIndicators(text);

    // Determine vocabulary level
    const vocabularyLevel = this.determineVocabularyLevel(terms);

    // Infer topic category
    const topicCategory = this.inferTopicCategory(keywords, dominantTerms, entityTerms);

    return {
      paragraphId,
      text,
      keywords,
      topicCategory,
      dominantTerms,
      entityTerms,
      numericDensity,
      technicalDensity,
      sentimentIndicators,
      vocabularyLevel,
    };
  }

  /**
   * Calculate similarity between consecutive paragraphs
   */
  calculateSimilarities(semantics: ParagraphSemantics[]): ParagraphSimilarity[] {
    const similarities: ParagraphSimilarity[] = [];

    for (let i = 0; i < semantics.length - 1; i++) {
      const p1 = semantics[i];
      const p2 = semantics[i + 1];

      const similarity = this.calculateParagraphSimilarity(p1, p2);
      similarities.push(similarity);
    }

    return similarities;
  }

  /**
   * Calculate similarity between two paragraphs
   */
  private calculateParagraphSimilarity(
    p1: ParagraphSemantics,
    p2: ParagraphSemantics,
  ): ParagraphSimilarity {
    // Jaccard similarity on keywords
    const keywords1 = new Set(p1.keywords);
    const keywords2 = new Set(p2.keywords);
    const intersection = new Set([...keywords1].filter(k => keywords2.has(k)));
    const union = new Set([...keywords1, ...keywords2]);

    const jaccardScore = union.size > 0 ? intersection.size / union.size : 0;

    // Shared keywords
    const sharedKeywords = Array.from(intersection);

    // Determine transition type
    let transitionType: 'continuation' | 'evolution' | 'shift' | 'break';
    if (jaccardScore > 0.5) {
      transitionType = 'continuation'; // Very similar
    } else if (jaccardScore > 0.25) {
      transitionType = 'evolution'; // Related but evolving
    } else if (jaccardScore > 0.1) {
      transitionType = 'shift'; // Topic shift
    } else {
      transitionType = 'break'; // Topic break
    }

    return {
      paragraph1Id: p1.paragraphId,
      paragraph2Id: p2.paragraphId,
      similarityScore: jaccardScore,
      sharedKeywords,
      transitionType,
    };
  }

  /**
   * Tokenize text into words
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0);
  }

  /**
   * Build document-level term frequency
   */
  private buildDocumentTermFrequency(paragraphs: string[]): Map<string, number> {
    const termFreq = new Map<string, number>();

    for (const para of paragraphs) {
      const words = this.tokenize(para);
      const uniqueTerms = new Set(words.filter(w => !this.STOP_WORDS.has(w) && w.length > 2));

      for (const term of uniqueTerms) {
        termFreq.set(term, (termFreq.get(term) || 0) + 1);
      }
    }

    return termFreq;
  }

  /**
   * Extract keywords using TF-IDF-like scoring
   */
  private extractKeywords(terms: string[], documentTerms: Map<string, number>): string[] {
    // Calculate term frequency in this paragraph
    const termFreq = new Map<string, number>();
    for (const term of terms) {
      termFreq.set(term, (termFreq.get(term) || 0) + 1);
    }

    // Calculate TF-IDF-like score
    const totalDocs = documentTerms.size;
    const scores: Array<{ term: string; score: number }> = [];

    for (const [term, tf] of termFreq) {
      const df = documentTerms.get(term) || 1;
      const idf = Math.log(totalDocs / df);
      const tfidf = tf * idf;
      scores.push({ term, score: tfidf });
    }

    // Return top keywords
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(s => s.term);
  }

  /**
   * Find dominant terms (most frequent)
   */
  private findDominantTerms(terms: string[]): string[] {
    const freq = new Map<string, number>();
    for (const term of terms) {
      freq.set(term, (freq.get(term) || 0) + 1);
    }

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(e => e[0]);
  }

  /**
   * Detect entity-like terms (capitalized words, proper nouns)
   */
  private detectEntityTerms(text: string): string[] {
    const words = text.split(/\s+/);
    const entities: string[] = [];

    for (const word of words) {
      // Capitalized words (not at sentence start)
      if (/^[A-Z][a-z]+/.test(word) && word.length > 3) {
        entities.push(word);
      }
    }

    // Remove duplicates
    return Array.from(new Set(entities)).slice(0, 5);
  }

  /**
   * Calculate numeric density (percentage of numeric content)
   */
  private calculateNumericDensity(text: string): number {
    const numbers = text.match(/\d+/g) || [];
    const words = text.split(/\s+/).length;
    return words > 0 ? numbers.length / words : 0;
  }

  /**
   * Calculate technical density
   */
  private calculateTechnicalDensity(terms: string[]): number {
    const technicalCount = terms.filter(t => this.TECHNICAL_TERMS.has(t)).length;
    return terms.length > 0 ? technicalCount / terms.length : 0;
  }

  /**
   * Detect sentiment indicators
   */
  private detectSentimentIndicators(text: string): string[] {
    const indicators: string[] = [];
    const lowerText = text.toLowerCase();

    // Positive indicators
    if (/\b(benefit|advantage|improve|success|growth|opportunity)\b/.test(lowerText)) {
      indicators.push('positive');
    }

    // Negative indicators
    if (/\b(challenge|problem|risk|concern|issue|limitation)\b/.test(lowerText)) {
      indicators.push('negative');
    }

    // Neutral/analytical
    if (/\b(analysis|research|study|data|result|finding)\b/.test(lowerText)) {
      indicators.push('analytical');
    }

    return indicators;
  }

  /**
   * Determine vocabulary level
   */
  private determineVocabularyLevel(terms: string[]): 'simple' | 'moderate' | 'technical' | 'academic' {
    const technicalCount = terms.filter(t => this.TECHNICAL_TERMS.has(t)).length;
    const academicCount = terms.filter(t => this.ACADEMIC_TERMS.has(t)).length;
    const avgWordLength = terms.reduce((sum, t) => sum + t.length, 0) / terms.length;

    if (academicCount > 2 || avgWordLength > 7) {
      return 'academic';
    } else if (technicalCount > 2 || avgWordLength > 6) {
      return 'technical';
    } else if (avgWordLength > 5) {
      return 'moderate';
    } else {
      return 'simple';
    }
  }

  /**
   * Infer topic category from semantic analysis
   */
  private inferTopicCategory(
    keywords: string[],
    dominantTerms: string[],
    entityTerms: string[],
  ): string {
    const allTerms = [...keywords, ...dominantTerms, ...entityTerms].map(t => t.toLowerCase());

    // Healthcare
    if (this.hasTerms(allTerms, ['health', 'medical', 'hospital', 'doctor', 'patient', 'disease', 'treatment'])) {
      return 'Healthcare & Medicine';
    }

    // Technology
    if (this.hasTerms(allTerms, ['technology', 'software', 'computer', 'digital', 'ai', 'data', 'system'])) {
      return 'Technology & Computing';
    }

    // Business
    if (this.hasTerms(allTerms, ['business', 'market', 'company', 'revenue', 'profit', 'customer', 'sales'])) {
      return 'Business & Finance';
    }

    // Education
    if (this.hasTerms(allTerms, ['education', 'student', 'school', 'learning', 'teaching', 'university'])) {
      return 'Education & Learning';
    }

    // Economy
    if (this.hasTerms(allTerms, ['economy', 'economic', 'job', 'employment', 'workforce', 'industry'])) {
      return 'Economy & Employment';
    }

    // Environment
    if (this.hasTerms(allTerms, ['environment', 'climate', 'energy', 'sustainable', 'carbon', 'renewable'])) {
      return 'Environment & Sustainability';
    }

    // Politics
    if (this.hasTerms(allTerms, ['government', 'policy', 'political', 'law', 'regulation', 'public'])) {
      return 'Politics & Policy';
    }

    // Research
    if (this.hasTerms(allTerms, ['research', 'study', 'analysis', 'findings', 'methodology', 'results'])) {
      return 'Research & Analysis';
    }

    return 'General';
  }

  /**
   * Check if array contains any of the target terms
   */
  private hasTerms(terms: string[], targets: string[]): boolean {
    return targets.some(target => terms.some(term => term.includes(target)));
  }
}
