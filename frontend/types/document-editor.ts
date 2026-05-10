/**
 * Document Editor Types
 * 
 * Block-based editing system for generated documents.
 * Each page is composed of editable blocks (headings, paragraphs, etc.).
 */

export type BlockType = 
  | 'heading' 
  | 'paragraph' 
  | 'bullet' 
  | 'numbered'
  | 'image' 
  | 'metric' 
  | 'divider' 
  | 'cta'
  | 'table';

export type TextAlign = 'left' | 'center' | 'right' | 'justify';

export type FontFamily = 
  | 'Inter'
  | 'Georgia'
  | 'Times New Roman'
  | 'Arial'
  | 'Helvetica'
  | 'Courier New'
  | 'Verdana';

export type FontWeight = 'normal' | 'medium' | 'semibold' | 'bold';

export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'body';

export interface BlockStyles {
  fontSize?: number;           // in rem
  fontFamily?: FontFamily;
  fontWeight?: FontWeight;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  color?: string;              // hex color
  backgroundColor?: string;    // hex color
  textAlign?: TextAlign;
  lineHeight?: number;
  letterSpacing?: number;      // in em
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  spaceBefore?: number;        // in px
  spaceAfter?: number;         // in px
  indent?: number;             // in px
  headingLevel?: HeadingLevel;
}

export interface PageBlock {
  id: string;                  // unique block ID
  type: BlockType;
  content: string;             // text content or image URL
  styles: BlockStyles;
  order: number;               // display order in page
  metadata?: {
    listStyle?: 'disc' | 'decimal' | 'square' | 'circle';
    imageWidth?: number;
    imageHeight?: number;
    metricValue?: string;
    metricLabel?: string;
    linkUrl?: string;
  };
}

export type PageType = 'cover' | 'toc' | 'summary' | 'content' | 'conclusion';

export type PageLayout = 'standard' | 'wide' | 'narrow';

export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PageStyles {
  theme?: string;
  backgroundColor?: string;
  margins?: PageMargins;
  layout?: PageLayout;
  backgroundImage?: string;
}

export interface PageData {
  id: string;
  pageNumber: number;
  title: string;
  pageType: PageType;
  blocks: PageBlock[];
  pageStyles: PageStyles;
}

export interface DocumentData {
  id: string;
  title: string;
  pages: PageData[];
  metadata: {
    author?: string;
    createdAt: string;
    modifiedAt: string;
    version: number;
  };
}

// Editor action types for tracking changes
export type EditorAction = 
  | 'update-block-content'
  | 'update-block-styles'
  | 'add-block'
  | 'delete-block'
  | 'move-block'
  | 'update-page-styles'
  | 'add-page'
  | 'delete-page'
  | 'move-page';

export interface EditorChange {
  action: EditorAction;
  pageId: string;
  blockId?: string;
  oldValue?: any;
  newValue?: any;
  timestamp: number;
}

export interface EditorState {
  document: DocumentData;
  selectedPageId: string | null;
  selectedBlockId: string | null;
  changes: EditorChange[];
  isDirty: boolean;
}

// Conversion utilities (will be implemented in services)
export interface ComposedSectionLegacy {
  id: string;
  type: string;
  content: string;
  spaceBefore: number;
  spaceAfter: number;
  fontSize: number;
  fontWeight: string;
  lineHeight: number;
  textAlign: string;
  color: string;
  maxWidth?: number;
  marginHorizontal?: number;
}

export interface PageCompositionLegacy {
  pageNumber: number;
  sections: ComposedSectionLegacy[];
  metrics: any;
  layout: string;
  density: string;
}
