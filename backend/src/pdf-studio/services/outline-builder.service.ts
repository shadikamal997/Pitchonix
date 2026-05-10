import { Injectable, Logger } from '@nestjs/common';
import { ContentBlock } from './content-block-extractor.service';
import { ContentAnalysisResult } from './content-analysis.service';

export interface OutlineSection {
  id: string;
  title: string;
  sectionType: string;
  blocks: ContentBlock[];
  level: number;
  wordCount: number;
  estimatedPages: number;
}

export interface DocumentOutline {
  title: string;
  documentType: string;
  sections: OutlineSection[];
  totalWordCount: number;
  estimatedTotalPages: number;
  hasExplicitStructure: boolean;
}

/**
 * OutlineBuilderService
 *
 * Converts content blocks into a logical document outline.
 * If user supplied headings → respects them exactly.
 * If no headings → intelligently groups blocks by topic using
 * document-type templates and keyword transitions.
 * NEVER discards content.
 */
@Injectable()
export class OutlineBuilderService {
  private readonly logger = new Logger(OutlineBuilderService.name);

  buildOutline(blocks: ContentBlock[], analysis: ContentAnalysisResult): DocumentOutline {
    if (!blocks || blocks.length === 0) {
      return this.emptyOutline(analysis);
    }

    const hasHeadings = blocks.some(b =>
      b.type === 'title' || b.type === 'heading' || b.type === 'subheading',
    );

    // Priority: explicit headings > semantic sections > template-based grouping
    // When users provide headings, respect them exactly!
    let sections: OutlineSection[];
    if (hasHeadings) {
      this.logger.log(`Building outline from ${blocks.filter(b => b.type === 'title' || b.type === 'heading').length} explicit headings`);
      sections = this.buildFromHeadings(blocks, analysis);
    } else if (analysis.semanticAnalysis?.semanticSections && analysis.semanticAnalysis.semanticSections.length > 0) {
      this.logger.log(`Using ${analysis.semanticAnalysis.semanticSections.length} semantic sections (no explicit headings)`);
      sections = this.buildFromSemanticSections(blocks, analysis);
    } else {
      sections = this.buildFromContent(blocks, analysis);
    }

    const totalWordCount = blocks.reduce((s, b) => s + b.wordCount, 0);
    const title = this.extractTitle(blocks, analysis);

    const outline: DocumentOutline = {
      title,
      documentType: analysis.detectedType,
      sections,
      totalWordCount,
      estimatedTotalPages: sections.reduce((t, s) => t + s.estimatedPages, 0),
      hasExplicitStructure: hasHeadings || (analysis.semanticAnalysis?.semanticSections?.length > 0),
    };

    this.logger.log(
      `Built outline: "${title}" · ${sections.length} sections · ${totalWordCount} words · explicit=${hasHeadings}`,
    );

    return outline;
  }

  // ── Heading-aware outline ──────────────────────────────────────────────────

  private buildFromHeadings(blocks: ContentBlock[], analysis: ContentAnalysisResult): OutlineSection[] {
    const sections: OutlineSection[] = [];
    let current: OutlineSection | null = null;
    let sIdx = 0;

    const pushCurrent = () => {
      if (current) {
        this.finalizeSection(current);
        if (current.wordCount > 0 || current.blocks.length > 0) {
          sections.push(current);
        }
        current = null;
      }
    };

    for (const block of blocks) {
      const isTopHeading = block.type === 'title' || block.type === 'heading';
      const isSub = block.type === 'subheading';

      if (isTopHeading) {
        pushCurrent();
        current = this.newSection(sIdx++, block.cleanText, this.inferType(block.cleanText));
        current.blocks.push(block); // Include heading block in content!
      } else if (isSub && !current) {
        // Subheading with no parent — create implicit section
        current = this.newSection(sIdx++, block.cleanText, this.inferType(block.cleanText));
        current.level = 2;
        current.blocks.push(block); // Include subheading in content!
      } else {
        // Content block
        if (!current) {
          // Content before any heading — implicit intro
          current = this.newSection(sIdx++, 'Introduction', 'intro');
        }
        if (isSub) {
          current.blocks.push(block); // subheadings stay in their parent section
        } else {
          current.blocks.push(block);
        }
      }
    }

    pushCurrent();
    const rawSections = sections.filter(s => s.blocks.length > 0);
    
    // Merge adjacent short sections to avoid sparse pages
    // (sections with <200 words get merged with neighbors)
    return this.mergeShortSections(rawSections);
  }

