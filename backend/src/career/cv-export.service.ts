import { Injectable, Logger } from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer';
import { exportPdf } from '../universal-conversion/exporters/pdf-exporter';
import { exportDocx } from '../universal-conversion/exporters/docx-exporter';
import { exportHtml } from '../universal-conversion/exporters/html-exporter';
import { exportPptx } from '../universal-conversion/exporters/pptx-exporter';
import { exportMarkdown } from '../universal-conversion/exporters/markdown-exporter';
import { renderCv } from './cv-renderer';
import { renderCvHtml, BrandTokens, CvTemplateLayout } from './cv-html-renderer';
import { CvProfileDto, CvDocumentDto } from './cv-types';
import { CvTemplatesService } from './cv-templates.service';
import { sanitizeCvProfile } from './cv-profile-sanitizer';
import { sanitizeCvDocumentContent } from './cv-document-sanitizer';
import { CareerLedgerService } from './career-ledger.service';
import * as cheerio from 'cheerio';
import * as mammoth from 'mammoth';
// pdf-parse v2 exports a PDFParse class (matches document-parser usage).
const { PDFParse } = require('pdf-parse');

// =============================================================================
//  Phase 42K + 42U + 42V + 42.1 — CvExportService.
//
//  Two render paths to maximise visual fidelity:
//
//    HTML / PDF  → template-aware HTML renderer (cv-html-renderer.ts) →
//                   self-contained HTML with sidebar / photo / skill-bars /
//                   timeline / etc. PDF goes HTML → Headless Chromium → PDF.
//
//    DOCX / MD / PPTX → existing UDM renderer (cv-renderer.ts) →
//                   universal-conversion exporters. Word-friendly semantic
//                   layout; presentation export reuses the slide pipeline.
//
//  Brand kit tokens (Phase 42R) override template defaults — colors take
//  precedence over template accent, body/heading fonts override typography.
// =============================================================================

export type CvExportFormat = 'pdf' | 'docx' | 'pptx' | 'html' | 'md';

export interface CvExportResult {
  buffer: Buffer;
  mimetype: string;
  extension: string;
  durationMs: number;
  /** 'puppeteer' for Chromium PDF, 'html-fallback' when PDF recovery returned HTML. */
  mode?: 'puppeteer' | 'html-fallback' | 'html' | 'docx' | 'pptx' | 'md' | 'libreoffice';
  diagnostics?: CvExportDiagnostics;
}

export interface CvExportDiagnostics {
  templateId?: string | null;
  renderDurationMs?: number;
  pdfDurationMs?: number;
  pageCount?: number;
  fontLoadStatus?: 'loaded' | 'timeout' | 'unknown';
  fallbacks?: string[];
  attempt?: number;
}

@Injectable()
export class CvExportService {
  private readonly logger = new Logger(CvExportService.name);
  private browserPromise: Promise<Browser> | null = null;

  constructor(
    private readonly templates: CvTemplatesService,
    private readonly careerLedger: CareerLedgerService,
  ) {}

