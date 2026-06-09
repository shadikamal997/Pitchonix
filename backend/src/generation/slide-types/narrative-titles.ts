// =============================================================================
//  Narrative Title Engine — Phase 2
//
//  Replaces hardcoded category labels ("The Problem", "Our Solution", etc.)
//  with conclusion-driven titles extracted directly from wizard input.
//
//  Rule: every slide title must be the ANSWER, not the category.
//  McKinsey Pyramid Principle — each title states a specific conclusion so
//  a reader who only reads titles gets the full investment thesis.
//
//  All functions are pure (no side effects, no I/O) and safe to call with
//  partial / undefined input — they never throw.
// =============================================================================

import type { WizardInput } from './types';

// ---------------------------------------------------------------------------
//  String utilities
// ---------------------------------------------------------------------------

/** Extract first sentence up to `max` characters, stopping at punctuation. */
function firstSentence(text: string | undefined, max = 80): string {
  if (!text?.trim()) return '';
  const clean = text.trim().replace(/\s+/g, ' ');
  const boundary = clean.search(/[.!?\n]/);
  const raw = boundary > 4 && boundary <= max ? clean.slice(0, boundary) : clean.slice(0, max);
  return raw.replace(/[,;:]+$/, '').trim();
}

/** Extract first comma/dash phrase up to `max` characters. */
function firstPhrase(text: string | undefined, max = 70): string {
  if (!text?.trim()) return '';
  const clean = text.trim().replace(/\s+/g, ' ');
  const boundary = clean.search(/[,;.\n]/);
  const raw = boundary > 4 && boundary <= max ? clean.slice(0, boundary) : clean.slice(0, max);
  return raw.replace(/[,;:]+$/, '').trim();
}

/** Title-case a string. */
function tc(s: string): string {
  const SMALL = new Set([
    'a',
    'an',
    'the',
    'and',
    'but',
    'or',
    'for',
    'nor',
    'on',
    'at',
    'to',
    'by',
    'in',
    'of',
    'up',
    'as',
    'is',
  ]);
  return s.replace(/\b\w+/g, (w, i) =>
    i > 0 && SMALL.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1),
  );
}

/** Extract the first dollar/percent/number from text. */
function firstNum(text: string | undefined): string | null {
  if (!text) return null;
  const m = text.match(
    /\$[\d,.]+\s*[BbMmKkTt]?\s*(?:billion|million|trillion|thousand)?|\d+[\d,.]*\s*[BbMmKkTt](?:illion|illion|rillion|housand)?|(?:\d+)%/,
  );
  return m ? m[0].trim() : null;
}

/** Detect revenue model type from free-form text. */
function revenueModelType(text: string | undefined): string {
  if (!text) return '';
  const t = text.toLowerCase();
  if (t.match(/\bsaas\b/)) return 'SaaS';
  if (t.match(/subscription/)) return 'Subscription';
  if (t.match(/marketplace|commission/)) return 'Marketplace';
  if (t.match(/freemium/)) return 'Freemium';
  if (t.match(/enterprise.*licen|licen.*enterprise/)) return 'Enterprise License';
  if (t.match(/usage.based|pay.per/)) return 'Usage-Based';
  if (t.match(/transaction fee|per.*transaction/)) return 'Transaction Fee';
  if (t.match(/advert|media/)) return 'Advertising';
  if (t.match(/service|consulting/)) return 'Services';
  if (t.match(/one.time|perpetual/)) return 'One-Time License';
  return '';
}

/** Cap a string to `max` chars, preserving word boundaries. */
function cap(text: string, max: number): string {
  if (text.length <= max) return text;
  const trimmed = text.slice(0, max);
  const lastSpace = trimmed.lastIndexOf(' ');
  return lastSpace > max * 0.6 ? trimmed.slice(0, lastSpace) : trimmed;
}

// ---------------------------------------------------------------------------
//  Per-slide title + subtitle derivation
// ---------------------------------------------------------------------------

export function coverSubtitle(input: WizardInput): string {
  const s = input.shortDescription || input.productService;
  if (s) return cap(firstPhrase(s, 80) || s, 80);
  if (input.industry) return `Transforming ${input.industry}`;
  return 'Building the Future';
}

// ---------------------------------------------------------------------------
//  Problem
// ---------------------------------------------------------------------------

