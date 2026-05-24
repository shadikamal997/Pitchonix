/**
 * Phase 27E — Block generators
 *
 * Each generator turns an analyser profile into the canonical block payload
 * that the slide-elements migration service knows how to materialise as a
 * typed SlideElement. No LLM — all deterministic transforms.
 */

import { BlockKind, ContentStructureProfile, SlideBlock } from '../types';

export function generateBlock(kind: BlockKind, profile: ContentStructureProfile): SlideBlock | null {
  switch (kind) {
    case 'metric':            return generateMetricBlock(profile);
    case 'metricGrid':        return generateMetricGridBlock(profile);
    case 'kpi':               return generateKpiBlock(profile);
    case 'pricing':           return generatePricingBlock(profile);
    case 'roadmap':           return generateRoadmapBlock(profile);
    case 'timeline':          return generateTimelineBlock(profile);
    case 'team':              return generateTeamBlock(profile);
    case 'featureGrid':       return generateFeatureGridBlock(profile);
    case 'comparison':        return generateComparisonBlock(profile);
    case 'swot':              return generateSwotBlock(profile);
    case 'marketSizing':      return generateMarketSizingBlock(profile);
    case 'fundingAllocation': return generateFundingAllocationBlock(profile);
    case 'processSteps':      return generateProcessStepsBlock(profile);
    case 'testimonial':       return null;
    case 'quote':             return null;
    case 'bulletList':        return generateBulletListBlock(profile);
    case 'paragraph':         return generateParagraphBlock(profile);
    case 'chart':             return generateChartBlock(profile);
  }
}

// ─── Metric blocks ──────────────────────────────────────────────────────────

function generateMetricBlock(profile: ContentStructureProfile): SlideBlock | null {
  const num = profile.extracted.numbers[0];
  if (!num) return null;
  return {
    kind: 'metric',
    content: {
      metrics: [{
        value: num.value,
        label: inferMetricLabel(num.context),
        unit:  num.isPercent ? '%' : num.isCurrency ? undefined : num.unit,
      }],
    },
    meta: { role: 'metric', priority: 70 },
  };
}

function generateMetricGridBlock(profile: ContentStructureProfile): SlideBlock | null {
  const nums = profile.extracted.numbers.slice(0, 4);
  if (nums.length < 2) return null;
  return {
    kind: 'metricGrid',
    content: {
      metrics: nums.map((n, i) => ({
        value: n.value,
        label: inferMetricLabel(n.context) || defaultMetricLabel(i),
        unit:  n.isPercent ? '%' : undefined,
      })),
    },
    meta: { role: 'metric-strip', priority: 80 },
  };
}

function generateKpiBlock(profile: ContentStructureProfile): SlideBlock | null {
  const num = profile.extracted.numbers[0];
  if (!num) return null;
  const trend = profile.extracted.numbers.find((n) => n.isPercent && /(growth|increase|up|YoY|MoM)/i.test(n.context));
  return {
    kind: 'kpi',
    content: {
      kpis: [{
        value: num.value,
        label: inferMetricLabel(num.context) || 'Key Metric',
        sublabel: trend ? trend.value : undefined,
        trendDirection: trend ? 'up' : undefined,
      }],
    },
    meta: { role: 'kpi', priority: 75 },
  };
}

// ─── Pricing ────────────────────────────────────────────────────────────────

function generatePricingBlock(profile: ContentStructureProfile): SlideBlock | null {
  const tiers = profile.extracted.pricingTiers;
  if (tiers.length === 0) return null;
  const expanded = tiers.length < 2 ? [
    ...tiers,
    { name: 'Pro',        price: 'Custom',  features: ['Advanced features', 'Priority support'] },
    { name: 'Enterprise', price: 'Contact', features: ['Custom', 'SLA', 'Dedicated support'] },
  ].slice(0, 3) : tiers.slice(0, 4);
  return {
    kind: 'pricing',
    content: {
      pricingTiers: expanded.map((t, i) => ({
        name:     t.name || defaultTierName(i),
        price:    t.price || '',
        features: t.features.length > 0 ? t.features : ['Core feature set'],
        highlight: i === 1 && expanded.length >= 3, // middle tier
      })),
    },
    meta: { role: 'pricing', priority: 80 },
  };
}

