import { OoxmlPackage, asArray, walk } from './ooxml-parser';

// =============================================================================
//  Phase 38.4C — Long-tail OOXML extension support.
//
//  PowerPoint emits a constellation of optional extensions that the OOXML
//  spec either makes optional, marks vendor-specific, or doesn't cover:
//
//    Chart extensions   c:ext (3D charts, custom data label fmt, etc.)
//    3D shape effects   a:sp3d / a:scene3d / a:bevelT / a:bevelB / a:lightRig
//    Ink annotations    a:contentPart pointing at ppt/ink/inkN.xml
//    Custom XML parts   customXml/* (CRM / ECM tagging payloads)
//    Drawing extensions a:extLst inside a:spPr / a:bodyPr / a:lstStyle
//
//  We:
//    1. Walk every slide / master / chart / shape for these extension nodes
//    2. Tag each with a known vendor URI (or "unknown")
//    3. Preserve the raw subtree for lossless export round-trip
//    4. Surface counts in the import report so users see what was kept
// =============================================================================

export interface DetectedExtension {
  /** Vendor URI extracted from @uri or our internal label. */
  uri:       string;
  /** Human-readable name from EXTENSION_REGISTRY when known. */
  name:      string;
  /** Where this extension lived. */
  scope:     'chart' | 'shape3d' | 'ink' | 'customXml' | 'drawing' | 'unknown';
  /** Path inside the OOXML package. */
  source:    string;
  /** Raw serialised subtree (best-effort JSON for round-trip). */
  rawXml:    string;
  /** Optional shape ID when extension belonged to a single shape. */
  spId?:     string;
}

/**
 * Curated registry of vendor URIs we know about. Keys are URI substrings
 * (case-insensitive contains-match). Unknown URIs still preserve.
 */
export const EXTENSION_REGISTRY: Array<{ pattern: RegExp; name: string; scope: DetectedExtension['scope'] }> = [
  // Chart-side
  { pattern: /chartExtensibility/i,  name: 'Chart Extensibility (c14)',        scope: 'chart' },
  { pattern: /\/chart\/.*c15/i,      name: 'Chart Extensibility (c15)',        scope: 'chart' },
  { pattern: /chart3D/i,             name: '3D Chart View',                    scope: 'chart' },
  { pattern: /trendline/i,           name: 'Chart Trendline',                  scope: 'chart' },
  { pattern: /errorBar/i,            name: 'Chart Error Bars',                 scope: 'chart' },
  { pattern: /dispBlanksAs/i,        name: 'Display Blanks',                   scope: 'chart' },
  // 3D shape
  { pattern: /sp3d|scene3d|bevelT|bevelB|lightRig/i, name: '3D Shape Effects', scope: 'shape3d' },
  // Ink
  { pattern: /ink|contentPart/i,     name: 'Ink Annotation',                   scope: 'ink' },
  // Custom XML parts
  { pattern: /customXml/i,           name: 'CustomXml Tagging',                scope: 'customXml' },
  // Drawing
  { pattern: /a14|a15|a16|drawml/i,  name: 'DrawingML Extension',              scope: 'drawing' },
];

/** Map any URI to a name + scope using the registry; fallback = unknown. */
export function classifyExtensionUri(uri: string, ownScope?: DetectedExtension['scope']): { name: string; scope: DetectedExtension['scope'] } {
  for (const entry of EXTENSION_REGISTRY) {
    if (entry.pattern.test(uri)) return { name: entry.name, scope: ownScope || entry.scope };
  }
  return { name: 'Unknown vendor extension', scope: ownScope || 'unknown' };
}

// =============================================================================
//  Scanners
// =============================================================================

/** Walk every chart in the package and return chart-level extensions. */
export function scanChartExtensions(pkg: OoxmlPackage): DetectedExtension[] {
  const out: DetectedExtension[] = [];
  for (const chartPath of pkg.list(/^ppt\/charts\/chart\d+\.xml$/)) {
    const doc = pkg.parse<any>(chartPath);
    if (!doc) continue;

    // <c:extLst> / <c:ext uri="…">
    walk(doc, (k, v) => {
      if (k !== 'c:extLst') return;
      const exts = asArray((v as any)?.['c:ext']);
      for (const ext of exts) {
        const uri = String(ext?.['@uri'] || 'unknown');
        const { name, scope } = classifyExtensionUri(uri, 'chart');
        out.push({ uri, name, scope, source: chartPath, rawXml: safeStringify(ext) });
      }
    });

    // <c:view3D> — 3D chart marker (no extLst, just presence).
    const view3D = doc?.['c:chartSpace']?.['c:chart']?.['c:view3D'];
    if (view3D) {
      out.push({
        uri: 'c:view3D', name: '3D Chart View', scope: 'chart',
        source: chartPath, rawXml: safeStringify(view3D),
      });
    }

    // Trendlines / error bars on each series.
    const ser = doc?.['c:chartSpace']?.['c:chart']?.['c:plotArea'];
    walk(ser, (k, v) => {
      if (k === 'c:trendline') {
        out.push({ uri: 'c:trendline', name: 'Chart Trendline', scope: 'chart', source: chartPath, rawXml: safeStringify(v) });
      }
      if (k === 'c:errBars') {
        out.push({ uri: 'c:errBars',   name: 'Chart Error Bars', scope: 'chart', source: chartPath, rawXml: safeStringify(v) });
      }
    });
  }
  return out;
}

