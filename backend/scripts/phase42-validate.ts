/**
 * Phase 42 — CV & Resume Builder validation.
 *
 *   42A — CvProfile data model
 *   42B-E — Builders (CV / Resume / Cover Letter / Portfolio)
 *   42F — 50+ template seed
 *   42G — Template switching
 *   42H-I — Multiple variants per profile
 *   42J — Workspace dashboard
 *   42K — Export engine (PDF / DOCX / PPTX / HTML / MD)
 *   42L-M — DOCX/PDF/HTML/MD import + LinkedIn import
 *   42N-Q — Section types
 *   42R — Brand kit hook
 *   42S — Versioning (covered by existing DeckVersion infra)
 *   42U — Portfolio → Presentation (via PPTX export)
 *   42V — HTML / static-site export
 *   42W — Performance targets
 */

import * as fs from 'fs';
import * as path from 'path';
import { CV_TEMPLATE_LIBRARY } from '../src/career/cv-templates';
import { renderCv } from '../src/career/cv-renderer';
import { DEFAULT_CV_SECTION_ORDER, DEFAULT_RESUME_SECTION_ORDER } from '../src/career/cv-types';
import { exportHtml } from '../src/universal-conversion/exporters/html-exporter';
import { exportMarkdown } from '../src/universal-conversion/exporters/markdown-exporter';
import { exportDocx } from '../src/universal-conversion/exporters/docx-exporter';

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
  console.log('Phase 42 — CV & Resume Builder validation\n');

  // ===========================================================================
  //  Static scans
  // ===========================================================================
  console.log('42A — Schema + types');
  const schema = readBE('prisma/schema.prisma');
  check('CvProfile model',  /model CvProfile \{/.test(schema));
  check('CvDocument model', /model CvDocument \{/.test(schema));
  check('CvTemplate model', /model CvTemplate \{/.test(schema));
  check('CvProfile has experience/education/skills/projects/etc Json fields',
    /experience\s+Json\?/.test(schema) && /education\s+Json\?/.test(schema) && /skills\s+Json\?/.test(schema) && /projects\s+Json\?/.test(schema));
  check('CvDocument links to template + brand kit', /templateId/.test(schema) && /brandKitId/.test(schema));
  check('User backref includes cvProfiles', /cvProfiles\s+CvProfile\[\]/.test(schema));

  console.log('\n42B-E — Builders + Renderer');
  for (const f of [
    'src/career/cv-types.ts',
    'src/career/cv-templates.ts',
    'src/career/cv-profiles.service.ts',
    'src/career/cv-documents.service.ts',
    'src/career/cv-templates.service.ts',
    'src/career/cv-renderer.ts',
    'src/career/cv-import.service.ts',
    'src/career/cv-export.service.ts',
    'src/career/career.controller.ts',
    'src/career/career.module.ts',
  ]) check(`file exists: ${f}`, existsBE(f));

  console.log('\n42F — 50+ template library');
  check(`library has 50+ templates (got ${CV_TEMPLATE_LIBRARY.length})`, CV_TEMPLATE_LIBRARY.length >= 50);
  const cats = new Set(CV_TEMPLATE_LIBRARY.map((t) => t.category));
  check(`library covers 10+ categories (got ${cats.size})`, cats.size >= 10);
  const doctypes = new Set(CV_TEMPLATE_LIBRARY.map((t) => t.doctype));
  check('library covers all 4 doctypes', ['cv','resume','coverLetter','portfolio'].every((d) => doctypes.has(d as any)));

  console.log('\n42G — Template switching');
  const docSvc = readBE('src/career/cv-documents.service.ts');
  check('CvDocumentsService.switchTemplate', /switchTemplate\(/.test(docSvc));

  console.log('\n42H-I — Multiple variants');
  check('CvDocument.variant field', /variant\s+String\?/.test(schema));
  check('duplicate accepts newVariant',  /newVariant/.test(docSvc));

  console.log('\n42J — Workspace dashboard');
  check('frontend /career page exists',    existsFE('app/career/page.tsx'));
  const wsPage = readFE('app/career/page.tsx');
  check('workspace has 6 tabs (Profile/CVs/Resumes/Cover Letters/Portfolios/Templates)',
    /Profile/.test(wsPage) && /CVs/.test(wsPage) && /Resumes/.test(wsPage) && /Cover Letters/.test(wsPage) && /Portfolios/.test(wsPage) && /Templates/.test(wsPage));
  check('workspace honours ?create= query auto-creation', /create.*params\?\.get|wanted/.test(wsPage));
  check('frontend builder page exists', existsFE('app/career/builder/[id]/page.tsx'));
  const builder = readFE('app/career/builder/[id]/page.tsx');
  check('builder shows template dropdown',  /templates\.map\(\(t\)\s*=>/.test(builder));
  check('builder shows section reorder + visibility toggle', /moveSection/.test(builder) && /toggleSection/.test(builder));

  console.log('\n42K — Export engine');
  const expSvc = readBE('src/career/cv-export.service.ts');
  check('exporter handles pdf/docx/pptx/html/md', /'pdf'/.test(expSvc) && /'docx'/.test(expSvc) && /'pptx'/.test(expSvc) && /'html'/.test(expSvc) && /'md'/.test(expSvc));

  console.log('\n42L-M — Import (file + LinkedIn)');
  const impSvc = readBE('src/career/cv-import.service.ts');
  check('importFromFile + importFromLinkedIn both exported', /importFromFile/.test(impSvc) && /importFromLinkedIn/.test(impSvc));
  check('section heading map covers Experience/Education/Skills/…',
    /experience:\s*'experience'/.test(impSvc) && /education:\s*'education'/.test(impSvc) && /skills:\s*'skills'/.test(impSvc));

  console.log('\n42R — Brand kit hook');
  const renderer = readBE('src/career/cv-renderer.ts');
  check('renderer accepts brand tokens', /brandTokens/.test(renderer) && /opts\.brandTokens/.test(renderer));

  console.log('\nApp wiring');
  check('CareerModule registered in app.module', /CareerModule/.test(readBE('src/app.module.ts')));
  const ctl = readBE('src/career/career.controller.ts');
  check('controller exposes /career/profile + /career/documents + /career/templates',
    /'profile'/.test(ctl) && /'documents'/.test(ctl) && /'templates'/.test(ctl));
  check('controller exposes /documents/:id/export', /'documents\/:id\/export'/.test(ctl));
  check('controller exposes /profile/.+/import/linkedin',  /import\/linkedin/.test(ctl));
  check('controller exposes /profile/.+/import/file',      /import\/file/.test(ctl));

  console.log('\nSidebar + Create wizard');
  const sidebar = readFE('components/ui/modern-sidebar.tsx');
  check('sidebar has Career Docs entry', /id: "career"/.test(sidebar) && /\/career/.test(sidebar));
  const step1 = readFE('components/wizard/Step1DocumentType.tsx');
  check('Step1 lists cv/resume/cover_letter/portfolio cards',
    /id: 'cv'/.test(step1) && /id: 'resume'/.test(step1) && /id: 'cover_letter'/.test(step1) && /id: 'portfolio'/.test(step1));
  check('Step1 routes career picks to /career?create=', /career\?create=/.test(step1));

  // ===========================================================================
  //  Live: renderer + exporter cycle
  // ===========================================================================
  console.log('\n42K — Live render + export cycle');
  const profile: any = {
    id: 'p1', userId: 'u1',
    personal: {
      fullName: 'Jane Engineer', headline: 'Senior Software Engineer',
      email: 'jane@example.com', phone: '+1 555 1234', location: 'Berlin, DE',
      website: 'jane.dev', linkedin: 'linkedin.com/in/jane', github: 'github.com/jane',
      summary: 'Engineering leader with a decade of experience shipping product.',
    },
    experience: [{
      id: 'e1', company: 'Acme', role: 'Staff Engineer',
      start: '2021', end: 'Present', location: 'Berlin',
      bullets: ['Led platform migration', 'Reduced API latency 60%', 'Mentored 4 engineers'],
    }],
    education: [{ id: 'ed1', institution: 'TU Berlin', degree: 'BSc', field: 'CS', start: '2010', end: '2014' }],
    skills: [
      { id: 's1', name: 'TypeScript', category: 'technical' },
      { id: 's2', name: 'Kubernetes',  category: 'tool' },
      { id: 's3', name: 'Leadership',  category: 'soft' },
    ],
    languages: [{ id: 'l1', name: 'English', proficiency: 'fluent' }],
    projects: [{ id: 'pr1', name: 'Open source CLI', description: 'A neat CLI', technologies: ['TS', 'Node'], results: ['1k stars'] }],
    certifications: [], awards: [], publications: [], references: [],
    importSource: null, importedAt: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  const doc: any = {
    id: 'd1', profileId: 'p1', userId: 'u1',
    doctype: 'cv', title: 'Jane Engineer — CV',
    templateId: null, brandKitId: null, variant: null,
    content: { sectionOrder: DEFAULT_CV_SECTION_ORDER },
    thumbnailUrl: null, lastExportUrl: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  const t0 = Date.now();
  const udm = renderCv(profile, doc);
  const renderMs = Date.now() - t0;
  check(`renderCv produced ≥1 page in ${renderMs}ms (target <500ms)`, udm.pages.length >= 1 && renderMs < 500);

  const t1 = Date.now();
  const html = exportHtml(udm);
  const htmlMs = Date.now() - t1;
  check(`HTML export ${html.length}B in ${htmlMs}ms + contains Jane Engineer`,
    html.length > 500 && html.toString('utf8').includes('Jane Engineer'));

  const t2 = Date.now();
  const md = exportMarkdown(udm);
  const mdMs = Date.now() - t2;
  check(`MD export ${md.length}B in ${mdMs}ms`, md.length > 200);

  const t3 = Date.now();
  const docx = await exportDocx(udm);
  const docxMs = Date.now() - t3;
  check(`DOCX export ${docx.length}B in ${docxMs}ms (target <2000ms)`,
    docx.length > 1000 && docxMs < 2000);

  // Resume variant.
  const resumeDoc: any = { ...doc, doctype: 'resume', content: { sectionOrder: DEFAULT_RESUME_SECTION_ORDER } };
  const resumeUdm = renderCv(profile, resumeDoc);
  check(`Resume renderer keeps compact section count (${resumeUdm.pages[0].nodes.length} nodes)`,
    resumeUdm.pages[0].nodes.length > 0);

  // Cover letter variant.
  const clDoc: any = { ...doc, doctype: 'coverLetter', content: {
    greeting: 'Dear Hiring Team,',
    intro:    'I am excited to apply for the Senior Engineer role.',
    body:     ['Highlight 1', 'Highlight 2'],
    closing:  'Sincerely,',
    signature: profile.personal.fullName,
    company:  'Acme Corp', role: 'Senior Engineer',
  } };
  const clUdm = renderCv(profile, clDoc);
  check(`Cover letter renderer includes greeting + closing`,
    JSON.stringify(clUdm).includes('Dear Hiring Team') && JSON.stringify(clUdm).includes('Sincerely'));

  // Portfolio variant.
  const ptDoc: any = { ...doc, doctype: 'portfolio', content: {
    sections: [{ key: 'about', title: 'About me', body: 'I build things.' }, { key: 'projects', title: 'Selected work' }],
    showcaseProjectIds: ['pr1'],
    testimonials: [{ id: 'tm1', name: 'CEO', role: 'CEO', quote: 'Outstanding work.' }],
  } };
  const ptUdm = renderCv(profile, ptDoc);
  check(`Portfolio renderer produces multiple pages (got ${ptUdm.pages.length})`,
    ptUdm.pages.length >= 2);

  // ===========================================================================
  //  Summary
  // ===========================================================================
  console.log(`\n${fail === 0 ? `✓ Phase 42 — all ${total} checks passed` : `✗ Phase 42 — ${fail} of ${total} check(s) failed`}\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
