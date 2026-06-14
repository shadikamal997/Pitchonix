/**
 * PRESENTATION_QUALITY_FORENSICS — Phase Ω.PRESENTATION.QUALITY.1
 *
 * Slide Composition & Density Forensics
 *
 * Measures slide quality from real generated decks via the API:
 *   - slides per deck, elements per slide, slide utilization, whitespace
 *   - appendix %, continuation %, chart/table/KPI/roadmap/team densities
 *   - sparse, overloaded, fragmented, duplicated, low-value, overflow detection
 *
 * Source of truth: SlideElementDTO[] from GET /slides/:id/elements
 * (these are the exact data structures the PPTX renderer consumes)
 *
 * Run:
 *   cd backend && npx ts-node -r tsconfig-paths/register scripts/presentation-quality-forensics.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.API_URL || 'http://localhost:4000/api';
const TS = Date.now();
const EMAIL = process.env.FORENSICS_EMAIL || `pres-forensics-${TS}@example.com`;
const PASSWORD = process.env.FORENSICS_PASSWORD || 'Test1234!@#';
const REPO = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(REPO, 'certification-reports');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Thresholds ────────────────────────────────────────────────────────────────

const SPARSE_UTIL_THRESHOLD = 30;       // slides below this % utilization = sparse
const OVERLOADED_UTIL_THRESHOLD = 85;   // slides above this % utilization = overloaded
const OVERLOADED_ELEMENT_THRESHOLD = 15; // slides with more elements than this = overloaded
const HEADING_ONLY_BODY_MAX = 1;        // content elements besides heading = "low-value"
const BACKGROUND_AREA_THRESHOLD = 7500; // width × height > this = background element

// Certification fail gates
const CERT_MIN_AVG_UTIL = 60;
const CERT_MAX_APPENDIX_PCT = 15;
const CERT_MAX_CONTINUATION_PCT = 10;
const CERT_MAX_SPARSE_PCT = 20;

const POLL_INTERVAL_MS = 5000;
const POLL_MAX_WAIT_MS = 300000; // 5 minutes per deck
const INTER_SCENARIO_DELAY_MS = 8000; // let backend stabilize between heavy jobs

// ── Slide scenario definitions ────────────────────────────────────────────────

interface WizardInput {
  documentType: string;
  companyName: string;
  industry: string;
  audience: string;
  tone: string;
  problem: string;
  solution: string;
  shortDescription?: string;
  businessStage?: string;
  productService?: string;
  targetCustomers?: string;
  marketOpportunity?: string;
  competitors?: string;
  differentiation?: string;
  revenueModel?: string;
  pricing?: string;
  traction?: string;
  team?: string;
  fundingAsk?: string;
  roadmap?: string;
  theme: string;
  fontStyle: string;
  visualStyle: string;
  slideCount: number;
  contentDepth: 'short' | 'balanced' | 'detailed';
  includeCharts: boolean;
  includeFinancials: boolean;
  includeSpeakerNotes: boolean;
  includeExecutiveSummary: boolean;
}

interface ScenarioConfig {
  name: string;
  label: string;
  documentType: string;
  input: WizardInput;
}

const SCENARIOS: ScenarioConfig[] = [
  {
    name: 'pitch_deck_balanced',
    label: 'Pitch Deck — Balanced — 15 slides',
    documentType: 'pitch_deck',
    input: {
      documentType: 'pitch_deck',
      companyName: 'NovaTech AI',
      industry: 'Technology / SaaS',
      audience: 'Series A investors',
      tone: 'investor-focused',
      problem: 'Enterprise teams waste 40% of their time on manual document creation and approval workflows.',
      solution: 'NovaTech AI automatically generates and distributes business documents from structured data, cutting creation time by 78%.',
      businessStage: 'seed',
      targetCustomers: 'Enterprise companies with 500+ employees in finance, legal, and consulting.',
      marketOpportunity: '$6.8B document management market, 14% CAGR. AI document automation projected to reach $3.2B by 2027.',
      competitors: 'Microsoft Office, Google Workspace, Notion',
      differentiation: 'Purpose-built for enterprise workflows with native AI, compliance guardrails, and deep ERP integrations.',
      revenueModel: '$49/seat/month teams; $89/seat/month enterprise.',
      traction: '$1.2M ARR, 47 enterprise customers, 118% NRR.',
      team: 'CEO ex-Palantir, CTO ex-Google Brain, 28-person team.',
      fundingAsk: 'Raising $8M Series A.',
      roadmap: 'Q3: SSO. Q4: Salesforce integration. Q1-2027: SOC 2 Type II.',
      theme: 'modern',
      fontStyle: 'sans-serif',
      visualStyle: 'professional',
      slideCount: 15,
      contentDepth: 'balanced',
      includeCharts: true,
      includeFinancials: true,
      includeSpeakerNotes: false,
      includeExecutiveSummary: true,
    },
  },
  {
    name: 'pitch_deck_short',
    label: 'Pitch Deck — Short — 10 slides',
    documentType: 'pitch_deck',
    input: {
      documentType: 'pitch_deck',
      companyName: 'Zipline Logistics',
      industry: 'Logistics / Supply Chain',
      audience: 'Angel investors',
      tone: 'startup',
      problem: 'Small e-commerce businesses overpay for last-mile delivery by 35-60%.',
      solution: 'Zipline aggregates merchants into a negotiating block, cutting shipping costs by 31% with AI carrier optimization.',
      businessStage: 'seed',
      targetCustomers: 'E-commerce merchants shipping 100-5,000 packages per month.',
      traction: '$240K ARR, 380 merchant customers, 22% MoM growth.',
      fundingAsk: 'Raising $2M seed.',
      theme: 'bold',
      fontStyle: 'sans-serif',
      visualStyle: 'minimalist',
      slideCount: 10,
      contentDepth: 'short',
      includeCharts: false,
      includeFinancials: false,
      includeSpeakerNotes: false,
      includeExecutiveSummary: false,
    },
  },
  {
    name: 'sales_deck_balanced',
    label: 'Sales Deck — Charts — 12 slides',
    documentType: 'pitch_deck',
    input: {
      documentType: 'pitch_deck',
      companyName: 'ClearPath Security',
      industry: 'Cybersecurity',
      audience: 'Enterprise CISOs',
      tone: 'professional',
      problem: 'Security teams face 4,500+ daily alerts but investigate only 20%, leaving breaches undetected for 197 days.',
      solution: 'ClearPath AI SOC reduces analyst workload by 73%, cutting mean time to detect from 197 days to 4 hours.',
      targetCustomers: 'Enterprises with 1,000+ employees and dedicated security teams.',
      competitors: 'Splunk SOAR, Palo Alto XSOAR, IBM QRadar',
      differentiation: 'Purpose-built for Tier 1 triage. 30-minute deployment. No playbook authoring required.',
      revenueModel: 'Enterprise SaaS: $120K–$480K/year by alert volume.',
      traction: '23 enterprise customers, $4.8M ARR, 98% renewal, SOC 2 Type II certified.',
      theme: 'corporate',
      fontStyle: 'sans-serif',
      visualStyle: 'professional',
      slideCount: 12,
      contentDepth: 'balanced',
      includeCharts: true,
      includeFinancials: false,
      includeSpeakerNotes: false,
      includeExecutiveSummary: false,
    },
  },
  {
    name: 'board_meeting_deck',
    label: 'Board Meeting — Financials — 14 slides',
    documentType: 'pitch_deck',
    input: {
      documentType: 'pitch_deck',
      companyName: 'Meridian Analytics',
      industry: 'Data Analytics / SaaS',
      audience: 'Board of directors',
      tone: 'corporate',
      problem: 'Board review of Q3 2026 financial performance, operations, product, and Q4 strategy.',
      solution: 'Q3 2026 Board Meeting — Business Review.',
      businessStage: 'growth',
      traction: 'Q3: $8.4M revenue (+24% YoY), 142 customers, NRR 121%, gross margin 74%.',
      team: 'Hired VP Sales and CRO. Headcount 187.',
      roadmap: 'Q4: Self-serve tier launch ($1.2M ARR projected), SOC 2 audit, EMEA Berlin office.',
      fundingAsk: '$3M EMEA expansion; 2027 budget $42M approval requested.',
      theme: 'corporate',
      fontStyle: 'serif',
      visualStyle: 'professional',
      slideCount: 14,
      contentDepth: 'balanced',
      includeCharts: true,
      includeFinancials: true,
      includeSpeakerNotes: false,
      includeExecutiveSummary: true,
    },
  },
  {
    name: 'product_launch_deck',
    label: 'Product Launch — Detailed — 16 slides',
    documentType: 'pitch_deck',
    input: {
      documentType: 'pitch_deck',
      companyName: 'FlowState Design',
      industry: 'Design Tools',
      audience: 'Product teams and enterprise buyers',
      tone: 'professional',
      problem: 'Design teams lose 35% of time to developer handoff: exporting assets, writing specs, answering implementation questions.',
      solution: 'FlowState Bridge generates production-ready React, Vue, and Swift components from Figma designs with AI implementation notes.',
      productService: 'FlowState Bridge v2.0 — AI component generation, design token sync, a11y audit, GitHub integration.',
      targetCustomers: 'Digital agencies and enterprise design systems teams on Figma Professional.',
      marketOpportunity: 'Design-to-code automation growing 38% annually; 14M professional Figma users.',
      competitors: 'Zeplin, Anima, Supernova',
      differentiation: 'First tool generating semantically correct, accessible, framework-specific code. AI-trained on 40M component patterns.',
      revenueModel: 'Free for solo; Pro $29/month; Enterprise $199/month.',
      traction: 'Beta: 8,400 teams, 2.3M components generated, $340K MRR.',
      roadmap: 'Launch Sept 2026. React Native Nov. Android Q1-2027. Enterprise governance Q2-2027.',
      theme: 'modern',
      fontStyle: 'sans-serif',
      visualStyle: 'creative',
      slideCount: 16,
      contentDepth: 'detailed',
      includeCharts: true,
      includeFinancials: false,
      includeSpeakerNotes: false,
      includeExecutiveSummary: false,
    },
  },
  {
    name: 'company_profile_deck',
    label: 'Company Profile — Balanced — 12 slides',
    documentType: 'pitch_deck',
    input: {
      documentType: 'pitch_deck',
      companyName: 'Verdant Infrastructure',
      industry: 'Clean Energy',
      audience: 'Enterprise clients and government stakeholders',
      tone: 'professional',
      problem: 'Municipalities cannot deploy clean energy due to high upfront capital, procurement complexity, and lack of specialized expertise.',
      solution: 'Verdant designs, builds, and operates renewable microgrids under 20-year PPAs — zero upfront cost, guaranteed carbon reduction.',
      businessStage: 'growth',
      targetCustomers: 'Municipalities, universities, hospitals, and enterprise campuses.',
      marketOpportunity: '$140B US municipal renewable infrastructure market. IRA tax credits unlock new project financing.',
      traction: '47 projects in 12 states, 340 MW installed, $2.1B pipeline.',
      team: 'CEO ex-US DOE, CFO ex-Goldman Sachs, 240-person team.',
      theme: 'professional',
      fontStyle: 'serif',
      visualStyle: 'corporate',
      slideCount: 12,
      contentDepth: 'balanced',
      includeCharts: true,
      includeFinancials: false,
      includeSpeakerNotes: false,
      includeExecutiveSummary: false,
    },
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface ElementDTO {
  id: string;
  slideId: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  visible: boolean;
  content: any;
  style?: any;
  order?: number;
}

interface SlideDTO {
  id: string;
  deckId: string;
  type: string;
  order: number;
  title?: string;
  subtitle?: string;
  content?: any;
  layoutKey?: string;
  qualityScore?: number;
  elementsVersion?: number;
}

interface SlideMetrics {
  slideId: string;
  slideType: string;
  slideTitle: string;
  order: number;
  totalElements: number;
  visibleElements: number;
  backgroundElements: number;
  contentElements: number;
  utilization: number;        // % of slide area covered by content elements
  whitespace: number;         // 100 - utilization
  isBackground: (e: ElementDTO) => boolean;
  isAppendix: boolean;
  isContinuation: boolean;
  isCover: boolean;
  isLoading: boolean;
  isSparse: boolean;          // utilization < SPARSE_UTIL_THRESHOLD
  isOverloaded: boolean;      // utilization > OVERLOADED_UTIL_THRESHOLD or too many elements
  hasHeading: boolean;
  hasBody: boolean;
  isLowValue: boolean;        // heading but no meaningful body
  chartCount: number;
  tableCount: number;
  kpiCount: number;
  roadmapCount: number;
  teamCardCount: number;
  overflowElements: number;   // elements extending beyond slide bounds
  elements: ElementDTO[];
}

interface DeckForensics {
  scenario: string;
  label: string;
  deckId: string;
  projectId: string;
  slideCount: number;
  generationMs: number;
  error?: string;
  slides: SlideMetrics[];

  // Aggregated
  avgElementsPerSlide: number;
  avgUtilization: number;
  avgWhitespace: number;
  appendixCount: number;
  appendixPct: number;
  continuationCount: number;
  continuationPct: number;
  coverCount: number;
  contentSlideCount: number;
  sparseCount: number;
  sparsePct: number;
  overloadedCount: number;
  overloadedPct: number;
  lowValueCount: number;
  chartDensity: number;
  tableDensity: number;
  kpiDensity: number;
  roadmapDensity: number;
  teamDensity: number;
  overflowSlides: number;

  // Detected issues
  issues: string[];

  // Duplicated slide patterns
  duplicatedPatterns: string[];
}

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
      const backoff = Math.min(30000, 2000 * 2 ** attempt);
      await sleep(backoff);
      continue;
    }
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON (${res.status}): ${text.slice(0, 300)}`);
    }
  }
  throw new Error('Rate limit: max retries exceeded');
}

async function apiGet(endpoint: string, token: string, retries = 3): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.status === 429 && attempt < retries) {
      const backoff = Math.min(30000, 2000 * 2 ** attempt);
      await sleep(backoff);
      continue;
    }
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON (${res.status}): ${text.slice(0, 300)}`);
    }
  }
  throw new Error('Rate limit: max retries exceeded');
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ── Auth ──────────────────────────────────────────────────────────────────────

async function login(): Promise<string> {
  const reg = await apiPost('/auth/register', { email: EMAIL, password: PASSWORD, name: 'Presentation Quality Forensics' });
  let token = reg?.token || reg?.access_token;
  if (!token) {
    const lg = await apiPost('/auth/login', { email: EMAIL, password: PASSWORD });
    token = lg?.token || lg?.access_token;
  }
  if (!token) throw new Error(`Auth failed. reg=${JSON.stringify(reg).slice(0, 200)}`);

  // Create a workspace — required for GET /decks/:id and GET /slides/:slideId/elements
  const ws = await apiPost('/workspaces', { name: 'Forensics Workspace' }, token);
  if (!ws?.id) throw new Error(`Workspace creation failed: ${JSON.stringify(ws).slice(0, 200)}`);

  return token;
}

// ── Slide area coverage calculation ──────────────────────────────────────────
// Uses a 25×25 pixel grid (625 cells) on the 100×100 coordinate space.
// Marks each cell covered by at least one content element.
// Resolution: 4% per cell — adequate for quality measurement.

function computeUtilization(elements: ElementDTO[]): number {
  const GRID = 25;
  const covered = new Uint8Array(GRID * GRID);

  for (const el of elements) {
    if (!el.visible) continue;
    if (isBackgroundElement(el)) continue;

    // Clamp to slide bounds
    const x0 = Math.max(0, el.x);
    const y0 = Math.max(0, el.y);
    const x1 = Math.min(100, el.x + el.width);
    const y1 = Math.min(100, el.y + el.height);

    if (x1 <= x0 || y1 <= y0) continue;

    // Map to grid cells
    const cx0 = Math.floor(x0 / 100 * GRID);
    const cy0 = Math.floor(y0 / 100 * GRID);
    const cx1 = Math.min(GRID, Math.ceil(x1 / 100 * GRID));
    const cy1 = Math.min(GRID, Math.ceil(y1 / 100 * GRID));

    for (let cy = cy0; cy < cy1; cy++) {
      for (let cx = cx0; cx < cx1; cx++) {
        covered[cy * GRID + cx] = 1;
      }
    }
  }

  let coveredCells = 0;
  for (let i = 0; i < GRID * GRID; i++) {
    if (covered[i]) coveredCells++;
  }

  return Math.round((coveredCells / (GRID * GRID)) * 100);
}

function isBackgroundElement(el: ElementDTO): boolean {
  // A background element spans > BACKGROUND_AREA_THRESHOLD % of slide area
  // and has a very low z-index or is a shape/image covering most of the slide.
  const area = el.width * el.height;
  if (area > BACKGROUND_AREA_THRESHOLD) return true;
  if (el.zIndex < 0) return true;
  return false;
}

function isOverflowing(el: ElementDTO): boolean {
  return (el.x + el.width) > 102 || (el.y + el.height) > 102; // 2% tolerance
}

// ── Slide type classification ─────────────────────────────────────────────────

function isAppendixSlide(slide: SlideDTO): boolean {
  const t = (slide.type || '').toLowerCase();
  const title = (slide.title || '').toLowerCase();
  return t.includes('appendix') || title.includes('appendix');
}

function isContinuationSlide(slide: SlideDTO): boolean {
  const t = (slide.type || '').toLowerCase();
  const title = (slide.title || '').toLowerCase();
  return (
    t.includes('continuation') ||
    t.includes('continued') ||
    title.includes('(continued)') ||
    title.includes('(cont.)') ||
    title.endsWith('- continued') ||
    title.endsWith('- cont') ||
    // materializePresentationOverflow produces "Title continued" or "Title continued N"
    /\bcontinued(\s+\d+)?$/.test(title)
  );
}

function isCoverSlide(slide: SlideDTO): boolean {
  const t = (slide.type || '').toLowerCase();
  return t === 'cover' || t.includes('title_slide') || t.includes('title-slide');
}

// ── Element type helpers ──────────────────────────────────────────────────────

const HEADING_TYPES = new Set(['heading', 'subheading', 'title', 'subtitle']);
const BODY_TYPES = new Set(['paragraph', 'bulletList', 'numberedList', 'list', 'quote', 'text']);
const CHART_TYPES = new Set(['chart', 'bar_chart', 'line_chart', 'pie_chart', 'scatter', 'area_chart', 'donut_chart', 'barChart', 'lineChart', 'pieChart']);
const TABLE_TYPES = new Set(['table', 'dataTable', 'comparison']);
const KPI_TYPES = new Set(['kpi', 'metric', 'stat', 'statistic', 'kpiCard', 'metricCard']);
const ROADMAP_TYPES = new Set(['roadmap', 'timeline', 'milestones', 'gantt']);
const TEAM_TYPES = new Set(['teamCard', 'team_card', 'profile', 'bio', 'teamMember']);

// ── Per-slide analysis ────────────────────────────────────────────────────────

function analyzeSlide(slide: SlideDTO, elements: ElementDTO[]): SlideMetrics {
  const visibleEls = elements.filter(e => e.visible !== false);
  const bgEls = visibleEls.filter(isBackgroundElement);
  const contentEls = visibleEls.filter(e => !isBackgroundElement(e));

  const utilization = computeUtilization(visibleEls);
  const whitespace = 100 - utilization;

  const appendix = isAppendixSlide(slide);
  const continuation = isContinuationSlide(slide);
  const cover = isCoverSlide(slide);

  const hasHeading = contentEls.some(e => HEADING_TYPES.has(e.type));
  const bodyEls = contentEls.filter(e => BODY_TYPES.has(e.type));
  const hasBody = bodyEls.length > 0;

  // Low-value: heading only or heading + 1 trivially short text element
  const isLowValue = !cover && !appendix && hasHeading && !hasBody;

  const isSparse = !cover && utilization < SPARSE_UTIL_THRESHOLD && contentEls.length < 3;
  const isOverloaded = contentEls.length > OVERLOADED_ELEMENT_THRESHOLD || utilization > OVERLOADED_UTIL_THRESHOLD;

  const chartCount = contentEls.filter(e => CHART_TYPES.has(e.type)).length;
  const tableCount = contentEls.filter(e => TABLE_TYPES.has(e.type)).length;
  const kpiCount = contentEls.filter(e => KPI_TYPES.has(e.type)).length;
  const roadmapCount = contentEls.filter(e => ROADMAP_TYPES.has(e.type)).length;
  const teamCount = contentEls.filter(e => TEAM_TYPES.has(e.type)).length;
  const overflowCount = contentEls.filter(isOverflowing).length;

  return {
    slideId: slide.id,
    slideType: slide.type || 'unknown',
    slideTitle: slide.title || '',
    order: slide.order,
    totalElements: elements.length,
    visibleElements: visibleEls.length,
    backgroundElements: bgEls.length,
    contentElements: contentEls.length,
    utilization,
    whitespace,
    isBackground: isBackgroundElement,
    isAppendix: appendix,
    isContinuation: continuation,
    isCover: cover,
    isLoading: false,
    isSparse,
    isOverloaded,
    hasHeading,
    hasBody,
    isLowValue,
    chartCount,
    tableCount,
    kpiCount,
    roadmapCount,
    teamCardCount: teamCount,
    overflowElements: overflowCount,
    elements,
  };
}

// ── Duplicate pattern detection ───────────────────────────────────────────────

function detectDuplicatedPatterns(slides: SlideMetrics[]): string[] {
  const duplicates: string[] = [];
  const seen = new Map<string, number[]>();

  for (const s of slides) {
    if (s.isCover || s.isAppendix) continue;

    // Fingerprint: slide type + element type signature
    const elSig = [...s.elements]
      .filter(e => !isBackgroundElement(e) && e.visible !== false)
      .map(e => e.type)
      .sort()
      .join(',');
    const fingerprint = `${s.slideType}|${elSig}`;

    const existing = seen.get(fingerprint) || [];
    existing.push(s.order);
    seen.set(fingerprint, existing);
  }

  for (const [fp, orders] of seen) {
    if (orders.length > 1) {
      const [type] = fp.split('|');
      duplicates.push(`Slide type "${type}" appears ${orders.length}× with identical element structure (slides ${orders.join(', ')})`);
    }
  }

  return duplicates;
}

// ── Fragmentation detection ───────────────────────────────────────────────────

function detectFragmentation(slides: SlideMetrics[]): string[] {
  const issues: string[] = [];
  for (let i = 0; i < slides.length - 1; i++) {
    const a = slides[i];
    const b = slides[i + 1];
    if (!a.slideTitle || !b.slideTitle) continue;
    const titleA = a.slideTitle.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    const titleB = b.slideTitle.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    if (titleA.length > 3 && titleA === titleB && !a.isContinuation && !b.isContinuation) {
      issues.push(`Slide fragmentation: slides ${a.order + 1} and ${b.order + 1} both titled "${a.slideTitle}" without continuation marker`);
    }
  }
  return issues;
}

// ── Per-deck generation and analysis ─────────────────────────────────────────

async function generateAndAnalyze(
  token: string,
  scenario: ScenarioConfig,
): Promise<DeckForensics> {
  const t0 = Date.now();

  const emptyResult = (error: string): DeckForensics => ({
    scenario: scenario.name,
    label: scenario.label,
    deckId: '',
    projectId: '',
    slideCount: 0,
    generationMs: Date.now() - t0,
    error,
    slides: [],
    avgElementsPerSlide: 0,
    avgUtilization: 0,
    avgWhitespace: 0,
    appendixCount: 0,
    appendixPct: 0,
    continuationCount: 0,
    continuationPct: 0,
    coverCount: 0,
    contentSlideCount: 0,
    sparseCount: 0,
    sparsePct: 0,
    overloadedCount: 0,
    overloadedPct: 0,
    lowValueCount: 0,
    chartDensity: 0,
    tableDensity: 0,
    kpiDensity: 0,
    roadmapDensity: 0,
    teamDensity: 0,
    overflowSlides: 0,
    issues: [error],
    duplicatedPatterns: [],
  });

  // 1. Create project
  let project: any;
  try {
    project = await apiPost('/projects', {
      name: `Forensics — ${scenario.label}`,
      documentType: scenario.documentType,
    }, token);
  } catch (e: any) {
    return emptyResult(`Project creation failed: ${e.message}`);
  }
  if (!project?.id) {
    return emptyResult(`Project creation: no id in response: ${JSON.stringify(project).slice(0, 200)}`);
  }
  const projectId = project.id;

  // 2. Trigger generation
  let genResp: any;
  try {
    genResp = await apiPost('/generate', {
      projectId,
      input: scenario.input,
    }, token);
  } catch (e: any) {
    return emptyResult(`Generation request failed: ${e.message}`);
  }
  if (!genResp?.deckId) {
    return emptyResult(`Generation: no deckId in response: ${JSON.stringify(genResp).slice(0, 200)}`);
  }
  const deckId = genResp.deckId;

  // 3. Poll for completion
  const deadline = Date.now() + POLL_MAX_WAIT_MS;
  let statusResp: any;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    try {
      statusResp = await apiGet(`/generate/generation-status/${deckId}`, token);
    } catch (e: any) {
      return emptyResult(`Poll failed: ${e.message}`);
    }

    const stage = (statusResp?.progress?.stage || '').toLowerCase();
    const pct = statusResp?.progress?.percentage ?? 0;
    const msg = (statusResp?.progress?.message || '').toLowerCase();
    const done =
      statusResp?.completed === true ||
      statusResp?.status === 'ready' ||
      stage === 'complete' ||
      (pct >= 100 && msg.includes('complete'));
    const failed =
      statusResp?.status === 'failed' ||
      stage === 'failed' ||
      stage === 'error';

    if (done) break;
    if (failed) {
      const errors = (statusResp?.errors || []).map((e: any) => e.error).join('; ');
      return emptyResult(`Generation failed: ${errors || 'pipeline failure'}`);
    }
    process.stdout.write('.');
  }

  const stage = (statusResp?.progress?.stage || '').toLowerCase();
  const pct = statusResp?.progress?.percentage ?? 0;
  const msg = (statusResp?.progress?.message || '').toLowerCase();
  if (
    !statusResp?.completed &&
    statusResp?.status !== 'ready' &&
    stage !== 'complete' &&
    !(pct >= 100 && msg.includes('complete'))
  ) {
    return emptyResult(`Generation timed out after ${POLL_MAX_WAIT_MS / 1000}s`);
  }
  const generationMs = Date.now() - t0;

  // 4. Fetch slides via GET /slides/deck/:deckId (no workspace guard)
  let rawSlides: SlideDTO[] = [];
  try {
    const resp = await apiGet(`/slides/deck/${deckId}`, token);
    rawSlides = Array.isArray(resp) ? resp : (resp?.slides || []);
  } catch (e: any) {
    return emptyResult(`Slides fetch failed: ${e.message}`);
  }
  if (rawSlides.length === 0) {
    // Fallback: try GET /decks/:id (requires workspace — works after workspace creation)
    try {
      const deck = await apiGet(`/decks/${deckId}`, token);
      rawSlides = deck?.slides || [];
    } catch { /* ignore */ }
  }
  if (rawSlides.length === 0) {
    // Fallback: parse slides from project endpoint
    try {
      const proj = await apiGet(`/projects/${projectId}`, token);
      const deckInProj = (proj?.decks || []).find((d: any) => d.id === deckId);
      rawSlides = deckInProj?.slides || [];
    } catch { /* ignore */ }
  }
  if (rawSlides.length === 0) {
    return emptyResult(`Deck returned 0 slides`);
  }

  // 5. Fetch elements for each slide
  const slideMetrics: SlideMetrics[] = [];
  for (const slide of rawSlides) {
    let elements: ElementDTO[] = [];
    try {
      const resp = await apiGet(`/slides/${slide.id}/elements`, token);
      elements = Array.isArray(resp) ? resp : (resp?.elements || []);
    } catch {
      // Non-fatal: analyze slide with 0 elements
    }
    slideMetrics.push(analyzeSlide(slide, elements));
  }

  // 6. Aggregate metrics
  const contentSlides = slideMetrics.filter(s => !s.isCover);
  const appendixSlides = slideMetrics.filter(s => s.isAppendix);
  const continuationSlides = slideMetrics.filter(s => s.isContinuation);
  const coverSlides = slideMetrics.filter(s => s.isCover);
  const sparseSlides = slideMetrics.filter(s => s.isSparse);
  const overloadedSlides = slideMetrics.filter(s => s.isOverloaded);
  const lowValueSlides = slideMetrics.filter(s => s.isLowValue);

  const avgElementsPerSlide = contentSlides.length > 0
    ? contentSlides.reduce((s, m) => s + m.contentElements, 0) / contentSlides.length
    : 0;

  const avgUtilization = contentSlides.length > 0
    ? contentSlides.reduce((s, m) => s + m.utilization, 0) / contentSlides.length
    : 0;

  const totalContentEls = slideMetrics.reduce((s, m) => s + m.contentElements, 0);
  const chartTotal = slideMetrics.reduce((s, m) => s + m.chartCount, 0);
  const tableTotal = slideMetrics.reduce((s, m) => s + m.tableCount, 0);
  const kpiTotal = slideMetrics.reduce((s, m) => s + m.kpiCount, 0);
  const roadmapTotal = slideMetrics.reduce((s, m) => s + m.roadmapCount, 0);
  const teamTotal = slideMetrics.reduce((s, m) => s + m.teamCardCount, 0);

  const overflowSlideCount = slideMetrics.filter(s => s.overflowElements > 0).length;

  // 7. Detect issues
  const issues: string[] = [];

  if (avgUtilization < CERT_MIN_AVG_UTIL) {
    issues.push(`❌ CERT FAIL: Avg content-slide utilization ${Math.round(avgUtilization)}% < ${CERT_MIN_AVG_UTIL}% required`);
  }

  const appendixPct = slideMetrics.length > 0 ? (appendixSlides.length / slideMetrics.length) * 100 : 0;
  if (appendixPct > CERT_MAX_APPENDIX_PCT) {
    issues.push(`❌ CERT FAIL: Appendix slides ${Math.round(appendixPct)}% > ${CERT_MAX_APPENDIX_PCT}% maximum`);
  }

  const continuationPct = slideMetrics.length > 0 ? (continuationSlides.length / slideMetrics.length) * 100 : 0;
  if (continuationPct > CERT_MAX_CONTINUATION_PCT) {
    issues.push(`❌ CERT FAIL: Continuation slides ${Math.round(continuationPct)}% > ${CERT_MAX_CONTINUATION_PCT}% maximum`);
  }

  const sparsePct = contentSlides.length > 0 ? (sparseSlides.length / contentSlides.length) * 100 : 0;
  if (sparsePct > CERT_MAX_SPARSE_PCT) {
    issues.push(`❌ CERT FAIL: Sparse slides ${Math.round(sparsePct)}% > ${CERT_MAX_SPARSE_PCT}% maximum`);
  }

  if (overflowSlideCount > 0) {
    issues.push(`❌ CERT FAIL: ${overflowSlideCount} slide(s) have overflow elements`);
  }

  if (lowValueSlides.length > 0) {
    const titles = lowValueSlides.slice(0, 3).map(s => `"${s.slideTitle || s.slideType}"`).join(', ');
    issues.push(`⚠️ Low-value slides (heading with no body): ${lowValueSlides.length} — ${titles}${lowValueSlides.length > 3 ? '...' : ''}`);
  }

  const fragIssues = detectFragmentation(slideMetrics);
  issues.push(...fragIssues.map(i => `⚠️ ${i}`));

  const duplicatedPatterns = detectDuplicatedPatterns(slideMetrics);
  if (duplicatedPatterns.length > 0) {
    issues.push(`❌ CERT FAIL: Duplicated slide structures detected`);
  }

  return {
    scenario: scenario.name,
    label: scenario.label,
    deckId,
    projectId,
    slideCount: slideMetrics.length,
    generationMs,
    slides: slideMetrics,
    avgElementsPerSlide: Math.round(avgElementsPerSlide * 10) / 10,
    avgUtilization: Math.round(avgUtilization),
    avgWhitespace: Math.round(100 - avgUtilization),
    appendixCount: appendixSlides.length,
    appendixPct: Math.round(appendixPct),
    continuationCount: continuationSlides.length,
    continuationPct: Math.round(continuationPct),
    coverCount: coverSlides.length,
    contentSlideCount: contentSlides.length,
    sparseCount: sparseSlides.length,
    sparsePct: Math.round(sparsePct),
    overloadedCount: overloadedSlides.length,
    overloadedPct: contentSlides.length > 0 ? Math.round((overloadedSlides.length / contentSlides.length) * 100) : 0,
    lowValueCount: lowValueSlides.length,
    chartDensity: totalContentEls > 0 ? Math.round((chartTotal / totalContentEls) * 100) : 0,
    tableDensity: totalContentEls > 0 ? Math.round((tableTotal / totalContentEls) * 100) : 0,
    kpiDensity: totalContentEls > 0 ? Math.round((kpiTotal / totalContentEls) * 100) : 0,
    roadmapDensity: totalContentEls > 0 ? Math.round((roadmapTotal / totalContentEls) * 100) : 0,
    teamDensity: totalContentEls > 0 ? Math.round((teamTotal / totalContentEls) * 100) : 0,
    overflowSlides: overflowSlideCount,
    issues,
    duplicatedPatterns,
  };
}

