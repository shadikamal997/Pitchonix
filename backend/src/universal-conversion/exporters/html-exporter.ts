import { UniversalDocument, DocumentNode } from '../document-model';
import { renderChartSvg } from './chart-renderer';

// =============================================================================
//  Phase 41H — HTML exporter.
//
//  Self-contained HTML5 document with inline CSS that respects the
//  UniversalDocument.theme (colors + fonts). Each page becomes a section
//  separated by a CSS-driven page-break for browser-side print fidelity.
// =============================================================================

export function exportHtml(doc: UniversalDocument): Buffer {
  const t = doc.theme || {};
  const css = `
    body { margin: 0; padding: 32px 48px; font: 14px/1.55 ${t.fonts?.body || '-apple-system, BlinkMacSystemFont, sans-serif'}; color: ${t.colors?.text || '#1F2937'}; background: ${t.colors?.background || '#FFFFFF'}; }
    .page { max-width: 880px; margin: 0 auto 48px; padding-bottom: 32px; border-bottom: 1px dashed #E2E8F0; page-break-after: always; }
    h1, h2, h3, h4, h5, h6 { font-family: ${t.fonts?.heading || 'inherit'}; color: ${t.colors?.primary || '#0F172A'}; }
    h1 { font-size: 28px; margin: 12px 0 16px; }
    h2 { font-size: 22px; margin: 16px 0 12px; }
    h3 { font-size: 18px; }
    p  { margin: 0 0 12px; }
    ul, ol { margin: 0 0 12px 22px; }
    blockquote { margin: 12px 0; padding: 8px 14px; border-left: 4px solid ${t.colors?.accent || '#2563EB'}; background: #F8FAFC; color: ${t.colors?.text || '#1F2937'}; }
    .callout { padding: 10px 14px; border-radius: 6px; margin: 12px 0; }
    .callout.info    { background: #EFF6FF; color: #1D4ED8; }
    .callout.warning { background: #FFFBEB; color: #92400E; }
    .callout.success { background: #ECFDF5; color: #065F46; }
    .callout.danger  { background: #FEF2F2; color: #B91C1C; }
    table  { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
    th, td { padding: 6px 10px; border: 1px solid #E2E8F0; text-align: left; }
    th     { background: ${t.colors?.primary || '#0F172A'}; color: white; }
    pre    { background: #0F172A; color: #E2E8F0; padding: 12px; border-radius: 6px; overflow-x: auto; font-family: ui-monospace, monospace; font-size: 12px; }
    img    { max-width: 100%; height: auto; border-radius: 4px; }
    .notes { margin-top: 16px; padding: 8px 12px; background: #F1F5F9; border-radius: 4px; color: #64748B; font-size: 12px; }
    @media print { .page { page-break-after: always; border: 0; } }
  `;

  // Phase Ω.1 — emit a brand-kit header band when a kit was applied
  // (applyBrandKit populates metadata.brandKitLogo / brandKitName).
  const logo = (doc.metadata as any).brandKitLogo as string | null | undefined;
  const kitName = (doc.metadata as any).brandKitName as string | null | undefined;
  const brandHeader = (logo || kitName) ? `
    <header class="brand-header" style="border-bottom: 3px solid ${t.colors?.primary || '#0F172A'}; padding: 12px 16px; margin: 0 0 24px; display: flex; align-items: center; gap: 12px;">
      ${logo ? `<img src="${esc(logo)}" alt="" style="max-height:36px;width:auto;border-radius:0" />` : ''}
      ${kitName ? `<span style="font-family:${t.fonts?.heading || 'inherit'}; font-weight:700; color:${t.colors?.primary || '#0F172A'}">${esc(kitName)}</span>` : ''}
    </header>` : '';

  const pages = doc.pages.map((page) => {
    const body = page.nodes.map(renderNode).join('\n');
    return `<section class="page">${page.title ? `<h1>${esc(page.title)}</h1>` : ''}${body}${page.notes ? `<div class="notes"><strong>Notes:</strong> ${esc(page.notes)}</div>` : ''}</section>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(doc.metadata.title)}</title>
<style>${css}</style>
</head>
<body>
${brandHeader}
${pages}
</body>
</html>`;
  return Buffer.from(html, 'utf8');
}

function renderNode(n: DocumentNode): string {
  switch (n.type) {
    case 'heading':    return `<h${Math.min(6, Math.max(1, n.level || 2))}>${esc(n.text || '')}</h${Math.min(6, Math.max(1, n.level || 2))}>`;
    case 'paragraph':  return `<p>${escWithRuns(n)}</p>`;
    case 'list':       {
      const items = Array.isArray(n.items) ? n.items : [];
      const tag = n.ordered ? 'ol' : 'ul';
      const li  = items.map((i: any) => `<li>${esc(typeof i === 'string' ? i : i.text)}</li>`).join('');
      return `<${tag}>${li}</${tag}>`;
    }
    case 'quote':      return `<blockquote>${esc(n.text || '')}</blockquote>`;
    case 'callout':    return `<div class="callout ${n.callout || 'info'}">${esc(n.text || '')}</div>`;
    case 'code':       return `<pre><code>${esc(n.text || '')}</code></pre>`;
    case 'image':      return `<img src="${esc(n.src || '')}" alt="${esc(n.alt || '')}" />`;
    case 'table':      {
      const rows = n.rows || [];
      if (rows.length === 0) return '';
      const head = rows[0].map((c) => `<th>${esc(c.text || '')}</th>`).join('');
      const body = rows.slice(1).map((r) => `<tr>${r.map((c) => `<td>${esc(c.text || '')}</td>`).join('')}</tr>`).join('');
      return `<table>${head ? `<thead><tr>${head}</tr></thead>` : ''}<tbody>${body}</tbody></table>`;
    }
    case 'chart':      {
      // Phase 41.1H — inline SVG render so charts survive in the browser.
      const svg = renderChartSvg(n.chart, 720, 400);
      if (svg) return `<figure class="chart" style="margin:12px 0">${svg}${n.chart?.title ? `<figcaption>${esc(n.chart.title)}</figcaption>` : ''}</figure>`;
      return `<p><em>[Chart: ${esc(n.chart?.type || 'bar')}]</em></p>`;
    }
    case 'pageBreak':  return '</section><section class="page">';
    case 'spacer':     return '<div style="height:24px"></div>';
    default:           return n.text ? `<p>${esc(n.text)}</p>` : '';
  }
}

function escWithRuns(n: DocumentNode): string {
  if (!Array.isArray(n.runs) || n.runs.length === 0) return esc(n.text || '');
  return n.runs.map((r) => {
    let t = esc(r.text || '');
    if (r.bold)      t = `<strong>${t}</strong>`;
    if (r.italic)    t = `<em>${t}</em>`;
    if (r.underline) t = `<u>${t}</u>`;
    if (r.color)     t = `<span style="color:${esc(r.color)}">${t}</span>`;
    return t;
  }).join('');
}

function esc(s: string): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
