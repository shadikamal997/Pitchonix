import { Injectable, Logger } from '@nestjs/common';
import { TopicSegment } from './topic-segmentation.service';

/**
 * Semantic section - a logical section inferred from content
 */
export interface SemanticSection {
  sectionId: number;
  title: string;
  sectionType: 'introduction' | 'body' | 'conclusion' | 'methodology' | 'analysis' | 'discussion' | 'summary';
  startParagraphId: number;
  endParagraphId: number;
  paragraphCount: number;
  keywords: string[];
  confidence: number; // 0-1, how confident we are about this section
}

/**
 * Document structure inference result
 */
export interface InferredStructure {
  sections: SemanticSection[];
  documentType: 'article' | 'report' | 'proposal' | 'research' | 'essay' | 'guide' | 'general';
  hasImplicitStructure: boolean;
  structureQuality: number; // 0-1
  narrativeFlow: number; // 0-1
  suggestions: string[];
}

/**
 * SectionInferenceService
 * 
 * Infers logical document sections from semantic analysis.
 * NO AI - uses deterministic rules based on:
 * - Position in document
 * - Vocabulary patterns
 * - Topic transitions
 * - Content characteristics
 */
@Injectable()
export class SectionInferenceService {
  private readonly logger = new Logger(SectionInferenceService.name);

  /**
   * Infer document structure from topic segments
   */
  inferStructure(
    segments: TopicSegment[],
    totalParagraphs: number,
  ): InferredStructure {
    this.logger.log(`Inferring document structure from ${segments.length} segments...`);

    // Detect document type
    const documentType = this.detectDocumentType(segments);

    // Infer sections based on document type
    const sections = this.inferSections(segments, documentType, totalParagraphs);

    // Calculate structure quality
    const structureQuality = this.calculateStructureQuality(sections, segments);

    // Calculate narrative flow
    const narrativeFlow = this.calculateNarrativeFlow(segments);

    // Generate suggestions
    const suggestions = this.generateSuggestions(sections, segments, structureQuality, narrativeFlow);

    const hasImplicitStructure = sections.length > 2 && structureQuality > 0.5;

    this.logger.log(`✓ Inferred ${sections.length} semantic sections (type: ${documentType})`);

    return {
      sections,
      documentType,
      hasImplicitStructure,
      structureQuality,
      narrativeFlow,
      suggestions,
    };
  }

  /**
   * Detect document type from semantic patterns
   */
  private detectDocumentType(segments: TopicSegment[]): InferredStructure['documentType'] {
    const allKeywords = segments.flatMap(s => s.dominantKeywords).map(k => k.toLowerCase());

    // Research paper
    if (this.hasPattern(allKeywords, ['research', 'study', 'methodology', 'findings', 'results', 'analysis'])) {
      return 'research';
    }

    // Business proposal
    if (this.hasPattern(allKeywords, ['proposal', 'solution', 'pricing', 'implementation', 'benefits', 'timeline'])) {
      return 'proposal';
    }

    // Technical report
    if (this.hasPattern(allKeywords, ['report', 'analysis', 'metrics', 'performance', 'system', 'evaluation'])) {
      return 'report';
    }

    // Guide/Tutorial
    if (this.hasPattern(allKeywords, ['guide', 'steps', 'tutorial', 'instructions', 'process', 'how'])) {
      return 'guide';
    }

    // Essay/Article
    if (segments.length >= 3 && segments.length <= 8) {
      return 'article';
    }

    // Long-form essay
    if (segments.length > 8) {
      return 'essay';
    }

    return 'general';
  }

  /**
   * Infer sections based on document type and content
   */
  private inferSections(
    segments: TopicSegment[],
    documentType: InferredStructure['documentType'],
    totalParagraphs: number,
  ): SemanticSection[] {
    const sections: SemanticSection[] = [];

    // Apply document-type-specific section inference
    switch (documentType) {
      case 'research':
        return this.inferResearchSections(segments);
      case 'proposal':
        return this.inferProposalSections(segments);
      case 'article':
      case 'essay':
        return this.inferArticleSections(segments, totalParagraphs);
      case 'report':
        return this.inferReportSections(segments);
      default:
        return this.inferGenericSections(segments, totalParagraphs);
    }
  }

  /**
   * Infer sections for research papers
   */
  private inferResearchSections(segments: TopicSegment[]): SemanticSection[] {
    const sections: SemanticSection[] = [];
    let sectionId = 0;

    for (const segment of segments) {
      const keywords = segment.dominantKeywords.map(k => k.toLowerCase());

      let sectionType: SemanticSection['sectionType'] = 'body';
      let title = segment.topicLabel;

      // Introduction
      if (this.hasPattern(keywords, ['introduction', 'background', 'overview']) || segment.segmentId === 0) {
        sectionType = 'introduction';
        title = 'Introduction';
      }
      // Methodology
      else if (this.hasPattern(keywords, ['methodology', 'method', 'approach', 'procedure'])) {
        sectionType = 'methodology';
        title = 'Methodology';
      }
      // Analysis/Results
      else if (this.hasPattern(keywords, ['analysis', 'results', 'findings', 'data'])) {
        sectionType = 'analysis';
        title = 'Analysis & Findings';
      }
      // Discussion
      else if (this.hasPattern(keywords, ['discussion', 'implications', 'interpretation'])) {
        sectionType = 'discussion';
        title = 'Discussion';
      }
      // Conclusion
      else if (this.hasPattern(keywords, ['conclusion', 'summary', 'future']) || segment.segmentId === segments.length - 1) {
        sectionType = 'conclusion';
        title = 'Conclusion';
      }

      sections.push({
        sectionId: sectionId++,
        title,
        sectionType,
        startParagraphId: segment.startParagraphId,
        endParagraphId: segment.endParagraphId,
        paragraphCount: segment.paragraphCount,
        keywords: segment.dominantKeywords,
        confidence: segment.cohesionScore,
      });
    }

    return sections;
  }

