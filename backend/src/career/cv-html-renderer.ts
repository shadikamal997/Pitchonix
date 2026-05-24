import { CvProfileDto, CvDocumentDto, CvDocumentContent_CV, CvDocumentContent_CoverLetter, CvDocumentContent_Portfolio, CvSectionKey, DEFAULT_CV_SECTION_ORDER } from './cv-types';

// =============================================================================
//  Phase 42.1 — Template-aware HTML renderer.
//
//  Produces a self-contained HTML document that visually reflects the
//  chosen template (sidebar / two-column / banner / minimal / photo-circle /
//  timeline / skill-bars / etc.). Used for:
//    - Live preview iframe in the builder
//    - HTML export
//    - PDF export (HTML → PDF via LibreOffice headless)
//
//  The plain UDM path (cv-renderer.ts) is still used for DOCX / MD / PPTX
//  exports where flat semantic content is the right answer.
//
//  Template layout schema (extended from Phase 42 baseline):
//    {
//      style:       'classic' | 'sidebar' | 'banner' | 'minimal'
//                 | 'twoColumn' | 'timeline' | 'photo' | 'creative',
//      columns:     1 | 2,
//      accent:      '#hex',
//      headerStyle: 'banner' | 'block' | 'sidebar' | 'minimal',
//      typography:  { heading, body },
//      density:     'compact' | 'comfortable' | 'spacious',
//      // Visual features
//      sidebarColor?:  '#hex' | 'accent' | 'dark' | 'light',
//      sidebarSide?:   'left' | 'right',
//      photoShape?:    'circle' | 'square' | 'none',
//      photoPlace?:    'sidebar' | 'header',
//      skillStyle?:    'bars' | 'dots' | 'pills' | 'plain' | 'ratings' | 'percent',
//      languageStyle?: 'dots' | 'pills' | 'plain' | 'bars' | 'stars' | 'text',
//      icons?:         boolean,
//      timeline?:      boolean,
//      accentDividers?: boolean,
//      atsSafe?:       boolean,   // single-column, no photo, no icons, standard fonts
//      logoPlace?:     'header' | 'watermark' | 'footer' | 'none',
//      customCss?:     string,    // per-template CSS injection (Phase 42.2C)
//    }
// =============================================================================

export interface BrandTokens {
  colors?: { primary?: string; secondary?: string; accent?: string; text?: string; background?: string };
  fonts?:  { heading?: string; body?: string };
  logo?:   string;
}

export interface CvTemplateLayout {
  style?:       'classic' | 'sidebar' | 'banner' | 'minimal' | 'twoColumn' | 'timeline' | 'photo' | 'creative';
  columns?:     1 | 2;
  accent?:      string;
  headerStyle?: 'banner' | 'block' | 'sidebar' | 'minimal';
  typography?:  { heading?: string; body?: string };
  density?:     'compact' | 'comfortable' | 'spacious';
  sidebarColor?:  string;
  sidebarSide?:   'left' | 'right';
  photoShape?:    'circle' | 'square' | 'none';
  photoPlace?:    'sidebar' | 'header';
  skillStyle?:    'bars' | 'dots' | 'pills' | 'plain' | 'ratings' | 'percent';
  languageStyle?: 'dots' | 'pills' | 'plain' | 'bars' | 'stars' | 'text';
  icons?:         boolean;
  timeline?:      boolean;
  accentDividers?: boolean;
  /** Phase 42.2J — ATS-safe variant: forces single column, no photos/icons. */
  atsSafe?:       boolean;
  /** Phase 42.2B — where to place the brand logo. */
  logoPlace?:     'header' | 'watermark' | 'footer' | 'none';
  /** Phase 42.2C — per-template CSS injection. */
  customCss?:     string;
}

export function renderCvHtml(
  profile: CvProfileDto,
  doc: CvDocumentDto,
  layout: CvTemplateLayout = {},
  brand?: BrandTokens,
): string {
  switch (doc.doctype) {
    case 'cv':
    case 'resume':       return cvHtml(profile, doc, layout, brand);
    case 'coverLetter':  return coverLetterHtml(profile, doc, layout, brand);
    case 'portfolio':    return portfolioHtml(profile, doc, layout, brand);
    default:             return cvHtml(profile, doc, layout, brand);
  }
}

// =============================================================================
//  CV / Resume
// =============================================================================

