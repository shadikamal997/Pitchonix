import { UniversalDocument, emptyDocument, newPage, heading, paragraph } from '../document-model';

// =============================================================================
//  Phase 41A — TXT / RTF importer (plain-text family).
//
//  TXT: split on blank lines into paragraphs; promote uppercase short lines
//       to headings (matches our PDF heuristics for consistency).
//
//  RTF: strip control words via regex (we don't ship a full RTF parser; for
//       enterprise RTF prefer converting through DOCX). The result is a
//       reasonable plain-text approximation that preserves paragraph breaks.
// =============================================================================

export function importText(buffer: Buffer, filename = 'document.txt'): UniversalDocument {
  const txt = buffer.toString('utf8');
  return buildFromPlainText(txt, 'txt', filename.replace(/\.[a-z]+$/i, ''));
}

export function importRtf(buffer: Buffer, filename = 'document.rtf'): UniversalDocument {
  const raw = buffer.toString('utf8');
  // Strip RTF header / control words / groups. This is intentionally simple;
  // for enterprise-grade RTF, convert through DOCX first.
  const stripped = raw
    .replace(/\\par[d]?/g, '\n')
    .replace(/\\[a-zA-Z]+-?\d*\s?/g, '')
    .replace(/[{}]/g, '')
    .replace(/\\'[0-9a-fA-F]{2}/g, '?')
    .replace(/\\\*/g, '');
  return buildFromPlainText(stripped, 'rtf', filename.replace(/\.[a-z]+$/i, ''));
}

function buildFromPlainText(text: string, fmt: 'txt' | 'rtf', title: string): UniversalDocument {
  const doc = emptyDocument(fmt, title);
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length === 0) {
    doc.pages.push(newPage(title));
    return doc;
  }
  let page = newPage();
  doc.pages.push(page);
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 1 && lookHeading(lines[0])) {
      // Promote single-line headings into a new page when we already have content.
      if (page.nodes.length > 0) {
        page = newPage(lines[0]);
        doc.pages.push(page);
      } else if (!page.title) {
        page.title = lines[0];
      }
      page.nodes.push(heading(2, lines[0]));
    } else {
      const joined = lines.join(' ');
      page.nodes.push(paragraph(joined));
    }
  }
  return doc;
}

function lookHeading(line: string): boolean {
  if (line.length > 80) return false;
  if (/^[A-Z][A-Z\s\d.,'-]+$/.test(line) && line.length > 4) return true;
  if (/^(?:\d+(?:\.\d+)*\s+)[A-Z]/.test(line)) return true;
  return false;
}
