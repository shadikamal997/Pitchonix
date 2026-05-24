import * as cheerio from 'cheerio';
import { UniversalDocument, DocumentNode, emptyDocument, newPage } from '../document-model';

// =============================================================================
//  Phase 41D — DOCX importer.
//
//  Strategy:
//    1. mammoth converts DOCX → semantic HTML (preserves headings, paragraphs,
//       lists, tables, images).
//    2. cheerio walks the HTML and maps it onto DocumentNode primitives.
//
//  Page boundaries: DOCX has no first-class page concept (pagination is
//  rendering-time). We emit a single page per top-level <h1> (chapter-style),
//  or one page total if there are no h1s. PDF/PPTX downstream can re-paginate.
//
//  Images: mammoth produces inline data URLs by default — we keep them as
//  `image` nodes pointing at the data URL so the import is self-contained.
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mammoth = require('mammoth');

export async function importDocx(buffer: Buffer, filename = 'document.docx'): Promise<UniversalDocument> {
  const doc = emptyDocument('docx', filename.replace(/\.[a-z]+$/i, '') || 'Imported document');
  const { value: html } = await mammoth.convertToHtml({ buffer });
  const $ = cheerio.load(html || '<p></p>');

  // Walk top-level body children left → right; start a new page on each <h1>.
  let page = newPage();
  doc.pages.push(page);

  $('body').children().each((_i: number, el: any) => {
    const tag = (el.tagName || '').toLowerCase();
    if (tag === 'h1') {
      // Start a new page if the current one already has nodes.
      if (page.nodes.length > 0) {
        page = newPage($(el).text().trim().slice(0, 120));
        doc.pages.push(page);
      } else if (!page.title) {
        page.title = $(el).text().trim().slice(0, 120);
      }
      page.nodes.push({ type: 'heading', level: 1, text: $(el).text().trim() });
    } else {
      const node = mapNode($, el);
      if (node) page.nodes.push(node);
    }
  });

  // Trim trailing empty pages.
  while (doc.pages.length > 1 && doc.pages[doc.pages.length - 1].nodes.length === 0) {
    doc.pages.pop();
  }
  return doc;
}

function mapNode($: cheerio.CheerioAPI, el: any): DocumentNode | null {
  const tag = (el.tagName || '').toLowerCase();
  const $el = $(el);
  const txt = $el.text().trim();

  switch (tag) {
    case 'h2': return { type: 'heading', level: 2, text: txt };
    case 'h3': return { type: 'heading', level: 3, text: txt };
    case 'h4': return { type: 'heading', level: 4, text: txt };
    case 'h5': return { type: 'heading', level: 5, text: txt };
    case 'h6': return { type: 'heading', level: 6, text: txt };

    case 'p': {
      if (!txt) return null;
      // Quote? mammoth marks blockquotes with <p class="Quote">.
      if ($el.hasClass('Quote') || $el.hasClass('quote')) {
        return { type: 'quote', text: txt };
      }
      const img = $el.find('img').first();
      if (img.length > 0) {
        return { type: 'image', src: img.attr('src') || '', alt: img.attr('alt') };
      }
      return { type: 'paragraph', text: txt, runs: collectRuns($, el) };
    }

    case 'ul':
    case 'ol': {
      const items = $el.children('li').map((_i, li) => $(li).text().trim()).get();
      return { type: 'list', ordered: tag === 'ol', items };
    }

    case 'table': {
      const rows: any[] = [];
      let headerRow = false;
      $el.find('tr').each((rIdx, tr) => {
        const cells = $(tr).find('th,td').map((_ci, c) => ({
          text: $(c).text().trim(),
          bold: c.tagName === 'th',
        })).get();
        if (rIdx === 0 && $(tr).find('th').length > 0) headerRow = true;
        rows.push(cells);
      });
      return { type: 'table', rows, headerRow };
    }

    case 'img':
      return { type: 'image', src: $el.attr('src') || '', alt: $el.attr('alt') };

    default:
      return txt ? { type: 'paragraph', text: txt } : null;
  }
}

function collectRuns($: cheerio.CheerioAPI, el: any): DocumentNode['runs'] {
  const runs: NonNullable<DocumentNode['runs']> = [];
  const $el = $(el);
  // Walk text + bold/italic/u children — keep it simple, not full DOM walker.
  $el.contents().each((_i, n: any) => {
    if (n.type === 'text') {
      const t = (n.data || '').trim();
      if (t) runs.push({ text: t });
    } else if (n.type === 'tag') {
      const t = $(n).text();
      if (!t) return;
      const tag = String(n.tagName).toLowerCase();
      runs.push({
        text: t,
        bold:      tag === 'strong' || tag === 'b' || undefined,
        italic:    tag === 'em' || tag === 'i' || undefined,
        underline: tag === 'u' || undefined,
      });
    }
  });
  return runs.length > 0 ? runs : undefined;
}
