import {
  CvProfileDto,
  CvDocumentDto,
  CvDocumentContent_CV,
  CvDocumentContent_CoverLetter,
  CvDocumentContent_Portfolio,
  CvSectionKey,
  DEFAULT_CV_SECTION_ORDER,
} from './cv-types';
import { safeFullName, sanitizeCvProfile, sanitizeCvSummaryText } from './cv-profile-sanitizer';
import { sanitizeCvDocumentContent } from './cv-document-sanitizer';
import { signFilePath } from '../files/file-security';

// =============================================================================
//  Phase 42.22 — Premium CV Marketplace Transformation.
//
//  New over Phase 42.21:
//   1. Typography scale: h1 44 px base (was 38), h2 13 px base (was 11).
//   2. Metric highlighting: $amounts, %, large-unit numbers auto-bolded in
//      bullets as strong.metric { color:var(--a) }.
//   3. New skill styles: 'chips' (left-accent expertise chips w/ level tag)
//      and 'compact' (2-column grid with 5-step level bars).
//   4. Certificate badge cards: cert-item with left accent border + issuer.
//   5. Awards row layout: award-item flex (name left, meta right).
//   6. Semantic section classes: .s-experience, .s-education etc. for
//      per-section customCss targeting.
//
//  Typography scale (Phase 42.22):
//    Name base:           44 px, 700 (templates override per style)
//    Banner name:         44 px base
//    Block name:          40 px base
//    Split name:          38 px base
//    Minimal name:        42 px base
//    Sidebar name:        23 px (width-constrained)
//    Job title:           16–18 px
//    Section titles:      13 px, 700, uppercase, tracked (was 11 px)
//    Body:                11.5 px / 1.65 lh
//    Summary body:        12 px / 1.75 lh
//    Entry role:          13.5 px, 700
//    Entry company:       12 px, accent colour
//    Entry date:          10 px, muted, right-aligned
//    Bullet text:         11.5 px / 1.55 lh
// =============================================================================

export interface BrandTokens {
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    text?: string;
    background?: string;
  };
  fonts?: { heading?: string; body?: string };
  logo?: string;
}

export interface CvTemplateLayout {
  style?: string;
  columns?: 1 | 2;
  accent?: string;
  headerStyle?: 'banner' | 'block' | 'sidebar' | 'minimal' | 'split';
  typography?: { heading?: string; body?: string };
  density?: 'compact' | 'comfortable' | 'spacious';
  sidebarColor?: string;
  sidebarSide?: 'left' | 'right';
  sidebarWidth?: number;
  photoShape?: 'circle' | 'square' | 'none';
  photoPlace?: 'sidebar' | 'header';
  skillStyle?: string;
  languageStyle?: string;
  icons?: boolean;
  timeline?: boolean;
  accentDividers?: boolean;
  atsSafe?: boolean;
  logoPlace?: 'header' | 'watermark' | 'footer' | 'none';
  headerBg?: string;
  bannerBorderBottom?: string;
  customCss?: string;
}

export function renderCvHtml(
  profile: CvProfileDto,
  doc: CvDocumentDto,
  layout: CvTemplateLayout = {},
  brand?: BrandTokens,
): string {
  const sanitizedProfile = sanitizeCvProfile(profile).profile;
  const sanitizedDoc =
    doc.doctype === 'cv' || doc.doctype === 'resume'
      ? { ...doc, content: sanitizeCvDocumentContent(doc.content, doc.doctype).content }
      : doc;
  switch (doc.doctype) {
    case 'cv':
    case 'resume':
      return cvHtml(sanitizedProfile, sanitizedDoc, layout, brand);
    case 'coverLetter':
      return coverLetterHtml(sanitizedProfile, sanitizedDoc, layout, brand);
    case 'portfolio':
      return portfolioHtml(sanitizedProfile, sanitizedDoc, layout, brand);
    default:
      return cvHtml(sanitizedProfile, sanitizedDoc, layout, brand);
  }
}

// =============================================================================
//  CV / Resume
// =============================================================================

function cvHtml(
  profile: CvProfileDto,
  doc: CvDocumentDto,
  layout: CvTemplateLayout,
  brand?: BrandTokens,
): string {
  const t = resolveTheme(layout, brand);
  const content: CvDocumentContent_CV = (doc.content as CvDocumentContent_CV) || {
    sectionOrder: DEFAULT_CV_SECTION_ORDER,
  };
  const order = (content.sectionOrder || DEFAULT_CV_SECTION_ORDER) as CvSectionKey[];

  const SIDEBAR_KEYS: CvSectionKey[] = [
    'header',
    'skills',
    'languages',
    'certifications',
    'awards',
  ];
  const useSidebar = t.columns === 2 || t.style === 'sidebar' || t.style === 'twoColumn';
  const sidebarKeys = useSidebar ? order.filter((k) => SIDEBAR_KEYS.includes(k)) : [];
  const mainKeys = useSidebar ? order.filter((k) => !SIDEBAR_KEYS.includes(k)) : order;

  const mainHtml = mainKeys.map((key) => sectionHtml(key, profile, content, t)).join('');
  const sidebarHtml = sidebarKeys
    .map((key) => sectionHtml(key, profile, content, t, true))
    .join('');
  const renderedH1 = safeFullName(profile.personal?.fullName) || 'Untitled Candidate';
  // Runtime parity guard logs: these show the exact source values used by
  // preview and export, not certification fixtures.
  console.log(
    `[CV-RENDER:HEADER] fullName="${profile.personal?.fullName || ''}" headline="${profile.personal?.headline || ''}" sectionHeaderCandidate="${content.sectionOrder?.[0] || ''}" renderedH1="${renderedH1}"`,
  );
  console.log(
    `[CV-RENDER:SECTIONS] sectionsRendered=${[...sidebarKeys, ...mainKeys].join(',')} headerSkipped=true experienceEntries=${profile.experience?.length || 0} educationEntries=${profile.education?.length || 0}`,
  );

  return shell({
    title: doc.title,
    theme: t,
    body: useSidebar
      ? sidebarLayout(t, sidebarHtml, mainHtml, profile, brand)
      : singleColumn(t, mainHtml, profile, brand),
  });
}

function singleColumn(
  t: ResolvedTheme,
  main: string,
  profile: CvProfileDto,
  brand?: BrandTokens,
): string {
  const headerHtml = renderHeader(profile, t, brand, false);
  return `<div class="${pageClasses(t, 'single')}">${headerHtml}<div class="content">${main}</div></div>`;
}

function sidebarLayout(
  t: ResolvedTheme,
  sidebar: string,
  main: string,
  profile: CvProfileDto,
  brand?: BrandTokens,
): string {
  const side = t.sidebarSide === 'right' ? 'right' : 'left';

  // When headerStyle==='sidebar', name+headline live in the sidebar, not main.
  // For all other header styles the header renders inside .main but WITHOUT
  // contact info (already shown in the sidebar contact-list).
  const sidebarHead = t.headerStyle === 'sidebar' ? renderSidebarHead(profile) : '';
  const mainHeaderHtml =
    t.headerStyle === 'sidebar' ? '' : renderHeader(profile, t, brand, true /* noContact */);
  const photoHtml = renderPhoto(profile, t) || '';

  const lightSidebar = t.sidebarColor === 'light' || t.sidebarColor === 'warmlight';
  const sidebarClass = lightSidebar ? 'sidebar light' : 'sidebar';

  const sidebarBlock = `<aside class="${sidebarClass}">${sidebarHead}${photoHtml}${renderContact(profile, t)}${sidebar}</aside>`;
  const mainBlock = `<main class="main">${mainHeaderHtml}<div class="content">${main}</div></main>`;

  return `<div class="${pageClasses(t, `sidebar-layout side-${side}`)}">${side === 'left' ? sidebarBlock + mainBlock : mainBlock + sidebarBlock}</div>`;
}

function pageClasses(t: ResolvedTheme, base: string): string {
  const safeStyle = (t.style || 'classic').replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
  const safeHeader = (t.headerStyle || 'block').replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
  const safeDensity = (t.density || 'comfortable').replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
  return `page ${base} tmpl-${safeStyle} header-${safeHeader} density-${safeDensity}${t.icons ? ' has-icons' : ''}${t.atsSafe ? ' ats-page' : ' premium-page'}`;
}

function renderSidebarHead(profile: CvProfileDto): string {
  const p = profile.personal || {};
  const name = safeFullName(p.fullName) || 'Untitled Candidate';
  if (!name && !p.headline) return '';
  return `<div class="sidebar-head">${name ? `<h1>${esc(name)}</h1>` : ''}${p.headline ? `<p class="s-headline">${esc(p.headline)}</p>` : ''}</div>`;
}

