import { OoxmlPackage, asArray, extractText, readBox } from './ooxml-parser';
import { ImportedTheme } from './theme-master-importer';

// =============================================================================
//  Phase 38.2C — Full theme inheritance resolver.
//
//  PowerPoint resolves typography + color + background tokens through a
//  hierarchy:
//
//      Theme → Slide Master → Slide Layout → Placeholder → Slide → Element
//
//  Each level can override the level above. The importer's first pass
//  captures masters/layouts/themes independently; this module knows how to
//  *resolve* the effective tokens for a given slide so we can stamp them
//  onto Slide.themeTokens during the persistence step.
//
//  Resolved shape:
//    {
//      colors:  { primary, secondary, text, background }
//      fonts:   { heading, body }
//      background: { type, color }
//      placeholders: Array<{ type, x, y, w, h, defaultText? }>
//    }
// =============================================================================

export interface ResolvedTokens {
  colors: { primary?: string; secondary?: string; accent?: string; text?: string; background?: string };
  fonts:  { heading?: string; body?: string };
  background: { type: 'solid' | 'gradient' | 'image' | 'none'; color?: string } | null;
  placeholders: Array<{ type: string; x: number; y: number; w: number; h: number; defaultText?: string }>;
}

export interface InheritanceChain {
  slidePath:    string;
  layoutPath?:  string;
  masterPath?:  string;
  themePath?:   string;
}

/** Resolve the effective tokens for a single slide. */
export function resolveTokensForSlide(
  pkg: OoxmlPackage,
  slidePath: string,
  theme?: ImportedTheme | null,
): ResolvedTokens {
  const layoutPath = pkg.layoutPathForSlide(slidePath);
  const masterPath = layoutPath ? pkg.masterPathForLayout(layoutPath) : null;

  // 1) Start from theme.
  const out: ResolvedTokens = {
    colors:       { ...(theme?.tokens?.colors as any || {}) },
    fonts:        { ...(theme?.tokens?.fonts  as any || {}) },
    background:   null,
    placeholders: [],
  };

  // 2) Master overrides background + placeholder positions.
  if (masterPath) {
    const mdoc = pkg.parse<any>(masterPath);
    const mroot = mdoc?.['p:sldMaster'];
    if (mroot) {
      const bgFill = mroot['p:cSld']?.['p:bg']?.['p:bgPr']?.['a:solidFill']?.['a:srgbClr']?.['@val'];
      if (bgFill) out.background = { type: 'solid', color: `#${String(bgFill).toUpperCase()}` };

      // Master placeholders (default geometry for type=title/body/etc).
      const sps = asArray(mroot['p:cSld']?.['p:spTree']?.['p:sp']);
      for (const sp of sps) {
        const ph = sp['p:nvSpPr']?.['p:nvPr']?.['p:ph'];
        if (!ph) continue;
        const box = readBox(sp['p:spPr']);
        if (!box) continue;
        const txt = extractText(sp['p:txBody']);
        out.placeholders.push({
          type: String(ph['@type'] || 'body'),
          x: box.x, y: box.y, w: box.w, h: box.h,
          defaultText: txt || undefined,
        });
      }
    }
  }

  // 3) Layout overrides master where present.
  if (layoutPath) {
    const ldoc = pkg.parse<any>(layoutPath);
    const lroot = ldoc?.['p:sldLayout'];
    if (lroot) {
      const bgFill = lroot['p:cSld']?.['p:bg']?.['p:bgPr']?.['a:solidFill']?.['a:srgbClr']?.['@val'];
      if (bgFill) out.background = { type: 'solid', color: `#${String(bgFill).toUpperCase()}` };

      const sps = asArray(lroot['p:cSld']?.['p:spTree']?.['p:sp']);
      for (const sp of sps) {
        const ph  = sp['p:nvSpPr']?.['p:nvPr']?.['p:ph'];
        if (!ph) continue;
        const box = readBox(sp['p:spPr']);
        if (!box) continue;
        const type = String(ph['@type'] || 'body');
        // Replace any same-typed master placeholder.
        const i = out.placeholders.findIndex((p) => p.type === type);
        const entry = { type, x: box.x, y: box.y, w: box.w, h: box.h, defaultText: extractText(sp['p:txBody']) || undefined };
        if (i >= 0) out.placeholders[i] = entry;
        else        out.placeholders.push(entry);
      }
    }
  }

  // 4) Slide overrides background.
  const sdoc = pkg.parse<any>(slidePath);
  const sroot = sdoc?.['p:sld'];
  const sBg = sroot?.['p:cSld']?.['p:bg']?.['p:bgPr']?.['a:solidFill']?.['a:srgbClr']?.['@val'];
  if (sBg) out.background = { type: 'solid', color: `#${String(sBg).toUpperCase()}` };

  return out;
}

/** Convenience: resolve the chain for a given slide. */
export function chainForSlide(pkg: OoxmlPackage, slidePath: string): InheritanceChain {
  const layoutPath = pkg.layoutPathForSlide(slidePath) || undefined;
  const masterPath = layoutPath ? (pkg.masterPathForLayout(layoutPath) || undefined) : undefined;
  const themePath  = masterPath ? (pkg.themePathForMaster(masterPath) || undefined) : undefined;
  return { slidePath, layoutPath, masterPath, themePath };
}