// ─── Roadmap / Timeline ────────────────────────────────────────────────────

function generateRoadmapBlock(profile: ContentStructureProfile): SlideBlock | null {
  const phases = profile.extracted.phases;
  if (phases.length === 0) return null;
  return {
    kind: 'roadmap',
    content: {
      phases: phases.slice(0, 6).map((p, i) => ({
        phase:   p.phase || `Phase ${i + 1}`,
        period:  p.period,
        bullets: p.bullets.length > 0 ? p.bullets : [`Milestone ${i + 1}`],
      })),
    },
    meta: { role: 'roadmap', priority: 80 },
  };
}

function generateTimelineBlock(profile: ContentStructureProfile): SlideBlock | null {
  const phases = profile.extracted.phases;
  if (phases.length === 0) return null;
  return {
    kind: 'timeline',
    content: {
      timeline: phases.slice(0, 6).map((p, i) => ({
        date:        p.period,
        title:       p.phase || `Milestone ${i + 1}`,
        description: p.bullets[0],
      })),
    },
    meta: { role: 'timeline', priority: 75 },
  };
}

// ─── Team ───────────────────────────────────────────────────────────────────

function generateTeamBlock(profile: ContentStructureProfile): SlideBlock | null {
  const people = profile.extracted.people;
  if (people.length === 0) return null;
  return {
    kind: 'team',
    content: {
      team: people.slice(0, 6).map((p, i) => ({
        name: p.name,
        role: p.role || defaultRole(i),
        bio:  p.background,
      })),
    },
    meta: { role: 'team', priority: 80 },
  };
}

// ─── Feature grid ───────────────────────────────────────────────────────────

function generateFeatureGridBlock(profile: ContentStructureProfile): SlideBlock | null {
  const feats = profile.extracted.features;
  if (feats.length < 2) return null;
  return {
    kind: 'featureGrid',
    content: {
      featureGrid: {
        items: feats.slice(0, 6).map((f, i) => ({
          id:          `feat-${i + 1}`,
          title:       f.title || `Feature ${i + 1}`,
          description: f.description,
        })),
        columns: feats.length >= 4 ? 3 : 2,
      },
    },
    meta: { role: 'features', priority: 75 },
  };
}

// ─── Process steps ──────────────────────────────────────────────────────────

function generateProcessStepsBlock(profile: ContentStructureProfile): SlideBlock | null {
  const feats = profile.extracted.features;
  if (feats.length < 2) return null;
  return {
    kind: 'processSteps',
    content: {
      processSteps: {
        steps: feats.slice(0, 5).map((f, i) => ({
          id:          `step-${i + 1}`,
          title:       f.title || `Step ${i + 1}`,
          description: f.description,
        })),
        orientation: 'horizontal',
      },
    },
    meta: { role: 'process', priority: 70 },
  };
}

// ─── Comparison ─────────────────────────────────────────────────────────────

function generateComparisonBlock(profile: ContentStructureProfile): SlideBlock | null {
  const comps = profile.extracted.competitors;
  if (comps.length === 0) return null;
  const features = ['Pricing', 'Speed', 'Ease of use', 'Support', 'Integration'];
  return {
    kind: 'comparison',
    content: {
      comparison: {
        columns: ['Us', ...comps.slice(0, 3).map((c) => c.name)],
        rows: features.slice(0, 4).map((feat) => ({
          feature: feat,
          values:  ['✓', ...comps.slice(0, 3).map(() => '—')],
        })),
        highlightColumn: 0,
      },
    },
    meta: { role: 'comparison', priority: 80 },
  };
}

// ─── SWOT ───────────────────────────────────────────────────────────────────

function generateSwotBlock(profile: ContentStructureProfile): SlideBlock | null {
  const swot = profile.extracted.swot;
  if (!swot) return null;
  return {
    kind: 'swot',
    content: {
      swot: {
        strengths:     swot.strengths,
        weaknesses:    swot.weaknesses,
        opportunities: swot.opportunities,
        threats:       swot.threats,
      },
    },
    meta: { role: 'swot', priority: 80 },
  };
}

// ─── Market sizing TAM/SAM/SOM ─────────────────────────────────────────────