export function problemTitle(input: WizardInput): string {
  const text = input.problem;
  if (!text?.trim()) return `${input.industry || 'The'} Problem`;
  // Prefer a phrase that contains a number (most compelling)
  const num = firstNum(text);
  if (num) {
    const numIdx =
      text.indexOf(num.replace(/\s+/g, '')) > -1
        ? text.indexOf(num.replace(/\s+/g, ''))
        : text.search(/\$|\d+%/);
    if (numIdx >= 0) {
      const phrase = firstSentence(text.slice(Math.max(0, numIdx - 10)), 80);
      if (phrase.length > 8) return cap(tc(phrase), 80);
    }
  }
  const sentence = firstSentence(text, 80);
  return sentence.length > 8 ? cap(tc(sentence), 80) : `${input.industry || 'The'} Challenge`;
}

export function problemSubtitle(input: WizardInput): string {
  if (input.targetCustomers) return cap(firstPhrase(input.targetCustomers, 70), 70);
  const num = firstNum(input.problem);
  if (num) return `A critical pain point costing ${num} annually`;
  return input.industry
    ? `Facing every ${input.industry.toLowerCase()} team`
    : 'An unsolved pain point';
}

// ---------------------------------------------------------------------------
//  Solution
// ---------------------------------------------------------------------------

export function solutionTitle(input: WizardInput): string {
  const product = input.productService || input.companyName;
  const text = input.solution;
  if (text?.trim()) {
    const phrase = firstPhrase(text, 60);
    if (phrase.length > 8 && product) return cap(`${product}: ${tc(phrase)}`, 85);
    if (phrase.length > 8) return cap(tc(phrase), 80);
  }
  if (product) return `${product} — Built to Win`;
  return 'A Better Way Forward';
}

export function solutionSubtitle(input: WizardInput): string {
  if (input.differentiation) return cap(firstPhrase(input.differentiation, 70), 70);
  if (input.productService) return input.productService;
  return 'How we solve it';
}

// ---------------------------------------------------------------------------
//  Market Opportunity
// ---------------------------------------------------------------------------

export function marketTitle(input: WizardInput): string {
  const tam = input.structured?.marketSizing?.tam;
  const sam = input.structured?.marketSizing?.sam;
  const ind = input.industry || 'the market';
  if (tam) return `$${tam.replace(/^\$/, '')} ${tc(ind)} Market`;
  if (sam) return `$${sam.replace(/^\$/, '')} Addressable ${tc(ind)} Market`;
  const numInText = firstNum(input.marketOpportunity);
  if (numInText) {
    const phrase = firstSentence(input.marketOpportunity, 75);
    if (phrase.length > 8) return cap(tc(phrase), 80);
    return `${numInText} ${tc(ind)} Opportunity`;
  }
  if (input.marketOpportunity) {
    const phrase = firstSentence(input.marketOpportunity, 75);
    if (phrase.length > 8) return cap(tc(phrase), 80);
  }
  return `A Growing ${tc(ind)} Opportunity`;
}

export function marketSubtitle(input: WizardInput): string {
  const rate = input.structured?.marketSizing?.growthRate;
  if (rate) return `Growing ${rate} annually`;
  const region = input.structured?.marketSizing?.region;
  const tam = input.structured?.marketSizing?.tam;
  if (tam && region) return `${region} TAM`;
  return 'TAM · SAM · SOM';
}

// ---------------------------------------------------------------------------
//  Business Model
// ---------------------------------------------------------------------------

export function businessModelTitle(input: WizardInput): string {
  const modelType = revenueModelType(input.revenueModel);
  const tiers = input.structured?.pricingTiers;
  if (modelType && tiers?.length) {
    const lowestPrice = tiers
      .map((t) => t.price)
      .filter(Boolean)
      .sort((a, b) => {
        const na = parseFloat(a.replace(/[^0-9.]/g, '')) || 0;
        const nb = parseFloat(b.replace(/[^0-9.]/g, '')) || 0;
        return na - nb;
      })[0];
    if (lowestPrice) return `${modelType} Starting at ${lowestPrice}/mo`;
  }
  if (modelType) return `${modelType} Revenue Model`;
  if (input.revenueModel) {
    const phrase = firstPhrase(input.revenueModel, 70);
    if (phrase.length > 8) return cap(tc(phrase), 80);
  }
  return `${input.companyName || 'Our'} Revenue Model`;
}

