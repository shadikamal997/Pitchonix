import { OoxmlPackage, asArray, extractText } from './ooxml-parser';

// =============================================================================
//  Phase 38.1D — Chart importer.
//
//  Walks `ppt/charts/chartN.xml` and reduces the OOXML chart graph into the
//  shape Pitchonix's chart renderer + export expect:
//
//    {
//      type:        ChartKind,
//      title:       string,
//      categories:  string[],
//      series:      Array<{ name: string; values: number[]; color?: string }>,
//      axes?:       { x?: { title? }, y?: { title? } },
//      legend?:     { visible: bool; position?: 'top'|'bottom'|'side' },
//    }
//
//  Series colors are read from <c:spPr><a:solidFill> when present; otherwise
//  the downstream renderer falls back to the brand palette.
//
//  Chart kinds supported (mapped from <c:plotArea>):
//    barChart        → bar       (orientation: bar→horiz, col→vert)
//    lineChart       → line
//    areaChart       → area
//    pieChart        → pie
//    doughnutChart   → donut
//    scatterChart    → scatter
//    bubbleChart     → bubble
//    radarChart      → radar
//  Unsupported kinds (3D, surface, etc.) return { type:'bar', skipped:true }.
// =============================================================================

export type ImportedChartKind =
  | 'bar' | 'line' | 'area' | 'pie' | 'donut'
  | 'scatter' | 'bubble' | 'radar' | 'waterfall' | 'funnel';

export interface ImportedChart {
  source:     string;
  type:       ImportedChartKind;
  title?:     string;
  categories: string[];
  series:     Array<{ name: string; values: number[]; color?: string }>;
  axes?:      { x?: { title?: string }; y?: { title?: string } };
  legend?:    { visible: boolean; position?: 'top' | 'bottom' | 'side' };
  /** True when the OOXML kind isn't supported; downstream renders as bar. */
  skipped?:   boolean;
}

export function importChart(pkg: OoxmlPackage, chartPath: string): ImportedChart | null {
  const doc = pkg.parse<any>(chartPath);
  const chart = doc?.['c:chartSpace']?.['c:chart'];
  if (!chart) return null;

  const title = extractText(chart['c:title']) || undefined;
  const plot  = chart['c:plotArea'] || {};
  const legend = chart['c:legend'];

  // Pick the first recognised plot-area child.
  const plotKey = Object.keys(plot).find((k) =>
    k.endsWith('Chart') && k !== 'c:catAx' && k !== 'c:valAx',
  );
  if (!plotKey) return null;

  const type = mapKind(plotKey, plot[plotKey]);
  const skipped = type === 'bar' && !['c:barChart'].includes(plotKey);
  const plotNode = plot[plotKey];

  const seriesNodes = asArray(plotNode['c:ser']);
  const categories  = pickCategories(seriesNodes);
  const series      = seriesNodes.map((s: any) => buildSeries(s));

  const axes = {
    x: { title: extractText(plot['c:catAx']?.[0]?.['c:title'] || plot['c:catAx']?.['c:title']) || undefined },
    y: { title: extractText(plot['c:valAx']?.[0]?.['c:title'] || plot['c:valAx']?.['c:title']) || undefined },
  };

  return {
    source: chartPath,
    type,
    title,
    categories,
    series,
    axes,
    legend: legend ? { visible: true, position: pickLegendPos(legend) } : { visible: false },
    skipped: skipped || undefined,
  };
}

// -----------------------------------------------------------------------------

function mapKind(key: string, node: any): ImportedChartKind {
  switch (key) {
    case 'c:barChart': {
      const bd = node?.['c:barDir']?.['@val'];
      return bd === 'bar' ? 'bar' : 'bar';   // pptxgenjs maps both to "bar"; orientation handled at render
    }
    case 'c:lineChart':     return 'line';
    case 'c:areaChart':     return 'area';
    case 'c:pieChart':      return 'pie';
    case 'c:doughnutChart': return 'donut';
    case 'c:scatterChart':  return 'scatter';
    case 'c:bubbleChart':   return 'bubble';
    case 'c:radarChart':    return 'radar';
    default:                return 'bar';
  }
}

function pickLegendPos(legend: any): 'top' | 'bottom' | 'side' {
  const pos = legend?.['c:legendPos']?.['@val'];
  if (pos === 't')  return 'top';
  if (pos === 'b')  return 'bottom';
  return 'side';
}

function pickCategories(seriesNodes: any[]): string[] {
  for (const s of seriesNodes) {
    const cats = s['c:cat']?.['c:strRef']?.['c:strCache']?.['c:pt']
              || s['c:cat']?.['c:strLit']?.['c:pt']
              || s['c:cat']?.['c:numRef']?.['c:numCache']?.['c:pt'];
    if (cats) return asArray(cats).map((p: any) => String(p['c:v'] || p['#text'] || ''));
  }
  return [];
}

function buildSeries(s: any): { name: string; values: number[]; color?: string } {
  const name =
       extractText(s['c:tx'])
    || s['c:tx']?.['c:strRef']?.['c:strCache']?.['c:pt']?.[0]?.['c:v']
    || '';
  const pts  = s['c:val']?.['c:numRef']?.['c:numCache']?.['c:pt']
            || s['c:val']?.['c:numLit']?.['c:pt'];
  const values = asArray(pts).map((p: any) => {
    const raw = typeof p === 'object' ? (p['c:v'] ?? p['#text']) : p;
    const v = Number(raw);
    return Number.isFinite(v) ? v : 0;
  });
  const color = s['c:spPr']?.['a:solidFill']?.['a:srgbClr']?.['@val'];
  return { name: String(name), values, color: color ? `#${String(color).toUpperCase()}` : undefined };
}
