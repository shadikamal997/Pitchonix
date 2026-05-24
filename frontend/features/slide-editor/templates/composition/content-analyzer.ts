// =============================================================================
//  Phase 24A — Content Density Analyzer
//
//  Inspects slide elements to produce a ContentProfile: raw measurements,
//  derived density scores, dominant content type, and layout intent
//  recommendation. The profile drives LayoutVariantScorer to pick the best
//  visual layout for the actual content — not just the slide type.
// =============================================================================

import type { SlideElementDTO } from '@/types/slide-element';

// =============================================================================
//  Output types
// =============================================================================

export type ContentDensity  = 'sparse' | 'balanced' | 'dense' | 'overflow-risk';
export type DominantContent = 'text' | 'metrics' | 'image' | 'chart' | 'timeline' | 'pricing' | 'team' | 'quote' | 'mixed';

export interface ContentProfile {
  // ── Raw measurements ──────────────────────────────────────────────────────
  titleLength:       number; // chars in heading element(s)
  subtitleLength:    number; // chars in subheading element(s)
  paragraphWordCount:number; // approx words across all paragraph elements
  bulletCount:       number; // items inside bulletList elements
  metricCount:       number; // metric + kpi elements
  chartCount:        number; // chart elements
  imageCount:        number; // image elements
  pricingTierCount:  number; // tiers inside pricingCard elements
  roadmapItemCount:  number; // phases inside roadmap elements
  teamMemberCount:   number; // members inside teamCard elements
  quoteLength:       number; // chars in quote elements
  tableCount:        number;
  processStepCount:  number;
  featureItemCount:  number; // items inside featureGrid elements

  // ── Derived scores 0–100 ──────────────────────────────────────────────────
  contentDensityScore:       number;
  overflowRiskScore:         number;
  visualWeightScore:         number;   // how much non-text content is present
  hierarchyComplexityScore:  number;   // depth of content hierarchy

  // ── Categorical ───────────────────────────────────────────────────────────
  density:                   ContentDensity;
  dominantContent:           DominantContent;
  recommendedLayoutIntent:   string;
  riskFlags:                 string[];
}

// =============================================================================
//  Internal helpers
// =============================================================================