  /**
   * Merge adjacent short sections together to avoid sparse pages.
   * Target: 200-600 words per section for good page density.
   * Strategy: Only merge sections that are VERY short (<100 words)
   */
  private mergeShortSections(sections: OutlineSection[]): OutlineSection[] {
    if (sections.length <= 1) return sections;

    const VERY_SHORT_THRESHOLD = 80; // Only merge if section is < 80 words
    const MAX_MERGED_WORDS = 500;
    const merged: OutlineSection[] = [];
    let i = 0;

    while (i < sections.length) {
      let current = sections[i];
      
      // Only merge if current section is VERY short
      while (
        i + 1 < sections.length &&
        current.wordCount < VERY_SHORT_THRESHOLD &&
        current.wordCount + sections[i + 1].wordCount <= MAX_MERGED_WORDS
      ) {
        const next = sections[i + 1];
        
        // Merge: combine blocks and update metadata
        current = {
          ...current,
          title: current.title, // Keep first section's title
          blocks: [...current.blocks, ...next.blocks],
          wordCount: current.wordCount + next.wordCount,
        };
        
        i++; // Skip the merged section
      }
      
      // Re-finalize after merging
      this.finalizeSection(current);
      merged.push(current);
      i++;
    }

    if (merged.length !== sections.length) {
      this.logger.log(`Merged ${sections.length} sections into ${merged.length} sections (threshold: ${VERY_SHORT_THRESHOLD} words)`);
    }
    return merged;
  }

  // ── Content-driven outline (no user headings) ──────────────────────────────

  private buildFromContent(blocks: ContentBlock[], analysis: ContentAnalysisResult): OutlineSection[] {
    const template = this.getTemplate(analysis.detectedType, blocks.length);
    if (!template.length) return this.singleSection(blocks, analysis);

    const totalWords = blocks.reduce((s, b) => s + b.wordCount, 0);
    const targetPerSection = Math.max(120, Math.ceil(totalWords / template.length));

    const sections: OutlineSection[] = [];
    let bIdx = 0;
    let sIdx = 0;

    for (let t = 0; t < template.length; t++) {
      if (bIdx >= blocks.length) break;

      const tmpl = template[t];
      const isLast = t === template.length - 1;
      const section = this.newSection(sIdx++, tmpl.title, tmpl.type);

      while (bIdx < blocks.length) {
        const block = blocks[bIdx];
        const wouldExceed = section.wordCount + block.wordCount > targetPerSection * 1.4;
        const hasEnough  = section.wordCount >= targetPerSection * 0.6;

        if (wouldExceed && hasEnough && !isLast) {
          // Never break after a heading that must stay with next block
          const prevBlock = section.blocks[section.blocks.length - 1];
          if (prevBlock?.mustStayWithNext) {
            section.blocks.push(block);
            section.wordCount += block.wordCount;
            bIdx++;
          }
          break;
        }

        section.blocks.push(block);
        section.wordCount += block.wordCount;
        bIdx++;
      }

      if (section.blocks.length > 0) {
        this.finalizeSection(section);
        sections.push(section);
      }
    }

    // Remaining blocks go into the last section
    if (bIdx < blocks.length && sections.length > 0) {
      const last = sections[sections.length - 1];
      const remaining = blocks.slice(bIdx);
      last.blocks.push(...remaining);
      last.wordCount += remaining.reduce((s, b) => s + b.wordCount, 0);
      this.finalizeSection(last);
    }

    return sections;
  }

  // ── Semantic-aware outline (NEW - uses AI-detected sections!) ──────────────

  private buildFromSemanticSections(blocks: ContentBlock[], analysis: ContentAnalysisResult): OutlineSection[] {
    const semanticSections = analysis.semanticAnalysis.semanticSections;
    
    // Semantic sections are too granular (one per paragraph/topic segment)
    // We need to aggregate them into document-level sections (5-10 sections total)
    const aggregatedSections = this.aggregateSemanticSections(semanticSections);
    
    this.logger.log(`Aggregated ${semanticSections.length} semantic sections into ${aggregatedSections.length} document-level sections`);
    
    const sections: OutlineSection[] = [];
    
    // Distribute blocks evenly across aggregated sections
    const totalBlocks = blocks.length;
    const blocksPerSection = Math.ceil(totalBlocks / aggregatedSections.length);
    
    for (let sIdx = 0; sIdx < aggregatedSections.length; sIdx++) {
      const aggSection = aggregatedSections[sIdx];
      const startIdx = sIdx * blocksPerSection;
      const endIdx = Math.min(startIdx + blocksPerSection, totalBlocks);
      const blocksInSection = blocks.slice(startIdx, endIdx);
      
      if (blocksInSection.length > 0) {
        const wordCount = blocksInSection.reduce((sum, b) => sum + b.wordCount, 0);
        const outlineSection = this.newSection(
          sIdx,
          aggSection.title,
          this.mapSemanticTypeToOutlineType(aggSection.sectionType)
        );
        outlineSection.blocks = blocksInSection;
        outlineSection.wordCount = wordCount;
        this.finalizeSection(outlineSection);
        sections.push(outlineSection);
      }
    }
    
    return sections;
  }

