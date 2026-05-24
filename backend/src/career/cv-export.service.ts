import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { spawn } from 'child_process';
import { exportPdf } from '../universal-conversion/exporters/pdf-exporter';
import { exportDocx } from '../universal-conversion/exporters/docx-exporter';
import { exportHtml } from '../universal-conversion/exporters/html-exporter';
import { exportPptx } from '../universal-conversion/exporters/pptx-exporter';
import { exportMarkdown } from '../universal-conversion/exporters/markdown-exporter';
import { renderCv } from './cv-renderer';
import { renderCvHtml, BrandTokens, CvTemplateLayout } from './cv-html-renderer';
import { CvProfileDto, CvDocumentDto } from './cv-types';
import { CvTemplatesService } from './cv-templates.service';

// =============================================================================
//  Phase 42K + 42U + 42V + 42.1 — CvExportService.
//
//  Two render paths to maximise visual fidelity:
//
//    HTML / PDF  → template-aware HTML renderer (cv-html-renderer.ts) →
//                   self-contained HTML with sidebar / photo / skill-bars /
//                   timeline / etc. PDF goes HTML → soffice → PDF.
//
//    DOCX / MD / PPTX → existing UDM renderer (cv-renderer.ts) →
//                   universal-conversion exporters. Word-friendly semantic
//                   layout; presentation export reuses the slide pipeline.
//
//  Brand kit tokens (Phase 42R) override template defaults — colors take
//  precedence over template accent, body/heading fonts override typography.
// =============================================================================

const SOFFICE_BIN = process.env.LIBREOFFICE_BIN || 'soffice';

export type CvExportFormat = 'pdf' | 'docx' | 'pptx' | 'html' | 'md';

export interface CvExportResult {
  buffer:     Buffer;
  mimetype:   string;
  extension:  string;
  durationMs: number;
  /** 'libreoffice' when we shelled out to soffice for PDF; 'html' when we
   *  returned HTML because soffice wasn't available. */
  mode?:      'libreoffice' | 'html' | 'docx' | 'pptx' | 'md';
}

@Injectable()
export class CvExportService {
  private readonly logger = new Logger(CvExportService.name);

  constructor(private readonly templates: CvTemplatesService) {}

  async export(
    format: CvExportFormat,
    profile: CvProfileDto,
    doc: CvDocumentDto,
    brandTokens?: BrandTokens,
  ): Promise<CvExportResult> {
    const t0 = Date.now();
    const template = doc.templateId ? await this.templates.findOne(doc.templateId) : null;
    const layout: CvTemplateLayout = (template?.layout as any) ?? {};

    let buffer: Buffer;
    let mimetype: string;
    let extension: string;
    let mode: CvExportResult['mode'];

    switch (format) {
      case 'html': {
        const html = renderCvHtml(profile, doc, layout, brandTokens);
        buffer = Buffer.from(html, 'utf8');
        mimetype = 'text/html'; extension = 'html'; mode = 'html';
        break;
      }
      case 'pdf': {
        const html = renderCvHtml(profile, doc, layout, brandTokens);
        const pdf  = await this.htmlToPdf(html);
        if (pdf) {
          buffer = pdf; mimetype = 'application/pdf'; extension = 'pdf'; mode = 'libreoffice';
        } else {
          // Fall back to the UDM-based PDF pipeline if LibreOffice is missing.
          this.logger.warn('LibreOffice not available; falling back to UDM PDF pipeline');
          const udm = renderCv(profile, doc, { brandTokens, templateLayout: layout });
          const r = await exportPdf(udm);
          buffer = r.buffer; mimetype = r.mimetype; extension = r.extension;
          mode = r.mode === 'libreoffice' ? 'libreoffice' : 'html';
        }
        break;
      }
      case 'md': {
        const udm = renderCv(profile, doc, { brandTokens, templateLayout: layout });
        buffer = exportMarkdown(udm);
        mimetype = 'text/markdown'; extension = 'md'; mode = 'md';
        break;
      }
      case 'docx': {
        const udm = renderCv(profile, doc, { brandTokens, templateLayout: layout });
        buffer = await exportDocx(udm);
        mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        extension = 'docx'; mode = 'docx';
        break;
      }
      case 'pptx': {
        const udm = renderCv(profile, doc, { brandTokens, templateLayout: layout });
        buffer = await exportPptx(udm);
        mimetype = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        extension = 'pptx'; mode = 'pptx';
        break;
      }
      default:
        throw new Error(`Unsupported export format "${format}"`);
    }

    return { buffer, mimetype, extension, durationMs: Date.now() - t0, mode };
  }

  // ---------------------------------------------------------------------------
  //  HTML → PDF via LibreOffice. Returns null when soffice isn't available so
  //  the caller can degrade gracefully.
  // ---------------------------------------------------------------------------

  private async htmlToPdf(html: string): Promise<Buffer | null> {
    if (!(await this.sofficeAvailable())) return null;
    const dir   = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-pdf-'));
    const htmlFile = path.join(dir, `${crypto.randomUUID()}.html`);
    fs.writeFileSync(htmlFile, html, 'utf8');
    try {
      await this.runShell(SOFFICE_BIN, ['--headless', '--convert-to', 'pdf', '--outdir', dir, htmlFile], 45_000);
      const pdf = htmlFile.replace(/\.html$/, '.pdf');
      if (!fs.existsSync(pdf)) return null;
      const out = fs.readFileSync(pdf);
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
      return out;
    } catch (e: any) {
      this.logger.warn(`html→pdf failed: ${e?.message}`);
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
      return null;
    }
  }

  private sofficeAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn(SOFFICE_BIN, ['--version'], { stdio: 'ignore' });
      child.on('error', () => resolve(false));
      child.on('exit', (code) => resolve(code === 0));
    });
  }

  private runShell(bin: string, args: string[], timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      let stderr = '';
      const timer = setTimeout(() => {
        try { child.kill('SIGKILL'); } catch { /* */ }
        reject(new Error(`${bin} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      const child = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
      child.stderr?.on('data', (b) => { stderr += b.toString(); });
      child.on('error', (e) => { clearTimeout(timer); reject(e); });
      child.on('exit', (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(`${bin} exit ${code}; stderr=${stderr.trim().slice(0, 200)}`));
      });
    });
  }
}
