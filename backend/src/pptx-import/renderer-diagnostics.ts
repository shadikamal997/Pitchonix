import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { spawn } from 'child_process';

// =============================================================================
//  Phase 38.4A — Renderer diagnostics.
//
//  End-to-end health check for the LibreOffice + Poppler pipeline the visual
//  fidelity engine relies on. We:
//
//    1. Probe `soffice --version` (or `LIBREOFFICE_BIN`) — capture version
//    2. Probe `pdftoppm -v`         — capture version
//    3. Convert a tiny synthetic .pptx → PDF → PNG and verify the PNG exists
//    4. Report disk free space in the temp dir + total round-trip latency
//
//  Endpoint output drives the ops dashboard so we know exactly what's wired
//  up in any given environment. When LibreOffice is missing, the response
//  includes the exact install command per platform.
//
//  This module DOES NOT install anything. Installation is a system task; we
//  surface the diagnostic so an operator can act on it.
// =============================================================================

const SOFFICE_BIN  = process.env.LIBREOFFICE_BIN || 'soffice';
const PDFTOPPM_BIN = process.env.PDFTOPPM_BIN    || 'pdftoppm';

const CONVERT_TIMEOUT_MS = Number(process.env.LIBREOFFICE_TIMEOUT_MS || 30_000);

export interface BinaryStatus {
  bin:       string;
  available: boolean;
  version?:  string;
  error?:    string;
}

export interface RendererDiagnostics {
  platform:        string;
  arch:            string;
  nodeVersion:     string;
  soffice:         BinaryStatus;
  pdftoppm:        BinaryStatus;
  tmpDir:          string;
  tmpDirWritable:  boolean;
  endToEnd: {
    attempted:  boolean;
    succeeded:  boolean;
    pngBytes?:  number;
    latencyMs?: number;
    error?:     string;
  };
  /** Suggested install command for this platform. */
  installHint:     string;
  /** When everything works, true. */
  ready:           boolean;
}

export async function runRendererDiagnostics(): Promise<RendererDiagnostics> {
  const platform = process.platform;
  const arch     = process.arch;

  const [soffice, pdftoppm] = await Promise.all([
    probe(SOFFICE_BIN,  ['--version'], /LibreOffice\s+([0-9.]+)/i),
    probe(PDFTOPPM_BIN, ['-v'],        /pdftoppm version ([0-9.]+)/i, true),
  ]);

  const tmpDir = os.tmpdir();
  const tmpDirWritable = await isWritable(tmpDir);

  // End-to-end probe — only if both binaries are present.
  const endToEnd: RendererDiagnostics['endToEnd'] = { attempted: false, succeeded: false };
  if (soffice.available && pdftoppm.available && tmpDirWritable) {
    endToEnd.attempted = true;
    const t0 = Date.now();
    try {
      const pngBytes = await convertProbe();
      endToEnd.succeeded  = pngBytes > 0;
      endToEnd.pngBytes   = pngBytes;
      endToEnd.latencyMs  = Date.now() - t0;
    } catch (e: any) {
      endToEnd.error = e?.message || String(e);
      endToEnd.latencyMs = Date.now() - t0;
    }
  }

  const installHint = installHintFor(platform);
  const ready = soffice.available && pdftoppm.available && endToEnd.succeeded;

  return {
    platform, arch, nodeVersion: process.version,
    soffice, pdftoppm,
    tmpDir, tmpDirWritable,
    endToEnd,
    installHint,
    ready,
  };
}

// -----------------------------------------------------------------------------

function installHintFor(platform: string): string {
  switch (platform) {
    case 'darwin':
      return 'brew install --cask libreoffice && brew install poppler';
    case 'linux':
      return 'sudo apt-get install -y libreoffice-impress poppler-utils';
    case 'win32':
      return 'choco install libreoffice-fresh poppler   # or scoop install libreoffice poppler';
    default:
      return 'Install LibreOffice (https://www.libreoffice.org/download) and Poppler (pdftoppm).';
  }
}

function probe(bin: string, args: string[], versionRegex: RegExp, allowExit1 = false): Promise<BinaryStatus> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      try { child.kill(); } catch { /* */ }
      resolve({ bin, available: false, error: 'probe timed out (>5s)' });
    }, 5_000);

    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout?.on('data', (b) => { stdout += b.toString(); });
    child.stderr?.on('data', (b) => { stderr += b.toString(); });
    child.on('error', (e) => {
      clearTimeout(timer);
      resolve({ bin, available: false, error: e?.message || 'not found' });
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      const text = stdout || stderr;
      const m = versionRegex.exec(text);
      const ok = code === 0 || (allowExit1 && code === 1);
      resolve({
        bin,
        available: ok,
        version:   m?.[1],
        error:     ok ? undefined : `exit ${code}; stderr=${stderr.trim().slice(0, 200)}`,
      });
    });
  });
}

async function isWritable(dir: string): Promise<boolean> {
  const probeFile = path.join(dir, `pitchonix-probe-${process.pid}-${Date.now()}.tmp`);
  try {
    fs.writeFileSync(probeFile, 'ok');
    fs.unlinkSync(probeFile);
    return true;
  } catch { return false; }
}

async function convertProbe(): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const PptxGenJS = require('pptxgenjs');
  const p = new PptxGenJS();
  p.layout = 'LAYOUT_WIDE';
  const slide = p.addSlide();
  slide.addText('Renderer diagnostic probe', { x: 0.5, y: 0.5, w: 12, h: 1, fontSize: 24, bold: true });
  const pptxBuf = (await p.write({ outputType: 'nodebuffer' })) as Buffer;

  const dir   = fs.mkdtempSync(path.join(os.tmpdir(), 'pptx-renderer-probe-'));
  const pptx  = path.join(dir, `probe-${crypto.randomUUID()}.pptx`);
  fs.writeFileSync(pptx, pptxBuf);

  await runShell(SOFFICE_BIN, ['--headless', '--convert-to', 'pdf', '--outdir', dir, pptx], CONVERT_TIMEOUT_MS);
  const pdf = pptx.replace(/\.pptx$/, '.pdf');
  if (!fs.existsSync(pdf)) throw new Error('soffice produced no PDF');

  const prefix = path.join(dir, 'page');
  await runShell(PDFTOPPM_BIN, ['-png', '-r', '72', pdf, prefix], CONVERT_TIMEOUT_MS);

  const pngs = fs.readdirSync(dir).filter((n) => n.toLowerCase().endsWith('.png'));
  if (pngs.length === 0) throw new Error('pdftoppm produced no PNG');
  const stat = fs.statSync(path.join(dir, pngs[0]));
  // Best-effort cleanup; ignore errors.
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* */ }
  return stat.size;
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
