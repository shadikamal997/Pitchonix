// =============================================================================
//  Phase 41B — Universal Document Model.
//
//  Every importer normalises to this shape. Every exporter / transform reads
//  from it. Single source of truth across the conversion pipeline.
//
//      UniversalDocument
//        ├── metadata: title, author, brandKitId, …
//        ├── pages: PageNode[]
//        │     └── nodes: DocumentNode[]   ← flat list per page; section is a node
//        └── theme?: { colors, fonts }
//
//  Why flat-per-page instead of a nested tree:
//    - Round-trips cleanly to slides (1 page ≈ 1 slide)
//    - Round-trips cleanly to PDF pages
//    - Avoids the cost of HTML-style infinite nesting
//    - Sections still represented as `section` nodes that group following
//      siblings (start/end markers) so chapter structure isn't lost
// =============================================================================

export type DocumentNodeType =
  | 'heading'      // level 1–6 in `level`
  | 'paragraph'
  | 'list'         // ordered/unordered, items[]
  | 'table'        // rows[][]
  | 'chart'        // chart content (re-uses Pitchonix chart shape)
  | 'image'        // src + alt
  | 'video'        // src + poster
  | 'code'         // language + content
  | 'quote'        // attribution
  | 'callout'      // info / warning / success / danger
  | 'section'      // start of a logical section (sectionEnd closes)
  | 'sectionEnd'
  | 'pageBreak'    // force a new page on export
  | 'component'    // pre-rendered Pitchonix smart component
  | 'spacer';      // explicit vertical gap

export interface DocumentNode {
  id?:    string;
  type:   DocumentNodeType;
  level?: number;                 // headings 1..6
  text?:  string;
  runs?:  Array<{ text: string; bold?: boolean; italic?: boolean; underline?: boolean; color?: string; size?: number; font?: string }>;
  items?: string[] | Array<{ text: string; level?: number; checked?: boolean }>;
  ordered?: boolean;              // list ordering
  rows?:  Array<Array<{ text: string; bold?: boolean; fill?: string; align?: 'left' | 'center' | 'right'; colspan?: number; rowspan?: number }>>;
  headerRow?: boolean;            // table has a header row
  chart?: any;                    // chart content (shape mirrors Pitchonix chart element)
  src?:   string;
  alt?:   string;
  language?: string;
  attribution?: string;
  callout?: 'info' | 'warning' | 'success' | 'danger';
  sectionId?: string;             // links section/sectionEnd pairs
  componentId?: string;
  height?: number;                // for spacer
}

export interface PageNode {
  id?:    string;
  title?: string;
  background?: { type: 'solid' | 'gradient' | 'image'; color?: string };
  nodes:  DocumentNode[];
  /** Speaker notes / page notes; ignored by formats that don't support them. */
  notes?: string;
}

export interface UniversalDocument {
  metadata: {
    title:        string;
    author?:      string;
    description?: string;
    brandKitId?:  string | null;
    sourceFormat: SupportedFormat;
    importedAt:   string;
  };
  pages:    PageNode[];
  /** Optional flat list of slide-like sections (mirrors Phase 38 DeckSection). */
  sections?: Array<{ id: string; name: string; pageIndexes: number[] }>;
  /** Optional inherited theme tokens; mainly used by cross-format converters. */
  theme?: {
    colors?: { primary?: string; secondary?: string; accent?: string; text?: string; background?: string };
    fonts?:  { heading?: string; body?: string };
  };
}

export type SupportedFormat =
  | 'pptx' | 'potx'
  | 'pdf'
  | 'docx' | 'doc' | 'odt'
  | 'rtf' | 'txt'
  | 'md' | 'markdown'
  | 'html' | 'htm'
  | 'csv'
  | 'xlsx' | 'xls' | 'ods';

