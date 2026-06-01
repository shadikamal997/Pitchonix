import { designInvestorSlide } from './src/generation/presentation-designer';
import { SlideType } from './src/generation/slide-types/types';
import { SMART_FAMILIES } from './src/components/smart/smart-types';

const INPUT: any = {
  companyName: 'Pitchonix',
  shortDescription: 'AI-powered presentation builder that generates investor-ready pitch decks in minutes',
  productService: 'AI pitch deck builder for B2B founders raising capital',
  industry: 'B2B SaaS',
  country: 'US',
  businessStage: 'series-a',
  problem: 'Founders waste 40+ hours building pitch decks that investors ignore. Existing tools like PowerPoint require design skills most teams lack. The window to close a round is short and first impressions are permanent.',
  solution: 'Pitchonix takes a 10-minute brief and generates a fully-designed investor deck with real content, branded visuals, and export-ready slides. No templates to fill in, no design decisions to make.',
  traction: '$420K ARR, 850 customers, 127 NPS. Revenue doubling every 6 months.',
  team: 'Shadi Kamal (CEO): 8 years in B2B SaaS, previously founded and sold a workflow startup. Liam Chen (CTO): ex-Google engineer, built large-scale AI infrastructure. Nour Abbas (VP Sales): closed $60M in B2B SaaS deals.',
  fundingAsk: '$5M Seed: 50% product engineering, 30% go-to-market, 20% operations',
  roadmap: 'Q1 2025: Launch enterprise tier and SSO. Q2 2025: REST API and partner integrations. Q3 2025: Mobile companion app.',
  marketOpportunity: 'TAM $12B global presentation software SAM $2B B2B pitch decks SOM $180M reachable in 3 years CAGR 22% annually',
  differentiation: 'vs PowerPoint: Pitchonix generates content and design together — not just a blank template. vs Canva: 10x faster with no design work. vs Gamma: investor-grade quality.',
  revenueModel: 'Per-seat SaaS subscription plus usage-based pricing for API exports. Enterprise custom contracts.',
};

const ALL_SLIDES: Array<{ type: SlideType; label: string }> = [
  { type: SlideType.COVER, label: 'cover' },
  { type: SlideType.EXECUTIVE_SUMMARY, label: 'exec-summary' },
  { type: SlideType.PROBLEM, label: 'problem' },
  { type: SlideType.SOLUTION, label: 'solution' },
  { type: SlideType.MARKET_OPPORTUNITY, label: 'market' },
  { type: SlideType.BUSINESS_MODEL, label: 'business-model' },
  { type: SlideType.TRACTION, label: 'traction' },
  { type: SlideType.TEAM, label: 'team' },
  { type: SlideType.COMPETITION, label: 'competition' },
  { type: SlideType.ROADMAP, label: 'roadmap' },
  { type: SlideType.ASK, label: 'ask' },
];

// Every string that must NEVER appear in any slide for any company
const BANNED = [
  'manual classification', '~6%', '<120/day', '8–15 days',
  'Automated extraction with 99%+', 'field-level', 'AI classification and routing',
  'Multi-format ingestion', 'Legacy OCR', '€180K', '5,000',
  'Beautiful.ai', 'Technical Lead', 'Design Advisor',
  'Template migration', 'Brand onboarding', 'Creator ecosystem',
  'Premium templates', 'Partner add-ons', 'Marketplace Revenue',
  'Component-native generation', 'visual planner', 'presentation strategist',
  'export renderer', 'presentation engine', 'Repeatable across templates',
  'No blank slides', 'Narrative and design generated',
  'brand-system rollout', 'deck production',
  'Strong workflow pain', 'Component-native architecture',
  'Export fidelity is a high bar', 'AI slide commoditization',
  'Large design platforms', 'Template marketplace',
];

// Real content that MUST appear for specific slide types
const REQUIRED: Record<string, string[]> = {
  cover: ['pitchonix'],
  problem: ['40', 'powerpoint'],
  traction: ['420', '850', '127'],
  team: ['shadi', 'liam', 'nour'],
  competition: ['powerpoint', 'canva', 'gamma'],
};

function extractText(els: any[]): string {
  return els.flatMap((el: any) => {
    const c = el.content || {};
    const parts: string[] = [];
    const addAll = (obj: any) => {
      if (!obj) return;
      if (typeof obj === 'string') parts.push(obj);
      else if (Array.isArray(obj)) obj.forEach(addAll);
      else if (typeof obj === 'object') Object.values(obj).forEach(addAll);
    };
    addAll(c);
    return parts;
  }).filter(Boolean).join(' ').toLowerCase();
}

let pass = 0, fail = 0;
const failures: string[] = [];

for (const family of SMART_FAMILIES) {
  for (const s of ALL_SLIDES) {
    const els = designInvestorSlide(INPUT, { type: s.type as any, order: 0, title: '', subtitle: '', content: {} }, family);
    if (!els) { failures.push(`NULL [${family}/${s.label}]`); fail++; continue; }
    const text = extractText(els);
    let ok = true;

    for (const bad of BANNED) {
      if (text.includes(bad.toLowerCase())) {
        failures.push(`BANNED [${family}/${s.label}]: "${bad}"`);
        fail++; ok = false;
      }
    }
    const required = REQUIRED[s.label];
    if (required) {
      const missing = required.filter(r => !text.includes(r.toLowerCase()));
      if (missing.length > 0) {
        failures.push(`MISSING [${family}/${s.label}]: ${missing.join(', ')}`);
        fail++; ok = false;
      }
    }
    if (ok) pass++;
  }
}

console.log(`\nResults: ${pass} PASS, ${fail} FAIL out of ${SMART_FAMILIES.length} families × ${ALL_SLIDES.length} slides`);
if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log('  ✗ ' + f));
} else {
  console.log('All checks passed ✓');
}
