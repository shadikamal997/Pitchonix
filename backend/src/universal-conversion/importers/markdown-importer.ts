import { marked, Tokens } from 'marked';
import { UniversalDocument, emptyDocument, newPage, DocumentNode } from '../document-model';

// =============================================================================
//  Phase 41G — Markdown importer.
//
//  Uses marked's token stream so we keep the structure clean (heading depth,
//  list ordering, code language) without an HTML round-trip.
//
//  Page boundaries:
//    - `---` (thematic break) → new page
//    - `# Heading 1`          → new page
// =============================================================================

export function importMarkdown(buffer: Buffer, filename = 'document.md'): UniversalDocument {
  const md = buffer.toString('utf8');
  const tokens = marked.lexer(md);
  const doc    = emptyDocument('md', filename.replace(/\.[a-z]+$/i, ''));

  let page = newPage();
  doc.pages.push(page);

  for (const tok of tokens) {
    if (tok.type === 'hr') {
      page = newPage();
      doc.pages.push(page);
      continue;
    }
    if (tok.type === 'heading' && (tok as Tokens.Heading).depth === 1) {
      const h = tok as Tokens.Heading;
      if (page.nodes.length > 0) {
        page = newPage(h.text);
        doc.pages.push(page);
      } else if (!page.title) {
        page.title = h.text;
      }
      page.nodes.push({ type: 'heading', level: 1, text: h.text });
      continue;
    }
    const node = mapToken(tok);
    if (node) page.nodes.push(node);
  }
  while (doc.pages.length > 1 && doc.pages[doc.pages.length - 1].nodes.length === 0) {
    doc.pages.pop();
  }
  return doc;
}

function mapToken(tok: any): DocumentNode | null {
  switch (tok.type) {
    case 'heading':
      return { type: 'heading', level: Math.max(1, Math.min(6, tok.depth || 1)), text: tok.text };
    case 'paragraph':
      return tok.text ? { type: 'paragraph', text: tok.text } : null;
    case 'list': {
      const items = (tok.items || []).map((i: any) => String(i.text || '').trim()).filter(Boolean);
      return { type: 'list', ordered: !!tok.ordered, items };
    }
    case 'blockquote': {
      const text = (tok.tokens || []).map((t: any) => t.text || '').join('\n').trim();
      return text ? { type: 'quote', text } : null;
    }
    case 'code':
      return { type: 'code', text: tok.text || '', language: tok.lang || undefined };
    case 'table': {
      const headerRow = true;
      const rows: any[] = [];
      const hdr = (tok.header || []).map((h: any) => ({ text: h.text || String(h || ''), bold: true }));
      rows.push(hdr);
      for (const r of (tok.rows || [])) {
        rows.push((r || []).map((c: any) => ({ text: c.text || String(c || '') })));
      }
      return { type: 'table', rows, headerRow };
    }
    case 'image':
      return { type: 'image', src: tok.href, alt: tok.text };
    case 'space':
      return null;
    default:
      return tok.text ? { type: 'paragraph', text: tok.text } : null;
  }
}