export const FORMAT_FAMILY: Record<SupportedFormat, 'presentation' | 'document' | 'spreadsheet' | 'pdf' | 'plaintext'> = {
  pptx: 'presentation', potx: 'presentation',
  pdf:  'pdf',
  docx: 'document', doc: 'document', odt: 'document',
  rtf:  'document', txt:  'plaintext',
  md:   'document', markdown: 'document',
  html: 'document', htm: 'document',
  csv:  'spreadsheet',
  xlsx: 'spreadsheet', xls: 'spreadsheet', ods: 'spreadsheet',
};

/** Sniff a format from filename (preferred) or content-type. */
export function detectFormat(filename?: string, mimetype?: string): SupportedFormat | null {
  const ext = (filename || '').toLowerCase().split('.').pop() || '';
  if (ext in FORMAT_FAMILY) return ext as SupportedFormat;
  // Mime fallbacks (incomplete; only the common ones).
  const m = (mimetype || '').toLowerCase();
  if (m.includes('presentationml'))   return 'pptx';
  if (m.includes('wordprocessingml')) return 'docx';
  if (m.includes('spreadsheetml'))    return 'xlsx';
  if (m === 'application/pdf')         return 'pdf';
  if (m === 'text/html')               return 'html';
  if (m === 'text/markdown')           return 'md';
  if (m === 'text/csv')                return 'csv';
  if (m === 'text/plain')              return 'txt';
  if (m === 'application/rtf' || m === 'text/rtf') return 'rtf';
  return null;
}

// =============================================================================
//  Builder helpers (used by importers + transforms to keep code terse)
// =============================================================================

export function emptyDocument(format: SupportedFormat, title = 'Untitled'): UniversalDocument {
  return {
    metadata: {
      title,
      sourceFormat: format,
      importedAt:   new Date().toISOString(),
    },
    pages: [],
  };
}

export function newPage(title?: string): PageNode {
  return { title, nodes: [] };
}

export function heading(level: number, text: string): DocumentNode {
  return { type: 'heading', level: Math.max(1, Math.min(6, level)), text };
}
export function paragraph(text: string, runs?: DocumentNode['runs']): DocumentNode {
  return { type: 'paragraph', text, runs };
}
export function bulletList(items: string[]): DocumentNode {
  return { type: 'list', ordered: false, items };
}
export function numberedList(items: string[]): DocumentNode {
  return { type: 'list', ordered: true, items };
}
export function table(rows: Array<Array<{ text: string }>>, headerRow = true): DocumentNode {
  return { type: 'table', rows, headerRow };
}
export function image(src: string, alt?: string): DocumentNode {
  return { type: 'image', src, alt };
}

// =============================================================================
//  Traversal helpers
// =============================================================================

export function forEachNode(doc: UniversalDocument, cb: (node: DocumentNode, pageIdx: number, nodeIdx: number) => void): void {
  doc.pages.forEach((page, pi) => {
    page.nodes.forEach((node, ni) => cb(node, pi, ni));
  });
}

export function totalNodes(doc: UniversalDocument): number {
  return doc.pages.reduce((acc, p) => acc + p.nodes.length, 0);
}

/** Flatten the document into plain text (one line per node). */
export function toPlainText(doc: UniversalDocument): string {
  const lines: string[] = [];
  for (const page of doc.pages) {
    if (page.title) { lines.push(page.title); lines.push(''); }
    for (const node of page.nodes) {
      const t = nodeText(node);
      if (t) lines.push(t);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}

export function nodeText(node: DocumentNode): string {
  switch (node.type) {
    case 'heading':
    case 'paragraph':
    case 'quote':
    case 'callout':
    case 'code':       return node.text || '';
    case 'list':       return (Array.isArray(node.items) ? node.items.map((i) => typeof i === 'string' ? i : i.text).join('\n') : '');
    case 'table':      return (node.rows || []).map((r) => r.map((c) => c.text).join('\t')).join('\n');
    case 'image':      return node.alt || '';
    default:           return '';
  }
}