  /**
   * Infer sections for business proposals
   */
  private inferProposalSections(segments: TopicSegment[]): SemanticSection[] {
    const sections: SemanticSection[] = [];
    const commonStructure = ['Overview', 'Problem', 'Solution', 'Implementation', 'Pricing', 'Conclusion'];

    segments.forEach((segment, index) => {
      const title = index < commonStructure.length ? commonStructure[index] : segment.topicLabel;
      const sectionType: SemanticSection['sectionType'] = index === 0 ? 'introduction' : 
        index === segments.length - 1 ? 'conclusion' : 'body';

      sections.push({
        sectionId: index,
        title,
        sectionType,
        startParagraphId: segment.startParagraphId,
        endParagraphId: segment.endParagraphId,
        paragraphCount: segment.paragraphCount,
        keywords: segment.dominantKeywords,
        confidence: segment.cohesionScore,
      });
    });

    return sections;
  }

  /**
   * Infer sections for articles/essays
   */
  private inferArticleSections(segments: TopicSegment[], totalParagraphs: number): SemanticSection[] {
    const sections: SemanticSection[] = [];

    segments.forEach((segment, index) => {
      let sectionType: SemanticSection['sectionType'] = 'body';
      let title = segment.topicLabel;

      // First segment = introduction
      if (index === 0) {
        sectionType = 'introduction';
        title = 'Introduction';
      }
      // Last segment = conclusion
      else if (index === segments.length - 1) {
        sectionType = 'conclusion';
        title = 'Conclusion';
      }
      // Check for summary patterns
      else if (this.hasPattern(segment.dominantKeywords.map(k => k.toLowerCase()), ['summary', 'overview'])) {
        sectionType = 'summary';
      }

      sections.push({
        sectionId: index,
        title,
        sectionType,
        startParagraphId: segment.startParagraphId,
        endParagraphId: segment.endParagraphId,
        paragraphCount: segment.paragraphCount,
        keywords: segment.dominantKeywords,
        confidence: segment.cohesionScore,
      });
    });

    return sections;
  }

  /**
   * Infer sections for reports
   */
  private inferReportSections(segments: TopicSegment[]): SemanticSection[] {
    return this.inferGenericSections(segments, segments.reduce((sum, s) => sum + s.paragraphCount, 0));
  }

  /**
   * Infer sections for generic documents
   */
  private inferGenericSections(segments: TopicSegment[], totalParagraphs: number): SemanticSection[] {
    const sections: SemanticSection[] = [];

    segments.forEach((segment, index) => {
      const sectionType: SemanticSection['sectionType'] = 
        index === 0 ? 'introduction' :
        index === segments.length - 1 ? 'conclusion' : 'body';

      sections.push({
        sectionId: index,
        title: segment.topicLabel,
        sectionType,
        startParagraphId: segment.startParagraphId,
        endParagraphId: segment.endParagraphId,
        paragraphCount: segment.paragraphCount,
        keywords: segment.dominantKeywords,
        confidence: segment.cohesionScore,
      });
    });

    return sections;
  }

  /**
   * Calculate structure quality score
   */
  private calculateStructureQuality(sections: SemanticSection[], segments: TopicSegment[]): number {
    let score = 0.5; // Base score

    // More sections = better structure
    if (sections.length >= 3) score += 0.2;
    if (sections.length >= 5) score += 0.1;

    // Has introduction and conclusion
    const hasIntro = sections.some(s => s.sectionType === 'introduction');
    const hasConclusion = sections.some(s => s.sectionType === 'conclusion');
    if (hasIntro) score += 0.1;
    if (hasConclusion) score += 0.1;

    // High cohesion = better structure
    const avgCohesion = segments.reduce((sum, s) => sum + s.cohesionScore, 0) / segments.length;
    score += avgCohesion * 0.2;

    return Math.min(1.0, score);
  }

  /**
   * Calculate narrative flow score
   */
  private calculateNarrativeFlow(segments: TopicSegment[]): number {
    if (segments.length < 2) return 1.0;

    // Check for balanced segment sizes
    const sizes = segments.map(s => s.paragraphCount);
    const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const sizeVariance = sizes.reduce((sum, size) => sum + Math.abs(size - avgSize), 0) / sizes.length;
    const balanceScore = Math.max(0, 1 - sizeVariance / avgSize);

    // Check cohesion scores
    const avgCohesion = segments.reduce((sum, s) => sum + s.cohesionScore, 0) / segments.length;

    return (balanceScore + avgCohesion) / 2;
  }

  /**
   * Generate suggestions for improvement
   */
  private generateSuggestions(
    sections: SemanticSection[],
    segments: TopicSegment[],
    structureQuality: number,
    narrativeFlow: number,
  ): string[] {
    const suggestions: string[] = [];

    if (sections.length < 3) {
      suggestions.push('Consider organizing content into more distinct sections for better readability');
    }

    if (!sections.some(s => s.sectionType === 'introduction')) {
      suggestions.push('Add an introduction section to provide context');
    }

    if (!sections.some(s => s.sectionType === 'conclusion')) {
      suggestions.push('Add a conclusion section to summarize key points');
    }

    if (structureQuality < 0.5) {
      suggestions.push('Content structure could be improved with clearer topic transitions');
    }

    if (narrativeFlow < 0.5) {
      suggestions.push('Consider balancing section sizes for better narrative flow');
    }

    return suggestions;
  }

  /**
   * Check if keywords match a pattern
   */
  private hasPattern(keywords: string[], pattern: string[]): boolean {
    return pattern.some(p => keywords.some(k => k.includes(p)));
  }
}
