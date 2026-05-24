import { UniversalDocument, emptyDocument, newPage, paragraph, heading } from '../document-model';

// =============================================================================
//  Phase 41C — PDF importer.
//
//  pdf-parse gives us per-page raw text. We then heuristically classify lines
//  into headings (short + uppercase / numbered) vs paragraphs.
//
//  Out of scope (deferred to PdfStudio):
//    - Real layout reconstruction (column boxes, text positions)
//    - Image extraction
//    - Table reconstruction from coordinate grids
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');

export async function importPdf(buffer: Buffer): Promise<UniversalDocument> {
  const doc = emptyDocument('pdf');
  const result = await pdfParse(buffer);
  const text = String(result?.text || '');
  if (!text) {
    doc.pages.push({ ...newPage('Imported PDF'), nodes: [paragraph('(empty PDF)')] });
    return doc;
  }
  const pageTexts = text.split('\f');
  for (const raw of pageTexts) {
    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    const page = newPage(lines[0]?.slice(0, 120));
    let firstLine = true;
    for (const line of lines) {
      if (firstLine) { page.nodes.push(heading(1, line)); firstLine = false; continue; }
      if (looksLikeHeading(line)) page.nodes.push(heading(2, line));
      else                        page.nodes.push(paragraph(line));
    }
    doc.pages.push(page);
  }
  // Title from metadata.
  if (result?.info?.Title) doc.metadata.title = String(result.info.Title);
  if (result?.info?.Author) doc.metadata.author = String(result.info.Author);
  return doc;
}

function looksLikeHeading(line: string): boolean {
  if (line.length > 80) return false;
  if (/^[A-Z][A-Z\s\d.,'-]+$/.test(line) && line.length > 4) return true;          // all-caps
  if (/^(?:\d+(?:\.\d+)*\s+)[A-Z]/.test(line)) return true;                          // "1.2 Heading"
  if (/^(?:Chapter|Section|Part)\s+\d+/i.test(line)) return true;
  return false;
}
