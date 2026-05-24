import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BrandKitsService, BrandTokens, BrandIdentity } from './brand-kits.service';

// =============================================================================
//  Phase 37.2E — BrandAutofixService
//
//  Given a brand-audit issue (kitId + slideId + elementId + category),
//  applies the appropriate fix to the element. Returns the updated element
//  so the editor can refresh.
//
//  Fix recipes per category:
//    colors      → rewrite any off-palette style colors to the nearest
//                  brand palette color (string-equality fallback)
//    typography  → set element.style.fontFamily to brand body font
//    logos       → swap a non-registered image URL to the primary logo
//    charts      → delegate to BrandKitsService.rebrandChartElement
//    components  → no-op (recommends template re-apply); returns issue
// =============================================================================

export type FixCategory = 'colors' | 'typography' | 'logos' | 'charts' | 'components';

@Injectable()
export class BrandAutofixService {
  constructor(
    private prisma: PrismaService,
    private kits:   BrandKitsService,
  ) {}

  async fix(brandKitId: string, elementId: string, category: FixCategory, userId: string) {
    if (category === 'charts') {
      return this.kits.rebrandChartElement(brandKitId, elementId, userId);
    }

    const kit = await this.kits.findOne(brandKitId, userId);
    const element = await this.prisma.slideElement.findUnique({ where: { id: elementId } });
    if (!element) throw new NotFoundException('Element not found');

    const tokens   = (kit.tokens   as BrandTokens   | null) || {};
    const identity = (kit.identity as BrandIdentity | null) || {};
    const palette  = paletteValues(tokens, kit.primaryColor, kit.secondaryColor);

    const style = (element.style as any)   || {};
    const content = (element.content as any) || {};
    let patched: { style?: any; content?: any } = {};

    if (category === 'colors') {
      const next: any = { ...style };
      for (const key of ['color', 'background', 'borderColor', 'fill']) {
        const v = next[key];
        if (typeof v === 'string' && !isPaletteColor(v, palette) && palette.length > 0) {
          // Choose the nearest brand color (cheap string-distance heuristic).
          next[key] = nearestBrandColor(v, palette);
        }
      }
      patched = { style: next };
    } else if (category === 'typography') {
      const bodyFont    = tokens.typography?.body?.family    ?? kit.fontFamily;
      const headingFont = tokens.typography?.heading?.family ?? kit.fontFamily;
      if (!bodyFont) throw new BadRequestException('Brand kit has no body typography to apply');
      const isHeading = element.type === 'heading' || element.type === 'subheading';
      patched = { style: { ...style, fontFamily: isHeading ? (headingFont ?? bodyFont) : bodyFont } };
    } else if (category === 'logos') {
      if (element.type !== 'image' && element.type !== 'logo') {
        throw new BadRequestException('Element is not an image or logo');
      }
      // Prefer primary logo asset, fall back to kit.logo legacy field.
      const primaryAsset = (kit.assets || []).find((a) => a.kind === 'logo_primary');
      const url = primaryAsset?.url ?? kit.logo;
      if (!url) throw new BadRequestException('Brand kit has no primary logo to apply');
      patched = { content: { ...content, src: url, url } };
    } else if (category === 'components') {
      throw new BadRequestException('Components category needs manual template re-apply');
    }

    return this.prisma.slideElement.update({
      where: { id: elementId },
      data:  patched,
    });
  }
}

// =============================================================================
//  helpers
// =============================================================================

function paletteValues(tokens: BrandTokens, primary?: string | null, secondary?: string | null): string[] {
  const c = tokens.colors || {};
  const arr = [c.primary, c.secondary, c.accent, c.success, c.warning, c.danger, c.neutral, primary, secondary]
    .filter(Boolean) as string[];
  return Array.from(new Set(arr.map(normalize)));
}
function normalize(c: string): string {
  const v = c.trim().toLowerCase();
  if (v.startsWith('#') && v.length === 4) {
    return '#' + v.slice(1).split('').map((x) => x + x).join('');
  }
  return v;
}
function isPaletteColor(c: string, palette: string[]): boolean {
  return palette.includes(normalize(c));
}
/** Pick the nearest brand color via simple RGB distance. */
function nearestBrandColor(c: string, palette: string[]): string {
  const target = hexToRgb(c);
  if (!target || palette.length === 0) return palette[0] || c;
  let best = palette[0]; let bestD = Infinity;
  for (const p of palette) {
    const rgb = hexToRgb(p);
    if (!rgb) continue;
    const d = (rgb.r - target.r) ** 2 + (rgb.g - target.g) ** 2 + (rgb.b - target.b) ** 2;
    if (d < bestD) { best = p; bestD = d; }
  }
  return best;
}
function hexToRgb(h: string): { r: number; g: number; b: number } | null {
  const v = normalize(h).replace('#', '');
  if (v.length !== 6) return null;
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return { r, g, b };
}
