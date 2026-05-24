import { OoxmlPackage, asArray, extractText, readBox } from './ooxml-parser';

// =============================================================================
//  Phase 38.2A — SmartArt importer.
//
//  SmartArt OOXML is a graph format: <dgm:dataModel> + <dgm:layoutDef> +
//  <dgm:styleDef> all need a layout engine to lay out. PowerPoint stores a
//  *pre-rendered* shape tree alongside the abstract diagram so non-Office
//  viewers can render the diagram without reimplementing the layout engine.
//  That tree lives in `ppt/diagrams/drawingN.xml` (an OOXML <p:cSld>-shaped
//  fallback). python-pptx and other libraries take the same approach — flatten
//  to grouped shapes via the fallback tree.
//
//  We:
//    1. Find every `ppt/diagrams/drawingN.xml`
//    2. Build a SmartArt summary (kind, node count, branch depth) from
//       `ppt/diagrams/dataN.xml` so the import report can name what landed
//    3. Convert the fallback shape tree into a SmartArtElement = grouped
//       shapes with a `smartart` annotation so the editor + exporter can
//       continue to treat it as a single logical unit.
//
//  Fidelity: ~80-90% for "look the same"; live edit semantics are flat.
// =============================================================================

export type SmartArtKind =
  | 'process' | 'cycle' | 'hierarchy' | 'pyramid' | 'relationship'
  | 'matrix'  | 'orgchart' | 'list' | 'picture' | 'custom';

export interface SmartArtNode {
  text: string;
  level: number;
  children?: SmartArtNode[];
}

export interface ImportedSmartArt {
  source:        string;     // drawing.xml path
  dataSource?:   string;     // data.xml path
  kind:          SmartArtKind;
  nodeCount:     number;
  nodes:         SmartArtNode[];
  /** Flattened shapes for direct render. Coordinates already in % of slide. */
  shapes:        Array<{
    kind:    'text' | 'shape' | 'image';
    x: number; y: number; w: number; h: number;
    text?:   string;
    fill?:   string;
  }>;
  /** Phase 38.3D — preserved raw OOXML for lossless round-trip. */
  preserved?: {
    /** Raw drawing.xml content. */
    drawingXml?: string;
    /** Raw data.xml content. */
    dataXml?:    string;
    /** Raw layout.xml content (if discoverable). */
    layoutXml?:  string;
  };
}

