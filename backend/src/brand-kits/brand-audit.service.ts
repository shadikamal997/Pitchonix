import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BrandTokens, BrandIdentity } from './brand-kits.service';

// =============================================================================
//  Phase 37O/P — BrandAuditService
//
//  Scans a deck against its associated BrandKit and reports:
//
//    score:  0..100  overall compliance
//    categories: per-bucket scores (colors / typography / logos / charts / components)
//    issues: list of [{ slideId?, severity, category, message, fixHint? }]
//    recommendations: high-level suggestions
//
//  This is a *static* analysis — no rendering required. We walk the slide
//  elements + masters + metadata and compare colors / fontFamily references
//  against the kit's palette + typography. Anything that uses a colour
//  outside the kit's palette or a font outside the kit's typography drops
//  the score for the relevant bucket.
//
//  Scoring is intentionally generous: a missing brand kit doesn't crash
//  audit; it returns score = 0 with a single "no brand kit attached" issue.
// =============================================================================

export type AuditCategory = 'colors' | 'typography' | 'logos' | 'charts' | 'components';
export type AuditSeverity = 'info' | 'warning' | 'error';

export interface AuditIssue {
  severity: AuditSeverity;
  category: AuditCategory;
  slideId?: string;
  elementId?: string;
  message:  string;
  fixHint?: string;
}

export interface BrandAuditReport {
  deckId:    string;
  brandKitId: string | null;
  score:     number;            // 0..100
  categories: Record<AuditCategory, number>;  // each 0..100
  issues:    AuditIssue[];
  recommendations: string[];
  generatedAt: string;
}

const ALL_CATEGORIES: AuditCategory[] = ['colors', 'typography', 'logos', 'charts', 'components'];

@Injectable()
export class BrandAuditService {
  constructor(private prisma: PrismaService) {}

