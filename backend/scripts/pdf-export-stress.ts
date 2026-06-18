import { execSync } from 'child_process';
import { BrowserPoolService } from '../src/pdf-studio/services/browser-pool.service';
import { PdfExportService } from '../src/pdf-studio/services/pdf-export.service';

type Result = { ok: true; ms: number } | { ok: false; ms: number; error: string };

const vu = positiveInt(process.env.PDF_EXPORT_STRESS_VU, 20);
const durationMs = positiveInt(process.env.PDF_EXPORT_STRESS_DURATION_MS, 120_000);
const html = buildStressHtml();

async function main() {
  process.env.PDF_EXPORT_CONCURRENCY ||= '3';
  process.env.PDF_EXPORT_QUEUE_TIMEOUT_MS ||= '30000';
  process.env.PDF_BROWSER_PREWARM ||= 'true';

  const pool = new BrowserPoolService();
  const pdfExport: any = Object.create(PdfExportService.prototype);
  pdfExport.browserPoolService = pool;

  const beforeBrowserProcesses = browserProcessCount();
  await pool.onModuleInit();
  const afterPrewarmBrowserProcesses = browserProcessCount();

  const results: Result[] = [];
  const activeSamples: number[] = [];
  const queueSamples: number[] = [];
  const memorySamples: number[] = [];
  const stopAt = Date.now() + durationMs;
  let stopped = false;

  const sampler = setInterval(() => {
    const stats = pool.getStats();
    activeSamples.push(stats.activeRenderCount);
    queueSamples.push(stats.queued);
    memorySamples.push(process.memoryUsage().rss);
  }, 1000);

  async function worker() {
    while (!stopped && Date.now() < stopAt) {
      const started = Date.now();
      try {
        await pdfExport.htmlToPDF(html, 'A4', 'standard');
        results.push({ ok: true, ms: Date.now() - started });
      } catch (error) {
        results.push({
          ok: false,
          ms: Date.now() - started,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  await Promise.all(Array.from({ length: vu }, () => worker()));
  stopped = true;
  clearInterval(sampler);

  const finalStatsBeforeDestroy = pool.getStats();
  await pool.onModuleDestroy();
  await sleep(1000);
  const afterBrowserProcesses = browserProcessCount();

  const ok = results.filter((result): result is Extract<Result, { ok: true }> => result.ok);
  const failed = results.filter((result): result is Extract<Result, { ok: false }> => !result.ok);
  const latencies = ok.map((result) => result.ms).sort((a, b) => a - b);
  const report = {
    vu,
    durationMs,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    errorRate: results.length ? failed.length / results.length : 0,
    queueWaitTimeMs: finalStatsBeforeDestroy.averageQueueWaitMs,
    maxActiveRenderCount: max(activeSamples),
    maxQueued: max(queueSamples),
    completedExports: finalStatsBeforeDestroy.completedExports,
    failedExports: finalStatsBeforeDestroy.failedExports,
    timeoutCount: finalStatsBeforeDestroy.timeoutCount,
    memoryUsageMb: {
      min: Math.round(min(memorySamples) / 1024 / 1024),
      max: Math.round(max(memorySamples) / 1024 / 1024),
      final: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    browserProcessCount: {
      before: beforeBrowserProcesses,
      afterPrewarm: afterPrewarmBrowserProcesses,
      afterDestroy: afterBrowserProcesses,
      leaked: Math.max(0, afterBrowserProcesses - beforeBrowserProcesses),
    },
    finalPoolStats: pool.getStats(),
    firstErrors: failed.slice(0, 5),
  };

  console.log(JSON.stringify(report, null, 2));

  if (report.p95 >= 20_000 || report.errorRate >= 0.01 || report.timeoutCount > 0) {
    process.exitCode = 1;
  }
  if (report.maxActiveRenderCount > positiveInt(process.env.PDF_EXPORT_CONCURRENCY, 3)) {
    process.exitCode = 1;
  }
  if (report.finalPoolStats.activeRenderCount !== 0 || report.finalPoolStats.queued !== 0) {
    process.exitCode = 1;
  }
}

function buildStressHtml(): string {
  const rows = Array.from(
    { length: 36 },
    (_, i) =>
      `<tr><td>Metric ${i + 1}</td><td>${Math.round((i + 1) * 3.7)}%</td><td>Retained PDF export stress content row ${i + 1}</td></tr>`,
  ).join('');
  const paragraphs = Array.from(
    { length: 18 },
    (_, i) =>
      `<p>Stress paragraph ${i + 1}: export preserves readable business content, brand colors, tables, and pagination while queue backpressure controls Chrome pressure.</p>`,
  ).join('');

  return `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: Arial, sans-serif; color: #111827; }
          .page { break-after: page; }
          h1 { color: #1d4ed8; font-size: 28px; }
          h2 { color: #0f766e; font-size: 20px; }
          p { font-size: 12px; line-height: 1.45; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 6px; font-size: 10px; }
          th { background: #eff6ff; }
        </style>
      </head>
      <body>
        <section class="page">
          <h1>PDF Export Stress Document</h1>
          ${paragraphs}
        </section>
        <section>
          <h2>Stress Metrics</h2>
          <table>
            <thead><tr><th>Name</th><th>Value</th><th>Detail</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </section>
      </body>
    </html>`;
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const index = Math.min(values.length - 1, Math.ceil((p / 100) * values.length) - 1);
  return values[index];
}

function max(values: number[]): number {
  return values.length ? Math.max(...values) : 0;
}

function min(values: number[]): number {
  return values.length ? Math.min(...values) : 0;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function browserProcessCount(): number {
  try {
    const output = execSync('ps -axo command', { encoding: 'utf8' });
    return output
      .split('\n')
      .filter((line) => /Chrom(e|ium)|chrome|puppeteer/i.test(line))
      .filter((line) => !/pdf-export-stress|ps -axo command/i.test(line)).length;
  } catch {
    return -1;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
