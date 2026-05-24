import * as cheerio from 'cheerio';
import { UniversalDocument, emptyDocument, newPage } from '../document-model';

// =============================================================================
//  Phase 41F — HTML importer.
//
//  Reuses the same body-walker pattern as the DOCX importer (which itself
//  goes through HTML). Page boundaries:
//    - <hr>            → new page
//    - <h1>            → new page (chapter)
//    - everything else → current page
// =============================================================================

export function importHtml(buffer: Buffer, filename = 'document.html'): UniversalDocument {
  const html = buffer.toString('utf8');
  const $    = cheerio.load(html);
  const doc  = emptyDocument('html', $('title').first().text().trim() || filename.replace(/\.[a-z]+$/i, ''));

  let page = newPage();
  doc.pages.push(page);

  // Use the body's children if present, else the whole document's root.
  const root: any = $('body').length ? $('body') : $.root();
  root.children().each((_i: number, el: any) => {
    const tag = (el.tagName || '').toLowerCase();

    if (tag === 'hr') {
      page = newPage();
      doc.pages.push(page);
      return;
    }
    if (tag === 'h1') {
      if (page.nodes.length > 0) {
        page = newPage($(el).text().trim().slice(0, 120));
        doc.pages.push(page);
      } else if (!page.title) {
        page.title = $(el).text().trim().slice(0, 120);
      }
      page.nodes.push({ type: 'heading', level: 1, text: $(el).text().trim() });
      return;
    }

    const node = mapNode($, el);
    if (node) page.nodes.push(node);
  });

  while (doc.pages.length > 1 && doc.pages[doc.pages.length - 1].nodes.length === 0) {
    doc.pages.pop();
  }
  return doc;
}

function mapNode($: cheerio.CheerioAPI, el: any): any {
  const tag = (el.tagName || '').toLowerCase();
  const $el = $(el);
  const txt = $el.text().trim();

  switch (tag) {
    case 'h2': return { type: 'heading', level: 2, text: txt };
    case 'h3': return { type: 'heading', level: 3, text: txt };
    case 'h4': return { type: 'heading', level: 4, text: txt };
    case 'h5': return { type: 'heading', level: 5, text: txt };
    case 'h6': return { type: 'heading', level: 6, text: txt };
    case 'p':
      if (!txt) return null;
      return { type: 'paragraph', text: txt };
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
    case 'blockquote':
      return txt ? { type: 'quote', text: txt } : null;
    case 'pre':
      return { type: 'code', text: $el.text(), language: $el.find('code').attr('class')?.replace('language-', '') };
    default:
      return txt ? { type: 'paragraph', text: txt } : null;
  }
}
