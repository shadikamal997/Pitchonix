/**
 * Document Converter Service
 * 
 * Converts legacy PageComposition format to block-based PageData format.
 * This enables editing of generated documents.
 */

import {
  PageData,
  PageBlock,
  BlockType,
  PageCompositionLegacy,
  ComposedSectionLegacy,
  BlockStyles,
  PageType,
} from '@/types/document-editor';

/**
 * Convert legacy composition to editable document format
 */
export function convertCompositionToDocument(
  compositions: PageCompositionLegacy[]
): PageData[] {
  return compositions.map((comp, index) => convertPageComposition(comp, index));
}

/**
 * Convert single page composition to PageData
 */
export function convertPageComposition(
  comp: PageCompositionLegacy,
  index: number
): PageData {
  const pageType = inferPageType(comp, index);
  const blocks = comp.sections.map((section, sIdx) => 
    convertSectionToBlock(section, sIdx)
  );

  return {
    id: `page-${comp.pageNumber}`,
    pageNumber: comp.pageNumber,
    title: extractPageTitle(comp.sections),
    pageType,
    blocks,
    pageStyles: {
      theme: 'default',
      backgroundColor: '#ffffff',
      margins: { top: 64, right: 64, bottom: 64, left: 64 },
      layout: comp.layout === 'cover' ? 'standard' : 'standard',
    },
  };
}

/**
 * Convert section to editable block
 */
export function convertSectionToBlock(
  section: ComposedSectionLegacy,
  order: number
): PageBlock {
  const blockType = inferBlockType(section);
  
  return {
    id: section.id,
    type: blockType,
    content: section.content,
    styles: {
      fontSize: section.fontSize,
      fontWeight: section.fontWeight as any,
      fontFamily: 'Inter',
      textAlign: section.textAlign as any,
      color: section.color,
      lineHeight: section.lineHeight,
      spaceBefore: section.spaceBefore,
      spaceAfter: section.spaceAfter,
    },
    order,
  };
}

/**
 * Infer block type from section
 */
function inferBlockType(section: ComposedSectionLegacy): BlockType {
  const fontSize = section.fontSize;
  const content = section.content.toLowerCase();
  
  // Heading detection based on font size
  if (fontSize >= 2.0) return 'heading'; // H1
  if (fontSize >= 1.5) return 'heading'; // H2
  if (fontSize >= 1.2) return 'heading'; // H3
  
  // List detection
  if (content.match(/^[•◦▪▸]\s/)) return 'bullet';
  if (content.match(/^\d+\.\s/)) return 'numbered';
  
  // Divider detection
  if (content.match(/^[-─═]+$/)) return 'divider';
  
  // Default to paragraph
  return 'paragraph';
}

/**
 * Infer page type from composition
 */
function inferPageType(
  comp: PageCompositionLegacy,
  index: number
): PageType {
  if (comp.layout === 'cover' || index === 0) return 'cover';
  
  const firstSection = comp.sections[0];
  if (!firstSection) return 'content';
  
  const content = firstSection.content.toLowerCase();
  
  if (content.includes('table of contents') || content.includes('contents')) {
    return 'toc';
  }
  if (content.includes('executive summary') || content.includes('summary')) {
    return 'summary';
  }
  if (content.includes('conclusion') || content.includes('summary')) {
    return 'conclusion';
  }
  
  return 'content';
}

/**
 * Extract page title from sections
 */
function extractPageTitle(sections: ComposedSectionLegacy[]): string {
  if (sections.length === 0) return 'Untitled Page';
  
  // Find first heading or large text
  const titleSection = sections.find(s => s.fontSize >= 1.5);
  if (titleSection) {
    const title = titleSection.content.trim();
    return title.length > 50 ? title.substring(0, 50) + '...' : title;
  }
  
  // Fall back to first section
  const firstContent = sections[0].content.trim();
  return firstContent.length > 50 
    ? firstContent.substring(0, 50) + '...' 
    : firstContent;
}

/**
 * Convert back to composition format for export
 */
export function convertDocumentToComposition(
  pages: PageData[]
): PageCompositionLegacy[] {
  return pages.map(page => convertPageDataToComposition(page));
}

/**
 * Convert PageData back to legacy composition for export
 */
export function convertPageDataToComposition(
  page: PageData
): PageCompositionLegacy {
  const sections = page.blocks.map(block => convertBlockToSection(block));
  
  return {
    pageNumber: page.pageNumber,
    sections,
    metrics: {
      densityScore: 70,
      readabilityScore: 85,
      whitespaceScore: 75,
      visualBalanceScore: 80,
      overallQuality: 77,
    },
    layout: page.pageType === 'cover' ? 'cover' : 'content',
    density: 'balanced',
  };
}

/**
 * Convert block back to section
 */
export function convertBlockToSection(
  block: PageBlock
): ComposedSectionLegacy {
  return {
    id: block.id,
    type: block.type,
    content: block.content,
    spaceBefore: block.styles.spaceBefore || 0,
    spaceAfter: block.styles.spaceAfter || 0,
    fontSize: block.styles.fontSize || 1.0,
    fontWeight: block.styles.fontWeight || 'normal',
    lineHeight: block.styles.lineHeight || 1.6,
    textAlign: block.styles.textAlign || 'left',
    color: block.styles.color || '#000000',
    maxWidth: 700,
    marginHorizontal: 0,
  };
}