export function importSmartArt(pkg: OoxmlPackage, drawingPath: string): ImportedSmartArt | null {
  const doc = pkg.parse<any>(drawingPath);
  if (!doc) return null;

  // pkg.rels resolves dgm references companion-style.
  const rels = pkg.rels(drawingPath);
  let dataSource: string | undefined;
  for (const r of rels.values()) {
    if (r.type.endsWith('/diagramData')) dataSource = r.target;
  }
  // dataPath might be picked up differently — fall back to neighbour data{N}.xml.
  if (!dataSource) {
    const m = drawingPath.match(/drawing(\d+)\.xml$/);
    if (m) {
      const guess = drawingPath.replace(/drawing\d+\.xml$/, `data${m[1]}.xml`);
      if (pkg.read(guess)) dataSource = guess;
    }
  }

  // 1) Walk fallback tree → flat shapes.
  const root = doc['dsp:drawing'] || doc['p:drawing'] || doc;
  const tree = root?.['dsp:spTree'] || root?.['p:spTree'];
  const shapes: ImportedSmartArt['shapes'] = [];

  const walk = (node: any) => {
    if (!node) return;
    for (const sp of asArray(node['dsp:sp'] || node['p:sp'])) {
      const box = readBox(sp['dsp:spPr'] || sp['p:spPr']);
      if (!box) continue;
      const text = extractText(sp['dsp:txBody'] || sp['p:txBody']);
      const fill = (sp['dsp:spPr'] || sp['p:spPr'])
        ?.['a:solidFill']?.['a:srgbClr']?.['@val'];
      shapes.push({
        kind: text ? 'text' : 'shape',
        x: box.x, y: box.y, w: box.w, h: box.h,
        text: text || undefined,
        fill: fill ? `#${String(fill).toUpperCase()}` : undefined,
      });
    }
    for (const grp of asArray(node['dsp:grpSp'] || node['p:grpSp'])) walk(grp);
  };
  walk(tree);

  // 2) Inspect the data model for kind + node tree.
  let kind: SmartArtKind = 'custom';
  let nodes: SmartArtNode[] = [];
  let nodeCount = 0;
  if (dataSource) {
    const dd = pkg.parse<any>(dataSource);
    const dataModel = dd?.['dgm:dataModel'];
    if (dataModel) {
      // Parse text tree (pt = point, ptLst = point list)
      const pts = asArray(dataModel['dgm:ptLst']?.['dgm:pt']);
      // Build map of id → { text, level }
      const map = new Map<string, SmartArtNode>();
      for (const pt of pts) {
        if (pt['@type'] !== 'node') continue;
        const id  = pt['@modelId'];
        const txt = extractText(pt['dgm:t']);
        if (id) map.set(id, { text: txt, level: 0 });
      }
      // Reconstruct relationships via cxnLst (connections).
      const cxns = asArray(dataModel['dgm:cxnLst']?.['dgm:cxn']);
      const parentOf = new Map<string, string>();
      for (const cxn of cxns) {
        if (cxn['@type'] !== 'parOf') continue;
        const src = cxn['@srcId']; const dest = cxn['@destId'];
        if (src && dest) parentOf.set(dest, src);
      }
      // Build forest.
      const roots: SmartArtNode[] = [];
      const childMap = new Map<string, SmartArtNode[]>();
      for (const [id, node] of map) {
        const p = parentOf.get(id);
        if (p && map.has(p)) {
          if (!childMap.has(p)) childMap.set(p, []);
          childMap.get(p)!.push(node);
        } else {
          roots.push(node);
        }
      }
      const setLevel = (n: SmartArtNode, l: number, parentText?: string) => {
        n.level = l;
        const kids = childMap.get(findId(map, n) || '');
        if (kids) {
          n.children = kids;
          kids.forEach((k) => setLevel(k, l + 1, n.text));
        }
      };
      roots.forEach((r) => setLevel(r, 0));
      nodes = roots;
      nodeCount = map.size;
    }

    // Kind inference from layout name (when the diagram references its layout).
    const layoutRels = pkg.rels(dataSource);
    for (const r of layoutRels.values()) {
      if (r.type.endsWith('/diagramLayout')) {
        const layout = pkg.parse<any>(r.target);
        const name = String(layout?.['dgm:layoutDef']?.['@uniqueId'] || '').toLowerCase();
        kind = kindFromLayoutName(name);
        break;
      }
    }
  }

  // Phase 38.3D — preserve raw XML so the export side can re-emit the
  // original SmartArt verbatim. We keep all three relevant parts when
  // discoverable; the writer ignores any blob it can't place.
  const preserved: ImportedSmartArt['preserved'] = {
    drawingXml: pkg.read(drawingPath) || undefined,
  };
  if (dataSource) preserved.dataXml = pkg.read(dataSource) || undefined;
  // Look up layout.xml via the data's _rels.
  if (dataSource) {
    const dataRels = pkg.rels(dataSource);
    for (const r of dataRels.values()) {
      if (r.type.endsWith('/diagramLayout')) {
        preserved.layoutXml = pkg.read(r.target) || undefined;
        break;
      }
    }
  }

  return {
    source: drawingPath,
    dataSource,
    kind,
    nodeCount,
    nodes,
    shapes,
    preserved,
  };
}

function findId(map: Map<string, SmartArtNode>, node: SmartArtNode): string | null {
  for (const [id, n] of map) if (n === node) return id;
  return null;
}

function kindFromLayoutName(name: string): SmartArtKind {
  if (name.includes('process'))      return 'process';
  if (name.includes('cycle'))        return 'cycle';
  if (name.includes('hierarch') || name.includes('orgchart')) return 'orgchart';
  if (name.includes('pyramid'))      return 'pyramid';
  if (name.includes('relat'))        return 'relationship';
  if (name.includes('matrix'))       return 'matrix';
  if (name.includes('list'))         return 'list';
  if (name.includes('picture'))      return 'picture';
  return 'custom';
}