/** Walk every slide / shape for 3D shape effects + drawing extensions. */
export function scanShapeAndDrawingExtensions(pkg: OoxmlPackage): DetectedExtension[] {
  const out: DetectedExtension[] = [];
  const slidePaths = pkg.slidePaths();
  for (const slidePath of slidePaths) {
    const doc = pkg.parse<any>(slidePath);
    if (!doc) continue;
    walk(doc, (k, v) => {
      // 3D shape effects.
      if (k === 'a:sp3d' || k === 'a:scene3d' || k === 'a:bevelT' || k === 'a:bevelB' || k === 'a:lightRig') {
        out.push({
          uri: k, name: '3D Shape Effects', scope: 'shape3d',
          source: slidePath, rawXml: safeStringify(v),
        });
      }
      // Drawing extensions on shape properties.
      if (k === 'a:extLst' && v && typeof v === 'object') {
        for (const ext of asArray((v as any)['a:ext'])) {
          const uri = String(ext?.['@uri'] || 'unknown');
          const { name, scope } = classifyExtensionUri(uri, 'drawing');
          out.push({ uri, name, scope, source: slidePath, rawXml: safeStringify(ext) });
        }
      }
    });
  }
  return out;
}

/** Walk for ink annotations (ppt/ink/inkN.xml + <a:contentPart> references). */
export function scanInkAnnotations(pkg: OoxmlPackage): DetectedExtension[] {
  const out: DetectedExtension[] = [];
  // Any ink XML in the package.
  for (const inkPath of pkg.list(/^ppt\/ink\/ink\d+\.xml$/)) {
    const xml = pkg.read(inkPath);
    if (!xml) continue;
    out.push({
      uri: 'ppt/ink', name: 'Ink Annotation', scope: 'ink',
      source: inkPath, rawXml: safeStringify({ length: xml.length, head: xml.slice(0, 200) }),
    });
  }
  // <a:contentPart> referencing ink ids on slides.
  for (const slidePath of pkg.slidePaths()) {
    const doc = pkg.parse<any>(slidePath);
    walk(doc, (k, v) => {
      if (k === 'a:contentPart') {
        out.push({
          uri: 'a:contentPart', name: 'Ink Annotation (slide reference)', scope: 'ink',
          source: slidePath, rawXml: safeStringify(v),
        });
      }
    });
  }
  return out;
}

/** Walk customXml/* parts — CRM, ECM, tagging metadata. */
export function scanCustomXml(pkg: OoxmlPackage): DetectedExtension[] {
  const out: DetectedExtension[] = [];
  for (const xmlPath of pkg.list(/^customXml\/item\d+\.xml$/)) {
    const xml = pkg.read(xmlPath);
    if (!xml) continue;
    out.push({
      uri: 'customXml/item', name: 'CustomXml Item', scope: 'customXml',
      source: xmlPath, rawXml: safeStringify({ length: xml.length, head: xml.slice(0, 200) }),
    });
  }
  return out;
}

/** One-shot orchestration — used by the importer + the validation script. */
export interface LongTailReport {
  chartExt:    number;
  shape3D:     number;
  drawing:     number;
  ink:         number;
  customXml:   number;
  total:       number;
  /** Top-10 individual extension records (for the UI). */
  sample:      DetectedExtension[];
}

export function scanLongTailExtensions(pkg: OoxmlPackage): LongTailReport {
  const chart   = scanChartExtensions(pkg);
  const shapes  = scanShapeAndDrawingExtensions(pkg);
  const ink     = scanInkAnnotations(pkg);
  const custom  = scanCustomXml(pkg);

  const all = [...chart, ...shapes, ...ink, ...custom];
  const chartExt = chart.length;
  const shape3D  = shapes.filter((e) => e.scope === 'shape3d').length;
  const drawing  = shapes.filter((e) => e.scope === 'drawing' || e.scope === 'unknown').length;
  const inkN     = ink.length;
  const customN  = custom.length;

  return {
    chartExt,
    shape3D,
    drawing,
    ink:       inkN,
    customXml: customN,
    total:     all.length,
    sample:    all.slice(0, 10),
  };
}

// =============================================================================
//  Export-side re-emitter hook.
//
//  Captures every preserved extension on a deck so the writer pass can splice
//  them back into the freshly-written OOXML zip alongside the matching shape.
//  The actual splicing lives in the post-process pass next to the animation
//  writer; we provide the data carrier here so import/export pipelines share
//  the contract.
// =============================================================================

export interface PreservedExtensionPayload {
  perSlide:  Record<string, DetectedExtension[]>;
  perChart:  Record<string, DetectedExtension[]>;
  perOther:  DetectedExtension[];
}

export function bucketForExport(all: DetectedExtension[]): PreservedExtensionPayload {
  const perSlide: Record<string, DetectedExtension[]> = {};
  const perChart: Record<string, DetectedExtension[]> = {};
  const perOther: DetectedExtension[] = [];
  for (const e of all) {
    if (e.source.startsWith('ppt/slides/'))      (perSlide[e.source] ||= []).push(e);
    else if (e.source.startsWith('ppt/charts/')) (perChart[e.source] ||= []).push(e);
    else                                          perOther.push(e);
  }
  return { perSlide, perChart, perOther };
}

// -----------------------------------------------------------------------------

function safeStringify(v: any): string {
  try { return JSON.stringify(v); }
  catch { return '[unserialisable extension subtree]'; }
}
