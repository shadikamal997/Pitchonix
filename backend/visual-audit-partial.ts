/**
 * Partial re-audit for families that were just fixed
 */
import * as fs from 'fs';
import * as path from 'path';
import { designInvestorSlide } from './src/generation/presentation-designer';
import { getFamilyTokens, FamilyTokens } from './src/components/smart/family-tokens';
import { renderDeckHtml, SLIDE_VIEWPORT_WIDTH, SLIDE_VIEWPORT_HEIGHT } from './src/slide-export/element-html-renderer';
import type { SlideBackground, SlideThemeTokens } from './src/slides/element-types';
import type { RenderDeckInput } from './src/slide-export/render-types';

const OUT_DIR = path.join(process.cwd(), 'visual-audit-output');

const RICH_INPUT = {
  documentType: 'pitch_deck', slideCount: 10, contentDepth: 'detailed',
  includeCharts: true, includeFinancials: true, includeExecutiveSummary: true,
  companyName: 'Acme AI',
  shortDescription: 'AI-powered workflow automation that eliminates manual document processing',
  productService: 'AI document automation platform', industry: 'B2B SaaS', country: 'US', businessStage: 'series-a',
  problem: 'Finance teams spend 40% of their time on manual data entry and document reconciliation. Errors cost companies $2.3M per year on average. Existing tools require months of custom integration work.',
  solution: 'Acme AI extracts, validates, and routes financial documents automatically in seconds. 99.2% accuracy. Zero-code setup. Native integrations with 200+ accounting tools.',
  traction: '$1.8M ARR, 420 customers, 118 NPS, 140% net dollar retention. Revenue growing 92% YoY.',
  team: 'Sarah Chen (CEO): 12 years fintech, ex-Plaid product lead. Marcus Webb (CTO): ex-Google ML, 4 patents. Diana Osei (VP Sales): B2B SaaS, $80M pipeline closed.',
  fundingAsk: '$8M Series A: 45% product engineering, 35% go-to-market, 20% operations',
  roadmap: 'Q1 2024: Enterprise SSO and audit logs; Q2: REST API and webhooks platform; Q3: Mobile companion app; Q4: European data residency and expansion',
  marketOpportunity: 'TAM $62B global accounts payable automation SAM $8B mid-market US SOM $600M reachable in 3 years CAGR 24% annually',
  revenueModel: 'Per-seat SaaS subscription plus usage-based pricing for API calls. Enterprise custom contracts.',
  differentiation: 'vs. Legacy OCR: 15× faster, no custom training. vs. Manual: 99.2% accuracy vs. 94%. vs. Incumbent (Rossum): 3× cheaper, zero-code setup.',
  tone: 'professional', theme: 'investor-minimal',
  brandColors: { primary: '#2563eb', secondary: '#0ea5e9', accent: '#7c3aed' },
  fontStyle: 'modern', visualStyle: 'structured', includeSpeakerNotes: false,
  structured: {
    kpis: [
      { label: 'ARR', value: '$1.8M', trend: '+92%' }, { label: 'Customers', value: '420', trend: '+68%' },
      { label: 'NPS', value: '118', trend: '+23 pts' }, { label: 'NDR', value: '140%', trend: '+15pts' },
    ],
    teamMembers: [
      { name: 'Sarah Chen', role: 'CEO', experience: '12 years fintech, ex-Plaid product lead' },
      { name: 'Marcus Webb', role: 'CTO', experience: 'Ex-Google ML engineer, 4 patents' },
      { name: 'Diana Osei', role: 'VP Sales', experience: 'B2B SaaS, $80M pipeline closed' },
    ],
    funding: {
      amount: '$8M', roundType: 'Series A', runway: '30 mo',
      allocations: [
        { category: 'Product', percentage: 45, color: '#2563eb' },
        { category: 'Go-to-market', percentage: 35, color: '#0ea5e9' },
        { category: 'Operations', percentage: 20, color: '#7c3aed' },
      ],
    },
    marketSizing: { tam: '$62B', sam: '$8B', som: '$600M', growthRate: '24%' },
  },
} as any;

const SLIDE_TYPES = [
  { type: 'problem', label: 'problem' },
  { type: 'solution', label: 'solution' },
  { type: 'team', label: 'team' },
  { type: 'ask', label: 'ask' },
];
import type { SmartFamilyId } from './src/components/smart/smart-types';
const FAMILIES: SmartFamilyId[] = ['luxury-dark', 'startup-gradient', 'midnight-tech', 'crimson-dark'];

function tokensToTheme(tok: FamilyTokens): SlideThemeTokens {
  return { accent: tok.accent, accent2: tok.accent2, text: tok.text, muted: tok.muted, background: tok.bg, surface: tok.surface, border: tok.border } as any;
}

function tokensToBackground(tok: FamilyTokens): SlideBackground {
  if (tok.bg.includes('gradient')) {
    return { type: 'gradient', gradient: { kind: 'linear', angle: 135, stops: [{ color: '#1a1a2e', offset: 0 }, { color: '#16213e', offset: 1 }] } } as any;
  }
  return { type: 'solid', color: tok.bg };
}

async function takeSlidePng(html: string, slideIndex: number): Promise<Buffer> {
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({
    headless: true, protocolTimeout: 120000,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: SLIDE_VIEWPORT_WIDTH, height: SLIDE_VIEWPORT_HEIGHT });
    await page.setContent(html, { waitUntil: 'networkidle0' as any, timeout: 30000 });
    const buf = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: slideIndex * SLIDE_VIEWPORT_HEIGHT, width: SLIDE_VIEWPORT_WIDTH, height: SLIDE_VIEWPORT_HEIGHT },
    });
    return Buffer.from(buf);
  } finally { await browser.close(); }
}

async function main() {
  console.log(`\nPartial visual audit — ${FAMILIES.length} families × ${SLIDE_TYPES.length} slides\n`);
  for (const family of FAMILIES) {
    const tok = getFamilyTokens(family)!;
    const bg = tokensToBackground(tok);
    const theme = tokensToTheme(tok);
    const slides = SLIDE_TYPES.map((st, i) => {
      const elements = designInvestorSlide(RICH_INPUT, { type: st.type as any, order: i, title: `Test ${st.label}`, subtitle: '', content: {} }, family) || [];
      return { index: i, total: SLIDE_TYPES.length, background: bg, themeTokens: theme, elements };
    });
    const html = renderDeckHtml({ title: family, slides });
    for (let i = 0; i < SLIDE_TYPES.length; i++) {
      const st = SLIDE_TYPES[i];
      const filePath = path.join(OUT_DIR, `${family}__${st.label}.png`);
      const buf = await takeSlidePng(html, i);
      fs.writeFileSync(filePath, buf);
      console.log(`  ✓ ${family} / ${st.label}`);
    }
  }
  console.log('\nDone — 16 slides updated');
}
main().catch(e => { console.error(e); process.exit(1); });
