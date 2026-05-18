/**
 * Block Document v2.0 Types (Backend)
 *
 * Core type definitions for block-based documents (backend version).
 * Mirrors frontend types for consistent data structures.
 */

// Block types
export type BlockType =
  | 'heading-1' | 'heading-2' | 'heading-3' | 'heading-4' | 'heading-5' | 'heading-6'
  | 'paragraph' | 'blockquote' | 'code-block' | 'bullet-list' | 'numbered-list' | 'checklist'
  | 'hero' | 'two-column' | 'three-column' | 'grid-2x2' | 'grid-3x3' | 'sidebar-layout'
  | 'kpi-cards' | 'timeline' | 'swot' | 'team-members' | 'testimonial' | 'feature-grid'
  | 'comparison-table' | 'chart-bar' | 'chart-line' | 'chart-pie'
  | 'image' | 'video' | 'gallery' | 'embed' | 'file-download' | 'divider'
  | 'table' | 'callout' | 'accordion' | 'tabs';

export type BlockCategory = 'text' | 'layout' | 'visual' | 'media' | 'advanced';

// Block content (simplified for backend)
export type BlockContent = Record<string, any>;

// Block configuration
export interface BlockConfig {
  alignment?: 'left' | 'center' | 'right' | 'justify';
  width?: 'full' | 'wide' | 'normal' | 'narrow';
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  useBrandKit?: boolean;
  brandKitColors?: { primary?: boolean; secondary?: boolean; accent?: boolean };
  hidden?: boolean;
  hideInExport?: boolean;
  showOnlyInExport?: boolean;
  customCss?: string;
  customClasses?: string[];
}

// Block metadata
export interface BlockMetadata {
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  lastEditedBy?: string;
  version?: number;
  comments?: number;
  locked?: boolean;
}

// Block definition
export interface Block {
  id: string;
  type: BlockType;
  order: number;
  content: BlockContent;
  config?: BlockConfig;
  metadata?: BlockMetadata;
}

// Block Document v2.0
export interface BlockDocument {
  version: '2.0';
  blocks: Block[];
  metadata: {
    documentId?: string;
    templateId?: string;
    brandKitId?: string;
    title?: string;
    description?: string;
    author?: string;
    lastModified: string;
    createdAt?: string;
    tags?: string[];
    customData?: Record<string, any>;
  };
}

// Legacy v1 types (for migration)
export interface LegacyPage {
  id: string;
  order: number;
  pageNumber: number;
  pageType: string;
  title: string;
  content: any;
  templateId?: string;
  customStyles?: any;
}

export interface LegacyDocument {
  id: string;
  projectId: string;
  title: string;
  documentType: string;
  brandKitId?: string;
  outline?: any;
  metadata?: any;
  status: string;
  pages?: LegacyPage[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Block rendering context
export interface BlockRenderContext {
  brandKit?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    logoUrl?: string;
  };
  templateId?: string;
  exportFormat?: 'editor' | 'preview' | 'pdf' | 'docx' | 'pptx';
  pageSize?: { width: number; height: number };
  documentMetadata?: BlockDocument['metadata'];
}
