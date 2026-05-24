import {
  UniversalDocument, DocumentNode, emptyDocument, newPage,
  heading, paragraph,
} from '../universal-conversion/document-model';
import {
  CvProfileDto, CvDocumentDto, CvDoctype, CvSectionKey,
  CvDocumentContent_CV, CvDocumentContent_CoverLetter, CvDocumentContent_Portfolio,
  DEFAULT_CV_SECTION_ORDER,
} from './cv-types';

// =============================================================================
//  Phase 42K — CV → UniversalDocument renderer.
//
//  Reduces a CvProfile + CvDocument + (optional) template + (optional)
//  brand kit tokens into the same UniversalDocument shape every existing
//  exporter already consumes. Concretely:
//
//      renderCv(profile, doc, opts) → UniversalDocument
//
//  Downstream exporters do the rest:
//      exportPdf      → universal-conversion/exporters/pdf-exporter
//      exportDocx     → universal-conversion/exporters/docx-exporter
//      exportPptx     → universal-conversion/exporters/pptx-exporter
//      exportHtml     → universal-conversion/exporters/html-exporter
//      exportMarkdown → universal-conversion/exporters/markdown-exporter
//
//  This keeps the career renderer 100% DRY — we never re-invent PDF / DOCX
//  emission code; we lean on the Phase 41 conversion pipeline.
// =============================================================================

export interface RenderOpts {
  brandTokens?: { colors?: any; fonts?: any };
  templateLayout?: any;     // CvTemplate.layout JSON
}

export function renderCv(profile: CvProfileDto, doc: CvDocumentDto, opts: RenderOpts = {}): UniversalDocument {
  switch (doc.doctype) {
    case 'cv':
    case 'resume':       return renderCvOrResume(profile, doc, opts);
    case 'coverLetter':  return renderCoverLetter(profile, doc, opts);
    case 'portfolio':    return renderPortfolio(profile, doc, opts);
    default:
      throw new Error(`Unknown doctype "${doc.doctype}"`);
  }
}

// =============================================================================
//  CV / Resume
// =============================================================================

function renderCvOrResume(profile: CvProfileDto, doc: CvDocumentDto, opts: RenderOpts): UniversalDocument {
  const content   = (doc.content as CvDocumentContent_CV);
  const order     = content?.sectionOrder ?? DEFAULT_CV_SECTION_ORDER;
  const overrides = content?.sectionOverrides ?? {};
  const out       = emptyDocument('docx', doc.title);
  applyTheme(out, opts);

  const page = newPage(profile.personal?.fullName || doc.title);
  out.pages.push(page);

  for (const key of order) {
    const nodes = renderSection(key, profile, overrides, doc);
    page.nodes.push(...nodes);
  }
  return out;
}