  /**
   * Aggregate fine-grained semantic sections into document-level sections
   * Merges adjacent sections with similar types/themes
   */
  private aggregateSemanticSections(semanticSections: any[]): Array<{
    title: string;
    sectionType: string;
    startParagraphId: number;
    endParagraphId: number;
  }> {
    if (semanticSections.length === 0) return [];
    
    const aggregated: Array<{
      title: string;
      sectionType: string;
      startParagraphId: number;
      endParagraphId: number;
      semanticSectionIds: number[];
    }> = [];
    
    let current = {
      title: semanticSections[0].title,
      sectionType: semanticSections[0].sectionType,
      startParagraphId: semanticSections[0].startParagraphId,
      endParagraphId: semanticSections[0].endParagraphId,
      semanticSectionIds: [0],
    };
    
    for (let i = 1; i < semanticSections.length; i++) {
      const semSection = semanticSections[i];
      // Merge only if same type AND haven't merged too many already (max 2-3 per aggregate)
      const shouldMerge = 
        semSection.sectionType === current.sectionType && 
        current.semanticSectionIds.length < 3; // Max 3 semantic sections per aggregate section
      
      if (shouldMerge) {
        // Merge into current
        current.endParagraphId = semSection.endParagraphId;
        current.semanticSectionIds.push(i);
      } else {
        // Push current and start new
        aggregated.push(current);
        current = {
          title: semSection.title,
          sectionType: semSection.sectionType,
          startParagraphId: semSection.startParagraphId,
          endParagraphId: semSection.endParagraphId,
          semanticSectionIds: [i],
        };
      }
    }
    
    // Push last
    aggregated.push(current);
    
    // Generate better titles for aggregated sections
    return aggregated.map((agg, idx) => ({
      title: this.generateAggregatedTitle(agg.sectionType, idx, aggregated.length),
      sectionType: agg.sectionType,
      startParagraphId: agg.startParagraphId,
      endParagraphId: agg.endParagraphId,
    }));
  }

  /**
   * Generate a descriptive title for an aggregated section
   */
  private generateAggregatedTitle(sectionType: string, index: number, total: number): string {
    if (index === 0) return 'Introduction';
    if (index === total - 1) return 'Conclusion';
    
    const titles: Record<string, string[]> = {
      introduction: ['Introduction', 'Overview', 'Background'],
      body: ['Analysis', 'Discussion', 'Key Findings', 'Details', 'Content'],
      conclusion: ['Conclusion', 'Summary', 'Final Thoughts'],
      methodology: ['Methodology', 'Approach', 'Methods'],
      analysis: ['Analysis', 'Findings', 'Results'],
      discussion: ['Discussion', 'Implications', 'Insights'],
      summary: ['Summary', 'Overview', 'Key Points'],
    };
    
    const options = titles[sectionType] || titles.body;
    return options[index % options.length];
  }

  /**
   * Map semantic section types to outline section types
   */
  private mapSemanticTypeToOutlineType(semanticType: string): string {
    const map: Record<string, string> = {
      introduction: 'intro',
      body: 'content',
      conclusion: 'conclusion',
      methodology: 'content',
      analysis: 'content',
      discussion: 'content',
      summary: 'summary',
    };
    return map[semanticType] || 'content';
  }

  // ── Templates ─────────────────────────────────────────────────────────────

