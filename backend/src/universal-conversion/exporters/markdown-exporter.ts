import { UniversalDocument, DocumentNode } from '../document-model';
import { renderChartSvg } from './chart-renderer';

// =============================================================================
//  Phase 41H — Markdown exporter.
//
//  Pages → top-level `# Title` blocks separated by `---` thematic breaks.
//  Nodes map cleanly to commonmark; chart/component/oleObject nodes
//  degrade to descriptive paragraphs.
// =============================================================================

export function exportMarkdown(doc: UniversalDocument): Buffer {
  const lines: string[] = [];
  doc.pages.forEach((page, pi) => {
    if (pi > 0) lines.push('', '---', '');
    if (page.title) lines.push(`# ${page.title}`, '');
    for (const node of page.nodes) {
      lines.push(...renderNode(node));
      lines.push('');
    }
    if (page.notes) lines.push('', `> _Notes:_ ${page.notes}`);
  });
  return Buffer.from(lines.join('\n').replace(/\n{3,}/g, '\n\n'), 'utf8');
}

function renderNode(n: DocumentNode): string[] {
  switch (n.type) {
    case 'heading':    return [`${'#'.repeat(n.level || 2)} ${n.text || ''}`];
    case 'paragraph':  return [n.text || ''];
    case 'list':       {
      const items = Array.isArray(n.items) ? n.items : [];
      const bullet = n.ordered ? (i: number) => `${i + 1}.` : () => '-';
      return items.map((i: any, idx: number) => `${bullet(idx)} ${typeof i === 'string' ? i : i.text}`);
    }
    case 'quote':      return [`> ${n.text || ''}`];
    case 'code':       return ['```' + (n.language || ''), n.text || '', '```'];
    case 'callout':    return [`> **${(n.callout || 'info').toUpperCase()}:** ${n.text || ''}`];
    case 'image':      return [`![${n.alt || ''}](${n.src || ''})`];
    case 'table':      {
      const rows = n.rows || [];
      if (rows.length === 0) return [];
      const head = rows[0].map((c) => c.text || ' ').join(' | ');
      const sep  = rows[0].map(() => '---').join(' | ');
      const body = rows.slice(1).map((r) => r.map((c) => (c.text || '').replace(/\|/g, '\\|')).join(' | '));
      return [`| ${head} |`, `| ${sep} |`, ...body.map((b) => `| ${b} |`)];
    }
    case 'chart':      {
      // Phase 41.1E — markdown allows inline HTML; embed SVG when we can.
      const svg = renderChartSvg(n.chart, 720, 360);
      if (svg) {
        return [
          ...(n.chart?.title ? [`**${n.chart.title}**`, ''] : []),
          '<div align="center">',
          svg,
          '</div>',
        ];
      }
      return [`_[Chart: ${(n.chart?.type || 'bar')}]_`];
    }
    case 'pageBreak':  return ['', '---', ''];
    case 'spacer':     return ['', ''];
    default:           return n.text ? [n.text] : [];
  }
}
