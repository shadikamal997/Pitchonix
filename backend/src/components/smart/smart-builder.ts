// =============================================================================
//  Smart Component Builders — Phase 32.75 Tier 3
//
//  One pure function per (componentType). All functions take FamilyTokens
//  and return a SlideElement[] in component-local 0..100 coordinates. The
//  Tier 2 instance resolver translates these to slide coordinates at
//  insert time, so the same component looks correct at any size.
//
//  Builders deliberately stay close to existing element types (heading,
//  paragraph, metric, kpi, pricingCard, teamCard, roadmap, timeline,
//  featureGrid, comparison, swot, processSteps, quote, testimonial, shape,
//  chart) so the existing renderers (canvas + PPTX + HTML/PDF/PNG/JPEG)
//  pick them up with zero changes.
//
//  Each function consults FamilyTokens for colour, radius, typography,
//  spacing, labelTransform. That's the only inheritance contract — change
//  a family token and every smart component of that family changes too.
// =============================================================================

import type { SlideElementDTO, ElementStyle } from '../../slides/element-types';
import type { FamilyTokens } from './family-tokens';
import type { SmartComponentType } from './smart-types';

const NOW = '1970-01-01T00:00:00.000Z'; // pure builders — no real time

// =============================================================================
//  Helpers
// =============================================================================