// =============================================================================
//  Section renderers
// =============================================================================

function sectionHtml(
  key: CvSectionKey,
  profile: CvProfileDto,
  content: CvDocumentContent_CV,
  t: ResolvedTheme,
  inSidebar = false,
): string {
  switch (key) {
    case 'header':
      return '';
    case 'summary': {
      const override = content.sectionOverrides?.summary
        ? sanitizeCvSummaryText(content.sectionOverrides.summary)
        : '';
      const text = override || sanitizeCvSummaryText(profile.personal?.summary || '');
      if (!text) return '';
      return sectionWrap('Summary', `<p class="summary-body">${esc(text)}</p>`, t);
    }
    case 'experience':
      return renderExperience(profile, content, t);
    case 'education':
      return renderEducation(profile, t);
    case 'skills':
      return renderSkills(profile, content, t, inSidebar);
    case 'languages':
      return renderLanguages(profile, t, inSidebar);
    case 'projects':
      return renderProjects(profile, content, t);
    case 'certifications':
      return renderCertifications(profile, t);
    case 'awards':
      return renderAwards(profile, t);
    case 'publications':
      return renderPublications(profile, t);
    case 'references':
      return renderReferences(profile, t);
    default:
      return '';
  }
}

// ─── Header ──────────────────────────────────────────────────────────────────
// noContact: suppress the contact row when a sidebar will already show it.

function renderHeader(
  profile: CvProfileDto,
  t: ResolvedTheme,
  brand?: BrandTokens,
  noContact = false,
): string {
  const p = profile.personal || {};

  const logoHtml =
    brand?.logo && (t.logoPlace === 'header' || !t.logoPlace)
      ? `<img src="${esc(assetUrl(brand.logo))}" class="brand-logo" alt="" />`
      : '';
  const photoHtml =
    t.photoPlace === 'header' && p.photoUrl
      ? `<img src="${esc(assetUrl(p.photoUrl))}" class="photo photo-banner photo-${t.photoShape || 'circle'}" alt="" />`
      : '';

  const safeName = safeFullName(p.fullName) || 'Untitled Candidate';
  const nameHtml = safeName ? `<h1>${esc(safeName)}</h1>` : '';
  const headlineHtml = p.headline ? `<p class="headline">${esc(p.headline)}</p>` : '';

  const contactFields = noContact
    ? []
    : ([p.email, p.phone, p.location, p.website, p.linkedin, p.github].filter(Boolean) as string[]);

  if (t.headerStyle === 'banner') {
    const contactHtml = contactFields.length
      ? `<div class="banner-contact">${contactFields.map((c) => `<span class="bc-item">${esc(c)}</span>`).join('')}</div>`
      : '';
    return `<header class="header banner">${logoHtml}<div class="banner-main">${photoHtml}<div class="banner-text">${nameHtml}${headlineHtml}</div></div>${contactHtml}</header>`;
  }

  if (t.headerStyle === 'split') {
    const contactHtml = contactFields.length
      ? `<div class="split-contact">${contactFields.map((c) => `<span>${esc(c)}</span>`).join('')}</div>`
      : '';
    return `<header class="header split">${logoHtml}<div class="split-left">${nameHtml}${headlineHtml}</div><div class="split-right">${contactHtml}</div></header>`;
  }

  if (t.headerStyle === 'minimal') {
    const contactHtml = contactFields.length
      ? `<div class="contact-bar">${contactFields.map((c) => esc(c)).join(' · ')}</div>`
      : '';
    return `<header class="header minimal">${logoHtml}${photoHtml}${nameHtml}${headlineHtml}${contactHtml}</header>`;
  }

  // block (default)
  const contactHtml = contactFields.length
    ? `<div class="contact-bar">${contactFields.map((c) => esc(c)).join(' · ')}</div>`
    : '';
  return `<header class="header block">${logoHtml}${photoHtml}${nameHtml}${headlineHtml}${contactHtml}</header>`;
}

function renderPhoto(profile: CvProfileDto, t: ResolvedTheme): string | null {
  const p = profile.personal || {};
  if (!p.photoUrl || t.photoPlace === 'header' || t.photoShape === 'none') return null;
  return `<div class="sidebar-photo"><img src="${esc(assetUrl(p.photoUrl))}" class="photo photo-${t.photoShape || 'circle'}" alt="" /></div>`;
}

function renderContact(profile: CvProfileDto, _t: ResolvedTheme): string {
  const p = profile.personal || {};
  const rows = [
    p.email ? cRow('✉', p.email) : '',
    p.phone ? cRow('✆', p.phone) : '',
    p.location ? cRow('⌖', p.location) : '',
    p.website ? cRow('⊕', p.website) : '',
    p.linkedin ? cRow('in', p.linkedin) : '',
    p.github ? cRow('⌥', p.github) : '',
  ].filter(Boolean);
  if (!rows.length) return '';
  return `<div class="contact-list">${rows.join('')}</div>`;
}
function cRow(ico: string, label: string): string {
  return `<div class="c-row"><span class="c-ico">${ico}</span><span class="c-val">${esc(label)}</span></div>`;
}

function assetUrl(url?: string | null): string {
  const raw = (url || '').trim();
  if (!raw) return '';
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  if (!raw.startsWith('/uploads/') && !raw.startsWith('/exports/')) return raw;

  // Phase Ω.1B — these paths now sit behind an auth-gate. Append a short-lived
  // signed token so the server-side Puppeteer renderer (which carries no auth
  // cookie) can still fetch the photo/logo when generating the CV.
  const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
  const signedPath = `${raw}?token=${signFilePath(raw, secret, 3600)}`;

  const configured =
    process.env.PUBLIC_BACKEND_URL ||
    process.env.BACKEND_PUBLIC_URL ||
    process.env.API_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') ||
    (process.env.NODE_ENV === 'production' ? '' : `http://localhost:${process.env.PORT || 4000}`);

  const origin = configured.replace(/\/$/, '');
  return origin ? `${origin}${signedPath}` : signedPath;
}

// ─── Experience ───────────────────────────────────────────────────────────────

function renderExperience(
  profile: CvProfileDto,
  content: CvDocumentContent_CV,
  t: ResolvedTheme,
): string {
  let list = profile.experience || [];
  if (content.sectionOverrides?.experienceIds?.length) {
    const set = new Set(content.sectionOverrides.experienceIds);
    list = list.filter((e) => set.has(e.id));
  }
  if (!list.length) return '';

  const isTimeline = !!t.timeline;
  const items = list
    .map((e) => {
      const dateStr = formatRange(e.start, e.end);
      const explicitBullets = Array.isArray(e.bullets)
        ? e.bullets
        : uniqueTextArray((e as any).bullets);
      const rawFallbackBullets =
        !explicitBullets.length && !(e as any).description ? experienceRawFallbackLines(e) : [];
      const displayBullets = explicitBullets.length ? explicitBullets : rawFallbackBullets;
      const description = renderPreservedParagraphs((e as any).description);
      const bulletKeys = new Set(displayBullets.map((b) => String(b).trim().toLowerCase()));
      const achievementValues = uniqueTextArray((e as any).achievements).filter(
        (a) => !bulletKeys.has(a.toLowerCase()),
      );
      const achievements = renderRichList(achievementValues, 'Achievement', 'achievement-list');
      const metrics = renderSemanticChips((e as any).metrics, 'metric-pills');
      const technologies = renderSemanticChips((e as any).technologies, 'tech-pills');
      const projects = renderRichList((e as any).projects, 'Project', 'project-list');
      return `<article class="entry${isTimeline ? ' entry-tl' : ''}">
      ${isTimeline ? '<span class="tl-dot"></span>' : ''}
      <div class="entry-row">
        <div class="entry-main">
          <span class="e-role">${esc(e.role || '')}</span>
          ${e.company ? `<span class="e-company">${esc(e.company)}</span>` : ''}
        </div>
        ${dateStr ? `<span class="e-date">${esc(dateStr)}</span>` : ''}
      </div>
      ${e.location ? `<div class="e-location">${esc(e.location)}</div>` : ''}
      ${description}
      ${displayBullets.length ? `<ul class="e-bullets">${displayBullets.map((b: string) => `<li>${highlightMetrics(b)}</li>`).join('')}</ul>` : ''}
      ${achievements}
      ${metrics || technologies ? `<div class="experience-chips">${metrics}${technologies}</div>` : ''}
      ${projects}
    </article>`;
    })
    .join('');

  return sectionWrap(
    'Experience',
    `<div class="${isTimeline ? 'tl-track' : 'entries'}">${items}</div>`,
    t,
  );
}