  async auditDeck(deckId: string): Promise<BrandAuditReport> {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      include: {
        brandKit:       { include: { assets: true } },
        masterElements: true,
        slides: {
          orderBy: { order: 'asc' },
          include: { elements: { orderBy: [{ order: 'asc' }, { zIndex: 'asc' }] } },
        },
      },
    });
    if (!deck) throw new NotFoundException('Deck not found');

    const issues: AuditIssue[] = [];
    const empty = (): Record<AuditCategory, number> => ({
      colors: 100, typography: 100, logos: 100, charts: 100, components: 100,
    });
    const categories = empty();
    const recs: string[] = [];

    // No-kit short-circuit. We don't punish the entire score to zero —
    // categories still inspect the deck for *internal* consistency.
    if (!deck.brandKit) {
      issues.push({
        severity: 'warning',
        category: 'colors',
        message:  'No brand kit is attached to this deck.',
        fixHint:  'Attach a brand kit from the workspace dashboard.',
      });
      recs.push('Attach a brand kit to enforce consistent colors, fonts, and logo usage.');
    }

    const kitTokens = (deck.brandKit?.tokens as BrandTokens | null) || {};
    const kitIdentity = (deck.brandKit?.identity as BrandIdentity | null) || {};
    const palette = palettify(kitTokens, deck.brandKit?.primaryColor, deck.brandKit?.secondaryColor);
    const fonts = fontFamilies(kitTokens, deck.brandKit?.fontFamily);

    // ----- Colors -----
    let colorTotal = 0;
    let colorOffPalette = 0;
    for (const slide of deck.slides) {
      for (const el of slide.elements) {
        const style = (el.style as any) || {};
        for (const key of ['color', 'background', 'borderColor', 'fill']) {
          const v = style[key];
          if (!v || typeof v !== 'string') continue;
          colorTotal++;
          if (!isPaletteColor(v, palette)) {
            colorOffPalette++;
            if (colorOffPalette <= 8) {
              issues.push({
                severity: 'info',
                category: 'colors',
                slideId:  slide.id,
                elementId: el.id,
                message:  `Element uses "${v}" which isn't in the brand palette.`,
                fixHint:  'Switch to a brand color via the inspector.',
              });
            }
          }
        }
      }
    }
    if (colorTotal > 0) {
      const ratio = 1 - (colorOffPalette / colorTotal);
      categories.colors = clampScore(ratio * 100);
    }

    // ----- Typography -----
    let fontTotal = 0;
    let fontOff   = 0;
    for (const slide of deck.slides) {
      for (const el of slide.elements) {
        const style = (el.style as any) || {};
        const f = style.fontFamily;
        if (!f || typeof f !== 'string') continue;
        fontTotal++;
        if (!isAllowedFont(f, fonts)) {
          fontOff++;
          if (fontOff <= 8) {
            issues.push({
              severity: 'info',
              category: 'typography',
              slideId:  slide.id,
              elementId: el.id,
              message:  `Element uses font "${f}" which isn't in the brand typography.`,
              fixHint:  'Switch to a brand font via the inspector.',
            });
          }
        }
      }
    }
    if (fontTotal > 0) {
      const ratio = 1 - (fontOff / fontTotal);
      categories.typography = clampScore(ratio * 100);
    }

    // ----- Logos -----
    const assets = deck.brandKit?.assets || [];
    const hasLogo = !!(deck.brandKit?.logo) || assets.some((a) => a.kind.startsWith('logo'));
    const usesLogo = deck.masterElements.some((m) => m.type === 'logo');
    if (!hasLogo) {
      issues.push({
        severity: 'info', category: 'logos',
        message: 'Brand kit has no logo configured.',
        fixHint: 'Upload a primary logo on the Logos tab.',
      });
      categories.logos = 50;
    } else if (!usesLogo) {
      issues.push({
        severity: 'info', category: 'logos',
        message: 'No master "logo" element placed on the deck.',
        fixHint: 'Enable the master logo so it shows on every slide.',
      });
      categories.logos = 70;
    }
    // Phase 37.1G — wrong-logo-variant detection. If a slide uses an image
    // / logo URL that isn't one of the registered brand assets, flag it.
    if (deck.brandKit && assets.length > 0) {
      const assetUrls = new Set(assets.map((a) => a.url));
      for (const slide of deck.slides) {
        for (const el of slide.elements) {
          if (el.type !== 'logo' && el.type !== 'image') continue;
          const content = (el.content as any) || {};
          const url = content.src || content.url;
          if (!url || typeof url !== 'string') continue;
          if (!assetUrls.has(url) && url !== deck.brandKit.logo) {
            issues.push({
              severity: 'warning', category: 'logos',
              slideId:  slide.id, elementId: el.id,
              message:  'Logo / image URL is not registered in the brand asset library.',
              fixHint:  'Add this image to the Assets tab to keep brand inventory complete.',
            });
            categories.logos = Math.max(40, categories.logos - 5);
          }
        }
      }
    }

    // Phase 37.1G — missing identity check.
    if (deck.brandKit && !(kitIdentity.companyName || kitIdentity.tagline)) {
      issues.push({
        severity: 'info', category: 'components',
        message: 'Brand kit has no company identity (name / tagline / mission).',
        fixHint: 'Fill the Overview tab so generated cover slides use your brand voice.',
      });
      categories.components = Math.max(50, categories.components - 20);
    }

    // ----- Charts -----
    const chartPalette = kitTokens.chart?.palette || palette;
    let chartTotal = 0; let chartOff = 0;
    for (const slide of deck.slides) {
      for (const el of slide.elements) {
        if (el.type !== 'chart') continue;
        chartTotal++;
        const data = (el.data as any) || {};
        const used: string[] = (data.colors || data.palette || []) as string[];
        const offRatio = used.length
          ? used.filter((c) => !isPaletteColor(c, chartPalette)).length / used.length
          : 0;
        if (offRatio > 0.5) {
          chartOff++;
          issues.push({
            severity: 'warning', category: 'charts',
            slideId: slide.id, elementId: el.id,
            message: 'Chart uses an off-brand palette.',
            fixHint: 'Apply the brand chart palette via Inspector → Style.',
          });
        }
      }
    }
    if (chartTotal > 0) {
      categories.charts = clampScore((1 - chartOff / chartTotal) * 100);
    }

    // ----- Components -----
    // Heuristic: composition family + applied template are stable signals
    // of consistency. We expect them to be set if a brand kit is in use.
    const md = (deck.metadata as any) || {};
    if (!md.appliedTemplateId) {
      issues.push({
        severity: 'info', category: 'components',
        message: 'No design template applied.',
        fixHint: 'Pick a template that matches your brand voice.',
      });
      categories.components = 80;
    }

    // ----- Recommendations -----
    if (categories.colors < 80)     recs.push('Audit slide element colors — replace off-palette values with brand colors.');
    if (categories.typography < 80) recs.push('Standardise on the brand heading + body fonts.');
    if (categories.logos < 100)     recs.push('Place the master logo so it appears across every slide.');
    if (categories.charts < 80)     recs.push('Re-apply the brand chart palette in the Inspector.');
    if (kitIdentity.companyName && md.themeTokens?.companyName !== kitIdentity.companyName) {
      recs.push(`Use "${kitIdentity.companyName}" consistently in slide titles + cover.`);
    }

    // Weighted overall: colors + typography carry more signal than logos
    // (which are binary "present / absent"). Components is a hint at best.
    const overall = clampScore(
      categories.colors      * 0.35 +
      categories.typography  * 0.25 +
      categories.logos       * 0.15 +
      categories.charts      * 0.15 +
      categories.components  * 0.10
    );

    return {
      deckId,
      brandKitId: deck.brandKitId,
      score:      overall,
      categories,
      issues,
      recommendations: recs,
      generatedAt: new Date().toISOString(),
    };
  }
}

