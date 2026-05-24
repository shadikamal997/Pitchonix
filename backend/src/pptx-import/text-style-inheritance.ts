import { OoxmlPackage, asArray } from './ooxml-parser';

// =============================================================================
//  Phase 38.3E — Full text-style inheritance resolver.
//
//  PowerPoint resolves paragraph-level styles through `p:txStyles` on the
//  slide master:
//
//      titleStyle    →  a:lvl1pPr   (titles always lvl 1)
//      bodyStyle     →  a:lvl1pPr … a:lvl9pPr   (one per outline level)
//      otherStyle    →  a:lvl1pPr … a:lvl9pPr   (non-title/body placeholders)
//
//  Each lvlNpPr can carry:
//    - bullet character / font / color  (a:buChar / a:buFont / a:buClr)
//    - indent  (@indent, EMU)
//    - margin  (@marL, EMU)
//    - line spacing (a:lnSpc)
//    - default text run props (a:defRPr): size/family/color
//
//  We walk masters + layouts in inheritance order and reduce them to a
//  per-(placeholderType, level) style table the renderer can stamp on
//  imported list elements.
// =============================================================================

export interface ParagraphStyle {
  level:   number;                  // 1..9
  indent?: number;                  // % of slide width
  marginLeft?: number;              // % of slide width
  lineSpacing?: number;             // multiplier (1.0 = 100%)
  bullet?: {
    enabled: boolean;
    char?: string;
    font?: string;
    color?: string;
  };
  defaultRun?: {
    size?:  number;                 // points
    family?: string;
    color?:  string;
    bold?:   boolean;
    italic?: boolean;
  };
}

export interface TextStyleInheritance {
  /** placeholderType → level (1..9) → ParagraphStyle */
  styles: Record<string, Record<number, ParagraphStyle>>;
  /** True when at least one lvlNpPr block was found. */
  hasAny: boolean;
}

const EMU_PER_POINT = 12700;
const SLIDE_W_EMU = 12192000;   // LAYOUT_WIDE

export function resolveTextStyleInheritance(
  pkg: OoxmlPackage,
  masterPath: string | null | undefined,
): TextStyleInheritance {
  const out: TextStyleInheritance = { styles: {}, hasAny: false };
  if (!masterPath) return out;
  const doc = pkg.parse<any>(masterPath);
  const txStyles = doc?.['p:sldMaster']?.['p:txStyles'];
  if (!txStyles) return out;

  // Three style blocks → three "placeholder type" buckets.
  takeBlock(out, 'title', txStyles['p:titleStyle']);
  takeBlock(out, 'body',  txStyles['p:bodyStyle']);
  takeBlock(out, 'other', txStyles['p:otherStyle']);
  return out;
}

function takeBlock(
  acc: TextStyleInheritance,
  type: 'title' | 'body' | 'other',
  block: any,
) {
  if (!block) return;
  for (let lvl = 1; lvl <= 9; lvl++) {
    const key = `a:lvl${lvl}pPr`;
    const node = block[key];
    if (!node) continue;
    acc.hasAny = true;
    acc.styles[type] = acc.styles[type] || {};
    acc.styles[type][lvl] = parseLevel(node, lvl);
  }
  // Some masters put defRPr directly under titleStyle (lvl1 implicit).
  if (type === 'title' && block['a:defRPr'] && !acc.styles.title?.[1]) {
    acc.styles.title = acc.styles.title || {};
    acc.styles.title[1] = parseLevel({ 'a:defRPr': block['a:defRPr'] }, 1);
  }
}

function parseLevel(node: any, lvl: number): ParagraphStyle {
  const indentEmu = node['@indent']  ? Number(node['@indent'])  : undefined;
  const marLEmu   = node['@marL']    ? Number(node['@marL'])    : undefined;
  const ln        = node['a:lnSpc']?.['a:spcPct']?.['@val'];
  const lineSpacing = ln ? Number(ln) / 100000 : undefined;

  const buChar  = node['a:buChar']?.['@char'];
  const buFont  = node['a:buFont']?.['@typeface'];
  const buColor = node['a:buClr']?.['a:srgbClr']?.['@val'];
  const buNone  = node['a:buNone'] !== undefined;

  const defRPr  = node['a:defRPr'] || {};
  const size    = defRPr['@sz'] ? Number(defRPr['@sz']) / 100 : undefined;  // hundredths of a point
  const family  = defRPr['a:latin']?.['@typeface'];
  const colorHex = defRPr['a:solidFill']?.['a:srgbClr']?.['@val'];
  const bold    = defRPr['@b'] === '1' || defRPr['@b'] === 'true' || undefined;
  const italic  = defRPr['@i'] === '1' || defRPr['@i'] === 'true' || undefined;

  return {
    level: lvl,
    indent:     indentEmu != null ? clampPct((indentEmu / SLIDE_W_EMU) * 100) : undefined,
    marginLeft: marLEmu   != null ? clampPct((marLEmu   / SLIDE_W_EMU) * 100) : undefined,
    lineSpacing,
    bullet: buNone
      ? { enabled: false }
      : (buChar || buFont || buColor)
        ? { enabled: true, char: buChar || undefined, font: buFont || undefined, color: buColor ? `#${String(buColor).toUpperCase()}` : undefined }
        : undefined,
    defaultRun: {
      size,
      family: family || undefined,
      color:  colorHex ? `#${String(colorHex).toUpperCase()}` : undefined,
      bold,
      italic,
    },
  };
}

function clampPct(v: number): number {
  return Math.max(0, Math.min(100, v));
}
