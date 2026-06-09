import { PreviewService } from './preview.service';
import { PdfExportService as PdfStudioExportService } from './pdf-export.service';
import { buildChartSvg } from '../../generation/export/svg-chart-builder';
import { renderDeckHtml } from '../../slide-export/element-html-renderer';
import type { SlideElementDTO } from '../../slides/element-types';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';

const puppeteer = require('puppeteer');

function callPrivate<T>(instance: any, method: string, ...args: any[]): T {
  return instance[method](...args);
}

function element(
  type: SlideElementDTO['type'],
  content: any,
  geo = { x: 5, y: 5, w: 90, h: 86 },
): SlideElementDTO {
  return {
    id: `test-${type}-${Math.random().toString(36).slice(2)}`,
    slideId: '',
    type,
    name: null,
    order: 1,
    x: geo.x,
    y: geo.y,
    width: geo.w,
    height: geo.h,
    rotation: 0,
    zIndex: 1,
    locked: false,
    visible: true,
    content,
    data: null,
    style: null,
    animations: null,
    accessibility: null,
    createdAt: '1970-01-01T00:00:00.000Z',
    updatedAt: '1970-01-01T00:00:00.000Z',
  };
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pitchonix-pdf-cert-'));
  const pdfPath = path.join(dir, 'certification.pdf');
  const pdftotext = fs.existsSync('/opt/homebrew/bin/pdftotext')
    ? '/opt/homebrew/bin/pdftotext'
    : 'pdftotext';

  try {
    fs.writeFileSync(pdfPath, buffer);
    return execFileSync(pdftotext, ['-layout', pdfPath, '-'], {
      encoding: 'utf8',
      maxBuffer: 10_000_000,
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function renderPdfStudioHtml(html: string): Promise<Buffer> {
  const pdfExport = Object.create(PdfStudioExportService.prototype);
  pdfExport.browserPoolService = {
    executeWithBrowser: async (callback: (browser: any) => Promise<Buffer>) => {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      try {
        return await callback(browser);
      } finally {
        await browser.close();
      }
    },
  };

  return callPrivate<Promise<Buffer>>(pdfExport, 'htmlToPDF', html, 'A4', 'standard');
}

function isBrowserLaunchFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '');
  return /Failed to launch the browser process|Could not find Chrome|Browser was not found/i.test(
    message,
  );
}

describe('PDF chart and table content fidelity', () => {
  it('PDF Studio preview/export chart renderers preserve all 20 labels through visible data tables', () => {
    const data = Array.from({ length: 20 }, (_, i) => ({
      label: `Chart Label ${i + 1}`,
      value: i + 1,
    }));
    const chart = { type: 'pie', title: 'Twenty Label Chart', data };
    const preview = Object.create(PreviewService.prototype);
    const pdfExport = Object.create(PdfStudioExportService.prototype);

    const previewHtml = callPrivate<string>(preview, 'renderChartsHtml', [chart], {
      primaryColor: '#2563EB',
    });
    const exportHtml = callPrivate<string>(pdfExport, 'renderChartsHtml', [chart], {
      primaryColor: '#2563EB',
    });

    for (const item of data) {
      expect(previewHtml).toContain(item.label);
      expect(exportHtml).toContain(item.label);
    }
    expect(previewHtml).toContain('data-overflow-nodes="20"');
    expect(exportHtml).toContain('data-overflow-nodes="20"');
  });

  it('shared SVG KPI chart builder preserves all 20 KPI labels instead of drawing only four', () => {
    const categories = Array.from({ length: 20 }, (_, i) => `KPI Label ${i + 1}`);
    const svg = buildChartSvg({
      type: 'kpi',
      title: 'KPI Grid',
      categories,
      series: [{ name: 'KPIs', values: categories.map((_, i) => i + 1) }],
      showValues: true,
    } as any);

    expect(svg).toContain('KPI Label 1');
    expect(svg).toContain('KPI Label 20');
  });

  it('slide HTML renderer includes all 40 table rows and all 12 columns', () => {
    const headers = Array.from({ length: 12 }, (_, i) => ({ text: `Column ${i + 1}` }));
    const rows = Array.from({ length: 40 }, (_, rowIndex) =>
      Array.from({ length: 12 }, (_, colIndex) => ({ text: `R${rowIndex + 1}C${colIndex + 1}` })),
    );
    const html = renderDeckHtml({
      title: 'Table Fidelity',
      slides: [
        {
          index: 0,
          total: 1,
          title: 'Wide Table',
          elements: [element('table', { headers, rows, zebra: true })],
        },
      ],
    });

    expect(html).toContain('Column 12');
    expect(html).toContain('R40C12');
  });

  it('real Puppeteer PDF binary is extractable and contains all table/chart overflow content', async () => {
    const paragraphs = Array.from(
      { length: 30 },
      (_, i) => `Long paragraph ${i + 1} retained in PDF binary smoke test.`,
    );
    const headers = Array.from({ length: 12 }, (_, i) => `Column ${i + 1}`);
    const tableRows = Array.from({ length: 40 }, (_, rowIndex) =>
      headers.map((_, colIndex) => `R${rowIndex + 1}C${colIndex + 1}`),
    );
    const chartData = Array.from({ length: 20 }, (_, i) => ({
      label: `Chart Label ${i + 1}`,
      value: i + 1,
    }));
    const pdfExport = Object.create(PdfStudioExportService.prototype);
    const chartHtml = callPrivate<string>(
      pdfExport,
      'renderChartsHtml',
      [
        {
          type: 'bar',
          title: 'Chart Heavy Fidelity',
          data: chartData,
        },
      ],
      { primaryColor: '#2563EB' },
    );

    const html = `<!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; color: #111827; font-size: 10px; line-height: 1.35; }
          h1, h2 { break-after: avoid; }
          p { margin: 0 0 6px; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 7px; page-break-inside: auto; }
          tr { page-break-inside: avoid; }
          th, td { border: 1px solid #D1D5DB; padding: 2px 3px; text-align: left; }
          th { background: #EFF6FF; }
        </style>
      </head>
      <body>
        <h1>PDF Binary Smoke</h1>
        ${paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('')}
        <h2>Wide Table Fidelity</h2>
        <table>
          <thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead>
          <tbody>
            ${tableRows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
        ${chartHtml}
        <p>Overflow appendix sentinel retained.</p>
      </body>
      </html>`;

    let pdf: Buffer;
    try {
      pdf = await renderPdfStudioHtml(html);
    } catch (error) {
      if (isBrowserLaunchFailure(error) && process.env.REQUIRE_PDF_BINARY_CERT !== '1') {
        console.warn(
          'Skipping optional PDF binary smoke because Chromium could not launch in this environment.',
        );
        return;
      }
      throw error;
    }

    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.subarray(0, 20).toString('utf8')).not.toContain('<!doctype');
    expect(pdf.subarray(0, 20).toString('utf8')).not.toContain('<html');

    const text = await extractPdfText(pdf);
    expect(text).toContain('PDF Binary Smoke');
    for (const paragraph of paragraphs) {
      expect(text).toContain(paragraph);
    }
    for (const header of headers) {
      expect(text).toContain(header);
    }
    for (const row of tableRows) {
      expect(text).toContain(row[row.length - 1]);
    }
    for (const item of chartData) {
      expect(text).toContain(item.label);
    }
    expect(text).toContain('Overflow appendix sentinel retained');
  }, 60000);
});