  async export(
    format: CvExportFormat,
    profile: CvProfileDto,
    doc: CvDocumentDto,
    brandTokens?: BrandTokens,
  ): Promise<CvExportResult> {
    const t0 = Date.now();
    const template = doc.templateId ? await this.templates.findOne(doc.templateId) : null;
    const layout: CvTemplateLayout = (template?.layout as any) ?? {};
    const diagnostics: CvExportDiagnostics = { templateId: doc.templateId ?? null, fallbacks: [] };
    const cleanProfile = sanitizeCvProfile(profile).profile;
    const cleanDoc =
      doc.doctype === 'cv' || doc.doctype === 'resume'
        ? { ...doc, content: sanitizeCvDocumentContent(doc.content, doc.doctype).content }
        : doc;

    let buffer: Buffer;
    let mimetype: string;
    let extension: string;
    let mode: CvExportResult['mode'];
    let renderHtml: string | null = null;

    this.logger.log(
      `[EXPORT:START] format=${format} doc=${doc.id} templateId=${doc.templateId ?? 'none'}`,
    );

    switch (format) {
      case 'html': {
        const renderStart = Date.now();
        const html = renderCvHtml(cleanProfile, cleanDoc, layout, brandTokens);
        renderHtml = html;
        diagnostics.renderDurationMs = Date.now() - renderStart;
        buffer = Buffer.from(html, 'utf8');
        mimetype = 'text/html';
        extension = 'html';
        mode = 'html';
        this.logger.log(
          `[EXPORT:HTML] doc=${doc.id} bytes=${buffer.length} renderDuration=${diagnostics.renderDurationMs}ms`,
        );
        break;
      }
      case 'pdf': {
        const renderStart = Date.now();
        const html = renderCvHtml(cleanProfile, cleanDoc, layout, brandTokens);
        renderHtml = html;
        diagnostics.renderDurationMs = Date.now() - renderStart;
        this.logger.log(
          `[EXPORT:HTML] doc=${doc.id} bytes=${Buffer.byteLength(html)} renderDuration=${diagnostics.renderDurationMs}ms`,
        );

        const pdf = await this.htmlToPdfWithRetry(html, diagnostics);
        if (pdf) {
          buffer = pdf;
          mimetype = 'application/pdf';
          extension = 'pdf';
          mode = 'puppeteer';
        } else {
          diagnostics.fallbacks?.push('html');
          buffer = Buffer.from(html, 'utf8');
          mimetype = 'text/html';
          extension = 'html';
          mode = 'html-fallback';
          this.logger.warn(
            `[EXPORT:FAILURE] doc=${doc.id} pdf failed after retry; returned HTML fallback`,
          );
        }
        break;
      }
      case 'md': {
        const udm = renderCv(cleanProfile, cleanDoc, { brandTokens, templateLayout: layout });
        buffer = exportMarkdown(udm);
        mimetype = 'text/markdown';
        extension = 'md';
        mode = 'md';
        break;
      }
      case 'docx': {
        const udm = renderCv(cleanProfile, cleanDoc, { brandTokens, templateLayout: layout });
        buffer = await exportDocx(udm);
        mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        extension = 'docx';
        mode = 'docx';
        diagnostics.fallbacks?.push('semantic-docx');
        break;
      }
      case 'pptx': {
        const udm = renderCv(cleanProfile, cleanDoc, { brandTokens, templateLayout: layout });
        buffer = await exportPptx(udm);
        mimetype = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        extension = 'pptx';
        mode = 'pptx';
        break;
      }
      default:
        throw new Error(`Unsupported export format "${format}"`);
    }

    const durationMs = Date.now() - t0;
    this.logger.log(
      `[EXPORT:DURATION] doc=${doc.id} format=${format} mode=${mode} duration=${durationMs}ms pageCount=${diagnostics.pageCount ?? 'n/a'} fontLoadStatus=${diagnostics.fontLoadStatus ?? 'unknown'} fallbacks=${diagnostics.fallbacks?.join(',') || 'none'}`,
    );

    // Phase Ω.CONTENT.2C — render → export → reopen by RE-PARSING the actual
    // exported bytes. Proves every CV entity survived to the downloaded file.
    try {
      const reopenText = await this.extractExportedText(buffer, extension);
      if (reopenText) {
        // Use tag-stripped text for render presence so needles aren't broken by
        // inline markup (e.g. "$5k" wrapped in <strong>).
        const renderedText = renderHtml ? cheerio.load(renderHtml).root().text() : reopenText;
        await this.careerLedger.recordRenderExportReopen(
          profile.id,
          profile,
          renderedText,
          reopenText,
          extension,
        );
      }
    } catch (error: any) {
      this.logger.warn(
        `[EXPORT:LEDGER] doc=${doc.id} ledger reopen skipped: ${error?.message || error}`,
      );
    }

    return { buffer, mimetype, extension, durationMs, mode, diagnostics };
  }

