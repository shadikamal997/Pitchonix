import { exportHtml } from './html-exporter';
import { exportPptx } from './pptx-exporter';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { UniversalDocument } from '../document-model';

// =============================================================================
//  Phase 41H + 41M — UniversalDocument → PDF exporter.
//
//  Two paths, picked at runtime:
//
//    1. LibreOffice mode (preferred): generate a temporary PPTX via the
//       Phase 41I converter, then shell out to `soffice --convert-to pdf`.
//       Highest fidelity; requires LibreOffice (verified in Phase 38.6).
//
//    2. HTML-print fallback: produce a self-contained HTML doc and emit it
//       directly (the caller can pipe through any HTML→PDF renderer they
//       prefer; we return the HTML buffer with a `.html` extension hint).
//       Surfaced when LibreOffice is unavailable so the API still works.
//
//  Both paths preserve the UniversalDocument.theme (branding), so a single
//  brand kit propagates end-to-end.
// =============================================================================

const SOFFICE_BIN = process.env.LIBREOFFICE_BIN || 'soffice';

export async function exportPdf(doc: UniversalDocument): Promise<{ buffer: Buffer; mimetype: string; extension: string; mode: 'libreoffice' | 'html' }> {
  const hasLO = await sofficeAvailable();
  if (hasLO) {
    try {
      const pptx = await exportPptx(doc);
      const buf  = await pptxToPdf(pptx);
      return { buffer: buf, mimetype: 'application/pdf', extension: 'pdf', mode: 'libreoffice' };
    } catch (e: any) {
      // Fall through to HTML mode if conversion fails (e.g. LibreOffice runtime error).
      // eslint-disable-next-line no-console
      console.warn(`[universal-pdf] LibreOffice mode failed (${e?.message}); falling back to HTML`);
    }
  }
  // HTML fallback — return the HTML buffer with a print-friendly mime.
  const html = exportHtml(doc);
  return { buffer: html, mimetype: 'text/html', extension: 'html', mode: 'html' };
}

// -----------------------------------------------------------------------------

function sofficeAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(SOFFICE_BIN, ['--version'], { stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('exit',  (code) => resolve(code === 0));
  });
}

async function pptxToPdf(pptx: Buffer): Promise<Buffer> {
  const dir   = fs.mkdtempSync(path.join(os.tmpdir(), 'udm-pdf-'));
  const file  = path.join(dir, `${crypto.randomUUID()}.pptx`);
  fs.writeFileSync(file, pptx);
  await runShell(SOFFICE_BIN, ['--headless', '--convert-to', 'pdf', '--outdir', dir, file], 60_000);
  const pdf = file.replace(/\.pptx$/, '.pdf');
  if (!fs.existsSync(pdf)) throw new Error('soffice produced no PDF');
  const out = fs.readFileSync(pdf);
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  return out;
}

function runShell(bin: string, args: string[], timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let stderr = '';
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch { /* */ }
      reject(new Error(`${bin} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    const child = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    child.stderr?.on('data', (b) => { stderr += b.toString(); });
    child.on('error', (e) => { clearTimeout(timer); reject(e); });
    child.on('exit',  (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`${bin} exit ${code}; stderr=${stderr.trim().slice(0, 200)}`));
    });
  });
}
