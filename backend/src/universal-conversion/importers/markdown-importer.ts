import { UniversalDocument, emptyDocument, newPage, DocumentNode } from '../document-model';

// =============================================================================
//  Phase 41G — Markdown importer.
//
//  Uses a small dependency-free lexer so importing the Nest app does not pull
//  ESM-only markdown packages through Jest before conversion is requested.
//
//  Page boundaries:
//    - `---` (thematic break) → new page
//    - `# Heading 1`          → new page
// =============================================================================

export function importMarkdown(buffer: Buffer, filename = 'document.md'): UniversalDocument {
  const md = buffer.toString('utf8');
  const tokens = lexMarkdown(md);
  const doc = emptyDocument('md', filename.replace(/\.[a-z]+$/i, ''));

  let page = newPage();
  doc.pages.push(page);

  for (const tok of tokens) {
    if (tok.type === 'hr') {
      page = newPage();
      doc.pages.push(page);
      continue;
    }
    if (tok.type === 'heading' && tok.depth === 1) {
      const h = tok;
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

function lexMarkdown(markdown: string): any[] {
  const lines = String(markdown || '')
    .replace(/\r\n?/g, '\n')
    .split('\n');
  const tokens: any[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let inCode = false;
  let codeLang = '';
  let codeLines: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    tokens.push({ type: 'paragraph', text: paragraph.join(' ').trim() });
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    tokens.push({
      type: 'list',
      ordered: list.ordered,
      items: list.items.map((text) => ({ text })),
    });
    list = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (/^```/.test(trimmed)) {
      if (inCode) {
        tokens.push({ type: 'code', text: codeLines.join('\n'), lang: codeLang || undefined });
        inCode = false;
        codeLang = '';
        codeLines = [];
      } else {
        flushParagraph();
        flushList();
        inCode = true;
        codeLang = trimmed.replace(/^```/, '').trim();
      }
      continue;
    }
    if (inCode) {
      codeLines.push(rawLine);
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }
    if (/^---+$/.test(trimmed)) {
      flushParagraph();
      flushList();
      tokens.push({ type: 'hr' });
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      tokens.push({ type: 'heading', depth: heading[1].length, text: heading[2].trim() });
      continue;
    }

    const unordered = trimmed.match(/^[-*+]\s+(.+)$/);
    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const nextOrdered = !!ordered;
      if (!list || list.ordered !== nextOrdered) flushList();
      if (!list) list = { ordered: nextOrdered, items: [] };
      list.items.push((unordered?.[1] || ordered?.[1] || '').trim());
      continue;
    }

    if (/^>\s+/.test(trimmed)) {
      flushParagraph();
      flushList();
      tokens.push({ type: 'blockquote', tokens: [{ text: trimmed.replace(/^>\s+/, '') }] });
      continue;
    }

    paragraph.push(trimmed);
  }

  if (inCode)
    tokens.push({ type: 'code', text: codeLines.join('\n'), lang: codeLang || undefined });
  flushParagraph();
  flushList();
  return tokens;
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
      const text = (tok.tokens || [])
        .map((t: any) => t.text || '')
        .join('\n')
        .trim();
      return text ? { type: 'quote', text } : null;
    }
    case 'code':
      return { type: 'code', text: tok.text || '', language: tok.lang || undefined };
    case 'table': {
      const headerRow = true;
      const rows: any[] = [];
      const hdr = (tok.header || []).map((h: any) => ({
        text: h.text || String(h || ''),
        bold: true,
      }));
      rows.push(hdr);
      for (const r of tok.rows || []) {
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