export function businessModelSubtitle(input: WizardInput): string {
  const tiers = input.structured?.pricingTiers;
  if (tiers?.length) {
    const names = tiers
      .slice(0, 3)
      .map((t) => t.name)
      .filter(Boolean)
      .join(' · ');
    if (names) return names;
  }
  if (input.pricing) return cap(firstPhrase(input.pricing, 65), 65);
  return 'Scalable, recurring revenue';
}

// ---------------------------------------------------------------------------
//  Traction
// ---------------------------------------------------------------------------

export function tractionTitle(input: WizardInput): string {
  const kpis = input.structured?.kpis;
  if (kpis?.length) {
    // Pick the most impressive-looking KPI (revenue > users > %, else first)
    const order = ['mrr', 'arr', 'revenue', 'users', 'customers', 'growth'];
    const sorted = [...kpis].sort((a, b) => {
      const ai = order.findIndex((k) => a.label.toLowerCase().includes(k));
      const bi = order.findIndex((k) => b.label.toLowerCase().includes(k));
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    const top = sorted
      .slice(0, 3)
      .map((k) => `${k.value} ${k.label}`)
      .join(', ');
    if (top.length < 80) return cap(top, 80);
    return cap(`${sorted[0].value} ${sorted[0].label}`, 80);
  }
  const numInText = firstNum(input.traction);
  if (numInText) {
    const phrase = firstSentence(input.traction, 75);
    if (phrase.length > 8) return cap(tc(phrase), 80);
    return `${numInText} and Growing`;
  }
  if (input.traction) {
    const phrase = firstSentence(input.traction, 75);
    if (phrase.length > 8) return cap(tc(phrase), 80);
  }
  return 'Early Traction & Momentum';
}

export function tractionSubtitle(input: WizardInput): string {
  const kpis = input.structured?.kpis;
  if (kpis?.length && kpis.length > 3) return `${kpis.length} key metrics`;
  const trend = kpis?.find((k) => k.trendDirection === 'up' || k.trend);
  if (trend?.trend) return `${trend.trend} ${trend.label}`;
  if (input.traction) {
    const second = input.traction.split(/[.!?\n]/).filter((s) => s.trim().length > 4)[1];
    if (second) return cap(tc(second.trim()), 70);
  }
  return 'Proven product-market fit';
}

// ---------------------------------------------------------------------------
//  Team
// ---------------------------------------------------------------------------

export function teamTitle(input: WizardInput): string {
  const members = input.structured?.teamMembers;
  if (members?.length) {
    // Build: "3 Founders with Deep SaaS Experience"
    const count = members.length;
    const ind = input.industry ? ` ${tc(input.industry)}` : '';
    if (count === 1) return `${members[0].name}, ${members[0].role}`;
    // Surface former employers / credentials if any
    const credWords = [
      'ex-',
      'former',
      'google',
      'mckinsey',
      'goldman',
      'meta',
      'amazon',
      'harvard',
      'stanford',
      'mit',
      'phd',
    ];
    const credMember = members.find((m) =>
      credWords.some((cw) => (m.experience || '').toLowerCase().includes(cw)),
    );
    if (credMember) {
      const cred = cap(firstPhrase(credMember.experience, 45), 45);
      return `Team Led by ${cred.replace(/^ex-/i, 'Ex-')}`;
    }
    return `${count} Founders with Deep${ind} Experience`;
  }
  if (input.team) {
    const credWords = /ex-|former |phd|stanford|harvard|mit|google|amazon|mckinsey/i;
    if (credWords.test(input.team)) {
      const phrase = firstSentence(input.team, 60);
      if (phrase.length > 8) return cap(tc(phrase), 75);
    }
    const countMatch = input.team.match(/\b(\d+)\s+(?:co-)?founders?\b/i);
    if (countMatch) return `${countMatch[1]} Founders, One Mission`;
  }
  return `${input.companyName || 'The'} Founding Team`;
}

export function teamSubtitle(input: WizardInput): string {
  const members = input.structured?.teamMembers;
  if (members?.length) {
    const roles = members
      .slice(0, 3)
      .map((m) => m.role)
      .filter(Boolean)
      .join(' · ');
    if (roles) return roles;
  }
  if (input.industry) return `Domain experts in ${input.industry.toLowerCase()}`;
  return 'Built to execute';
}

// ---------------------------------------------------------------------------
//  Ask / Funding
// ---------------------------------------------------------------------------

export function askTitle(input: WizardInput): string {
  const funding = input.structured?.funding;
  const amount = funding?.amount || firstNum(input.fundingAsk);
  const round = funding?.roundType || detectRoundType(input.fundingAsk);
  if (amount && round) return `Raising ${amount.replace(/^\$/, '$')} ${round}`;
  if (amount) return `Raising ${amount.replace(/^\$/, '$')}`;
  if (input.fundingAsk) {
    const phrase = firstPhrase(input.fundingAsk, 65);
    if (phrase.length > 8) return cap(tc(phrase), 75);
  }
  if (input.desiredAction) {
    const phrase = firstPhrase(input.desiredAction, 65);
    if (phrase.length > 8) return cap(tc(phrase), 75);
  }
  return `Join ${input.companyName || 'Us'}`;
}

export function askSubtitle(input: WizardInput): string {
  const funding = input.structured?.funding;
  if (funding?.allocations?.length) {
    const top = funding.allocations[0];
    const label = top.amount ? `${top.amount} for ${top.category}` : top.category;
    if (label) return cap(tc(label), 70);
  }
  if (funding?.runway) return `${funding.runway} runway`;
  if (input.desiredAction) return cap(firstPhrase(input.desiredAction, 70), 70);
  return `Fueling the next phase of growth`;
}

function detectRoundType(text: string | undefined): string {
  if (!text) return '';
  const t = text.toLowerCase();
  if (t.includes('series a')) return 'Series A';
  if (t.includes('series b')) return 'Series B';
  if (t.includes('series c')) return 'Series C';
  if (t.includes('seed')) return 'Seed Round';
  if (t.includes('pre-seed') || t.includes('preseed')) return 'Pre-Seed';
  if (t.includes('bridge')) return 'Bridge Round';
  return '';
}

// ---------------------------------------------------------------------------
//  Competition
// ---------------------------------------------------------------------------

export function competitionTitle(input: WizardInput): string {
  if (input.differentiation) {
    const phrase = firstSentence(input.differentiation, 75);
    if (phrase.length > 8) return cap(tc(phrase), 80);
  }
  if (input.competitors) {
    // "Why [Company] Wins vs [First Competitor]"
    const firstComp = firstPhrase(input.competitors, 30);
    if (firstComp.length > 2) return `Why ${input.companyName || 'We'} Win vs ${tc(firstComp)}`;
  }
  return `${input.companyName || 'Our'} Competitive Edge`;
}

export function competitionSubtitle(input: WizardInput): string {
  if (input.differentiation) {
    const diff = firstPhrase(input.differentiation, 65);
    if (diff.length > 8) return cap(diff, 65);
  }
  return 'Uniquely positioned to win';
}

// ---------------------------------------------------------------------------
//  Roadmap
// ---------------------------------------------------------------------------

export function roadmapTitle(input: WizardInput): string {
  const phases = input.structured?.roadmapPhases;
  if (phases?.length) {
    const first = phases[0].period || phases[0].phase;
    const last = phases[phases.length - 1].period || phases[phases.length - 1].phase;
    if (first && last && first !== last) return `From ${tc(first)} to ${tc(last)}`;
    if (first) return `${tc(first)}: Our Execution Plan`;
  }
  if (input.roadmap) {
    const phrase = firstSentence(input.roadmap, 70);
    if (phrase.length > 8) return cap(tc(phrase), 80);
  }
  const stage = input.businessStage;
  return stage ? `From ${tc(stage)} to Market Leader` : `Product Roadmap`;
}

export function roadmapSubtitle(input: WizardInput): string {
  const phases = input.structured?.roadmapPhases;
  if (phases?.length) return `${phases.length} phases to scale`;
  return 'Milestones and execution plan';
}

// ---------------------------------------------------------------------------
//  Go-to-Market
// ---------------------------------------------------------------------------

export function gtmTitle(input: WizardInput): string {
  const target = input.targetCustomers;
  if (target) {
    const segment = firstPhrase(target, 40);
    const channel = detectChannel(target, input.revenueModel);
    if (segment && channel) return `Reaching ${tc(segment)} via ${channel}`;
    if (segment) return `${tc(segment)}: Our Go-to-Market`;
  }
  return `${input.companyName || 'Our'} Go-to-Market`;
}

export function gtmSubtitle(input: WizardInput): string {
  return 'Customer acquisition and growth engine';
}

function detectChannel(target: string, revenue?: string): string {
  const t = (target + ' ' + (revenue || '')).toLowerCase();
  if (t.includes('enterprise') || t.includes('b2b')) return 'Direct Sales';
  if (t.includes('consumer') || t.includes('b2c')) return 'Digital Marketing';
  if (t.includes('developer') || t.includes('api')) return 'Product-Led Growth';
  if (t.includes('partner') || t.includes('channel')) return 'Channel Partners';
  if (t.includes('self-serve') || t.includes('product-led')) return 'Product-Led Growth';
  return 'Multi-Channel';
}

// ---------------------------------------------------------------------------
//  Financial Projections
// ---------------------------------------------------------------------------

export function financialsTitle(input: WizardInput): string {
  const proj = input.structured?.financials?.projections;
  if (proj?.length) {
    const last = proj[proj.length - 1];
    if (last.revenue) return `${last.revenue} Revenue by ${last.year}`;
  }
  const num = firstNum(input.revenueModel || input.traction || '');
  if (num) return `Path to ${num} ARR`;
  return `${input.companyName || 'Our'} Financial Model`;
}

export function financialsSubtitle(input: WizardInput): string {
  const m = input.structured?.financials?.grossMargin;
  if (m) return `${m} gross margin, path to profitability`;
  return '3-year financial outlook';
}

// ---------------------------------------------------------------------------
//  Pricing
// ---------------------------------------------------------------------------

export function pricingTitle(input: WizardInput): string {
  const tiers = input.structured?.pricingTiers;
  if (tiers?.length) {
    const prices = tiers
      .map((t) => parseFloat(t.price.replace(/[^0-9.]/g, '')) || 0)
      .filter((p) => p > 0)
      .sort((a, b) => a - b);
    const lowestTier = tiers.find((t) => {
      const p = parseFloat(t.price.replace(/[^0-9.]/g, '')) || 0;
      return p === prices[0];
    });
    if (lowestTier) {
      return `${tiers.length} Plans from ${lowestTier.price}`;
    }
    return `${tiers.length} Flexible Pricing Tiers`;
  }
  if (input.pricing) {
    const phrase = firstPhrase(input.pricing, 65);
    if (phrase.length > 8) return cap(tc(phrase), 75);
  }
  return `${input.productService || input.companyName || 'Our'} Pricing`;
}

export function pricingSubtitle(_input: WizardInput): string {
  return 'Simple, transparent pricing';
}

// ---------------------------------------------------------------------------
//  Product Features
// ---------------------------------------------------------------------------

export function featuresTitle(input: WizardInput): string {
  const product = input.productService || input.companyName;
  if (input.solution) {
    const phrase = firstPhrase(input.solution, 55);
    if (phrase.length > 8 && product) return cap(`${product}: ${tc(phrase)}`, 80);
    if (phrase.length > 8) return cap(tc(phrase), 75);
  }
  return product ? `${product}'s Core Capabilities` : 'Key Features';
}

export function featuresSubtitle(input: WizardInput): string {
  return input.productService || 'Built for performance';
}

// ---------------------------------------------------------------------------
//  Vision
// ---------------------------------------------------------------------------

export function visionTitle(input: WizardInput): string {
  const product = input.productService || input.companyName;
  const ind = input.industry;
  if (product && ind) return `Transforming ${tc(ind)} with ${product}`;
  if (input.shortDescription) {
    const phrase = firstPhrase(input.shortDescription, 65);
    if (phrase.length > 8) return cap(tc(phrase), 75);
  }
  if (product) return `${product}'s Vision for ${ind ? tc(ind) : 'the Future'}`;
  return 'Building the Future';
}

export function visionSubtitle(input: WizardInput): string {
  if (input.shortDescription) return cap(firstSentence(input.shortDescription, 70), 70);
  return `Our mission: ${input.industry ? `redefining ${input.industry.toLowerCase()}` : 'changing the world'}`;
}

// ---------------------------------------------------------------------------
//  Company Overview
// ---------------------------------------------------------------------------

export function companyOverviewTitle(input: WizardInput): string {
  return input.companyName || 'Company Overview';
}

export function companyOverviewSubtitle(input: WizardInput): string {
  if (input.shortDescription) return cap(firstPhrase(input.shortDescription, 70), 70);
  return input.industry ? `Leading ${input.industry} innovation` : 'Who we are';
}

// ---------------------------------------------------------------------------
//  Executive Summary
// ---------------------------------------------------------------------------

export function execSummaryTitle(input: WizardInput): string {
  return `${input.companyName || 'The'} Investment Thesis`;
}

export function execSummarySubtitle(_input: WizardInput): string {
  return 'Key highlights';
}
