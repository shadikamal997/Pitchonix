import { UniversalDocument, DocumentNode, newPage, heading, paragraph } from '../document-model';

// =============================================================================
//  Phase 41J — Presentation → Document flattener.
//
//  Inverse of Phase 41I: takes a presentation-shaped UniversalDocument and
//  reflows it into a document where each slide becomes a chapter (H1 + body).
//  Speaker notes get inlined as italic paragraphs marked with "Notes:".
//
//  Output is still a UniversalDocument so any document exporter (DOCX /
//  HTML / Markdown / TXT / RTF) consumes it without further transformation.
// =============================================================================

export function presentationToDocument(deck: UniversalDocument): UniversalDocument {
  const out: UniversalDocument = {
    metadata: { ...deck.metadata, importedAt: new Date().toISOString() },
    pages: [],
    theme: deck.theme,
  };

  // Pack as a single page; downstream PDF/DOCX exporters paginate themselves.
  const page = newPage(deck.metadata.title);
  page.nodes.push(heading(1, deck.metadata.title));

  for (const slide of deck.pages) {
    if (slide.title) page.nodes.push(heading(2, slide.title));
    for (const node of slide.nodes) {
      // Skip slide-title duplicates already rendered as H2 above.
      if (node.type === 'heading' && node.level === 1 && node.text === slide.title) continue;
      // Demote presentation-level headings by 1 so chapter hierarchy stays consistent.
      if (node.type === 'heading') {
        page.nodes.push({ ...node, level: Math.min(6, (node.level || 1) + 1) });
        continue;
      }
      page.nodes.push(node as DocumentNode);
    }
    if (slide.notes) {
      page.nodes.push({ type: 'paragraph', text: `Notes: ${slide.notes}`, runs: [{ text: `Notes: ${slide.notes}`, italic: true }] });
    }
  }

  out.pages.push(page);
  return out;
}
