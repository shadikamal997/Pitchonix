import { UniversalDocument, DocumentNode, PageNode, newPage } from '../document-model';

// =============================================================================
//  Phase 41I — Document → Presentation auto-paginator.
//
//  Turns a flowing document (DOCX / PDF / HTML / Markdown) into a
//  presentation-ready UniversalDocument by re-paginating around heading
//  hierarchy and content density. Rules:
//
//    - Every H1 starts a new slide titled with the heading text.
//    - H2/H3 within a slide become sub-headings on that same slide.
//    - When a slide accumulates >~6 nodes OR >~700 chars of text, we split
//      and continue on a second slide with a "(continued)" title suffix.
//    - Tables / charts get their own slide (presentation best practice).
//    - First page becomes the cover slide; deck title = document title.
//
//  The output is itself a UniversalDocument with sourceFormat unchanged
//  so any downstream exporter (PPTX / PDF / HTML) treats it identically.
// =============================================================================

const MAX_NODES_PER_SLIDE = 6;
const MAX_CHARS_PER_SLIDE = 700;

export function documentToPresentation(doc: UniversalDocument): UniversalDocument {
  // Flatten current pages back into a single ordered node stream.
  const stream: DocumentNode[] = [];
  for (const page of doc.pages) {
    if (page.title) stream.push({ type: 'heading', level: 1, text: page.title });
    stream.push(...page.nodes);
  }

  const out: UniversalDocument = {
    metadata: { ...doc.metadata, importedAt: new Date().toISOString() },
    pages: [],
    theme: doc.theme,
  };

  // Cover slide.
  out.pages.push({
    title: doc.metadata.title,
    nodes: [
      { type: 'heading', level: 1, text: doc.metadata.title },
      ...(doc.metadata.author ? [{ type: 'paragraph' as const, text: doc.metadata.author }] : []),
      ...(doc.metadata.description ? [{ type: 'paragraph' as const, text: doc.metadata.description }] : []),
    ],
  });

  let current: PageNode = newPage();
  let textBudget = 0;
  let pendingTitle: string | null = null;

  const flush = () => {
    if (current.nodes.length > 0) {
      if (pendingTitle && !current.title) current.title = pendingTitle;
      out.pages.push(current);
    }
    current = newPage();
    textBudget = 0;
    pendingTitle = null;
  };

  for (const node of stream) {
    // H1 always starts a new slide.
    if (node.type === 'heading' && node.level === 1) {
      flush();
      current.title = node.text;
      pendingTitle  = node.text || null;
      current.nodes.push({ type: 'heading', level: 1, text: node.text });
      continue;
    }
    // Standalone slide for tables/charts.
    if (node.type === 'table' || node.type === 'chart') {
      flush();
      current.title = pendingTitle || (node.type === 'table' ? 'Data' : 'Chart');
      current.nodes.push(node);
      flush();
      continue;
    }
    // Split when budget exceeded.
    const cost = (node.text || '').length + (Array.isArray(node.items) ? node.items.length * 30 : 0);
    if (current.nodes.length >= MAX_NODES_PER_SLIDE || textBudget + cost > MAX_CHARS_PER_SLIDE) {
      const cont = (current.title || pendingTitle || '') + ' (continued)';
      flush();
      current.title = cont;
    }
    current.nodes.push(node);
    textBudget += cost;
  }
  flush();
  return out;
}