  private getTemplate(docType: string, blockCount: number): Array<{ title: string; type: string }> {
    const small = blockCount < 8;

    const map: Record<string, Array<{ title: string; type: string }>> = {
      startup: small ? [
        { title: 'Overview',        type: 'summary'    },
        { title: 'Problem & Solution', type: 'content' },
        { title: 'Next Steps',      type: 'conclusion' },
      ] : [
        { title: 'Executive Summary',    type: 'summary'    },
        { title: 'Problem Statement',    type: 'content'    },
        { title: 'Our Solution',         type: 'content'    },
        { title: 'Market Opportunity',   type: 'content'    },
        { title: 'Business Model',       type: 'content'    },
        { title: 'Go-To-Market',         type: 'content'    },
        { title: 'Team',                 type: 'content'    },
        { title: 'Financial Overview',   type: 'financial'  },
        { title: 'Call to Action',       type: 'conclusion' },
      ],
      business: small ? [
        { title: 'Overview',    type: 'summary'    },
        { title: 'Details',     type: 'content'    },
        { title: 'Conclusion',  type: 'conclusion' },
      ] : [
        { title: 'Executive Summary',  type: 'summary'    },
        { title: 'Company Overview',   type: 'content'    },
        { title: 'Products & Services',type: 'content'    },
        { title: 'Market Analysis',    type: 'content'    },
        { title: 'Strategy',           type: 'content'    },
        { title: 'Financial Highlights',type: 'financial' },
        { title: 'Conclusion',         type: 'conclusion' },
      ],
      academic: [
        { title: 'Abstract',          type: 'summary'    },
        { title: 'Introduction',      type: 'intro'      },
        { title: 'Background',        type: 'content'    },
        { title: 'Methodology',       type: 'content'    },
        { title: 'Results & Analysis',type: 'content'    },
        { title: 'Discussion',        type: 'content'    },
        { title: 'Conclusion',        type: 'conclusion' },
      ],
      report: [
        { title: 'Executive Summary', type: 'summary'    },
        { title: 'Key Findings',      type: 'content'    },
        { title: 'Analysis',          type: 'content'    },
        { title: 'Recommendations',   type: 'conclusion' },
      ],
      technical: [
        { title: 'Overview',       type: 'summary' },
        { title: 'Requirements',   type: 'content' },
        { title: 'Implementation', type: 'content' },
        { title: 'Configuration',  type: 'content' },
        { title: 'Usage & Examples',type: 'content'},
      ],
      notes: [
        { title: 'Key Points',   type: 'content'    },
        { title: 'Details',      type: 'content'    },
        { title: 'Action Items', type: 'conclusion' },
      ],
    };

    return map[docType] || [
      { title: 'Introduction',     type: 'intro'      },
      { title: 'Main Content',     type: 'content'    },
      { title: 'Additional Details',type: 'content'   },
      { title: 'Summary',          type: 'conclusion' },
    ];
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private newSection(idx: number, title: string, type: string, level = 1): OutlineSection {
    return { id: `section-${idx}`, title, sectionType: type, blocks: [], level, wordCount: 0, estimatedPages: 1 };
  }

  private finalizeSection(section: OutlineSection): void {
    section.wordCount = section.blocks.reduce((s, b) => s + b.wordCount, 0);
    section.estimatedPages = Math.max(1, Math.ceil(section.wordCount / 320));
  }

  private inferType(title: string): string {
    const l = title.toLowerCase();
    if (/summary|abstract|overview|executive/.test(l)) return 'summary';
    if (/intro|background|context/.test(l))            return 'intro';
    if (/conclusion|closing|next step|cta|call to/.test(l)) return 'conclusion';
    if (/financial|budget|revenue|cost|pricing/.test(l))    return 'financial';
    if (/timeline|roadmap|schedule|milestone/.test(l))      return 'timeline';
    if (/data|analysis|metrics|result|finding/.test(l))     return 'chart';
    if (/reference|bibliography|citation/.test(l))          return 'references';
    return 'content';
  }

  private extractTitle(blocks: ContentBlock[], analysis: ContentAnalysisResult): string {
    const titleBlock = blocks.find(b => b.type === 'title');
    if (titleBlock) return titleBlock.cleanText;
    if (analysis.suggestedTitle && analysis.suggestedTitle !== 'Untitled Document') {
      return analysis.suggestedTitle;
    }
    const firstPara = blocks.find(b => b.type === 'paragraph' && b.wordCount > 3);
    if (firstPara) {
      const words = firstPara.cleanText.split(/\s+/).slice(0, 7).join(' ');
      return words.charAt(0).toUpperCase() + words.slice(1);
    }
    return 'Untitled Document';
  }

  private singleSection(blocks: ContentBlock[], analysis: ContentAnalysisResult): OutlineSection[] {
    const s = this.newSection(0, 'Content', 'content');
    s.blocks = blocks;
    this.finalizeSection(s);
    return [s];
  }

  private emptyOutline(analysis: ContentAnalysisResult): DocumentOutline {
    return {
      title: analysis.suggestedTitle || 'Untitled Document',
      documentType: analysis.detectedType,
      sections: [],
      totalWordCount: 0,
      estimatedTotalPages: 1,
      hasExplicitStructure: false,
    };
  }
}
