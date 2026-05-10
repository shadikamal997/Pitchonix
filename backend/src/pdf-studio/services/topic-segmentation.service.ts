import { Injectable, Logger } from '@nestjs/common';
import { ParagraphSemantics, ParagraphSimilarity } from './paragraph-semantic-analyzer.service';

/**
 * Topic segment - a group of paragraphs about the same topic
 */
export interface TopicSegment {
  segmentId: number;
  startParagraphId: number;
  endParagraphId: number;
  paragraphCount: number;
  topicLabel: string;
  dominantKeywords: string[];
  topicCategory: string;
  cohesionScore: number;
}

/**
 * Topic boundary - where topics change
 */
export interface TopicBoundary {
  beforeParagraphId: number;
  afterParagraphId: number;
  boundaryStrength: number; // 0-1, higher = stronger topic shift
  transitionType: 'soft' | 'medium' | 'hard';
}

/**
 * TopicSegmentationService
 * 
 * Detects topic boundaries and segments document into coherent topic groups.
 * Uses deterministic similarity analysis - NO AI.
 * 
 * Algorithm:
 * 1. Analyze paragraph-to-paragraph similarity
 * 2. Detect sharp drops in similarity (topic boundaries)
 * 3. Group consecutive similar paragraphs into segments
 * 4. Generate topic labels from segment keywords
 */
@Injectable()
export class TopicSegmentationService {
  private readonly logger = new Logger(TopicSegmentationService.name);

  // Threshold for detecting topic boundaries
  private readonly BOUNDARY_THRESHOLD = 0.15; // Similarity below this = boundary
  private readonly SOFT_BOUNDARY_THRESHOLD = 0.25;
  private readonly HARD_BOUNDARY_THRESHOLD = 0.10;

  /**
   * Segment document into topics
   */
  segmentByTopics(
    paragraphSemantics: ParagraphSemantics[],
    similarities: ParagraphSimilarity[],
  ): TopicSegment[] {
    if (paragraphSemantics.length === 0) {
      return [];
    }

    this.logger.log(`Segmenting ${paragraphSemantics.length} paragraphs into topics...`);

    // Step 1: Detect topic boundaries
    const boundaries = this.detectTopicBoundaries(similarities);

    this.logger.log(`✓ Detected ${boundaries.length} topic boundaries`);

    // Step 2: Create segments between boundaries
    const segments = this.createSegments(paragraphSemantics, boundaries);

    this.logger.log(`✓ Created ${segments.length} topic segments`);

    return segments;
  }

  /**
   * Detect topic boundaries from similarity scores
   */
  private detectTopicBoundaries(similarities: ParagraphSimilarity[]): TopicBoundary[] {
    const boundaries: TopicBoundary[] = [];

    for (const sim of similarities) {
      if (sim.similarityScore < this.BOUNDARY_THRESHOLD || sim.transitionType === 'break') {
        // Determine boundary strength
        const boundaryStrength = 1 - sim.similarityScore;

        // Classify transition type
        let transitionType: 'soft' | 'medium' | 'hard';
        if (sim.similarityScore < this.HARD_BOUNDARY_THRESHOLD) {
          transitionType = 'hard';
        } else if (sim.similarityScore < this.BOUNDARY_THRESHOLD) {
          transitionType = 'medium';
        } else {
          transitionType = 'soft';
        }

        boundaries.push({
          beforeParagraphId: sim.paragraph1Id,
          afterParagraphId: sim.paragraph2Id,
          boundaryStrength,
          transitionType,
        });
      }
    }

    return boundaries;
  }

  /**
   * Create segments between boundaries
   */
  private createSegments(
    paragraphs: ParagraphSemantics[],
    boundaries: TopicBoundary[],
  ): TopicSegment[] {
    const segments: TopicSegment[] = [];

    let currentSegmentStart = 0;
    const boundaryIndices = boundaries.map(b => b.afterParagraphId);

    for (const boundaryIndex of boundaryIndices) {
      if (boundaryIndex > currentSegmentStart) {
        const segment = this.buildSegment(
          paragraphs.slice(currentSegmentStart, boundaryIndex),
          segments.length,
          currentSegmentStart,
        );
        segments.push(segment);
        currentSegmentStart = boundaryIndex;
      }
    }

    // Add final segment
    if (currentSegmentStart < paragraphs.length) {
      const segment = this.buildSegment(
        paragraphs.slice(currentSegmentStart),
        segments.length,
        currentSegmentStart,
      );
      segments.push(segment);
    }

    return segments;
  }