function cvHtml(profile: CvProfileDto, doc: CvDocumentDto, layout: CvTemplateLayout, brand?: BrandTokens): string {
  const t = resolveTheme(layout, brand);
  const content: CvDocumentContent_CV = (doc.content as CvDocumentContent_CV) || { sectionOrder: DEFAULT_CV_SECTION_ORDER };
  const order = (content.sectionOrder || DEFAULT_CV_SECTION_ORDER) as CvSectionKey[];

  // Decide which sections live in the sidebar vs main column.
  const SIDEBAR_KEYS: CvSectionKey[] = ['header', 'skills', 'languages', 'certifications', 'awards'];
  const useSidebar = t.style === 'sidebar' || t.style === 'twoColumn' || t.style === 'photo' || t.columns === 2;
  const sidebarKeys = useSidebar ? order.filter((k) => SIDEBAR_KEYS.includes(k)) : [];
  const mainKeys    = useSidebar ? order.filter((k) => !SIDEBAR_KEYS.includes(k)) : order;

  const mainHtml    = mainKeys.map((key)    => sectionHtml(key, profile, content, t)).join('');
  const sidebarHtml = sidebarKeys.map((key) => sectionHtml(key, profile, content, t, true)).join('');

  return shell({
    title: doc.title,
    theme: t,
    body:  useSidebar
      ? sidebarLayout(t, sidebarHtml, mainHtml, profile, brand)
      : singleColumn(t, mainHtml, profile, brand),
  });
}

function singleColumn(t: ResolvedTheme, main: string, profile: CvProfileDto, brand?: BrandTokens): string {
  const headerHtml = renderHeader(profile, t, brand);
  return `<div class="page single">${headerHtml}<div class="content">${main}</div></div>`;
}

function sidebarLayout(t: ResolvedTheme, sidebar: string, main: string, profile: CvProfileDto, brand?: BrandTokens): string {
  const side = t.sidebarSide === 'right' ? 'right' : 'left';
  const headerHtml = renderHeader(profile, t, brand);
  // Phase 42.2 fix — when headerStyle='sidebar', the name + headline live in
  // the sidebar (above the photo + contact list), not the main column.
  const sidebarHead = t.headerStyle === 'sidebar' ? renderSidebarHead(profile) : '';
  const sidebarBlock = `<aside class="sidebar">${sidebarHead}${renderPhoto(profile, t) || ''}${renderContact(profile, t)}${sidebar}</aside>`;
  const mainBlock    = `<main class="main">${t.headerStyle === 'sidebar' ? '' : headerHtml}<div class="content">${main}</div></main>`;
  return `<div class="page sidebar-layout side-${side}">${side === 'left' ? sidebarBlock + mainBlock : mainBlock + sidebarBlock}</div>`;
}

function renderSidebarHead(profile: CvProfileDto): string {
  const p = profile.personal || {};
  if (!p.fullName && !p.headline) return '';
  return `<div class="sidebar-head">${p.fullName ? `<h1>${esc(p.fullName)}</h1>` : ''}${p.headline ? `<p class="headline">${esc(p.headline)}</p>` : ''}</div>`;
}

// =============================================================================
//  Section renderers
// =============================================================================

function sectionHtml(key: CvSectionKey, profile: CvProfileDto, content: CvDocumentContent_CV, t: ResolvedTheme, inSidebar = false): string {
  switch (key) {
    case 'header':         return inSidebar ? '' : renderHeader(profile, t);
    case 'summary': {
      const text = content.sectionOverrides?.summary ?? profile.personal?.summary;
      if (!text) return '';
      return sectionWrap('Summary', `<p>${esc(text)}</p>`, t);
    }
    case 'experience':     return renderExperience(profile, content, t);
    case 'education':      return renderEducation(profile, t);
    case 'skills':         return renderSkills(profile, content, t, inSidebar);
    case 'languages':      return renderLanguages(profile, t, inSidebar);
    case 'projects':       return renderProjects(profile, content, t);
    case 'certifications': return renderCertifications(profile, t);
    case 'awards':         return renderAwards(profile, t);
    case 'publications':   return renderPublications(profile, t);
    case 'references':     return renderReferences(profile, t);
    default:               return '';
  }
}

function renderHeader(profile: CvProfileDto, t: ResolvedTheme, brand?: BrandTokens): string {
  const p = profile.personal || {};
  const contact = [p.email, p.phone, p.location, p.website, p.linkedin, p.github].filter(Boolean).map((c) => esc(c!));
  const logoHtml = brand?.logo ? `<img src="${esc(brand.logo)}" class="brand-logo" alt="brand" />` : '';
  const photoHtml = t.photoPlace === 'header' && p.photoUrl
    ? `<img src="${esc(p.photoUrl)}" class="photo photo-${t.photoShape || 'circle'}" alt="" />`
    : '';

  if (t.headerStyle === 'banner') {
    return `<header class="header banner">${logoHtml}${photoHtml}<div><h1>${esc(p.fullName || '')}</h1>${p.headline ? `<p class="headline">${esc(p.headline)}</p>` : ''}${contact.length ? `<p class="contact">${contact.join(' • ')}</p>` : ''}</div></header>`;
  }
  if (t.headerStyle === 'minimal') {
    return `<header class="header minimal">${logoHtml}${photoHtml}<h1>${esc(p.fullName || '')}</h1>${p.headline ? `<p class="headline">${esc(p.headline)}</p>` : ''}${contact.length ? `<p class="contact">${contact.join(' • ')}</p>` : ''}</header>`;
  }
  // block (default)
  return `<header class="header block">${logoHtml}${photoHtml}<h1>${esc(p.fullName || '')}</h1>${p.headline ? `<p class="headline">${esc(p.headline)}</p>` : ''}${contact.length ? `<p class="contact">${contact.join(' • ')}</p>` : ''}</header>`;
}

