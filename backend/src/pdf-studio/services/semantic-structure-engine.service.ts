import { Injectable, Logger } from '@nestjs/common';
import { 
  ParagraphSemanticAnalyzer, 
  ParagraphSemantics 
} from './paragraph-semantic-analyzer.service';
import { 
  TopicSegmentationService, 
  TopicSegment 
} from './topic-segmentation.service';
import { 
  SectionInferenceService, 
  SemanticSection,
  InferredStructure 
} from './section-inference.service';

/**
 * Complete semantic analysis result
 */
export interface SemanticAnalysisResult {
  paragraphSemantics: ParagraphSemantics[];
  topicSegments: TopicSegment[];
  inferredStructure: InferredStructure;
  semanticSections: SemanticSection[];
  documentIntelligence: DocumentIntelligence;
}

/**
 * Document intelligence metrics
 */
export interface DocumentIntelligence {
  overallScore: number; // 0-100
  semanticContinuity: number; // 0-100
  structureClarity: number; // 0-100
  narrativeFlow: number; // 0-100
  topicCoherence: number; // 0-100
  readabilityLevel: 'simple' | 'moderate' | 'technical' | 'academic';
  estimatedReadingTime: number; // minutes
  contentDensity: 'sparse' | 'balanced' | 'dense';
}

/**
 * SemanticStructureEngine
 * 
 * The "brain" of Smart PDF Builder.
 * Orchestrates all semantic analysis services to understand document structure.
 * 
 * NO AI/GPT - Pure deterministic algorithms.
 */
@Injectable()
export class SemanticStructureEngine {
  private readonly logger = new Logger(SemanticStructureEngine.name);

  constructor(
    private readonly paragraphAnalyzer: ParagraphSemanticAnalyzer,
    private readonly topicSegmentation: TopicSegmentationService,
    private readonly sectionInference: SectionInferenceService,
  ) {}

  /**
   * Analyze document structure semantically
   */
  async analyzeDocument(content: string): Promise<SemanticAnalysisResult> {
    this.logger.log('🧠 Starting semantic structure analysis...');

    // Step 1: Split into paragraphs
    const paragraphs = this.extractParagraphs(content);
    this.logger.log(`📄 Extracted ${paragraphs.length} paragraphs`);

    // Step 2: Semantic analysis of each paragraph
    const paragraphSemantics = this.paragraphAnalyzer.analyzeParagraphs(paragraphs);

    // Step 3: Calculate paragraph similarities
    const similarities = this.paragraphAnalyzer.calculateSimilarities(paragraphSemantics);

    // Step 4: Segment by topics
    let topicSegments = this.topicSegmentation.segmentByTopics(paragraphSemantics, similarities);

    // Step 5: Merge small segments
    topicSegments = this.topicSegmentation.mergeSmallSegments(topicSegments, 2);

    // Step 6: Infer document structure
    const inferredStructure = this.sectionInference.inferStructure(topicSegments, paragraphs.length);

    // Step 7: Calculate document intelligence metrics
    const documentIntelligence = this.calculateDocumentIntelligence(
      paragraphSemantics,
      topicSegments,
      inferredStructure,
      content,
    );

    this.logger.log(`✅ Semantic analysis complete`);
    this.logger.log(`   • Document type: ${inferredStructure.documentType}`);
    this.logger.log(`   • Topic segments: ${topicSegments.length}`);
    this.logger.log(`   • Inferred sections: ${inferredStructure.sections.length}`);
    this.logger.log(`   • Intelligence score: ${documentIntelligence.overallScore}/100`);
    this.logger.log(`   • Structure quality: ${(inferredStructure.structureQuality * 100).toFixed(1)}/100`);

    return {
      paragraphSemantics,
      topicSegments,
      inferredStructure,
      semanticSections: inferredStructure.sections,
      documentIntelligence,
    };
  }

  /**
   * Extract paragraphs from content
   */
  private extractParagraphs(content: string): string[] {
    // Split by double newlines or markdown headers
    const paragraphs = content
      .split(/\n\s*\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 20); // Minimum paragraph length

    // If no double newlines, split by single newlines (for dense text)
    if (paragraphs.length < 3) {
      return content
        .split(/\n+/)
        .map(p => p.trim())
        .filter(p => p.length > 30);
    }

    return paragraphs;
  }