// ─── Education ────────────────────────────────────────────────────────────────

function renderEducation(profile: CvProfileDto, t: ResolvedTheme): string {
  const list = profile.education || [];
  if (!list.length) return '';

  const items = list
    .map((ed) => {
      const titleStr = [ed.degree, ed.field].filter(Boolean).join(', ') || ed.institution || '';
      const instStr = ed.degree || ed.field ? ed.institution || '' : '';
      const dateStr = formatRange(ed.start, ed.end);
      return `<article class="entry">
      <div class="entry-row">
        <div class="entry-main">
          <span class="e-role">${esc(titleStr)}</span>
          ${instStr ? `<span class="e-company">${esc(instStr)}</span>` : ''}
        </div>
        ${dateStr ? `<span class="e-date">${esc(dateStr)}</span>` : ''}
      </div>
      ${ed.gpa ? `<div class="e-location">GPA ${esc(String(ed.gpa))}</div>` : ''}
      ${ed.honors?.length ? `<ul class="e-bullets">${ed.honors.map((h: string) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
    </article>`;
    })
    .join('');

  return sectionWrap('Education', `<div class="entries">${items}</div>`, t);
}

// ─── Skills ───────────────────────────────────────────────────────────────────

function renderSkills(
  profile: CvProfileDto,
  content: CvDocumentContent_CV,
  t: ResolvedTheme,
  _inSidebar: boolean,
): string {
  let list = profile.skills || [];
  if (content.sectionOverrides?.skillIds?.length) {
    const set = new Set(content.sectionOverrides.skillIds);
    list = list.filter((s) => set.has(s.id));
  }
  if (!list.length) return '';

  if (t.skillStyle === 'bars') {
    const items = list
      .map((s) => {
        const pct = levelPct(s.level);
        return `<div class="sk-bar"><div class="sk-name">${esc(s.name)}</div><div class="bar"><div class="fill" style="width:${pct}%"></div></div></div>`;
      })
      .join('');
    return sectionWrap('Skills', items, t);
  }
  if (t.skillStyle === 'dots') {
    const items = list
      .map(
        (s) =>
          `<div class="sk-dots"><span>${esc(s.name)}</span><span class="dots">${levelDots(s.level)}</span></div>`,
      )
      .join('');
    return sectionWrap('Skills', items, t);
  }
  if (t.skillStyle === 'pills' || t.skillStyle === 'tags') {
    const items = list.map((s) => `<span class="pill">${esc(s.name)}</span>`).join('');
    return sectionWrap('Skills', `<div class="pills">${items}</div>`, t);
  }
  if (t.skillStyle === 'ratings') {
    const items = list
      .map((s) => {
        const lvl = levelStars(s.level);
        return `<div class="sk-rating"><span>${esc(s.name)}</span><span class="stars">${'★'.repeat(lvl)}${'☆'.repeat(5 - lvl)}</span></div>`;
      })
      .join('');
    return sectionWrap('Skills', items, t);
  }
  if (t.skillStyle === 'percent') {
    const items = list
      .map((s) => {
        const pct = levelPct(s.level);
        return `<div class="sk-bar"><div class="sk-name">${esc(s.name)} <em>${pct}%</em></div><div class="bar"><div class="fill" style="width:${pct}%"></div></div></div>`;
      })
      .join('');
    return sectionWrap('Skills', items, t);
  }
  // Phase 42.22 — Chips style (expertise chips with level tag and left accent)
  if (t.skillStyle === 'chips') {
    const items = list
      .map((s) => {
        const levelLabel = s.level ? capitalise(s.level) : '';
        return `<div class="sk-chip"><span class="chip-name">${esc(s.name)}</span>${levelLabel ? `<span class="chip-level">${esc(levelLabel)}</span>` : ''}</div>`;
      })
      .join('');
    return sectionWrap('Skills', items, t);
  }
  // Phase 42.22 — Compact style (2-column grid with 5-step level bars)
  if (t.skillStyle === 'compact') {
    const items = list
      .map((s) => {
        const lvl = levelStars(s.level);
        return `<div class="sk-compact"><span class="sk-name">${esc(s.name)}</span><span class="compact-dots">${'●'.repeat(lvl)}${'○'.repeat(5 - lvl)}</span></div>`;
      })
      .join('');
    return sectionWrap('Skills', `<div class="sk-compact-grid">${items}</div>`, t);
  }
  // plain (grouped by category)
  const groups = new Map<string, string[]>();
  for (const s of list) {
    const cat = s.category || 'Skills';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(s.name);
  }
  const body = Array.from(groups)
    .map(
      ([cat, names]) =>
        `<p class="sk-group"><strong>${esc(capitalise(cat))}:</strong> ${names.map(esc).join(', ')}</p>`,
    )
    .join('');
  return sectionWrap('Skills', body, t);
}

// ─── Languages ────────────────────────────────────────────────────────────────

function renderLanguages(profile: CvProfileDto, t: ResolvedTheme, _inSidebar: boolean): string {
  const list = profile.languages || [];
  if (!list.length) return '';

  const profMap: Record<string, number> = { basic: 1, conversational: 2, fluent: 3, native: 4 };
  const pctMap: Record<string, number> = { basic: 25, conversational: 50, fluent: 80, native: 100 };

  if (t.languageStyle === 'dots') {
    const items = list
      .map((l) => {
        const n = profMap[l.proficiency] || 3;
        return `<div class="lang-row"><span>${esc(l.name)}</span><span class="dots">${'●'.repeat(n)}${'○'.repeat(4 - n)}</span></div>`;
      })
      .join('');
    return sectionWrap('Languages', items, t);
  }
  if (t.languageStyle === 'pills') {
    const items = list
      .map(
        (l) =>
          `<span class="pill">${esc(l.name)} <em class="lang-lv">${esc(capitalise(l.proficiency || ''))}</em></span>`,
      )
      .join('');
    return sectionWrap('Languages', `<div class="pills">${items}</div>`, t);
  }
  if (t.languageStyle === 'bars') {
    const items = list
      .map((l) => {
        const pct = pctMap[l.proficiency] ?? 70;
        return `<div class="sk-bar"><div class="sk-name">${esc(l.name)} <em>${esc(capitalise(l.proficiency || ''))}</em></div><div class="bar"><div class="fill" style="width:${pct}%"></div></div></div>`;
      })
      .join('');
    return sectionWrap('Languages', items, t);
  }
  if (t.languageStyle === 'stars') {
    const starMap: Record<string, number> = { basic: 1, conversational: 2, fluent: 4, native: 5 };
    const items = list
      .map((l) => {
        const lvl = starMap[l.proficiency] ?? 3;
        return `<div class="sk-rating"><span>${esc(l.name)}</span><span class="stars">${'★'.repeat(lvl)}${'☆'.repeat(5 - lvl)}</span></div>`;
      })
      .join('');
    return sectionWrap('Languages', items, t);
  }
  if (t.languageStyle === 'text') {
    const items = list
      .map(
        (l) =>
          `<div class="lang-text"><strong>${esc(l.name)}</strong> — <em>${esc(capitalise(l.proficiency || ''))}</em></div>`,
      )
      .join('');
    return sectionWrap('Languages', items, t);
  }
  // default plain
  return sectionWrap(
    'Languages',
    `<ul>${list.map((l) => `<li>${esc(l.name)} — ${esc(capitalise(l.proficiency || ''))}</li>`).join('')}</ul>`,
    t,
  );
}

// ─── Projects ─────────────────────────────────────────────────────────────────

function renderProjects(
  profile: CvProfileDto,
  content: CvDocumentContent_CV,
  t: ResolvedTheme,
): string {
  let list = profile.projects || [];
  if (content.sectionOverrides?.projectIds?.length) {
    const set = new Set(content.sectionOverrides.projectIds);
    list = list.filter((p) => set.has(p.id));
  }
  if (!list.length) return '';
  const items = list
    .map(
      (p) => `
    <article class="entry">
      <div class="entry-row"><div class="entry-main"><span class="e-role">${esc(p.name || '')}</span></div></div>
      ${p.description ? `<p class="proj-desc">${esc(p.description)}</p>` : ''}
      ${p.technologies?.length ? `<div class="pills tech-pills">${p.technologies.map((tg: string) => `<span class="pill">${esc(tg)}</span>`).join('')}</div>` : ''}
      ${p.results?.length ? `<ul class="e-bullets">${p.results.map((r: string) => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}
      ${p.links?.length ? `<div class="proj-links">${p.links.map((l: any) => `<a href="${esc(l.url)}">${esc(l.label)}</a>`).join(' · ')}</div>` : ''}
    </article>`,
    )
    .join('');
  return sectionWrap('Projects', `<div class="entries">${items}</div>`, t);
}

// ─── Simple list sections ─────────────────────────────────────────────────────

// Phase 42.22 — Certification badge cards with left accent border + issuer
function renderCertifications(profile: CvProfileDto, t: ResolvedTheme): string {
  const list = profile.certifications || [];
  if (!list.length) return '';
  const items = list
    .map(
      (c) =>
        `<div class="cert-item"><div class="cert-name">${esc(c.name || '')}</div>${c.issuer ? `<div class="cert-issuer">${esc(c.issuer)}</div>` : ''}${c.date ? `<div class="cert-date">${esc(c.date)}</div>` : ''}</div>`,
    )
    .join('');
  return sectionWrap('Certifications', items, t);
}

// Phase 42.22 — Awards row layout (name left, issuer/date right)
function renderAwards(profile: CvProfileDto, t: ResolvedTheme): string {
  const list = profile.awards || [];
  if (!list.length) return '';
  const items = list
    .map(
      (a) =>
        `<div class="award-item"><div class="award-name">${esc(a.title || '')}</div><div class="award-meta">${[
          a.issuer,
          a.date,
        ]
          .filter(Boolean)
          .map((x) => esc(x!))
          .join(' · ')}</div></div>`,
    )
    .join('');
  return sectionWrap('Awards', items, t);
}

function renderPublications(profile: CvProfileDto, t: ResolvedTheme): string {
  const list = profile.publications || [];
  if (!list.length) return '';
  return sectionWrap(
    'Publications',
    `<ul>${list
      .map(
        (p) =>
          `<li><strong>${esc(p.title || '')}</strong>${p.venue ? ` — <em>${esc(p.venue)}</em>` : ''}${p.date ? ` <span class="muted">${esc(p.date)}</span>` : ''}</li>`,
      )
      .join('')}</ul>`,
    t,
  );
}

function renderReferences(profile: CvProfileDto, t: ResolvedTheme): string {
  const list = profile.references || [];
  if (!list.length) return '';
  const items = list
    .map(
      (r) =>
        `<div class="ref-card"><div class="e-role">${esc(r.name || '')}</div>${r.title ? `<div class="e-company">${esc(r.title)}${r.company ? `, ${esc(r.company)}` : ''}</div>` : ''}${
          r.email || r.phone
            ? `<div class="ref-contact">${[r.email, r.phone]
                .filter(Boolean)
                .map((c) => esc(c!))
                .join(' · ')}</div>`
            : ''
        }</div>`,
    )
    .join('');
  return sectionWrap('References', items, t);
}

// =============================================================================
//  Cover letter / Portfolio
// =============================================================================

function coverLetterHtml(
  profile: CvProfileDto,
  doc: CvDocumentDto,
  layout: CvTemplateLayout,
  brand?: BrandTokens,
): string {
  const t = resolveTheme(layout, brand);
  const c = (doc.content as CvDocumentContent_CoverLetter) || ({} as any);
  const p = profile.personal || {};
  const contactBar = [p.email, p.phone, p.location]
    .filter(Boolean)
    .map((x) => esc(x!))
    .join(' · ');
  return shell({
    title: doc.title,
    theme: t,
    body: `<div class="page single">
      <header class="header block">
        ${safeFullName(p.fullName) ? `<h1>${esc(safeFullName(p.fullName))}</h1>` : ''}
        ${p.headline ? `<p class="headline">${esc(p.headline)}</p>` : ''}
        ${contactBar ? `<div class="contact-bar">${contactBar}</div>` : ''}
      </header>
      <div class="content">
        <p class="letter-date">${esc(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))}</p>
        ${c.company || c.role ? `<p class="letter-addr">${[esc(c.role || ''), esc(c.company || '')].filter(Boolean).join(' — ')}</p>` : ''}
        ${c.hiringManager ? `<p>${esc(c.hiringManager)}</p>` : ''}
        <p>${esc(c.greeting || 'Dear Hiring Manager,')}</p>
        ${c.intro ? `<p>${esc(c.intro)}</p>` : ''}
        ${(c.body || []).map((para: string) => (para ? `<p>${esc(para)}</p>` : '')).join('')}
        ${c.whyCompany ? `<p>${esc(c.whyCompany)}</p>` : ''}
        <p class="letter-closing">${esc(c.closing || 'Sincerely,')}</p>
        <p class="letter-sig">${esc(c.signature || p.fullName || '')}</p>
      </div>
    </div>`,
  });
}

function portfolioHtml(
  profile: CvProfileDto,
  doc: CvDocumentDto,
  layout: CvTemplateLayout,
  brand?: BrandTokens,
): string {
  const t = resolveTheme(layout, brand);
  const c = (doc.content as CvDocumentContent_Portfolio) || ({} as any);
  const p = profile.personal || {};
  const sections = (c.sections || [])
    .map((sec: any) => {
      const projects =
        sec.key === 'projects'
          ? (profile.projects || [])
              .filter((pr) => !sec.itemIds?.length || sec.itemIds.includes(pr.id))
              .map(
                (pr) =>
                  `<article class="p-card"><h3>${esc(pr.name || '')}</h3>${pr.description ? `<p>${esc(pr.description)}</p>` : ''}${pr.technologies?.length ? `<div class="pills">${pr.technologies.map((tg: string) => `<span class="pill">${esc(tg)}</span>`).join('')}</div>` : ''}</article>`,
              )
              .join('')
          : '';
      return `<section class="port-section"><h2>${esc(sec.title || '')}</h2>${sec.body ? `<p>${esc(sec.body)}</p>` : ''}${projects ? `<div class="p-grid">${projects}</div>` : ''}</section>`;
    })
    .join('');
  const cover = `<section class="port-cover"><h1>${esc(p.fullName || doc.title)}</h1>${p.headline ? `<p class="headline">${esc(p.headline)}</p>` : ''}${p.summary ? `<p>${esc(p.summary)}</p>` : ''}</section>`;
  return shell({ title: doc.title, theme: t, body: cover + sections });
}

// =============================================================================
//  ResolvedTheme + theme resolution
// =============================================================================

interface ResolvedTheme {
  accent: string;
  secondary: string;
  text: string;
  background: string;
  sidebarBg: string;
  sidebarFg: string;
  headingFont: string;
  bodyFont: string;
  density: 'compact' | 'comfortable' | 'spacious';
  headerStyle: 'banner' | 'block' | 'sidebar' | 'minimal' | 'split';
  style: string;
  columns: 1 | 2;
  sidebarSide?: 'left' | 'right';
  sidebarWidth: number;
  photoShape?: 'circle' | 'square' | 'none';
  photoPlace?: 'sidebar' | 'header';
  skillStyle?: string;
  languageStyle?: string;
  icons?: boolean;
  timeline?: boolean;
  accentDividers?: boolean;
  atsSafe?: boolean;
  logoPlace?: 'header' | 'watermark' | 'footer' | 'none';
  logoUrl?: string;
  customCss?: string;
  headerBg?: string;
  bannerBorderBottom?: string;
  sidebarColor?: string;
}

const FONT_NORM: Record<string, string> = {
  Playfair: 'Playfair Display',
  JetBrains: 'JetBrains Mono',
  Cormorant: 'Cormorant Garamond',
  'DM Serif': 'DM Serif Display',
};
function normFont(f: string): string {
  return FONT_NORM[f] || f;
}

const LOCAL_FONT_FACES = [
  { family: 'Inter', local: ['Inter', 'Inter Regular'], fallback: 'Arial, sans-serif' },
  { family: 'Poppins', local: ['Poppins', 'Poppins Regular'], fallback: 'Arial, sans-serif' },
  { family: 'DM Sans', local: ['DM Sans', 'DM Sans Regular'], fallback: 'Arial, sans-serif' },
  {
    family: 'DM Serif Display',
    local: ['DM Serif Display', 'DM Serif Display Regular'],
    fallback: 'Georgia, serif',
  },
  { family: 'Lora', local: ['Lora', 'Lora Regular'], fallback: 'Georgia, serif' },
  {
    family: 'Cormorant Garamond',
    local: ['Cormorant Garamond', 'Cormorant Garamond Regular'],
    fallback: 'Georgia, serif',
  },
  {
    family: 'Playfair Display',
    local: ['Playfair Display', 'Playfair Display Regular'],
    fallback: 'Georgia, serif',
  },
  {
    family: 'JetBrains Mono',
    local: ['JetBrains Mono', 'JetBrains Mono Regular'],
    fallback: 'Menlo, monospace',
  },
  { family: 'Manrope', local: ['Manrope', 'Manrope Regular'], fallback: 'Arial, sans-serif' },
  {
    family: 'Plus Jakarta Sans',
    local: ['Plus Jakarta Sans', 'Plus Jakarta Sans Regular'],
    fallback: 'Arial, sans-serif',
  },
  {
    family: 'Merriweather',
    local: ['Merriweather', 'Merriweather Regular'],
    fallback: 'Georgia, serif',
  },
];

function localFontCss(): string {
  return LOCAL_FONT_FACES.map((font) => {
    const src = font.local.map((name) => `local('${name}')`).join(', ');
    return `@font-face{font-family:'${font.family}';src:${src};font-weight:300 800;font-style:normal;font-display:block;}
@font-face{font-family:'${font.family}';src:${src};font-weight:300 800;font-style:italic;font-display:block;}`;
  }).join('\n');
}

function fontStack(font: string, kind: 'heading' | 'body'): string {
  const face = LOCAL_FONT_FACES.find((f) => f.family === font);
  if (face) return `'${face.family}', ${face.fallback}`;
  return kind === 'heading' ? `'${font}', Georgia, serif` : `'${font}', Arial, sans-serif`;
}

function resolveTheme(layout: CvTemplateLayout, brand?: BrandTokens): ResolvedTheme {
  const ats = !!layout.atsSafe;
  const accent = ats ? '#000000' : brand?.colors?.primary || layout.accent || '#1F2937';
  const secondary = brand?.colors?.secondary || '#64748B';

  const sc = layout.sidebarColor;
  let sidebarBg = '#F1F5F9',
    sidebarFg = '#0F172A';
  if (sc === 'accent') {
    sidebarBg = accent;
    sidebarFg = '#FFFFFF';
  } else if (sc === 'dark') {
    sidebarBg = '#0F172A';
    sidebarFg = '#F8FAFC';
  } else if (sc === 'charcoal') {
    sidebarBg = '#1E293B';
    sidebarFg = '#F1F5F9';
  } else if (sc === 'navy') {
    sidebarBg = '#0D1B2A';
    sidebarFg = '#EEF2F7';
  } else if (sc === 'light') {
    sidebarBg = '#F8FAFC';
    sidebarFg = '#0F172A';
  } else if (sc === 'warmlight') {
    sidebarBg = '#FAFAF8';
    sidebarFg = '#1A1A1A';
  } else if (sc && /^#/.test(sc)) {
    sidebarBg = sc;
    sidebarFg = '#FFFFFF';
  }

  const rawH = brand?.fonts?.heading || layout.typography?.heading || 'Inter';
  const rawB = brand?.fonts?.body || layout.typography?.body || 'Inter';

  return {
    accent,
    secondary,
    text: brand?.colors?.text || '#0F172A',
    background: brand?.colors?.background || '#FFFFFF',
    sidebarBg,
    sidebarFg,
    headingFont: ats ? 'Arial' : normFont(rawH),
    bodyFont: ats ? 'Arial' : normFont(rawB),
    density: layout.density || 'comfortable',
    headerStyle: ats ? 'block' : (layout.headerStyle as any) || 'block',
    style: ats ? 'classic' : layout.style || 'classic',
    columns: ats ? 1 : layout.columns || 1,
    sidebarSide: ats ? undefined : layout.sidebarSide,
    sidebarWidth: layout.sidebarWidth || 275,
    photoShape: ats ? 'none' : layout.photoShape,
    photoPlace: ats ? undefined : layout.photoPlace,
    skillStyle: ats ? 'plain' : layout.skillStyle,
    languageStyle: ats ? 'plain' : layout.languageStyle,
    icons: ats ? false : (layout.icons ?? true),
    timeline: ats ? false : layout.timeline,
    accentDividers: ats ? false : layout.accentDividers,
    atsSafe: ats,
    logoPlace: layout.logoPlace ?? (brand?.logo ? 'header' : 'none'),
    logoUrl: brand?.logo,
    customCss: layout.customCss,
    headerBg: layout.headerBg,
    bannerBorderBottom: layout.bannerBorderBottom,
    sidebarColor: layout.sidebarColor,
  };
}

// =============================================================================
//  HTML Shell + Premium CSS
// =============================================================================

function shell(opts: { title: string; theme: ResolvedTheme; body: string }): string {
  const t = opts.theme;

  // Phase 43.1C — Ensure minimum spacing values to prevent broken layouts
  const spGap = Math.max(18, t.density === 'compact' ? 20 : t.density === 'spacious' ? 36 : 28); // section gap
  const enGap = Math.max(12, t.density === 'compact' ? 14 : t.density === 'spacious' ? 22 : 18); // entry gap
  const pgPad = Math.max(28, t.density === 'compact' ? 32 : t.density === 'spacious' ? 48 : 40); // page top/bottom pad
  const hPad = Math.max(20, t.density === 'compact' ? 24 : t.density === 'spacious' ? 44 : 36); // header top/bottom internal pad
  const sidePad = 48; // page side pad (single-col)
  const mainPad = 44; // main-column side pad (two-col)

  const sidebarW = Math.max(200, Math.min(320, t.sidebarWidth || 275)); // clamp sidebar width
  const bannerBg = t.headerBg || t.accent;
  const bannerBrd = t.bannerBorderBottom ? `border-bottom:${t.bannerBorderBottom};` : '';

  const watermark =
    t.logoPlace === 'watermark' && t.logoUrl
      ? `<div class="wm"><img src="${esc(t.logoUrl)}" alt=""/></div>`
      : '';
  const footLogo =
    t.logoPlace === 'footer' && t.logoUrl
      ? `<footer class="foot-logo"><img src="${esc(t.logoUrl)}" alt=""/></footer>`
      : '';
  const fontCss = localFontCss();

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(opts.title)}</title>
<style>
${fontCss}
/* ── Variables ─────────────────────────────────────── */
:root {
  --a:  ${t.accent};
  --a2: ${t.secondary};
  --tx: ${t.text};
  --bg: ${t.background};
  --sb: ${t.sidebarBg};
  --sf: ${t.sidebarFg};
  --hf: ${fontStack(t.headingFont, 'heading')};
  --bf: ${fontStack(t.bodyFont, 'body')};
  --sp: ${spGap}px;
  --eg: ${enGap}px;
}
/* ── Reset ──────────────────────────────────────────── */
@page { size:A4; margin:0; }
*,*::before,*::after { box-sizing:border-box; }
html { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
body { margin:0; padding:0; font-family:var(--bf); font-size:11.5px; line-height:1.65;
  color:var(--tx); background:#D8DCE0; -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility; }
/* ── Page containers ─────────────────────────────────── */
.page { background:var(--bg); margin:0 auto; width:210mm; max-width:880px; min-height:297mm; }
/* Single-column: page owns the padding, banner bleeds through negative margin */
.page.single { padding:${pgPad}px ${sidePad}px ${Math.round(pgPad * 1.2)}px; }
/* full-bleed banner in single-col */
.page.single>.header.banner { margin:-${pgPad}px -${sidePad}px 0; margin-bottom:${Math.round(hPad * 0.8)}px; padding:${hPad}px ${sidePad}px ${Math.round(hPad * 0.65)}px; }
/* Sidebar grid */
.page.sidebar-layout { display:grid; min-height:297mm; align-items:stretch; }
.page.sidebar-layout.side-left  { grid-template-columns:${sidebarW}px 1fr; }
.page.sidebar-layout.side-right { grid-template-columns:1fr ${sidebarW}px; }
/* ── Sidebar ─────────────────────────────────────────── */
.sidebar { background:var(--sb); color:var(--sf); padding:${Math.round(hPad * 0.85)}px 22px ${pgPad}px; }
.sidebar.light { background:var(--sb); color:var(--tx); }
.sidebar h1,.sidebar h2,.sidebar h3 { color:var(--sf); }
.sidebar.light h1,.sidebar.light h2,.sidebar.light h3 { color:var(--tx); }
.sidebar h2 { font-size:9.5px; letter-spacing:.18em; border-bottom:1px solid rgba(255,255,255,.22); opacity:.75; padding-bottom:5px; margin-bottom:12px; }
.sidebar.light h2 { border-color:var(--a); color:var(--a); opacity:1; }
.sidebar .section+.section { margin-top:22px; }
.sidebar .award-item { display:block; padding:7px 0; }
.sidebar .award-name { color:var(--sf); overflow-wrap:anywhere; }
.sidebar.light .award-name { color:var(--tx); }
.sidebar .award-meta { color:rgba(255,255,255,.72); white-space:normal; margin-top:2px; }
.sidebar.light .award-meta { color:#64748B; }
.sidebar .ref-contact,
.sidebar .cert-issuer,
.sidebar .cert-date,
.sidebar .lang-text,
.sidebar .sk-name { overflow-wrap:anywhere; }
/* ── Main column ─────────────────────────────────────── */
.main { padding:${Math.round(hPad * 0.85)}px ${mainPad}px ${pgPad}px; }
/* Headers inside .main: strip top/side padding — .main already provides it */
.main>.header.block,
.main>.header.minimal,
.main>.header.split  { padding-top:0; padding-left:0; padding-right:0; }
/* Full-bleed banner inside .main */
.main>.header.banner { margin:-${Math.round(hPad * 0.85)}px -${mainPad}px 0; margin-bottom:${Math.round(hPad * 0.7)}px; padding:${Math.round(hPad * 0.75)}px ${mainPad}px ${Math.round(hPad * 0.5)}px; }
.main .content { padding:0; }
/* Content for single-col: top gap between header and sections */
.page.single .content { padding-top:${Math.round(spGap * 0.9)}px; }
/* Section spacing */
.content>.section+.section { margin-top:var(--sp); }
/* ── Typography ─────────────────────────────────────── */
h1,h2,h3,h4 { font-family:var(--hf); margin:0; padding:0; }
h1 { font-size:44px; font-weight:700; line-height:1.1; letter-spacing:-.025em; color:var(--tx); }
h2 { font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:.13em;
     color:var(--a); border-bottom:2px solid var(--a); padding-bottom:6px; margin-bottom:16px; }
h2 .h2-label { min-width:0; }
.has-icons h2 { display:flex; align-items:center; gap:10px; border-bottom:0; padding-bottom:0; margin-bottom:18px; }
.has-icons h2::after { content:''; height:1px; background:linear-gradient(to right,var(--a),rgba(0,0,0,0)); flex:1; opacity:.55; }
.sec-ico { width:25px; height:25px; border-radius:999px; display:inline-flex; align-items:center; justify-content:center;
  background:var(--a); color:#fff; font-family:var(--bf); font-size:8px; font-weight:800; letter-spacing:0; line-height:1; flex:0 0 25px; }
.sidebar .sec-ico { background:rgba(255,255,255,.14); color:var(--sf); border:1px solid rgba(255,255,255,.22); }
.sidebar.light .sec-ico { background:var(--a); color:#fff; border-color:transparent; }
h3 { font-size:13px; font-weight:700; color:var(--tx); }
p  { margin:0 0 5px; }
a  { color:var(--a); text-decoration:none; }
/* ── BANNER HEADER ───────────────────────────────────── */
.header.banner { background:${bannerBg}; color:#fff; ${bannerBrd} }
.banner-main { display:flex; align-items:center; gap:18px; }
.banner-text h1 { color:#fff; font-size:44px; margin-bottom:5px; }
.banner-text .headline { color:rgba(255,255,255,.88); font-size:18px; font-weight:400; margin:0; }
.banner-contact { margin-top:16px; padding-top:13px; border-top:1px solid rgba(255,255,255,.22);
  display:flex; flex-wrap:wrap; gap:3px 20px; }
.bc-item { font-size:10.5px; color:rgba(255,255,255,.82); }
/* Photo inside banner */
.photo.photo-banner { width:88px; height:88px; object-fit:cover; flex-shrink:0; }
.photo.photo-banner.photo-circle { border-radius:999px; border:3px solid rgba(255,255,255,.45); }
.photo.photo-banner.photo-square { border-radius:8px; }
/* ── BLOCK HEADER ────────────────────────────────────── */
.header.block h1 { font-size:40px; color:var(--tx); margin-bottom:5px; }
.header.block .headline { font-size:18px; color:var(--a); font-weight:500; margin:0; }
.header.block .contact-bar { margin-top:11px; font-size:10.5px; color:#64748B;
  display:flex; flex-wrap:wrap; gap:2px 16px; }
.header.block { border-bottom:3px solid var(--a); padding-bottom:18px; margin-bottom:0; }
/* ── MINIMAL HEADER ──────────────────────────────────── */
.header.minimal h1 { font-size:42px; font-weight:300; letter-spacing:-.035em; color:var(--tx); }
.header.minimal .headline { font-size:14px; letter-spacing:.1em; text-transform:uppercase;
  color:var(--a); margin-top:6px; font-weight:600; }
.header.minimal .contact-bar { margin-top:14px; font-size:10px; color:#94A3B8;
  display:flex; flex-wrap:wrap; gap:2px 16px; }
.header.minimal { border-bottom:1px solid #E2E8F0; padding-bottom:20px; }
/* ── SPLIT HEADER ────────────────────────────────────── */
.header.split { display:flex; align-items:flex-end; justify-content:space-between; gap:20px;
  border-bottom:3px solid var(--a); padding-bottom:18px; }
.split-left h1 { font-size:38px; color:var(--tx); margin-bottom:4px; }
.split-left .headline { font-size:16px; color:var(--a); font-weight:500; }
.split-right { text-align:right; }
.split-contact { display:flex; flex-direction:column; gap:3px; font-size:10.5px; color:#64748B; }
/* ── Sidebar head ────────────────────────────────────── */
.sidebar-head { margin-bottom:18px; padding-bottom:14px; border-bottom:1px solid rgba(255,255,255,.14); }
.sidebar-head h1 { font-size:23px; line-height:1.2; color:var(--sf); }
.sidebar.light .sidebar-head h1 { color:var(--tx); }
.sidebar-head .s-headline { font-size:11.5px; color:var(--sf); opacity:.8; margin-top:4px; }
.sidebar.light .sidebar-head .s-headline { color:var(--a); opacity:1; }
/* ── Photo ───────────────────────────────────────────── */
.sidebar-photo { display:flex; justify-content:center; margin-bottom:20px; }
.photo { width:120px; height:120px; object-fit:cover; display:block; }
.photo-circle { border-radius:999px; border:3px solid rgba(255,255,255,.28); }
.photo-square { border-radius:8px; }
/* ── Contact list (sidebar) ──────────────────────────── */
.contact-list { font-size:10.5px; margin-bottom:20px; display:grid; gap:7px; }
.c-row { display:flex; align-items:flex-start; gap:9px; line-height:1.4; }
.c-ico { font-size:11px; opacity:.7; flex-shrink:0; min-width:16px; text-align:center; }
.c-val { word-break:break-all; }
/* ── Summary ─────────────────────────────────────────── */
.summary-body { font-size:12px; line-height:1.75; color:#374151; }
/* ── Entries (role/date flex row) ────────────────────── */
.entries>.entry+.entry { margin-top:var(--eg); }
.entry { overflow-wrap:anywhere; }
.entry-row { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; }
.entry-main { flex:1; min-width:0; }
.e-role { display:block; font-size:13px; font-weight:700; color:var(--tx); }
.e-company { display:block; font-size:12px; color:var(--a); font-weight:500; font-style:italic; margin-top:1px; }
.e-date { font-size:10px; color:#6B7280; white-space:nowrap; flex-shrink:0; padding-top:2px; font-style:italic; }
.e-location { font-size:10px; color:#94A3B8; margin-top:2px; margin-bottom:5px; }
.e-description { margin-top:7px; display:grid; gap:5px; }
.e-description p { margin:0; font-size:11.5px; line-height:1.62; color:#374151; }
.e-bullets { margin:7px 0 0 16px; padding:0; }
.e-bullets li { font-size:11.5px; margin-bottom:4px; line-height:1.55; }
.e-bullets li::marker { color:var(--a); font-size:1.1em; }
.semantic-list { display:grid; gap:5px; margin-top:8px; }
.semantic-item { display:grid; grid-template-columns:auto 1fr; gap:8px; align-items:start; font-size:11px; line-height:1.5; color:#374151; }
.semantic-label { color:var(--a); font-size:8px; text-transform:uppercase; letter-spacing:.08em; font-weight:800; padding-top:2px; }
.experience-chips { display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; }
.experience-chips .pills { margin:0; }
.achievement-list .semantic-item { padding:6px 8px; background:rgba(0,0,0,.028); border-left:2px solid var(--a); }
.metric-pills .semantic-pill { background:rgba(var(--accent-rgb, 37,99,235),.1); color:var(--a); font-weight:700; }
.project-list .semantic-label { color:var(--a2); }
/* ── Timeline ────────────────────────────────────────── */
.tl-track { position:relative; padding-left:24px; border-left:2px solid rgba(0,0,0,.1); }
.entry-tl { position:relative; padding-bottom:var(--eg); }
.entry-tl+.entry-tl { margin-top:0; }
.tl-dot { position:absolute; left:-33px; top:4px; width:13px; height:13px; border-radius:50%;
  background:var(--a); border:2.5px solid var(--bg); box-shadow:0 0 0 2px var(--a); }
/* ── Skills ──────────────────────────────────────────── */
.sk-bar { margin:8px 0; }
.sk-name { font-size:11px; margin-bottom:4px; display:flex; justify-content:space-between; }
.sk-name em { color:var(--a); font-style:normal; font-weight:600; }
.bar { background:rgba(0,0,0,.08); height:8px; border-radius:4px; overflow:hidden; }
.fill { background:var(--a); height:100%; border-radius:4px; }
.sidebar .bar { background:rgba(255,255,255,.18); }
.sidebar .fill { background:rgba(255,255,255,.82); }
.sk-dots { display:flex; align-items:center; justify-content:space-between; font-size:11px; padding:4px 0; }
.dots { color:var(--a); font-size:14px; letter-spacing:2px; }
.sidebar .dots { color:rgba(255,255,255,.9); }
.sk-rating { display:flex; align-items:center; justify-content:space-between; font-size:11px; padding:4px 0; }
.stars { color:var(--a); font-size:13px; letter-spacing:.5px; }
.sk-group { font-size:11px; margin-bottom:5px; }
/* Phase 42.22 — Chips style (expertise chips with left accent) */
.sk-chip { display:flex; align-items:center; justify-content:space-between; padding:7px 0 7px 10px;
  border-left:3px solid var(--a); margin-bottom:6px; }
.chip-name { font-size:11px; font-weight:600; color:var(--tx); }
.chip-level { font-size:9px; color:var(--a2); text-transform:uppercase; letter-spacing:.06em; font-weight:500; }
/* Phase 42.22 — Compact style (2-column grid with 5-step level bars) */
.sk-compact-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px 14px; }
.sk-compact { display:flex; justify-content:space-between; align-items:center; font-size:10.5px; }
.compact-dots { color:var(--a); font-size:12px; letter-spacing:1px; }
.sidebar .compact-dots { color:rgba(255,255,255,.88); }
.sidebar.light .compact-dots { color:var(--a); }
.sidebar .sk-compact { gap:8px; }
.sidebar .sk-compact .sk-name { color:inherit; min-width:0; overflow-wrap:anywhere; }
/* ── Pills ───────────────────────────────────────────── */
.pills { display:flex; flex-wrap:wrap; gap:5px; }
.pill { display:inline-block; padding:3px 10px; border-radius:4px; background:rgba(0,0,0,.065); font-size:10px; font-weight:500; color:var(--tx); line-height:1.4; }
.sidebar .pill { background:rgba(255,255,255,.18); color:var(--sf); }
.sidebar.light .pill { background:rgba(0,0,0,.065); color:var(--tx); }
.tech-pills { margin-top:5px; }
/* ── Languages ───────────────────────────────────────── */
.lang-row { display:flex; justify-content:space-between; align-items:center; font-size:11px; padding:4px 0; }
.lang-text { font-size:11px; padding:2px 0; }
.lang-text em { color:var(--a2); font-style:normal; }
.lang-lv { color:inherit; opacity:.65; font-size:9px; margin-left:4px; font-style:normal; }
/* ── Projects ────────────────────────────────────────── */
.proj-desc { font-size:11px; margin-top:4px; color:#4B5563; }
.proj-links { margin-top:5px; font-size:10.5px; }
.proj-links a+a::before { content:' · '; color:#94A3B8; }
/* Phase 42.22 — Certification badge cards (left accent border + issuer) */
.cert-item { border-left:3px solid var(--a); padding:8px 0 8px 12px; margin-bottom:10px; }
.cert-name { font-size:12px; font-weight:700; color:var(--tx); margin-bottom:3px; }
.cert-issuer { font-size:10.5px; color:var(--a); font-style:italic; margin-bottom:2px; }
.cert-date { font-size:9.5px; color:#94A3B8; }
/* Phase 42.22 — Awards row layout (name left, meta right) */
.award-item { display:flex; justify-content:space-between; align-items:baseline; gap:12px;
  padding:6px 0; border-bottom:1px solid rgba(0,0,0,.05); }
.award-item:last-child { border-bottom:none; }
.award-name { font-size:12px; font-weight:700; color:var(--tx); flex:1; }
.award-meta { font-size:10px; color:#94A3B8; white-space:nowrap; }
/* Phase 42.22 — Metric highlighting (bolded metrics in bullets) */
.e-bullets strong.metric { color:var(--a); font-weight:700; }
/* ── References ──────────────────────────────────────── */
.ref-card+.ref-card { margin-top:10px; }
.ref-contact { font-size:10px; color:#64748B; margin-top:2px; }
/* ── Misc ────────────────────────────────────────────── */
.headline { font-size:18px; font-weight:400; }
.muted { color:#94A3B8; font-size:10px; }
ul { margin:4px 0 0 18px; padding:0; }
ul li { margin-bottom:3px; }
.section-div { height:2px; background:var(--a); opacity:.16; margin-top:9px; }
.brand-logo { max-height:26px; margin-bottom:8px; }
.wm { position:fixed; top:40%; left:0; right:0; text-align:center; opacity:.05; pointer-events:none; }
.foot-logo { position:fixed; bottom:0; right:20px; padding:6px; }
.foot-logo img { max-height:22px; opacity:.7; }
/* ── Letter ──────────────────────────────────────────── */
.letter-date { color:#64748B; font-size:10px; margin-bottom:20px; }
.letter-addr { font-weight:600; margin-bottom:12px; }
.letter-closing { margin-top:20px; }
.letter-sig { font-weight:600; margin-top:4px; }
/* ── Portfolio ───────────────────────────────────────── */
.port-cover { text-align:center; padding:80px 60px 60px; }
.port-section { padding:40px 60px; border-top:1px solid #E2E8F0; }
.p-grid { display:grid; gap:16px; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); margin-top:16px; }
.p-card { padding:16px; border:1px solid #E2E8F0; border-radius:8px; }
/* ── Page breaks ─────────────────────────────────────── */
.entry,.ref-card,.sk-bar,.sk-dots,.sk-rating,.lang-row,.lang-text { page-break-inside:avoid; break-inside:avoid; }
.section,.entries { page-break-inside:auto; break-inside:auto; }
.s-skills,.s-languages,.s-certifications,.s-awards { page-break-inside:avoid; break-inside:avoid; }
.entry,.entry-tl,.cert-item,.award-item,.ref-card,.sk-bar,.sk-dots,.sk-rating,.sk-chip,.sk-compact,.sk-group,.lang-row,.lang-text,.p-card {
  page-break-inside:avoid;
  break-inside:avoid;
  break-inside:avoid-page;
}
.tl-track { page-break-inside:auto; break-inside:auto; }
h2,h3,.section>h2 { page-break-after:avoid; break-after:avoid-page; }
.section>h2 { orphans:3; widows:3; }
/* ── ATS overrides ───────────────────────────────────── */
${
  t.atsSafe
    ? `
.photo,.sidebar-photo,.wm,.foot-logo,.dots,.stars { display:none!important; }
.tl-track { padding-left:0!important; border-left:none!important; }
.tl-dot { display:none!important; }
.header.banner,.sidebar { background:white!important; color:black!important; }
h1,h2,h3,.e-company { color:black!important; }
.e-company,.e-role { font-style:normal!important; }
.fill { display:none!important; }
.pills { display:block!important; margin-top:5px!important; }
.pill { display:inline!important; padding:0!important; border:0!important; background:transparent!important; color:black!important; font-size:inherit!important; font-weight:400!important; }
.pill+.pill::before { content:', '; color:black; }
h2 { border-bottom:1px solid black!important; font-size:13px!important; letter-spacing:.05em!important; text-transform:uppercase!important; }
`
    : ''
}
/* ── Marketplace premium system ─────────────────────── */
.premium-page { box-shadow:0 18px 44px rgba(15,23,42,.14); overflow:visible; }
.premium-page .section { position:relative; }
.premium-page .summary-body { font-size:12.3px; color:#334155; max-width:68ch; }
.premium-page .entry { padding-bottom:1px; }
.premium-page .e-role { letter-spacing:-.01em; }
.premium-page .e-company { margin-top:2px; }
.premium-page .contact-list { padding-top:2px; }
.premium-page .c-row { gap:10px; }
.premium-page .c-ico { width:22px; height:22px; min-width:22px; border-radius:999px; display:inline-flex; align-items:center; justify-content:center;
  background:rgba(255,255,255,.14); color:currentColor; font-size:9px; opacity:1; }
.premium-page .sidebar.light .c-ico { background:rgba(0,0,0,.055); color:var(--a); }
.premium-page .photo { box-shadow:0 12px 26px rgba(15,23,42,.18); }
.premium-page .photo-circle { border-width:5px; }
.tmpl-sidebar .sidebar-photo { margin-top:2px; }
.tmpl-sidebar .sidebar-photo::before { content:''; position:absolute; width:142px; height:142px; border-radius:999px; border:12px solid rgba(255,255,255,.08); margin-top:-11px; }
.tmpl-sidebar .sidebar-photo { position:relative; }
.tmpl-sidebar .sidebar h2 { border-bottom:0; }
.tmpl-sidebar .sidebar .section-div { background:rgba(255,255,255,.28); opacity:1; }
.tmpl-sidebar .main { position:relative; }
.tmpl-sidebar.side-left .main { border-left:1px solid rgba(15,23,42,.06); }
.tmpl-sidebar.side-right .main { border-right:1px solid rgba(15,23,42,.06); }
.tmpl-twocolumn .sidebar { border-left:1px solid rgba(15,23,42,.08); border-right:1px solid rgba(15,23,42,.08); }
.tmpl-twocolumn .header.block { border-bottom:0; }
.tmpl-twocolumn .header.block::after { content:''; display:block; width:86px; height:4px; background:var(--a); margin-top:16px; border-radius:3px; }
.tmpl-timeline .content { position:relative; }
.tmpl-timeline .tl-track { border-left-width:3px; padding-left:30px; }
.tmpl-timeline .tl-dot { left:-38px; width:15px; height:15px; box-shadow:0 0 0 5px color-mix(in srgb,var(--a) 18%,transparent); }
.tmpl-minimal .content { display:block; }
.tmpl-minimal .content>.section+.section { margin-top:var(--sp); }
.tmpl-minimal .section { margin-bottom:0; }
.tmpl-minimal .sk-compact-grid { grid-template-columns:1fr 1fr; }
.tmpl-minimal h2 .sec-ico { background:transparent; color:var(--a); border:1px solid rgba(0,0,0,.18); }
.tmpl-banner .header.banner { position:relative; overflow:hidden; }
.tmpl-banner .header.banner::before { content:''; position:absolute; right:-72px; top:-96px; width:220px; height:220px; transform:rotate(35deg); background:rgba(255,255,255,.10); border-radius:28px; }
.tmpl-banner .header.banner::after { content:''; position:absolute; right:34px; bottom:-42px; width:120px; height:120px; transform:rotate(35deg); background:rgba(255,255,255,.07); border-radius:24px; }
.tmpl-banner .banner-main,.tmpl-banner .banner-contact { position:relative; z-index:1; }
.tmpl-classic .header.block,.tmpl-classic .header.minimal { border-bottom:3px double var(--a); }
.tmpl-classic h2 .sec-ico { background:#fff; color:var(--a); border:1.5px solid var(--a); }
.tmpl-photo .header.banner { min-height:150px; }
.tmpl-photo .photo-banner { width:108px; height:108px; }
.tmpl-photo .content { column-gap:34px; }
.density-spacious .entry-row { gap:16px; }
.density-compact .sec-ico { width:22px; height:22px; flex-basis:22px; font-size:7px; }
/* ── Print ───────────────────────────────────────────── */
@media print {
  body { background:white; }
  .page { box-shadow:none; max-width:none; width:210mm; min-height:297mm; overflow:visible; }
  .page.sidebar-layout { display:${t.atsSafe ? 'block' : 'grid'}; }
  .sidebar { background:var(--sb)!important; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .header.banner,.fill,.pill,.cert-item,.sk-chip,.sec-ico { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .page.sidebar-layout { grid-template-columns:${t.sidebarSide === 'right' ? `1fr ${sidebarW}px` : `${sidebarW}px 1fr`}; }
}
/* ── Per-template overrides ──────────────────────────── */
${t.customCss || ''}
</style></head><body>${watermark}${opts.body}${footLogo}</body></html>`;
}

// =============================================================================
//  Helpers
// =============================================================================

// Phase 42.22 — Section wrapper with semantic classes for per-section customCss targeting
function sectionWrap(title: string, body: string, t: ResolvedTheme): string {
  const div = t.accentDividers ? '<div class="section-div"></div>' : '';
  const sectionClass = title ? `section s-${title.toLowerCase().replace(/\s+/g, '-')}` : 'section';
  return `<section class="${sectionClass}">${title ? `<h2>${sectionIcon(title, t)}<span class="h2-label">${esc(title)}</span></h2>` : ''}${body}${div}</section>`;
}

function sectionIcon(title: string, t: ResolvedTheme): string {
  if (!t.icons || t.atsSafe) return '';
  const map: Record<string, string> = {
    Summary: 'ME',
    Experience: 'EX',
    Education: 'ED',
    Skills: 'SK',
    Languages: 'LA',
    Projects: 'PR',
    Certifications: 'CR',
    Awards: 'AW',
    Publications: 'PB',
    References: 'RF',
  };
  return `<span class="sec-ico" aria-hidden="true">${esc(map[title] || title.slice(0, 2).toUpperCase())}</span>`;
}

function renderPreservedParagraphs(value: any): string {
  const paragraphs = splitPreservedText(value);
  if (!paragraphs.length) return '';
  return `<div class="e-description">${paragraphs.map((p) => `<p>${highlightMetrics(p)}</p>`).join('')}</div>`;
}

function renderRichList(values: any, label: string, className: string): string {
  const list = uniqueTextArray(values);
  if (!list.length) return '';
  return `<div class="${className} semantic-list" aria-label="${esc(label)}s">${list.map((v) => `<div class="semantic-item"><span class="semantic-label">${esc(label)}</span><span>${highlightMetrics(v)}</span></div>`).join('')}</div>`;
}

function renderSemanticChips(values: any, className: string): string {
  const list = uniqueTextArray(values);
  if (!list.length) return '';
  return `<div class="pills ${className}">${list.map((v) => `<span class="pill semantic-pill">${highlightMetrics(v)}</span>`).join('')}</div>`;
}

function splitPreservedText(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return uniqueTextArray(value);
  return String(value)
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function experienceRawFallbackLines(exp: any): string[] {
  const rawLines = splitPreservedText(exp?.rawText);
  if (!rawLines.length) return [];
  const headerKeys = new Set(
    [
      exp?.role,
      exp?.company,
      exp?.location,
      exp?.start,
      exp?.end,
      formatRange(exp?.start, exp?.end),
    ]
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase()),
  );

  return uniqueTextArray(rawLines)
    .filter((line) => !headerKeys.has(line.toLowerCase()))
    .filter((line) => !/^\d{4}(?:\s*[–-]\s*(?:\d{4}|present|current))?$/i.test(line))
    .filter((line) => line.split(/\s+/).length >= 3 || /\d/.test(line));
}

function uniqueTextArray(values: any): string[] {
  const source = Array.isArray(values) ? values : splitPreservedText(values);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of source || []) {
    const text = String(value || '').trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

// Phase 42.22 — Metric highlighting: auto-bold $amounts, %, and large numbers in bullets
function highlightMetrics(text: string): string {
  let html = esc(text);
  // Highlight dollar amounts: $500K, $1.2M, $45,000
  html = html.replace(/(\$[\d,.]+[KMB]?)/g, '<strong class="metric">$1</strong>');
  // Highlight percentages: 50%, 125%
  html = html.replace(/([\d,.]+%)/g, '<strong class="metric">$1</strong>');
  // Highlight large numbers with K/M/B suffix: 100K, 2.5M users
  html = html.replace(/([\d,.]+[KMB](?=\s|$))/g, '<strong class="metric">$1</strong>');
  return html;
}

function levelPct(level?: string): number {
  return level === 'expert'
    ? 95
    : level === 'advanced'
      ? 80
      : level === 'intermediate'
        ? 60
        : level === 'beginner'
          ? 35
          : 70;
}
function levelStars(level?: string): number {
  return level === 'expert'
    ? 5
    : level === 'advanced'
      ? 4
      : level === 'intermediate'
        ? 3
        : level === 'beginner'
          ? 2
          : 3;
}
function levelDots(level?: string): string {
  const n = levelStars(level);
  return '●'.repeat(n) + '○'.repeat(5 - n);
}
function formatRange(start?: string, end?: string): string {
  if (!start && !end) return '';
  return [start || '', end || (start ? 'Present' : '')].filter(Boolean).join(' – ');
}
function capitalise(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