function generateMarketSizingBlock(profile: ContentStructureProfile): SlideBlock | null {
  const ms = profile.extracted.marketSizing;
  if (!ms) return null;
  const metrics: Array<{ value: string; label: string }> = [];
  if (ms.tam) metrics.push({ value: ms.tam.value, label: ms.tam.label });
  if (ms.sam) metrics.push({ value: ms.sam.value, label: ms.sam.label });
  if (ms.som) metrics.push({ value: ms.som.value, label: ms.som.label });
  if (metrics.length === 0) return null;
  return {
    kind: 'marketSizing',
    content: { metrics },
    meta: { role: 'market-sizing', priority: 85 },
  };
}

// ─── Funding allocation ────────────────────────────────────────────────────

function generateFundingAllocationBlock(profile: ContentStructureProfile): SlideBlock | null {
  const allocs = profile.extracted.allocations;
  if (allocs.length === 0) return null;
  return {
    kind: 'fundingAllocation',
    content: {
      featureGrid: {
        items: allocs.slice(0, 5).map((a, i) => ({
          id:          `alloc-${i + 1}`,
          title:       a.percentage !== undefined ? `${a.percentage}% — ${truncate(a.category, 28)}` : truncate(a.category, 32),
          description: a.amount,
        })),
        columns: allocs.length >= 4 ? 3 : 2,
      },
    },
    meta: { role: 'funding-allocation', priority: 80 },
  };
}

// ─── Chart ──────────────────────────────────────────────────────────────────

function generateChartBlock(profile: ContentStructureProfile): SlideBlock | null {
  const nums = profile.extracted.numbers.filter((n) => !isNaN(n.numeric)).slice(0, 6);
  if (nums.length < 2) return null;
  return {
    kind: 'chart',
    content: {
      charts: [{
        type: 'bar',
        title: 'Key Metrics',
        data: nums.map((n) => ({ label: inferMetricLabel(n.context) || n.value, value: n.numeric })),
      }],
    },
    meta: { role: 'chart', priority: 70 },
  };
}

// ─── Bullet list / paragraph fallback ──────────────────────────────────────

function generateBulletListBlock(profile: ContentStructureProfile): SlideBlock | null {
  const feats = profile.extracted.features;
  if (feats.length === 0) return null;
  return {
    kind: 'bulletList',
    content: {
      bullets: feats.slice(0, 6).map((f) => f.description || f.title),
    },
    meta: { role: 'bullets', priority: 50 },
  };
}

function generateParagraphBlock(_profile: ContentStructureProfile): SlideBlock | null {
  // A paragraph block is always available, but only emitted if the blueprint
  // engine actually needs it as a fallback. The migration service still picks
  // up slide.title / slide.subtitle / slide.content.description by default,
  // so we don't need to emit one here.
  return null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function inferMetricLabel(context: string): string {
  const c = context.toLowerCase();
  if (/\bmrr\b/.test(c))                      return 'MRR';
  if (/\barr\b/.test(c))                      return 'ARR';
  if (/\b(nps|net promoter)\b/.test(c))       return 'NPS';
  if (/\b(cac|acquisition cost)\b/.test(c))   return 'CAC';
  if (/\b(ltv|lifetime value)\b/.test(c))     return 'LTV';
  if (/\b(churn)\b/.test(c))                  return 'Churn';
  if (/\b(growth|growing)\b/.test(c))         return 'Growth';
  if (/\b(retention)\b/.test(c))              return 'Retention';
  if (/\b(margin|gross|operating)\b/.test(c)) return 'Margin';
  if (/\b(user|customer|client)s?\b/.test(c)) return 'Customers';
  if (/\b(revenue|sales)\b/.test(c))          return 'Revenue';
  if (/\bdownload/.test(c))                   return 'Downloads';
  if (/\bsubscriber/.test(c))                 return 'Subscribers';
  if (/\bmarket\b/.test(c))                   return 'Market';
  return '';
}

function defaultMetricLabel(i: number): string {
  return ['Users', 'Revenue', 'Growth', 'Retention'][i] || 'Metric';
}

function defaultTierName(i: number): string {
  return ['Starter', 'Pro', 'Enterprise', 'Custom'][i] || `Tier ${i + 1}`;
}

function defaultRole(i: number): string {
  return ['Founder & CEO', 'CTO', 'COO', 'VP Product', 'VP Sales'][i] || 'Team Member';
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.substring(0, n - 1) + '…';
}