  /**
   * Build a single segment from paragraphs
   */
  private buildSegment(
    paragraphs: ParagraphSemantics[],
    segmentId: number,
    startParagraphId: number,
  ): TopicSegment {
    const endParagraphId = startParagraphId + paragraphs.length - 1;

    // Aggregate keywords
    const allKeywords = paragraphs.flatMap(p => p.keywords);
    const keywordFreq = new Map<string, number>();
    for (const kw of allKeywords) {
      keywordFreq.set(kw, (keywordFreq.get(kw) || 0) + 1);
    }

    const dominantKeywords = Array.from(keywordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(e => e[0]);

    // Determine topic category (most common)
    const categoryFreq = new Map<string, number>();
    for (const p of paragraphs) {
      categoryFreq.set(p.topicCategory, (categoryFreq.get(p.topicCategory) || 0) + 1);
    }

    const topicCategory = Array.from(categoryFreq.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'General';

    // Generate topic label
    const topicLabel = this.generateTopicLabel(dominantKeywords, topicCategory, paragraphs);

    // Calculate cohesion score
    const cohesionScore = this.calculateCohesionScore(paragraphs);

    return {
      segmentId,
      startParagraphId,
      endParagraphId,
      paragraphCount: paragraphs.length,
      topicLabel,
      dominantKeywords,
      topicCategory,
      cohesionScore,
    };
  }

  /**
   * Generate a human-readable topic label
   */
  private generateTopicLabel(
    keywords: string[],
    category: string,
    paragraphs: ParagraphSemantics[],
  ): string {
    // If category is specific, use it
    if (category !== 'General') {
      // Make it more specific with top keyword
      if (keywords.length > 0) {
        const topKeyword = this.capitalize(keywords[0]);
        return `${topKeyword} in ${category}`;
      }
      return category;
    }

    // Generate from keywords
    if (keywords.length >= 2) {
      return `${this.capitalize(keywords[0])} & ${this.capitalize(keywords[1])}`;
    } else if (keywords.length === 1) {
      return this.capitalize(keywords[0]);
    }

    // Fallback: use first entity term
    for (const p of paragraphs) {
      if (p.entityTerms.length > 0) {
        return p.entityTerms[0];
      }
    }

    return 'Content';
  }

  /**
   * Calculate cohesion score for segment (how related paragraphs are)
   */
  private calculateCohesionScore(paragraphs: ParagraphSemantics[]): number {
    if (paragraphs.length < 2) {
      return 1.0;
    }

    // Calculate average keyword overlap between paragraphs
    let totalOverlap = 0;
    let comparisons = 0;

    for (let i = 0; i < paragraphs.length - 1; i++) {
      const kw1 = new Set(paragraphs[i].keywords);
      const kw2 = new Set(paragraphs[i + 1].keywords);
      const intersection = new Set([...kw1].filter(k => kw2.has(k)));
      const union = new Set([...kw1, ...kw2]);

      if (union.size > 0) {
        totalOverlap += intersection.size / union.size;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalOverlap / comparisons : 0.5;
  }

  /**
   * Capitalize first letter
   */
  private capitalize(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  /**
   * Merge small segments into adjacent ones
   */
  mergeSmallSegments(segments: TopicSegment[], minParagraphs: number = 2): TopicSegment[] {
    if (segments.length <= 1) {
      return segments;
    }

    const merged: TopicSegment[] = [];
    let current = segments[0];

    for (let i = 1; i < segments.length; i++) {
      const next = segments[i];

      // If current is too small, merge with next
      if (current.paragraphCount < minParagraphs) {
        current = {
          ...current,
          endParagraphId: next.endParagraphId,
          paragraphCount: current.paragraphCount + next.paragraphCount,
          dominantKeywords: [...new Set([...current.dominantKeywords, ...next.dominantKeywords])].slice(0, 5),
          cohesionScore: (current.cohesionScore + next.cohesionScore) / 2,
        };
      } else {
        merged.push(current);
        current = next;
      }
    }

    merged.push(current);

    // Re-number segments
    return merged.map((seg, index) => ({ ...seg, segmentId: index }));
  }
}
