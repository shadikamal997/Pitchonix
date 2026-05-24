import { PptxImportService } from '../../pptx-import/pptx-import.service';
import { UniversalDocument, emptyDocument, PageNode, DocumentNode, heading, paragraph } from '../document-model';

// =============================================================================
//  Phase 41A — PPTX → UDM adapter.
//
//  Delegates to the mature PptxImportService (Phase 38.1+) and maps the
//  imported shape onto the UniversalDocument model. One slide = one page;
//  each slide's elements become DocumentNodes preserving type information
//  (heading / paragraph / table / chart / image / smartArt / oleObject).
//
//  Speaker notes survive as `PageNode.notes`. Slide titles become page
//  titles. The PPTX importer's resolved theme tokens propagate to the
//  UniversalDocument.theme so cross-format exports can keep branding.
// =============================================================================

export async function importPptxAsDocument(svc: PptxImportService, buffer: Buffer): Promise<UniversalDocument> {
  const parsed = svc.parseBuffer(buffer);
  const doc = emptyDocument('pptx', parsed.title);

  for (const slide of parsed.slides) {
    const page: PageNode = {
      title: slide.title,
      nodes: [],
      notes: slide.speakerNotes || undefined,
    };
    // Resolved background.
    const bg = slide.resolvedTokens?.background;
    if (bg?.color) page.background = { type: 'solid', color: bg.color };

    for (const el of slide.elements) {
      const node = mapElementToNode(el);
      if (node) page.nodes.push(node);
    }
    doc.pages.push(page);
  }

  // Theme propagation — pull the first slide's resolved colors/fonts.
  const firstResolved = parsed.slides[0]?.resolvedTokens;
  if (firstResolved) {
    doc.theme = {
      colors: firstResolved.colors as any,
      fonts:  { heading: parsed.themes[0]?.tokens?.fonts?.heading, body: parsed.themes[0]?.tokens?.fonts?.body },
    };
  }
  if (parsed.themes[0]?.name) doc.metadata.description = `Imported from theme "${parsed.themes[0].name}"`;
  return doc;
}

function mapElementToNode(el: any): DocumentNode | null {
  switch (el.type) {
    case 'heading':   return { type: 'heading', level: 1, text: el.content?.text, runs: el.content?.runs };
    case 'subheading':return { type: 'heading', level: 2, text: el.content?.text, runs: el.content?.runs };
    case 'paragraph': return { type: 'paragraph', text: el.content?.text, runs: el.content?.runs };
    case 'image':     return { type: 'image', src: el.content?.url || el.content?.src || '', alt: el.content?.alt };
    case 'chart':     return { type: 'chart', chart: el.content };
    case 'table':     return {
      type: 'table',
      rows: [
        ...((el.content?.headers && el.content.headers.length)
          ? [el.content.headers.map((c: any) => ({ text: c.text || '', bold: true }))]
          : []),
        ...(el.content?.rows || []).map((r: any[]) => r.map((c: any) => ({
          text: c.text || '',
          bold: !!c.bold, fill: c.fill, align: c.align, colspan: c.colspan, rowspan: c.rowspan,
        }))),
      ],
      headerRow: !!(el.content?.headers && el.content.headers.length),
    };
    case 'smartArt':  return { type: 'paragraph', text: `[SmartArt: ${el.content?.kind || 'custom'} with ${el.content?.nodeCount || 0} nodes]` };
    case 'oleObject': return { type: 'callout', callout: 'info', text: `Embedded ${el.content?.kind || 'object'} attachment: ${el.content?.filename || ''}` };
    case 'shape':     return null;   // visual-only shapes don't translate to documents
    default:          return el.content?.text ? { type: 'paragraph', text: el.content.text } : null;
  }
}
