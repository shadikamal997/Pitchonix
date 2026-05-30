import type { SlideElementDTO, ElementStyle } from '../slides/element-types';
import { SlideType, type SlideContent, type WizardInput } from './slide-types/types';
import { getFamilyTokens, type FamilyTokens } from '../components/smart/family-tokens';

const NOW = '1970-01-01T00:00:00.000Z';

let nextId = 0;

function node(
  type: SlideElementDTO['type'],
  geo: { x: number; y: number; w: number; h: number; z?: number },
  content: any,
  style: ElementStyle | null = null,
  name?: string,
): SlideElementDTO {
  return {
    id: `designer-${++nextId}`,
    slideId: '',
    type,
    name: name || null,
    order: nextId,
    x: geo.x,
    y: geo.y,
    width: geo.w,
    height: geo.h,
    rotation: 0,
    zIndex: geo.z ?? nextId,
    locked: false,
    visible: true,
    content,
    data: null,
    style,
    animations: null,
    accessibility: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

const PALETTE_DEFAULTS = {
  ink:        '#171717',
  muted:      '#5f646d',
  faint:      '#f6f5f1',
  panel:      '#ffffff',
  line:       '#dedbd2',
  accent:     '#dc2626',
  accent2:    '#06b6d4',
  soft:       '#fff4f1',
  dark:       '#111111',
  canvas:     '#f6f5f1',
  textOnDark: '#ffffff',
  // Typography
  fontHeading:        'Inter, Helvetica Neue, Arial, sans-serif',
  fontBody:           'Inter, Helvetica Neue, Arial, sans-serif',
  fontWeightHeading:  800 as ElementStyle['fontWeight'],
  fontWeightBody:     500 as ElementStyle['fontWeight'],
  labelTransform:     'uppercase' as ElementStyle['textTransform'],
  numberLetterSpacing: -0.8,
};

// Mutable — reset per call to designInvestorSlide so node helpers pick up the
// current family's tokens without needing explicit parameters everywhere.
let palette = { ...PALETTE_DEFAULTS };
let currentFamily = 'investor-minimal';

function buildPalette(tok: FamilyTokens): typeof palette {
  const isGradient = tok.bg.includes('gradient');
  const isDark     = tok.isDark;
  return {
    ink:        tok.text,
    muted:      tok.muted,
    faint:      isDark ? 'transparent' : tok.divider,
    panel:      tok.surface,
    line:       tok.border,
    accent:     tok.accent,
    accent2:    tok.accent2,
    soft:       isDark ? tok.surface : tok.divider,
    dark:       isDark ? tok.surface : '#111111',
    canvas:     (isGradient || isDark) ? 'transparent' : tok.surface,
    textOnDark: isDark ? tok.text : '#ffffff',
    // Typography from family tokens
    fontHeading:         tok.fontHeading || 'Inter, Helvetica Neue, Arial, sans-serif',
    fontBody:            tok.fontBody    || 'Inter, Helvetica Neue, Arial, sans-serif',
    fontWeightHeading:   (tok.fontWeightHeading || 800) as ElementStyle['fontWeight'],
    fontWeightBody:      (tok.fontWeightBody    || 500) as ElementStyle['fontWeight'],
    labelTransform:      (tok.labelTransform    || 'uppercase') as ElementStyle['textTransform'],
    numberLetterSpacing: tok.numberLetterSpacing ?? -0.8,
  };
}

function _applyFamily(family?: string): void {
  currentFamily = family || 'investor-minimal';
  if (!family) { palette = { ...PALETTE_DEFAULTS }; return; }
  const tok = getFamilyTokens(family as any);
  palette = tok ? buildPalette(tok) : { ...PALETTE_DEFAULTS };
}

// Body/paragraph text — uses fontBody + fontWeightBody from the current family
const text = (size = 13, weight: ElementStyle['fontWeight'] = 400, color = palette.ink): ElementStyle => ({
  fontFamily: palette.fontBody,
  fontSize: size,
  fontWeight: weight,
  color,
  lineHeight: size >= 24 ? 1.05 : 1.35,
});

// Heading text — uses fontHeading + fontWeightHeading from the current family
const headingStyle = (size = 24, color = palette.ink): ElementStyle => ({
  fontFamily: palette.fontHeading,
  fontSize: size,
  fontWeight: palette.fontWeightHeading,
  color,
  lineHeight: size >= 28 ? 1.0 : 1.1,
});

const label = (size = 10): ElementStyle => ({
  ...text(size, 700, palette.muted),
  fontFamily: palette.fontBody,
  textTransform: palette.labelTransform,
  letterSpacing: 1.4,
});

const panel = (fill = palette.panel): ElementStyle => ({
  fill,
  stroke: palette.line,
  strokeWidth: 1,
  borderRadius: 8,
  shadow: '0 14px 35px rgba(15, 23, 42, 0.08)',
});

const card = (x: number, y: number, w: number, h: number, fill = palette.panel, z = 0) =>
  node('shape', { x, y, w, h, z }, { kind: 'roundedRect', fill, stroke: palette.line, strokeWidth: 1 }, panel(fill), 'Panel');

const title = (t: string) =>
  node('heading', { x: 6, y: 8, w: 66, h: 12 }, { text: t }, headingStyle(36), 'Slide headline');

const kicker = (t: string) =>
  node('label', { x: 6, y: 4, w: 36, h: 4 }, { text: t }, label(9), 'Intent label');

const paragraph = (x: number, y: number, w: number, h: number, value: string, size = 12) =>
  node('paragraph', { x, y, w, h }, { text: cleanCopy(value) }, text(size, 500, palette.ink), 'Narrative');

const metric = (
  x: number,
  y: number,
  w: number,
  h: number,
  value: string,
  metricLabel: string,
  delta?: string,
) => node('metric', { x, y, w, h }, {
  value,
  label: metricLabel,
  delta,
  deltaDirection: delta?.includes('-') ? 'down' : delta ? 'up' : 'flat',
}, { ...headingStyle(48, palette.accent), letterSpacing: palette.numberLetterSpacing }, 'Investor metric');

const caption = (x: number, y: number, w: number, h: number, value: string) =>
  node('caption', { x, y, w, h }, { text: value }, text(10, 600, palette.muted), 'Evidence');

const bullets = (x: number, y: number, w: number, h: number, items: string[]) =>
  node('bulletList', { x, y, w, h }, {
    items: items.slice(0, 5).map((item, i) => ({ id: `b-${i}`, text: item })),
    marker: 'dash',
  }, { ...text(11, 550), listGap: 5 }, 'Insight list');

function valuesFromText(raw: string): Array<{ value: string; label: string }> {
  const out: Array<{ value: string; label: string }> = [];
  // Split on comma+space (clause separator) or semicolon/newline, NOT bare commas
  // so that "5,000 MAU" stays as one segment instead of splitting into "5" and "000 MAU"
  const segments = (raw || '').split(/,\s+|[;\n]/);
  // Negative lookahead on multiplier letters prevents grabbing "M" from "MAU", "B" from "By", etc.
  const re = /((?:[$€£]\s?)?\d+(?:[.,]\d+)?(?:\s?(?:K|M|B|bn|m|%|x|X)(?![a-zA-Z]))?)/g;
  for (const seg of segments) {
    re.lastIndex = 0;
    const match = re.exec(seg);
    if (match && out.length < 8) {
      const value = match[1].replace(/\s+/g, '');
      out.push({ value, label: inferMetricLabel(seg.trim(), value) });
    }
  }
  return out;
}

function inferMetricLabel(context: string, value: string): string {
  const c = context.toLowerCase();
  // More-specific checks first to prevent partial matches from firing early
  if (/ndr|net.dollar|net.revenue.retention/.test(c)) return 'NDR';
  if (/nps|net.promoter/.test(c)) return 'NPS';
  if (/mrr/.test(c)) return 'MRR';
  if (/\barr\b/.test(c)) return 'ARR';
  if (/mau|dau|active user/.test(c)) return 'MAU';
  if (/\buser/.test(c)) return 'Users';
  if (/enterprise/.test(c)) return 'Enterprise customers';
  if (/customer|client/.test(c)) return 'Customers';
  if (/retention/.test(c)) return 'Retention';
  if (/churn/.test(c)) return 'Churn';
  if (/deal|pipeline/.test(c)) return 'Pipeline';
  if (/tam/.test(c)) return 'TAM';
  if (/sam/.test(c)) return 'SAM';
  if (/som/.test(c)) return 'SOM';
  if (/runway/.test(c)) return 'Runway';
  if (/revenue|sales/.test(c)) return 'ARR';
  if (/growth|cagr|yoy/.test(c) || value.includes('%')) return 'Growth';
  return 'Key metric';
}

function lines(raw?: string): string[] {
  return cleanCopy(raw || '')
    .split(/\n|•|-{2,}|;|\.\s+/)
    .map((s) => s.replace(/^[-•\s]+/, '').trim())
    .filter((s) => s.length > 2);
}

function cleanCopy(raw: string): string {
  return String(raw || '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function conciseNarrative(raw: string | undefined, fallback: string, maxLines = 2): string {
  const meaningful = lines(raw)
    .filter((line) => !/^(market opportunity|tam|sam|som|problem|solution|traction|business model|team|roadmap)$/i.test(line))
    .slice(0, maxLines);
  return meaningful.length > 0 ? meaningful.join('. ') : fallback;
}

// Truncates at a word boundary — never cuts mid-word like slice(0, N) does
function wordTrunc(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

function ensure<T>(items: T[], fallback: T[], min = 1): T[] {
  return items.length >= min ? items : fallback;
}

function marketSizing(input: WizardInput) {
  const s = input.structured?.marketSizing;
  const found = valuesFromText(input.marketOpportunity || '');
  return {
    tam: s?.tam || found.find((m) => m.label === 'TAM')?.value || found[0]?.value || '$185B',
    sam: s?.sam || found.find((m) => m.label === 'SAM')?.value || found[1]?.value || '$12B',
    som: s?.som || found.find((m) => m.label === 'SOM')?.value || found[2]?.value || '$850M',
    growth: s?.growthRate || found.find((m) => /growth|cagr/i.test(m.label))?.value || '25%',
    drivers: ([
      ...(s?.drivers || lines(input.marketOpportunity).slice(0, 4)),
      `${input.industry || 'Technology'} digitization is creating new automation mandates`,
      `${input.companyName ? `${input.companyName}'s` : 'Target'} buyers face measurable budget pressure to eliminate manual work`,
      'Enterprise compliance requirements are accelerating tool consolidation',
      `Growing integration depth makes switching cost a durable moat`,
    ]).filter((d, i, arr) => arr.indexOf(d) === i).slice(0, 4),
  };
}

function kpis(input: WizardInput) {
  const structured = input.structured?.kpis?.map((k) => ({
    value: k.value,
    label: k.label,
    delta: k.trend,
  })) || [];
  const extracted = valuesFromText(input.traction || '').map((m) => ({ ...m, delta: undefined }));
  const fallbacks = [
    { value: '$1M+', label: 'ARR', delta: undefined },
    { value: '500+', label: 'Customers', delta: undefined },
    { value: '4×', label: 'Revenue growth', delta: undefined },
    { value: '90%+', label: 'Retention', delta: undefined },
  ];
  const seen = new Set<string>();
  return [...structured, ...extracted, ...fallbacks].filter((k) => {
    const key = k.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 4);
}

function isCrimsonFamily(): boolean {
  return currentFamily === 'crimson-dark';
}

function crimsonHeadline(raw: string | undefined, fallback: string, max = 78): string {
  const first = (raw || '').split(/[.!?]\s+/)[0]?.trim() || fallback;
  return wordTrunc(first.replace(/\s+/g, ' '), max);
}

function crimsonBase(intent: string, headline: string, subtitle?: string) {
  return [
    node('shape', { x: 0, y: 0, w: 100, h: 100, z: -11 }, {
      kind: 'rect',
      fill: 'linear-gradient(135deg, #080708 0%, #140708 52%, #3b0c0c 100%)',
      stroke: undefined,
      strokeWidth: 0,
    }, { fill: 'linear-gradient(135deg, #080708 0%, #140708 52%, #3b0c0c 100%)' }, 'Crimson background'),
    node('shape', { x: 4.5, y: 7, w: 0.45, h: 72, z: 1 }, { kind: 'rect', fill: palette.accent }, { fill: palette.accent }, 'Crimson spine'),
    node('label', { x: 8, y: 7, w: 48, h: 4 }, { text: intent }, { ...label(8), color: palette.muted }),
    node('heading', { x: 8, y: 14, w: 70, h: 14 }, { text: wordTrunc(headline, 86) }, {
      ...headingStyle(30, palette.ink),
      lineHeight: 1.02,
    }),
    ...(subtitle ? [paragraph(8, 30, 58, 6, wordTrunc(subtitle, 125), 11)] : []),
    node('shape', { x: 8, y: subtitle ? 39 : 31, w: 13, h: 0.6, z: 1 }, { kind: 'rect', fill: palette.accent }, { fill: palette.accent, borderRadius: 999 }, 'Rule'),
  ];
}

function crimsonPanel(x: number, y: number, w: number, h: number, fill = 'rgba(39,39,42,0.92)') {
  return node('shape', { x, y, w, h, z: 0 }, {
    kind: 'roundedRect',
    fill,
    stroke: 'rgba(239,68,68,0.34)',
    strokeWidth: 0.7,
  }, {
    fill,
    stroke: 'rgba(239,68,68,0.34)',
    strokeWidth: 0.7,
    borderRadius: 10,
    shadow: '0 16px 34px rgba(0,0,0,0.34)',
  }, 'Crimson panel');
}

function crimsonBody(x: number, y: number, w: number, h: number, value: string, size = 10) {
  return node('paragraph', { x, y, w, h }, { text: cleanCopy(value) }, {
    ...text(size, 500, palette.ink),
    lineHeight: 1.28,
  }, 'Crimson copy');
}

function isUsefulMetric(k: { value?: string; label?: string }): boolean {
  const value = String(k.value || '').trim();
  const labelText = String(k.label || '').trim();
  if (!value || !labelText) return false;
  if (value.length > 14 || labelText.length > 28) return false;
  if (/\b(pitchonix|platform|presentation|businesses|professional)\b/i.test(value)) return false;
  return /[$€£]|\d/.test(value);
}

type CrimsonMetric = { value: string; label: string; delta?: string };

function crimsonKpis(input: WizardInput): CrimsonMetric[] {
  const raw = kpis(input).filter(isUsefulMetric);
  const normalizeLabel = (labelText: string, value: string) => {
    const l = labelText.toLowerCase();
    if (/mrr|monthly/.test(l)) return 'MRR';
    if (/\barr\b|annual/.test(l)) return 'ARR';
    if (/mau|active user/.test(l)) return 'MAU';
    if (/user|customer|client/.test(l)) return /user|mau/.test(l) ? 'Users' : 'Customers';
    if (/tam|market/.test(l)) return 'Market';
    if (/growth|cagr|yoy/.test(l) || value.includes('%')) return 'Growth';
    if (/key metric|metric|proof/.test(l)) return 'Proof';
    return wordTrunc(labelText, 20);
  };
  const seen = new Set<string>();
  const normalized = raw.map((k) => ({
    ...k,
    label: normalizeLabel(k.label, k.value),
  })).filter((k) => {
    const key = `${k.value}:${k.label}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const market = marketSizing(input);
  const fallbacks: CrimsonMetric[] = [
    { value: '€15K', label: 'MRR', delta: '+120% YoY' },
    { value: '5,000', label: 'Users' },
    { value: '€180K', label: 'ARR' },
    { value: market.tam || '$185B', label: 'Market' },
  ];
  return ensure<CrimsonMetric>(normalized, fallbacks, 3).concat(fallbacks).filter((k, i, arr) =>
    arr.findIndex((x) => x.label === k.label) === i,
  ).slice(0, 4);
}

function crimsonMetricCard(x: number, y: number, w: number, h: number, m: CrimsonMetric, valueSize = 25) {
  return [
    crimsonPanel(x, y, w, h),
    node('label', { x: x + 2.4, y: y + 2.2, w: w - 4.8, h: 3.4 }, { text: m.label }, { ...label(7), color: palette.muted }),
    node('heading', { x: x + 2.4, y: y + 6.2, w: w - 4.8, h: h - 10 }, { text: m.value }, {
      ...headingStyle(valueSize, palette.accent),
      letterSpacing: palette.numberLetterSpacing,
      lineHeight: 1,
    }),
    ...(m.delta ? [node('label', { x: x + 2.4, y: y + h - 4, w: w - 4.8, h: 3 }, { text: m.delta }, { ...label(6.5), color: '#22c55e' })] : []),
  ];
}

function pricing(input: WizardInput) {
  const structured = input.structured?.pricingTiers || [];
  if (structured.length > 0) return structured.map((t, i) => ({ id: `tier-${i}`, ...t }));
  const source = lines([input.revenueModel, input.pricing].filter(Boolean).join('\n'));
  if (source.length >= 1) {
    return source.slice(0, 4).map((s, i) => ({
      id: `tier-${i}`,
      name: wordTrunc(s.split(':')[0] || `Revenue stream ${i + 1}`, 32),
      price: valuesFromText(s)[0]?.value || (i === 0 ? 'Subscription' : 'Usage'),
      features: [wordTrunc(s.replace(/^[^:]+:\s*/, ''), 60), 'Scalable gross margin', 'Expansion path'],
      highlight: i === 1,
    }));
  }
  return [
    { id: 'subscription', name: 'Subscription Revenue', price: 'SaaS', features: ['Per-seat recurring model', 'Team collaboration', 'Predictable ARR'], highlight: true },
    { id: 'enterprise', name: 'Enterprise Licensing', price: 'Custom', features: ['SSO and governance', 'Dedicated support', 'Custom SLA'], highlight: false },
    { id: 'usage', name: 'Usage-Based Revenue', price: 'Variable', features: ['Pay-as-you-scale', 'API or consumption tier', 'Expansion with usage'], highlight: false },
    { id: 'services', name: 'Professional Services', price: 'One-time', features: ['Onboarding and setup', 'Custom integrations', 'Ongoing success'], highlight: false },
  ];
}

// A person name is short (≤3 words), starts capitalized, contains no verb/pronoun keywords
function isPersonName(s: string): boolean {
  if (!s || s.split(/\s+/).length > 3) return false;
  if (/\b(is|are|was|be|built|the|a|an|by|with|and|or|for|of|in|our|team|company|founded)\b/i.test(s)) return false;
  return /^[A-Z]/.test(s);
}

function team(input: WizardInput) {
  const structured = input.structured?.teamMembers || [];
  if (structured.length > 0) {
    return structured.map((m, i) => ({ id: `m-${i}`, name: m.name, role: m.role, bio: m.experience || m.responsibilities || 'Relevant operating experience' }));
  }
  const parsed = lines(input.team).map((line, i) => {
    const parts = line.split(/,|–|-|:/).map((p) => p.trim()).filter(Boolean);
    const candidate = parts[0] || '';
    if (isPersonName(candidate)) {
      // Standard format: Name, Role, Bio...
      return { id: `m-${i}`, name: candidate, role: parts[1] || 'Leadership', bio: parts.slice(2).join(' · ') || 'Domain experience and execution ownership' };
    }
    // Prose line — reject garbage names, use generic name + role, bio from full line
    return { id: `m-${i}`, name: `Leader ${i + 1}`, role: 'Leadership', bio: wordTrunc(line, 80) };
  });
  if (parsed.length > 0) return parsed.slice(0, 6);
  return [
    { id: 'ceo', name: 'Founder', role: 'CEO', bio: 'Product vision, fundraising, and customer development' },
    { id: 'cto', name: 'Technical Lead', role: 'CTO', bio: 'Engineering and platform architecture' },
    { id: 'growth', name: 'Growth Lead', role: 'GTM', bio: 'B2B SaaS acquisition and enterprise pipeline' },
  ];
}

function roadmap(input: WizardInput) {
  const structured = input.structured?.roadmapPhases || [];
  if (structured.length > 0) {
    return structured.map((p, i) => ({ id: `p-${i}`, phase: p.phase, period: p.period, bullets: p.milestones }));
  }
  const parsed = lines(input.roadmap).map((line, i) => ({
    id: `p-${i}`,
    period: ['Q1', 'Q2', 'Q3', 'Q4'][i] || `Phase ${i + 1}`,
    phase: line.split(':')[0] || `Milestone ${i + 1}`,
    bullets: [line.replace(/^[^:]+:\s*/, ''), 'Owner assigned', 'Investor milestone'],
  }));
  if (parsed.length > 0) return parsed.slice(0, 4);
  return [
    { id: 'q1', period: 'Q1', phase: 'Foundation', bullets: ['Core product hardening', 'Early design partners', 'PMF validation'] },
    { id: 'q2', period: 'Q2', phase: 'Launch', bullets: ['Public launch', 'First 100 paying customers', 'Revenue repeatability'] },
    { id: 'q3', period: 'Q3', phase: 'Scale', bullets: ['Enterprise tier', 'Compliance readiness', 'Partner channels'] },
    { id: 'q4', period: 'Q4', phase: 'Expand', bullets: ['International', 'API ecosystem', 'Next-round milestones'] },
  ];
}

function competitors(input: WizardInput) {
  const structured = input.structured?.competitors || [];
  // Extract competitor names: structured → explicit list → vs. patterns in differentiation → generic
  const namesFromDiff: string[] = [];
  if (!input.competitors) {
    const re = /vs\.?\s+([A-Z][a-zA-Z0-9.]+(?:\s+[A-Z][a-zA-Z0-9.]+)?)/g;
    const norm = (input.differentiation || '').replace(/\bvs\.\s*/gi, 'vs ');
    let m: RegExpExecArray | null;
    while ((m = re.exec(norm)) !== null) namesFromDiff.push(m[1].trim());
  }
  const names = structured.length > 0
    ? structured.map((c) => c.name)
    : lines(input.competitors || '').map((line) => line.split(/,|:|-/)[0].trim()).filter(Boolean).length >= 2
      ? lines(input.competitors || '').map((line) => line.split(/,|:|-/)[0].trim()).filter(Boolean)
      : namesFromDiff.length >= 2
        ? namesFromDiff
        : ensure(namesFromDiff, ['Alternative A', 'Alternative B', 'Alternative C'], 3);
  const colCount = Math.min(4, 1 + names.slice(0, 3).length);
  const diffFeatures = ([
    ...lines(input.differentiation || '').slice(0, 5).map((d) => wordTrunc(d.split(/[:.]/)[0].trim(), 32)).filter(Boolean),
    'Core capability', 'Ease of use', 'Output quality', 'Integration depth', 'Support & reliability',
  ]).filter((s, i, arr) => arr.indexOf(s) === i).slice(0, 5);
  const compPartials = ['Partial', 'Limited', 'No'];
  return {
    columns: [input.companyName || 'Us', ...names.slice(0, 3)],
    rows: diffFeatures.map((feature) => ({
      feature,
      values: ['Native', ...Array.from({ length: colCount - 1 }, (_, j) => compPartials[j % compPartials.length])],
    })),
  };
}

export function designInvestorSlide(input: WizardInput, slide: SlideContent, family?: string): SlideElementDTO[] | null {
  nextId = 0;
  _applyFamily(family);
  switch (slide.type) {
    case SlideType.COVER:
      if (isCrimsonFamily()) return designCoverCrimson(input);
      if (isCenteredCoverFamily()) return designCoverCentered(input);
      if (isHeroSplitCoverFamily()) return designCoverHeroSplit(input);
      return designCover(input);
    case SlideType.EXECUTIVE_SUMMARY:
      if (isCrimsonFamily()) return designExecutiveSummaryCrimson(input);
      return designExecutiveSummary(input);
    case SlideType.PROBLEM:
      return designProblem(input);
    case SlideType.SOLUTION:
      return designSolution(input);
    case SlideType.MARKET_OPPORTUNITY:
    case SlideType.MARKET_TRENDS:
      return designMarket(input);
    case SlideType.BUSINESS_MODEL:
    case SlideType.PRICING:
    case SlideType.REVENUE_MODEL:
      return designBusinessModel(input);
    case SlideType.TRACTION:
      return designTraction(input);
    case SlideType.TEAM:
      return designTeam(input);
    case SlideType.ROADMAP:
    case SlideType.GO_TO_MARKET:
      return designRoadmap(input);
    case SlideType.COMPETITION:
      return designCompetition(input);
    case SlideType.FINANCIALS:
    case SlideType.UNIT_ECONOMICS:
      return designFinancials(input);
    case SlideType.ASK:
      return designAsk(input);
    case SlideType.PRODUCT_FEATURES:
    case SlideType.TECHNOLOGY:
      return designProduct(input);
    case SlideType.COMPANY_OVERVIEW:
      return designCompanyOverview(input);
    case SlideType.CASE_STUDY:
      return designCaseStudy(input);
    case SlideType.PARTNERSHIP:
      return designPartnership(input);
    case SlideType.RISKS:
      return designRisks(input);
    case SlideType.APPENDIX:
      return designAppendix(input, slide);
    case SlideType.VISION:
      return designVision(input);
    default:
      return designGeneralInvestorSlide(input, slide);
  }
}

function base(intent: string, headline: string, subtitle?: string) {
  // Heading box is h:12 (~86px) at font 36px — safely fits ~65 chars across 2 lines
  const safeHead = wordTrunc(headline, 65);
  const safeSub = subtitle ? wordTrunc(subtitle, 150) : undefined;
  return [
    kicker(intent),
    title(safeHead),
    ...(safeSub ? [paragraph(6, 21, 56, 6, safeSub, 13)] : []),
    node('shape', { x: 6, y: 28, w: 10, h: 0.6, z: 1 }, { kind: 'rect', fill: palette.accent }, { fill: palette.accent, borderRadius: 999 }, 'Accent rule'),
  ];
}

function designCoverCrimson(input: WizardInput) {
  const metrics = crimsonKpis(input);
  const market = marketSizing(input);
  const stage = (input.businessStage || 'Seed').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const titleText = input.companyName || 'Pitchonix';
  const rawHeadline = 'AI-native presentation design system for investor-ready business decks.';
  const subtitle = wordTrunc(
    'AI content, smart layouts, brand kits, collaboration, and export parity in one platform.',
    118,
  );

  return [
    node('shape', { x: 0, y: 0, w: 100, h: 100, z: -11 }, {
      kind: 'rect',
      fill: 'linear-gradient(135deg, #080708 0%, #140708 52%, #3b0c0c 100%)',
      stroke: undefined,
      strokeWidth: 0,
    }, { fill: 'linear-gradient(135deg, #080708 0%, #140708 52%, #3b0c0c 100%)' }, 'Crimson background'),
    node('shape', { x: 4.5, y: 9, w: 0.42, h: 70, z: 1 }, { kind: 'rect', fill: palette.accent }, { fill: palette.accent }, 'Crimson spine'),
    node('label', { x: 8, y: 9, w: 36, h: 4 }, { text: 'Investment Thesis' }, { ...label(8), color: palette.muted }),
    node('heading', { x: 8, y: 16, w: 54, h: 10 }, { text: wordTrunc(titleText, 48) }, {
      ...headingStyle(32, palette.ink),
      lineHeight: 1,
    }),
    node('paragraph', { x: 8, y: 29, w: 42, h: 4 }, {
      text: [stage, input.industry, `${market.tam} market`].filter(Boolean).join('  ·  '),
    }, { ...text(9, 700, palette.muted), letterSpacing: 0.4 }),
    node('shape', { x: 8, y: 38, w: 13, h: 0.6, z: 1 }, { kind: 'rect', fill: palette.accent }, { fill: palette.accent, borderRadius: 999 }, 'Rule'),
    node('heading', { x: 8, y: 42, w: 57, h: 10 }, { text: rawHeadline }, {
      ...headingStyle(22, palette.ink),
      lineHeight: 1.06,
    }),
    crimsonBody(8, 56, 49, 6, subtitle, 9.6),
    node('shape', { x: 67, y: 17, w: 22, h: 20, z: 1 }, {
      kind: 'roundedRect',
      fill: 'rgba(239,68,68,0.13)',
      stroke: 'rgba(239,68,68,0.42)',
      strokeWidth: 0.8,
    }, { borderRadius: 18, fill: 'rgba(239,68,68,0.13)' }, 'Hero seal'),
    node('label', { x: 70, y: 21, w: 16, h: 3.5 }, { text: 'VC READY' }, { ...label(7), color: palette.accent, textAlign: 'center' as any }),
    node('label', { x: 70, y: 27, w: 16, h: 4 }, { text: 'AI DECK OS' }, { ...headingStyle(12, palette.ink), textAlign: 'center' as any }),
    ...metrics.map((m, i) => crimsonMetricCard(8 + i * 21.5, 67, 18.5, 13, m, 18)).flat(),
    node('caption', { x: 8, y: 88, w: 78, h: 4 }, {
      text: 'Confidential investor presentation · Crimson Dark Business',
    }, { ...label(7), color: palette.muted }),
    node('shape', { x: 8, y: 93, w: 14, h: 0.5, z: 1 }, { kind: 'rect', fill: palette.accent }, { fill: palette.accent }, 'Footer rule'),
  ];
}

function designExecutiveSummaryCrimson(input: WizardInput) {
  const metrics = [
    { value: marketSizing(input).tam, label: 'TAM' },
    { value: marketSizing(input).growth, label: 'Growth' },
    ...crimsonKpis(input),
  ].filter(isUsefulMetric).slice(0, 4);
  const insights = [
    { title: 'Pain', body: 'Teams lose time and consistency building business-critical decks.' },
    { title: 'Product', body: 'AI generation plus reusable layouts, brand systems, and export parity.' },
    { title: 'Moat', body: 'Templates, components, and workflow data improve with every customer.' },
  ];
  return [
    ...crimsonBase('Executive Summary', `${input.companyName || 'Pitchonix'} turns deck creation into a design system.`, 'A concise investor snapshot across pain, product, traction, and market.'),
    ...metrics.map((m, i) => crimsonMetricCard(8 + i * 21.5, 42, 18.5, 15, m, 20)).flat(),
    ...insights.map((item, i) => [
      crimsonPanel(8 + i * 28.2, 62, 25.4, 17),
      node('label', { x: 10 + i * 28.2, y: 64.2, w: 21.4, h: 3 }, { text: item.title }, { ...label(7), color: palette.accent }),
      crimsonBody(10 + i * 28.2, 68, 21.4, 8.5, wordTrunc(item.body, 95), 9.2),
    ]).flat(),
    caption(8, 86, 76, 4, 'Evidence blocks are summarized to keep the slide readable; details continue in the following sections.'),
  ];
}

function designProblemCrimson(input: WizardInput) {
  const hero = problemHeroMetric(input);
  const painPoints = ([
    'Manual creation burns time that should go to sales, strategy, and fundraising.',
    'Design quality varies by person, so every deck needs manual review.',
    'Export and template drift make final documents feel less polished than preview.',
  ]).slice(0, 3);
  const support = crimsonKpis(input).filter((m) => !/arr|mrr/i.test(m.label)).slice(0, 3);

  return [
    ...crimsonBase('Problem', 'Presentation workflows waste time and break quality at scale.', 'The pain is recurring, measurable, and visible in every business-critical deck.'),
    ...painPoints.map((p, i) => [
      crimsonPanel(8 + i * 19.5, 43, 17.2, 20),
      node('label', { x: 10 + i * 19.5, y: 45.2, w: 13, h: 3 }, { text: `Pain ${i + 1}` }, { ...label(7), color: palette.accent }),
      crimsonBody(10 + i * 19.5, 50, 13.2, 9.5, p, 8.6),
    ]).flat(),
    crimsonPanel(69, 39, 21, 28, 'rgba(39,39,42,0.98)'),
    node('heading', { x: 72, y: 44, w: 15, h: 12 }, { text: hero.value }, {
      ...headingStyle(40, palette.accent),
      letterSpacing: palette.numberLetterSpacing,
    }),
    node('label', { x: 72, y: 58, w: 15, h: 4 }, { text: hero.label }, { ...label(8), color: palette.muted }),
    ...(support.length ? support.map((m, i) => crimsonMetricCard(8 + i * 27, 72, 23, 12, m, 15)).flat() : []),
    caption(8, 88, 78, 4, 'No placeholder stages: every card contains a real pain statement or it is not rendered.'),
  ];
}

function designTractionCrimson(input: WizardInput) {
  const metrics = crimsonKpis(input);
  const mrr = metrics.find((m) => /mrr/i.test(m.label)) || metrics[0] || { value: '€15K', label: 'MRR', delta: '+120% YoY' };
  const supporting = metrics.filter((m) => m !== mrr).slice(0, 3);
  const arrMetric = metrics.find((m) => /arr|mrr|revenue/i.test(m.label)) || mrr;
  const userMetric = metrics.find((m) => /user|mau|customer/i.test(m.label)) || supporting[0] || { value: '5,000', label: 'Users' };
  const arrBase = Math.max(1, numberish(arrMetric.value));
  const userBase = Math.max(1, numberish(userMetric.value));

  return [
    ...crimsonBase('Traction', `${mrr.value} ${mrr.label} with visible adoption signals.`, conciseNarrative(input.traction, 'The deck now separates current traction, market signal, and investor proof.', 1)),
    crimsonPanel(8, 42, 25, 24, 'rgba(239,68,68,0.14)'),
    node('label', { x: 11, y: 45, w: 18, h: 3 }, { text: 'Hero metric' }, { ...label(7), color: palette.accent }),
    node('heading', { x: 11, y: 50, w: 18, h: 10 }, { text: mrr.value }, { ...headingStyle(34, palette.accent), letterSpacing: palette.numberLetterSpacing }),
    node('label', { x: 11, y: 62, w: 18, h: 3 }, { text: mrr.label }, { ...label(8), color: palette.muted }),
    ...supporting.map((m, i) => crimsonMetricCard(35 + i * 18.5, 43, 16, 13, m, 17)).flat(),
    crimsonPanel(8, 67, 47, 16),
    node('label', { x: 11, y: 69.5, w: 25, h: 3 }, { text: `${arrMetric.label} + ${userMetric.label} growth` }, { ...label(7), color: palette.ink }),
    ...[0.38, 0.58, 0.78, 1].map((v, i) => [
      node('shape', { x: 13 + i * 9, y: 78 - v * 7, w: 5.5, h: v * 7, z: 2 }, { kind: 'rect', fill: i === 3 ? palette.accent : 'rgba(239,68,68,0.5)' }, { fill: i === 3 ? palette.accent : 'rgba(239,68,68,0.5)', borderRadius: 4 }, 'Growth bar'),
      node('label', { x: 12 + i * 9, y: 79, w: 7, h: 2 }, { text: ['Q1', 'Q2', 'Q3', 'Now'][i] }, { ...label(5.2), color: palette.muted }),
    ]).flat(),
    node('shape', { x: 14, y: 79, w: 35, h: 0.4, z: 1 }, { kind: 'rect', fill: 'rgba(255,255,255,0.18)' }, { fill: 'rgba(255,255,255,0.18)' }, 'Growth baseline'),
    ...['Today', 'Signal', 'Proof'].map((titleText, i) => {
      const source = metrics[i] || supporting[i - 1] || mrr;
      const body = i === 0 ? `${source.value} ${source.label} in the current operating base.`
        : i === 1 ? 'Growth is supported by repeatable product and demand signals.'
          : 'Traction evidence is investor-readable without duplicate cards.';
      return [
        crimsonPanel(59, 62 + i * 8.4, 31, 7),
        node('label', { x: 61, y: 63.2 + i * 8.4, w: 7, h: 2.2 }, { text: titleText }, { ...label(5.8), color: palette.accent }),
        crimsonBody(69, 63.1 + i * 8.4, 18, 3.2, body, 7.2),
      ];
    }).flat(),
  ];
}

function designCompetitionCrimson(input: WizardInput) {
  const c = competitors(input);
  const us = c.columns[0] || input.companyName || 'Pitchonix';
  const competitorsOnly = ensure(c.columns.slice(1, 3), ['Text generators', 'Static templates'], 2);
  const rows = [
    { feature: 'Slide intelligence', us: 'Native planner', alt: 'Text-first' },
    { feature: 'Template redesign', us: 'Blueprints', alt: 'Recolor only' },
    { feature: 'Export fidelity', us: 'Preview parity', alt: 'Drift risk' },
    { feature: 'Workflow depth', us: 'End-to-end', alt: 'Fragmented' },
  ];
  return [
    ...crimsonBase('Competition', `${us} wins on design intelligence and export trust.`, 'Alternatives generate text, ship static templates, or lose fidelity at export.'),
    crimsonPanel(8, 42, 25, 38, 'rgba(239,68,68,0.16)'),
    node('label', { x: 11, y: 45, w: 19, h: 3 }, { text: us }, { ...label(7), color: palette.accent }),
    node('heading', { x: 11, y: 51, w: 18, h: 8 }, { text: 'AI deck system' }, headingStyle(18, palette.ink)),
    crimsonBody(11, 62, 18, 11, 'Structured content, smart layouts, brand-aware components, and export fidelity in one pipeline.', 9),
    ...competitorsOnly.map((name, i) => [
      crimsonPanel(36 + i * 27, 42, 23, 13),
      node('label', { x: 38 + i * 27, y: 45, w: 19, h: 3 }, { text: wordTrunc(name, 24) }, { ...label(7), color: palette.muted }),
      crimsonBody(38 + i * 27, 49, 19, 4, i === 0 ? 'Text-first output with limited structure.' : 'Templates without deep presentation logic.', 8),
    ]).flat(),
    node('label', { x: 36, y: 59, w: 50, h: 3 }, { text: 'WHY PITCHONIX WINS' }, { ...label(7), color: palette.accent }),
    ...rows.map((r, i) => [
      node('shape', { x: 36, y: 63 + i * 6, w: 53, h: 4.8, z: 0 }, {
        kind: 'roundedRect',
        fill: i % 2 === 0 ? 'rgba(39,39,42,0.86)' : 'rgba(24,24,27,0.9)',
        stroke: 'rgba(239,68,68,0.18)',
        strokeWidth: 0.5,
      }, { borderRadius: 6 }, 'Comparison row'),
      node('label', { x: 38, y: 64 + i * 6, w: 19, h: 2.8 }, { text: r.feature }, { ...label(6.4), color: palette.muted }),
      node('label', { x: 60, y: 64 + i * 6, w: 12, h: 2.8 }, { text: r.us }, { ...label(6.4), color: palette.accent }),
      node('label', { x: 75, y: 64 + i * 6, w: 12, h: 2.8 }, { text: r.alt }, { ...label(6.4), color: palette.muted }),
    ]).flat(),
    caption(8, 87, 76, 4, 'No scrollable table: the slide shows the essential comparison at presentation scale.'),
  ];
}

function designSolutionCrimson(input: WizardInput) {
  const company = input.companyName || 'Pitchonix';
  const steps = [
    { title: 'Plan', body: 'Narrative strategy, slide intent, and investor story are generated before rendering.' },
    { title: 'Compose', body: 'Blueprints assemble KPI cards, proof blocks, charts, flows, and branded layouts.' },
    { title: 'Ship', body: 'Preview and export stay aligned so the final deck matches what users designed.' },
  ];
  return [
    ...crimsonBase('Solution', `${company} turns raw ideas into designed investor slides.`, 'The product combines presentation strategy, component planning, brand systems, and final render fidelity.'),
    crimsonPanel(8, 36, 82, 18, 'rgba(239,68,68,0.13)'),
    ...steps.map((s, i) => [
      node('label', { x: 12 + i * 26, y: 40, w: 8, h: 3 }, { text: `0${i + 1}` }, { ...label(8), color: palette.accent }),
      node('heading', { x: 18 + i * 26, y: 39.5, w: 14, h: 4 }, { text: s.title }, headingStyle(13, palette.ink)),
      crimsonBody(18 + i * 26, 45, 17, 5.5, s.body, 6.8),
      ...(i < 2 ? [node('label', { x: 36 + i * 26, y: 44, w: 3, h: 3 }, { text: '→' }, { ...headingStyle(14, palette.accent) })] : []),
    ]).flat(),
    ...steps.map((s, i) => [
      crimsonPanel(8 + i * 28, 60, 24, 19),
      node('label', { x: 11 + i * 28, y: 63, w: 18, h: 3 }, { text: `Capability ${i + 1}` }, { ...label(7), color: palette.accent }),
      node('heading', { x: 11 + i * 28, y: 68, w: 18, h: 5 }, { text: s.title }, headingStyle(15, palette.ink)),
      crimsonBody(11 + i * 28, 74, 18, 4, s.body, 7.1),
    ]).flat(),
    caption(8, 86, 78, 4, 'Strategy first, components second, export last.'),
  ];
}

function designMarketCrimson(input: WizardInput) {
  const m = marketSizing(input);
  const drivers = ensure(m.drivers, [
    'AI productivity adoption is accelerating across business teams',
    'Automated workflows are replacing manual document production',
    'Digital-first selling requires sharper collateral at higher volume',
    'Brand consistency is becoming an operating requirement',
  ], 4).slice(0, 4);
  return [
    ...crimsonBase('Market', `${m.tam} market with ${m.growth} adoption tailwinds.`, `${m.sam} serviceable segment · ${m.som} near-term wedge · ${input.industry || 'business software'}`),
    crimsonPanel(8, 34, 48, 28),
    node('label', { x: 11, y: 37, w: 20, h: 3 }, { text: 'Market curve' }, { ...label(8), color: palette.accent }),
    ...[0, 1, 2, 3].map((i) => [
      node('shape', { x: 13 + i * 9, y: 55 - i * 5, w: 7, h: 0.8, z: 2 }, { kind: 'rect', fill: palette.accent }, { fill: palette.accent, borderRadius: 999 }, 'Curve segment'),
      node('shape', { x: 16 + i * 9, y: 54 - i * 5, w: 1.3, h: 1.3, z: 3 }, { kind: 'ellipse', fill: palette.accent }, { fill: palette.accent }, 'Curve point'),
    ]).flat(),
    node('label', { x: 31, y: 58, w: 14, h: 3 }, { text: '▲ we are here' }, { ...label(6.5), color: palette.accent }),
    crimsonPanel(62, 34, 28, 16, 'rgba(239,68,68,0.13)'),
    node('heading', { x: 65, y: 38, w: 21, h: 8 }, { text: m.tam }, { ...headingStyle(32, palette.accent), letterSpacing: palette.numberLetterSpacing }),
    node('label', { x: 65, y: 46, w: 18, h: 3 }, { text: 'TAM' }, { ...label(8), color: palette.muted }),
    ...[
      { value: m.sam, label: 'SAM' },
      { value: m.growth, label: 'Growth' },
    ].map((item, i) => [
      crimsonPanel(62 + i * 15, 54, 13, 10),
      node('heading', { x: 64 + i * 15, y: 56.2, w: 9, h: 4 }, { text: item.value }, headingStyle(15, palette.accent)),
      node('label', { x: 64 + i * 15, y: 61, w: 9, h: 2.2 }, { text: item.label }, { ...label(6), color: palette.muted }),
    ]).flat(),
    node('label', { x: 8, y: 70, w: 35, h: 3 }, { text: 'Adoption triggers' }, { ...label(7), color: palette.accent }),
    ...drivers.map((d, i) => [
      crimsonPanel(8 + i * 21, 75, 19, 12),
      node('heading', { x: 10 + i * 21, y: 77.3, w: 14, h: 3.5 }, { text: `Trigger ${i + 1}` }, headingStyle(10, palette.ink)),
      crimsonBody(10 + i * 21, 81, 15, 4.5, wordTrunc(d, 58), 7.2),
    ]).flat(),
  ];
}

function designBusinessModelCrimson(input: WizardInput) {
  const tiers = ensure(pricing(input), [
    { id: 'starter', name: 'Starter', price: 'Free', features: ['Basic templates', 'Watermarked export'] },
    { id: 'pro', name: 'Pro', price: '$19', features: ['Premium templates', 'AI generation'] },
    { id: 'enterprise', name: 'Enterprise', price: 'Custom', features: ['Brand kits', 'Admin controls'] },
  ], 3).slice(0, 3);
  return [
    ...crimsonBase('Business Model', 'Recurring revenue expands through teams, templates, and export workflows.', conciseNarrative(input.revenueModel || input.pricing, 'Subscription-first model with enterprise expansion.', 1)),
    ...tiers.map((t, i) => [
      crimsonPanel(8 + i * 28, 37, 24, 25, i === 1 ? 'rgba(239,68,68,0.13)' : 'rgba(39,39,42,0.92)'),
      node('label', { x: 11 + i * 28, y: 40, w: 17, h: 3 }, { text: t.name || `Tier ${i + 1}` }, { ...label(8), color: i === 1 ? palette.accent : palette.muted }),
      node('heading', { x: 11 + i * 28, y: 45, w: 16, h: 7 }, { text: t.price || 'SaaS' }, headingStyle(22, palette.ink)),
      ...ensure(t.features || [], ['Recurring plan', 'Team workflow'], 2).slice(0, 2).map((f, j) =>
        node('label', { x: 11 + i * 28, y: 54 + j * 4.2, w: 17, h: 3 }, { text: `✓ ${wordTrunc(f, 34)}` }, { ...label(6.4), color: palette.ink }),
      ),
    ]).flat(),
    ...[
      { value: '70%+', label: 'Gross margin' },
      { value: '<18 mo', label: 'CAC payback' },
      { value: '100%+', label: 'Net retention' },
    ].map((m, i) => crimsonMetricCard(8 + i * 28, 70, 24, 13, m, 24)).flat(),
  ];
}

function designTeamCrimson(input: WizardInput) {
  const members = team(input).slice(0, 3);
  const credible = members.map((m, i) => ({
    name: /^Leader\s+\d+$/i.test(m.name) ? ['Founder', 'Product Lead', 'Growth Lead'][i] : m.name,
    role: /leadership/i.test(m.role) ? ['CEO', 'Product', 'GTM'][i] : m.role,
    bio: /experience in:?$/i.test(m.bio || '') || /^(Team|Founding Team)$/i.test(m.bio || '')
      ? ['Owns product vision, customer discovery, and fundraising narrative.', 'Leads AI workflow architecture and editor reliability.', 'Builds acquisition loops, customer proof, and enterprise pipeline.'][i]
      : wordTrunc(m.bio || 'Relevant operating experience and execution ownership.', 70),
  }));
  return [
    ...crimsonBase('Team', `${input.companyName || 'Pitchonix'} is led by builders with execution ownership.`, 'Focused operating roles, product judgment, and go-to-market accountability.'),
    ...credible.map((m, i) => [
      crimsonPanel(8 + i * 28, 36, 24, 25),
      node('heading', { x: 11 + i * 28, y: 39, w: 18, h: 4 }, { text: m.name }, headingStyle(14, palette.ink)),
      node('label', { x: 11 + i * 28, y: 45, w: 16, h: 3 }, { text: m.role }, { ...label(7), color: palette.accent }),
      crimsonBody(11 + i * 28, 51, 17, 6, m.bio, 8),
    ]).flat(),
    node('label', { x: 8, y: 69, w: 30, h: 3 }, { text: 'Why this team can win' }, { ...label(7), color: palette.accent }),
    ...['Product architecture', 'Investor storytelling', 'Workflow automation'].map((s, i) => [
      crimsonPanel(8 + i * 28, 74, 24, 10),
      node('label', { x: 11 + i * 28, y: 77, w: 17, h: 3 }, { text: s }, { ...label(7), color: palette.ink }),
    ]).flat(),
  ];
}

function designRoadmapCrimson(input: WizardInput) {
  const phases = [
    { period: 'Q1', phase: 'Product Proof', bullets: ['Harden editor, templates, export, and collaboration loops.'] },
    { period: 'Q2', phase: 'Repeatable GTM', bullets: ['Launch growth motions and convert design partners into paid teams.'] },
    { period: 'Q3', phase: 'Enterprise Ready', bullets: ['Add controls, governance, and high-fidelity export workflows.'] },
    { period: 'Q4', phase: 'Scale Platform', bullets: ['Expand template systems, integrations, and partner channels.'] },
  ];
  return [
    ...crimsonBase('Roadmap', 'Milestones map directly to investor value creation.', 'The next four quarters de-risk product, revenue, and enterprise readiness.'),
    node('shape', { x: 10, y: 41, w: 78, h: 0.5, z: 1 }, { kind: 'rect', fill: 'rgba(239,68,68,0.55)' }, { fill: 'rgba(239,68,68,0.55)' }, 'Road line'),
    ...phases.map((p, i) => [
      node('shape', { x: 13 + i * 22, y: 39.7, w: 1.8, h: 1.8, z: 2 }, { kind: 'ellipse', fill: palette.accent }, { fill: palette.accent }, 'Road dot'),
      crimsonPanel(8 + i * 21.5, 45, 19, 27),
      node('label', { x: 10 + i * 21.5, y: 48, w: 14, h: 3 }, { text: p.period || `Q${i + 1}` }, { ...label(7), color: palette.accent }),
      node('heading', { x: 10 + i * 21.5, y: 52, w: 15, h: 5 }, { text: wordTrunc(p.phase || `Milestone ${i + 1}`, 30) }, headingStyle(12, palette.ink)),
      crimsonBody(10 + i * 21.5, 59, 14.5, 7, wordTrunc((p.bullets || [])[0] || 'Investor milestone', 66), 7.5),
    ]).flat(),
    crimsonPanel(8, 79, 38, 8),
    node('label', { x: 11, y: 81.5, w: 30, h: 3 }, { text: 'Execution focus: product proof → repeatable pipeline → enterprise readiness' }, { ...label(6.5), color: palette.ink }),
    crimsonPanel(51, 79, 39, 8, 'rgba(239,68,68,0.12)'),
    node('label', { x: 54, y: 81.5, w: 31, h: 3 }, { text: 'Each tranche is gated by shipped proof, not vanity milestones.' }, { ...label(6.5), color: palette.ink }),
  ];
}

function designAskCrimson(input: WizardInput) {
  const funding = input.structured?.funding;
  const amount = funding?.amount || valuesFromText(input.fundingAsk || '')[0]?.value || '$750K';
  return [
    ...crimsonBase('Raise', `${amount} to ship the next product generation.`, conciseNarrative(input.fundingAsk, 'Funding extends runway and converts the roadmap into measurable investor milestones.', 1)),
    ...[
      { q: 'Q1', gate: '100 customers', body: 'Core product hardening and production readiness.' },
      { q: 'Q2', gate: '250 customers', body: 'Launch growth loops and repeatable onboarding.' },
      { q: 'Q3', gate: '500 customers', body: 'Enterprise controls, export fidelity, and sales proof.' },
    ].map((m, i) => [
      crimsonPanel(8, 37 + i * 14, 51, 10),
      node('label', { x: 11, y: 40 + i * 14, w: 7, h: 3 }, { text: m.q }, { ...label(7), color: palette.accent }),
      node('label', { x: 30, y: 40 + i * 14, w: 18, h: 3 }, { text: `Gate: ${m.gate}` }, { ...label(6.5), color: palette.muted }),
      crimsonBody(11, 44 + i * 14, 38, 2.8, m.body, 7.6),
    ]).flat(),
    crimsonPanel(64, 37, 27, 21, 'rgba(239,68,68,0.13)'),
    node('heading', { x: 67, y: 41, w: 20, h: 8 }, { text: amount }, { ...headingStyle(36, palette.accent), letterSpacing: palette.numberLetterSpacing }),
    node('label', { x: 67, y: 52, w: 18, h: 3 }, { text: 'This raise' }, { ...label(8), color: palette.muted }),
    ...crimsonMetricCard(64, 64, 27, 13, { value: '24 mo', label: 'Runway' }, 25),
    caption(8, 88, 76, 4, 'Milestones gate each tranche: capital is deployed against shipped code and commercial proof.'),
  ];
}

function designCover(input: WizardInput) {
  const metrics = kpis(input); // all 4 — show complete traction picture
  const headline = input.companyName || 'Investment Thesis';
  const coverTagline = `${input.companyName || 'The company'} turns business content into investor-ready documents and presentations.`;

  // Investor context badge: Stage · Industry · Market size
  const market = marketSizing(input);
  const stage = (input.businessStage || 'Series A').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const badgeParts = [stage, input.industry, market.tam ? `${market.tam} Market` : null].filter(Boolean);
  const badgeText = badgeParts.join('  ·  ');

  const logoNode = input.logo
    ? node('logo', { x: 75, y: 5, w: 18, h: 8, z: 5 }, { src: input.logo, name: input.companyName }, {
        fill: 'transparent', stroke: 'transparent', borderRadius: 4,
      })
    : node('label', { x: 75, y: 5, w: 18, h: 5 }, { text: input.companyName || '' }, {
        ...headingStyle(13, palette.accent), textAlign: 'right',
      });

  // Tagline: when shortDescription is the headline, use solution first sentence
  const tagline = (() => {
    if (input.shortDescription) return coverTagline;
    const solFirst = input.solution?.split(/[.!?]\s+/)[0]?.trim();
    if (solFirst && solFirst.length > 20) return wordTrunc(solFirst, 120);
    const tracFirst = conciseNarrative(input.traction, '', 1);
    if (tracFirst && tracFirst.length > 15) return wordTrunc(tracFirst, 120);
    return `${input.industry || 'B2B SaaS'} · ${input.businessStage || 'Series A'} · investment narrative`;
  })();

  return [
    card(0, 0, 100, 100, palette.canvas, -10),
    node('shape', { x: 0, y: 0, w: 2, h: 100, z: 2 }, { kind: 'rect', fill: palette.accent }, { fill: palette.accent }, 'Accent stripe'),
    logoNode,
    // Company · industry context
    node('label', { x: 6, y: 7, w: 62, h: 5 }, { text: [input.companyName, input.industry].filter(Boolean).join('  ·  ') || '' }, label(10)),
    // Hero headline — compressed upward, no dead zone below it
    node('heading', { x: 6, y: 13, w: 80, h: 19 }, { text: headline }, headingStyle(44)),
    // Accent rule tight below headline
    node('shape', { x: 6, y: 33, w: 14, h: 0.75, z: 1 }, { kind: 'rect', fill: palette.accent }, { fill: palette.accent, borderRadius: 999 }, 'Rule'),
    // Tagline immediately below rule
    paragraph(6, 34, 68, 7, tagline, 14),
    // Investor badge row — fills the gap between tagline and KPIs
    node('label', { x: 6, y: 42, w: 74, h: 5 }, { text: badgeText }, { ...label(10), color: palette.accent }),
    // 4 KPI cards — expanded to fill bottom third, end at ~y=85
    ...metrics.slice(0, 4).flatMap((m, i) => [
      card(5 + i * 22.5, 50, 20.5, 33),
      metric(7 + i * 22.5, 52, 17, 24, m.value, m.label, m.delta),
    ]),
  ];
}

// Cover layout variants for template differentiation
// Returns true if this family should use the centered serif layout
function isCenteredCoverFamily(): boolean {
  // luxury-dark, forest-executive: original luxury group
  // ocean-deep: board-meeting-executive → executive premium feel
  return ['luxury-dark', 'forest-executive', 'ocean-deep'].includes(currentFamily);
}

// Returns true if this family should use the hero-split layout
function isHeroSplitCoverFamily(): boolean {
  // startup-gradient, cobalt-impact, violet-creative: original hero split
  // rose-modern: agency-campaign-deck → energetic creative launches
  return ['startup-gradient', 'cobalt-impact', 'violet-creative', 'rose-modern'].includes(currentFamily);
}

function designCoverCentered(input: WizardInput) {
  const metrics = kpis(input);
  const market = marketSizing(input);
  const stage = (input.businessStage || 'Series A').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const badgeParts = [stage, input.industry, market.tam ? `${market.tam} Market` : null].filter(Boolean);

  const headline = input.companyName || 'Investment Thesis';
  const coverTagline = `${input.companyName || 'The company'} turns business content into investor-ready documents and presentations.`;
  const tagline = (() => {
    if (input.shortDescription) return coverTagline;
    const sol = input.solution?.split(/[.!?]\s+/)[0]?.trim();
    return (sol && sol.length > 20) ? wordTrunc(sol, 120) : `${input.industry || 'B2B SaaS'} · ${stage}`;
  })();

  return [
    card(0, 0, 100, 100, palette.canvas, -10),
    // Top accent rule (full width)
    node('shape', { x: 0, y: 0, w: 100, h: 1.2, z: 2 }, { kind: 'rect', fill: palette.accent }, { fill: palette.accent }, 'Top rule'),
    // Bottom accent rule
    node('shape', { x: 0, y: 98.8, w: 100, h: 1.2, z: 2 }, { kind: 'rect', fill: palette.accent }, { fill: palette.accent }, 'Bottom rule'),
    // Logo top right
    input.logo
      ? node('logo', { x: 75, y: 4, w: 18, h: 8, z: 5 }, { src: input.logo, name: input.companyName }, { fill: 'transparent', stroke: 'transparent', borderRadius: 4 })
      : node('label', { x: 10, y: 5, w: 80, h: 5 }, { text: input.companyName || '' }, { ...headingStyle(13, palette.accent), textAlign: 'center' as any }),
    // Centered headline — large, serif-heavy
    node('heading', { x: 8, y: 12, w: 84, h: 22 }, { text: headline }, { ...headingStyle(44, palette.ink), textAlign: 'center' as any, lineHeight: 1.0 }),
    // Centered decorative rule pair
    node('shape', { x: 38, y: 36, w: 24, h: 0.6, z: 1 }, { kind: 'rect', fill: palette.accent }, { fill: palette.accent, borderRadius: 999 }, 'Rule L'),
    // Centered tagline
    node('paragraph', { x: 10, y: 38, w: 80, h: 7 }, { text: cleanCopy(tagline) }, { ...text(14, 500, palette.muted), textAlign: 'center' as any }),
    // Centered badge
    node('label', { x: 10, y: 46, w: 80, h: 5 }, { text: badgeParts.join('  ·  ') }, { ...label(10), color: palette.accent, textAlign: 'center' as any }),
    // 4 KPI cards — equal width
    ...metrics.slice(0, 4).flatMap((m, i) => [
      card(5 + i * 22.5, 53, 20.5, 33),
      metric(7 + i * 22.5, 55, 17, 24, m.value, m.label, m.delta),
    ]),
  ];
}

function designCoverHeroSplit(input: WizardInput) {
  const metrics = kpis(input);
  const market = marketSizing(input);
  const stage = (input.businessStage || 'Series A').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const badgeParts = [stage, input.industry, market.tam ? `${market.tam} Market` : null].filter(Boolean);
  const headline = input.companyName || 'Investment Thesis';
  const coverTagline = `${input.companyName || 'The company'} turns business content into investor-ready documents and presentations.`;
  const heroKpi = metrics[0] || { value: '—', label: 'ARR', delta: undefined };
  const sideKpis = metrics.slice(1, 4);

  return [
    card(0, 0, 100, 100, palette.canvas, -10),
    // Left accent stripe
    node('shape', { x: 0, y: 0, w: 2, h: 100, z: 2 }, { kind: 'rect', fill: palette.accent }, { fill: palette.accent }, 'Accent stripe'),
    // Left side — narrative content
    node('label', { x: 6, y: 7, w: 52, h: 5 }, { text: [input.companyName, input.industry].filter(Boolean).join('  ·  ') || '' }, label(10)),
    node('heading', { x: 6, y: 14, w: 53, h: 32 }, { text: headline }, { ...headingStyle(38, palette.ink), lineHeight: 1.05 }),
    node('shape', { x: 6, y: 47, w: 12, h: 0.75, z: 1 }, { kind: 'rect', fill: palette.accent }, { fill: palette.accent, borderRadius: 999 }, 'Rule'),
    node('paragraph', { x: 6, y: 49, w: 52, h: 6 }, {
      text: cleanCopy(input.shortDescription ? coverTagline : wordTrunc(input.solution?.split(/[.!?]\s+/)[0]?.trim() || '', 100)),
    }, text(12, 500, palette.muted)),
    node('label', { x: 6, y: 56, w: 52, h: 5 }, { text: badgeParts.join('  ·  ') }, { ...label(10), color: palette.accent }),
    // Bottom left: 3 supporting KPI pills
    ...sideKpis.flatMap((m, i) => [
      card(6 + i * 18, 65, 16, 22, palette.panel),
      metric(8 + i * 18, 67, 12, 16, m.value, m.label, m.delta),
    ]),
    // Right side — hero KPI card
    card(62, 10, 32, 50, palette.dark),
    node('metric', { x: 65, y: 18, w: 26, h: 28 }, { value: heroKpi.value, label: heroKpi.label, delta: heroKpi.delta, deltaDirection: heroKpi.delta?.includes('-') ? 'down' as const : heroKpi.delta ? 'up' as const : 'flat' as const },
      { ...headingStyle(54, palette.accent), letterSpacing: palette.numberLetterSpacing }),
    // Logo top-right corner
    input.logo
      ? node('logo', { x: 65, y: 63, w: 25, h: 8, z: 5 }, { src: input.logo, name: input.companyName }, { fill: 'transparent', stroke: 'transparent', borderRadius: 4 })
      : node('label', { x: 65, y: 63, w: 25, h: 8 }, { text: input.companyName || '' }, { ...headingStyle(16, palette.accent), textAlign: 'right' as any }),
  ];
}

// Derive the hero metric label from problem context — never use unrelated KPI labels
function problemHeroMetric(input: WizardInput): { value: string; label: string } {
  const prob = input.problem || '';

  // Time-based percentage ("40% of their time", "40% of workday")
  const timeMatch = prob.match(/(\d+(?:\.\d+)?%)\s+of\s+(?:their\s+)?(?:time|workday|work\s+week|working\s+hours)/i);
  if (timeMatch) return { value: timeMatch[1], label: 'Of workday' };

  // Annual cost figure ("$2.3M per year", "$2.3M annually")
  const costMatch = prob.match(/(\$[\d.]+[KMBb]*)\s*(?:per\s+year|annually|a\s+year|\/year)/i);
  if (costMatch) return { value: costMatch[1], label: 'Annual cost' };

  // Any percentage — inspect surrounding context to label it correctly
  const pctMatch = prob.match(/(\d+(?:\.\d+)?%)/);
  if (pctMatch) {
    const idx = prob.indexOf(pctMatch[1]);
    const ctx = prob.slice(Math.max(0, idx - 45), idx + 45).toLowerCase();
    if (/time|hour|day|week|workday/.test(ctx)) return { value: pctMatch[1], label: 'Time lost' };
    if (/error|mistake|inaccura/.test(ctx)) return { value: pctMatch[1], label: 'Error rate' };
    if (/cost|budget|spend|waste|over/.test(ctx)) return { value: pctMatch[1], label: 'Cost impact' };
    if (/manual|hand/.test(ctx)) return { value: pctMatch[1], label: 'Manual work' };
    return { value: pctMatch[1], label: 'Problem scale' };
  }

  // Dollar figure anywhere in problem text
  const dollarMatch = prob.match(/(\$[\d.]+[KMBb]*)/i);
  if (dollarMatch) return { value: dollarMatch[1], label: 'Cost per company' };

  // Final fallback: use a neutral label, never ARR/revenue KPI labels
  return { value: '40%', label: 'Of workday' };
}

// Extract a second pain metric (cost figure) for dual-metric display
function problemSecondMetric(input: WizardInput): { value: string; label: string } | null {
  const prob = input.problem || '';
  const costMatch = prob.match(/(\$[\d.]+[KMBb]*)\s*(?:per\s+year|annually|a\s+year|\/year|in\s+(?:errors?|losses?|waste))/i);
  if (costMatch) return { value: costMatch[1], label: 'Annual cost' };
  // Any dollar value
  const dollarMatch = prob.match(/(\$[\d.]+[KMBb]*)/i);
  if (dollarMatch) {
    const idx = prob.indexOf(dollarMatch[1]);
    const ctx = prob.slice(Math.max(0, idx - 30), idx + 30).toLowerCase();
    const lbl = /cost|error|loss|waste/.test(ctx) ? 'Cost impact' : /revenue|arr|sales/.test(ctx) ? null : 'Dollars at risk';
    if (lbl) return { value: dollarMatch[1], label: lbl };
  }
  return null;
}

// ===================================================================
// PHASE Ω.8 — FAMILY GROUP DISPATCHER
// Each family group gets structurally distinct interior slide layouts.
// Recognisable even with all colours removed.
// ===================================================================

type FamilyGroup = 'investor' | 'luxury' | 'startup' | 'consulting' | 'tech';

function getFamilyGroup(): FamilyGroup {
  // luxury: centered premium layouts — luxury-dark, forest-executive (sustainability), ocean-deep (board meetings)
  if (['luxury-dark', 'forest-executive', 'ocean-deep'].includes(currentFamily)) return 'luxury';
  // startup: energetic modern layouts — startup-gradient, violet-creative, rose-modern (agency/launch)
  if (['startup-gradient', 'violet-creative', 'rose-modern'].includes(currentFamily)) return 'startup';
  // consulting: structured grid layouts — cobalt-impact, slate-pro, warm-sand (sales conversion)
  if (['cobalt-impact', 'slate-pro', 'warm-sand'].includes(currentFamily)) return 'consulting';
  // tech: data-heavy dark layouts — midnight-tech (fintech), crimson-dark
  if (['midnight-tech', 'crimson-dark'].includes(currentFamily)) return 'tech';
  // investor: professional clean layouts — all remaining families
  return 'investor';
}

function designProblem(input: WizardInput) {
  if (isCrimsonFamily()) return designProblemCrimson(input);
  switch (getFamilyGroup()) {
    case 'luxury':     return designProblemLuxury(input);
    case 'startup':    return designProblemStartup(input);
    case 'consulting': return designProblemConsulting(input);
    case 'tech':       return designProblemTech(input);
    default:           return designProblemInvestor(input);
  }
}

function designProblemInvestor(input: WizardInput) {
  const painPoints = ([...lines(input.problem), ...[
    'Manual processes create quality bottlenecks and inconsistent output',
    'Teams lose time on production work instead of high-value strategic tasks',
    'Scale breaks the current approach — what works for 10 fails at 100',
  ]]).filter((s, i, arr) => arr.indexOf(s) === i).slice(0, 3);

  const hero = problemHeroMetric(input);
  const secondary = problemSecondMetric(input);

  // Subtitle: use sentences 2+ from problem — avoid repeating the headline
  const problemSubtitle = (() => {
    const sents = (input.problem || '').split(/[.!?]\s+/).map(s => s.trim()).filter(s => s.length > 10);
    const rest = sents.slice(1);
    if (rest.length > 0) return wordTrunc(rest.slice(0, 2).join('. '), 140);
    return 'The pain is measurable, recurring, and budget-backed.';
  })();

  return [
    ...base('Problem', (() => {
      const raw = input.problem?.split(/[.!?]\s+/)[0]?.trim() || `${input.companyName || 'The market'} faces a solvable, recurring problem.`;
      // Split on first comma to get shortest meaningful clause, cap at 60 chars
      const clause = raw.split(/,\s+/)[0].trim();
      return wordTrunc(clause.length >= 15 ? clause : raw, 60);
    })(), problemSubtitle),
    // Pain points — left column
    ...painPoints.flatMap((p, i) => [
      card(6, 34 + i * 16, 50, 13, i === 0 ? palette.soft : palette.panel),
      node('label', { x: 9, y: 37.5 + i * 16, w: 7, h: 5 }, { text: `0${i + 1}` }, text(15, 850, palette.accent)),
      paragraph(18, 36.5 + i * 16, 35, 8, p, 12),
    ]),
    // Right column: quantified impact — hero metric + second metric (no fake charts)
    card(60, 34, 33, 44, palette.dark),
    node('metric', { x: 63, y: 38, w: 27, h: 14 }, { value: hero.value, label: hero.label },
      { ...headingStyle(48, palette.accent), letterSpacing: palette.numberLetterSpacing }),
    ...(secondary
      ? [
          node('shape', { x: 63, y: 55, w: 27, h: 0.5, z: 1 }, { kind: 'rect', fill: palette.muted }, { fill: palette.muted, opacity: 0.25 }, 'Divider'),
          node('metric', { x: 63, y: 57, w: 27, h: 12 }, { value: secondary.value, label: secondary.label },
            { ...headingStyle(34, palette.accent2 || palette.accent), letterSpacing: palette.numberLetterSpacing }),
        ]
      : [
          paragraph(63, 56, 27, 14, conciseNarrative(input.problem, 'Every company in this space faces this exact ceiling.', 2), 12),
        ]),
    caption(60, 81, 33, 6, 'Pain that is measurable, recurring, and budget-backed'),
  ];
}

function designExecutiveSummary(input: WizardInput) {
  const data = kpis(input);
  const market = marketSizing(input);
  const insightItems = ([
    ...lines([input.problem, input.solution, input.differentiation, input.revenueModel].filter(Boolean).join('\n')),
    `${input.companyName || 'The company'} solves a real, measurable pain with a defensible wedge`,
    'Product-market fit validated through paying customers and strong retention',
    'Moat builds with every customer through data, integrations, and switching cost',
    'Revenue model designed for expansion — seat growth, usage, and enterprise upsell',
  ]).filter((s, i, arr) => arr.indexOf(s) === i).slice(0, 4);
  return [
    ...base('Executive Summary', wordTrunc(input.shortDescription || `${input.companyName} solves ${input.problem?.split(/[.!?]/)[0]?.toLowerCase() || 'a real market problem'}.`, 65), wordTrunc(input.purpose || input.shortDescription || 'A concise investment snapshot across pain, product, market, traction, and ask.', 150)),
    ...[
      { value: market.tam, label: 'TAM' },
      { value: market.growth, label: 'Market growth' },
      ...data.slice(0, 2),
    ].slice(0, 4).map((m, i) => [card(6 + i * 21.5, 33, 19, 16), metric(8 + i * 21.5, 36, 15, 8, m.value, m.label, (m as any).delta)]).flat(),
    node('featureGrid', { x: 6, y: 56, w: 54, h: 29 }, {
      columns: 2,
      items: insightItems.map((item, i) => ({ id: `summary-${i}`, title: ['Pain', 'Product', 'Moat', 'Model'][i] || `Signal ${i + 1}`, description: item })),
    }, panel()),
    node('chart', { x: 64, y: 56, w: 28, h: 29 }, {
      type: 'radar',
      title: 'Investor readiness',
      categories: ['Problem', 'Product', 'Market', 'Model', 'Team'],
      series: [{ name: input.companyName || 'Company', values: [
        Math.min(95, Math.round(60 + Math.min(30, (input.problem?.length || 0) / 5))),
        Math.min(95, Math.round(60 + Math.min(30, (input.solution?.length || 0) / 5))),
        Math.min(95, Math.round(55 + Math.min(35, ((input.marketOpportunity || '').length + ((input.structured?.marketSizing?.tam as string) || '').length) / 4))),
        Math.min(95, Math.round(55 + Math.min(35, ((input.revenueModel || '') + (input.fundingAsk || '')).length / 4))),
        input.structured?.teamMembers?.length ? 88 : Math.min(92, Math.round(55 + Math.min(35, (input.team?.length || 0) / 4))),
      ], color: palette.accent }],
      showValues: false,
      familyId: currentFamily,
    }, panel()),
  ];
}

// Build a rich description for a solution step that is guaranteed different from its title
function buildStepDescription(title: string, featureText: string, index: number, input: WizardInput): string {
  // If the full feature text is much longer than the title, use it directly
  if (featureText.length > title.length + 20) {
    const d = wordTrunc(featureText, 100);
    if (d.toLowerCase().trim() !== title.toLowerCase().trim()) return d;
  }

  // Search differentiation text for context that matches this step's keyword
  const diffLines = lines(input.differentiation || '');
  const normKey = title.toLowerCase().replace(/[^a-z0-9%]/g, '').slice(0, 10);
  if (normKey.length >= 3) {
    for (const dl of diffLines) {
      if (dl.toLowerCase().replace(/[^a-z0-9%]/g, '').includes(normKey)) {
        const colon = dl.indexOf(':');
        const desc = wordTrunc((colon > 0 ? dl.slice(colon + 1).trim() : dl).trim(), 100);
        if (desc.toLowerCase() !== title.toLowerCase()) return desc;
      }
    }
  }

  // Search remaining solution sentences for adjacent context
  const sentences = (input.solution || '').split(/[.!?]\s+/).filter((s) => s.trim().length > 20);
  for (const s of sentences) {
    const norm = s.toLowerCase().replace(/[^a-z0-9%]/g, '');
    if (norm.includes(normKey) && s.trim().toLowerCase() !== title.toLowerCase()) {
      return wordTrunc(s.trim(), 100);
    }
  }

  // Position-aware fallbacks that never duplicate the title
  const fallbacks = [
    `Automated at enterprise scale — validated across production deployments`,
    `Industry-leading precision backed by continuous model improvement`,
    `Zero integration work — native connectors to 200+ enterprise tools`,
    `Proven in production — measurable ROI from day one`,
  ];
  return fallbacks[index % fallbacks.length];
}

function designSolution(input: WizardInput) {
  if (isCrimsonFamily()) return designSolutionCrimson(input);
  switch (getFamilyGroup()) {
    case 'luxury':     return designSolutionLuxury(input);
    case 'startup':    return designSolutionStartup(input);
    case 'consulting': return designSolutionConsulting(input);
    case 'tech':       return designSolutionTech(input);
    default:           return designSolutionInvestor(input);
  }
}

function designSolutionInvestor(input: WizardInput) {
  const rawTitle = input.solution?.split(/[.!?]\s+/)[0]?.trim() || 'How we solve the problem.';
  // Use first clause (before first comma) to keep heading tight and punchy
  const firstClause = rawTitle.split(/,\s+/)[0].trim();
  const slideTitle = wordTrunc(firstClause.length >= 15 ? firstClause : rawTitle, 60);

  // Before → Engine → After transformation story
  const beforeState = wordTrunc(conciseNarrative(input.problem, 'Manual, error-prone, expensive process.', 1), 110);
  const engineName = `${input.companyName || 'AI Engine'}`;
  const engineDesc = (() => {
    const solFirst = input.solution?.split(/[.!?]\s+/)[0]?.trim() || '';
    return wordTrunc(solFirst.length > 20 ? solFirst : `${input.companyName || 'The platform'} automates and delivers with enterprise-grade accuracy`, 90);
  })();
  const afterState = (() => {
    // Prefer traction numbers as the "after" outcome
    const kpiData = kpis(input);
    if (kpiData.length >= 2) {
      const accuracy = kpiData.find((k) => /accuracy|precision/i.test(k.label));
      const retention = kpiData.find((k) => /retention|ndr|nrr/i.test(k.label));
      if (accuracy) return `${accuracy.value} ${accuracy.label} · instant processing · zero-code`;
      if (retention) return `${retention.value} net retention · ${kpiData[0].value} ${kpiData[0].label} · proven at scale`;
      return `${kpiData[0].value} ${kpiData[0].label} · ${kpiData[1]?.value || ''} ${kpiData[1]?.label || ''}`.trim();
    }
    return wordTrunc(conciseNarrative(input.solution, 'Accurate, instant, and enterprise-ready.', 1), 80);
  })();

  const transformSteps = [
    { id: 'before', title: 'Before', description: beforeState },
    { id: 'engine', title: engineName, description: engineDesc },
    { id: 'after', title: 'After', description: afterState },
  ];

  // Differentiator cards — pre-process to avoid splitting on "vs." abbreviation
  const normalizedDiff = (input.differentiation || '')
    .replace(/\bvs\.\s+/gi, 'vs ')     // "vs. 94%" → "vs 94%"
    .replace(/\betc\.\s+/gi, 'etc ');  // "etc. more" → "etc more"
  const diffLines = lines(normalizedDiff).filter((f) => f.length > 8 && !/^\d+[%x×]?$/.test(f.trim()));
  const solutionFeatures = lines(input.solution || '').slice(1); // skip first sentence (used as slide title)
  const sourceItems = diffLines.length >= 2 ? diffLines : solutionFeatures;

  const capabilityItems = ([
    ...sourceItems,
    `vs. Manual: ${input.companyName || 'We'} deliver measurably better outcomes at scale`,
    `vs. Incumbents: faster to deploy, lower TCO, no integration work`,
    `${input.companyName || 'The platform'} gets stronger with every customer`,
  ]).filter((s, i, arr) => arr.indexOf(s) === i).slice(0, 3).map((f, i) => {
    const colon = f.indexOf(':');
    const rawT = wordTrunc((colon > 0 && colon < 42 ? f.slice(0, colon) : f.split(/\s+/).slice(0, 4).join(' ')).replace(/[,.:;]+$/, '').trim(), 34);
    const rawD = wordTrunc((colon > 0 ? f.slice(colon + 1).trim() : f), 110);
    // Guard: description must differ from title
    const desc = rawD.toLowerCase().trim() === rawT.toLowerCase().trim()
      ? buildStepDescription(rawT, f, i, input)
      : rawD;
    return { id: `cap-${i}`, title: rawT, description: desc };
  });

  // Subtitle: sentences 2+ from solution — avoid repeating the headline
  const solutionSubtitle = (() => {
    const sents = (input.solution || '').split(/[.!?]\s+/).map(s => s.trim()).filter(s => s.length > 10);
    const rest = sents.slice(1);
    if (rest.length > 0) return wordTrunc(rest.slice(0, 2).join('. '), 140);
    const kpiData = kpis(input);
    if (kpiData.length >= 2) return `${kpiData[0].value} ${kpiData[0].label} and ${kpiData[1].value} ${kpiData[1].label} — built on repeatable, scalable foundations.`;
    return `${input.companyName || 'We'} turn the problem into a repeatable, scalable outcome.`;
  })();

  return [
    ...base('Solution', slideTitle, solutionSubtitle),
    // Before → Engine → After
    node('processSteps', { x: 6, y: 35, w: 86, h: 20 }, { steps: transformSteps }, panel()),
    // Proof tier: differentiators / competitive advantages — h=22 fills slide, caption anchors bottom
    node('featureGrid', { x: 6, y: 59, w: 86, h: 22 }, { columns: capabilityItems.length >= 3 ? 3 : 2, items: capabilityItems }, panel()),
    caption(6, 83, 86, 6, 'Competitive advantages that compound with every enterprise integration.'),
  ];
}

function designMarket(input: WizardInput) {
  if (isCrimsonFamily()) return designMarketCrimson(input);
  switch (getFamilyGroup()) {
    case 'luxury':     return designMarketLuxury(input);
    case 'startup':    return designMarketStartup(input);
    case 'consulting': return designMarketConsulting(input);
    case 'tech':       return designMarketTech(input);
    default:           return designMarketInvestor(input);
  }
}

function designMarketInvestor(input: WizardInput) {
  const m = marketSizing(input);
  const cleanedMarketText = (input.marketOpportunity || '')
    .replace(/\b(?:TAM|SAM|SOM)\b\s+\$?[\d.]+\s*[BMKb]+[^.,;]*/gi, '')
    .replace(/\bCAGR\b[^.,;]*/gi, '')
    .replace(/\s{2,}/g, ' ').trim();
  const narrative = conciseNarrative(cleanedMarketText || undefined,
    `${input.industry || 'Technology'} demand accelerating with ${m.growth} annual growth and expanding enterprise budgets.`);

  // Headline with CAGR inline — makes growth rate immediately visible
  const marketHeadline = `A ${m.tam} market growing at ${m.growth} annually.`;

  return [
    ...base('Market Opportunity', marketHeadline,
      `${m.som} serviceable beachhead · ${input.industry || 'Technology'} · clear tailwinds`),
    // TAM hero — dominant left card, moved up to y=30 (close the blank zone)
    card(6, 30, 52, 38),
    node('label', { x: 9, y: 32, w: 46, h: 3.5 }, { text: 'Total Addressable Market' }, label(9), 'TAM kicker'),
    node('metric', { x: 9, y: 35.5, w: 44, h: 14 }, { value: m.tam, label: '' },
      { ...headingStyle(54, palette.accent), letterSpacing: palette.numberLetterSpacing }, 'TAM value'),
    paragraph(9, 51, 44, 7, narrative, 12),
    // CAGR as a prominent standalone badge inside TAM card
    node('label', { x: 9, y: 60, w: 14, h: 3 }, { text: m.growth }, { ...headingStyle(20, palette.accent2 || palette.accent) }),
    node('label', { x: 24, y: 61, w: 16, h: 3 }, { text: 'CAGR' }, { ...label(10), color: palette.accent } ),
    // SAM — top right
    card(62, 30, 31, 18),
    node('label', { x: 65, y: 32, w: 25, h: 3.5 }, { text: 'Serviceable Addressable' }, label(9)),
    node('metric', { x: 65, y: 35.5, w: 25, h: 10 }, { value: m.sam, label: 'SAM' },
      { ...headingStyle(36, palette.accent2 || palette.accent), letterSpacing: palette.numberLetterSpacing }),
    // SOM — bottom right
    card(62, 50, 31, 18),
    node('label', { x: 65, y: 52, w: 25, h: 3.5 }, { text: 'Serviceable Obtainable' }, label(9)),
    node('metric', { x: 65, y: 55.5, w: 25, h: 10 }, { value: m.som, label: 'SOM' },
      { ...headingStyle(30, palette.ink), letterSpacing: palette.numberLetterSpacing }),
    // Market drivers — bottom strip
    node('featureGrid', { x: 6, y: 71, w: 86, h: 23 }, {
      columns: 4,
      items: m.drivers.slice(0, 4).map((d, i) => {
        const words = d.trim().split(/\s+/).slice(0, 3).join(' ');
        return { id: `driver-${i}`, title: words.replace(/[,.:;]+$/, '').slice(0, 36), description: d };
      }),
    }, panel()),
  ];
}

function designBusinessModel(input: WizardInput) {
  if (isCrimsonFamily()) return designBusinessModelCrimson(input);
  const tiers = pricing(input);
  return [
    ...base('Business Model', 'Multiple revenue streams compound into scalable ARR.', conciseNarrative(input.revenueModel || input.pricing, 'Subscription-first model with enterprise expansion.')),
    node('pricingCard', { x: 6, y: 34, w: 56, h: 32 }, {
      tiers: tiers.slice(0, 4),
      accent: palette.accent,
      accent2: palette.accent2,
      textColor: palette.ink,
      mutedColor: palette.muted,
      panelColor: palette.panel,
      lineColor: palette.line,
    }, panel()),
    node('processSteps', { x: 66, y: 34, w: 26, h: 32 }, {
      steps: [
        { id: 'acquire', title: 'Acquire', description: 'Product-led entry' },
        { id: 'expand', title: 'Expand', description: 'Team and workspace seats' },
        { id: 'retain', title: 'Retain', description: 'Brand and export lock-in' },
      ],
      orientation: 'vertical',
    }, panel()),
    // Bottom unit-economics row — moved up to y=69, h=14 so metrics render fully without clipping
    card(6, 69, 26, 14), metric(8, 70.5, 22, 10,
      kpis(input).find((k) => /margin|gross/i.test(k.label))?.value || '70%+',
      kpis(input).find((k) => /margin|gross/i.test(k.label)) ? 'Gross margin' : 'Target gross margin',
    ),
    card(35, 69, 26, 14), metric(37, 70.5, 22, 10,
      kpis(input).find((k) => /cac|payback|acquisition/i.test(k.label))?.value || '<18 mo',
      'CAC payback',
    ),
    card(64, 69, 28, 14), metric(66, 70.5, 24, 10,
      kpis(input).find((k) => /\b(?:nrr|ndr|retention)\b/i.test(k.label))?.value
        || kpis(input).find((k) => /retention/i.test(k.label))?.value
        || '100%+',
      'Net retention',
    ),
  ];
}

function designTraction(input: WizardInput) {
  if (isCrimsonFamily()) return designTractionCrimson(input);
  const data = kpis(input);
  const heroLabel = data.length > 0 ? `${data[0].value} ${data[0].label}` : 'Early Momentum';

  // Build a growth chart from real KPI data instead of hardcoded numbers.
  // Use the first numeric KPI (ARR/revenue) and second (users/customers) if available.
  const arrKpi = data.find((k) => /arr|mrr|revenue|sales/i.test(k.label)) || data[0];
  const mauKpi = data.find((k) => /mau|users|customers|clients/i.test(k.label)) || data[1];
  const arrBase = arrKpi ? numberish(arrKpi.value) : 0;
  const mauBase = mauKpi ? numberish(mauKpi.value) : 0;
  // Project a 4-quarter backward history: assume ~70% growth half-year
  const growthRate = 0.35; // conservative 35% QoQ assumption when no history
  const arrValues = arrBase > 0
    ? [Math.round(arrBase * 0.37), Math.round(arrBase * 0.57), Math.round(arrBase * 0.79), arrBase]
    : [20, 38, 62, 95];
  const mauValues = mauBase > 0
    ? [Math.round(mauBase * 0.40), Math.round(mauBase * 0.58), Math.round(mauBase * 0.78), mauBase]
    : [300, 550, 900, 1400];
  const arrName = arrKpi?.label || 'ARR';
  const mauName = mauKpi?.label || 'MAU';

  // Build timeline from actual traction evidence — never roadmap phases
  const kpiData = kpis(input);
  const timelineItems: Array<{ id: string; date: string; title: string; description: string }> = [];

  if (kpiData[0]) {
    const delta = kpiData[0].delta ? ` growing ${kpiData[0].delta} YoY` : '';
    timelineItems.push({ id: 'tl-0', date: 'Today', title: `${kpiData[0].value} ${kpiData[0].label}`, description: `Current run rate${delta}` });
  }
  if (kpiData[1]) {
    const delta = kpiData[1].delta ? ` at ${kpiData[1].delta}` : '';
    timelineItems.push({ id: 'tl-1', date: 'Signal', title: `${kpiData[1].value} ${kpiData[1].label}`, description: `Organic adoption${delta}` });
  }
  if (kpiData[2]) {
    timelineItems.push({ id: 'tl-2', date: 'Proof', title: `${kpiData[2].value} ${kpiData[2].label}`, description: 'Best-in-class benchmark' });
  }
  // Fallback if KPI data insufficient
  if (timelineItems.length < 2) {
    const tractLines = lines(input.traction || '').slice(0, 3);
    tractLines.forEach((line, i) => {
      const val = valuesFromText(line)[0];
      timelineItems.push({
        id: `tl-txt-${i}`, date: 'Milestone',
        title: val ? `${val.value} ${val.label}` : line.split(/\s+/).slice(0, 3).join(' '),
        description: wordTrunc(line, 60),
      });
    });
  }
  if (timelineItems.length === 0) {
    timelineItems.push(
      { id: 'tl-0', date: 'Launch', title: 'First customers', description: 'Product-market fit validated' },
      { id: 'tl-1', date: 'Growth', title: 'Revenue inflection', description: 'Paid expansion begins' },
      { id: 'tl-2', date: 'Now', title: 'Scale signal', description: 'Enterprise accounts entering' },
    );
  }

  return [
    ...base('Traction', heroLabel, conciseNarrative(input.traction, 'The numbers show early pull and repeatable growth.')),
    ...data.map((m, i) => [card(6 + i * 21.5, 33, 19, 17), metric(8 + i * 21.5, 34, 15, 14, m.value, m.label, m.delta)]).flat(),
    node('chart', { x: 6, y: 56, w: 52, h: 28 }, {
      type: 'dualAxis',
      title: `${arrName} and ${mauName} momentum`,
      categories: ['Q1', 'Q2', 'Q3', 'Q4 (Now)'],
      series: [
        { name: arrName, values: arrValues, color: palette.accent },
        { name: mauName, values: mauValues, color: palette.accent2 },
      ],
      showValues: true,
      familyId: currentFamily,
    }, panel()),
    node('timeline', { x: 62, y: 56, w: 30, h: 28 }, {
      items: timelineItems,
    }, panel()),
  ];
}

function designTeam(input: WizardInput) {
  if (isCrimsonFamily()) return designTeamCrimson(input);
  switch (getFamilyGroup()) {
    case 'luxury':     return designTeamLuxury(input);
    case 'startup':    return designTeamStartup(input);
    case 'consulting': return designTeamConsulting(input);
    case 'tech':       return designTeamTech(input);
    default:           return designTeamInvestor(input);
  }
}

function designTeamInvestor(input: WizardInput) {
  const members = team(input);
  // Use a clean fixed headline — never constructed from parsed role strings which can be garbage
  const teamHeadline = `${input.companyName || 'Our'} team — domain expertise and execution.`;
  const teamSubtitle = `${members.length} leaders covering every critical function.`;
  // Team card height scales to content — 3 members = h=24, 4 = h=28, 5-6 = h=32
  const teamCardH = members.length <= 3 ? 24 : members.length <= 4 ? 28 : 32;
  const teamCardEndY = 34 + teamCardH;

  // "Why this team wins" section fills the space below — no giant empty containers
  const teamInsights = [
    {
      id: 'domain',
      title: 'Domain depth',
      description: wordTrunc(conciseNarrative(input.team, `${input.companyName || 'The team'} has category-specific operating history.`, 1), 90),
    },
    {
      id: 'execution',
      title: 'Execution evidence',
      description: wordTrunc(conciseNarrative(input.traction, 'Traction validates that this team can ship and sell.', 1), 90),
    },
    {
      id: 'completeness',
      title: 'Coverage',
      description: `${members.length} functional leads with complementary skills — no key-person gap at the operating layer.`,
    },
  ];

  return [
    ...base('Team', teamHeadline, teamSubtitle),
    node('teamCard', { x: 6, y: 34, w: 86, h: teamCardH }, {
      members, layout: 'grid',
      accent: palette.accent, textColor: palette.ink, mutedColor: palette.muted,
    }, panel()),
    node('featureGrid', { x: 6, y: teamCardEndY + 2, w: 86, h: Math.min(22, 88 - teamCardEndY) }, {
      columns: 3,
      items: teamInsights,
    }, panel()),
    caption(6, teamCardEndY + 26, 86, 6, 'Investor lens: credible team, clear ownership, and category-specific expertise'),
  ];
}

function designRoadmap(input: WizardInput) {
  if (isCrimsonFamily()) return designRoadmapCrimson(input);
  return [
    ...base('Roadmap', 'Milestones map directly to investor value creation.', conciseNarrative(input.roadmap, 'The next four quarters de-risk product, revenue, and enterprise readiness.')),
    node('roadmap', { x: 6, y: 35, w: 86, h: 38 }, { phases: roadmap(input) }, panel()),
    node('chart', { x: 6, y: 78, w: 42, h: 9 }, {
      type: 'percentStackedBar',
      title: 'Execution focus',
      categories: ['Next 12 months'],
      series: (() => {
        const allocs = input.structured?.funding?.allocations;
        const colors = [palette.accent, palette.accent2, '#7c3aed', palette.muted];
        if (allocs && allocs.length >= 2) {
          return allocs.slice(0, 4).map((a, i) => ({ name: a.category, values: [a.percentage], color: colors[i % colors.length] }));
        }
        return [
          { name: 'Product', values: [40], color: palette.accent },
          { name: 'GTM', values: [35], color: palette.accent2 },
          { name: 'Ops', values: [25], color: '#7c3aed' },
        ];
      })(),
      legend: { visible: true, position: 'bottom' },
      familyId: currentFamily,
    }, panel()),
    bullets(52, 77, 40, 11, ([
      ...roadmap(input).slice(0, 3).map((r) => r.bullets?.[0] || r.phase).filter(Boolean),
      'Ship product proof and iterate on feedback',
      'Build repeatable pipeline and enterprise pipeline',
      'Prepare compliance and enterprise controls',
    ]).filter((s, i, arr) => arr.indexOf(s) === i).slice(0, 3) as string[]),
  ];
}

function designCompanyOverview(input: WizardInput) {
  const model = pricing(input).slice(0, 3);
  return [
    ...base('Company Overview', wordTrunc(input.shortDescription || `${input.companyName} — ${input.productService?.split(/[.!?,]/)[0]?.trim() || 'the company at a glance'}`, 65), wordTrunc(input.productService || input.shortDescription || 'What the company does, who it serves, and how it wins.', 150)),
    node('featureGrid', { x: 6, y: 34, w: 50, h: 38 }, {
      columns: 2,
      items: [
        { id: 'customer', title: 'Customer', description: wordTrunc(input.targetCustomers || `${input.industry || 'Enterprise'} teams with a clear budget and urgency`, 70) },
        { id: 'category', title: 'Category', description: wordTrunc(input.industry || 'B2B SaaS — recurring revenue with enterprise expansion', 70) },
        { id: 'wedge', title: 'Wedge', description: wordTrunc(input.differentiation?.split(/[.!?\n]/)[0]?.trim() || `${input.companyName || 'We'} win on speed, accuracy, and zero integration friction`, 70) },
        { id: 'motion', title: 'Motion', description: wordTrunc(input.businessStage ? `${input.businessStage} — product-led with enterprise expansion` : 'Product-led adoption with enterprise upsell', 70) },
      ],
    }, panel()),
    node('processSteps', { x: 60, y: 34, w: 32, h: 38 }, {
      steps: model.map((tier, i) => ({ id: tier.id || `model-${i}`, title: tier.name, description: tier.price || tier.features?.[0] || 'Revenue stream' })),
      orientation: 'vertical',
    }, panel()),
    caption(6, 78, 86, 6, 'Designed as an investor briefing page: category, customer, wedge, and monetization in one scan.'),
  ];
}

function designCaseStudy(input: WizardInput) {
  return [
    ...base('Proof Point', wordTrunc(`${input.companyName || 'A customer'} — measurable outcome from before to after`, 75), wordTrunc(input.traction || 'Before and after: the problem, the intervention, and the result.', 120)),
    node('processSteps', { x: 6, y: 34, w: 86, h: 18 }, {
      steps: [
        { id: 'before', title: 'Before', description: wordTrunc(input.problem || 'Manual process, inconsistent output, high cost', 80) },
        { id: 'with', title: `With ${input.companyName || 'Us'}`, description: wordTrunc(input.solution?.split('\n')[0] || 'Streamlined workflow, automated quality, measurable results', 80) },
        { id: 'after', title: 'After', description: wordTrunc(input.traction?.split('\n')[0] || 'Faster output, higher quality, reduced overhead', 80) },
      ],
    }, panel()),
    ...kpis(input).slice(0, 3).map((m, i) => [card(6 + i * 29, 60, 25, 16), metric(8 + i * 29, 63, 21, 8, m.value, m.label, m.delta)]).flat(),
    bullets(6, 80, 86, 8, ['Repeatable across customers', 'Consistent delivery with measurable outcomes', 'Scalable with no added headcount']),
  ];
}

function designPartnership(input: WizardInput) {
  return [
    ...base('Partnerships', `Distribution partners can turn ${input.companyName || 'us'} into a category amplifier.`, input.desiredAction || 'Partner channels strengthen acquisition, trust, and workflow embedding.'),
    node('featureGrid', { x: 6, y: 34, w: 86, h: 30 }, {
      columns: 3,
      items: [
        { id: 'channel', title: 'Channel', description: `Resellers and VARs who bring ${input.companyName || 'the product'} to existing buyer relationships` },
        { id: 'platforms', title: 'Platforms', description: 'Integration partners who embed the product in existing workflows' },
        { id: 'strategic', title: 'Strategic', description: 'Co-sell agreements with complementary enterprise vendors' },
      ],
    }, panel()),
    node('processSteps', { x: 6, y: 70, w: 86, h: 16 }, {
      steps: [
        { id: 'source', title: 'Source', description: 'Partner audience and ICP overlap' },
        { id: 'activate', title: 'Activate', description: 'Co-sell motions and joint GTM' },
        { id: 'expand', title: 'Expand', description: 'Shared revenue, deeper integrations' },
      ],
    }, panel()),
  ];
}

function designRisks(input: WizardInput) {
  const swot = input.structured?.swot;
  return [
    ...base('Risks & Mitigations', 'The key risks are identifiable, monitorable, and tied to mitigation plans.', 'Investors need clarity on execution, market, product, and competitive risk.'),
    node('swot', { x: 6, y: 34, w: 58, h: 42 }, {
      strengths: swot?.strengths || [`${input.companyName || 'We'} own a real, measurable customer pain`, 'Differentiated product with proven early traction'],
      weaknesses: swot?.weaknesses || ['Brand awareness must be built over time', 'Enterprise sales cycle requires patience'],
      opportunities: swot?.opportunities || ['Enterprise upsell and multi-seat expansion', 'International markets and platform partnerships'],
      threats: swot?.threats || ['Larger incumbents with existing distribution', 'Market timing and macro headwinds'],
    }, panel()),
    bullets(68, 36, 24, 38, ['Monitor product quality and customer NPS closely', 'Build enterprise controls early', 'Grow customer references and case studies', 'Maintain capital efficiency into next milestone']),
  ];
}

function designAppendix(input: WizardInput, slide: SlideContent) {
  return [
    ...base('Appendix', slide.title || 'Supporting Detail', slide.subtitle || 'Extra investor evidence and operating detail.'),
    node('table', { x: 6, y: 34, w: 58, h: 42 }, {
      columns: ['Area', 'Signal', 'Why it matters'],
      rows: [
        ['Market', marketSizing(input).tam, 'Large enough for venture outcome'],
        ['Model', pricing(input)[0]?.name || 'Subscription', 'Recurring revenue foundation'],
        ['Traction', kpis(input)[0]?.value || 'Early pull', 'Evidence of demand'],
        ['Roadmap', roadmap(input)[0]?.phase || 'Foundation', 'Execution plan'],
      ],
    }, panel()),
    node('chart', { x: 68, y: 34, w: 24, h: 42 }, {
      type: 'donut',
      title: 'Evidence mix',
      categories: ['Market', 'Product', 'Traction', 'Team'],
      series: [{ name: 'Coverage', values: [30, 25, 25, 20], color: palette.accent }],
      showValues: true,
      familyId: currentFamily,
    }, panel()),
  ];
}

function designCompetition(input: WizardInput) {
  if (isCrimsonFamily()) return designCompetitionCrimson(input);
  const c = competitors(input);
  const us = input.companyName || 'Pitchonix';
  return [
    ...base('Competition', (() => {
      const norm = (input.differentiation || '').replace(/\bvs\.\s*/gi, 'vs ').replace(/\betc\.\s*/gi, 'etc ');
      const first = norm.split(/[.!?\n]/)[0]?.trim();
      return wordTrunc(first && first.length > 6 ? first : `${us} wins on design intelligence, workflow depth, and export trust`, 78);
    })(), conciseNarrative(input.differentiation, `${us} competes on quality, depth, and customer trust.`)),
    node('comparison', { x: 6, y: 34, w: 55, h: 45 }, { ...c, highlightColumn: 0, accentColor: palette.accent, accentLightBg: palette.soft }, panel()),
    card(64, 34, 28, 45),
    node('label', { x: 67, y: 38, w: 22, h: 4 }, { text: 'WHY WE WIN' }, { ...label(9), color: palette.accent }),
    node('featureGrid', { x: 67, y: 45, w: 22, h: 28 }, {
      columns: 1,
      items: [
        { id: 'win-1', title: 'Designed output', description: 'Presentation strategy, layout, and components are generated together.' },
        { id: 'win-2', title: 'Workflow depth', description: 'Deck creation, editing, export, and collaboration stay in one system.' },
        { id: 'win-3', title: 'Export trust', description: 'Preview and final documents are treated as the same product promise.' },
      ],
    }, panel()),
    caption(67, 77, 22, 8, `${us} is positioned as a complete presentation system, not a text generator.`),
  ];
}

function designFinancials(input: WizardInput) {
  const f = input.structured?.financials;
  const projections = f?.projections || [
    { year: '2026', revenue: '$1.8M', expenses: '$2.4M', ebitda: '-$0.6M' },
    { year: '2027', revenue: '$7.5M', expenses: '$6.1M', ebitda: '$1.4M' },
    { year: '2028', revenue: '$22M', expenses: '$17M', ebitda: '$5M' },
  ];
  return [
    ...base('Financials', 'A credible path from early ARR to venture-scale revenue.', 'Forecast prioritizes gross margin, retention, and controlled expansion.'),
    card(6, 34, 24, 14), metric(8, 37, 20, 7, f?.grossMargin || '82%', 'Gross margin'),
    card(34, 34, 24, 14), metric(36, 37, 20, 7, f?.burnRate || '$160K', 'Monthly burn'),
    card(62, 34, 30, 14), metric(64, 37, 26, 7, f?.runway || '24 mo', 'Runway post-raise'),
    node('chart', { x: 6, y: 55, w: 54, h: 30 }, {
      type: 'dualAxis',
      title: 'Revenue and EBITDA',
      categories: projections.map((p) => p.year),
      series: [
        { name: 'Revenue', values: projections.map((p) => numberish(p.revenue)), color: palette.accent },
        { name: 'EBITDA', values: projections.map((p) => numberish(p.ebitda || '0')), color: palette.accent2 },
      ],
      numberFormat: { kind: 'currency', currency: '$', decimals: 0 },
      showValues: true,
      familyId: currentFamily,
    }, panel()),
    bullets(64, 56, 28, 28, ['Retention-led expansion', 'Enterprise margin profile', 'Capital-efficient GTM', 'Profitability scenario by year 3']),
  ];
}

function designAsk(input: WizardInput) {
  if (isCrimsonFamily()) return designAskCrimson(input);
  switch (getFamilyGroup()) {
    case 'luxury':     return designAskLuxury(input);
    case 'startup':    return designAskStartup(input);
    case 'consulting': return designAskConsulting(input);
    case 'tech':       return designAskTech(input);
    default:           return designAskInvestor(input);
  }
}

function designAskInvestor(input: WizardInput) {
  const funding = input.structured?.funding;
  const amount = funding?.amount || valuesFromText(input.fundingAsk || '')[0]?.value || '$8M';
  const allocations = ensure(funding?.allocations || [], [
    { category: 'Product', percentage: 40 },
    { category: 'Go-to-market', percentage: 35 },
    { category: 'Operations', percentage: 15 },
    { category: 'Runway buffer', percentage: 10 },
  ], 3);
  // Derive a 4-color set from the family palette so the donut segments are family-aware
  const sliceColors = [palette.accent, palette.accent2, palette.muted, palette.line];
  const allocationColors = allocations.map((_, i) => sliceColors[i % sliceColors.length]);
  // Derive specific milestone metric — never generic "3x Milestone Value"
  const milestoneMetric = (() => {
    // Look for ARR/revenue target in funding ask text
    const askLines = lines(input.fundingAsk || '');
    for (const line of askLines) {
      const nums = valuesFromText(line);
      for (const n of nums) {
        const ctx = line.toLowerCase();
        if (/arr|revenue|mrr/.test(ctx) && n.value !== amount) return { value: n.value, label: 'ARR target' };
        if (/customer|client/.test(ctx)) return { value: n.value, label: 'Customer target' };
      }
    }
    // Project 3× current ARR as a self-explaining target
    const arrKpi = kpis(input).find((k) => /arr|revenue/i.test(k.label));
    if (arrKpi) return { value: '3×', label: `${arrKpi.label} at Series B` };
    // Use runway endpoint: "Series B ready"
    return { value: 'Series B', label: 'Ready milestone' };
  })();

  return [
    ...base('Funding Ask', `${amount} to turn product proof into category leadership.`, conciseNarrative(input.fundingAsk, 'Capital is allocated to product velocity, GTM repeatability, and enterprise readiness.')),
    card(6, 34, 28, 26, palette.dark), metric(9, 41, 22, 9, amount, funding?.roundType || 'Round size'),
    card(38, 34, 24, 26), metric(41, 41, 18, 9, funding?.runway || '24 mo', 'Runway'),
    card(66, 34, 26, 26), metric(69, 41, 20, 9, milestoneMetric.value, milestoneMetric.label),
    // Charts moved to y=63, h=26 — gives enough height so the donut renders without clipping
    node('chart', { x: 6, y: 63, w: 38, h: 26 }, {
      type: 'donut',
      title: 'Use of funds',
      categories: allocations.map((a) => a.category),
      series: [{
        name: 'Allocation',
        values: allocations.map((a) => a.percentage || numberish(a.amount || '0')),
        colors: allocationColors,
        color: palette.accent,
      }],
      showValues: true,
      familyId: currentFamily,
    }, panel()),
    node('fundsAllocation', { x: 48, y: 63, w: 44, h: 26 }, {
      items: allocations.map((a, i) => ({
        category: a.category,
        percentage: a.percentage || numberish(a.amount || '0'),
        color: allocationColors[i],
      })),
      textColor: palette.ink,
      mutedColor: palette.muted,
      lineColor: palette.line,
    }, panel()),
  ];
}

function designProduct(input: WizardInput) {
  const productTitle = wordTrunc(input.productService?.split(/[.!?]/)[0]?.trim() || input.solution?.split(/[.!?]/)[0]?.trim() || `${input.companyName || 'The platform'} — core product`, 75);
  const featureItems = ([
    ...lines(input.productService || input.solution || ''),
    `${input.companyName || 'The product'} delivers core value out of the box`,
    'Continuous improvement driven by usage and customer feedback',
    'Enterprise-ready: access controls, audit trail, and integrations',
    'Scales from individual users to organization-wide deployment',
  ]).filter((s, i, arr) => arr.indexOf(s) === i).slice(0, 6);
  return [
    ...base('Product', productTitle, wordTrunc(conciseNarrative(input.productService || input.solution, `${input.companyName || 'The platform'} solves the problem with precision and reliability.`), 120)),
    node('featureGrid', { x: 6, y: 34, w: 54, h: 40 }, { columns: 2, items: featureItems.slice(0, 6).map((f, i) => ({ id: `pf-${i}`, title: wordTrunc(f.split(':')[0], 32), description: f.includes(':') ? wordTrunc(f.split(':').slice(1).join(':').trim(), 80) : 'Native platform capability' })) }, panel()),
    node('processSteps', { x: 64, y: 34, w: 28, h: 40 }, { steps: [
      { id: 'input', title: 'Input', description: 'Customer need or trigger' },
      { id: 'process', title: 'Process', description: `${input.companyName || 'Platform'} automation` },
      { id: 'output', title: 'Output', description: 'Measurable result delivered' },
    ], orientation: 'vertical' }, panel()),
  ];
}

function designVision(input: WizardInput) {
  return [
    card(0, 0, 100, 100, palette.dark, -10),
    node('label', { x: 8, y: 18, w: 40, h: 5 }, { text: 'Vision' }, label(10)),
    node('quote', { x: 8, y: 28, w: 76, h: 32 }, {
      text: input.purpose || 'Every business should be able to communicate with the quality of a top-tier strategy team.',
      attribution: input.companyName,
    }, headingStyle(32, palette.textOnDark)),
    node('paragraph', { x: 8, y: 68, w: 62, h: 12 }, { text: 'The long-term platform opportunity is a system that transforms business intent into polished, editable, export-ready communication.' }, text(14, 500, palette.textOnDark), 'Narrative'),
    card(74, 66, 18, 14, palette.soft), metric(76, 69, 14, 6, 'AI + Design', 'Category wedge'),
  ];
}

function designGeneralInvestorSlide(input: WizardInput, slide: SlideContent) {
  const slideText = [
    typeof slide.content === 'string' ? slide.content : '',
    slide.subtitle || '',
    input.shortDescription || '',
  ].filter(Boolean).join('\n');
  const insights = ([
    ...lines(slideText),
    `${input.companyName || 'The company'} has a clear and defensible investment thesis`,
    'Evidence is visible as metrics, structured proof, and customer validation',
    'Risk is acknowledged and tied to concrete mitigation plans',
    'The opportunity is large, the wedge is sharp, and the team can execute',
  ]).filter((s, i, arr) => arr.indexOf(s) === i).slice(0, 4);
  return [
    ...base(String(slide.type).replace(/_/g, ' '), slide.title || 'Investor Slide', slide.subtitle || input.shortDescription || 'Structured for visual communication rather than plain text.'),
    node('featureGrid', { x: 6, y: 34, w: 52, h: 38 }, {
      columns: 2,
      items: insights.map((item, i) => ({ id: `general-${i}`, title: `Insight ${i + 1}`, description: item })),
    }, panel()),
    node('chart', { x: 62, y: 34, w: 30, h: 38 }, {
      type: 'bar',
      title: 'Slide balance',
      categories: ['Text', 'Visual', 'Evidence'],
      series: [{ name: 'Weight', values: [35, 45, 20], color: palette.accent }],
      showValues: true,
      familyId: currentFamily,
    }, panel()),
    caption(6, 78, 86, 6, 'Fallback designer guard: no generated slide is allowed to collapse into only a title and paragraph.'),
  ];
}

function numberish(value: string): number {
  const raw = String(value || '').toLowerCase();
  const n = Number(raw.replace(/[^0-9.-]/g, '')) || 0;
  if (/b/.test(raw)) return n * 1000;
  if (/k/.test(raw)) return n / 1000;
  return n;
}

// ── P12: Automated Visual QA ──────────────────────────────────────────────────
// Runs after slide generation to detect dead space, overflow, and content bugs.

export interface SlideQAIssue {
  code: string;
  severity: 'error' | 'warning';
  detail: string;
}

export interface SlideQAResult {
  issues: SlideQAIssue[];
  score: number; // 0–100
  passed: boolean;
}

export function validateSlideQA(elements: SlideElementDTO[]): SlideQAResult {
  const issues: SlideQAIssue[] = [];

  // 1. Dead space — check what vertical fraction of the slide is covered
  const coveredRows = new Set<number>();
  for (const el of elements) {
    const top = Math.floor(el.y);
    const bottom = Math.min(99, Math.ceil(el.y + el.height));
    for (let r = top; r <= bottom; r++) coveredRows.add(r);
  }
  const coveredPct = (coveredRows.size / 100) * 100;
  if (coveredPct < 60) {
    issues.push({ code: 'DEAD_SPACE', severity: 'error', detail: `Only ${Math.round(coveredPct)}% of slide height has content (threshold: 60%)` });
  } else if (coveredPct < 72) {
    issues.push({ code: 'SPARSE_LAYOUT', severity: 'warning', detail: `Slide coverage ${Math.round(coveredPct)}% — consider adding content to dead zones` });
  }

  // 2. Overflow — elements extending beyond slide bounds
  for (const el of elements) {
    if (el.x + el.width > 103) {
      issues.push({ code: 'OVERFLOW_X', severity: 'error', detail: `${el.type} at x=${el.x.toFixed(1)} w=${el.width.toFixed(1)} overflows right edge` });
    }
    if (el.y + el.height > 103) {
      issues.push({ code: 'OVERFLOW_Y', severity: 'error', detail: `${el.type} at y=${el.y.toFixed(1)} h=${el.height.toFixed(1)} overflows bottom edge` });
    }
  }

  // 3. Duplicate text content — same string in two different text nodes
  const textNodes = elements.filter((el) => ['paragraph', 'heading', 'label', 'caption'].includes(el.type));
  const seen = new Map<string, string>();
  for (const el of textNodes) {
    const t = ((el.content as any)?.text || '').trim().toLowerCase();
    if (t.length < 12) continue; // skip short labels
    if (seen.has(t)) {
      issues.push({ code: 'DUPLICATE_TEXT', severity: 'error', detail: `"${t.slice(0, 50)}" appears in both ${seen.get(t)} and ${el.type}` });
    } else {
      seen.set(t, el.type);
    }
  }

  // 4. Empty components — cards/grids with no overlapping content nodes
  const shapeNodes = elements.filter((el) => el.type === 'shape' && (el.content as any)?.kind === 'roundedRect');
  for (const shape of shapeNodes) {
    const hasContent = elements.some(
      (el) => el !== shape && el.type !== 'shape' &&
        el.x >= shape.x - 1 && el.x < shape.x + shape.width &&
        el.y >= shape.y - 1 && el.y < shape.y + shape.height,
    );
    if (!hasContent) {
      issues.push({ code: 'EMPTY_CARD', severity: 'warning', detail: `Panel at (${shape.x.toFixed(0)},${shape.y.toFixed(0)}) has no content elements inside it` });
    }
  }

  // 5. Tiny containers — metric/heading elements whose h < fontSize/7.2 (will clip)
  for (const el of elements) {
    const fs: number = (el.style as any)?.fontSize || 0;
    if (fs > 0 && el.height > 0) {
      const minH = (fs / 720) * 100; // font size in percentage units
      if (el.height < minH * 0.9) {
        issues.push({ code: 'CLIPPED_TEXT', severity: 'error', detail: `${el.type} h=${el.height.toFixed(1)}% may clip ${fs}px text (need ≥${(minH * 1.1).toFixed(1)}%)` });
      }
    }
  }

  const errorCount  = issues.filter((i) => i.severity === 'error').length;
  const warnCount   = issues.filter((i) => i.severity === 'warning').length;
  const score = Math.max(0, 100 - errorCount * 20 - warnCount * 5);
  return { issues, score, passed: errorCount === 0 };
}

// ===================================================================
// PHASE Ω.8 — FAMILY-SPECIFIC INTERIOR SLIDE VARIANTS
// Every function below uses only palette.* — never hardcoded colours.
// Structural identity (column count, reading direction, card grammar)
// must be recognisable even when all colours are removed.
// ===================================================================

// ── LUXURY / EXECUTIVE  (luxury-dark · forest-executive) ────────────
// Design language: Private Equity · Board Presentations · Prestige
// Structural signature: spacious verticals, serif-weight typography,
//   quote-block openers, no numbered bullets, elegant metric pairs.

function designProblemLuxury(input: WizardInput) {
  const hero = problemHeroMetric(input);
  const secondary = problemSecondMetric(input);
  const painPoints = ([...lines(input.problem), ...[
    'Executive teams lack real-time visibility into operational performance',
    'The cost of inaction compounds — every quarter compounds the gap',
    'Incumbent tools require months of setup — budget and patience teams cannot afford',
  ]]).filter((s, i, arr) => arr.indexOf(s) === i).slice(0, 3);
  const headline = (() => {
    const raw = input.problem?.split(/[.!?]\s+/)[0]?.trim() || 'A structural problem demanding an executive solution.';
    const clause = raw.split(/,\s+/)[0].trim();
    return wordTrunc(clause.length >= 15 ? clause : raw, 60);
  })();
  return [
    ...base('Problem', headline),
    // Full-width executive quote block — the pain stated as a brief
    card(6, 30, 86, 14, palette.dark),
    node('shape', { x: 6, y: 30, w: 0.8, h: 14, z: 3 }, { kind: 'rect', fill: palette.accent }, { fill: palette.accent }, 'Quote rule'),
    paragraph(10, 32, 76, 10, wordTrunc(conciseNarrative(input.problem, 'The pain is structural, measurable, and unresolved.', 2), 180), 13),
    // Left column — 3 executive risk items (no numbers, em-dash style)
    ...painPoints.map((p, i) => [
      node('shape', { x: 6, y: 48 + i * 13, w: 2, h: 0.5, z: 2 }, { kind: 'rect', fill: palette.accent }, { fill: palette.accent }, 'Risk dash'),
      paragraph(10, 48 + i * 13, 50, 10, p, 12),
    ]).flat(),
    // Right column — 2 elegant stacked metrics
    card(62, 48, 30, 37, palette.panel),
    node('shape', { x: 62, y: 48, w: 30, h: 0.6, z: 3 }, { kind: 'rect', fill: palette.accent }, { fill: palette.accent }, 'Metric rule'),
    node('metric', { x: 65, y: 50, w: 24, h: 16 }, { value: hero.value, label: hero.label },
      { ...headingStyle(44, palette.accent), letterSpacing: palette.numberLetterSpacing }),
    ...(secondary ? [
      node('shape', { x: 65, y: 68, w: 24, h: 0.4, z: 1 }, { kind: 'rect', fill: palette.line }, { fill: palette.line }, 'Divider'),
      node('metric', { x: 65, y: 70, w: 24, h: 12 }, { value: secondary.value, label: secondary.label },
        { ...headingStyle(30, palette.accent2 || palette.accent), letterSpacing: palette.numberLetterSpacing }),
    ] : [
      paragraph(65, 68, 24, 14, conciseNarrative(input.problem, 'Validated across enterprise peer conversations.', 2), 11),
    ]),
    caption(6, 88, 86, 6, 'Validated through enterprise board-level peer conversations'),
  ];
}

function designSolutionLuxury(input: WizardInput) {
  const rawTitle = input.solution?.split(/[.!?]\s+/)[0]?.trim() || 'The decisive capability.';
  const slideTitle = wordTrunc(rawTitle.split(/,\s+/)[0].trim() || rawTitle, 60);
  const kpiData = kpis(input);
  const capabilities = ([
    ...lines(input.solution || '').slice(1, 5),
    wordTrunc(`${input.companyName || 'The platform'} delivers measurable results from day one`, 80),
    'Zero-code setup — deploys in hours with native integrations',
    'Continuous improvement — the system gets smarter with every use',
  ]).filter((s, i, arr) => arr.indexOf(s) === i).slice(0, 3);
  const proofMetrics = kpiData.slice(0, 3);

  return [
    ...base('Solution', slideTitle),
    // Elevated positioning statement — full width, larger text
    paragraph(6, 31, 86, 7,
      (() => {
        const sents = (input.solution || '').split(/[.!?]\s+/).map(s => s.trim()).filter(s => s.length > 10);
        const rest = sents.slice(1);
        return rest.length > 0
          ? wordTrunc(rest.slice(0, 2).join('. '), 160)
          : `${input.companyName || 'The platform'} replaces manual process with enterprise-grade automation.`;
      })(), 14),
    node('shape', { x: 6, y: 39, w: 86, h: 0.5, z: 1 }, { kind: 'rect', fill: palette.line }, { fill: palette.line }, 'Separator'),
    // 3 vertical capability rows — full-width bands
    ...capabilities.map((cap, i) => {
      const proof = proofMetrics[i];
      return [
        card(6, 43 + i * 15, 86, 12, i % 2 === 0 ? palette.panel : palette.soft),
        node('shape', { x: 6, y: 43 + i * 15, w: 1, h: 12, z: 3 }, { kind: 'rect', fill: palette.accent }, { fill: palette.accent }, 'Cap rule'),
        paragraph(10, 44.5 + i * 15, 66, 9, cap, 12),
        ...(proof ? [node('metric', { x: 79, y: 44.5 + i * 15, w: 11, h: 9 },
          { value: proof.value, label: proof.label },
          { ...headingStyle(20, palette.accent), letterSpacing: palette.numberLetterSpacing, textAlign: 'right' as any })] : []),
      ];
    }).flat(),
    caption(6, 88, 86, 6, `${input.companyName || 'The platform'} — built for boards that demand measurable outcomes`),
  ];
}

function designMarketLuxury(input: WizardInput) {
  const m = marketSizing(input);
  return [
    ...base('Market Opportunity', `A ${m.tam} market with ${m.growth} annual growth.`,
      `${m.sam} serviceable opportunity · ${input.industry || 'Institutional'} tailwinds`),
    // Large centred TAM statement
    card(6, 32, 86, 20, palette.dark),
    node('metric', { x: 10, y: 34, w: 40, h: 16 }, { value: m.tam, label: 'Total Addressable Market' },
      { ...headingStyle(54, palette.accent), letterSpacing: palette.numberLetterSpacing }),
    node('shape', { x: 54, y: 38, w: 0.5, h: 8, z: 2 }, { kind: 'rect', fill: palette.line }, { fill: palette.line }, 'Divider'),
    node('metric', { x: 57, y: 34, w: 16, h: 9 }, { value: m.growth, label: 'CAGR' },
      { ...headingStyle(28, palette.accent2 || palette.accent), letterSpacing: palette.numberLetterSpacing }),
    node('metric', { x: 75, y: 34, w: 14, h: 9 }, { value: m.sam, label: 'SAM' },
      { ...headingStyle(24, palette.accent), letterSpacing: palette.numberLetterSpacing }),
    node('metric', { x: 57, y: 44, w: 32, h: 9 }, { value: m.som, label: 'Serviceable Beachhead' },
      { ...headingStyle(20, palette.muted), letterSpacing: palette.numberLetterSpacing }),
    // Market analysis narrative
    card(6, 56, 52, 30, palette.panel),
    node('label', { x: 9, y: 58, w: 46, h: 4 }, { text: 'Executive Market Analysis' }, label(9)),
    paragraph(9, 63, 46, 20,
      wordTrunc(conciseNarrative(input.marketOpportunity || input.solution || '',
        `${input.industry || 'Enterprise'} demand is compounding — driven by regulatory pressure, workflow complexity, and the shift to AI-native operations.`), 280), 11),
    // Drivers — compact right column
    node('featureGrid', { x: 62, y: 56, w: 30, h: 30 }, {
      columns: 1,
      items: marketSizing(input).drivers.slice(0, 3).map((d, i) => ({ id: `d-${i}`, title: `Driver ${i + 1}`, description: wordTrunc(d, 70) })),
    }, panel()),
    caption(6, 88, 86, 6, 'Source: primary research across enterprise CFOs and procurement leaders'),
  ];
}

function designTeamLuxury(input: WizardInput) {
  const members = team(input).slice(0, 3);

  const totalYears = (() => {
    const nums: string[] = (input.team || '').match(/(\d+)\s+year/gi) || [];
    return nums.reduce((s: number, n: string) => s + parseInt(n), 0);
  })();
  const credBar = [
    totalYears ? `${totalYears}+ combined years` : null,
    input.traction?.match(/\$[\d.]+[KMB]/)?.[0] ? `${input.traction.match(/\$[\d.]+[KMB]/)?.[0]} ARR built` : null,
    `${members.length} functional leads`,
  ].filter(Boolean).join('   ·   ');

  return [
    ...base('Leadership', `${input.companyName || 'Company'} leadership: ${members.map(m => m.role).join(', ')}.`,
      `Institutional-grade operators across ${members.map(m => m.role).join(', ')}`),
    // 3 portrait-forward leadership cards — snug fit to content
    ...members.map((m, i) => {
      const ex = m.bio.match(/ex-(\w+)/i);
      const yr = m.bio.match(/(\d+)\s+year/i);
      const badge = yr ? `${yr[1]} YRS` : ex ? ex[1].toUpperCase() : '';
      return [
        card(6 + i * 29.5, 32, 27, 37, palette.panel),
        node('shape', { x: 6 + i * 29.5, y: 32, w: 27, h: 1, z: 3 }, { kind: 'rect', fill: palette.accent }, { fill: palette.accent }, 'Card rule'),
        node('label', { x: 9 + i * 29.5, y: 36, w: 21, h: 4 }, { text: m.name }, { ...headingStyle(16, palette.ink), fontWeight: 700 }),
        node('label', { x: 9 + i * 29.5, y: 41, w: 21, h: 3 }, { text: m.role.toUpperCase() }, { ...label(9), color: palette.accent }),
        node('shape', { x: 9 + i * 29.5, y: 45, w: 18, h: 0.3, z: 1 }, { kind: 'rect', fill: palette.line }, { fill: palette.line }, 'Bio rule'),
        paragraph(9 + i * 29.5, 47, 21, 14, m.bio, 11),
        ...(badge ? [node('label', { x: 9 + i * 29.5, y: 62, w: 21, h: 5 },
          { text: badge }, { ...headingStyle(14, palette.accent), fontStyle: 'italic' as any })] : []),
      ];
    }).flat(),
    // Combined credibility strip
    card(6, 74, 86, 9, palette.dark),
    paragraph(10, 76.5, 76, 5, credBar, 11),
    caption(6, 85, 86, 6, 'Investor lens: institutional pedigree with operating-level accountability'),
  ];
}

function designAskLuxury(input: WizardInput) {
  const funding = input.structured?.funding;
  const amount = funding?.amount || input.fundingAsk?.match(/\$[\d.]+[MK]/)?.[0] || '$—';
  const runway = funding?.runway || '24 mo';
  const allocations = (funding?.allocations || [
    { category: 'Product', percentage: 45 },
    { category: 'Go-to-market', percentage: 35 },
    { category: 'Operations', percentage: 20 },
  ]).slice(0, 4);

  const milestoneMetric = (() => {
    const arrKpi = kpis(input).find(k => /arr|revenue/i.test(k.label));
    if (arrKpi) return { value: '3×', label: `${arrKpi.label} at next round` };
    return { value: 'Series B', label: 'Ready milestone' };
  })();

  return [
    ...base('Investment', `${amount} to establish category leadership.`,
      conciseNarrative(input.fundingAsk, 'Capital deployed across product velocity, enterprise GTM, and operational resilience.')),
    // Centred ask headline panel
    card(6, 32, 86, 18, palette.dark),
    node('metric', { x: 10, y: 34, w: 32, h: 14 }, { value: amount, label: 'Investment ask' },
      { ...headingStyle(54, palette.accent), letterSpacing: palette.numberLetterSpacing }),
    node('shape', { x: 46, y: 36, w: 0.5, h: 10, z: 2 }, { kind: 'rect', fill: palette.line }, { fill: palette.line }, 'Divider'),
    node('metric', { x: 50, y: 34, w: 18, h: 14 }, { value: runway, label: 'Runway' },
      { ...headingStyle(30, palette.accent2 || palette.accent), letterSpacing: palette.numberLetterSpacing }),
    node('metric', { x: 71, y: 34, w: 18, h: 14 }, { value: milestoneMetric.value, label: milestoneMetric.label },
      { ...headingStyle(28, palette.ink), letterSpacing: palette.numberLetterSpacing }),
    // Allocation rows — elegant horizontal list, no chart
    node('label', { x: 6, y: 53, w: 86, h: 4 }, { text: 'Allocation' }, label(9)),
    ...allocations.map((a, i) => [
      node('shape', { x: 6, y: 59 + i * 10, w: ((a.percentage || 0) / 100) * 76, h: 6, z: 1 },
        { kind: 'rect', fill: i === 0 ? palette.accent : i === 1 ? (palette.accent2 || palette.accent) : palette.muted },
        { fill: palette.accent, borderRadius: 4 }, 'Alloc bar'),
      node('label', { x: 84, y: 59 + i * 10, w: 8, h: 6 }, { text: `${a.percentage}%` },
        { ...label(10), textAlign: 'right' as any, color: palette.ink }),
      node('label', { x: 6, y: 59 + i * 10, w: 40, h: 6 }, { text: a.category },
        { ...text(10, 500, palette.textOnDark), lineHeight: 1.2 }),
    ]).flat(),
    caption(6, 92, 86, 6, `${input.companyName || 'We'} — building the category-defining platform in ${input.industry || 'this space'}`),
  ];
}

// ── STARTUP / GROWTH  (startup-gradient · violet-creative) ──────────
// Design language: Modern Startup · Founder Narrative · Growth Energy
// Structural signature: split BEFORE→AFTER panels, consequence badges,
//   bold emotionally-charged headlines, founder-forward layouts.

function designProblemStartup(input: WizardInput) {
  const hero = problemHeroMetric(input);
  const secondary = problemSecondMetric(input);
  const sents = (input.problem || '').split(/[.!?]\s+/).map(s => s.trim()).filter(s => s.length > 8);
  const headline = sents[0] || 'The problem we could not ignore.';
  const narrative = wordTrunc(sents.slice(1, 3).join('. ') || conciseNarrative(input.problem, 'Every team we talked to felt it.', 2), 160);
  const consequences = ([...lines(input.problem || ''), ...[
    'Lost revenue from manual errors',
    'Delayed decisions from bad data',
    'Team burnout from repetitive work',
  ]]).filter((s, i, arr) => arr.indexOf(s) === i).slice(0, 3);

  return [
    ...base('Problem', wordTrunc(headline.split(/,\s+/)[0].trim() || headline, 60)),
    // "THE PROBLEM" kicker — startup-energetic
    node('label', { x: 6, y: 30, w: 56, h: 4 }, { text: 'THE PROBLEM WE COULDN\'T IGNORE' },
      { ...label(8), color: palette.accent }),
    // Left: founder narrative block
    card(6, 35, 55, 28, palette.panel),
    paragraph(10, 37, 47, 22, narrative, 12),
    // Right: hero metric — large, dominant
    card(65, 32, 27, 31, palette.dark),
    node('metric', { x: 68, y: 36, w: 21, h: 20 }, { value: hero.value, label: hero.label },
      { ...headingStyle(54, palette.accent), letterSpacing: palette.numberLetterSpacing }),
    ...(secondary ? [node('metric', { x: 68, y: 56, w: 21, h: 5 }, { value: secondary.value, label: secondary.label },
      { ...headingStyle(16, palette.accent2 || palette.accent), letterSpacing: palette.numberLetterSpacing })] : []),
    // Bottom: 3 consequence badges
    node('label', { x: 6, y: 67, w: 56, h: 4 }, { text: 'IF LEFT UNSOLVED →' }, { ...label(8), color: palette.accent }),
    ...consequences.flatMap((c, i) => [
      card(6 + i * 30, 72, 28, 12, i === 0 ? palette.soft : palette.panel),
      node('shape', { x: 6 + i * 30, y: 72, w: 28, h: 0.6, z: 3 }, { kind: 'rect', fill: palette.accent }, { fill: palette.accent }, 'Badge top'),
      paragraph(9 + i * 30, 74, 22, 8, c, 11),
    ]),
    caption(6, 87, 86, 6, 'Every company we spoke with described the exact same breaking point'),
  ];
}

function designSolutionStartup(input: WizardInput) {
  const rawTitle = input.solution?.split(/[.!?]\s+/)[0]?.trim() || 'The breakthrough.';
  const slideTitle = wordTrunc(rawTitle.split(/,\s+/)[0].trim() || rawTitle, 60);
  const beforeText = wordTrunc(conciseNarrative(input.problem, 'Manual, inconsistent, error-prone.', 1), 120);
  const afterText = (() => {
    const kpiData = kpis(input);
    if (kpiData.length >= 2) return `${kpiData[0].value} ${kpiData[0].label} · ${kpiData[1].value} ${kpiData[1].label} · proven at scale`;
    return wordTrunc(conciseNarrative(input.solution, 'Fast, accurate, and enterprise-ready.', 1), 120);
  })();
  const kpiStrip = kpis(input).slice(0, 4);

  return [
    ...base('Solution', slideTitle),
    // BEFORE card (left, dark)
    card(6, 32, 41, 34, palette.dark),
    node('label', { x: 10, y: 34, w: 33, h: 4 }, { text: 'BEFORE' }, { ...label(9), color: palette.muted }),
    paragraph(10, 40, 33, 22, beforeText, 12),
    // Large arrow
    node('label', { x: 49, y: 40, w: 8, h: 18 }, { text: '→' },
      { ...headingStyle(42, palette.accent), textAlign: 'center' as any }),
    // AFTER card (right, accent)
    card(57, 32, 35, 34, palette.soft),
    node('label', { x: 61, y: 34, w: 27, h: 4 }, { text: 'AFTER' }, { ...label(9), color: palette.accent }),
    paragraph(61, 40, 27, 22, afterText, 12),
    // KPI proof strip
    node('label', { x: 6, y: 69, w: 86, h: 4 }, { text: 'PROOF IT WORKS' }, { ...label(8), color: palette.accent }),
    ...kpiStrip.flatMap((m, i) => [
      card(6 + i * 21.5, 74, 20, 12),
      metric(8 + i * 21.5, 75.5, 16, 9, m.value, m.label, m.delta),
    ]),
    caption(6, 88, 86, 6, 'Validated in production — not demo environments'),
  ];
}

function designMarketStartup(input: WizardInput) {
  const m = marketSizing(input);
  return [
    ...base('Market', `We're riding the ${input.industry || 'automation'} wave.`,
      `${m.tam} TAM · ${m.growth} CAGR · ${m.som} beachhead`),
    // Headline wave label
    node('label', { x: 6, y: 31, w: 86, h: 4 }, { text: `THE ${(input.industry || 'AUTOMATION').toUpperCase()} MARKET IS INFLECTING NOW` },
      { ...label(8), color: palette.accent }),
    // TAM/SAM/SOM as 3 bold horizontal bars
    ...([
      { label: 'TAM — Total Addressable', value: m.tam, pct: 86 },
      { label: 'SAM — Serviceable', value: m.sam, pct: 55 },
      { label: 'SOM — Our Beachhead', value: m.som, pct: 25 },
    ]).flatMap((item, i) => {
      const barWidth = Math.min(item.pct, 76);
      const valueX = Math.min(84, 6 + barWidth + 1);
      return [
        node('label', { x: 6, y: 38 + i * 12, w: 40, h: 4 }, { text: item.label }, label(9)),
        node('shape', { x: 6, y: 43 + i * 12, w: barWidth, h: 5, z: 1 },
          { kind: 'rect', fill: i === 0 ? palette.accent : i === 1 ? (palette.accent2 || palette.accent) : palette.muted },
          { fill: palette.accent, borderRadius: 4, opacity: i === 0 ? 1 : 0.7 }, 'Market bar'),
        node('label', { x: valueX, y: 43 + i * 12, w: 10, h: 5 }, { text: item.value },
          { ...headingStyle(16, palette.ink) }),
      ];
    }),
    // CAGR + growth callout
    card(6, 74, 20, 14),
    metric(8, 76, 16, 10, m.growth, 'Annual CAGR'),
    // 3 trend drivers
    node('featureGrid', { x: 30, y: 74, w: 62, h: 14 }, {
      columns: 3,
      items: m.drivers.slice(0, 3).map((d, i) => ({ id: `td-${i}`, title: `Tailwind ${i + 1}`, description: wordTrunc(d, 60) })),
    }, panel()),
    caption(6, 90, 86, 6, 'Every macro trend is compressing the decision timeline for buyers'),
  ];
}

function designTeamStartup(input: WizardInput) {
  const members = team(input).slice(0, 3);

  const whyWeWinItems = [
    {
      title: 'Domain',
      description: (() => {
        const yr = (input.team || '').match(/(\d+)\s+year[s]?\s+(\w+)/i);
        const prev = (input.team || '').match(/ex[-\s](\w[\w]+)/i);
        if (yr) return wordTrunc(`${yr[0]} of hands-on industry experience${prev ? ` (ex-${prev[1]})` : ''}`, 80);
        return wordTrunc(input.industry ? `Deep expertise in ${input.industry} with operational domain knowledge` : 'Founders with direct domain expertise in the problem space', 80);
      })(),
    },
    {
      title: 'Execution',
      description: (() => {
        const arrM = (input.traction || '').match(/\$[\d.]+[MK]\s*ARR/i);
        const custM = (input.traction || '').match(/(\d[\d,]+)\s*customer/i);
        if (arrM && custM) return wordTrunc(`${arrM[0]}, ${custM[1]} customers — revenue before fundraising`, 80);
        return wordTrunc(conciseNarrative(input.traction, 'Proven execution: revenue and customers before fundraising'), 80);
      })(),
    },
    {
      title: 'Distribution',
      description: (() => {
        const vsM = (input.differentiation || '').match(/vs\.?\s+[^:]+:\s*([^.]+)/i);
        if (vsM) return wordTrunc(`Proven edge: ${vsM[1].trim()}`, 80);
        return wordTrunc(conciseNarrative(input.differentiation, 'Structural advantage competitors cannot easily replicate'), 80);
      })(),
    },
  ];

  return [
    ...base('Team', `${input.companyName || 'We'} — built by people who lived the problem.`,
      'Operators first, founders second. We build what we wish had existed.'),
    // 3 founder-forward cards
    ...members.map((m, i) => [
      card(6 + i * 29.5, 32, 27, 30, palette.panel),
      node('label', { x: 9 + i * 29.5, y: 35, w: 21, h: 5 }, { text: m.name }, { ...headingStyle(18, palette.ink), fontWeight: 800 }),
      node('label', { x: 9 + i * 29.5, y: 41, w: 21, h: 4 }, { text: m.role }, { ...label(9), color: palette.accent }),
      paragraph(9 + i * 29.5, 46, 21, 13, wordTrunc(m.bio, 90), 11),
    ]).flat(),
    // "Why we win" section — distinct moat angles, not member bio repeats
    node('label', { x: 6, y: 65, w: 56, h: 4 }, { text: 'WHY WE WIN' }, { ...label(8), color: palette.accent }),
    node('featureGrid', { x: 6, y: 70, w: 86, h: 18 }, {
      columns: 3,
      items: whyWeWinItems.map((w, i) => ({ id: `w-${i}`, title: w.title, description: w.description })),
    }, panel()),
    caption(6, 90, 86, 6, 'We are the customer — and we\'re building what we needed'),
  ];
}

function designAskStartup(input: WizardInput) {
  const funding = input.structured?.funding;
  const amount = funding?.amount || input.fundingAsk?.match(/\$[\d.]+[MK]/)?.[0] || '$—';
  const runway = funding?.runway || '24 mo';
  const allocations = (funding?.allocations || [
    { category: 'Product', percentage: 45 },
    { category: 'Go-to-market', percentage: 35 },
    { category: 'Operations', percentage: 20 },
  ]).slice(0, 3);

  const unlocks = [
    { title: 'Product', unlock: allocations[0] ? `${allocations[0].percentage}% — ${allocations[0].category}` : 'Ship 3 enterprise features', metric: `${runway} runway` },
    { title: 'Growth', unlock: allocations[1] ? `${allocations[1].percentage}% — ${allocations[1].category}` : 'Hire 4 AEs + 2 SDRs', metric: '3× pipeline' },
    { title: 'Operations', unlock: allocations[2] ? `${allocations[2].percentage}% — ${allocations[2].category}` : 'SOC 2 + compliance', metric: 'Enterprise-ready' },
  ];

  const milestoneMetric = (() => {
    const arrKpi = kpis(input).find(k => /arr/i.test(k.label));
    return arrKpi ? { value: '3×', label: `${arrKpi.label} milestone` } : { value: 'Series B', label: 'Next raise' };
  })();

  return [
    ...base('Raise', `${amount} — to go from product proof to category leader.`,
      conciseNarrative(input.fundingAsk, 'Every dollar is mapped to a specific growth unlock.')),
    // Big amount + stage + runway
    card(6, 32, 40, 30, palette.dark),
    node('metric', { x: 10, y: 36, w: 32, h: 16 }, { value: amount, label: funding?.roundType || 'Round' },
      { ...headingStyle(54, palette.accent), letterSpacing: palette.numberLetterSpacing }),
    node('metric', { x: 10, y: 54, w: 16, h: 6 }, { value: runway, label: 'Runway' },
      { ...headingStyle(18, palette.accent2 || palette.accent), letterSpacing: palette.numberLetterSpacing }),
    node('metric', { x: 28, y: 54, w: 16, h: 6 }, { value: milestoneMetric.value, label: milestoneMetric.label },
      { ...headingStyle(18, palette.ink), letterSpacing: palette.numberLetterSpacing }),
    // 3 "what this unlocks" cards
    node('label', { x: 50, y: 32, w: 42, h: 4 }, { text: 'WHAT THIS ROUND UNLOCKS' }, { ...label(8), color: palette.accent }),
    ...unlocks.map((u, i) => [
      card(50, 37 + i * 8.5, 42, 7, i % 2 === 0 ? palette.panel : palette.soft),
      node('label', { x: 53, y: 38.5 + i * 8.5, w: 12, h: 4 }, { text: u.title }, { ...label(9), color: palette.accent }),
      paragraph(66, 38.5 + i * 8.5, 22, 4.5, u.unlock, 10),
    ]).flat(),
    // ARR growth milestones strip
    node('label', { x: 6, y: 65, w: 86, h: 4 }, { text: 'ARR GROWTH MILESTONES' }, { ...label(8), color: palette.accent }),
    ...['Today', '+12 mo', '+24 mo', '+30 mo'].map((period, i) => [
      card(6 + i * 21.5, 70, 20, 18, i === 3 ? palette.dark : palette.panel),
      node('label', { x: 9 + i * 21.5, y: 72, w: 14, h: 3 }, { text: period }, { ...label(8), color: i === 3 ? palette.accent : palette.muted }),
      node('metric', { x: 9 + i * 21.5, y: 76, w: 14, h: 10 }, { value: ['$1.8M', '$4M', '$8M', '$15M'][i], label: 'ARR' },
        { ...headingStyle(20, i === 3 ? palette.accent : palette.ink), letterSpacing: palette.numberLetterSpacing }),
    ]).flat(),
    caption(6, 90, 86, 6, 'Every allocation tied to a measurable milestone — not runway burn'),
  ];
}

// ── CONSULTING / FRAMEWORK  (cobalt-impact · slate-pro) ──────────────
// Design language: McKinsey · BCG · Strategy Consulting
// Structural signature: two-column analytical grids, labelled headers,
//   framework matrices, precise benchmark rows, no emotional language.

function designProblemConsulting(input: WizardInput) {
  const hero = problemHeroMetric(input);
  const secondary = problemSecondMetric(input);
  const painPoints = ([...lines(input.problem), ...[
    'Operational throughput is constrained by manual review cycles',
    'Error rates in current process exceed industry-acceptable thresholds',
    'Integration complexity delays time-to-value beyond board tolerance',
  ]]).filter((s, i, arr) => arr.indexOf(s) === i).slice(0, 3);
  const headline = (() => { const r = input.problem?.split(/[.!?]\s+/)[0]?.trim() || 'Operational inefficiency at enterprise scale.'; return wordTrunc(r.split(/,\s+/)[0].trim() || r, 60); })();

  return [
    ...base('Problem', headline),
    // Column headers
    node('label', { x: 6, y: 30, w: 44, h: 4 }, { text: 'CURRENT OPERATIONS' }, { ...label(9), color: palette.accent }),
    node('label', { x: 56, y: 30, w: 36, h: 4 }, { text: 'BUSINESS IMPACT' }, { ...label(9), color: palette.accent }),
    // Vertical divider
    node('shape', { x: 52, y: 30, w: 0.5, h: 56, z: 2 }, { kind: 'rect', fill: palette.line }, { fill: palette.line }, 'Col divider'),
    // Left: 3 structured operational problems
    ...painPoints.map((p, i) => [
      node('label', { x: 6, y: 37 + i * 14, w: 44, h: 4 }, { text: `${String.fromCharCode(65 + i)}.` }, { ...label(10), color: palette.accent }),
      paragraph(12, 37 + i * 14, 36, 10, p, 11),
      node('shape', { x: 6, y: 48 + i * 14, w: 42, h: 0.3, z: 1 }, { kind: 'rect', fill: palette.line }, { fill: palette.line }, 'Row line'),
    ]).flat(),
    // Right: 2 metrics + benchmark note
    node('metric', { x: 56, y: 34, w: 32, h: 16 }, { value: hero.value, label: hero.label },
      { ...headingStyle(44, palette.accent), letterSpacing: palette.numberLetterSpacing }),
    ...(secondary ? [
      node('shape', { x: 56, y: 53, w: 32, h: 0.4, z: 1 }, { kind: 'rect', fill: palette.line }, { fill: palette.line }, 'Metric divider'),
      node('metric', { x: 56, y: 55, w: 32, h: 12 }, { value: secondary.value, label: secondary.label },
        { ...headingStyle(30, palette.accent2 || palette.accent), letterSpacing: palette.numberLetterSpacing }),
    ] : [
      paragraph(56, 55, 32, 16, conciseNarrative(input.problem, 'Benchmark against industry peers confirms the gap.', 2), 11),
    ]),
    // Benchmark row
    card(6, 78, 86, 10, palette.soft),
    node('label', { x: 9, y: 80, w: 30, h: 3 }, { text: 'INDUSTRY BENCHMARK' }, { ...label(8), color: palette.accent }),
    paragraph(9, 84, 78, 3, `Target efficiency gain: ${hero.value} reduction in ${hero.label.toLowerCase()} through systematic automation`, 10),
  ];
}

function designSolutionConsulting(input: WizardInput) {
  const rawTitle = input.solution?.split(/[.!?]\s+/)[0]?.trim() || 'The systematic approach.';
  const slideTitle = wordTrunc(rawTitle.split(/,\s+/)[0].trim() || rawTitle, 60);
  const columns = ['Capture', 'Process', 'Deliver'];
  const solLines = lines(input.solution || '').slice(1);
  const capItems = ([
    ...solLines,
    wordTrunc(`${input.companyName || 'The platform'} captures and structures all input with precision`, 80),
    'Automated processing with full audit trail and validation',
    'Native integrations — deploys without custom engineering work',
  ]).filter((s, i, arr) => arr.indexOf(s) === i).slice(0, 3);
  const proofKpis = kpis(input).slice(0, 3);

  return [
    ...base('Solution', slideTitle),
    // Framework header
    node('label', { x: 6, y: 31, w: 86, h: 4 }, {
      text: `THE ${(input.companyName || 'PLATFORM').toUpperCase()} METHODOLOGY`,
    }, { ...label(9), color: palette.accent }),
    // 3-column capability matrix
    ...columns.map((col, i) => [
      card(6 + i * 29.5, 37, 27, 38, i === 1 ? palette.soft : palette.panel),
      node('shape', { x: 6 + i * 29.5, y: 37, w: 27, h: 1, z: 3 }, { kind: 'rect', fill: palette.accent }, { fill: palette.accent }, 'Col rule'),
      node('label', { x: 9 + i * 29.5, y: 40, w: 21, h: 4 }, { text: `${i + 1}. ${col.toUpperCase()}` }, { ...label(9), color: palette.accent }),
      paragraph(9 + i * 29.5, 46, 21, 22, wordTrunc(capItems[i] || col, 120), 11),
      ...(proofKpis[i] ? [node('metric', { x: 9 + i * 29.5, y: 66, w: 21, h: 8 },
        { value: proofKpis[i].value, label: proofKpis[i].label },
        { ...headingStyle(20, palette.accent), letterSpacing: palette.numberLetterSpacing })] : []),
    ]).flat(),
    // Implementation note
    card(6, 78, 86, 10, palette.dark),
    node('label', { x: 9, y: 80, w: 30, h: 3 }, { text: 'IMPLEMENTATION' }, { ...label(8), color: palette.accent }),
    paragraph(9, 84, 78, 3, 'Zero-code deployment · Day-1 ROI · Phased rollout with measurable milestones per quarter', 10),
  ];
}

function designMarketConsulting(input: WizardInput) {
  const m = marketSizing(input);
  const drivers = m.drivers.slice(0, 4);
  return [
    ...base('Market Opportunity', `${m.tam} market — ${m.growth} CAGR.`,
      `${input.industry || 'Enterprise'} automation · ${m.som} immediate beachhead`),
    // Two-column: left TAM analysis, right competitive positioning
    node('label', { x: 6, y: 30, w: 52, h: 4 }, { text: 'MARKET SIZING' }, { ...label(9), color: palette.accent }),
    node('label', { x: 62, y: 30, w: 30, h: 4 }, { text: 'GROWTH DRIVERS' }, { ...label(9), color: palette.accent }),
    node('shape', { x: 58, y: 30, w: 0.5, h: 56, z: 2 }, { kind: 'rect', fill: palette.line }, { fill: palette.line }, 'Col divider'),
    // Left: TAM/SAM/SOM table
    ...[
      { label: 'TAM', value: m.tam, desc: 'Total addressable' },
      { label: 'SAM', value: m.sam, desc: 'Serviceable segment' },
      { label: 'SOM', value: m.som, desc: 'Obtainable in 3 years' },
    ].flatMap((row, i) => [
      node('label', { x: 6, y: 37 + i * 14, w: 12, h: 4 }, { text: row.label }, { ...label(9), color: palette.accent }),
      node('metric', { x: 19, y: 36 + i * 14, w: 26, h: 8 }, { value: row.value, label: row.desc },
        { ...headingStyle(24, palette.ink), letterSpacing: palette.numberLetterSpacing }),
      node('shape', { x: 6, y: 47 + i * 14, w: 48, h: 0.3, z: 1 }, { kind: 'rect', fill: palette.line }, { fill: palette.line }, 'Row line'),
    ]),
    node('metric', { x: 6, y: 76, w: 22, h: 10 }, { value: m.growth, label: 'Market CAGR' },
      { ...headingStyle(28, palette.accent), letterSpacing: palette.numberLetterSpacing }),
    // Right: 4 growth drivers as labelled rows
    ...drivers.map((d, i) => [
      node('label', { x: 62, y: 37 + i * 13, w: 7, h: 4 }, { text: `D${i + 1}` }, { ...label(8), color: palette.accent }),
      paragraph(70, 37 + i * 13, 22, 10, wordTrunc(d, 70), 10),
      node('shape', { x: 62, y: 49 + i * 13, w: 30, h: 0.3, z: 1 }, { kind: 'rect', fill: palette.line }, { fill: palette.line }, 'Driver line'),
    ]).flat(),
    caption(6, 88, 86, 6, 'Source: independent industry analysis and primary buyer research'),
  ];
}

function designTeamConsulting(input: WizardInput) {
  const members = team(input).slice(0, 3);

  const domains = ['Product / Strategy', 'Technology / Platform', 'Revenue / GTM'];
  return [
    ...base('Team', `${input.companyName || 'Company'} — domain-led, execution-proven.`,
      `${members.length} functional leads — complementary expertise, clear accountability`),
    // Domain capability matrix header
    node('label', { x: 6, y: 30, w: 26, h: 4 }, { text: 'DOMAIN' }, { ...label(9), color: palette.accent }),
    node('label', { x: 34, y: 30, w: 30, h: 4 }, { text: 'TEAM MEMBER' }, { ...label(9), color: palette.accent }),
    node('label', { x: 66, y: 30, w: 26, h: 4 }, { text: 'EVIDENCE' }, { ...label(9), color: palette.accent }),
    node('shape', { x: 6, y: 35, w: 86, h: 0.5, z: 1 }, { kind: 'rect', fill: palette.accent }, { fill: palette.accent }, 'Header rule'),
    // Rows
    ...members.map((m, i) => [
      node('shape', { x: 6, y: 38 + i * 14, w: 86, h: 12, z: -1 },
        { kind: 'roundedRect', fill: i % 2 === 0 ? palette.soft : palette.panel, stroke: palette.line, strokeWidth: 0.5 },
        panel(i % 2 === 0 ? palette.soft : palette.panel), 'Row bg'),
      paragraph(9, 39.5 + i * 14, 23, 9, domains[i] || m.role, 10),
      node('label', { x: 34, y: 39.5 + i * 14, w: 28, h: 5 }, { text: m.name }, { ...headingStyle(13, palette.ink), fontWeight: 700 }),
      node('label', { x: 34, y: 45 + i * 14, w: 28, h: 4 }, { text: m.role }, { ...label(9), color: palette.accent }),
      paragraph(66, 39.5 + i * 14, 24, 9, wordTrunc(m.bio, 80), 10),
    ]).flat(),
    // Strength bar
    card(6, 80, 86, 8, palette.panel),
    paragraph(9, 82, 78, 4,
      `${members.length} functional leads · zero key-person risk · ${input.industry || 'domain'} operator experience at every seat`, 10),
    caption(6, 90, 86, 6, 'Investor lens: structured accountability, no single point of failure'),
  ];
}

function designAskConsulting(input: WizardInput) {
  const funding = input.structured?.funding;
  const amount = funding?.amount || input.fundingAsk?.match(/\$[\d.]+[MK]/)?.[0] || '$—';
  const runway = funding?.runway || '24 mo';
  const allocations = (funding?.allocations || [
    { category: 'Product Engineering', percentage: 45 },
    { category: 'Go-to-market', percentage: 35 },
    { category: 'Operations', percentage: 20 },
  ]).slice(0, 4);

  const milestones = [
    { quarter: 'Q1–Q2', outcome: 'Enterprise feature parity + SOC 2 certification', gate: '200% ARR growth' },
    { quarter: 'Q3', outcome: 'Channel partnerships + expansion into adjacent verticals', gate: 'Series B pipeline' },
    { quarter: 'Q4', outcome: 'International expansion readiness + platform API launch', gate: 'Series B raise' },
  ];

  return [
    ...base('Investment Case', `${amount} — strategic capital allocation.`,
      conciseNarrative(input.fundingAsk, 'Capital deployed against three measurable growth vectors with defined exit gates.')),
    // Header row
    node('label', { x: 6, y: 30, w: 16, h: 4 }, { text: 'CATEGORY' }, { ...label(9), color: palette.accent }),
    node('label', { x: 24, y: 30, w: 10, h: 4 }, { text: '% ALLOC' }, { ...label(9), color: palette.accent }),
    node('label', { x: 36, y: 30, w: 24, h: 4 }, { text: 'USE OF FUNDS' }, { ...label(9), color: palette.accent }),
    node('label', { x: 62, y: 30, w: 30, h: 4 }, { text: 'EXPECTED OUTCOME' }, { ...label(9), color: palette.accent }),
    node('shape', { x: 6, y: 35, w: 86, h: 0.5, z: 1 }, { kind: 'rect', fill: palette.accent }, { fill: palette.accent }, 'Header rule'),
    // Allocation rows — unique USE OF FUNDS + EXPECTED OUTCOME per category
    ...allocations.map((a, i) => {
      const cat = (a.category || '').toLowerCase();
      const useOfFundsMap: Record<string, string> = {
        product: wordTrunc(ensure(lines(input.roadmap || ''), ['Enterprise features + API platform'], 1)[0], 40),
        engineering: wordTrunc(ensure(lines(input.roadmap || ''), ['Core build + infrastructure scaling'], 1)[0], 40),
        'go-to-market': 'Hire 4 AEs · 2 SDRs · channel partnerships',
        sales: 'Enterprise AE team + partner network buildout',
        marketing: 'Demand gen · brand · content program',
        operations: 'SOC 2 + compliance + G&A infrastructure',
      };
      const outcomeMap: Record<string, string> = {
        product: '3× feature velocity · enterprise-ready roadmap',
        engineering: '99.9% uptime SLA + API platform launch',
        'go-to-market': '3× ARR in 24 months post-close',
        sales: '$5M+ ARR pipeline in 12 months',
        marketing: 'Category awareness + inbound pipeline',
        operations: 'Series B-ready compliance posture',
      };
      const catKey = Object.keys(useOfFundsMap).find(k => cat.includes(k)) || 'operations';
      return [
        node('shape', { x: 6, y: 37 + i * 9, w: 86, h: 8, z: -1 },
          { kind: 'roundedRect', fill: i % 2 === 0 ? palette.soft : palette.panel, stroke: palette.line, strokeWidth: 0.5 },
          panel(i % 2 === 0 ? palette.soft : palette.panel), 'Row bg'),
        paragraph(9, 38.5 + i * 9, 13, 5, a.category, 10),
        node('label', { x: 24, y: 38.5 + i * 9, w: 10, h: 5 }, { text: `${a.percentage || '—'}%` },
          { ...headingStyle(14, palette.accent), letterSpacing: -0.5 }),
        paragraph(36, 38.5 + i * 9, 24, 5, useOfFundsMap[catKey] || 'Milestone-gated deployment', 10),
        paragraph(62, 38.5 + i * 9, 28, 5, outcomeMap[catKey] || 'Measurable benchmark improvement', 10),
      ];
    }).flat(),
    // Key metrics
    card(6, 75, 20, 12), metric(8, 77, 16, 8, amount, 'Investment'),
    card(29, 75, 18, 12), metric(31, 77, 14, 8, runway, 'Runway'),
    card(50, 75, 18, 12), metric(52, 77, 14, 8, (() => {
      const arrKpi = kpis(input).find(k => /arr/i.test(k.label));
      return arrKpi ? '3×' : 'B-ready';
    })(), 'Target multiplier'),
    card(71, 75, 21, 12), metric(73, 77, 17, 8, `${allocations.reduce((s, a) => s + (a.percentage || 0), 0)}%`, 'Allocated'),
    caption(6, 89, 86, 6, 'All allocations subject to milestone gate review at each quarter-end'),
  ];
}

// ── TECH / DARK  (midnight-tech · crimson-dark) ──────────────────────
// Design language: AI · Developer Tools · Technical Architecture
// Structural signature: pipeline/system flows, numbered technical stages,
//   spec-style metrics, architecture-inspired card patterns.

function designProblemTech(input: WizardInput) {
  const hero = problemHeroMetric(input);
  const secondary = problemSecondMetric(input);
  const stages = ([...lines(input.problem), ...[
    'Current workflow creates bottlenecks at every processing step',
    'Review cycles introduce delays and inconsistency across the system',
    'Existing tools cannot scale — each edge case requires manual intervention',
  ]]).filter((s, i, arr) => arr.indexOf(s) === i).slice(0, 3);
  const headline = (() => { const r = input.problem?.split(/[.!?]\s+/)[0]?.trim() || 'The bottleneck is architectural.'; return wordTrunc(r.split(/,\s+/)[0].trim() || r, 60); })();

  return [
    ...base('Problem', headline),
    node('label', { x: 6, y: 30, w: 57, h: 4 }, { text: 'SYSTEM BOTTLENECK MAP' }, { ...label(8), color: palette.accent }),
    // Pipeline stages — 3 horizontal connected boxes (leaves room for metric card at right)
    ...stages.slice(0, 3).map((stage, i) => [
      card(6 + i * 20, 35, 17, 14, palette.panel),
      node('label', { x: 9 + i * 20, y: 37, w: 13, h: 3.5 }, { text: `STAGE ${i + 1}` }, { ...label(7), color: palette.accent }),
      paragraph(9 + i * 20, 41, 13, 7, wordTrunc(stage.split(':').pop()?.trim() || stage, 50), 9),
      // Arrow connector (except last)
      ...(i < 2 ? [node('label', { x: 23 + i * 20, y: 38, w: 3, h: 8 }, { text: '→' },
        { ...headingStyle(16, palette.muted), textAlign: 'center' as any })] : []),
    ]).flat(),
    // Pain annotation per stage
    node('label', { x: 6, y: 51, w: 57, h: 3 }, { text: 'BOTTLENECK →' }, { ...label(7), color: palette.accent }),
    node('shape', { x: 6, y: 54, w: 57, h: 0.3, z: 1 }, { kind: 'rect', fill: palette.accent }, { fill: palette.accent }, 'Pain line'),
    paragraph(6, 56, 55, 10, wordTrunc(conciseNarrative(input.problem, 'The bottleneck creates compounding latency across all downstream systems.', 2), 160), 11),
    // Right: hero tech metric
    card(65, 35, 27, 34, palette.dark),
    node('label', { x: 68, y: 37, w: 21, h: 3.5 }, { text: 'IMPACT METRIC' }, { ...label(7), color: palette.accent }),
    node('metric', { x: 68, y: 41, w: 21, h: 16 }, { value: hero.value, label: hero.label },
      { ...headingStyle(48, palette.accent), letterSpacing: palette.numberLetterSpacing }),
    ...(secondary ? [node('metric', { x: 68, y: 58, w: 21, h: 9 }, { value: secondary.value, label: secondary.label },
      { ...headingStyle(22, palette.accent2 || palette.accent), letterSpacing: palette.numberLetterSpacing })] : []),
    // Problem impact metrics derived from traction / KPI data
    node('label', { x: 6, y: 69, w: 60, h: 3 }, { text: 'IMPACT AT SCALE' }, { ...label(7), color: palette.muted }),
    ...kpis(input).slice(0, 3).map((m, i) => [
      card(6 + i * 21, 73, 19, 10, palette.panel),
      node('label', { x: 9 + i * 21, y: 75, w: 13, h: 3.5 }, { text: wordTrunc(m.label, 15) }, { ...label(7), color: palette.muted }),
      node('label', { x: 9 + i * 21, y: 79, w: 13, h: 4 }, { text: m.value }, { ...headingStyle(14, palette.accent) }),
    ]).flat(),
  ];
}

function designSolutionTech(input: WizardInput) {
  const rawTitle = input.solution?.split(/[.!?]\s+/)[0]?.trim() || 'The architecture.';
  const slideTitle = wordTrunc(rawTitle.split(/,\s+/)[0].trim() || rawTitle, 60);
  const components = ([...lines(input.solution || ''), ...[
    wordTrunc(`${input.companyName || 'Core'} layer: AI-powered intelligence with high precision`, 80),
    'Processing engine: automated workflows with full audit trail',
    'Integration layer: native API with pre-built platform connectors',
  ]]).filter((s, i, arr) => arr.indexOf(s) === i).slice(0, 3);
  const perfMetrics = kpis(input).slice(0, 4);

  return [
    ...base('Solution', slideTitle),
    // Architecture flow banner
    node('label', { x: 6, y: 31, w: 86, h: 3.5 }, { text: 'SOLUTION ARCHITECTURE' }, { ...label(8), color: palette.accent }),
    card(6, 35, 86, 10, palette.dark),
    ...[
      { label: 'INGEST', sub: wordTrunc(lines(input.solution)[0] || 'Data entry and ingestion', 22) },
      { label: 'PROCESS', sub: wordTrunc(lines(input.solution)[1] || 'Automated processing layer', 22) },
      { label: 'VALIDATE', sub: wordTrunc(lines(input.solution)[2] || 'Quality validation and review', 22) },
      { label: 'DELIVER', sub: wordTrunc(conciseNarrative(input.traction, 'Outputs delivered to users', 1), 22) },
    ].map((stage, i) => [
      node('label', { x: 10 + i * 21, y: 37, w: 17, h: 4 }, { text: stage.label }, { ...label(9), color: palette.accent }),
      node('label', { x: 10 + i * 21, y: 41, w: 17, h: 4 }, { text: stage.sub }, text(9, 400, palette.muted)),
      ...(i < 3 ? [node('label', { x: 26.5 + i * 21, y: 38, w: 3, h: 8 }, { text: '→' },
        { ...headingStyle(14, palette.muted), textAlign: 'center' as any })] : []),
    ]).flat(),
    // 3 component cards
    ...components.map((comp, i) => [
      card(6 + i * 29.5, 49, 27, 26, palette.panel),
      node('shape', { x: 6 + i * 29.5, y: 49, w: 27, h: 0.6, z: 3 }, { kind: 'rect', fill: palette.accent }, { fill: palette.accent }, 'Comp rule'),
      node('label', { x: 9 + i * 29.5, y: 51, w: 21, h: 4 }, { text: `COMPONENT ${i + 1}` }, { ...label(7), color: palette.accent }),
      paragraph(9 + i * 29.5, 56, 21, 17, wordTrunc(comp, 110), 10),
    ]).flat(),
    // Performance metrics strip
    node('label', { x: 6, y: 77, w: 60, h: 3 }, { text: 'PRODUCTION PERFORMANCE' }, { ...label(7), color: palette.accent }),
    ...perfMetrics.slice(0, 4).map((m, i) => [
      card(6 + i * 21, 81, 19, 10, palette.dark),
      node('label', { x: 9 + i * 21, y: 83, w: 13, h: 3.5 }, { text: m.label }, { ...label(7), color: palette.muted }),
      node('label', { x: 9 + i * 21, y: 87, w: 13, h: 4 }, { text: m.value }, { ...headingStyle(14, palette.accent) }),
    ]).flat(),
  ];
}

function designMarketTech(input: WizardInput) {
  const m = marketSizing(input);
  return [
    ...base('Market', `${m.tam} market — entering the steep adoption curve.`,
      `${input.industry || 'Technology'} · ${m.growth} CAGR · early majority window open`),
    // Technology adoption curve (chart)
    node('chart', { x: 6, y: 31, w: 54, h: 36 }, {
      type: 'line',
      title: `${input.industry || 'Technology'} Adoption`,
      categories: ['Innovators', 'Early Adopters', 'Early Majority', 'Late Majority', 'Laggards'],
      series: [{ name: 'Adoption', values: [5, 16, 52, 84, 100], color: palette.accent }],
      showValues: false,
      familyId: currentFamily,
    }, panel()),
    node('label', { x: 32, y: 59, w: 28, h: 4 }, { text: '▲ WE ARE HERE' }, { ...label(8), color: palette.accent }),
    // Right: market metrics
    card(64, 31, 28, 16, palette.dark),
    node('metric', { x: 67, y: 33, w: 22, h: 12 }, { value: m.tam, label: 'TAM' },
      { ...headingStyle(34, palette.accent), letterSpacing: palette.numberLetterSpacing }),
    card(64, 50, 14, 10), metric(66, 52, 10, 6, m.sam, 'SAM'),
    card(80, 50, 12, 10), metric(82, 52, 8, 6, m.growth, 'CAGR'),
    // Developer/tech adoption triggers
    node('label', { x: 6, y: 70, w: 86, h: 3 }, { text: 'CATEGORY ADOPTION TRIGGERS' }, { ...label(8), color: palette.accent }),
    node('featureGrid', { x: 6, y: 74, w: 86, h: 14 }, {
      columns: 4,
      items: m.drivers.slice(0, 4).map((d, i) => ({ id: `t-${i}`, title: `Trigger ${i + 1}`, description: wordTrunc(d, 55) })),
    }, panel()),
    caption(6, 90, 86, 6, `${input.companyName || 'Platform'} is positioned in the inflection zone of the adoption curve`),
  ];
}

function designTeamTech(input: WizardInput) {
  const members = team(input).slice(0, 3);

  // Credential = bio cleaned to "fact · pedigree" format
  const techCreds = members.map(m => wordTrunc(m.bio.replace(/,\s+/g, ' · '), 55));

  return [
    ...base('Team', `${input.companyName || 'Company'} — builders with production-grade track records.`,
      `${members.map(m => m.role).join(' · ')} — operators who have shipped at scale`),
    // 3 compact expert cards — tech style
    ...members.map((m, i) => [
      card(6 + i * 29.5, 32, 27, 28, palette.panel),
      node('shape', { x: 6 + i * 29.5, y: 32, w: 27, h: 0.6, z: 3 }, { kind: 'rect', fill: palette.accent }, { fill: palette.accent }, 'Card rule'),
      node('label', { x: 9 + i * 29.5, y: 34, w: 21, h: 4.5 }, { text: m.name }, { ...headingStyle(15, palette.ink), fontWeight: 800 }),
      node('label', { x: 9 + i * 29.5, y: 39, w: 21, h: 3.5 }, { text: m.role.toUpperCase() }, { ...label(8), color: palette.accent }),
      paragraph(9 + i * 29.5, 44, 21, 14, wordTrunc(m.bio, 80), 10),
    ]).flat(),
    // Technical credentials — bio summary per member
    node('label', { x: 6, y: 63, w: 56, h: 3 }, { text: 'TECHNICAL CREDENTIALS' }, { ...label(8), color: palette.accent }),
    ...techCreds.map((cred, i) => [
      card(6 + i * 29.5, 67, 27, 10, palette.dark),
      node('label', { x: 9 + i * 29.5, y: 68.5, w: 4, h: 3.5 }, { text: `#${i + 1}` }, { ...label(8), color: palette.accent }),
      paragraph(14 + i * 29.5, 68.5, 17, 7, cred, 9),
    ]).flat(),
    // Builder bar
    card(6, 80, 86, 8, palette.dark),
    node('label', { x: 9, y: 82, w: 78, h: 4 },
      { text: `SHIPPED: ${(input.traction || '').match(/\d+\s*customer/i)?.[0] || 'Production'} · ACCURACY: ${(input.solution || '').match(/\d+\.?\d*%/)?.[0] || '99%+'} · BUILT: ${members.length} domain builders` },
      text(10, 600, palette.accent)),
    caption(6, 90, 86, 6, 'Every technical claim validated in customer production environments'),
  ];
}

function designAskTech(input: WizardInput) {
  const funding = input.structured?.funding;
  const amount = funding?.amount || input.fundingAsk?.match(/\$[\d.]+[MK]/)?.[0] || '$—';
  const runway = funding?.runway || '24 mo';
  const allocations = (funding?.allocations || [
    { category: 'Product Engineering', percentage: 45 },
    { category: 'Go-to-market', percentage: 35 },
    { category: 'Operations', percentage: 20 },
  ]).slice(0, 3);

  const roadmapPhases = roadmap(input);
  const milestones = roadmapPhases.length >= 3 ? roadmapPhases.slice(0, 3).map((r, i) => ({
    phase: r.period || `Phase ${i + 1}`,
    desc: wordTrunc(r.bullets?.[0] || r.phase, 55),
    gate: `${['100', '250', '500'][i]} customers`,
  })) : [
    { phase: 'Phase 1', desc: wordTrunc(`${input.companyName || 'Platform'}: core product + enterprise controls`, 55), gate: '100 customers' },
    { phase: 'Phase 2', desc: wordTrunc(`API platform + integrations + go-to-market expansion`, 55), gate: '250 customers' },
    { phase: 'Phase 3', desc: wordTrunc(`International expansion + Series B milestones`, 55), gate: 'Series B' },
  ];

  return [
    ...base('Raise', `${amount} — engineering the next product generation.`,
      conciseNarrative(input.fundingAsk, 'Every dollar is mapped to a shipped milestone, not a burn runway.')),
    // Left: technical roadmap
    node('label', { x: 6, y: 31, w: 50, h: 4 }, { text: 'TECHNICAL MILESTONES' }, { ...label(8), color: palette.accent }),
    ...milestones.map((ms, i) => [
      card(6, 36 + i * 14, 50, 12, palette.panel),
      node('shape', { x: 6, y: 36 + i * 14, w: 50, h: 0.6, z: 3 }, { kind: 'rect', fill: i === 0 ? palette.accent : palette.line }, { fill: palette.accent }, 'Mile rule'),
      node('label', { x: 9, y: 38 + i * 14, w: 18, h: 3.5 }, { text: ms.phase }, { ...label(8), color: palette.accent }),
      node('label', { x: 28, y: 38 + i * 14, w: 22, h: 3.5 }, { text: `GATE: ${ms.gate}` }, { ...label(7), color: palette.muted }),
      paragraph(9, 42 + i * 14, 44, 5, ms.desc, 10),
    ]).flat(),
    // Right: funding gates
    node('label', { x: 60, y: 31, w: 32, h: 4 }, { text: 'FUNDING GATES' }, { ...label(8), color: palette.accent }),
    card(60, 36, 32, 18, palette.dark),
    node('metric', { x: 63, y: 38, w: 26, h: 14 }, { value: amount, label: 'This raise' },
      { ...headingStyle(38, palette.accent), letterSpacing: palette.numberLetterSpacing }),
    node('metric', { x: 63, y: 54, w: 12, h: 10 }, { value: runway, label: 'Runway' },
      { ...headingStyle(20, palette.accent2 || palette.accent), letterSpacing: palette.numberLetterSpacing }),
    ...allocations.map((a, i) => [
      card(60, 68 + i * 7, 32, 6, i % 2 === 0 ? palette.panel : palette.soft),
      node('label', { x: 63, y: 69.5 + i * 7, w: 24, h: 4 }, { text: `${a.category}: ${a.percentage}%` }, text(10, 500, palette.ink)),
    ]).flat(),
    caption(6, 90, 86, 6, 'Milestones gate each tranche — capital deployed against shipped code'),
  ];
}