// ── Report generation ─────────────────────────────────────────────────────────

function buildReport(results: DeckForensics[], runMs: number): string {
  const successful = results.filter(r => !r.error);
  const failed = results.filter(r => r.error);

  // Cross-scenario aggregates
  const totalSlides = successful.reduce((s, r) => s + r.slideCount, 0);
  const grandAvgUtil = successful.length > 0
    ? Math.round(successful.reduce((s, r) => s + r.avgUtilization, 0) / successful.length)
    : 0;
  const grandAvgEls = successful.length > 0
    ? Math.round(successful.reduce((s, r) => s + r.avgElementsPerSlide, 0) / successful.length * 10) / 10
    : 0;
  const grandAppendixPct = successful.length > 0
    ? Math.round(successful.reduce((s, r) => s + r.appendixPct, 0) / successful.length)
    : 0;
  const grandContinuationPct = successful.length > 0
    ? Math.round(successful.reduce((s, r) => s + r.continuationPct, 0) / successful.length)
    : 0;
  const grandSparsePct = successful.length > 0
    ? Math.round(successful.reduce((s, r) => s + r.sparsePct, 0) / successful.length)
    : 0;
  const totalOverflowSlides = successful.reduce((s, r) => s + r.overflowSlides, 0);
  const totalDuplicates = successful.reduce((s, r) => s + r.duplicatedPatterns.length, 0);

  // Certification verdict
  const certFails: string[] = [];
  if (grandAvgUtil < CERT_MIN_AVG_UTIL) {
    certFails.push(`Average slide utilization ${grandAvgUtil}% < ${CERT_MIN_AVG_UTIL}% required`);
  }
  if (grandAppendixPct > CERT_MAX_APPENDIX_PCT) {
    certFails.push(`Appendix slides ${grandAppendixPct}% > ${CERT_MAX_APPENDIX_PCT}% maximum`);
  }
  if (grandContinuationPct > CERT_MAX_CONTINUATION_PCT) {
    certFails.push(`Continuation slides ${grandContinuationPct}% > ${CERT_MAX_CONTINUATION_PCT}% maximum`);
  }
  if (grandSparsePct > CERT_MAX_SPARSE_PCT) {
    certFails.push(`Sparse slides ${grandSparsePct}% > ${CERT_MAX_SPARSE_PCT}% maximum`);
  }
  if (totalOverflowSlides > 0) {
    certFails.push(`${totalOverflowSlides} overflow slide(s) detected`);
  }
  if (totalDuplicates > 0) {
    certFails.push(`${totalDuplicates} duplicated slide structure(s) detected`);
  }
  if (failed.length > 0) {
    certFails.push(`${failed.length} of ${results.length} scenarios failed to generate (cannot certify)`);
  }

  const certPass = certFails.length === 0;

  const lines: string[] = [];

  lines.push(`# PRESENTATION_QUALITY_FORENSICS`);
  lines.push(`## Phase Ω.PRESENTATION.QUALITY.1 — Slide Composition & Density Forensics`);
  lines.push(``);
  lines.push(`**Audit Date:** ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`**Auditor:** Automated forensics harness`);
  lines.push(`**Source of truth:** SlideElementDTO[] from GET /slides/:id/elements (data consumed by PPTX renderer)`);
  lines.push(`**Decks generated:** ${results.length} | **Successful:** ${successful.length} | **Failed:** ${failed.length}`);
  lines.push(`**Total slides analyzed:** ${totalSlides}`);
  lines.push(`**Run time:** ${Math.round(runMs / 1000)}s`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## CERTIFICATION VERDICT`);
  lines.push(``);
  lines.push(`\`\`\``);
  if (certPass) {
    lines.push(`╔══════════════════════════════════════════════════════════════════╗`);
    lines.push(`║  Ω.PRESENTATION.QUALITY.1 — PASSES CERTIFICATION                 ║`);
    lines.push(`║                                                                  ║`);
    lines.push(`║  All 6 hard criteria met across ${successful.length} deck scenarios              ║`);
    lines.push(`╚══════════════════════════════════════════════════════════════════╝`);
  } else {
    lines.push(`╔══════════════════════════════════════════════════════════════════╗`);
    lines.push(`║  Ω.PRESENTATION.QUALITY.1 — FAILS CERTIFICATION                  ║`);
    lines.push(`║                                                                  ║`);
    lines.push(`║  ${certFails.length} hard criterion/criteria not met across ${successful.length} deck scenarios    ║`);
    lines.push(`╚══════════════════════════════════════════════════════════════════╝`);
  }
  lines.push(`\`\`\``);
  lines.push(``);

  if (!certPass) {
    lines.push(`**Failing criteria:**`);
    for (const f of certFails) {
      lines.push(`❌ ${f}`);
    }
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(``);
  lines.push(`## SUMMARY METRICS — ALL SCENARIOS`);
  lines.push(``);
  lines.push(`| Metric | Result | Threshold | Status |`);
  lines.push(`|--------|:------:|----------:|:------:|`);
  lines.push(`| Avg slide utilization | ${grandAvgUtil}% | ≥ ${CERT_MIN_AVG_UTIL}% | ${grandAvgUtil >= CERT_MIN_AVG_UTIL ? '✅ PASS' : '❌ FAIL'} |`);
  lines.push(`| Avg whitespace | ${100 - grandAvgUtil}% | ≤ ${100 - CERT_MIN_AVG_UTIL}% | ${100 - grandAvgUtil <= 100 - CERT_MIN_AVG_UTIL ? '✅ PASS' : '❌ FAIL'} |`);
  lines.push(`| Avg elements/slide | ${grandAvgEls} | — | ℹ️ |`);
  lines.push(`| Appendix slides | ${grandAppendixPct}% | ≤ ${CERT_MAX_APPENDIX_PCT}% | ${grandAppendixPct <= CERT_MAX_APPENDIX_PCT ? '✅ PASS' : '❌ FAIL'} |`);
  lines.push(`| Continuation slides | ${grandContinuationPct}% | ≤ ${CERT_MAX_CONTINUATION_PCT}% | ${grandContinuationPct <= CERT_MAX_CONTINUATION_PCT ? '✅ PASS' : '❌ FAIL'} |`);
  lines.push(`| Sparse slides | ${grandSparsePct}% | ≤ ${CERT_MAX_SPARSE_PCT}% | ${grandSparsePct <= CERT_MAX_SPARSE_PCT ? '✅ PASS' : '❌ FAIL'} |`);
  lines.push(`| Overflow slides | ${totalOverflowSlides} | 0 | ${totalOverflowSlides === 0 ? '✅ PASS' : '❌ FAIL'} |`);
  lines.push(`| Duplicated slide structures | ${totalDuplicates} | 0 | ${totalDuplicates === 0 ? '✅ PASS' : '❌ FAIL'} |`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## PER-SCENARIO RESULTS`);
  lines.push(``);
  lines.push(`| Scenario | Slides | Avg Util | Avg Els/Slide | Sparse | Appndx | Continu | Overflow | Low-Value |`);
  lines.push(`|----------|:------:|:--------:|:------------:|:------:|:------:|:-------:|:--------:|:---------:|`);

  for (const r of successful) {
    lines.push(`| ${r.label} | ${r.slideCount} | ${r.avgUtilization}% | ${r.avgElementsPerSlide} | ${r.sparsePct}% | ${r.appendixPct}% | ${r.continuationPct}% | ${r.overflowSlides} | ${r.lowValueCount} |`);
  }
  for (const r of failed) {
    lines.push(`| ${r.label} | — | — | — | — | — | — | — | — |`);
  }
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## ELEMENT DENSITY — PER SCENARIO`);
  lines.push(``);
  lines.push(`Chart density = chart elements / total content elements × 100%`);
  lines.push(``);
  lines.push(`| Scenario | Chart | Table | KPI | Roadmap | Team |`);
  lines.push(`|----------|:-----:|:-----:|:---:|:-------:|:----:|`);
  for (const r of successful) {
    lines.push(`| ${r.label} | ${r.chartDensity}% | ${r.tableDensity}% | ${r.kpiDensity}% | ${r.roadmapDensity}% | ${r.teamDensity}% |`);
  }
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## DETECTED ISSUES — PER SCENARIO`);
  lines.push(``);

  let totalIssueCount = 0;
  for (const r of successful) {
    const certIssues = r.issues.filter(i => i.startsWith('❌'));
    const warnIssues = r.issues.filter(i => i.startsWith('⚠️'));
    const allIssues = [...certIssues, ...warnIssues, ...r.duplicatedPatterns.map(d => `❌ DUPLICATED: ${d}`)];
    totalIssueCount += allIssues.length;

    lines.push(`### ${r.label}`);
    lines.push(``);
    if (allIssues.length === 0) {
      lines.push(`✅ No issues detected`);
    } else {
      for (const issue of allIssues) {
        lines.push(`- ${issue}`);
      }
    }
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(``);
  lines.push(`## SLIDE-BY-SLIDE BREAKDOWN (SPARSE AND OVERLOADED)`);
  lines.push(``);

  for (const r of successful) {
    const problem = r.slides.filter(s => s.isSparse || s.isOverloaded || s.isLowValue || s.overflowElements > 0);
    if (problem.length === 0) continue;

    lines.push(`### ${r.label}`);
    lines.push(``);
    lines.push(`| Slide | Type | Title | Util | Els | Sparse | Overld | LowVal | Overflow |`);
    lines.push(`|-------|------|-------|:----:|:---:|:------:|:------:|:------:|:--------:|`);
    for (const s of problem) {
      const flags = [
        s.isSparse ? 'SPARSE' : '',
        s.isOverloaded ? 'OVER' : '',
        s.isLowValue ? 'LV' : '',
        s.overflowElements > 0 ? `OVF(${s.overflowElements})` : '',
      ].filter(Boolean).join(' ');
      lines.push(`| ${s.order + 1} | ${s.slideType} | ${(s.slideTitle || '').slice(0, 25)} | ${s.utilization}% | ${s.contentElements} | ${s.isSparse ? '✗' : ''} | ${s.isOverloaded ? '✗' : ''} | ${s.isLowValue ? '✗' : ''} | ${s.overflowElements > 0 ? s.overflowElements : ''} |`);
    }
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(``);
  lines.push(`## METHODOLOGY`);
  lines.push(``);
  lines.push(`**Slide utilization measurement:**`);
  lines.push(`Elements use a percentage coordinate system (x, y, width, height all in 0–100). A 25×25 grid (625 cells) maps the slide canvas. Each cell is marked "covered" if any visible, non-background element overlaps it. Utilization = covered cells / 625. Background detection: elements spanning > ${BACKGROUND_AREA_THRESHOLD} units² of slide area (> ${Math.round(BACKGROUND_AREA_THRESHOLD / 100)}%) are classified as backgrounds and excluded from utilization.`);
  lines.push(``);
  lines.push(`**Sparse slide:** utilization < ${SPARSE_UTIL_THRESHOLD}% AND content elements < 3. Cover slides excluded.`);
  lines.push(``);
  lines.push(`**Overloaded slide:** > ${OVERLOADED_ELEMENT_THRESHOLD} content elements OR utilization > ${OVERLOADED_UTIL_THRESHOLD}%.`);
  lines.push(``);
  lines.push(`**Low-value slide:** Has heading element but no paragraph/list body content. Covers and appendix slides excluded.`);
  lines.push(``);
  lines.push(`**Continuation slide:** slide.type contains 'continuation'/'continued', or title contains '(continued)' or '(cont.)'.`);
  lines.push(``);
  lines.push(`**Appendix slide:** slide.type contains 'appendix' or title contains 'Appendix'.`);
  lines.push(``);
  lines.push(`**Overflow element:** x + width > 102% or y + height > 102% (2% tolerance for floating-point rounding).`);
  lines.push(``);
  lines.push(`**Duplicated pattern:** Two or more non-cover, non-appendix slides of the same type with identical element type signatures.`);
  lines.push(``);
  lines.push(`**Element type classification:**`);
  lines.push(`- Heading types: ${[...HEADING_TYPES].join(', ')}`);
  lines.push(`- Body types: ${[...BODY_TYPES].join(', ')}`);
  lines.push(`- Chart types: ${[...CHART_TYPES].join(', ')}`);
  lines.push(`- Table types: ${[...TABLE_TYPES].join(', ')}`);
  lines.push(`- KPI types: ${[...KPI_TYPES].join(', ')}`);
  lines.push(`- Roadmap types: ${[...ROADMAP_TYPES].join(', ')}`);
  lines.push(`- Team card types: ${[...TEAM_TYPES].join(', ')}`);
  lines.push(``);
  lines.push(`**Source of truth note:** The PPTX export renderer consumes SlideElementDTO[] directly from the database — the same data fetched by this harness. Element positions and dimensions in the database ARE the rendered positions. This harness measures the same data the renderer uses.`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## GENERATION ERRORS`);
  lines.push(``);
  if (failed.length === 0) {
    lines.push(`✅ No generation errors. All ${results.length} scenarios generated successfully.`);
  } else {
    for (const r of failed) {
      lines.push(`- **${r.label}:** ${r.error}`);
    }
  }
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`*Certification date: ${new Date().toISOString().slice(0, 10)}*`);
  lines.push(`*Source of truth: SlideElementDTO[] from GET /slides/:id/elements via real API. No estimation. No inference. Measured element positions are the source of truth.*`);

  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Phase Ω.PRESENTATION.QUALITY.1 — Slide Composition & Density Forensics`);
  console.log(`Backend: ${BASE_URL}`);
  console.log(`Scenarios: ${SCENARIOS.length}`);
  console.log(`Authenticating as ${EMAIL}...`);

  const t0 = Date.now();

  let token: string;
  try {
    token = await login();
    console.log(`✓ Authenticated`);
  } catch (e: any) {
    console.error(`Authentication failed: ${e.message}`);
    process.exit(1);
  }

  const results: DeckForensics[] = [];
  let done = 0;

  for (const scenario of SCENARIOS) {
    done++;
    process.stdout.write(`[${done}/${SCENARIOS.length}] ${scenario.label}... `);

    const result = await generateAndAnalyze(token, scenario);
    results.push(result);

    if (result.error) {
      console.log(`✗ ERROR: ${result.error.slice(0, 100)}`);
    } else {
      const certIssues = result.issues.filter(i => i.startsWith('❌')).length;
      const warnIssues = result.issues.filter(i => i.startsWith('⚠️')).length;
      const status = certIssues > 0 ? `❌ ${certIssues} fail(s)` : warnIssues > 0 ? `⚠️ ${warnIssues} warning(s)` : `✅ PASS`;
      console.log(`✓ ${result.slideCount} slides | util ${result.avgUtilization}% | ${status}`);
    }

    if (done < SCENARIOS.length) {
      await sleep(INTER_SCENARIO_DELAY_MS);
    }
  }

  const runMs = Date.now() - t0;
  console.log(`\nCompleted in ${Math.round(runMs / 1000)}s`);

  // Write report
  const report = buildReport(results, runMs);
  const reportPath = path.join(REPO, 'PRESENTATION_QUALITY_FORENSICS.md');
  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`✓ Report: ${reportPath}`);

  // Write JSON data
  const jsonPath = path.join(OUT_DIR, 'presentation-quality-forensics.json');
  const jsonData = {
    generatedAt: new Date().toISOString(),
    runMs,
    scenarios: results.map(r => ({
      scenario: r.scenario,
      label: r.label,
      deckId: r.deckId,
      projectId: r.projectId,
      slideCount: r.slideCount,
      generationMs: r.generationMs,
      error: r.error,
      avgElementsPerSlide: r.avgElementsPerSlide,
      avgUtilization: r.avgUtilization,
      avgWhitespace: r.avgWhitespace,
      appendixPct: r.appendixPct,
      continuationPct: r.continuationPct,
      sparsePct: r.sparsePct,
      overflowSlides: r.overflowSlides,
      issues: r.issues,
      duplicatedPatterns: r.duplicatedPatterns,
      slides: r.slides.map(s => ({
        order: s.order,
        type: s.slideType,
        title: s.slideTitle,
        contentElements: s.contentElements,
        utilization: s.utilization,
        isSparse: s.isSparse,
        isOverloaded: s.isOverloaded,
        isLowValue: s.isLowValue,
        isContinuation: s.isContinuation,
        isAppendix: s.isAppendix,
        chartCount: s.chartCount,
        tableCount: s.tableCount,
        kpiCount: s.kpiCount,
        roadmapCount: s.roadmapCount,
        teamCardCount: s.teamCardCount,
        overflowElements: s.overflowElements,
      })),
    })),
  };
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf8');
  console.log(`✓ Data:   ${jsonPath}`);

  // Print cert summary
  const errorScenarios = results.filter(r => r.error);
  const certFails = [
    ...results.flatMap(r => r.issues.filter(i => i.startsWith('❌'))),
    ...errorScenarios.map(r => `❌ SCENARIO ERROR: ${r.label} — ${r.error}`),
  ];
  console.log(`\n${'═'.repeat(60)}`);
  if (certFails.length === 0) {
    console.log(`  Ω.PRESENTATION.QUALITY.1 — PASSES CERTIFICATION`);
  } else {
    console.log(`  Ω.PRESENTATION.QUALITY.1 — FAILS CERTIFICATION`);
    console.log(`  ${certFails.length} failure(s):`);
    for (const f of certFails.slice(0, 10)) {
      console.log(`    ${f}`);
    }
  }
  console.log(`${'═'.repeat(60)}`);
}

main().catch(e => {
  console.error(`Fatal: ${e.message}`);
  process.exit(1);
});