function renderPhoto(profile: CvProfileDto, t: ResolvedTheme): string | null {
  const p = profile.personal || {};
  if (!p.photoUrl || t.photoPlace === 'header' || t.photoShape === 'none') return null;
  return `<div class="sidebar-photo"><img src="${esc(p.photoUrl)}" class="photo photo-${t.photoShape || 'circle'}" alt="" /></div>`;
}

function renderContact(profile: CvProfileDto, _t: ResolvedTheme): string {
  const p = profile.personal || {};
  const items = [
    p.email    ? icon('mail',   p.email)    : '',
    p.phone    ? icon('phone',  p.phone)    : '',
    p.location ? icon('pin',    p.location) : '',
    p.website  ? icon('globe',  p.website)  : '',
    p.linkedin ? icon('linkedin', p.linkedin) : '',
    p.github   ? icon('github', p.github)   : '',
  ].filter(Boolean).join('');
  if (!items) return '';
  return `<div class="contact-list">${items}</div>`;
}

function renderExperience(profile: CvProfileDto, content: CvDocumentContent_CV, t: ResolvedTheme): string {
  let list = profile.experience || [];
  if (content.sectionOverrides?.experienceIds?.length) {
    const set = new Set(content.sectionOverrides.experienceIds);
    list = list.filter((e) => set.has(e.id));
  }
  if (list.length === 0) return '';
  const items = list.map((e) => `
    <article class="entry ${t.timeline ? 'entry-timeline' : ''}">
      ${t.timeline ? '<span class="dot"></span>' : ''}
      <div class="entry-head"><strong>${esc(e.role)}</strong> · <span class="entity">${esc(e.company)}</span></div>
      <div class="entry-meta">${esc([e.location, formatRange(e.start, e.end)].filter(Boolean).join(' · '))}</div>
      ${e.bullets?.length ? `<ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
    </article>`).join('');
  return sectionWrap('Experience', `<div class="${t.timeline ? 'timeline' : 'entries'}">${items}</div>`, t);
}

function renderEducation(profile: CvProfileDto, t: ResolvedTheme): string {
  const list = profile.education || [];
  if (list.length === 0) return '';
  const items = list.map((ed) => `
    <article class="entry">
      <div class="entry-head"><strong>${esc([ed.degree, ed.field].filter(Boolean).join(', ') || ed.institution)}</strong></div>
      ${ed.degree || ed.field ? `<div class="entity">${esc(ed.institution || '')}</div>` : ''}
      <div class="entry-meta">${esc([formatRange(ed.start, ed.end), ed.gpa ? `GPA ${ed.gpa}` : ''].filter(Boolean).join(' · '))}</div>
      ${ed.honors?.length ? `<ul>${ed.honors.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
    </article>`).join('');
  return sectionWrap('Education', `<div class="entries">${items}</div>`, t);
}

function renderSkills(profile: CvProfileDto, content: CvDocumentContent_CV, t: ResolvedTheme, inSidebar: boolean): string {
  let list = profile.skills || [];
  if (content.sectionOverrides?.skillIds?.length) {
    const set = new Set(content.sectionOverrides.skillIds);
    list = list.filter((s) => set.has(s.id));
  }
  if (list.length === 0) return '';

  if (t.skillStyle === 'bars') {
    const items = list.map((s) => {
      const pct = levelPct(s.level);
      return `<div class="skill-bar"><span class="skill-name">${esc(s.name)}</span><div class="bar"><div class="fill" style="width:${pct}%"></div></div></div>`;
    }).join('');
    return sectionWrap('Skills', items, t);
  }
  if (t.skillStyle === 'dots') {
    const items = list.map((s) => {
      const level = levelDots(s.level);
      return `<div class="skill-dots"><span class="skill-name">${esc(s.name)}</span><span class="dots">${level}</span></div>`;
    }).join('');
    return sectionWrap('Skills', items, t);
  }
  if (t.skillStyle === 'pills') {
    const items = list.map((s) => `<span class="pill">${esc(s.name)}</span>`).join(' ');
    return sectionWrap('Skills', `<div class="pills">${items}</div>`, t);
  }
  if (t.skillStyle === 'ratings') {
    // Phase 42.2F — 5-star ratings.
    const items = list.map((s) => {
      const lvl = levelStars(s.level);
      return `<div class="skill-rating"><span class="skill-name">${esc(s.name)}</span><span class="stars" aria-label="${lvl}/5">${'★'.repeat(lvl)}${'☆'.repeat(5 - lvl)}</span></div>`;
    }).join('');
    return sectionWrap('Skills', items, t);
  }
  if (t.skillStyle === 'percent') {
    // Phase 42.2F — percentage labels.
    const items = list.map((s) => {
      const pct = levelPct(s.level);
      return `<div class="skill-bar"><span class="skill-name">${esc(s.name)} <em>${pct}%</em></span><div class="bar"><div class="fill" style="width:${pct}%"></div></div></div>`;
    }).join('');
    return sectionWrap('Skills', items, t);
  }
  // plain (grouped by category)
  const groups = new Map<string, string[]>();
  for (const s of list) {
    const cat = s.category || 'other';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(s.name);
  }
  const body = Array.from(groups).map(([cat, names]) =>
    `<p><strong>${esc(capitalise(cat))}:</strong> ${names.map(esc).join(', ')}</p>`,
  ).join('');
  return sectionWrap('Skills', body, t);
}

function renderLanguages(profile: CvProfileDto, t: ResolvedTheme, _inSidebar: boolean): string {
  const list = profile.languages || [];
  if (list.length === 0) return '';
  if (t.languageStyle === 'dots') {
    const items = list.map((l) => {
      const map: Record<string, number> = { basic: 1, conversational: 2, fluent: 3, native: 4 };
      const dots = '●'.repeat(map[l.proficiency] || 3) + '○'.repeat(4 - (map[l.proficiency] || 3));
      return `<div class="lang"><span>${esc(l.name)}</span><span class="dots">${dots}</span></div>`;
    }).join('');
    return sectionWrap('Languages', items, t);
  }
  if (t.languageStyle === 'pills') {
    return sectionWrap('Languages', `<div class="pills">${list.map((l) => `<span class="pill">${esc(l.name)} <em>${esc(l.proficiency)}</em></span>`).join(' ')}</div>`, t);
  }
  if (t.languageStyle === 'bars') {
    const map: Record<string, number> = { basic: 25, conversational: 50, fluent: 80, native: 100 };
    const items = list.map((l) => {
      const pct = map[l.proficiency] ?? 70;
      return `<div class="skill-bar"><span class="skill-name">${esc(l.name)} <em>${esc(l.proficiency)}</em></span><div class="bar"><div class="fill" style="width:${pct}%"></div></div></div>`;
    }).join('');
    return sectionWrap('Languages', items, t);
  }
  if (t.languageStyle === 'stars') {
    const map: Record<string, number> = { basic: 1, conversational: 2, fluent: 4, native: 5 };
    const items = list.map((l) => {
      const lvl = map[l.proficiency] ?? 3;
      return `<div class="skill-rating"><span class="skill-name">${esc(l.name)}</span><span class="stars">${'★'.repeat(lvl)}${'☆'.repeat(5 - lvl)}</span></div>`;
    }).join('');
    return sectionWrap('Languages', items, t);
  }
  if (t.languageStyle === 'text') {
    // Phase 42.2G — text-only, formatted like "Name — Native"
    const items = list.map((l) => `<div class="lang-text"><strong>${esc(l.name)}</strong> — <em>${esc(capitalise(l.proficiency))}</em></div>`).join('');
    return sectionWrap('Languages', items, t);
  }
  return sectionWrap('Languages', `<ul>${list.map((l) => `<li>${esc(l.name)} — ${esc(l.proficiency)}</li>`).join('')}</ul>`, t);
}

function renderProjects(profile: CvProfileDto, content: CvDocumentContent_CV, t: ResolvedTheme): string {
  let list = profile.projects || [];
  if (content.sectionOverrides?.projectIds?.length) {
    const set = new Set(content.sectionOverrides.projectIds);
    list = list.filter((p) => set.has(p.id));
  }
  if (list.length === 0) return '';
  const items = list.map((p) => `
    <article class="entry">
      <div class="entry-head"><strong>${esc(p.name)}</strong></div>
      ${p.description ? `<p>${esc(p.description)}</p>` : ''}
      ${p.technologies?.length ? `<p class="tags">${p.technologies.map((tag) => `<span class="pill">${esc(tag)}</span>`).join(' ')}</p>` : ''}
      ${p.results?.length ? `<ul>${p.results.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}
      ${p.links?.length ? `<p class="links">${p.links.map((l) => `<a href="${esc(l.url)}">${esc(l.label)}</a>`).join(' · ')}</p>` : ''}
    </article>`).join('');
  return sectionWrap('Projects', `<div class="entries">${items}</div>`, t);
}

function renderCertifications(profile: CvProfileDto, t: ResolvedTheme): string {
  const list = profile.certifications || [];
  if (list.length === 0) return '';
  return sectionWrap('Certifications', `<ul>${list.map((c) => `<li><strong>${esc(c.name)}</strong> — ${esc(c.issuer || '')}${c.date ? ` <span class="date">${esc(c.date)}</span>` : ''}</li>`).join('')}</ul>`, t);
}

function renderAwards(profile: CvProfileDto, t: ResolvedTheme): string {
  const list = profile.awards || [];
  if (list.length === 0) return '';
  return sectionWrap('Awards', `<ul>${list.map((a) => `<li><strong>${esc(a.title)}</strong>${a.issuer ? ` — ${esc(a.issuer)}` : ''}${a.date ? ` <span class="date">${esc(a.date)}</span>` : ''}</li>`).join('')}</ul>`, t);
}

function renderPublications(profile: CvProfileDto, t: ResolvedTheme): string {
  const list = profile.publications || [];
  if (list.length === 0) return '';
  return sectionWrap('Publications', `<ul>${list.map((p) => `<li><strong>${esc(p.title)}</strong>${p.venue ? ` — <em>${esc(p.venue)}</em>` : ''}${p.date ? ` <span class="date">${esc(p.date)}</span>` : ''}</li>`).join('')}</ul>`, t);
}

function renderReferences(profile: CvProfileDto, t: ResolvedTheme): string {
  const list = profile.references || [];
  if (list.length === 0) return '';
  const items = list.map((r) =>
    `<div class="reference"><strong>${esc(r.name)}</strong>${r.title ? `, <em>${esc(r.title)}</em>` : ''}${r.company ? ` — ${esc(r.company)}` : ''}${r.email || r.phone ? `<div class="ref-contact">${[r.email, r.phone].filter(Boolean).map((c) => esc(c!)).join(' • ')}</div>` : ''}</div>`,
  ).join('');
  return sectionWrap('References', items, t);
}

// =============================================================================
//  Cover letter / Portfolio
// =============================================================================

function coverLetterHtml(profile: CvProfileDto, doc: CvDocumentDto, layout: CvTemplateLayout, brand?: BrandTokens): string {
  const t = resolveTheme(layout, brand);
  const c = (doc.content as CvDocumentContent_CoverLetter) || {} as any;
  const p = profile.personal || {};
  return shell({
    title: doc.title, theme: t,
    body: `<div class="page letter">
      <header class="letter-header">
        ${p.fullName ? `<h1>${esc(p.fullName)}</h1>` : ''}
        ${[p.email, p.phone, p.location].filter(Boolean).map((c) => esc(c!)).join(' • ')}
      </header>
      <div class="content">
        <p class="letter-date">${esc(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))}</p>
        ${c.company || c.role ? `<p>${[esc(c.role || ''), esc(c.company || '')].filter(Boolean).join(' — ')}</p>` : ''}
        ${c.hiringManager ? `<p>${esc(c.hiringManager)}</p>` : ''}
        <p>${esc(c.greeting || 'Dear Hiring Manager,')}</p>
        ${c.intro      ? `<p>${esc(c.intro)}</p>`     : ''}
        ${(c.body || []).map((para: string) => para ? `<p>${esc(para)}</p>` : '').join('')}
        ${c.whyCompany ? `<p>${esc(c.whyCompany)}</p>` : ''}
        <p>${esc(c.closing || 'Sincerely,')}</p>
        <p class="signature">${esc(c.signature || p.fullName || '')}</p>
      </div>
    </div>`,
  });
}

function portfolioHtml(profile: CvProfileDto, doc: CvDocumentDto, layout: CvTemplateLayout, brand?: BrandTokens): string {
  const t = resolveTheme(layout, brand);
  const c = (doc.content as CvDocumentContent_Portfolio) || ({} as any);
  const p = profile.personal || {};
  const sections = (c.sections || []).map((sec: any) => {
    const projects = sec.key === 'projects'
      ? (profile.projects || []).filter((pr) => !sec.itemIds?.length || sec.itemIds.includes(pr.id))
        .map((pr) => `<article class="card"><h3>${esc(pr.name)}</h3>${pr.description ? `<p>${esc(pr.description)}</p>` : ''}${pr.technologies?.length ? `<p class="tags">${pr.technologies.map((tg) => `<span class="pill">${esc(tg)}</span>`).join(' ')}</p>` : ''}</article>`).join('')
      : '';
    return `<section class="page"><h2>${esc(sec.title)}</h2>${sec.body ? `<p>${esc(sec.body)}</p>` : ''}${projects ? `<div class="grid">${projects}</div>` : ''}</section>`;
  }).join('');
  const cover = `<section class="page cover"><h1>${esc(p.fullName || doc.title)}</h1>${p.headline ? `<p class="headline">${esc(p.headline)}</p>` : ''}${p.summary ? `<p>${esc(p.summary)}</p>` : ''}</section>`;
  return shell({ title: doc.title, theme: t, body: cover + sections });
}

// =============================================================================
//  Shell + CSS
// =============================================================================

interface ResolvedTheme {
  accent:        string;
  secondary:     string;
  text:          string;
  background:    string;
  sidebarBg:     string;
  sidebarFg:     string;
  headingFont:   string;
  bodyFont:      string;
  density:       'compact' | 'comfortable' | 'spacious';
  headerStyle:   'banner' | 'block' | 'sidebar' | 'minimal';
  style:         'classic' | 'sidebar' | 'banner' | 'minimal' | 'twoColumn' | 'timeline' | 'photo' | 'creative';
  columns:       1 | 2;
  sidebarSide?:  'left' | 'right';
  photoShape?:   'circle' | 'square' | 'none';
  photoPlace?:   'sidebar' | 'header';
  skillStyle?:   'bars' | 'dots' | 'pills' | 'plain' | 'ratings' | 'percent';
  languageStyle?:'dots' | 'pills' | 'plain' | 'bars' | 'stars' | 'text';
  icons?:        boolean;
  timeline?:     boolean;
  accentDividers?: boolean;
  /** Phase 42.2J — ATS-safe: strip photos, icons, multicolumn, custom fonts. */
  atsSafe?:      boolean;
  /** Phase 42.2B — brand-logo placement. */
  logoPlace?:    'header' | 'watermark' | 'footer' | 'none';
  logoUrl?:      string;
  /** Phase 42.2C — template-specific CSS injection. */
  customCss?:    string;
}

function resolveTheme(layout: CvTemplateLayout, brand?: BrandTokens): ResolvedTheme {
  const ats = !!layout.atsSafe;
  // Phase 42.2J — ATS variant: standard accent, single column, no sidebar tint.
  const accent = ats
    ? '#000000'
    : (brand?.colors?.primary || layout.accent || '#1F2937');
  const secondary = brand?.colors?.secondary || '#64748B';

  const sidebarColor = layout.sidebarColor;
  let sidebarBg = '#F1F5F9';
  let sidebarFg = '#0F172A';
  if (sidebarColor === 'accent')      { sidebarBg = accent;     sidebarFg = '#FFFFFF'; }
  else if (sidebarColor === 'dark')   { sidebarBg = '#0F172A';  sidebarFg = '#F8FAFC'; }
  else if (sidebarColor === 'light')  { sidebarBg = '#F8FAFC';  sidebarFg = '#0F172A'; }
  else if (sidebarColor && /^#/.test(sidebarColor)) { sidebarBg = sidebarColor; sidebarFg = '#FFFFFF'; }

  return {
    accent, secondary,
    text:        brand?.colors?.text       || '#0F172A',
    background:  brand?.colors?.background || '#FFFFFF',
    sidebarBg, sidebarFg,
    headingFont: ats ? 'Arial' : (brand?.fonts?.heading || layout.typography?.heading || 'Inter'),
    bodyFont:    ats ? 'Arial' : (brand?.fonts?.body    || layout.typography?.body    || 'Inter'),
    density:     layout.density     || 'comfortable',
    headerStyle: ats ? 'block' : (layout.headerStyle || 'block'),
    style:       ats ? 'classic' : (layout.style    || 'classic'),
    columns:     ats ? 1 : (layout.columns || 1),
    sidebarSide: ats ? undefined : layout.sidebarSide,
    photoShape:  ats ? 'none' : layout.photoShape,
    photoPlace:  ats ? undefined : layout.photoPlace,
    skillStyle:  ats ? 'plain' : layout.skillStyle,
    languageStyle: ats ? 'plain' : layout.languageStyle,
    icons:       ats ? false : layout.icons,
    timeline:    ats ? false : layout.timeline,
    accentDividers: ats ? false : layout.accentDividers,
    atsSafe:     ats,
    logoPlace:   layout.logoPlace ?? (brand?.logo ? 'header' : 'none'),
    logoUrl:     brand?.logo,
    customCss:   layout.customCss,
  };
}

function shell(opts: { title: string; theme: ResolvedTheme; body: string }): string {
  const t = opts.theme;
  const padY = t.density === 'compact' ? 8 : t.density === 'spacious' ? 18 : 12;
  const watermark = t.logoPlace === 'watermark' && t.logoUrl
    ? `<div class="watermark"><img src="${esc(t.logoUrl)}" alt="" /></div>`
    : '';
  const footerLogo = t.logoPlace === 'footer' && t.logoUrl
    ? `<footer class="brand-footer"><img src="${esc(t.logoUrl)}" alt="" /></footer>`
    : '';
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8" />
<title>${esc(opts.title)}</title>
<style>
  :root {
    --accent: ${t.accent};
    --secondary: ${t.secondary};
    --text: ${t.text};
    --bg: ${t.background};
    --sidebar-bg: ${t.sidebarBg};
    --sidebar-fg: ${t.sidebarFg};
    --head-font: '${t.headingFont}', sans-serif;
    --body-font: '${t.bodyFont}', sans-serif;
    --pad-y: ${padY}px;
  }
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font: 13px/1.5 var(--body-font); color: var(--text); background: #E2E8F0; }
  .page { background: var(--bg); margin: 0 auto; max-width: 880px; min-height: 100vh; }
  .page.single { padding: 36px 48px; }
  .page.sidebar-layout { display: grid; min-height: 1120px; }
  .page.sidebar-layout.side-left  { grid-template-columns: 280px 1fr; }
  .page.sidebar-layout.side-right { grid-template-columns: 1fr 280px; }
  .sidebar { background: var(--sidebar-bg); color: var(--sidebar-fg); padding: 32px 22px; }
  .sidebar h2 { color: var(--sidebar-fg); border-color: var(--sidebar-fg); opacity: 0.85; }
  .main    { padding: 36px 40px; }
  .content > * + * { margin-top: calc(var(--pad-y) * 1.5); }

  h1, h2, h3, h4 { font-family: var(--head-font); margin: 0; color: var(--accent); }
  h1 { font-size: 28px; font-weight: 700; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; padding-bottom: 4px; border-bottom: 1px solid var(--accent); margin-bottom: 8px; }
  h3 { font-size: 14px; font-weight: 700; color: var(--text); }
  p  { margin: 0 0 6px; }

  .header.banner { background: var(--accent); color: white; padding: 28px 36px; }
  .header.banner h1, .header.banner h2, .header.banner h3 { color: white; }
  .header.banner .headline { opacity: 0.92; font-size: 14px; }
  .header.banner .contact  { opacity: 0.85; font-size: 11px; margin-top: 8px; }
  .header.block { border-bottom: 2px solid var(--accent); padding-bottom: 14px; margin-bottom: 18px; }
  .header.block .headline { color: var(--accent); font-size: 14px; margin-top: 2px; }
  .header.block .contact { font-size: 11px; color: #64748B; margin-top: 6px; }
  .header.minimal h1 { font-weight: 300; letter-spacing: -0.02em; }
  .header.minimal .headline { font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: #64748B; margin-top: 2px; }
  .header.minimal .contact { font-size: 10px; color: #94A3B8; margin-top: 8px; }

  .sidebar h1, .sidebar h2, .sidebar h3 { color: var(--sidebar-fg); }
  .sidebar h2 { border-color: var(--sidebar-fg); }
  .sidebar-head { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.18); }
  .sidebar-head h1 { font-size: 22px; line-height: 1.15; }
  .sidebar-head .headline { font-size: 12px; opacity: 0.85; margin-top: 4px; }
  .sidebar-photo { display: flex; justify-content: center; margin-bottom: 18px; }
  .photo { width: 130px; height: 130px; object-fit: cover; }
  .photo-circle { border-radius: 999px; }
  .photo-square  { border-radius: 6px; }
  .brand-logo { max-height: 32px; margin-bottom: 8px; }

  .contact-list { display: grid; gap: 4px; font-size: 11px; margin-bottom: 16px; }
  .contact-list .ico { display: inline-block; width: 14px; opacity: 0.85; }

  .entries > .entry + .entry { margin-top: calc(var(--pad-y) * 1.4); }
  .entry-head { font-size: 14px; }
  .entry-head .entity { color: var(--accent); font-weight: 600; }
  .entry-meta { font-size: 11px; color: #64748B; margin: 2px 0 6px; }
  .entry ul { margin: 4px 0 0 18px; padding: 0; }
  .entry ul li { margin-bottom: 2px; }

  .timeline { position: relative; padding-left: 16px; border-left: 2px solid var(--accent); }
  .timeline .entry { position: relative; padding-left: 14px; padding-bottom: var(--pad-y); }
  .timeline .dot { position: absolute; left: -23px; top: 4px; width: 12px; height: 12px; border-radius: 999px; background: var(--accent); border: 2px solid var(--bg); }

  .skill-bar { margin: 6px 0; font-size: 11px; }
  .skill-bar .skill-name { display: block; margin-bottom: 3px; }
  .skill-bar .bar  { background: rgba(0,0,0,0.08); height: 6px; border-radius: 3px; overflow: hidden; }
  .skill-bar .fill { background: var(--accent); height: 100%; }
  .skill-dots { display: flex; align-items: center; justify-content: space-between; font-size: 11px; padding: 3px 0; }
  .skill-dots .dots { letter-spacing: 2px; color: var(--accent); }

  .pills { display: flex; flex-wrap: wrap; gap: 4px; }
  .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; background: rgba(0,0,0,0.08); font-size: 10px; }
  .sidebar .pill { background: rgba(255,255,255,0.18); color: var(--sidebar-fg); }

  .lang { display: flex; justify-content: space-between; font-size: 11px; padding: 3px 0; }
  .lang .dots { color: var(--accent); }

  .tags .pill { background: rgba(0,0,0,0.06); color: var(--text); }

  ul { margin: 4px 0 0 18px; padding: 0; }
  ul li { margin-bottom: 2px; }

  .reference + .reference { margin-top: 8px; }
  .ref-contact { font-size: 11px; color: #64748B; }
  .date { color: #94A3B8; font-size: 11px; }

  .letter .letter-header { padding: 32px 48px 16px; border-bottom: 1px solid #E2E8F0; }
  .letter .content { padding: 24px 48px 48px; max-width: 720px; }
  .letter .letter-date { color: #64748B; font-size: 11px; }
  .letter .signature  { margin-top: 18px; font-weight: 600; }

  .grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
  .card { padding: 12px; border: 1px solid #E2E8F0; border-radius: 6px; background: #FFFFFF; }

  /* Phase 42.2F + G — new visualisations */
  .skill-rating { display: flex; align-items: center; justify-content: space-between; font-size: 11px; padding: 3px 0; }
  .skill-rating .stars { color: var(--accent); letter-spacing: 1px; font-size: 12px; }
  .skill-bar em { color: var(--accent); font-style: normal; font-weight: 600; font-size: 10px; }
  .lang-text  { font-size: 12px; padding: 2px 0; }
  .lang-text em { color: var(--secondary); font-style: normal; }

  /* Phase 42.2D — multi-page intelligence: prevent broken sections + clean page breaks */
  .entry, .reference, .card, .skill-bar, .skill-dots, .skill-rating, .lang, .lang-text {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  section.section, .entries { page-break-inside: auto; }
  h2, h3 { page-break-after: avoid; break-after: avoid-page; }

  /* Phase 42.2B — brand watermark + footer */
  .watermark { position: fixed; top: 40%; left: 0; right: 0; text-align: center; opacity: 0.06; pointer-events: none; z-index: 0; }
  .watermark img { max-width: 480px; max-height: 480px; }
  .brand-footer { position: fixed; bottom: 0; right: 24px; padding: 8px; }
  .brand-footer img { max-height: 28px; opacity: 0.8; }

  /* Phase 42.2J — ATS-safe overrides */
  ${t.atsSafe ? `
  .photo, .sidebar-photo, .watermark, .brand-footer, .pills, .pill, .dots, .stars, .timeline { display: none !important; }
  .timeline { padding-left: 0; border-left: none; }
  .timeline .dot { display: none; }
  .header.banner, .sidebar { background: white !important; color: black !important; }
  h1, h2, h3, .entry-head .entity, .skill-bar .fill { color: black !important; background: transparent !important; }
  h2 { border-bottom: 1px solid black !important; }
  .skill-bar .bar { background: transparent !important; border-bottom: 1px solid black; height: 1px; }
  ` : ''}

  @media print {
    body { background: white; }
    .page { box-shadow: none; max-width: none; }
    .page.sidebar-layout { display: ${t.atsSafe ? 'block' : 'grid'}; }
    .sidebar { background: var(--sidebar-bg) !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .header.banner { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }

  /* Phase 42.2C — per-template CSS injection */
  ${t.customCss || ''}
</style></head><body>${watermark}${opts.body}${footerLogo}</body></html>`;
}

// =============================================================================
//  Helpers
// =============================================================================

function sectionWrap(title: string, body: string, t: ResolvedTheme): string {
  return `<section class="section">${title ? `<h2>${esc(title)}</h2>` : ''}${body}${t.accentDividers ? '<div class="divider" style="height:2px;background:var(--accent);opacity:0.2;margin-top:8px"></div>' : ''}</section>`;
}

function icon(_kind: string, label: string): string {
  return `<div class="contact-row"><span class="ico">•</span>${esc(label)}</div>`;
}

function levelPct(level?: string): number {
  switch (level) {
    case 'expert':       return 95;
    case 'advanced':     return 80;
    case 'intermediate': return 60;
    case 'beginner':     return 35;
    default:             return 70;
  }
}

function levelDots(level?: string): string {
  const filled = levelStars(level);
  return '●'.repeat(filled) + '○'.repeat(5 - filled);
}

function levelStars(level?: string): number {
  return level === 'expert' ? 5
       : level === 'advanced' ? 4
       : level === 'intermediate' ? 3
       : level === 'beginner' ? 2
       : 3;
}

function formatRange(start?: string, end?: string): string {
  return [start || '', end || (start ? 'Present' : '')].filter(Boolean).join(' – ');
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function esc(s: string): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
