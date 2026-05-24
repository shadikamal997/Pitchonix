/**
 * Phase 42.1 — CV Builder Completion Pass validation.
 *
 *   1. DB migration applied + tables exist + templates seeded
 *   2. HTML renderer produces template-aware HTML (sidebar/photo/skill-bars)
 *   3. 20+ premium templates registered with the new layout knobs
 *   4. HTML → PDF works via LibreOffice (when available)
 *   5. BrandKit tokens override template defaults in the renderer
 *   6. dnd-kit wired into the builder section list
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { CV_TEMPLATE_LIBRARY } from '../src/career/cv-templates';
import { renderCvHtml } from '../src/career/cv-html-renderer';
import { DEFAULT_CV_SECTION_ORDER } from '../src/career/cv-types';
import { PrismaService } from '../src/prisma/prisma.service';

const BE       = path.join(__dirname, '..');
const FE       = path.join(__dirname, '..', '..', 'frontend');
const readBE   = (rel: string): string => fs.readFileSync(path.join(BE, rel), 'utf8');
const readFE   = (rel: string): string => fs.readFileSync(path.join(FE, rel), 'utf8');
const existsBE = (rel: string): boolean => fs.existsSync(path.join(BE, rel));
const existsFE = (rel: string): boolean => fs.existsSync(path.join(FE, rel));

let fail = 0;
let total = 0;
function check(label: string, ok: boolean): void {
  total++;
  console.log(`  ${ok ? '·' : '!'} ${label}`);
  if (!ok) fail++;
}

async function main() {
  console.log('Phase 42.1 — CV Builder Completion Pass validation\n');

  // ===========================================================================
  //  Static scans
  // ===========================================================================
  console.log('1. HTML renderer + templates');
  check('cv-html-renderer.ts exists', existsBE('src/career/cv-html-renderer.ts'));
  const ren = readBE('src/career/cv-html-renderer.ts');
  check('renderer supports sidebar/photo/timeline/skill-bars',
    /sidebarLayout/.test(ren) && /renderPhoto/.test(ren) && /timeline/.test(ren) && /skill-bar/.test(ren));
  check('renderer respects brand tokens (colors + fonts + logo)',
    /brand\?\.colors\?\.primary/.test(ren) && /brand\?\.fonts\?\.heading/.test(ren) && /brand-logo/.test(ren));

  const premiumCount = CV_TEMPLATE_LIBRARY.filter((t) => t.layout.premium === true).length;
  check(`library has ≥20 premium templates (got ${premiumCount})`, premiumCount >= 20);
  const skillBars = CV_TEMPLATE_LIBRARY.filter((t) => t.layout.skillStyle === 'bars').length;
  const photoCircles = CV_TEMPLATE_LIBRARY.filter((t) => t.layout.photoShape === 'circle').length;
  const timelines = CV_TEMPLATE_LIBRARY.filter((t) => t.layout.timeline === true).length;
  const sidebars = CV_TEMPLATE_LIBRARY.filter((t) => t.layout.style === 'sidebar').length;
  check(`templates exercise skill bars (${skillBars}), photo circles (${photoCircles}), timelines (${timelines}), sidebars (${sidebars})`,
    skillBars >= 5 && photoCircles >= 5 && timelines >= 2 && sidebars >= 5);

  console.log('\n2. CV export pipeline upgrades');
  const exp = readBE('src/career/cv-export.service.ts');
  check('exporter uses renderCvHtml for html + pdf', /renderCvHtml/.test(exp) && /case 'html'/.test(exp) && /case 'pdf'/.test(exp));
  check('exporter shells out to soffice for HTML→PDF', /htmlToPdf/.test(exp) && /soffice/.test(exp) && /convert-to.*pdf/.test(exp));
  check('exporter falls back to UDM pipeline when soffice missing', /falling back to UDM PDF pipeline/.test(exp));

  console.log('\n3. BrandKit wiring');
  const ctl = readBE('src/career/career.controller.ts');
  check('controller imports BrandKitsService', /BrandKitsService/.test(ctl));
  check('controller has resolveBrandTokens helper',  /resolveBrandTokens/.test(ctl));
  check('export route passes brandTokens to exporter', /this\.exporter\.export\(fmt, profile, doc, brandTokens\)/.test(ctl));
  const mod = readBE('src/career/career.module.ts');
  check('career module imports BrandKitsModule', /BrandKitsModule/.test(mod));

  console.log('\n4. Drag-and-drop wiring (frontend)');
  const builder = readFE('app/career/builder/[id]/page.tsx');
  check('builder imports @dnd-kit/core + sortable',  /@dnd-kit\/core/.test(builder) && /@dnd-kit\/sortable/.test(builder));
  check('builder defines SortableSections + SortableSectionRow', /SortableSections/.test(builder) && /SortableSectionRow/.test(builder));
  check('builder uses arrayMove on drag end',        /arrayMove\(items, from, to\)/.test(builder));
  check('builder no longer uses moveSection up/down arrows', !/const moveSection/.test(builder));

  // ===========================================================================
  //  Live: DB tables + template seed count
  // ===========================================================================
  console.log('\n5. DB migration + seed');
  const prisma = new (PrismaService as any)();
  try {
    const profilesCount  = await prisma.cvProfile.count();
    const documentsCount = await prisma.cvDocument.count();
    const templatesCount = await prisma.cvTemplate.count();
    console.log(`    cv_profiles=${profilesCount}, cv_documents=${documentsCount}, cv_templates=${templatesCount}`);
    check(`cv_templates table seeded (${templatesCount} ≥ 50)`,            templatesCount >= 50);
    check('cv_profiles + cv_documents tables exist (counts queryable)',     profilesCount >= 0 && documentsCount >= 0);
  } catch (e: any) {
    check(`Prisma query threw: ${e?.message}`, false);
  } finally {
    try { await prisma.$disconnect(); } catch { /* */ }
  }

  // ===========================================================================
  //  Live: HTML renderer cycle (no DB needed)
  // ===========================================================================
  console.log('\n6. HTML renderer live');
  const profile: any = {
    id: 'p1', userId: 'u1',
    personal: {
      fullName: 'Jane Engineer', headline: 'Senior Software Engineer',
      email: 'jane@example.com', phone: '+1 555 1234', location: 'Berlin, DE',
      photoUrl: 'https://example.com/jane.jpg',
      summary: 'Engineering leader with a decade of experience.',
    },
    experience: [{ id: 'e1', company: 'Acme', role: 'Staff Engineer', start: '2021', end: 'Present', bullets: ['Shipped product'] }],
    education: [{ id: 'ed1', institution: 'TU Berlin', degree: 'BSc', field: 'CS', start: '2010', end: '2014' }],
    skills: [
      { id: 's1', name: 'TypeScript', category: 'technical', level: 'expert' },
      { id: 's2', name: 'Kubernetes', category: 'tool',      level: 'advanced' },
      { id: 's3', name: 'Leadership', category: 'soft',      level: 'advanced' },
    ],
    languages: [{ id: 'l1', name: 'English', proficiency: 'native' }, { id: 'l2', name: 'German', proficiency: 'fluent' }],
    projects: [], certifications: [], awards: [], publications: [], references: [],
    importSource: null, importedAt: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  const doc: any = {
    id: 'd1', profileId: 'p1', userId: 'u1', doctype: 'cv', title: 'Jane Engineer — CV',
    templateId: null, brandKitId: null, variant: null,
    content: { sectionOrder: DEFAULT_CV_SECTION_ORDER },
    thumbnailUrl: null, lastExportUrl: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };

  // Sidebar template with photo + bars.
  const t0 = Date.now();
  const html = renderCvHtml(profile, doc, {
    style: 'sidebar', sidebarColor: 'accent', sidebarSide: 'left',
    photoShape: 'circle', photoPlace: 'sidebar',
    skillStyle: 'bars', languageStyle: 'dots',
    accent: '#0F766E', headerStyle: 'sidebar',
    typography: { heading: 'Inter', body: 'Inter' }, density: 'comfortable',
  });
  const renderMs = Date.now() - t0;
  check(`renderCvHtml produced ${html.length}B in ${renderMs}ms (<500ms)`, html.length > 1000 && renderMs < 500);
  check('output contains sidebar-layout class',  /class="page sidebar-layout/.test(html));
  check('output contains photo image tag',       /class="photo photo-circle"/.test(html));
  check('output contains skill-bar block',       /class="skill-bar"/.test(html));
  check('output contains language dots',         /lang/.test(html) && /●/.test(html));
  check('output contains experience entries',    html.includes('Staff Engineer'));

  // Brand-kit override changes the accent + heading font.
  const brandedHtml = renderCvHtml(profile, doc, {
    style: 'classic', accent: '#1F2937', headerStyle: 'block',
    typography: { heading: 'Inter', body: 'Inter' }, density: 'comfortable',
  }, {
    colors: { primary: '#DC2626' },
    fonts:  { heading: 'Playfair' },
    logo:   '/uploads/images/brand.png',
  });
  check('brand override colors applied to --accent', /--accent:\s*#DC2626/.test(brandedHtml));
  check('brand override fonts applied to --head-font', /--head-font:\s*'Playfair'/.test(brandedHtml));
  check('brand logo image embedded', /class="brand-logo"/.test(brandedHtml));

  // ===========================================================================
  //  Live: LibreOffice availability + HTML→PDF probe (uses 38.6 install)
  // ===========================================================================
  console.log('\n7. HTML → PDF probe (LibreOffice)');
  const hasSoffice = await new Promise<boolean>((resolve) => {
    const c = spawn(process.env.LIBREOFFICE_BIN || 'soffice', ['--version'], { stdio: 'ignore' });
    c.on('error', () => resolve(false));
    c.on('exit', (code) => resolve(code === 0));
  });
  console.log(`    LibreOffice available: ${hasSoffice ? 'YES' : 'NO'}`);
  if (hasSoffice) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { CvExportService } = require('../src/career/cv-export.service');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { CvTemplatesService } = require('../src/career/cv-templates.service');
    // Templates service needs prisma; we stub with a minimal mock.
    const tmplStub = { findOne: async () => null };
    const exporter = new CvExportService(tmplStub as any);
    const pdf = await exporter.export('pdf', profile, doc, { colors: { primary: '#0F766E' } });
    check(`HTML→PDF produced ${pdf.buffer.length}B in ${pdf.durationMs}ms (mode=${pdf.mode})`,
      pdf.buffer.length > 1000 && pdf.extension === 'pdf' && pdf.mode === 'libreoffice');
  } else {
    console.log('    (skipping HTML→PDF live test; brew install --cask libreoffice && brew install poppler)');
  }

  // ===========================================================================
  //  Summary
  // ===========================================================================
  console.log(`\n${fail === 0 ? `✓ Phase 42.1 — all ${total} checks passed` : `✗ Phase 42.1 — ${fail} of ${total} check(s) failed`}\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
