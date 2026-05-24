import { OoxmlPackage, asArray, extractText, readBox } from './ooxml-parser';

// =============================================================================
//  Phase 38.1B — Theme + Master importer.
//
//  Walks the theme tree (`ppt/theme/themeN.xml`) and master tree
//  (`ppt/slideMasters/slideMasterN.xml`) and reduces them into:
//
//    ImportedTheme         → DeckTheme.tokens
//    ImportedMaster        → MasterSlide row (incl. derived element snapshots)
//    ImportedLayout        → LayoutTemplate row (slots only)
//
//  These are returned by the importer alongside slides, so the persistence
//  step can create the FK targets first and then back-fill `Slide.themeId`,
//  `Slide.masterSlideId`, `Slide.layoutTemplateId`.
// =============================================================================

export interface ImportedTheme {
  /** Path in the original package (used to de-dup by source). */
  source: string;
  name:   string;
  tokens: {
    colors?: Record<string, string>;
    fonts?:  Record<string, string>;
  };
}

export interface ImportedMaster {
  source:        string;
  name:          string;
  layoutType:    'cover' | 'body' | 'divider' | 'appendix' | 'custom';
  background:    any;
  slots:         { footer: boolean; pageNumbers: boolean; logos: boolean; watermark?: any };
  defaultStyles: any;
  /** Optional snapshot of placeholder text frames + footer/header elements. */
  elements?:     ImportedMasterElement[];
}

export interface ImportedMasterElement {
  kind: 'logo' | 'footer' | 'pageNumber' | 'header' | 'background' | 'placeholder';
  x: number; y: number; w: number; h: number;
  text?: string;
  src?:  string;
}

export interface ImportedLayout {
  source:     string;
  name:       string;
  layoutType: string;
  masterSrc:  string;
  slots:      Array<{ id: string; role: string; x: number; y: number; w: number; h: number; placeholder?: string }>;
}

// =============================================================================
//  Theme
// =============================================================================

export function importTheme(pkg: OoxmlPackage, themePath: string): ImportedTheme | null {
  const doc = pkg.parse<any>(themePath);
  if (!doc?.['a:theme']) return null;
  const root = doc['a:theme'];
  const name = String(root['@name'] || 'Imported theme');
  const scheme = root['a:themeElements'] || {};
  const clr    = scheme['a:clrScheme']  || {};
  const font   = scheme['a:fontScheme'] || {};

  // Color scheme — pick the most common slots PowerPoint exposes.
  const colors: Record<string, string> = {};
  const setSrgb = (key: string, node: any) => {
    const srgb = node?.['a:srgbClr']?.['@val'];
    const sys  = node?.['a:sysClr']?.['@lastClr'];
    const hex  = srgb || sys;
    if (hex) colors[key] = `#${String(hex).toUpperCase()}`;
  };
  setSrgb('primary',    clr['a:accent1']);
  setSrgb('secondary',  clr['a:accent2']);
  setSrgb('accent',     clr['a:accent3']);
  setSrgb('success',    clr['a:accent4']);
  setSrgb('warning',    clr['a:accent5']);
  setSrgb('danger',     clr['a:accent6']);
  setSrgb('text',       clr['a:dk1']);
  setSrgb('neutral',    clr['a:lt1']);

  const fonts: Record<string, string> = {};
  const major = font['a:majorFont']?.['a:latin']?.['@typeface'];
  const minor = font['a:minorFont']?.['a:latin']?.['@typeface'];
  if (major) fonts.heading = major;
  if (minor) fonts.body    = minor;

  return { source: themePath, name, tokens: { colors, fonts } };
}

// =============================================================================
//  Master
// =============================================================================

export function importMaster(pkg: OoxmlPackage, masterPath: string): ImportedMaster | null {
  const doc = pkg.parse<any>(masterPath);
  if (!doc?.['p:sldMaster']) return null;
  const root  = doc['p:sldMaster'];
  const tree  = root['p:cSld'] || {};
  const name  = String(tree['@name'] || `Master from ${masterPath.split('/').pop()}`);
  const bgFill = tree['p:bg']?.['p:bgPr']?.['a:solidFill']?.['a:srgbClr']?.['@val'];
  const background = bgFill ? { type: 'solid', color: `#${String(bgFill).toUpperCase()}` } : null;

  // Walk placeholders to detect footer / page-number / date slots.
  const elements: ImportedMasterElement[] = [];
  let hasFooter = false, hasPageNumbers = false;
  const sps = asArray(tree['p:spTree']?.['p:sp']);
  for (const sp of sps) {
    const ph   = sp['p:nvSpPr']?.['p:nvPr']?.['p:ph'];
    const type = ph?.['@type'];
    const box  = readBox(sp['p:spPr']);
    const text = extractText(sp['p:txBody']);
    if (!box) continue;
    if (type === 'ftr') { hasFooter = true; elements.push({ kind: 'footer', text, ...box }); }
    else if (type === 'sldNum') { hasPageNumbers = true; elements.push({ kind: 'pageNumber', text, ...box }); }
    else if (type === 'dt')     { elements.push({ kind: 'header', text, ...box }); }
    else if (type === 'pic')    { elements.push({ kind: 'logo', ...box }); }
    else                        { elements.push({ kind: 'placeholder', text, ...box }); }
  }

  // Default styles via theme tokens (defer to importTheme on the theme path).
  const defaultStyles = {
    titleStyle: pickLst(root['p:txStyles']?.['p:titleStyle']),
    bodyStyle:  pickLst(root['p:txStyles']?.['p:bodyStyle']),
  };

  return {
    source:     masterPath,
    name,
    layoutType: 'body',
    background,
    slots:      { footer: hasFooter, pageNumbers: hasPageNumbers, logos: elements.some((e) => e.kind === 'logo') },
    defaultStyles,
    elements,
  };
}

function pickLst(node: any): any {
  if (!node) return null;
  // Just preserve the raw block — renderers can interpret it later.
  const out: any = {};
  for (const k of Object.keys(node)) if (k.startsWith('a:lvl')) out[k] = node[k];
  return out;
}

// =============================================================================
//  Layout
// =============================================================================

export function importLayout(pkg: OoxmlPackage, layoutPath: string): ImportedLayout | null {
  const doc = pkg.parse<any>(layoutPath);
  if (!doc?.['p:sldLayout']) return null;
  const root = doc['p:sldLayout'];
  const tree = root['p:cSld'] || {};
  const name = String(tree['@name'] || `Layout from ${layoutPath.split('/').pop()}`);
  const layoutType = String(root['@type'] || 'custom');
  const masterPath = pkg.masterPathForLayout(layoutPath) || '';

  const slots: ImportedLayout['slots'] = [];
  const sps = asArray(tree['p:spTree']?.['p:sp']);
  sps.forEach((sp: any, i: number) => {
    const box = readBox(sp['p:spPr']);
    if (!box) return;
    const ph   = sp['p:nvSpPr']?.['p:nvPr']?.['p:ph'];
    const role = ph?.['@type'] || 'body';
    slots.push({
      id:           `slot-${i + 1}`,
      role,
      x: box.x, y: box.y, w: box.w, h: box.h,
      placeholder: extractText(sp['p:txBody']) || undefined,
    });
  });

  return { source: layoutPath, name, layoutType, masterSrc: masterPath, slots };
}
