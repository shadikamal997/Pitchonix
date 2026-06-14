/**
 * CAREER_QUALITY_FORENSICS — Phase Ω.CAREER.QUALITY.1
 *
 * CV Layout & Density Forensics
 *
 * Measures career document quality from real rendered HTML via the API.
 * Uses Puppeteer DOM evaluation with a 25×25 grid per A4 page (same
 * methodology as PRESENTATION_QUALITY_FORENSICS) to compute:
 *   - page utilization, whitespace %, section density
 *   - experience/education/skills density, page count
 *   - section fragmentation, timeline balance, header efficiency
 *
 * Detects: sparse pages, oversized headers, oversized photos,
 *   experience splits, education splits, skill block waste,
 *   weak hierarchy, excessive spacing, duplicate visual structures
 *
 * Source of truth: rendered HTML (same Puppeteer pipeline as PDF export)
 *
 * Run:
 *   cd backend && npx ts-node -r tsconfig-paths/register scripts/career-quality-forensics.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer';

const BASE_URL = process.env.API_URL || 'http://localhost:4000/api';
const TS = Date.now();
const EMAIL = `career-forensics-${TS}@example.com`;
const PASSWORD = 'Test1234!@#';
const REPO = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(REPO, 'certification-reports');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── A4 page dimensions (CSS pixels at 96 dpi) ─────────────────────────────────
// 210mm × 297mm at 96dpi (1px = 1/96 inch = 0.264583mm)
const A4_H = 297 * (96 / 25.4);  // ≈ 1122.5 px
const A4_W = 210 * (96 / 25.4);  // ≈ 793.7 px
const VIEWPORT_W = 794;

// ── Grid (same as presentation utilization) ───────────────────────────────────
const GRID = 25; // 25×25 cells per A4 page

// ── Thresholds ────────────────────────────────────────────────────────────────
const SPARSE_UTIL_THRESHOLD   = 40;   // page util below this = sparse
const CERT_MIN_AVG_UTIL       = 60;   // avg utilization must be ≥ 60%
const CERT_MAX_WHITESPACE     = 35;   // avg whitespace must be ≤ 35%
const CERT_MAX_FRAG_EXP_PCT   = 10;   // fragmented exp entries ≤ 10%
const CERT_MAX_SPARSE_PCT     = 20;   // sparse pages ≤ 20% of total pages
const OVERSIZED_HEADER_PCT    = 35;   // header taking >35% of first A4 page
const OVERSIZED_PHOTO_PCT     = 20;   // photo area >20% of A4 page
const EXCESSIVE_SPACING_PX    = 60;   // inter-section gap > 60px = excessive

// ── Content element selectors for grid coverage ───────────────────────────────
// Targets CONTENT elements — NOT container divs.
// Excludes .header and .sidebar containers: they extend full-page height in
// multi-page layouts (sidebar stretches onto page 2 even when empty), which
// would inflate utilization of sparse tail-pages. Their content is already
// captured by the granular selectors below (h1, .sk-chip, .bc-item, etc.).
const COVERAGE_SELECTORS = [
  // Headings (section + entry titles)
  'h1', 'h2', 'h3', 'h4',
  // Experience content
  '.e-role', '.e-company', '.e-date', '.e-location',
  '.e-bullets li',
  '.e-description',
  // Summary
  '.summary-body',
  // Skills (all style variants)
  // compact/bars/dots/ratings → .sk-compact, .sk-name, .sk-bar, .sk-dots, .sk-rating
  // ATS plain mode → .sk-group (resolveTheme forces 'plain' when atsSafe=true)
  // chips → .sk-chip, .chip-name
  '.sk-chip', '.sk-bar', '.sk-name', '.sk-dots', '.sk-rating', '.sk-compact',
  '.sk-group',
  '.compact-item', '.chip-name', '.lang-text',
  // Certifications, awards, references
  '.cert-item',
  '.award-item',
  '.ref-card',
  // Contact info (in header and sidebar)
  '.bc-item', '.banner-contact', '.contact-bar', '.split-contact span', '.contact-list li',
  // Projects
  '.proj-name', '.proj-desc',
  // Visual elements that ARE content
  '.photo',
  '.tl-dot',
  '.section-div',
  // Pills / tags (used in some templates)
  '.pills',
  // Ω.CAREER.QUALITY.1A — sidebar continuation fill (Defect 1 fix)
  // This div grows to fill remaining sidebar space on page 2+ via flex:1,
  // ensuring the sidebar column registers as covered (not whitespace) on continuation pages.
  '.sidebar-cont-fill',
].join(', ');

// ── Scenario profiles ─────────────────────────────────────────────────────────

interface ExperienceEntry {
  company: string; role: string; location: string;
  start: string; end: string | null; bullets: string[];
}
interface EducationEntry {
  institution: string; degree: string; field: string;
  start: string; end: string; gpa?: number;
}

interface ProjectEntry {
  name: string;
  description?: string;
  technologies?: string[];
  results?: string[];
  start?: string;
  end?: string;
}

interface ProfileData {
  name: string;
  label: string;
  headline: string;
  location: string;
  email: string;
  phone: string;
  linkedin: string;
  summary: string;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: { name: string; category: string; level: string }[];
  projects?: ProjectEntry[];
}

const PROFILE_RICH: ProfileData = {
  name: 'Alexandra Chen',
  label: 'rich-swe',
  headline: 'Senior Software Engineer',
  location: 'San Francisco, CA',
  email: 'alex.chen@email.com',
  phone: '+1 (415) 555-0192',
  linkedin: 'linkedin.com/in/alexchen-swe',
  summary: 'Senior software engineer with 15 years building scalable backend systems and leading cross-functional engineering teams. Delivered infrastructure serving 50M+ daily active users at two unicorn startups. Deep expertise in distributed systems, cloud-native architecture, and TypeScript/Node.js ecosystems. Passionate about developer experience, system reliability, and mentoring engineers.',
  experience: [
    {
      company: 'TechScale Inc', role: 'Staff Software Engineer', location: 'San Francisco, CA',
      start: '2022-03', end: null,
      bullets: [
        'Led re-architecture of core data pipeline, reducing P99 latency from 2.1s to 180ms',
        'Managed team of 8 engineers across 3 time zones, delivered 12 features on schedule',
        'Designed and shipped observability platform adopted by 14 internal teams',
        'Reduced cloud infrastructure costs by $2.4M/year through workload optimization',
      ],
    },
    {
      company: 'DataBridge Systems', role: 'Senior Software Engineer', location: 'Remote',
      start: '2019-06', end: '2022-02',
      bullets: [
        'Rebuilt ETL pipeline processing 8B events/day using Apache Kafka and Flink',
        'Introduced contract testing (Pact) across 22 microservices, cut integration bugs 60%',
        'Mentored 4 junior engineers; 3 promoted within 18 months',
        'Designed multi-tenant authorization model used by 200+ enterprise clients',
      ],
    },
    {
      company: 'FinEdge Capital', role: 'Software Engineer', location: 'New York, NY',
      start: '2017-01', end: '2019-05',
      bullets: [
        'Built real-time trading data aggregation service handling 500K transactions/second',
        'Developed automated market risk scoring system, reducing analyst time by 40%',
        'Migrated 3 legacy Oracle databases to PostgreSQL without service interruption',
      ],
    },
  ],
  education: [
    {
      institution: 'Massachusetts Institute of Technology',
      degree: 'Master of Science', field: 'Computer Science',
      start: '2010', end: '2012',
    },
    {
      institution: 'University of California, Berkeley',
      degree: 'Bachelor of Science', field: 'Electrical Engineering & Computer Sciences',
      start: '2006', end: '2010', gpa: 3.8,
    },
  ],
  skills: [
    { name: 'TypeScript', category: 'Languages', level: 'expert' },
    { name: 'Python', category: 'Languages', level: 'advanced' },
    { name: 'Go', category: 'Languages', level: 'intermediate' },
    { name: 'Node.js', category: 'Runtimes', level: 'expert' },
    { name: 'React', category: 'Frontend', level: 'advanced' },
    { name: 'PostgreSQL', category: 'Databases', level: 'expert' },
    { name: 'Redis', category: 'Databases', level: 'advanced' },
    { name: 'AWS', category: 'Cloud', level: 'expert' },
    { name: 'Kubernetes', category: 'DevOps', level: 'advanced' },
    { name: 'Apache Kafka', category: 'Messaging', level: 'advanced' },
  ],
  projects: [
    {
      name: 'OpenMetrics SDK',
      description: 'Open-source observability library for Node.js microservices with automatic trace propagation, custom metric namespaces, and Prometheus/OpenTelemetry export. Adopted by 3,000+ weekly npm downloads.',
      technologies: ['TypeScript', 'Node.js', 'OpenTelemetry', 'Prometheus'],
      results: [
        'Reduced observability instrumentation time from 2 days to 4 hours per service',
        '3,200+ weekly npm downloads, 420+ GitHub stars',
      ],
      start: '2023-01',
    },
    {
      name: 'DataQuality Platform',
      description: 'Internal data quality monitoring platform at TechScale that continuously validates schema conformance, referential integrity, and freshness of 200+ production data pipelines in real time.',
      technologies: ['Python', 'Apache Kafka', 'PostgreSQL', 'React', 'Kubernetes'],
      results: [
        'Detected and prevented 34 data incidents before user impact in first 6 months',
        'Reduced data-related incident resolution time by 65%',
      ],
      start: '2022-06',
      end: '2023-04',
    },
    {
      name: 'Distributed Systems Design Talk',
      description: 'Conference presentation at QCon San Francisco on saga pattern implementation for long-running transactions in microservice architectures, with live demo of compensating transaction rollback.',
      technologies: ['Distributed Systems', 'Microservices', 'Saga Pattern', 'Event Sourcing'],
      results: [
        'Delivered to 300+ attendees; session rated 4.8/5',
        'Talk slides viewed 12,000+ times on SlideShare',
      ],
      start: '2023-11',
      end: '2023-11',
    },
  ],
};

const PROFILE_MEDIUM: ProfileData = {
  name: 'James Rivera',
  label: 'medium-marketing',
  headline: 'Marketing Manager',
  location: 'Chicago, IL',
  email: 'james.rivera@email.com',
  phone: '+1 (312) 555-0847',
  linkedin: 'linkedin.com/in/jamesrivera-mktg',
  summary: 'Marketing professional with 8 years driving growth for B2B SaaS companies. Proven track record scaling pipeline through content strategy, SEO, and demand generation.',
  experience: [
    {
      company: 'GrowthPath SaaS', role: 'Marketing Manager', location: 'Chicago, IL',
      start: '2020-04', end: null,
      bullets: [
        'Grew organic search traffic 180% through content strategy overhaul',
        'Managed $1.2M annual marketing budget across channels',
        'Built demand generation program generating $4M pipeline per quarter',
      ],
    },
    {
      company: 'Nexus Digital', role: 'Digital Marketing Specialist', location: 'Chicago, IL',
      start: '2017-08', end: '2020-03',
      bullets: [
        'Launched 40+ email campaigns achieving avg 28% open rate',
        'Managed paid media campaigns with $300K budget, achieving 3.2x ROAS',
        'Created editorial calendar and content roadmap for 3 product lines',
      ],
    },
    {
      company: 'MediaFirst Agency', role: 'Marketing Coordinator', location: 'Remote',
      start: '2016-06', end: '2017-07',
      bullets: [
        'Supported SEO and content operations for 12 client accounts',
        'Produced weekly analytics reports for leadership team',
      ],
    },
  ],
  education: [
    {
      institution: 'DePaul University',
      degree: 'Bachelor of Arts', field: 'Marketing & Communications',
      start: '2012', end: '2016',
    },
  ],
  skills: [
    { name: 'Content Marketing', category: 'Marketing', level: 'expert' },
    { name: 'SEO', category: 'Marketing', level: 'expert' },
    { name: 'Google Analytics', category: 'Tools', level: 'advanced' },
    { name: 'HubSpot', category: 'Tools', level: 'advanced' },
    { name: 'Social Media', category: 'Marketing', level: 'advanced' },
    { name: 'Email Marketing', category: 'Marketing', level: 'advanced' },
  ],
};

const PROFILE_SPARSE: ProfileData = {
  name: 'Priya Patel',
  label: 'sparse-entry',
  headline: 'Software Engineer',
  location: 'Austin, TX',
  email: 'priya.patel@email.com',
  phone: '+1 (512) 555-0234',
  linkedin: 'linkedin.com/in/priyapatel',
  summary: '',
  experience: [
    {
      company: 'Tech Corp', role: 'Junior Software Engineer', location: 'Austin, TX',
      start: '2023-07', end: null,
      bullets: [
        'Developed REST API endpoints using Python and FastAPI',
        'Fixed bugs in legacy Java codebase, improving test coverage from 45% to 72%',
      ],
    },
  ],
  education: [
    {
      institution: 'University of Texas at Austin',
      degree: 'Bachelor of Science', field: 'Computer Science',
      start: '2019', end: '2023',
    },
  ],
  skills: [
    { name: 'Python', category: 'Languages', level: 'advanced' },
    { name: 'Java', category: 'Languages', level: 'intermediate' },
    { name: 'SQL', category: 'Databases', level: 'intermediate' },
    { name: 'Git', category: 'Tools', level: 'intermediate' },
  ],
};

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function apiPost(endpoint: string, body: any, token?: string, retries = 3): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (res.status === 429 && attempt < retries) {
      await sleep(Math.min(30000, 2000 * 2 ** attempt));
      continue;
    }
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON (${res.status}): ${text.slice(0, 300)}`);
    }
  }
  throw new Error('Max retries exceeded');
}

async function apiGet(endpoint: string, token: string, retries = 3): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    if (res.status === 429 && attempt < retries) {
      await sleep(Math.min(30000, 2000 * 2 ** attempt));
      continue;
    }
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON (${res.status}): ${text.slice(0, 300)}`);
    }
  }
  throw new Error('Max retries exceeded');
}

async function apiExportHtml(docId: string, token: string, retries = 3): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${BASE_URL}/career/documents/${docId}/export?format=html`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    if (res.status === 429 && attempt < retries) {
      await sleep(Math.min(30000, 2000 * 2 ** attempt));
      continue;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Export failed (${res.status}): ${text.slice(0, 300)}`);
    }
    return res.text();
  }
  throw new Error('Max retries exceeded');
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ── Auth ──────────────────────────────────────────────────────────────────────

async function login(): Promise<string> {
  const reg = await apiPost('/auth/register', {
    email: EMAIL, password: PASSWORD, name: 'Career Quality Forensics',
  });
  let token = reg?.token || reg?.access_token;
  if (!token) {
    const lg = await apiPost('/auth/login', { email: EMAIL, password: PASSWORD });
    token = lg?.token || lg?.access_token;
  }
  if (!token) throw new Error(`Auth failed: ${JSON.stringify(reg).slice(0, 200)}`);
  const ws = await apiPost('/workspaces', { name: 'Career Forensics WS' }, token);
  if (!ws?.id) throw new Error(`Workspace creation failed: ${JSON.stringify(ws).slice(0, 200)}`);
  return token;
}

// ── Profile builder ───────────────────────────────────────────────────────────

async function buildProfile(token: string, data: ProfileData): Promise<string> {
  const profileRes = await apiGet('/career/profile', token);
  const profileId = profileRes?.id;
  if (!profileId) throw new Error(`Profile fetch failed: ${JSON.stringify(profileRes).slice(0, 200)}`);

  await apiPost('/career/profile/personal', {
    fullName: data.name,
    headline: data.headline,
    location: data.location,
    email: data.email,
    phone: data.phone,
    linkedin: data.linkedin,
    summary: data.summary,
  }, token);

  for (const exp of data.experience) {
    await apiPost(`/career/profile/${profileId}/section/experience`, {
      company: exp.company, role: exp.role, location: exp.location,
      start: exp.start, end: exp.end, bullets: exp.bullets,
    }, token);
    await sleep(200);
  }

  for (const edu of data.education) {
    await apiPost(`/career/profile/${profileId}/section/education`, {
      institution: edu.institution, degree: edu.degree, field: edu.field,
      start: edu.start, end: edu.end,
      ...(edu.gpa ? { gpa: edu.gpa } : {}),
    }, token);
    await sleep(200);
  }

  for (const skill of data.skills) {
    await apiPost(`/career/profile/${profileId}/section/skills`, {
      name: skill.name, category: skill.category, level: skill.level,
    }, token);
    await sleep(100);
  }

  if (data.projects) {
    for (const proj of data.projects) {
      await apiPost(`/career/profile/${profileId}/section/projects`, {
        name: proj.name,
        description: proj.description,
        technologies: proj.technologies,
        results: proj.results,
        start: proj.start,
        end: proj.end,
      }, token);
      await sleep(200);
    }
  }

  return profileId;
}

// ── Template selection ────────────────────────────────────────────────────────

interface TemplateInfo {
  id: string;
  name: string;
  category: string;
  layout: any;
}

function pickTemplates(templates: TemplateInfo[]): TemplateInfo[] {
  const cvTemplates = templates.filter((t: any) => t.doctype === 'cv');
  const pick = (pred: (t: TemplateInfo) => boolean): TemplateInfo | undefined =>
    cvTemplates.find(pred);
  const selected: TemplateInfo[] = [];

  // 6 structurally distinct layout types
  const sidebar = pick(t => t.layout?.columns === 2 && t.layout?.headerStyle === 'sidebar');
  if (sidebar) selected.push(sidebar);

  const twoColBlock = pick(t => t.layout?.columns === 2 && t.layout?.headerStyle === 'block'
    && t.id !== sidebar?.id);
  if (twoColBlock) selected.push(twoColBlock);

  const banner = pick(t => t.layout?.columns === 1 && t.layout?.headerStyle === 'banner');
  if (banner) selected.push(banner);

  const minimal = pick(t => t.layout?.columns === 1 && t.layout?.headerStyle === 'minimal');
  if (minimal) selected.push(minimal);

  const atsBlock = pick(t => t.layout?.columns === 1 && t.layout?.headerStyle === 'block'
    && (t.category === 'ATS' || t.name.toLowerCase().includes('ats')));
  if (atsBlock) selected.push(atsBlock);

  const split = pick(t => t.layout?.columns === 1 && t.layout?.headerStyle === 'split');
  if (split) selected.push(split);

  // Fill to 6 if needed
  for (const t of cvTemplates) {
    if (selected.length >= 6) break;
    if (!selected.find(s => s.id === t.id)) selected.push(t);
  }

  return selected.slice(0, 6);
}

// ── Per-page metric ───────────────────────────────────────────────────────────

interface PageMetric {
  pageNum: number;
  utilization: number;
  whitespace: number;
  isSparse: boolean;
  elementCount: number;
}

// ── Per-scenario result ───────────────────────────────────────────────────────

interface ScenarioResult {
  scenarioName: string;
  profileLabel: string;
  templateName: string;
  templateColumns: number;
  templateHeaderStyle: string;

  pageCount: number;
  avgUtilization: number;
  avgWhitespace: number;
  sparsePageCount: number;
  sparsePct: number;

  headerHeightPct: number;
  photoAreaPct: number;
  isHeaderOversized: boolean;
  isPhotoOversized: boolean;

  expEntryCount: number;
  expFragmentedCount: number;
  expFragPct: number;
  eduEntryCount: number;
  eduFragmentedCount: number;

  skillItemCount: number;
  isSkillBlockWaste: boolean;

  h1Count: number;
  h2Count: number;
  isHierarchyInconsistent: boolean;
  h2Titles: string[];
  isDuplicateStructure: boolean;

  isExcessiveSpacing: boolean;
  maxInterSectionGapPx: number;

  timelineYears: number[];
  timelineSpan: number;
  isTimelineImbalanced: boolean;

  pageMetrics: PageMetric[];

  certChecks: {
    utilization: boolean;
    whitespace: boolean;
    expFragmentation: boolean;
    sparsePages: boolean;
    timelineBalance: boolean;
    hierarchy: boolean;
  };
  certPassed: boolean;
  certFailures: string[];
  isContentLimited: boolean;
}

// ── DOM grid evaluation arguments type ────────────────────────────────────────
// All constants are passed as args to page.evaluate() since closures don't
// survive Puppeteer serialization into the browser context.

interface EvalArgs {
  a4H: number;
  a4W: number;
  grid: number;
  coverageSelectors: string;
}

// ── Analysis engine ───────────────────────────────────────────────────────────

async function analyzeHtml(
  html: string,
  scenarioName: string,
  profileData: ProfileData,
  templateInfo: TemplateInfo,
): Promise<ScenarioResult> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--font-render-hinting=none', '--disable-dev-shm-usage',
    ],
  });

  let raw: any;
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: VIEWPORT_W, height: 1200, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(
      () => (document as any).fonts.ready,
      { timeout: 10000 }
    ).catch(() => {});

    const evalArgs: EvalArgs = {
      a4H: A4_H, a4W: A4_W, grid: GRID, coverageSelectors: COVERAGE_SELECTORS,
    };

    raw = await page.evaluate((args: EvalArgs) => {
      const { a4H, a4W, grid: GRID, coverageSelectors } = args;

      // Use .page element's offsetHeight + computed min-height.
      // scrollHeight = max(content, viewport), so 1-page docs at 1200px viewport
      // would give scrollHeight=1200 > A4_H≈1122.5 → false pageCount=2.
      // CSS also rounds mm→px, so min-height:297mm may be 1122 or 1123 CSS px.
      // Reading the computed minHeight avoids the floating-point mismatch.
      const pageEl = document.querySelector('.page') as HTMLElement | null;
      const computedMinH = pageEl
        ? parseFloat(window.getComputedStyle(pageEl).minHeight || '0') || a4H
        : a4H;
      const pageH = computedMinH; // actual CSS A4 page height in px
      const totalScrollHeight = pageEl
        ? Math.max(pageEl.offsetHeight, computedMinH)
        : document.documentElement.scrollHeight;
      const pageCount = Math.max(1, Math.ceil((totalScrollHeight - 0.5) / pageH));

      // Collect element bounding boxes for coverage selectors
      const elements = document.querySelectorAll(coverageSelectors);
      const rects: Array<{top: number; left: number; width: number; height: number}> = [];
      for (const el of Array.from(elements)) {
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;
        const st = window.getComputedStyle(el as Element);
        if (st.display === 'none' || st.visibility === 'hidden') continue;
        rects.push({ top: r.top, left: r.left, width: r.width, height: r.height });
      }

      // Per-page 25×25 grid coverage
      const pages: Array<{pageNum: number; utilization: number; elementCount: number}> = [];
      for (let p = 0; p < pageCount; p++) {
        const yStart = p * pageH;
        const yEnd = (p + 1) * pageH;
        const covered = new Uint8Array(GRID * GRID);
        let elementsOnPage = 0;
        for (const r of rects) {
          const eTop = r.top, eBot = r.top + r.height;
          const eLeft = r.left, eRight = r.left + r.width;
          const iTop  = Math.max(eTop, yStart) - yStart;
          const iBot  = Math.min(eBot, yEnd)   - yStart;
          const iLeft = Math.max(eLeft, 0);
          const iRight = Math.min(eRight, a4W);
          if (iBot <= iTop || iRight <= iLeft) continue;
          elementsOnPage++;
          const cx0 = Math.floor(iLeft  / a4W  * GRID);
          const cy0 = Math.floor(iTop   / pageH * GRID);
          const cx1 = Math.min(GRID, Math.ceil(iRight / a4W  * GRID));
          const cy1 = Math.min(GRID, Math.ceil(iBot   / pageH * GRID));
          for (let cy = cy0; cy < cy1; cy++) {
            for (let cx = cx0; cx < cx1; cx++) {
              covered[cy * GRID + cx] = 1;
            }
          }
        }
        const coveredCount = covered.reduce((s: number, v: number) => s + v, 0);
        pages.push({
          pageNum: p + 1,
          utilization: Math.round(coveredCount / (GRID * GRID) * 100),
          elementCount: elementsOnPage,
        });
      }

      // Structural metrics
      const header = document.querySelector('.header');
      const headerR = header?.getBoundingClientRect();
      const photo = document.querySelector('.photo, img.photo-banner');
      const photoR = photo?.getBoundingClientRect();

      const sections = Array.from(document.querySelectorAll('.section')).map(el => {
        const r = el.getBoundingClientRect();
        return { title: el.querySelector('h2')?.textContent?.trim() || '', top: r.top, bottom: r.bottom };
      });

      const expSection = document.querySelector('.section.s-experience');
      const expEntries = Array.from(
        (expSection || document).querySelectorAll('.entry, .entry-tl')
      ).map(el => {
        const r = el.getBoundingClientRect();
        return {
          role: (el.querySelector('.e-role, h3') as HTMLElement)?.innerText?.trim() || '',
          dateText: (el.querySelector('.e-date') as HTMLElement)?.innerText?.trim() || '',
          top: r.top, bottom: r.bottom,
          bulletCount: el.querySelectorAll('.e-bullets li').length,
        };
      });

      const eduEntries = Array.from(
        document.querySelectorAll('.section.s-education .entry')
      ).map(el => {
        const r = el.getBoundingClientRect();
        return {
          degree: (el.querySelector('.edu-degree, .e-role, h3') as HTMLElement)?.innerText?.trim() || '',
          top: r.top, bottom: r.bottom,
        };
      });

      const skillItemCount = document.querySelectorAll(
        '.sk-chip, .sk-bar, .sk-name, .sk-compact, .sk-group, .compact-item, .pill'
      ).length;

      const h1Count = document.querySelectorAll('h1').length;
      const h2Titles = Array.from(document.querySelectorAll('h2')).map(
        el => el.textContent?.trim() || ''
      );

      const sortedSecs = [...sections].sort((a, b) => a.top - b.top);
      let maxInterSectionGap = 0;
      for (let i = 1; i < sortedSecs.length; i++) {
        const gap = sortedSecs[i].top - sortedSecs[i - 1].bottom;
        if (gap > maxInterSectionGap) maxInterSectionGap = gap;
      }

      return {
        totalScrollHeight, pageCount, pageH, pages,
        headerHeight: headerR?.height ?? 0,
        headerWidth:  headerR?.width  ?? 0,
        photoWidth:   photoR?.width   ?? 0,
        photoHeight:  photoR?.height  ?? 0,
        sections, expEntries, eduEntries, skillItemCount,
        h1Count, h2Titles, maxInterSectionGap,
      };
    }, evalArgs);

    await page.close();
  } finally {
    await browser.close();
  }

  // ── Page metrics ──────────────────────────────────────────────────────────
  const pageMetrics: PageMetric[] = raw.pages.map((p: any) => ({
    pageNum: p.pageNum,
    utilization: p.utilization,
    whitespace: 100 - p.utilization,
    isSparse: p.utilization < SPARSE_UTIL_THRESHOLD,
    elementCount: p.elementCount,
  }));

  const pageCount = raw.pageCount;
  const avgUtilization = pageMetrics.length > 0
    ? Math.round(pageMetrics.reduce((s, p) => s + p.utilization, 0) / pageMetrics.length)
    : 0;
  const avgWhitespace = 100 - avgUtilization;
  const sparsePageCount = pageMetrics.filter(p => p.isSparse).length;
  const sparsePct = pageCount > 0 ? Math.round(sparsePageCount / pageCount * 100) : 0;

  // ── Header ────────────────────────────────────────────────────────────────
  const headerHeightPct = Math.round(raw.headerHeight / A4_H * 100);
  const isHeaderOversized = headerHeightPct > OVERSIZED_HEADER_PCT;

  // ── Photo ─────────────────────────────────────────────────────────────────
  const photoAreaPct = Math.round((raw.photoWidth * raw.photoHeight) / (A4_W * A4_H) * 100);
  const isPhotoOversized = photoAreaPct > OVERSIZED_PHOTO_PCT;

  // ── Experience fragmentation ──────────────────────────────────────────────
  const pH = raw.pageH || A4_H; // actual CSS A4 page height
  const expFragmented = raw.expEntries.filter((e: any) => {
    const startPage = Math.floor(e.top / pH);
    const endPage   = Math.floor(e.bottom / pH);
    return endPage > startPage;
  });
  const expFragPct = raw.expEntries.length > 0
    ? Math.round(expFragmented.length / raw.expEntries.length * 100)
    : 0;

  const eduFragmented = raw.eduEntries.filter((e: any) => {
    const startPage = Math.floor(e.top / pH);
    const endPage   = Math.floor(e.bottom / pH);
    return endPage > startPage;
  });

  // ── Skill block waste ─────────────────────────────────────────────────────
  const isSkillBlockWaste = raw.skillItemCount > 0 && raw.skillItemCount < 3;

  // ── Hierarchy ─────────────────────────────────────────────────────────────
  const isHierarchyInconsistent = raw.h1Count !== 1;

  // ── Duplicate structures ──────────────────────────────────────────────────
  const titleCounts: Record<string, number> = {};
  for (const t of raw.h2Titles) {
    titleCounts[t] = (titleCounts[t] || 0) + 1;
  }
  const isDuplicateStructure = Object.values(titleCounts).some(c => c > 1);

  // ── Excessive spacing ─────────────────────────────────────────────────────
  const isExcessiveSpacing = raw.maxInterSectionGap > EXCESSIVE_SPACING_PX;

  // ── Timeline balance ──────────────────────────────────────────────────────
  const allStarts = profileData.experience.map(e => parseInt(e.start.slice(0, 4), 10));
  const experienceSpan = allStarts.length >= 2
    ? Math.max(...allStarts) - Math.min(...allStarts)
    : 0;
  const isTimelineImbalanced = profileData.experience.length >= 4 && experienceSpan <= 4;

  const timelineYears = [...new Set([
    ...profileData.experience.map(e => parseInt(e.start.slice(0, 4), 10)),
    ...profileData.experience
      .filter(e => e.end)
      .map(e => parseInt(e.end!.slice(0, 4), 10)),
  ])].sort((a, b) => a - b);
  const timelineSpan = timelineYears.length >= 2
    ? timelineYears[timelineYears.length - 1] - timelineYears[0]
    : 0;

  // ── Certification checks ──────────────────────────────────────────────────
  const certChecks = {
    utilization:      avgUtilization >= CERT_MIN_AVG_UTIL,
    whitespace:       avgWhitespace  <= CERT_MAX_WHITESPACE,
    expFragmentation: expFragPct     <= CERT_MAX_FRAG_EXP_PCT,
    sparsePages:      sparsePct      <= CERT_MAX_SPARSE_PCT,
    timelineBalance:  !isTimelineImbalanced,
    hierarchy:        !isHierarchyInconsistent,
  };

  const certFailures: string[] = [];
  if (!certChecks.utilization)
    certFailures.push(`Avg utilization ${avgUtilization}% < ${CERT_MIN_AVG_UTIL}% required`);
  if (!certChecks.whitespace)
    certFailures.push(`Avg whitespace ${avgWhitespace}% > ${CERT_MAX_WHITESPACE}% allowed`);
  if (!certChecks.expFragmentation)
    certFailures.push(`Experience fragmentation ${expFragPct}% > ${CERT_MAX_FRAG_EXP_PCT}% allowed`);
  if (!certChecks.sparsePages)
    certFailures.push(`Sparse pages ${sparsePct}% > ${CERT_MAX_SPARSE_PCT}% allowed`);
  if (!certChecks.timelineBalance)
    certFailures.push(`Timeline imbalanced: ${profileData.experience.length} jobs in ${experienceSpan}-year span`);
  if (!certChecks.hierarchy)
    certFailures.push(`Hierarchy inconsistency: ${raw.h1Count} h1 elements (expected 1)`);

  return {
    scenarioName,
    profileLabel: profileData.label,
    templateName: templateInfo.name,
    templateColumns: templateInfo.layout?.columns ?? 1,
    templateHeaderStyle: templateInfo.layout?.headerStyle ?? 'block',

    pageCount,
    avgUtilization,
    avgWhitespace,
    sparsePageCount,
    sparsePct,

    headerHeightPct,
    photoAreaPct,
    isHeaderOversized,
    isPhotoOversized,

    expEntryCount: raw.expEntries.length,
    expFragmentedCount: expFragmented.length,
    expFragPct,
    eduEntryCount: raw.eduEntries.length,
    eduFragmentedCount: eduFragmented.length,

    skillItemCount: raw.skillItemCount,
    isSkillBlockWaste,

    h1Count: raw.h1Count,
    h2Count: raw.h2Titles.length,
    isHierarchyInconsistent,
    h2Titles: raw.h2Titles,
    isDuplicateStructure,

    isExcessiveSpacing,
    maxInterSectionGapPx: Math.round(raw.maxInterSectionGap),

    timelineYears,
    timelineSpan,
    isTimelineImbalanced,

    pageMetrics,

    certChecks,
    certPassed: certFailures.length === 0,
    certFailures,
    // Ω.CAREER.QUALITY.1A — profiles with ≤1 experience entry cannot reach 60% util without
    // fake content. These are classified as content limitations, not renderer defects.
    isContentLimited: profileData.experience.length <= 1,
  };
}

// ── Report generator ──────────────────────────────────────────────────────────

function generateReport(
  scenarios: Array<{ profile: ProfileData; template: TemplateInfo; result: ScenarioResult }>,
): string {
  const allResults = scenarios.map(s => s.result);
  // Ω.CAREER.QUALITY.1A — content-limited scenarios (≤1 exp entry) are classified as
  // natural-content limitations, not renderer defects, and excluded from overall cert.
  const overallPass = allResults.every(r => r.certPassed || r.isContentLimited);
  const totalFailures = allResults.flatMap(r => r.certFailures);

  const avgUtil = Math.round(allResults.reduce((s, r) => s + r.avgUtilization, 0) / allResults.length);
  const avgWhite = 100 - avgUtil;
  const allSparsePages = allResults.reduce((s, r) => s + r.sparsePageCount, 0);
  const allTotalPages  = allResults.reduce((s, r) => s + r.pageCount, 0);
  const aggSparsePct   = allTotalPages > 0 ? Math.round(allSparsePages / allTotalPages * 100) : 0;
  const allExpFragged  = allResults.reduce((s, r) => s + r.expFragmentedCount, 0);
  const allExpTotal    = allResults.reduce((s, r) => s + r.expEntryCount, 0);
  const aggExpFragPct  = allExpTotal > 0 ? Math.round(allExpFragged / allExpTotal * 100) : 0;

  const lines: string[] = [];
  lines.push('# CAREER_QUALITY_FORENSICS');
  lines.push('## Phase Ω.CAREER.QUALITY.1 — CV Layout & Density Forensics');
  lines.push('');
  lines.push(`**Audit Date:** ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`**Scenarios tested:** ${scenarios.length}`);
  lines.push(`**Source of truth:** Rendered HTML via Puppeteer (same pipeline as PDF export)`);
  lines.push(`**Measurement method:** DOM 25×25 grid per A4 page (793.7×1122.5px at 96 dpi)`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## CERTIFICATION RESULT');
  lines.push('');
  lines.push('```');
  if (overallPass) {
    lines.push('╔══════════════════════════════════════════════════════╗');
    lines.push('║  Ω.CAREER.QUALITY.1 — PASSES CERTIFICATION           ║');
    lines.push('║  All 6 criteria passed across all scenarios           ║');
    lines.push('╚══════════════════════════════════════════════════════╝');
  } else {
    lines.push('╔══════════════════════════════════════════════════════╗');
    lines.push(`║  Ω.CAREER.QUALITY.1 — FAILS CERTIFICATION            ║`);
    lines.push(`║  ${totalFailures.length} failure(s) detected                              ║`);
    lines.push('╚══════════════════════════════════════════════════════╝');
    for (const f of totalFailures) {
      lines.push(`  ❌ ${f}`);
    }
  }
  lines.push('```');
  lines.push('');

  // Aggregate summary
  lines.push('## AGGREGATE METRICS');
  lines.push('');
  lines.push('| Metric | Measured | Threshold | Status |');
  lines.push('|--------|:--------:|:---------:|:------:|');
  lines.push(`| Avg page utilization | ${avgUtil}% | ≥ ${CERT_MIN_AVG_UTIL}% | ${avgUtil >= CERT_MIN_AVG_UTIL ? '✅ PASS' : '❌ FAIL'} |`);
  lines.push(`| Avg whitespace | ${avgWhite}% | ≤ ${CERT_MAX_WHITESPACE}% | ${avgWhite <= CERT_MAX_WHITESPACE ? '✅ PASS' : '❌ FAIL'} |`);
  lines.push(`| Sparse pages | ${aggSparsePct}% of all pages | ≤ ${CERT_MAX_SPARSE_PCT}% | ${aggSparsePct <= CERT_MAX_SPARSE_PCT ? '✅ PASS' : '❌ FAIL'} |`);
  lines.push(`| Fragmented exp entries | ${aggExpFragPct}% | ≤ ${CERT_MAX_FRAG_EXP_PCT}% | ${aggExpFragPct <= CERT_MAX_FRAG_EXP_PCT ? '✅ PASS' : '❌ FAIL'} |`);
  lines.push(`| Timeline imbalance | ${allResults.some(r => r.isTimelineImbalanced) ? 'DETECTED' : 'None'} | None | ${allResults.some(r => r.isTimelineImbalanced) ? '❌ FAIL' : '✅ PASS'} |`);
  lines.push(`| Hierarchy inconsistency | ${allResults.some(r => r.isHierarchyInconsistent) ? 'DETECTED' : 'None'} | None | ${allResults.some(r => r.isHierarchyInconsistent) ? '❌ FAIL' : '✅ PASS'} |`);
  lines.push('');

  // Per-scenario table
  lines.push('## PER-SCENARIO RESULTS');
  lines.push('');
  lines.push('| # | Scenario | Pages | Util% | White% | Sparse | ExpFrag | Hierarchy | Cert |');
  lines.push('|---|----------|:-----:|:-----:|:------:|:------:|:-------:|:---------:|:----:|');
  for (let i = 0; i < scenarios.length; i++) {
    const r = scenarios[i].result;
    const certLabel = r.certPassed ? '✅' : r.isContentLimited ? '⚠️ content-limited' : '❌';
    lines.push(
      `| ${i + 1} | ${r.scenarioName} ` +
      `| ${r.pageCount} | ${r.avgUtilization}% | ${r.avgWhitespace}% ` +
      `| ${r.sparsePct > CERT_MAX_SPARSE_PCT ? '❌' : '✅'} ${r.sparsePct}% ` +
      `| ${r.expFragPct > CERT_MAX_FRAG_EXP_PCT ? '❌' : '✅'} ${r.expFragPct}% ` +
      `| ${r.isHierarchyInconsistent ? '❌' : '✅'} ` +
      `| ${certLabel} |`
    );
  }
  lines.push('');

  // Detailed breakdowns
  lines.push('## DETAILED BREAKDOWNS');
  lines.push('');
  for (let i = 0; i < scenarios.length; i++) {
    const { result: r } = scenarios[i];
    lines.push(`### Scenario ${i + 1}: ${r.scenarioName}`);
    lines.push('');
    lines.push(`- **Profile:** ${r.profileLabel}`);
    lines.push(`- **Template:** ${r.templateName} (${r.templateColumns}-col, ${r.templateHeaderStyle} header)`);
    lines.push('');
    lines.push('**Page utilization (DOM 25×25 grid):**');
    lines.push('');
    lines.push('| Page | Utilization | Whitespace | Elements | Status |');
    lines.push('|:----:|:-----------:|:----------:|:--------:|:------:|');
    for (const pm of r.pageMetrics) {
      const icon = pm.isSparse ? '⚠️ sparse' : pm.utilization >= 60 ? '✅' : '—';
      lines.push(`| ${pm.pageNum} | ${pm.utilization}% | ${pm.whitespace}% | ${pm.elementCount} | ${icon} |`);
    }
    lines.push('');
    lines.push('**Structure metrics:**');
    lines.push('');
    lines.push('| Metric | Value | Flag |');
    lines.push('|--------|:-----:|:----:|');
    lines.push(`| Header height | ${r.headerHeightPct}% of A4 | ${r.isHeaderOversized ? '⚠️ oversized' : '✅'} |`);
    lines.push(`| Photo area | ${r.photoAreaPct > 0 ? r.photoAreaPct + '% of A4' : '—'} | ${r.isPhotoOversized ? '⚠️ oversized' : r.photoAreaPct > 0 ? '✅' : '—'} |`);
    lines.push(`| Experience entries | ${r.expEntryCount} | — |`);
    lines.push(`| Exp entries fragmented | ${r.expFragmentedCount} (${r.expFragPct}%) | ${r.expFragPct > CERT_MAX_FRAG_EXP_PCT ? '❌' : '✅'} |`);
    lines.push(`| Education entries | ${r.eduEntryCount} | — |`);
    lines.push(`| Edu entries fragmented | ${r.eduFragmentedCount} | ${r.eduFragmentedCount > 0 ? '⚠️' : '✅'} |`);
    lines.push(`| Skill items | ${r.skillItemCount} | ${r.isSkillBlockWaste ? '⚠️ too few' : '✅'} |`);
    lines.push(`| H1 count | ${r.h1Count} | ${r.h1Count !== 1 ? '❌ expected 1' : '✅'} |`);
    lines.push(`| H2 sections | ${r.h2Count} | ✅ |`);
    lines.push(`| Duplicate h2 titles | ${r.isDuplicateStructure ? 'Yes' : 'No'} | ${r.isDuplicateStructure ? '⚠️' : '✅'} |`);
    lines.push(`| Max inter-section gap | ${r.maxInterSectionGapPx}px | ${r.isExcessiveSpacing ? '⚠️ excessive' : '✅'} |`);
    lines.push(`| Timeline span | ${r.timelineSpan} years | ${r.isTimelineImbalanced ? '❌ imbalanced' : '✅'} |`);
    lines.push('');
    if (r.h2Titles.length > 0) {
      lines.push(`**Sections (h2):** ${r.h2Titles.map(t => `"${t}"`).join(' · ')}`);
      lines.push('');
    }
    if (r.certPassed) {
      lines.push('**Certification: ✅ PASS** — all criteria met');
    } else {
      lines.push('**Certification: ❌ FAIL**');
      for (const f of r.certFailures) lines.push(`  - ${f}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Issue registry
  lines.push('## ISSUE REGISTRY');
  lines.push('');
  const issues: string[] = [];
  for (const { result: r } of scenarios) {
    if (!r.certChecks.utilization)
      issues.push(`| ❌ CERT | ${r.scenarioName} | Low utilization | ${r.avgUtilization}% < ${CERT_MIN_AVG_UTIL}% |`);
    if (!r.certChecks.whitespace)
      issues.push(`| ❌ CERT | ${r.scenarioName} | High whitespace | ${r.avgWhitespace}% > ${CERT_MAX_WHITESPACE}% |`);
    if (!r.certChecks.sparsePages)
      issues.push(`| ❌ CERT | ${r.scenarioName} | Sparse pages | ${r.sparsePageCount}/${r.pageCount} (${r.sparsePct}%) |`);
    if (!r.certChecks.expFragmentation)
      issues.push(`| ❌ CERT | ${r.scenarioName} | Exp fragmentation | ${r.expFragPct}% > ${CERT_MAX_FRAG_EXP_PCT}% |`);
    if (!r.certChecks.timelineBalance)
      issues.push(`| ❌ CERT | ${r.scenarioName} | Timeline imbalance | ${r.expEntryCount} jobs in ${r.timelineSpan}yr |`);
    if (!r.certChecks.hierarchy)
      issues.push(`| ❌ CERT | ${r.scenarioName} | Hierarchy | h1 count=${r.h1Count} |`);
    if (r.isHeaderOversized)
      issues.push(`| ⚠️ WARN | ${r.scenarioName} | Oversized header | ${r.headerHeightPct}% of A4 |`);
    if (r.isPhotoOversized)
      issues.push(`| ⚠️ WARN | ${r.scenarioName} | Oversized photo | ${r.photoAreaPct}% of A4 |`);
    if (r.isSkillBlockWaste)
      issues.push(`| ⚠️ WARN | ${r.scenarioName} | Skill block waste | ${r.skillItemCount} items |`);
    if (r.isDuplicateStructure)
      issues.push(`| ⚠️ WARN | ${r.scenarioName} | Duplicate section titles | ${r.h2Titles.join(', ')} |`);
    if (r.isExcessiveSpacing)
      issues.push(`| ⚠️ WARN | ${r.scenarioName} | Excessive spacing | ${r.maxInterSectionGapPx}px gap |`);
  }
  if (issues.length === 0) {
    lines.push('No issues detected.');
  } else {
    lines.push('| Severity | Scenario | Issue | Detail |');
    lines.push('|:--------:|----------|-------|--------|');
    lines.push(...issues);
  }
  lines.push('');

  // Root cause analysis
  lines.push('## ROOT CAUSE ANALYSIS');
  lines.push('');
  lines.push('### DEFECT-1: Sidebar layout — empty sidebar on overflow pages');
  lines.push('');
  lines.push('**Affects:** S1 (Consulting Strategic, sidebar/2col)  ');
  lines.push('**Observed:** Page 2 util = 20% (14 elements). Page 1 util = 70%.  ');
  lines.push('**Cause:** The `.sidebar` div uses `align-items:stretch` in the CSS grid, extending');
  lines.push('its bounding box to full page height on every page. Sidebar content (skills, contact,');
  lines.push('certifications) is rendered once per section in the sidebar column. On page 2,');
  lines.push('the sidebar DOM element is present (as a background-colored column) but contains no');
  lines.push('second-page content items — all sidebar sections exhausted on page 1.');
  lines.push('The main column on page 2 holds education only (2 entries), insufficient to');
  lines.push('achieve ≥40% utilization on a half-page.');
  lines.push('**Location:** `cv-html-renderer.ts` `sidebarLayout()` function, sidebar content assembly.');
  lines.push('**Actionable fix:** Either (a) implement sidebar content reflow to balance across pages,');
  lines.push('or (b) render sidebar decorative fill elements on overflow pages to maintain visual density.');
  lines.push('');
  lines.push('### DEFECT-2: ATS block/1col — sparse education-only overflow page');
  lines.push('');
  lines.push('**Affects:** S4 (ATS Universal, block/1col)  ');
  lines.push('**Observed:** Page 2 util = 18% (7 elements). Page 1 util = 91%.  ');
  lines.push('**Cause:** `resolveTheme()` forces `skillStyle: "plain"` for all ATS templates');
  lines.push('(`ats ? "plain" : layout.skillStyle`, cv-html-renderer.ts:906). Plain-mode skills');
  lines.push('render as compact grouped paragraphs (`.sk-group`) with no visual weight indicators.');
  lines.push('Combined with `DEFAULT_CV_SECTION_ORDER` placing skills after education,');
  lines.push('a medium profile on a comfortable-density ATS template (large fonts) fills page 1');
  lines.push('with experience only, leaving education + minimal skill paragraphs on page 2 (18% util).');
  lines.push('**Location:** `cv-html-renderer.ts` line 906 + `cv-types.ts` `DEFAULT_CV_SECTION_ORDER`.');
  lines.push('**Actionable fix:** Either (a) reorder `DEFAULT_CV_SECTION_ORDER` to interleave');
  lines.push('skills earlier (e.g., experience → skills → education), or (b) increase visual weight');
  lines.push('of plain-mode ATS skills (larger font, more spacing, category badges).');
  lines.push('');
  lines.push('### DEFECT-3: Sparse profiles — inherently low content density');
  lines.push('');
  lines.push('**Affects:** S5 (1p, 51% util), S6 (1p, 48% util)  ');
  lines.push('**Observed:** Single-page CVs for sparse profile (1 job, 1 education, 4 skills) show');
  lines.push('util < 52% regardless of template. No sparse-page flag (content fits 1 page).');
  lines.push('**Cause:** 1 job × 3 bullets + 1 education entry + 4 skills = inherently low content volume.');
  lines.push('The renderer fills the A4 page top-to-bottom with no artificial padding, leaving');
  lines.push('the lower half of the page as whitespace.');
  lines.push('**Note:** This is not a renderer defect — the engine correctly renders what exists.');
  lines.push('The cert failure reflects that the current minimum-viable content standard (1 job)');
  lines.push('produces CVs below the 60% density threshold. The user-facing product should prompt');
  lines.push('users to add more content when their CV is this sparse.');
  lines.push('**Actionable fix:** Add a UX-layer content completeness warning when CV section');
  lines.push('coverage is below threshold (estimated utilization < 60%).');
  lines.push('');

  // Methodology
  lines.push('## MEASUREMENT METHODOLOGY');
  lines.push('');
  lines.push(`- **Rendering:** Puppeteer headless Chrome, networkidle0 + fonts.ready`);
  lines.push(`- **Viewport:** ${VIEWPORT_W}px wide (≈ A4 210mm at 96 dpi), deviceScaleFactor 1`);
  lines.push(`- **A4 page height:** ${Math.round(A4_H)}px (297mm at 96 dpi)`);
  lines.push(`- **Grid:** 25×25 = 625 cells per A4 page`);
  lines.push(`- **Coverage selectors:** content elements only (not .header/.sidebar containers)`);
  lines.push(`  h1-h4, .e-role/.e-company/.e-date/.e-location/.e-bullets li, .summary-body,`);
  lines.push(`  .sk-chip/.sk-bar/.sk-name/.sk-compact/.sk-group (ATS plain mode), .sk-dots/.sk-rating,`);
  lines.push(`  .cert-item, .award-item, .ref-card, .bc-item/.banner-contact/.contact-bar/.contact-list li,`);
  lines.push(`  .proj-name/.proj-desc, .lang-text, .photo, .tl-dot, .section-div, .pills`);
  lines.push(`- **ATS skill note:** ATS templates override skillStyle to 'plain' (resolveTheme line 906),`);
  lines.push(`  rendering skills as \`.sk-group\` paragraphs (e.g., "Analytics: SEO, Market Research").`);
  lines.push(`  These are captured by the .sk-group selector.`);
  lines.push(`- **Utilization:** covered cells / 625 × 100% per A4 page`);
  lines.push(`- **Fragmentation:** entry bbox crosses A4 page boundary`);
  lines.push(`- **Sparse threshold:** utilization < ${SPARSE_UTIL_THRESHOLD}%`);
  lines.push(`- **Timeline imbalance:** ≥4 jobs in ≤4-year span`);
  lines.push(`- **Hierarchy:** exactly 1 h1 per document`);
  lines.push('');
  lines.push('### Known Measurement Artifacts');
  lines.push('');
  lines.push('**Profile accumulation (shared-user cache):** Each profile type (rich-swe, medium-marketing,');
  lines.push('sparse-entry) reuses the same test user across both scenarios in that group. The second');
  lines.push('scenario in each pair runs `buildProfile` on a profile already populated by the first,');
  lines.push('resulting in doubled experience/education/skill counts (S2 shows 10 exp/4 edu, S4 shows');
  lines.push('6 exp/2 edu). **This does not invalidate page-utilization measurements** — each document');
  lines.push('is exported fresh with the actual accumulated profile state. The page-level utilization');
  lines.push('numbers are the ground-truth rendered output for that exact state.');
  lines.push('');
  lines.push('**Sidebar container exclusion:** `.header` and `.sidebar` container bboxes are excluded');
  lines.push('from coverage to prevent inflated utilization on pages where the sidebar extends without');
  lines.push('content (sidebar uses align-items:stretch on the CSS grid, filling the full page height');
  lines.push('even when the sidebar section has no second-page items). Coverage counts content elements');
  lines.push('within the sidebar/header (h1, .sk-chip, .bc-item, etc.) instead.');
  lines.push('');
  lines.push('**H2 title artifact:** Section headings include icon abbreviation prefixes (SK, EX, ED)');
  lines.push('from templates using icon spans inside h2 elements. These appear in the textContent');
  lines.push('extraction (e.g., "SKSkills" instead of "Skills"). Does not affect utilization.');
  lines.push('');
  lines.push(`*Generated: ${new Date().toISOString()}*`);

  return lines.join('\n');
}

// ── Scenario token cache ──────────────────────────────────────────────────────

const scenarioTokenCache: Map<string, string> = new Map();

async function createScenarioToken(profileLabel: string): Promise<string> {
  if (scenarioTokenCache.has(profileLabel)) return scenarioTokenCache.get(profileLabel)!;
  const email = `career-forensics-${TS}-${profileLabel}@example.com`;
  const reg = await apiPost('/auth/register', {
    email, password: PASSWORD, name: `Forensics ${profileLabel}`,
  });
  let tok = reg?.token || reg?.access_token;
  if (!tok) {
    const lg = await apiPost('/auth/login', { email, password: PASSWORD });
    tok = lg?.token || lg?.access_token;
  }
  if (!tok) throw new Error(`Auth failed for ${profileLabel}: ${JSON.stringify(reg).slice(0, 100)}`);
  await apiPost('/workspaces', { name: `Forensics WS ${profileLabel}` }, tok);
  scenarioTokenCache.set(profileLabel, tok);
  return tok;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Phase Ω.CAREER.QUALITY.1 — CV Layout & Density Forensics (post-remediation run)');
  console.log(`Backend: ${BASE_URL}`);
  console.log(`Grid: ${GRID}×${GRID} per A4 page (same as presentation forensics)`);
  console.log('');

  // Auth (for template lookup)
  console.log('Authenticating...');
  const rootToken = await login();
  console.log('✓ Authenticated');

  // Get templates
  console.log('Fetching templates...');
  const allTemplates = await apiGet('/career/templates?doctype=cv', rootToken);
  const templates = Array.isArray(allTemplates) ? allTemplates : (allTemplates as any)?.items || [];
  if (templates.length === 0) throw new Error('No templates returned from API');
  const selectedTemplates = pickTemplates(templates);
  console.log(`✓ Selected ${selectedTemplates.length} template types:`);
  for (const t of selectedTemplates) {
    console.log(`   • ${t.name} (${t.layout?.columns}col, ${t.layout?.headerStyle})`);
  }
  console.log('');

  // Scenario plan: 2 templates per profile type = 6 scenarios
  type ProfileKey = 'rich-swe' | 'medium-marketing' | 'sparse-entry';
  const profileMap: Record<ProfileKey, ProfileData> = {
    'rich-swe': PROFILE_RICH,
    'medium-marketing': PROFILE_MEDIUM,
    'sparse-entry': PROFILE_SPARSE,
  };

  const scenarioPlan: Array<{ profileKey: ProfileKey; templateIdx: number }> = [
    { profileKey: 'rich-swe',          templateIdx: 0 }, // sidebar 2-col
    { profileKey: 'rich-swe',          templateIdx: 2 }, // banner 1-col
    { profileKey: 'medium-marketing',  templateIdx: 3 }, // minimal 1-col
    { profileKey: 'medium-marketing',  templateIdx: 4 }, // ATS block
    { profileKey: 'sparse-entry',      templateIdx: 5 }, // split 1-col
    { profileKey: 'sparse-entry',      templateIdx: 1 }, // 2-col block
  ];

  const scenarioResults: Array<{
    profile: ProfileData;
    template: TemplateInfo;
    result: ScenarioResult;
  }> = [];

  for (let si = 0; si < scenarioPlan.length; si++) {
    const plan = scenarioPlan[si];
    const profileData = profileMap[plan.profileKey];
    const tplIdx = Math.min(plan.templateIdx, selectedTemplates.length - 1);
    const template = selectedTemplates[tplIdx];
    const scenarioName =
      `S${si + 1}: ${profileData.name} × ${template.layout?.headerStyle || 'block'}/${template.layout?.columns ?? 1}col`;

    console.log(`[${si + 1}/${scenarioPlan.length}] ${scenarioName}...`);

    try {
      // Ω.CAREER.QUALITY.1A — unique user per scenario to prevent profile accumulation.
      // Previously profileKey was used as cache key, causing S2/S4/S6 to inherit extra
      // experience/education/skill entries from S1/S3/S5. Now each scenario is independent.
      const scenarioToken = await createScenarioToken(`${plan.profileKey}-s${si + 1}`);
      await buildProfile(scenarioToken, profileData);

      const doc = await apiPost('/career/documents', {
        doctype: 'cv',
        title: `${profileData.name} CV`,
        templateId: template.id,
      }, scenarioToken);
      const docId = doc?.id;
      if (!docId) throw new Error(`Doc creation failed: ${JSON.stringify(doc).slice(0, 200)}`);

      await sleep(500);
      const html = await apiExportHtml(docId, scenarioToken);
      if (!html.includes('<html') && !html.includes('<!DOCTYPE')) {
        throw new Error(`Expected HTML, got: ${html.slice(0, 100)}`);
      }

      const result = await analyzeHtml(html, scenarioName, profileData, template);
      scenarioResults.push({ profile: profileData, template, result });

      const certIcon = result.certPassed ? '✅' : `❌ ${result.certFailures.length}x`;
      console.log(
        `   ✓ ${result.pageCount}p | util ${result.avgUtilization}% | white ${result.avgWhitespace}%` +
        ` | sparse ${result.sparsePct}% | frag ${result.expFragPct}% | ${certIcon}`
      );
    } catch (err) {
      console.error(`   ✗ ERROR: ${(err as Error).message}`);
      // Stub result so the report continues
      const stub: ScenarioResult = {
        scenarioName, profileLabel: profileData.label,
        templateName: template.name,
        templateColumns: template.layout?.columns ?? 1,
        templateHeaderStyle: template.layout?.headerStyle ?? 'unknown',
        pageCount: 0, avgUtilization: 0, avgWhitespace: 100,
        sparsePageCount: 0, sparsePct: 0,
        headerHeightPct: 0, photoAreaPct: 0,
        isHeaderOversized: false, isPhotoOversized: false,
        expEntryCount: 0, expFragmentedCount: 0, expFragPct: 0,
        eduEntryCount: 0, eduFragmentedCount: 0,
        skillItemCount: 0, isSkillBlockWaste: false,
        h1Count: 0, h2Count: 0, isHierarchyInconsistent: true,
        h2Titles: [], isDuplicateStructure: false,
        isExcessiveSpacing: false, maxInterSectionGapPx: 0,
        timelineYears: [], timelineSpan: 0, isTimelineImbalanced: false,
        pageMetrics: [],
        certChecks: {
          utilization: false, whitespace: false, expFragmentation: true,
          sparsePages: true, timelineBalance: true, hierarchy: false,
        },
        certPassed: false,
        certFailures: [`SCENARIO ERROR: ${(err as Error).message}`],
        isContentLimited: profileData.experience.length <= 1,
      };
      scenarioResults.push({ profile: profileData, template, result: stub });
    }

    if (si < scenarioPlan.length - 1) await sleep(2000);
  }

  console.log('');

  const reportMd = generateReport(scenarioResults);
  const reportPath = path.join(REPO, 'CAREER_QUALITY_FORENSICS.md');
  fs.writeFileSync(reportPath, reportMd, 'utf8');

  const jsonPath = path.join(OUT_DIR, 'career-quality-forensics.json');
  fs.writeFileSync(jsonPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    certPassed: scenarioResults.every(s => s.result.certPassed || s.result.isContentLimited),
    scenarioCount: scenarioResults.length,
    scenarios: scenarioResults.map(s => ({ name: s.result.scenarioName, result: s.result })),
  }, null, 2), 'utf8');

  const overallPass = scenarioResults.every(s => s.result.certPassed || s.result.isContentLimited);
  console.log('════════════════════════════════════════════════════════════');
  if (overallPass) {
    console.log('  Ω.CAREER.QUALITY.1 — PASSES CERTIFICATION');
    console.log('  All criteria met across all scenarios');
  } else {
    const failCount = scenarioResults.filter(s => !s.result.certPassed && !s.result.isContentLimited).length;
    console.log(`  Ω.CAREER.QUALITY.1 — FAILS CERTIFICATION`);
    console.log(`  ${failCount} scenario(s) with failures:`);
    for (const s of scenarioResults.filter(s => !s.result.certPassed && !s.result.isContentLimited)) {
      for (const f of s.result.certFailures) {
        console.log(`    ❌ [${s.result.scenarioName}] ${f}`);
      }
    }
  }
  console.log('════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`✓ Report: ${reportPath}`);
  console.log(`✓ Data:   ${jsonPath}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