function renderSection(
  key: CvSectionKey,
  profile: CvProfileDto,
  overrides: NonNullable<CvDocumentContent_CV['sectionOverrides']>,
  doc: CvDocumentDto,
): DocumentNode[] {
  switch (key) {
    case 'header': {
      const p = profile.personal || {};
      const out: DocumentNode[] = [];
      if (p.fullName) out.push(heading(1, p.fullName));
      if (p.headline) out.push(paragraph(p.headline));
      const contact = [p.email, p.phone, p.location, p.website, p.linkedin, p.github]
        .filter(Boolean).join('  •  ');
      if (contact) out.push(paragraph(contact, [{ text: contact, italic: true }]));
      return out;
    }

    case 'summary': {
      const text = overrides.summary ?? profile.personal?.summary;
      if (!text) return [];
      return [heading(2, 'Summary'), paragraph(text)];
    }

    case 'experience': {
      let list = profile.experience || [];
      if (overrides.experienceIds?.length) {
        const set = new Set(overrides.experienceIds);
        list = list.filter((e) => set.has(e.id));
      }
      if (list.length === 0) return [];
      const out: DocumentNode[] = [heading(2, 'Experience')];
      for (const e of list) {
        out.push(paragraph(`${e.role} — ${e.company}`, [{ text: `${e.role} — ${e.company}`, bold: true }]));
        const meta = [e.location, formatRange(e.start, e.end)].filter(Boolean).join('  •  ');
        if (meta) out.push(paragraph(meta, [{ text: meta, italic: true, color: '#64748B' }]));
        if (e.bullets?.length) out.push({ type: 'list', ordered: false, items: e.bullets });
      }
      return out;
    }

    case 'education': {
      const list = profile.education || [];
      if (list.length === 0) return [];
      const out: DocumentNode[] = [heading(2, 'Education')];
      for (const ed of list) {
        const line = [ed.degree, ed.field].filter(Boolean).join(', ');
        out.push(paragraph(`${line || ed.institution}${line && ed.institution ? ` — ${ed.institution}` : ''}`, [{
          text: `${line || ed.institution}${line && ed.institution ? ` — ${ed.institution}` : ''}`, bold: true,
        }]));
        const meta = [formatRange(ed.start, ed.end), ed.gpa ? `GPA ${ed.gpa}` : ''].filter(Boolean).join('  •  ');
        if (meta) out.push(paragraph(meta, [{ text: meta, italic: true, color: '#64748B' }]));
        if (ed.honors?.length) out.push({ type: 'list', ordered: false, items: ed.honors });
      }
      return out;
    }

    case 'skills': {
      let list = profile.skills || [];
      if (overrides.skillIds?.length) {
        const set = new Set(overrides.skillIds);
        list = list.filter((s) => set.has(s.id));
      }
      if (list.length === 0) return [];
      // Group by category
      const groups = new Map<string, string[]>();
      for (const s of list) {
        const cat = s.category || 'other';
        if (!groups.has(cat)) groups.set(cat, []);
        groups.get(cat)!.push(s.name + (s.level ? ` (${s.level})` : ''));
      }
      const out: DocumentNode[] = [heading(2, 'Skills')];
      for (const [cat, names] of groups) {
        out.push(paragraph(`${capitalise(cat)}: ${names.join(', ')}`, [
          { text: `${capitalise(cat)}: `, bold: true },
          { text: names.join(', ') },
        ]));
      }
      return out;
    }

    case 'languages': {
      const list = profile.languages || [];
      if (list.length === 0) return [];
      return [
        heading(2, 'Languages'),
        { type: 'list', ordered: false, items: list.map((l) => `${l.name} — ${l.proficiency}`) },
      ];
    }

    case 'projects': {
      let list = profile.projects || [];
      if (overrides.projectIds?.length) {
        const set = new Set(overrides.projectIds);
        list = list.filter((p) => set.has(p.id));
      }
      if (list.length === 0) return [];
      const out: DocumentNode[] = [heading(2, 'Projects')];
      for (const p of list) {
        out.push(paragraph(p.name, [{ text: p.name, bold: true }]));
        if (p.description) out.push(paragraph(p.description));
        if (p.technologies?.length) {
          out.push(paragraph(`Technologies: ${p.technologies.join(', ')}`, [
            { text: 'Technologies: ', bold: true },
            { text: p.technologies.join(', ') },
          ]));
        }
        if (p.results?.length) out.push({ type: 'list', ordered: false, items: p.results });
        if (p.links?.length) {
          out.push(paragraph(p.links.map((l) => `${l.label}: ${l.url}`).join('  •  ')));
        }
      }
      return out;
    }

    case 'certifications': {
      const list = profile.certifications || [];
      if (list.length === 0) return [];
      return [
        heading(2, 'Certifications'),
        { type: 'list', ordered: false, items: list.map((c) => `${c.name} — ${c.issuer}${c.date ? ` (${c.date})` : ''}`) },
      ];
    }

    case 'awards': {
      const list = profile.awards || [];
      if (list.length === 0) return [];
      return [
        heading(2, 'Awards'),
        { type: 'list', ordered: false, items: list.map((a) => `${a.title}${a.issuer ? ` — ${a.issuer}` : ''}${a.date ? ` (${a.date})` : ''}`) },
      ];
    }

    case 'publications': {
      const list = profile.publications || [];
      if (list.length === 0) return [];
      return [
        heading(2, 'Publications'),
        { type: 'list', ordered: false, items: list.map((p) => `${p.title}${p.venue ? ` — ${p.venue}` : ''}${p.date ? ` (${p.date})` : ''}`) },
      ];
    }

    case 'references': {
      const list = profile.references || [];
      if (list.length === 0) return [];
      const out: DocumentNode[] = [heading(2, 'References')];
      for (const r of list) {
        out.push(paragraph(`${r.name}${r.title ? `, ${r.title}` : ''}${r.company ? ` — ${r.company}` : ''}`));
        const c = [r.email, r.phone].filter(Boolean).join(' • ');
        if (c) out.push(paragraph(c));
      }
      return out;
    }

    // Portfolio-only sections — no-op in CV/resume context.
    case 'testimonials':
    case 'caseStudies':
    case 'achievements':
      return [];
  }
}

// =============================================================================
//  Cover Letter
// =============================================================================