let elementCounter = 0;
function el(
  type: SlideElementDTO['type'],
  geo: { x: number; y: number; w: number; h: number; z?: number; rotation?: number },
  content: any = null,
  style: ElementStyle | null = null,
): SlideElementDTO {
  return {
    id: `smart-${++elementCounter}`,
    slideId: '',
    type,
    name: null,
    order: 0,
    x: geo.x, y: geo.y, width: geo.w, height: geo.h,
    rotation: geo.rotation ?? 0,
    zIndex: geo.z ?? 0,
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

/** Background card shared by most builders. */
function card(tokens: FamilyTokens, geo: { x: number; y: number; w: number; h: number; z?: number }): SlideElementDTO {
  return el('shape', { ...geo, z: geo.z ?? -1 }, {
    kind: tokens.radius >= 12 ? 'roundedRect' : 'rect',
    fill: tokens.surface,
    stroke: tokens.strokeWidth > 0 ? tokens.border : undefined,
    strokeWidth: tokens.strokeWidth,
  }, { borderRadius: tokens.radius, shadow: tokens.shadow });
}

function headingStyle(tokens: FamilyTokens, size = 28): ElementStyle {
  return {
    fontFamily: tokens.fontHeading,
    fontWeight: tokens.fontWeightHeading,
    fontSize:   size,
    color:      tokens.text,
    letterSpacing: tokens.numberLetterSpacing,
  };
}

function labelStyle(tokens: FamilyTokens, size = 11): ElementStyle {
  return {
    fontFamily: tokens.fontBody,
    fontWeight: 600,
    fontSize: size,
    color: tokens.muted,
    textTransform: tokens.labelTransform,
    letterSpacing: tokens.labelTransform === 'uppercase' ? 1.5 : 0,
  };
}

function bodyStyle(tokens: FamilyTokens, size = 12): ElementStyle {
  return {
    fontFamily: tokens.fontBody,
    fontWeight: tokens.fontWeightBody,
    fontSize: size,
    color: tokens.text,
  };
}

function accentStyle(tokens: FamilyTokens, size = 48): ElementStyle {
  return {
    fontFamily: tokens.fontHeading,
    fontWeight: tokens.fontWeightHeading + 100,
    fontSize: size,
    color: tokens.accent,
    letterSpacing: tokens.numberLetterSpacing,
  };
}

/** Reset counter so deterministic-ish ids across calls (helps testing). */
export function resetSmartElementCounter() { elementCounter = 0; }

// =============================================================================
//  Builders — one per SmartComponentType
//
//  Naming convention: build<Type>(tokens). All produce 0..100 local coords.
// =============================================================================

function buildKpiCard(t: FamilyTokens): SlideElementDTO[] {
  return [
    card(t, { x: 0, y: 0, w: 100, h: 100 }),
    el('label',  { x: 8,  y: 12, w: 84, h: 12 }, { text: 'Annual recurring revenue' }, labelStyle(t)),
    el('metric', { x: 8,  y: 26, w: 84, h: 50 }, {
      value: '$4.2M', unit: '', label: '', delta: '+58% YoY', deltaDirection: 'up',
    }, accentStyle(t, 56)),
    el('caption',{ x: 8,  y: 82, w: 84, h: 12 }, { text: 'Tracked monthly, 2026 cohort' }, bodyStyle(t, 11)),
  ];
}

function buildMetricCard(t: FamilyTokens): SlideElementDTO[] {
  return [
    card(t, { x: 0, y: 0, w: 100, h: 100 }),
    el('metric', { x: 6,  y: 18, w: 88, h: 56 }, {
      value: '92%', label: 'Retention', delta: '+3.4 pts', deltaDirection: 'up',
    }, accentStyle(t, 44)),
    el('caption', { x: 6,  y: 78, w: 88, h: 14 }, { text: 'Net dollar retention, last 4 quarters' }, bodyStyle(t, 11)),
  ];
}

function buildStatBlock(t: FamilyTokens): SlideElementDTO[] {
  // 3 KPIs side-by-side.
  const labels = ['Customers', 'Markets', 'NPS'];
  const values = ['1,240',     '14',      '72'];
  const cellW = 33;
  return [0, 1, 2].flatMap((i) => [
    card(t, { x: i * cellW + i, y: 0, w: cellW, h: 100 }),
    el('label',  { x: i * cellW + i + 4, y: 18, w: cellW - 8, h: 10 }, { text: labels[i] }, labelStyle(t)),
    el('metric', { x: i * cellW + i + 4, y: 32, w: cellW - 8, h: 60 }, { value: values[i] }, accentStyle(t, 42)),
  ]);
}

function buildPricingCard(t: FamilyTokens): SlideElementDTO[] {
  return [
    el('pricingCard', { x: 0, y: 0, w: 100, h: 100 }, {
      tiers: [
        {
          name: 'Pro', price: '$29', period: 'mo',
          features: ['Unlimited charts', 'Team workspaces', 'Priority support', 'Custom branding'],
          highlight: true,
        },
      ],
    }, {
      // Pricing cards already use the renderer's built-in chrome; theme via style.
      borderRadius: t.radius, fill: t.surface, color: t.accent,
      fontFamily: t.fontHeading, stroke: t.border,
    } as ElementStyle),
  ];
}

function buildPricingTable(t: FamilyTokens): SlideElementDTO[] {
  return [
    el('pricingCard', { x: 0, y: 0, w: 100, h: 100 }, {
      tiers: [
        { name: 'Starter', price: '$9',  period: 'mo', features: ['Up to 3 seats', 'Core charts', 'Email support'] },
        { name: 'Pro',     price: '$29', period: 'mo', features: ['Unlimited seats', 'All charts', 'Priority support'], highlight: true },
        { name: 'Team',    price: '$79', period: 'mo', features: ['SSO', 'Audit logs', 'SLA', 'Dedicated CSM'] },
      ],
    }, {
      borderRadius: t.radius, color: t.accent,
      fontFamily: t.fontHeading, stroke: t.border,
    } as ElementStyle),
  ];
}

function buildTeamCard(t: FamilyTokens): SlideElementDTO[] {
  return [
    el('teamCard', { x: 0, y: 0, w: 100, h: 100 }, {
      members: [{
        name: 'Alex Carter', role: 'Founder & CEO',
        bio: 'Ex-Stripe. Built X. 2× founder.',
      }],
    }, { color: t.text, fill: t.surface, borderRadius: t.radius } as ElementStyle),
  ];
}

function buildTeamGrid(t: FamilyTokens): SlideElementDTO[] {
  return [
    el('teamCard', { x: 0, y: 0, w: 100, h: 100 }, {
      members: [
        { name: 'Alex Carter',  role: 'CEO',  bio: 'ex-Stripe' },
        { name: 'Sam Lee',      role: 'CTO',  bio: 'ex-Google' },
        { name: 'Jo Park',      role: 'COO',  bio: 'ex-Airbnb' },
        { name: 'Riley Chen',   role: 'CMO',  bio: 'ex-Notion' },
      ],
    }, { color: t.text, fill: t.surface, borderRadius: t.radius } as ElementStyle),
  ];
}

function buildRoadmapBlock(t: FamilyTokens): SlideElementDTO[] {
  return [
    el('label',  { x: 0, y: 0, w: 100, h: 8 }, { text: 'Product Roadmap' }, labelStyle(t)),
    el('roadmap',{ x: 0, y: 12, w: 100, h: 88 }, {
      phases: [
        { period: 'Q1', phase: 'Foundation', bullets: ['Hire engineering', 'Close design partners', 'MVP shipped'] },
        { period: 'Q2', phase: 'Launch',     bullets: ['Public beta', 'PR push', 'First 100 customers'] },
        { period: 'Q3', phase: 'Scale',      bullets: ['Enterprise tier', 'Funnel optimisation', 'Series A'] },
        { period: 'Q4', phase: 'Expand',     bullets: ['EU expansion', 'API GA', 'SOC 2'] },
      ],
    }, { color: t.text, fill: t.surface, borderRadius: t.radius } as ElementStyle),
  ];
}

function buildTimelineBlock(t: FamilyTokens): SlideElementDTO[] {
  return [
    el('label',   { x: 0, y: 0, w: 100, h: 8 }, { text: 'Milestones' }, labelStyle(t)),
    el('timeline',{ x: 0, y: 12, w: 100, h: 88 }, {
      items: [
        { date: '2024',  title: 'Founded',     description: 'Two co-founders' },
        { date: '2025',  title: 'Seed round',  description: '$3M from a16z' },
        { date: '2026',  title: 'GA launch',   description: '14 pilot customers' },
        { date: '2027',  title: 'Series A',    description: 'Target $20M' },
      ],
    }, { color: t.text, fill: t.surface, borderRadius: t.radius } as ElementStyle),
  ];
}

function buildFeatureCard(t: FamilyTokens): SlideElementDTO[] {
  return [
    card(t, { x: 0, y: 0, w: 100, h: 100 }),
    el('heading',  { x: 8, y: 14, w: 84, h: 18 }, { text: 'Realtime insights' }, headingStyle(t, 24)),
    el('paragraph',{ x: 8, y: 36, w: 84, h: 50 }, {
      text: 'Charts update as your data changes. No manual refresh, no stale snapshots in your investor decks.',
    }, bodyStyle(t, 14)),
  ];
}

function buildFeatureGrid(t: FamilyTokens): SlideElementDTO[] {
  return [
    el('featureGrid', { x: 0, y: 0, w: 100, h: 100 }, {
      columns: 3,
      items: [
        { title: 'Realtime',     description: 'Live data wiring' },
        { title: 'Brand-aware',  description: 'Themes match your kit' },
        { title: 'Versioned',    description: 'Every change tracked' },
        { title: 'Collaborative',description: 'Co-edit decks live' },
        { title: 'Embeddable',   description: 'Share read-only links' },
        { title: 'Exportable',   description: 'PPTX / PDF / PNG / JPEG' },
      ],
    }, { color: t.text, fill: t.surface, borderRadius: t.radius } as ElementStyle),
  ];
}

function buildComparisonMatrix(t: FamilyTokens): SlideElementDTO[] {
  return [
    el('comparison', { x: 0, y: 0, w: 100, h: 100 }, {
      columns: ['Pitchonix', 'Competitor A', 'Competitor B'],
      rows: [
        { feature: 'AI generation',        values: ['Yes', 'Yes', 'No'] },
        { feature: 'Realtime charts',      values: ['Yes', 'No',  'Partial'] },
        { feature: 'Brand kits',           values: ['Yes', 'Yes', 'Yes'] },
        { feature: 'Linked components',    values: ['Yes', 'No',  'No'] },
        { feature: 'PPTX/PDF parity',      values: ['Yes', 'Partial', 'No'] },
      ],
      highlightColumn: 0,
    }, { color: t.text, fill: t.surface, borderRadius: t.radius } as ElementStyle),
  ];
}

function buildSwotBlock(t: FamilyTokens): SlideElementDTO[] {
  return [
    el('swot', { x: 0, y: 0, w: 100, h: 100 }, {
      strengths:    ['AI-native generation', 'Component library', 'Theme parity'],
      weaknesses:   ['Brand awareness', 'Early enterprise feature gaps'],
      opportunities:['Investor-deck SaaS niche', 'PPTX→Web shift'],
      threats:      ['Incumbents adding AI', 'Pricing race to bottom'],
    }, { color: t.text, fill: t.surface, borderRadius: t.radius } as ElementStyle),
  ];
}

function buildProcessFlow(t: FamilyTokens): SlideElementDTO[] {
  return [
    el('processSteps', { x: 0, y: 0, w: 100, h: 100 }, {
      steps: [
        { title: 'Brief',    description: 'Capture the goal and audience' },
        { title: 'Generate', description: 'AI drafts the deck structure' },
        { title: 'Refine',   description: 'Editor tightens content + visuals' },
        { title: 'Export',   description: 'PPTX, PDF, or share link' },
      ],
    }, { color: t.text, fill: t.surface, borderRadius: t.radius } as ElementStyle),
  ];
}

function buildQuoteCard(t: FamilyTokens): SlideElementDTO[] {
  return [
    card(t, { x: 0, y: 0, w: 100, h: 100 }),
    el('quote', { x: 6, y: 12, w: 88, h: 76 }, {
      text: 'Pitchonix turned a week of slide-wrangling into an afternoon of polish.',
      attribution: 'Dana W.',
      role: 'Head of Strategy',
    }, { color: t.text, fontFamily: t.fontHeading } as ElementStyle),
  ];
}

function buildTestimonialCard(t: FamilyTokens): SlideElementDTO[] {
  return [
    el('testimonial', { x: 0, y: 0, w: 100, h: 100 }, {
      quote:   'Decks that used to take a week now ship in an afternoon. The component library kept our brand consistent across 40 sales reps.',
      author:  'Dana Wright',
      role:    'Head of Strategy',
      company: 'Cykel',
    }, { color: t.text, fill: t.surface, borderRadius: t.radius } as ElementStyle),
  ];
}

function buildFundingBlock(t: FamilyTokens): SlideElementDTO[] {
  return [
    el('label',  { x: 0, y: 0, w: 100, h: 8 }, { text: 'Investment ask' }, labelStyle(t)),
    el('shape',  { x: 0, y: 10, w: 32, h: 90, z: -1 }, { kind: tokens(t).rect, fill: t.surface, stroke: t.border, strokeWidth: t.strokeWidth }, { borderRadius: t.radius }),
    el('shape',  { x: 34, y: 10, w: 32, h: 90, z: -1 }, { kind: tokens(t).rect, fill: t.surface, stroke: t.border, strokeWidth: t.strokeWidth }, { borderRadius: t.radius }),
    el('shape',  { x: 68, y: 10, w: 32, h: 90, z: -1 }, { kind: tokens(t).rect, fill: t.surface, stroke: t.border, strokeWidth: t.strokeWidth }, { borderRadius: t.radius }),
    el('label',  { x: 2,  y: 18, w: 28, h: 8 }, { text: 'Raising' }, labelStyle(t)),
    el('metric', { x: 2,  y: 30, w: 28, h: 60 }, { value: '$8M' }, accentStyle(t, 42)),
    el('label',  { x: 36, y: 18, w: 28, h: 8 }, { text: 'Pre-money' }, labelStyle(t)),
    el('metric', { x: 36, y: 30, w: 28, h: 60 }, { value: '$32M' }, accentStyle(t, 42)),
    el('label',  { x: 70, y: 18, w: 28, h: 8 }, { text: 'Runway' }, labelStyle(t)),
    el('metric', { x: 70, y: 30, w: 28, h: 60 }, { value: '24 mo' }, accentStyle(t, 42)),
  ];
}

function buildMarketOpportunity(t: FamilyTokens): SlideElementDTO[] {
  return [
    el('label',   { x: 0, y: 0, w: 100, h: 8 }, { text: 'Market opportunity' }, labelStyle(t)),
    card(t, { x: 0, y: 12, w: 60, h: 88 }),
    el('heading', { x: 4, y: 18, w: 52, h: 14 }, { text: '$48B total addressable market' }, headingStyle(t, 22)),
    el('paragraph',{ x: 4, y: 36, w: 52, h: 56 }, {
      text: 'Enterprise presentation software is a $48B category growing 11% YoY. AI-native incumbents capture <2% today; the remaining 98% is incumbent-controlled and ripe for disruption.',
    }, bodyStyle(t, 13)),
    el('chart',   { x: 62, y: 12, w: 38, h: 88 }, {
      type: 'donut', title: 'Category share',
      categories: ['Incumbents', 'AI-native', 'Open source'],
      series: [{ name: 'Share', values: [82, 12, 6], color: t.accent }],
      familyId: undefined,
    }),
  ];
}

function buildTamSamSom(t: FamilyTokens): SlideElementDTO[] {
  return [
    el('label', { x: 0, y: 0, w: 100, h: 8 }, { text: 'TAM · SAM · SOM' }, labelStyle(t)),
    el('chart', { x: 0, y: 12, w: 100, h: 88 }, {
      type: 'funnel', title: '',
      categories: ['TAM', 'SAM', 'SOM'],
      series: [{ name: 'Market size', values: [48, 12, 1.4], color: t.accent }],
    }),
  ];
}

function buildRiskMatrix(t: FamilyTokens): SlideElementDTO[] {
  return [
    el('label', { x: 0, y: 0, w: 100, h: 8 }, { text: 'Risk matrix' }, labelStyle(t)),
    el('chart', { x: 0, y: 12, w: 100, h: 88 }, {
      type: 'matrix2x2', title: '',
      categories: ['Low impact', 'High impact'],
      series: [{ name: 'Risk', values: [
        // packed (likelihood, impact) pairs; resolver handles 2x2 chart shape
        1, 1, 3, 1, 1, 3, 3, 3,
      ], color: t.accent }],
    }),
  ];
}

// Small helper so the funding block can pick the right shape `kind`.
function tokens(t: FamilyTokens) {
  return { rect: t.radius >= 12 ? 'roundedRect' : 'rect' as const };
}

// =============================================================================
//  Tier 6 builders (10 new component types)
// =============================================================================

function buildCoverCard(t: FamilyTokens): SlideElementDTO[] {
  // Family-aware cover. Dark families get an inverted feel; serif families a
  // hairline rule; gradient gets a glass card.
  const out: SlideElementDTO[] = [
    el('shape', { x: 0, y: 0, w: 100, h: 100, z: -10 }, {
      kind: tokens(t).rect, fill: t.bg, stroke: t.border, strokeWidth: 0,
    }, { borderRadius: 0 }),
    el('label',  { x: 8,  y: 18, w: 84, h: 6 }, { text: 'Pitchonix · 2026' }, labelStyle(t, 11)),
    el('heading',{ x: 8,  y: 26, w: 84, h: 30 }, {
      text: 'Building the design system for AI-native presentations.',
    }, headingStyle(t, 48)),
    // family-distinctive accent: thin rule for editorial/luxury, accent bar for crimson/startup
    el('shape', { x: 8,  y: 60, w: 24, h: 1.5, z: 0 }, {
      kind: 'rect', fill: t.accent, stroke: undefined, strokeWidth: 0,
    }, { borderRadius: tokens(t).rect === 'roundedRect' ? 8 : 0 }),
    el('paragraph', { x: 8, y: 64, w: 84, h: 18 }, {
      text: 'A complete component library across 8 design families, with linked instances, smart components, and editor-export parity.',
    }, bodyStyle(t, 16)),
    el('caption', { x: 8, y: 90, w: 84, h: 6 }, {
      text: 'Series A · Confidential',
    }, labelStyle(t, 10)),
  ];
  return out;
}

function buildExecutiveSummary(t: FamilyTokens): SlideElementDTO[] {
  // Heading + 4 stat tiles + narrative paragraph.
  const out: SlideElementDTO[] = [
    el('heading', { x: 0,  y: 0,  w: 100, h: 10 }, { text: 'Executive Summary' }, headingStyle(t, 24)),
    el('paragraph', { x: 0, y: 12, w: 100, h: 18 }, {
      text: 'We are building the AI-native presentation platform for B2B SaaS. ARR is up 58% YoY with 1,240 active customers; we are raising $8M Series A to expand into Europe and ship the enterprise tier.',
    }, bodyStyle(t, 14)),
  ];
  const labels = ['ARR', 'Customers', 'Growth', 'NPS'];
  const values = ['$4.2M', '1,240', '+58%', '72'];
  const cellW = 24; const gap = 1.3;
  for (let i = 0; i < 4; i++) {
    const x = i * (cellW + gap);
    out.push(card(t, { x, y: 36, w: cellW, h: 36 }));
    out.push(el('label',  { x: x + 2, y: 40, w: cellW - 4, h: 6 }, { text: labels[i] }, labelStyle(t)));
    out.push(el('metric', { x: x + 2, y: 48, w: cellW - 4, h: 24 }, { value: values[i] }, accentStyle(t, 32)));
  }
  out.push(el('caption', { x: 0, y: 76, w: 100, h: 8 }, {
    text: 'Numbers as of Q1 2026 · projections in deck pages 8–11',
  }, bodyStyle(t, 11)));
  return out;
}

function buildNarrativeBlock(t: FamilyTokens): SlideElementDTO[] {
  return [
    card(t, { x: 0, y: 0, w: 100, h: 100 }),
    el('label',     { x: 6, y: 8, w: 88, h: 6 }, { text: 'Why now' }, labelStyle(t)),
    el('heading',   { x: 6, y: 16, w: 88, h: 18 }, {
      text: 'The presentation tooling layer has not changed since 2007.',
    }, headingStyle(t, 24)),
    el('paragraph', { x: 6, y: 38, w: 88, h: 56 }, {
      text: 'Knowledge workers ship multi-million-dollar decisions through 20-year-old slide tools. AI changed how the content is generated, but the *system* — components, design language, export fidelity — is still hand-rolled per deck. We are rebuilding that system from first principles.',
    }, bodyStyle(t, 14)),
  ];
}

function buildVisionBlock(t: FamilyTokens): SlideElementDTO[] {
  return [
    card(t, { x: 0, y: 0, w: 100, h: 100 }),
    el('label', { x: 8, y: 14, w: 84, h: 8 }, { text: 'Our Vision' }, labelStyle(t)),
    el('quote', { x: 8, y: 26, w: 84, h: 56 }, {
      text: 'Every deck should feel as designed as the company behind it — without the design team.',
      attribution: 'Pitchonix manifesto',
    }, {
      fontFamily: t.fontHeading, color: t.accent,
      letterSpacing: t.numberLetterSpacing, fontWeight: t.fontWeightHeading,
    } as ElementStyle),
  ];
}

function buildFinancialDashboard(t: FamilyTokens): SlideElementDTO[] {
  // 3 KPI tiles + a chart.
  const out: SlideElementDTO[] = [];
  out.push(el('label', { x: 0, y: 0, w: 100, h: 6 }, { text: 'Financial Outlook · 3-Year' }, labelStyle(t)));
  const labels = ['Revenue 2028', 'Gross Margin', 'EBITDA Margin'];
  const values = ['$32M', '82%', '18%'];
  for (let i = 0; i < 3; i++) {
    const x = i * 18;
    out.push(card(t, { x, y: 10, w: 17, h: 30 }));
    out.push(el('label',  { x: x + 1, y: 13, w: 15, h: 5 }, { text: labels[i] }, labelStyle(t, 9)));
    out.push(el('metric', { x: x + 1, y: 20, w: 15, h: 18 }, { value: values[i] }, accentStyle(t, 26)));
  }
  out.push(el('chart', { x: 56, y: 10, w: 44, h: 60 }, {
    type: 'dualAxis', title: 'Revenue and EBITDA, 2024 – 2028',
    categories: ['2024', '2025', '2026', '2027', '2028'],
    series: [
      { name: 'Revenue ($M)',  values: [1.2, 4.2, 9.0, 18, 32], color: t.accent },
      { name: 'EBITDA ($M)',   values: [-0.4, -0.2, 0.5, 2.4, 5.8], color: t.accent2 },
    ],
  }));
  out.push(el('paragraph', { x: 0, y: 74, w: 56, h: 22 }, {
    text: 'Path to profitability assumes 110% net dollar retention, CAC payback < 14 mo, and 78% gross margin holding through enterprise ramp.',
  }, bodyStyle(t, 12)));
  return out;
}

function buildCaseStudyBlock(t: FamilyTokens): SlideElementDTO[] {
  // 4-quadrant layout: challenge / solution / results / metrics
  const out: SlideElementDTO[] = [];
  const quads = [
    { label: 'Challenge',  body: '40 sales reps producing inconsistent decks; brand audit failed.' },
    { label: 'Solution',   body: 'Centralised component library + master elements for legal footers.' },
    { label: 'Results',    body: 'Brand consistency score 96/100; deck production time -65%.' },
    { label: 'Metrics',    body: '40 reps · 1,200 decks/quarter · 0 brand violations in 8 weeks.' },
  ];
  for (let i = 0; i < 4; i++) {
    const x = (i % 2) * 51;
    const y = Math.floor(i / 2) * 51;
    out.push(card(t, { x, y, w: 48, h: 48 }));
    out.push(el('label',     { x: x + 3, y: y + 4,  w: 42, h: 6  }, { text: quads[i].label }, labelStyle(t)));
    out.push(el('paragraph', { x: x + 3, y: y + 14, w: 42, h: 30 }, { text: quads[i].body }, bodyStyle(t, 13)));
  }
  return out;
}

function buildCompanyOverviewBlock(t: FamilyTokens): SlideElementDTO[] {
  return [
    el('label',   { x: 0, y: 0, w: 100, h: 6 }, { text: 'Company at a glance' }, labelStyle(t)),
    el('heading', { x: 0, y: 8, w: 60, h: 14 }, { text: 'Pitchonix' }, headingStyle(t, 30)),
    el('paragraph', { x: 0, y: 24, w: 60, h: 24 }, {
      text: 'AI-native presentation platform headquartered in Beirut, founded 2024. 18-person team. Series A in market. 1,240 customers across 14 countries.',
    }, bodyStyle(t, 14)),
    card(t, { x: 62, y: 8, w: 38, h: 90 }),
    el('label',  { x: 64, y: 12, w: 34, h: 5 }, { text: 'Founded' }, labelStyle(t, 9)),
    el('metric', { x: 64, y: 18, w: 34, h: 12 }, { value: '2024' }, accentStyle(t, 24)),
    el('label',  { x: 64, y: 32, w: 34, h: 5 }, { text: 'Headquarters' }, labelStyle(t, 9)),
    el('metric', { x: 64, y: 38, w: 34, h: 12 }, { value: 'Beirut' }, accentStyle(t, 22)),
    el('label',  { x: 64, y: 52, w: 34, h: 5 }, { text: 'Team' }, labelStyle(t, 9)),
    el('metric', { x: 64, y: 58, w: 34, h: 12 }, { value: '18' }, accentStyle(t, 24)),
    el('label',  { x: 64, y: 72, w: 34, h: 5 }, { text: 'Customers' }, labelStyle(t, 9)),
    el('metric', { x: 64, y: 78, w: 34, h: 14 }, { value: '1,240' }, accentStyle(t, 24)),
  ];
}

function buildHeroStatement(t: FamilyTokens): SlideElementDTO[] {
  // Single statement, family-distinctive treatment.
  return [
    el('shape', { x: 0, y: 0, w: 100, h: 100, z: -10 }, {
      kind: tokens(t).rect, fill: t.bg,
    }, { borderRadius: 0 }),
    el('heading', { x: 8, y: 36, w: 84, h: 28 }, {
      text: 'Decks designed by the company that uses them.',
    }, {
      ...headingStyle(t, 56),
      // bias toward the family accent for a hero treatment
      color: t.accent,
    }),
    el('shape', { x: 8, y: 66, w: 12, h: 0.6, z: 0 }, { kind: 'rect', fill: t.accent }, { borderRadius: 0 }),
    el('paragraph', { x: 8, y: 70, w: 84, h: 12 }, {
      text: 'Pitchonix · Series A 2026',
    }, bodyStyle(t, 14)),
  ];
}

function buildProblemStatement(t: FamilyTokens): SlideElementDTO[] {
  // Heading + 3 pain points + supporting narrative.
  const out: SlideElementDTO[] = [];
  out.push(el('label',   { x: 0, y: 0,  w: 100, h: 6  }, { text: 'The Problem' }, labelStyle(t)));
  out.push(el('heading', { x: 0, y: 8,  w: 100, h: 18 }, {
    text: 'Knowledge workers waste a week per quarter wrangling slide tools.',
  }, headingStyle(t, 24)));
  const pains = [
    'Brand-consistent decks require manual policing across 40+ reps.',
    'AI tools generate content but rebuild layouts from scratch every time.',
    'Editor and exported PPTX drift apart by the second slide of every deck.',
  ];
  for (let i = 0; i < 3; i++) {
    const y = 32 + i * 18;
    out.push(card(t, { x: 0, y, w: 100, h: 16 }));
    out.push(el('label',     { x: 4, y: y + 3, w: 8,  h: 10 }, { text: `0${i + 1}` }, accentStyle(t, 18)));
    out.push(el('paragraph', { x: 13, y: y + 4, w: 84, h: 11 }, { text: pains[i] }, bodyStyle(t, 13)));
  }
  out.push(el('caption', { x: 0, y: 88, w: 100, h: 8 }, {
    text: 'Sources: Pitchonix customer interviews, 2025 — 14 design teams, 6 sales orgs.',
  }, bodyStyle(t, 11)));
  return out;
}

function buildSolutionStatement(t: FamilyTokens): SlideElementDTO[] {
  // Heading + 3 value props + CTA.
  const out: SlideElementDTO[] = [];
  out.push(el('label',   { x: 0, y: 0,  w: 100, h: 6  }, { text: 'The Solution' }, labelStyle(t)));
  out.push(el('heading', { x: 0, y: 8,  w: 100, h: 18 }, {
    text: 'A design system that generates, edits, and exports as one.',
  }, headingStyle(t, 24)));
  const props = [
    { title: 'Generate', body: 'AI authors content through a versioned component library.' },
    { title: 'Edit',     body: 'Every primitive is editable in place with brand inheritance.' },
    { title: 'Export',   body: 'PPTX, PDF, PNG, JPEG render from the same element tree.' },
  ];
  for (let i = 0; i < 3; i++) {
    const x = i * 34;
    out.push(card(t, { x, y: 32, w: 32, h: 48 }));
    out.push(el('label',     { x: x + 3, y: 38, w: 26, h: 8  }, { text: props[i].title }, accentStyle(t, 20)));
    out.push(el('paragraph', { x: x + 3, y: 52, w: 26, h: 24 }, { text: props[i].body }, bodyStyle(t, 13)));
  }
  out.push(el('cta', { x: 30, y: 86, w: 40, h: 10 }, {
    text: 'See it live', variant: 'primary',
  }, { color: t.text, fill: t.accent, borderRadius: t.radius } as ElementStyle));
  return out;
}

// =============================================================================
//  Dispatcher
// =============================================================================

const BUILDERS: Record<SmartComponentType, (t: FamilyTokens) => SlideElementDTO[]> = {
  // Tier 3 (20)
  kpiCard:           buildKpiCard,
  metricCard:        buildMetricCard,
  statBlock:         buildStatBlock,
  pricingCard:       buildPricingCard,
  pricingTable:      buildPricingTable,
  teamCard:          buildTeamCard,
  teamGrid:          buildTeamGrid,
  roadmapBlock:      buildRoadmapBlock,
  timelineBlock:     buildTimelineBlock,
  featureCard:       buildFeatureCard,
  featureGrid:       buildFeatureGrid,
  comparisonMatrix:  buildComparisonMatrix,
  swotBlock:         buildSwotBlock,
  processFlow:       buildProcessFlow,
  quoteCard:         buildQuoteCard,
  testimonialCard:   buildTestimonialCard,
  fundingBlock:      buildFundingBlock,
  marketOpportunity: buildMarketOpportunity,
  tamSamSom:         buildTamSamSom,
  riskMatrix:        buildRiskMatrix,
  // Tier 6 (10 new)
  coverCard:            buildCoverCard,
  executiveSummary:     buildExecutiveSummary,
  narrativeBlock:       buildNarrativeBlock,
  visionBlock:          buildVisionBlock,
  financialDashboard:   buildFinancialDashboard,
  caseStudyBlock:       buildCaseStudyBlock,
  companyOverviewBlock: buildCompanyOverviewBlock,
  heroStatement:        buildHeroStatement,
  problemStatement:     buildProblemStatement,
  solutionStatement:    buildSolutionStatement,
};

export function buildSmartComponentTree(family: { tokens: FamilyTokens }, type: SmartComponentType): SlideElementDTO[] {
  const fn = BUILDERS[type];
  if (!fn) throw new Error(`Unknown smart component type: ${type}`);
  return fn(family.tokens);
}