// =============================================================================
//  Helpers
// =============================================================================

function palettify(tokens: BrandTokens, primary?: string | null, secondary?: string | null): string[] {
  const palette: string[] = [];
  if (tokens.colors?.primary)   palette.push(tokens.colors.primary);
  if (tokens.colors?.secondary) palette.push(tokens.colors.secondary);
  if (tokens.colors?.accent)    palette.push(tokens.colors.accent);
  if (tokens.colors?.neutral)   palette.push(tokens.colors.neutral);
  if (tokens.colors?.success)   palette.push(tokens.colors.success);
  if (tokens.colors?.warning)   palette.push(tokens.colors.warning);
  if (tokens.colors?.danger)    palette.push(tokens.colors.danger);
  if (primary   && !palette.includes(primary))   palette.push(primary);
  if (secondary && !palette.includes(secondary)) palette.push(secondary);
  return palette.map(normalizeColor);
}

function fontFamilies(tokens: BrandTokens, legacyFont?: string | null): string[] {
  const out = new Set<string>();
  if (tokens.typography?.heading?.family) out.add(tokens.typography.heading.family);
  if (tokens.typography?.body?.family)    out.add(tokens.typography.body.family);
  if (tokens.typography?.caption?.family) out.add(tokens.typography.caption.family);
  if (legacyFont) out.add(legacyFont);
  return Array.from(out);
}

function normalizeColor(c: string): string {
  const v = c.trim().toLowerCase();
  if (v.startsWith('#')) {
    // expand 3-digit shorthand
    if (v.length === 4) return '#' + v.slice(1).split('').map((c) => c + c).join('');
    return v;
  }
  return v;
}

function isPaletteColor(c: string, palette: string[]): boolean {
  if (palette.length === 0) return true;   // no palette → don't penalise
  const n = normalizeColor(c);
  return palette.some((p) => p === n);
}

function isAllowedFont(font: string, fonts: string[]): boolean {
  if (fonts.length === 0) return true;
  const f = font.split(',')[0].replace(/['"]/g, '').trim().toLowerCase();
  return fonts.some((allowed) => allowed.toLowerCase().includes(f) || f.includes(allowed.toLowerCase()));
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
