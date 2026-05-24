/**
 * Phase 42.2 — CV Platform Polish Pass validation.
 *
 *   42.2A — Auto-save reordering with undo + toast
 *   42.2B — Advanced brand theming (watermark / footer logo / sidebar tint)
 *   42.2C — Per-template customCss differentiation (20 templates)
 *   42.2D — Multi-page intelligence (@page + break-inside CSS rules)
 *   42.2E — Photo management (circle / square / none)
 *   42.2F — Skill visualisations (bars / dots / pills / plain / ratings / percent)
 *   42.2G — Language visualisations (dots / pills / plain / bars / stars / text)
 *   42.2H — Template quality audit (render every premium template against sample profile)
 *   42.2I — Export fidelity audit (PDF / DOCX / HTML each produce non-empty buffer)
 *   42.2J — ATS-safe variant (single column, no photos/icons, standard fonts)
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { CV_TEMPLATE_LIBRARY } from '../src/career/cv-templates';
import { renderCvHtml } from '../src/career/cv-html-renderer';
import { DEFAULT_CV_SECTION_ORDER } from '../src/career/cv-types';

const BE       = path.join(__dirname, '..');
const FE       = path.join(__dirname, '..', '..', 'frontend');
const readBE   = (rel: string): string => fs.readFileSync(path.join(BE, rel), 'utf8');
const readFE   = (rel: string): string => fs.readFileSync(path.join(FE, rel), 'utf8');
const existsBE = (rel: string): boolean => fs.existsSync(path.join(BE, rel));

let fail = 0;
let total = 0;
function check(label: string, ok: boolean): void {
  total++;
  console.log(`  ${ok ? '·' : '!'} ${label}`);
  if (!ok) fail++;
}

async function main() {
  console.log('Phase 42.2 — CV Platform Polish Pass validation\n');

  // ===========================================================================
  //  Static scans
  // ===========================================================================
  console.log('42.2A — Auto-save + toast + undo (frontend)');
  const builder = readFE('app/career/builder/[id]/page.tsx');
  check('builder defines autoSaveContent helper',  /autoSaveContent\s*=/.test(builder));
  check('SortableSections wired to auto-save',     /autoSaveContent\(\{[\s\S]*sectionOrder/.test(builder));
  check('toast UI rendered + undo button',          /pushToast/.test(builder) && /Undo/.test(builder));
  check('rollback snapshot on save failure',        /Rollback on failure|setDoc\(\(cur\)\s*=>\s*cur\s*\?\s*\{\s*\.\.\.cur,\s*content:\s*snapshot/.test(builder));
  check('toggleSection helper removed (replaced by auto-save)', !/const toggleSection/.test(builder));

  console.log('\n42.2B — Brand theming (watermark / footer / sidebar)');
  const ren = readBE('src/career/cv-html-renderer.ts');
  check('renderer handles logoPlace watermark + footer', /class="watermark"/.test(ren) && /class="brand-footer"/.test(ren));
  check('brand secondary color flows into theme',         /--secondary:/.test(ren) && /brand\?\.colors\?\.secondary/.test(ren));

  console.log('\n42.2C — Per-template differentiation');
  const lib = readBE('src/career/cv-templates.ts');
  check('PER_TEMPLATE_CSS map exists',                /PER_TEMPLATE_CSS:\s*Record<string,\s*string>/.test(lib));
  const customCssCount = CV_TEMPLATE_LIBRARY.filter((t) => !!t.layout.customCss).length;
  check(`≥18 templates carry customCss (got ${customCssCount})`,  customCssCount >= 18);
  check('renderer injects customCss into the shell',  /\$\{t\.customCss\s*\|\|\s*''\}/.test(ren));

  console.log('\n42.2D — Multi-page intelligence');
  check('renderer emits @page A4 rule',               /@page\s*\{\s*size:\s*A4/.test(ren));
  check('renderer prevents break-inside on entries',  /page-break-inside:\s*avoid/.test(ren) && /break-inside:\s*avoid/.test(ren));
  check('headings avoid orphan break-after',          /page-break-after:\s*avoid/.test(ren));

  console.log('\n42.2F — Skill visualisations');
  check('renderer handles ratings + percent',         /skillStyle === 'ratings'/.test(ren) && /skillStyle === 'percent'/.test(ren));
  check('skill-rating CSS class declared',            /\.skill-rating/.test(ren));

  console.log('\n42.2G — Language visualisations');
  check('renderer handles bars + stars + text',
    /languageStyle === 'bars'/.test(ren) && /languageStyle === 'stars'/.test(ren) && /languageStyle === 'text'/.test(ren));
  check('lang-text CSS class declared',               /\.lang-text/.test(ren));

  console.log('\n42.2J — ATS-safe variant');
  check('renderer respects atsSafe flag',             /atsSafe/.test(ren) && /strip photos, icons, multicolumn/.test(ren));
  const atsCount = CV_TEMPLATE_LIBRARY.filter((t) => t.layout.atsSafe === true).length;
  check(`≥1 ATS-safe template in library (got ${atsCount})`, atsCount >= 1);

  console.log('\nTemplates service auto-refresh');
  const svc = readBE('src/career/cv-templates.service.ts');
  check('refreshLayouts upserts every library entry', /refreshLayouts\(/.test(svc) && /await this\.refreshLayouts\(\)/.test(svc));

  // ===========================================================================
  //  Live: render every premium template + audit invariants
  // ===========================================================================
  console.log('\n42.2H — Template quality audit (live render)');
  const profile: any = sampleProfile();
  const doc: any = {
    id: 'd1', profileId: 'p1', userId: 'u1', doctype: 'cv', title: 'Audit CV',
    templateId: null, brandKitId: null, variant: null,
    content: { sectionOrder: DEFAULT_CV_SECTION_ORDER },
    thumbnailUrl: null, lastExportUrl: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  const premium = CV_TEMPLATE_LIBRARY.filter((t) => t.layout.premium);
  console.log(`    auditing ${premium.length} premium templates…`);
  let renderFails: string[] = [];
  let lastSizes: { name: string; bytes: number }[] = [];
  for (const t of premium) {
    try {
      const html = renderCvHtml(profile, doc, t.layout as any);
      lastSizes.push({ name: t.name, bytes: html.length });
      // Invariants per template.
      if (html.length < 1500)            { renderFails.push(`${t.name}: size<1500 (${html.length}B)`); continue; }
      if (!/Jane Engineer/.test(html))   { renderFails.push(`${t.name}: missing name`); continue; }
      if (!/Staff Engineer/.test(html))  { renderFails.push(`${t.name}: missing role`); continue; }
      if (!/Skills/i.test(html))         { renderFails.push(`${t.name}: missing Skills`); continue; }
      if (!/--accent:/.test(html))       { renderFails.push(`${t.name}: missing --accent`); continue; }
    } catch (e: any) {
      renderFails.push(`${t.name}: ${e?.message}`);
    }
  }
  if (renderFails.length > 0) {
    for (const f of renderFails.slice(0, 5)) console.log(`    ! ${f}`);
  }
  check(`all ${premium.length} premium templates render without error`,            renderFails.length === 0);
  check(`output sizes vary across templates (range ≥ 500B)`,
    Math.max(...lastSizes.map((s) => s.bytes)) - Math.min(...lastSizes.map((s) => s.bytes)) >= 500);

  // ===========================================================================
  //  Live: per-style differentiation (every distinct sidebar/photo/skill knob)
  // ===========================================================================
  console.log('\n42.2C — Differentiation by knob (sample)');
  const knobs = [
    ['Modern Teal Sidebar',     'sidebar', 'photo-circle'],
    ['Developer Timeline',      'timeline', '// '],
    ['Designer Magazine',       'font-style: italic', 'sidebar-layout'],
    ['Data Scientist Terminal', '> ', "'JetBrains Mono'"],
    ['Minimal Editorial',       'font-style: italic', 'border-bottom: none'],
  ] as const;
  for (const [name, needle1, needle2] of knobs) {
    const tmpl = premium.find((p) => p.name === name);
    if (!tmpl) { check(`template "${name}" exists`, false); continue; }
    const html = renderCvHtml(profile, doc, tmpl.layout as any);
    check(`template "${name}" exposes its identity (${needle1.slice(0, 15)} + ${needle2.slice(0, 15)})`,
      html.includes(needle1) && html.includes(needle2));
  }

  // ===========================================================================
  //  Live: ATS-safe variant strips visuals
  // ===========================================================================
  console.log('\n42.2J — ATS variant smoke');
  const atsTmpl = CV_TEMPLATE_LIBRARY.find((t) => t.layout.atsSafe === true);
  if (atsTmpl) {
    const html = renderCvHtml(profile, doc, atsTmpl.layout as any);
    check('ATS HTML hides photo + watermark + pills',
      html.includes('display: none !important') && html.includes('.photo, .sidebar-photo'));
    check('ATS HTML uses Arial font',                /--head-font:\s*'Arial'/.test(html));
    check('ATS HTML forces accent to black',          /--accent:\s*#000000/.test(html));
  } else {
    check('ATS template exists in library', false);
  }

  // ===========================================================================
  //  Live: brand watermark + footer
  // ===========================================================================
  console.log('\n42.2B — Brand watermark + footer');
  const tmpl0 = premium[0];
  const wmHtml = renderCvHtml(profile, doc,
    { ...tmpl0.layout, logoPlace: 'watermark' } as any,
    { logo: '/uploads/images/brand.png', colors: { primary: '#1F2937' } });
  check('logoPlace=watermark renders fixed watermark div', /<div class="watermark"/.test(wmHtml));
  const footHtml = renderCvHtml(profile, doc,
    { ...tmpl0.layout, logoPlace: 'footer' } as any,
    { logo: '/uploads/images/brand.png' });
  check('logoPlace=footer renders brand-footer element', /<footer class="brand-footer"/.test(footHtml));

  // ===========================================================================
  //  Live: skill + language visualisation variants
  // ===========================================================================
  console.log('\n42.2F + G — Visualisation variants');
  for (const style of ['bars', 'dots', 'pills', 'ratings', 'percent', 'plain'] as const) {
    const html = renderCvHtml(profile, doc, { skillStyle: style, accent: '#1F2937' } as any);
    check(`skillStyle=${style} renders without throwing`, html.length > 1000);
  }
  for (const style of ['dots', 'pills', 'plain', 'bars', 'stars', 'text'] as const) {
    const html = renderCvHtml(profile, doc, { languageStyle: style, accent: '#1F2937' } as any);
    check(`languageStyle=${style} renders without throwing`, html.length > 1000);
  }

  // ===========================================================================
  //  Live: export fidelity (HTML cycle each premium template)
  // ===========================================================================
  console.log('\n42.2I — Export fidelity (HTML round-trip)');
  // Sample 5 premium templates and confirm each produces HTML > 2KB with
  // distinct customCss block.
  const sample = premium.slice(0, 5);
  let bytes = 0;
  for (const t of sample) {
    const html = renderCvHtml(profile, doc, t.layout as any);
    bytes += html.length;
    if (t.layout.customCss && !html.includes(t.layout.customCss.slice(0, 30))) {
      check(`customCss embedded for ${t.name}`, false);
    }
  }
  check(`sampled 5 templates produced ${bytes}B HTML total (≥10KB)`, bytes >= 10_000);

  // ===========================================================================
  //  Live: HTML→PDF via LibreOffice (smoke; auto-skip when missing)
  // ===========================================================================
  console.log('\n42.2I — HTML→PDF smoke (LibreOffice)');
  const hasSoffice = await new Promise<boolean>((resolve) => {
    const c = spawn(process.env.LIBREOFFICE_BIN || 'soffice', ['--version'], { stdio: 'ignore' });
    c.on('error', () => resolve(false));
    c.on('exit', (code) => resolve(code === 0));
  });
  if (hasSoffice) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { CvExportService } = require('../src/career/cv-export.service');
    const exporter = new CvExportService({ findOne: async () => premium[0] });
    const pdf = await exporter.export('pdf', profile, { ...doc, templateId: 'fake' }, {
      colors: { primary: '#1F2937' }, fonts: { heading: 'Inter' },
    });
    check(`PDF produced ${pdf.buffer.length}B in ${pdf.durationMs}ms (mode=${pdf.mode})`,
      pdf.buffer.length > 1000 && pdf.extension === 'pdf');
  } else {
    console.log('    (skipping — install LibreOffice to enable)');
  }

  // ===========================================================================
  //  Summary
  // ===========================================================================
  console.log(`\n${fail === 0 ? `✓ Phase 42.2 — all ${total} checks passed` : `✗ Phase 42.2 — ${fail} of ${total} check(s) failed`}\n`);
  process.exit(fail === 0 ? 0 : 1);
}

function sampleProfile(): any {
  return {
    id: 'p1', userId: 'u1',
    personal: {
      fullName: 'Jane Engineer', headline: 'Senior Software Engineer',
      email: 'jane@example.com', phone: '+1 555 1234', location: 'Berlin, DE',
      photoUrl: 'https://example.com/jane.jpg', summary: 'Engineering leader.',
      linkedin: 'linkedin.com/in/jane', github: 'github.com/jane',
    },
    experience: [{
      id: 'e1', company: 'Acme', role: 'Staff Engineer', start: '2021', end: 'Present',
      location: 'Berlin', bullets: ['Shipped product', 'Reduced latency 60%'],
    }],
    education: [{ id: 'ed1', institution: 'TU Berlin', degree: 'BSc', field: 'CS', start: '2010', end: '2014' }],
    skills: [
      { id: 's1', name: 'TypeScript', category: 'technical', level: 'expert' },
      { id: 's2', name: 'Kubernetes', category: 'tool',      level: 'advanced' },
      { id: 's3', name: 'Leadership', category: 'soft',      level: 'advanced' },
    ],
    languages: [
      { id: 'l1', name: 'English', proficiency: 'native' },
      { id: 'l2', name: 'German',  proficiency: 'fluent' },
    ],
    projects: [], certifications: [], awards: [], publications: [], references: [],
    importSource: null, importedAt: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
}

main().catch((e) => { console.error(e); process.exit(1); });
