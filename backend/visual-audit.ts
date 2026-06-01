/**
 * Phase Ω.5 Visual Audit — generates slide screenshots for every family/slide-type
 * Run: npx ts-node -r tsconfig-paths/register visual-audit.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { designInvestorSlide } from './src/generation/presentation-designer';
import { getFamilyTokens, FamilyTokens } from './src/components/smart/family-tokens';
import { renderDeckHtml, SLIDE_VIEWPORT_WIDTH, SLIDE_VIEWPORT_HEIGHT } from './src/slide-export/element-html-renderer';
import { SlideContent } from './src/generation/slide-types/types';
import { SMART_FAMILIES, SmartFamilyId } from './src/components/smart/smart-types';
import type { SlideBackground, SlideThemeTokens } from './src/slides/element-types';
import type { RenderDeckInput } from './src/slide-export/render-types';

const OUT_DIR = path.join(process.cwd(), 'visual-audit-output');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const RICH_INPUT = {
  documentType: 'pitch_deck',
  slideCount: 10,
  contentDepth: 'detailed',
  includeCharts: true,
  includeFinancials: true,
  includeExecutiveSummary: true,
  companyName: 'Acme AI',
  shortDescription: 'AI-powered workflow automation that eliminates manual document processing',
  productService: 'AI document automation platform',
  industry: 'B2B SaaS',
  country: 'US',
  businessStage: 'series-a',
  problem: 'Finance teams spend 40% of their time on manual data entry and document reconciliation. Errors cost companies $2.3M per year on average. Existing tools require months of custom integration work.',
  solution: 'Acme AI extracts, validates, and routes financial documents automatically in seconds. 99.2% accuracy. Zero-code setup. Native integrations with 200+ accounting tools.',
  traction: '$1.8M ARR, 420 customers, 118 NPS, 140% net dollar retention. Revenue growing 92% YoY.',
  team: 'Sarah Chen (CEO): 12 years fintech, ex-Plaid product lead. Marcus Webb (CTO): ex-Google ML, 4 patents. Diana Osei (VP Sales): B2B SaaS, $80M pipeline closed.',
  fundingAsk: '$8M Series A: 45% product engineering, 35% go-to-market, 20% operations',
  roadmap: 'Q1 2024: Enterprise SSO and audit logs; Q2: REST API and webhooks platform; Q3: Mobile companion app; Q4: European data residency and expansion',
  marketOpportunity: 'TAM $62B global accounts payable automation SAM $8B mid-market US SOM $600M reachable in 3 years CAGR 24% annually',
  revenueModel: 'Per-seat SaaS subscription plus usage-based pricing for API calls. Enterprise custom contracts.',
  differentiation: 'vs. Legacy OCR: 15× faster, no custom training. vs. Manual: 99.2% accuracy vs. 94%. vs. Incumbent (Rossum): 3× cheaper, zero-code setup.',
  tone: 'professional',
  theme: 'investor-minimal',
  brandColors: { primary: '#2563eb', secondary: '#0ea5e9', accent: '#7c3aed' },
  fontStyle: 'modern',
  visualStyle: 'structured',
  includeSpeakerNotes: false,
  structured: {
    kpis: [
      { label: 'ARR', value: '$1.8M', trend: '+92%' },
      { label: 'Customers', value: '420', trend: '+68%' },
      { label: 'NPS', value: '118', trend: '+23 pts' },
      { label: 'NDR', value: '140%', trend: '+15pts' },
    ],
    teamMembers: [
      { name: 'Sarah Chen', role: 'CEO', experience: '12 years fintech, ex-Plaid product lead' },
      { name: 'Marcus Webb', role: 'CTO', experience: 'Ex-Google ML engineer, 4 patents' },
      { name: 'Diana Osei', role: 'VP Sales', experience: 'B2B SaaS, $80M pipeline closed' },
    ],
    pricingTiers: [
      { name: 'Starter', price: '$99', period: 'mo', features: ['10 seats', '500 docs/mo', 'Core AI extraction'], highlight: false },
      { name: 'Growth', price: '$349', period: 'mo', features: ['50 seats', '5,000 docs/mo', 'API access', 'Priority support'], highlight: true },
      { name: 'Enterprise', price: 'Custom', features: ['Unlimited seats', 'Custom SLA', 'SSO', 'Dedicated CSM'], highlight: false },
    ],
    roadmapPhases: [
      { phase: 'Enterprise', period: 'Q1 2024', milestones: ['SSO & audit logs', 'Role-based access'] },
      { phase: 'API Platform', period: 'Q2 2024', milestones: ['REST API', 'Webhooks', 'Partner integrations'] },
      { phase: 'Mobile', period: 'Q3 2024', milestones: ['iOS companion app', 'Push notifications'] },
      { phase: 'International', period: 'Q4 2024', milestones: ['EU data residency', 'GDPR compliance'] },
    ],
    funding: {
      amount: '$8M',
      roundType: 'Series A',
      runway: '30 mo',
      allocations: [
        { category: 'Product', percentage: 45, color: '#2563eb' },
        { category: 'Go-to-market', percentage: 35, color: '#0ea5e9' },
        { category: 'Operations', percentage: 20, color: '#7c3aed' },
      ],
    },
    marketSizing: { tam: '$62B', sam: '$8B', som: '$600M', growthRate: '24%' },
  },
} as any;

// Key slide types to test
const SLIDE_TYPES: Array<{ type: string; label: string }> = [
  { type: 'cover', label: 'cover' },
  { type: 'problem', label: 'problem' },
  { type: 'solution', label: 'solution' },
  { type: 'market_opportunity', label: 'market' },
  { type: 'business_model', label: 'business-model' },
  { type: 'traction', label: 'traction' },
  { type: 'team', label: 'team' },
  { type: 'ask', label: 'ask' },
];

// Families to test (prioritize dark families)
const FAMILIES_TO_TEST: SmartFamilyId[] = [
  'investor-minimal',     // light baseline
  'light-blue-business',  // light
  'crimson-dark',         // dark ★
  'luxury-dark',          // dark ★
  'midnight-tech',        // dark ★
  'startup-gradient',     // dark ★
  'forest-executive',     // dark ★
  'cobalt-impact',        // dark ★
  'violet-creative',      // dark ★
  'slate-pro',            // dark ★
];

function tokensToTheme(tok: FamilyTokens): SlideThemeTokens {
  return {
    accent: tok.accent,
    accent2: tok.accent2,
    text: tok.text,
    muted: tok.muted,
    background: tok.bg,
    surface: tok.surface,
    border: tok.border,
  } as any;
}

function tokensToBackground(tok: FamilyTokens): SlideBackground {
  if (tok.bg.includes('gradient')) {
    return { type: 'gradient', gradient: parseGradient(tok.bg) } as any;
  }
  return { type: 'solid', color: tok.bg };
}

function parseGradient(css: string): any {
  const stops = [];
  const re = /#[0-9a-f]{3,8}|rgba?\([^)]+\)/gi;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(css)) !== null) {
    stops.push({ color: m[0], offset: i / 2 });
    i++;
  }
  const angleM = /(\d+)deg/.exec(css);
  return { kind: 'linear', angle: angleM ? parseInt(angleM[1]) : 135, stops };
}

async function takeSlidePng(html: string, slideIndex: number): Promise<Buffer> {
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({
    headless: true,
    protocolTimeout: 120_000,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: SLIDE_VIEWPORT_WIDTH, height: SLIDE_VIEWPORT_HEIGHT });
    await page.setContent(html, { waitUntil: 'networkidle0' as any, timeout: 30_000 });
    const buf = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: slideIndex * SLIDE_VIEWPORT_HEIGHT, width: SLIDE_VIEWPORT_WIDTH, height: SLIDE_VIEWPORT_HEIGHT },
    });
    return Buffer.from(buf);
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log(`\nPhase Ω.5 Visual Audit — generating ${FAMILIES_TO_TEST.length * SLIDE_TYPES.length} screenshots...\n`);
  const results: Array<{ family: string; slide: string; file: string; ok: boolean; error?: string }> = [];

  for (const family of FAMILIES_TO_TEST) {
    const tok = getFamilyTokens(family);
    if (!tok) { console.warn(`  ⚠ no tokens for ${family}`); continue; }
    const bg = tokensToBackground(tok);
    const theme = tokensToTheme(tok);

    const slides = SLIDE_TYPES.map((st, i) => {
      const slideContent: SlideContent = {
        type: st.type as any,
        order: i,
        title: `Test ${st.label}`,
        subtitle: '',
        content: {},
      };
      const elements = designInvestorSlide(RICH_INPUT, slideContent, family) || [];
      return { index: i, total: SLIDE_TYPES.length, background: bg, themeTokens: theme, elements };
    });

    const deck: RenderDeckInput = { title: `Acme AI — ${family}`, slides };
    const html = renderDeckHtml(deck);

    for (let i = 0; i < SLIDE_TYPES.length; i++) {
      const st = SLIDE_TYPES[i];
      const fileName = `${family}__${st.label}.png`;
      const filePath = path.join(OUT_DIR, fileName);
      try {
        const buf = await takeSlidePng(html, i);
        fs.writeFileSync(filePath, buf);
        console.log(`  ✓ ${family} / ${st.label}`);
        results.push({ family, slide: st.label, file: filePath, ok: true });
      } catch (err: any) {
        console.error(`  ✗ ${family} / ${st.label}: ${err.message}`);
        results.push({ family, slide: st.label, file: filePath, ok: false, error: err.message });
      }
    }
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Screenshots: ${passed} OK, ${failed} FAILED`);
  console.log(`Output dir:  ${OUT_DIR}`);
  if (failed > 0) {
    console.log('\nFailed:');
    results.filter((r) => !r.ok).forEach((r) => console.log(`  ${r.family}/${r.slide}: ${r.error}`));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