  /** Re-parse exported bytes back into plain text for ledger reopen comparison. */
  private async extractExportedText(buffer: Buffer, extension: string): Promise<string> {
    try {
      if (extension === 'pdf') {
        const parser = new PDFParse({ data: buffer });
        const data = await parser.getText();
        return String(data?.text || '');
      }
      if (extension === 'docx') {
        const { value } = await mammoth.extractRawText({ buffer });
        return String(value || '');
      }
      if (extension === 'html') {
        return cheerio.load(buffer.toString('utf8')).root().text();
      }
      if (extension === 'md') {
        return buffer.toString('utf8');
      }
    } catch (error: any) {
      this.logger.warn(
        `[EXPORT:LEDGER] text extraction failed for .${extension}: ${error?.message || error}`,
      );
    }
    return '';
  }

  // ---------------------------------------------------------------------------
  //  HTML → PDF via Headless Chromium.
  //
  //  This intentionally prints the same HTML used by preview. Chromium preserves
  //  CSS Grid, web typography, gradients, sidebar layouts, and print page-break
  //  rules far more closely than the previous LibreOffice conversion path.
  // ---------------------------------------------------------------------------

  private async htmlToPdfWithRetry(
    html: string,
    diagnostics: CvExportDiagnostics,
  ): Promise<Buffer | null> {
    for (let attempt = 1; attempt <= 2; attempt++) {
      diagnostics.attempt = attempt;
      try {
        return await this.htmlToPdf(html, diagnostics, attempt);
      } catch (e: any) {
        this.logger.warn(
          `[EXPORT:FAILURE] stage=puppeteer attempt=${attempt} error=${e?.message || e}`,
        );
        diagnostics.fallbacks?.push(`puppeteer-attempt-${attempt}-failed`);
        if (attempt === 2) return null;
      }
    }
    return null;
  }

  private async htmlToPdf(
    html: string,
    diagnostics: CvExportDiagnostics,
    attempt: number,
  ): Promise<Buffer> {
    const t0 = Date.now();
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      page.setDefaultTimeout(15_000);
      await page.setViewport({ width: 880, height: 1245, deviceScaleFactor: 2 });
      await page.emulateMediaType('print');
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      await page.waitForNetworkIdle({ idleTime: 500, timeout: 10_000 }).catch(() => undefined);

      diagnostics.fontLoadStatus = await page.evaluate(async () => {
        const fonts = (document as any).fonts;
        if (!fonts?.ready) return 'unknown';
        await Promise.race([fonts.ready, new Promise((resolve) => setTimeout(resolve, 3000))]);
        return fonts.status === 'loaded' ? 'loaded' : 'timeout';
      });

      await page.evaluate(async () => {
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });

      this.logger.log(
        `[EXPORT:PUPPETEER] attempt=${attempt} fontLoadStatus=${diagnostics.fontLoadStatus}`,
      );
      const pdfBuffer = Buffer.from(
        await page.pdf({
          format: 'A4',
          printBackground: true,
          preferCSSPageSize: true,
          margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
          tagged: true,
        }),
      );
      diagnostics.pdfDurationMs = Date.now() - t0;
      diagnostics.pageCount = this.countPdfPages(pdfBuffer);
      this.logger.log(
        `[EXPORT:PDF] bytes=${pdfBuffer.length} pages=${diagnostics.pageCount} duration=${diagnostics.pdfDurationMs}ms`,
      );
      return pdfBuffer;
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  private getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      this.browserPromise = puppeteer
        .launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--font-render-hinting=none',
            '--disable-dev-shm-usage',
          ],
        })
        .catch((error) => {
          this.browserPromise = null;
          throw error;
        });
    }
    return this.browserPromise;
  }

  private countPdfPages(buffer: Buffer): number {
    const matches = buffer.toString('latin1').match(/\/Type\s*\/Page\b/g);
    return matches?.length ?? 0;
  }
}
