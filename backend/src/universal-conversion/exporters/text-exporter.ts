import { UniversalDocument } from '../document-model';
import { toPlainText } from '../document-model';

// =============================================================================
//  Phase 41H — Plain text + RTF exporters.
// =============================================================================

export function exportText(doc: UniversalDocument): Buffer {
  return Buffer.from(toPlainText(doc), 'utf8');
}

/** Minimal RTF (escapes braces + backslashes, paragraphs joined with \par). */
export function exportRtf(doc: UniversalDocument): Buffer {
  const escapeRtf = (s: string) => s.replace(/\\/g, '\\\\').replace(/{/g, '\\{').replace(/}/g, '\\}');
  const lines: string[] = ['{\\rtf1\\ansi\\deff0'];
  for (const page of doc.pages) {
    if (page.title) lines.push(`\\b ${escapeRtf(page.title)}\\b0\\par`);
    for (const node of page.nodes) {
      switch (node.type) {
        case 'heading':
          lines.push(`\\b\\fs${28 - Math.min(12, (node.level || 2) * 2)} ${escapeRtf(node.text || '')}\\b0\\fs24\\par`);
          break;
        case 'paragraph':
          lines.push(`${escapeRtf(node.text || '')}\\par`);
          break;
        case 'list':
          for (const i of (Array.isArray(node.items) ? node.items : []) as any[]) {
            lines.push(`\\bullet  ${escapeRtf(typeof i === 'string' ? i : i.text)}\\par`);
          }
          break;
        case 'quote':
          lines.push(`\\i ${escapeRtf(node.text || '')}\\i0\\par`);
          break;
        case 'table':
          for (const row of node.rows || []) {
            lines.push(`${row.map((c) => escapeRtf(c.text || '')).join('\\tab ')}\\par`);
          }
          break;
        default:
          if (node.text) lines.push(`${escapeRtf(node.text)}\\par`);
      }
    }
    lines.push('\\page');
  }
  lines.push('}');
  return Buffer.from(lines.join('\n'), 'utf8');
}