function countWords(text?: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function stripHtml(html?: string): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getText(el: SlideElementDTO): string {
  const c = (el.content || {}) as any;
  return typeof c.text === 'string' ? c.text : stripHtml(c.html || '');
}

// =============================================================================
//  Main analyzer
// =============================================================================

export function analyzeContent(elements: SlideElementDTO[]): ContentProfile {
  const visible = elements.filter((e) => e.visible !== false);

  // ── Raw extraction ─────────────────────────────────────────────────────────
  let titleLength       = 0;
  let subtitleLength    = 0;
  let paragraphWordCount= 0;
  let bulletCount       = 0;
  let metricCount       = 0;
  let chartCount        = 0;
  let imageCount        = 0;
  let pricingTierCount  = 0;
  let roadmapItemCount  = 0;
  let teamMemberCount   = 0;
  let quoteLength       = 0;
  let tableCount        = 0;
  let processStepCount  = 0;
  let featureItemCount  = 0;

  for (const el of visible) {
    const c = (el.content || {}) as any;
    switch (el.type) {
      case 'heading':
        titleLength += getText(el).length;
        break;
      case 'subheading':
        subtitleLength += getText(el).length;
        break;
      case 'paragraph':
        paragraphWordCount += countWords(getText(el));
        break;
      case 'quote':
        quoteLength += (c.text || '').length;
        break;
      case 'bulletList':
        bulletCount += Array.isArray(c.items) ? c.items.length : 0;
        break;
      case 'numberedList':
        bulletCount += Array.isArray(c.items) ? c.items.length : 0;
        break;
      case 'metric':
      case 'kpi':
        metricCount += 1;
        break;
      case 'chart':
        chartCount += 1;
        break;
      case 'image':
        imageCount += 1;
        break;
      case 'pricingCard':
        pricingTierCount += Array.isArray(c.tiers) ? c.tiers.length : 0;
        break;
      case 'roadmap':
        roadmapItemCount += Array.isArray(c.phases) ? c.phases.length : 0;
        break;
      case 'teamCard':
        teamMemberCount += Array.isArray(c.members) ? c.members.length : 0;
        break;
      case 'table':
        tableCount += 1;
        break;
      case 'processSteps':
        processStepCount += Array.isArray(c.steps) ? c.steps.length : 0;
        break;
      case 'featureGrid':
        featureItemCount += Array.isArray(c.items) ? c.items.length : 0;
        break;
      case 'timeline':
        roadmapItemCount += Array.isArray(c.items) ? c.items.length : 0;
        break;
    }
  }

  // ── Derived density score (0–100) ─────────────────────────────────────────
  let densityScore = 0;
  // Title contribution
  if (titleLength > 40)  densityScore += 8;
  if (titleLength > 70)  densityScore += 8;
  if (titleLength > 100) densityScore += 9; // cumulative 25
  // Text contribution
  if (paragraphWordCount > 50)  densityScore += 10;
  if (paragraphWordCount > 120) densityScore += 10;
  if (paragraphWordCount > 200) densityScore += 10; // cumulative 30
  // Bullet contribution
  if (bulletCount > 3)  densityScore += 8;
  if (bulletCount > 6)  densityScore += 8;
  if (bulletCount > 9)  densityScore += 9; // cumulative 25
  // Visual element contribution
  if (metricCount >= 3) densityScore += 8;
  if (chartCount >= 1)  densityScore += 5;
  if (imageCount >= 1)  densityScore += 5;
  if (featureItemCount >= 6) densityScore += 7;
  // Composite cards
  if (pricingTierCount >= 4)  densityScore += 8;
  if (roadmapItemCount >= 5)  densityScore += 8;
  if (teamMemberCount >= 5)   densityScore += 8;
  const contentDensityScore = Math.min(100, densityScore);

  // ── Overflow risk score (0–100) ─────────────────────────────────────────
  let overflowRisk = 0;
  if (titleLength > 80)        overflowRisk += 18;
  if (paragraphWordCount > 150) overflowRisk += 25;
  if (bulletCount > 7)         overflowRisk += 20;
  if (pricingTierCount > 4)    overflowRisk += 18;
  if (roadmapItemCount > 6)    overflowRisk += 18;
  if (teamMemberCount > 6)     overflowRisk += 15;
  if (featureItemCount > 8)    overflowRisk += 15;
  if (chartCount > 0 && metricCount > 3) overflowRisk += 12; // competing visuals
  const overflowRiskScore = Math.min(100, overflowRisk);

  // ── Visual weight score (0–100) — how much non-text content ─────────────
  let visualWeight = 0;
  visualWeight += chartCount  * 25;
  visualWeight += imageCount  * 20;
  visualWeight += metricCount * 10;
  visualWeight += pricingTierCount >= 2 ? 20 : 0;
  visualWeight += teamMemberCount  >= 2 ? 15 : 0;
  const visualWeightScore = Math.min(100, visualWeight);

  // ── Hierarchy complexity (0–100) — depth of content structure ───────────
  let hierarchy = 0;
  if (titleLength > 0)        hierarchy += 20;
  if (subtitleLength > 0)     hierarchy += 15;
  if (paragraphWordCount > 0) hierarchy += 15;
  if (bulletCount > 0)        hierarchy += 20;
  if (metricCount > 0)        hierarchy += 15;
  if (chartCount > 0)         hierarchy += 15;
  const hierarchyComplexityScore = Math.min(100, hierarchy);

  // ── Categorical density ──────────────────────────────────────────────────
  let density: ContentDensity;
  if (contentDensityScore < 22)      density = 'sparse';
  else if (contentDensityScore < 52) density = 'balanced';
  else if (contentDensityScore < 72) density = 'dense';
  else                               density = 'overflow-risk';

  // ── Dominant content ─────────────────────────────────────────────────────
  let dominantContent: DominantContent;
  if (pricingTierCount >= 2) {
    dominantContent = 'pricing';
  } else if (teamMemberCount >= 2) {
    dominantContent = 'team';
  } else if (roadmapItemCount >= 2 || processStepCount >= 2) {
    dominantContent = 'timeline';
  } else if (chartCount >= 1 && metricCount <= 2 && paragraphWordCount < 80) {
    dominantContent = 'chart';
  } else if (metricCount >= 2) {
    dominantContent = 'metrics';
  } else if (imageCount >= 1 && bulletCount < 3 && paragraphWordCount < 60) {
    dominantContent = 'image';
  } else if (quoteLength > 40) {
    dominantContent = 'quote';
  } else if (bulletCount >= 4 || paragraphWordCount > 100) {
    dominantContent = 'text';
  } else if (metricCount === 1 && paragraphWordCount < 60) {
    dominantContent = 'metrics';
  } else {
    dominantContent = 'mixed';
  }

  // ── Recommended layout intent ─────────────────────────────────────────────
  let recommendedLayoutIntent = 'statement-focused';

  if (density === 'overflow-risk') {
    recommendedLayoutIntent = 'compact-layout';
  } else if (dominantContent === 'metrics' && density === 'sparse') {
    recommendedLayoutIntent = 'metric-hero';
  } else if (dominantContent === 'metrics') {
    recommendedLayoutIntent = 'metric-strip';
  } else if (dominantContent === 'chart') {
    recommendedLayoutIntent = 'chart-focus';
  } else if (dominantContent === 'pricing') {
    recommendedLayoutIntent = 'three-tier';
  } else if (dominantContent === 'timeline') {
    recommendedLayoutIntent = roadmapItemCount >= 5 ? 'compact-roadmap' : 'phase-cards';
  } else if (dominantContent === 'team') {
    recommendedLayoutIntent = 'team-grid';
  } else if (dominantContent === 'quote') {
    recommendedLayoutIntent = 'pull-quote';
  } else if (dominantContent === 'image') {
    recommendedLayoutIntent = 'image-text-split';
  } else if (dominantContent === 'text' && density === 'dense') {
    recommendedLayoutIntent = 'editorial';
  } else if (dominantContent === 'text' && density === 'balanced') {
    recommendedLayoutIntent = bulletCount >= 4 ? 'dense-bullets' : 'statement-focused';
  } else if (density === 'sparse') {
    recommendedLayoutIntent = 'statement-focused';
  }

  // ── Risk flags ────────────────────────────────────────────────────────────
  const riskFlags: string[] = [];
  if (titleLength > 100)          riskFlags.push('title-too-long');
  if (paragraphWordCount > 200)   riskFlags.push('text-overflow-risk');
  if (bulletCount > 8)            riskFlags.push('too-many-bullets');
  if (pricingTierCount > 5)       riskFlags.push('too-many-pricing-tiers');
  if (roadmapItemCount > 7)       riskFlags.push('too-many-roadmap-phases');
  if (chartCount > 0 && imageCount > 0) riskFlags.push('competing-visuals');
  if (metricCount > 4)            riskFlags.push('metric-overload');

  return {
    titleLength, subtitleLength, paragraphWordCount, bulletCount,
    metricCount, chartCount, imageCount, pricingTierCount, roadmapItemCount,
    teamMemberCount, quoteLength, tableCount, processStepCount, featureItemCount,
    contentDensityScore, overflowRiskScore, visualWeightScore, hierarchyComplexityScore,
    density, dominantContent, recommendedLayoutIntent, riskFlags,
  };
}
