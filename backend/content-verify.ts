/**
 * Content verification — checks actual text content, not just screenshot rendering
 * Uses single-paragraph inputs to expose the original mock-data bug
 */
import { designInvestorSlide } from './src/generation/presentation-designer';
import { SlideType } from './src/generation/slide-types/types';

// Realistic single-paragraph input (not the Acme AI demo with bullet lists)
const PITCHONIX_INPUT = {
  companyName: 'Pitchonix',
  shortDescription: 'AI-powered presentation builder that generates investor-ready pitch decks in minutes',
  productService: 'AI presentation platform for founders and sales teams',
  industry: 'B2B SaaS',
  country: 'US',
  businessStage: 'series-a',
  problem: 'Founders waste 40+ hours building pitch decks that investors ignore. Existing tools like PowerPoint and Canva require design skills most teams lack, and the output looks generic. The window to close a round is short and first impressions are permanent.',
  solution: 'Pitchonix takes a 10-minute brief and generates a fully-designed investor deck with real content, branded visuals, and export-ready slides. No templates to fill in, no design decisions to make.',
  traction: '$420K ARR, 850 customers, 127 NPS, 145% net dollar retention. Revenue doubling every 6 months.',
  team: 'Shadi Kamal (CEO): 8 years in B2B SaaS, previously founded and sold a workflow startup. Liam Chen (CTO): ex-Google engineer, built large-scale AI infrastructure. Nour Abbas (VP Sales): closed $60M in B2B SaaS deals.',
  fundingAsk: '$5M Seed: 50% product engineering, 30% go-to-market, 20% operations',
  differentiation: 'vs. PowerPoint: Pitchonix generates content and design together — not just a blank template. vs. Canva: 10× faster with no design work required. vs. Gamma: investor-grade quality and real data integration.',
  tone: 'professional',
  theme: 'investor-minimal',
  brandColors: { primary: '#dc2626', secondary: '#0ea5e9', accent: '#7c3aed' },
} as any;

const FAMILIES = ['crimson-dark', 'investor-minimal', 'luxury-dark', 'startup-gradient', 'midnight-tech'];
const SLIDES = [
  { type: SlideType.COVER, label: 'cover' },
  { type: SlideType.PROBLEM, label: 'problem' },
  { type: SlideType.SOLUTION, label: 'solution' },
  { type: SlideType.COMPETITION, label: 'competition' },
  { type: SlideType.TEAM, label: 'team' },
  { type: SlideType.ASK, label: 'ask' },
];

// Known bad strings that should NOT appear
const BANNED = [
  'manual classification required',
  '~6%',
  '<120/day',
  '8–15 days',
  'document processing',
  'field-level accuracy',
  'ERP connector',
  'Legacy OCR',
  'Automated extraction with 99%',
  'Multi-format ingestion',
  'accounting tool',
  'AI classification and routing engine',
];

let pass = 0;
let fail = 0;

for (const family of FAMILIES) {
  for (const s of SLIDES) {
    const elements = designInvestorSlide(PITCHONIX_INPUT, {
      type: s.type as any, order: 0, title: '', subtitle: '', content: {},
    }, family);
    if (!elements) continue;

    const allText = elements.map(el => {
      const c = el.content as any;
      const strings: string[] = [];
      if (c?.text) strings.push(c.text);
      if (c?.title) strings.push(c.title);
      if (c?.subtitle) strings.push(c.subtitle);
      if (c?.value) strings.push(c.value);
      if (c?.label) strings.push(c.label);
      if (c?.items) c.items.forEach((it: any) => { if (it?.title) strings.push(it.title); if (it?.description) strings.push(it.description); });
      if (c?.steps) c.steps.forEach((st: any) => { if (st?.title) strings.push(st.title); if (st?.description) strings.push(st.description); });
      if (c?.members) c.members.forEach((m: any) => { if (m?.name) strings.push(m.name); if (m?.role) strings.push(m.role); });
      return strings;
    }).flat().filter(Boolean).join(' | ');

    // Check for banned strings
    for (const bad of BANNED) {
      if (allText.toLowerCase().includes(bad.toLowerCase())) {
        console.log(`  ✗ FAIL [${family}/${s.label}]: found banned string "${bad}"`);
        fail++;
      }
    }

    // Check cover headline length (should never exceed 75 chars per word boundary)
    if (s.type === SlideType.COVER) {
      const headingEl = elements.find(el => el.type === 'heading');
      const headingText = (headingEl?.content as any)?.text || '';
      if (headingText.length > 80) {
        console.log(`  ✗ FAIL [${family}/cover]: headline too long (${headingText.length} chars): "${headingText}"`);
        fail++;
      } else {
        console.log(`  ✓ [${family}/cover] headline: "${headingText}" (${headingText.length} chars)`);
        pass++;
      }
    }

    // Check problem slide doesn't contain ONLY fallback content
    if (s.type === SlideType.PROBLEM) {
      const hasPitchonix = allText.toLowerCase().includes('pitchonix') || 
                           allText.toLowerCase().includes('founder') || 
                           allText.toLowerCase().includes('pitch deck') ||
                           allText.toLowerCase().includes('40+') ||
                           allText.toLowerCase().includes('powerpoint') ||
                           allText.toLowerCase().includes('design skill');
      if (!hasPitchonix) {
        console.log(`  ✗ FAIL [${family}/problem]: no real content found — all fallbacks?`);
        console.log(`     Text sample: ${allText.slice(0, 200)}`);
        fail++;
      } else {
        console.log(`  ✓ [${family}/problem] real content detected`);
        pass++;
      }
    }

    // Check competition slide headline isn't cut mid-word
    if (s.type === SlideType.COMPETITION) {
      const headingEl = elements.find(el => el.type === 'heading');
      const headingText = (headingEl?.content as any)?.text || '';
      const lastChar = headingText.slice(-1);
      const midWordCut = /[a-z]$/.test(headingText) && headingText.length >= 75;
      if (midWordCut) {
        console.log(`  ✗ FAIL [${family}/competition]: headline possibly cut mid-word: "${headingText}"`);
        fail++;
      } else {
        console.log(`  ✓ [${family}/competition] headline: "${headingText.slice(0, 80)}"`);
        pass++;
      }
    }
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`Content checks: ${pass} PASS, ${fail} FAIL`);
if (fail === 0) console.log('All content checks passed ✓');