  /**
   * Calculate document intelligence metrics
   */
  private calculateDocumentIntelligence(
    paragraphs: ParagraphSemantics[],
    segments: TopicSegment[],
    structure: InferredStructure,
    content: string,
  ): DocumentIntelligence {
    // Semantic continuity (average segment cohesion)
    const semanticContinuity = segments.length > 0
      ? (segments.reduce((sum, s) => sum + s.cohesionScore, 0) / segments.length) * 100
      : 50;

    // Structure clarity (from inferred structure)
    const structureClarity = structure.structureQuality * 100;

    // Narrative flow
    const narrativeFlow = structure.narrativeFlow * 100;

    // Topic coherence (how well topics are defined)
    const topicCoherence = this.calculateTopicCoherence(segments);

    // Overall score
    const overallScore = (
      semanticContinuity * 0.3 +
      structureClarity * 0.3 +
      narrativeFlow * 0.2 +
      topicCoherence * 0.2
    );

    // Readability level (from vocabulary analysis)
    const readabilityLevel = this.determineReadabilityLevel(paragraphs);

    // Estimated reading time (250 words per minute)
    const wordCount = content.split(/\s+/).length;
    const estimatedReadingTime = Math.ceil(wordCount / 250);

    // Content density
    const contentDensity = this.determineContentDensity(paragraphs);

    return {
      overallScore: Math.round(overallScore),
      semanticContinuity: Math.round(semanticContinuity),
      structureClarity: Math.round(structureClarity),
      narrativeFlow: Math.round(narrativeFlow),
      topicCoherence: Math.round(topicCoherence),
      readabilityLevel,
      estimatedReadingTime,
      contentDensity,
    };
  }

  /**
   * Calculate topic coherence score
   */
  private calculateTopicCoherence(segments: TopicSegment[]): number {
    if (segments.length === 0) return 50;

    // Check if segments have distinct topics
    const uniqueCategories = new Set(segments.map(s => s.topicCategory)).size;
    const categoryDiversity = uniqueCategories / Math.max(segments.length, 1);

    // Check keyword overlap (should be low between different topics)
    let crossSegmentOverlap = 0;
    let comparisons = 0;

    for (let i = 0; i < segments.length - 1; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        const kw1 = new Set(segments[i].dominantKeywords);
        const kw2 = new Set(segments[j].dominantKeywords);
        const intersection = [...kw1].filter(k => kw2.has(k)).length;
        crossSegmentOverlap += intersection / Math.max(kw1.size, kw2.size);
        comparisons++;
      }
    }

    const avgOverlap = comparisons > 0 ? crossSegmentOverlap / comparisons : 0;
    const topicSeparation = 1 - avgOverlap; // Low overlap = good topic separation

    return (categoryDiversity * 50 + topicSeparation * 50);
  }

  /**
   * Determine overall readability level
   */
  private determineReadabilityLevel(paragraphs: ParagraphSemantics[]): DocumentIntelligence['readabilityLevel'] {
    const levels = paragraphs.map(p => p.vocabularyLevel);
    const counts = {
      simple: levels.filter(l => l === 'simple').length,
      moderate: levels.filter(l => l === 'moderate').length,
      technical: levels.filter(l => l === 'technical').length,
      academic: levels.filter(l => l === 'academic').length,
    };

    // Return most common level
    const max = Math.max(...Object.values(counts));
    return Object.keys(counts).find(k => counts[k] === max) as DocumentIntelligence['readabilityLevel'];
  }

  /**
   * Determine content density
   */
  private determineContentDensity(paragraphs: ParagraphSemantics[]): DocumentIntelligence['contentDensity'] {
    const avgTechnicalDensity = paragraphs.reduce((sum, p) => sum + p.technicalDensity, 0) / paragraphs.length;
    const avgNumericDensity = paragraphs.reduce((sum, p) => sum + p.numericDensity, 0) / paragraphs.length;
    const avgKeywords = paragraphs.reduce((sum, p) => sum + p.keywords.length, 0) / paragraphs.length;

    const densityScore = avgTechnicalDensity * 0.4 + avgNumericDensity * 0.3 + (avgKeywords / 10) * 0.3;

    if (densityScore > 0.6) return 'dense';
    if (densityScore > 0.3) return 'balanced';
    return 'sparse';
  }

  /**
   * Get contextual feedback for the user
   */
  generateContextualFeedback(analysis: SemanticAnalysisResult): string[] {
    const feedback: string[] = [];
    const { inferredStructure, documentIntelligence } = analysis;

    // Structure feedback
    if (inferredStructure.hasImplicitStructure) {
      feedback.push(
        `✅ Content has strong semantic organization (${documentIntelligence.structureClarity}/100). ` +
        `The document flows logically even without explicit section headers.`
      );
    } else if (documentIntelligence.structureClarity < 50) {
      feedback.push(
        `⚠️ Content structure could be improved. Consider adding section headings or reorganizing ` +
        `topic flow for better clarity.`
      );
    } else {
      feedback.push(
        `✅ Content is semantically organized but would benefit from explicit visual section formatting.`
      );
    }

    // Narrative flow feedback
    if (documentIntelligence.narrativeFlow > 70) {
      feedback.push(`✅ Strong narrative flow with smooth topic transitions.`);
    } else if (documentIntelligence.narrativeFlow < 50) {
      feedback.push(`⚠️ Topic transitions could be smoother. Consider adding transitional paragraphs.`);
    }

    // Suggestions
    if (inferredStructure.suggestions.length > 0) {
      feedback.push(...inferredStructure.suggestions.map(s => `💡 ${s}`));
    }

    return feedback;
  }
}