function renderCoverLetter(profile: CvProfileDto, doc: CvDocumentDto, opts: RenderOpts): UniversalDocument {
  const c   = (doc.content as CvDocumentContent_CoverLetter);
  const out = emptyDocument('docx', doc.title);
  applyTheme(out, opts);
  const page = newPage(profile.personal?.fullName || doc.title);
  out.pages.push(page);

  // Header line.
  const p = profile.personal || {};
  if (p.fullName) page.nodes.push(heading(1, p.fullName));
  const contact = [p.email, p.phone, p.location].filter(Boolean).join('  •  ');
  if (contact) page.nodes.push(paragraph(contact, [{ text: contact, italic: true, color: '#64748B' }]));

  // Date + addressee.
  page.nodes.push(paragraph(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })));
  if (c.company || c.role) page.nodes.push(paragraph([c.role, c.company].filter(Boolean).join(' — ')));
  if (c.hiringManager) page.nodes.push(paragraph(c.hiringManager));

  // Body.
  page.nodes.push(paragraph(c.greeting || 'Dear Hiring Manager,'));
  if (c.intro)      page.nodes.push(paragraph(c.intro));
  for (const para of c.body || []) if (para) page.nodes.push(paragraph(para));
  if (c.whyCompany) page.nodes.push(paragraph(c.whyCompany));
  page.nodes.push(paragraph(c.closing || 'Sincerely,'));
  page.nodes.push(paragraph(c.signature || profile.personal?.fullName || ''));
  return out;
}

// =============================================================================
//  Portfolio
// =============================================================================

function renderPortfolio(profile: CvProfileDto, doc: CvDocumentDto, opts: RenderOpts): UniversalDocument {
  const c   = (doc.content as CvDocumentContent_Portfolio);
  const out = emptyDocument('docx', doc.title);
  applyTheme(out, opts);

  // Cover page.
  out.pages.push({
    title: profile.personal?.fullName || doc.title,
    nodes: [
      heading(1, profile.personal?.fullName || doc.title),
      ...(profile.personal?.headline ? [paragraph(profile.personal.headline)] : []),
      ...(profile.personal?.summary  ? [paragraph(profile.personal.summary)]  : []),
    ],
  });

  // Sections.
  for (const sec of c.sections || []) {
    const page = newPage(sec.title);
    page.nodes.push(heading(1, sec.title));
    if (sec.body) page.nodes.push(paragraph(sec.body));
    if (sec.key === 'projects') {
      const ids = sec.itemIds?.length ? new Set(sec.itemIds) : null;
      const projects = (profile.projects || []).filter((p) => !ids || ids.has(p.id));
      for (const p of projects) {
        page.nodes.push(heading(2, p.name));
        if (p.description)       page.nodes.push(paragraph(p.description));
        if (p.technologies?.length) page.nodes.push(paragraph(`Stack: ${p.technologies.join(', ')}`));
        if (p.results?.length)   page.nodes.push({ type: 'list', ordered: false, items: p.results });
        if (p.links?.length)     page.nodes.push(paragraph(p.links.map((l) => `${l.label}: ${l.url}`).join('  •  ')));
      }
    }
    out.pages.push(page);
  }

  // Testimonials.
  if (c.testimonials?.length) {
    const page = newPage('Testimonials');
    page.nodes.push(heading(1, 'Testimonials'));
    for (const t of c.testimonials) {
      page.nodes.push({ type: 'quote', text: t.quote, attribution: `${t.name}, ${t.role}${t.company ? ` — ${t.company}` : ''}` });
    }
    out.pages.push(page);
  }

  // Case studies.
  if (c.caseStudies?.length) {
    const page = newPage('Case studies');
    page.nodes.push(heading(1, 'Case studies'));
    for (const cs of c.caseStudies) {
      page.nodes.push(heading(2, cs.title));
      page.nodes.push(paragraph(`Problem: ${cs.problem}`, [{ text: 'Problem: ', bold: true }, { text: cs.problem }]));
      page.nodes.push(paragraph(`Solution: ${cs.solution}`, [{ text: 'Solution: ', bold: true }, { text: cs.solution }]));
      page.nodes.push(paragraph(`Outcome: ${cs.outcome}`, [{ text: 'Outcome: ', bold: true }, { text: cs.outcome }]));
    }
    out.pages.push(page);
  }
  return out;
}

// =============================================================================
//  Helpers
// =============================================================================

function applyTheme(doc: UniversalDocument, opts: RenderOpts) {
  const layout = opts.templateLayout || {};
  doc.theme = {
    colors: {
      primary:    opts.brandTokens?.colors?.primary    ?? layout.accent ?? '#1F2937',
      secondary:  opts.brandTokens?.colors?.secondary  ?? '#64748B',
      accent:     opts.brandTokens?.colors?.accent     ?? layout.accent ?? '#0EA5E9',
      text:       '#0F172A',
      background: '#FFFFFF',
    },
    fonts: {
      heading: opts.brandTokens?.fonts?.heading ?? layout.typography?.heading ?? 'Inter',
      body:    opts.brandTokens?.fonts?.body    ?? layout.typography?.body    ?? 'Inter',
    },
  };
}

function formatRange(start?: string, end?: string): string {
  const a = start || '';
  const b = end || 'Present';
  return [a, b].filter(Boolean).join(' – ');
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
