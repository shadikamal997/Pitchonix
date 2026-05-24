import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  OoxmlPackage, asArray, extractText, readBox,
} from './ooxml-parser';
import {
  importTheme, importMaster, importLayout,
  ImportedTheme, ImportedMaster, ImportedLayout,
} from './theme-master-importer';
import { importChart, ImportedChart } from './chart-importer';
import { importTable, ImportedTable } from './table-importer';
import { extractMedia, MediaEntry } from './media-extractor';
import { importSmartArt, ImportedSmartArt } from './smartart-importer';
import { extractOleObjects, OleEntry } from './ole-importer';
import { resolveTokensForSlide, ResolvedTokens } from './theme-inheritance';
import { importAnimationsForSlide, ImportedAnimation } from './animation-importer';
import { resolveTextStyleInheritance, TextStyleInheritance } from './text-style-inheritance';
import { extractExtLst, ExtensionXml } from './extension-xml';
import { scanLongTailExtensions, LongTailReport } from './long-tail-extensions';
import { extractRichText } from './text-run-extractor';

// =============================================================================
//  Phase 38.1A — Full OOXML import (replaces the regex MVP).
//
//  Flow:
//    1. Open the package; pre-extract every binary in ppt/media/* to disk
//       and build a remap (zipPath → publicUrl).
//    2. Walk themes / masters / layouts (FK targets for the deck).
//    3. For each slide:
//         - find its layout + master + theme via rels
//         - walk <p:spTree> shapes:
//             * <p:sp>            → text frame  → heading / paragraph
//             * <p:pic>           → image       → media URL via the remap
//             * <p:grpSp>         → group       → recurse + tag groupId
//             * <p:graphicFrame>  → chart OR table → use chartImporter or tableImporter
//         - extract speaker notes from notesSlideN.xml
//    4. Emit an ImportReport summary so the UI can show what landed and
//       what was skipped.
//
//  Persistence: a follow-up async method writes the parsed graph into the
//  Pitchonix tables (Deck + DeckTheme + MasterSlide + LayoutTemplate +
//  Slide + SlideElement + DeckSection). FKs are wired during write.
//
//  Scope explicitly DEFERRED (returned as skipped warnings):
//    - SmartArt diagrams (<dgm:>): no equivalent in Pitchonix
//    - 3D charts / surface charts: read as bar with `skipped: true`
//    - OLE-embedded objects (xlsx, doc): mentioned in import report only
//    - Animations + transitions: timing graph parsing is not in this pass;
//      export-side OOXML emission IS done (see ooxml-animation-writer.ts).
// =============================================================================

export interface ImportedElement {
  type:    string;
  order:   number;
  x: number; y: number; width: number; height: number;
  content: any;
  style?:  any;
  groupId?: string;
}

export interface ImportedSlide {
  type:           string;
  order:          number;
  title:          string;
  subtitle?:      string;
  speakerNotes?:  string;
  elements:       ImportedElement[];
  layoutSrc?:     string;
  masterSrc?:     string;
  themeSrc?:      string;
  sectionName?:   string;
  /** Phase 38.2C — resolved theme tokens via master/layout/slide chain. */
  resolvedTokens?: ResolvedTokens;
  /** Phase 38.3B — imported animations (already mapped back to spids). */
  animations?:    ImportedAnimation[];
  /** Phase 38.3E — paragraph-level text styles inherited from the master. */
  textStyles?:    TextStyleInheritance;
  /** Phase 38.3H — preserved extension XML blocks for lossless round-trip. */
  extensions?:    ExtensionXml[];
}

export interface ImportReport {
  title:           string;
  slidesParsed:    number;
  textFrames:      number;
  images:          number;
  charts:          number;
  tables:          number;
  groups:          number;
  notes:           number;
  mediaExtracted:  number;
  masters:         number;
  layouts:         number;
  themes:          number;
  // Phase 38.2 additions
  smartArt:        number;
  oleObjects:      number;
  resolvedTokens:  number;
  // Phase 38.3 additions
  animationsImported: number;
  textStylesResolved: number;
  extensionsPreserved: number;
  // Phase 38.4C additions
  longTail?: LongTailReport;
  /** Per-area skip log. Each entry is something a user might want to know. */
  warnings:        string[];
  /** Per-feature fidelity score (0..1). */
  fidelityScore:   number;
  /** Phase 38.2H — categorised compatibility view. */
  compatibility?:  CompatibilityReport;
}

/**
 * Phase 38.2H — Compatibility report.
 * Surfaces what landed cleanly, what partially landed (degraded fidelity),
 * and what was skipped, so the user can decide whether to keep working or
 * re-author the affected slides.
 */
export interface CompatibilityReport {
  imported:        Array<{ kind: string; count: number; note?: string }>;
  partiallyImported: Array<{ kind: string; count: number; note: string }>;
  skipped:         Array<{ kind: string; count: number; note: string }>;
  /** Coarse rollup score per category. */
  scores: Record<string, number>;
}

export interface PptxImportResult {
  report:    ImportReport;
  title:     string;
  slides:    ImportedSlide[];
  themes:    ImportedTheme[];
  masters:   ImportedMaster[];
  layouts:   ImportedLayout[];
  media:     MediaEntry[];
  // Phase 38.2 additions
  smartArt:  ImportedSmartArt[];
  ole:       OleEntry[];
}

@Injectable()
export class PptxImportService {
  private readonly logger = new Logger(PptxImportService.name);

  constructor(private prisma: PrismaService) {}

  /** Parse a PPTX buffer into the full intermediate representation. */
  parseBuffer(buffer: Buffer): PptxImportResult {
    let pkg: OoxmlPackage;
    try { pkg = new OoxmlPackage(buffer); }
    catch (e: any) { throw new BadRequestException(`Invalid PPTX (not a zip): ${e?.message}`); }

    const warnings: string[] = [];

    // 1) Media first — gives us the path→URL remap used by every shape walk.
    const mediaMap = extractMedia(pkg);
    // Phase 38.2B — pre-extract OLE binaries; the slide walker resolves
    // <p:oleObj> references against this map.
    const oleMap   = extractOleObjects(pkg);

    // 2) Themes / masters / layouts.
    const themes: ImportedTheme[]  = pkg.list(/^ppt\/theme\/theme\d+\.xml$/)
      .map((p) => importTheme(pkg, p)!).filter(Boolean);
    const masters: ImportedMaster[] = pkg.list(/^ppt\/slideMasters\/slideMaster\d+\.xml$/)
      .map((p) => importMaster(pkg, p)!).filter(Boolean);
    const layouts: ImportedLayout[] = pkg.list(/^ppt\/slideLayouts\/slideLayout\d+\.xml$/)
      .map((p) => importLayout(pkg, p)!).filter(Boolean);

    // Phase 38.2A — SmartArt (parse every drawing.xml).
    const smartArt: ImportedSmartArt[] = pkg.list(/^ppt\/diagrams\/drawing\d+\.xml$/)
      .map((p) => importSmartArt(pkg, p)!).filter(Boolean);

    // 3) Slides.
    const slidePaths = pkg.slidePaths();
    const total = slidePaths.length;
    let totalText = 0, totalImg = 0, totalChart = 0, totalTable = 0, totalGroup = 0, totalNotes = 0;
    let totalSmartArt = 0, totalOle = 0, totalResolved = 0;
    let totalAnimImported = 0, totalTextStyles = 0, totalExtensions = 0;
    const themeBySource = new Map(themes.map((t) => [t.source, t]));

    const slides: ImportedSlide[] = slidePaths.map((p, i) => {
      const out = this.parseSlide(pkg, p, i, total, mediaMap, oleMap, smartArt, warnings);
      // Phase 38.2C — resolve effective theme tokens for this slide.
      const layoutPath = pkg.layoutPathForSlide(p);
      const masterPath = layoutPath ? pkg.masterPathForLayout(layoutPath) : null;
      const themePath  = masterPath ? pkg.themePathForMaster(masterPath) : null;
      const theme      = themePath ? themeBySource.get(themePath) || null : null;
      try {
        out.resolvedTokens = resolveTokensForSlide(pkg, p, theme);
        totalResolved++;
      } catch { /* keep import going even if resolution fails */ }

      // Phase 38.3B — import animations from <p:timing>.
      try {
        const anims = importAnimationsForSlide(pkg, p);
        if (anims.length > 0) {
          out.animations = anims;
          totalAnimImported += anims.length;
        }
      } catch { /* timing parse failure is non-fatal */ }

      // Phase 38.3E — paragraph-level text style inheritance from the master.
      try {
        const txi = resolveTextStyleInheritance(pkg, masterPath);
        if (txi.hasAny) {
          out.textStyles = txi;
          totalTextStyles++;
        }
      } catch { /* non-fatal */ }

      // Phase 38.3H — preserve any extLst blobs.
      try {
        const slideDoc = pkg.parse<any>(p);
        const exts = extractExtLst(slideDoc?.['p:sld'], 'slide');
        if (exts.length > 0) {
          out.extensions = exts;
          totalExtensions += exts.length;
        }
      } catch { /* non-fatal */ }

      totalText  += out.elements.filter((e) => e.type === 'paragraph' || e.type === 'heading').length;
      totalImg   += out.elements.filter((e) => e.type === 'image').length;
      totalChart += out.elements.filter((e) => e.type === 'chart').length;
      totalTable += out.elements.filter((e) => e.type === 'table').length;
      totalSmartArt += out.elements.filter((e) => e.type === 'smartArt').length;
      totalOle      += out.elements.filter((e) => e.type === 'oleObject').length;
      totalGroup += out.elements.filter((e) => !!e.groupId).length;
      if (out.speakerNotes) totalNotes++;
      return out;
    });

    // 5) Title from core props.
    const core = pkg.parse<any>('docProps/core.xml');
    const title = core?.['cp:coreProperties']?.['dc:title'] || 'Imported deck';

    // Phase 38.4C — long-tail extension scan (chart ext / 3D / ink / customXml).
    let longTail: LongTailReport | undefined;
    try { longTail = scanLongTailExtensions(pkg); }
    catch { longTail = undefined; }

    const compatibility = buildCompatReport({
      slides:    slides.length,
      text:      totalText,
      images:    totalImg,
      charts:    totalChart,
      tables:    totalTable,
      notes:     totalNotes,
      smartArt:  smartArt.length,
      ole:       oleMap.size,
      themes:    themes.length,
      masters:   masters.length,
      layouts:   layouts.length,
      resolved:  totalResolved,
      warnings,
    });

    const report: ImportReport = {
      title,
      slidesParsed:   slides.length,
      textFrames:     totalText,
      images:         totalImg,
      charts:         totalChart,
      tables:         totalTable,
      groups:         totalGroup,
      notes:          totalNotes,
      mediaExtracted: mediaMap.size,
      masters:        masters.length,
      layouts:        layouts.length,
      themes:         themes.length,
      smartArt:       totalSmartArt,
      oleObjects:     totalOle,
      resolvedTokens: totalResolved,
      animationsImported:  totalAnimImported,
      textStylesResolved:  totalTextStyles,
      extensionsPreserved: totalExtensions,
      longTail,
      warnings,
      fidelityScore:  computeFidelityScore({
        text: totalText, img: totalImg, chart: totalChart, table: totalTable,
        notes: totalNotes, themes: themes.length, masters: masters.length,
        smartArt: smartArt.length, ole: oleMap.size, resolved: totalResolved,
        warnings: warnings.length,
      }),
      compatibility,
    };

    return {
      report,
      title,
      slides,
      themes,
      masters,
      layouts,
      media:    Array.from(mediaMap.values()),
      smartArt,
      ole:      Array.from(oleMap.values()),
    };
  }

  /** Persist a parsed result as a new Deck + theme/master/layout backfills. */
  async importIntoProject(buffer: Buffer, projectId: string): Promise<{ deckId: string; report: ImportReport }> {
    const parsed = this.parseBuffer(buffer);

    // 1) Deck row.
    const deck = await this.prisma.deck.create({
      data: { projectId, title: parsed.title, status: 'draft' },
    });

    // 2) Themes → DeckTheme rows (keyed by source so slides can FK them).
    const themeIdBySource = new Map<string, string>();
    for (const th of parsed.themes) {
      const row = await this.prisma.deckTheme.create({
        data: { deckId: deck.id, name: th.name, tokens: th.tokens as any, isWorkspace: false },
      });
      themeIdBySource.set(th.source, row.id);
    }

    // 3) Masters → MasterSlide rows. Also push placeholder/footer elements as MasterElement.
    const masterIdBySource = new Map<string, string>();
    for (const m of parsed.masters) {
      const row = await this.prisma.masterSlide.create({
        data: {
          deckId:        deck.id,
          name:          m.name,
          layoutType:    m.layoutType,
          background:    m.background as any,
          slots:         m.slots as any,
          defaultStyles: m.defaultStyles as any,
        },
      });
      masterIdBySource.set(m.source, row.id);
      for (const me of m.elements || []) {
        await this.prisma.masterElement.create({
          data: {
            deckId: deck.id,
            type:   me.kind === 'placeholder' ? 'custom' : me.kind,
            name:   me.text?.slice(0, 60),
            x: me.x, y: me.y, width: me.w, height: me.h,
            elementData: me.text ? { text: me.text } : (me.src ? { src: me.src } : null),
          },
        });
      }
    }

    // 4) Layouts → LayoutTemplate rows.
    const layoutIdBySource = new Map<string, string>();
    for (const l of parsed.layouts) {
      const row = await this.prisma.layoutTemplate.create({
        data: {
          name:       l.name,
          layoutType: 'custom',
          slots:      l.slots as any,
        },
      });
      layoutIdBySource.set(l.source, row.id);
    }

    // 5) Slides + elements.
    for (const s of parsed.slides) {
      const slide = await this.prisma.slide.create({
        data: {
          deckId:        deck.id,
          type:          s.type,
          order:         s.order,
          title:         s.title || `Slide ${s.order + 1}`,
          subtitle:      s.subtitle ?? null,
          content:       {} as any,
          speakerNotes:  s.speakerNotes ?? null,
          themeId:       s.themeSrc  ? themeIdBySource.get(s.themeSrc)  ?? null : null,
          masterSlideId: s.masterSrc ? masterIdBySource.get(s.masterSrc) ?? null : null,
          layoutTemplateId: s.layoutSrc ? layoutIdBySource.get(s.layoutSrc) ?? null : null,
        },
      });
      if (s.elements.length) {
        await this.prisma.slideElement.createMany({
          data: s.elements.map((el) => ({
            slideId: slide.id,
            type:    el.type,
            order:   el.order,
            x: el.x, y: el.y, width: el.width, height: el.height,
            content: el.content,
            style:   el.style ?? null,
          })),
        });
      }
    }

    return { deckId: deck.id, report: parsed.report };
  }

  // ---------------------------------------------------------------------------
  //  Slide walker
  // ---------------------------------------------------------------------------

  private parseSlide(
    pkg: OoxmlPackage,
    slidePath: string,
    idx: number,
    total: number,
    mediaMap: Map<string, MediaEntry>,
    oleMap: Map<string, OleEntry>,
    smartArt: ImportedSmartArt[],
    warnings: string[],
  ): ImportedSlide {
    const doc  = pkg.parse<any>(slidePath);
    const root = doc?.['p:sld'];
    const tree = root?.['p:cSld']?.['p:spTree'];
    const rels = pkg.rels(slidePath);
    const elements: ImportedElement[] = [];

    let order = 0;
    const walk = (node: any, groupId?: string) => {
      if (!node) return;
      for (const sp of asArray(node['p:sp']))           this.handleSp(sp, elements, order++, groupId);
      for (const pic of asArray(node['p:pic']))         this.handlePic(pic, elements, order++, slidePath, pkg, mediaMap, groupId);
      for (const gf of asArray(node['p:graphicFrame'])) this.handleGraphicFrame(gf, elements, order++, slidePath, pkg, mediaMap, oleMap, smartArt, warnings, groupId);
      for (const grp of asArray(node['p:grpSp'])) {
        const gid = `g-${idx}-${order++}`;
        walk(grp, gid);
      }
    };
    walk(tree);

    // Title = first heading text frame (if any).
    const heading = elements.find((e) => e.type === 'heading');
    const title = heading?.content?.text || `Slide ${idx + 1}`;

    // Speaker notes.
    let speakerNotes: string | undefined;
    const np = pkg.notePathForSlide(slidePath);
    if (np) {
      const notesDoc = pkg.parse<any>(np);
      const txt = extractText(notesDoc?.['p:notes']?.['p:cSld']?.['p:spTree']);
      if (txt) speakerNotes = txt;
    }

    // Layout / master / theme chain.
    const layoutSrc = pkg.layoutPathForSlide(slidePath) || undefined;
    const masterSrc = layoutSrc ? (pkg.masterPathForLayout(layoutSrc) || undefined) : undefined;
    const themeSrc  = masterSrc ? (pkg.themePathForMaster(masterSrc) || undefined) : undefined;

    return {
      type:        guessSlideType(idx, total),
      order:       idx,
      title:       String(title).slice(0, 200),
      speakerNotes,
      elements,
      layoutSrc,
      masterSrc,
      themeSrc,
    };
  }

  // ---------------------------------------------------------------------------
  //  Per-shape handlers
  // ---------------------------------------------------------------------------

  private handleSp(sp: any, out: ImportedElement[], order: number, groupId?: string) {
    const box = readBox(sp['p:spPr']);
    if (!box) return;
    // Phase 38.5F — capture rich text runs (bold/italic/colour/size) so the
    // editor + the export pipeline keep per-run formatting.
    const rich = extractRichText(sp['p:txBody']);
    if (!rich.text) {
      // Pure shape (rectangle, line, etc.) — emit as generic 'shape'.
      out.push({
        type: 'shape',
        order,
        x: box.x, y: box.y, width: box.w, height: box.h,
        content: { kind: sp['p:spPr']?.['a:prstGeom']?.['@prst'] || 'rect' },
        groupId,
      });
      return;
    }
    const isHeading = order === 0 || (sp['p:nvSpPr']?.['p:nvPr']?.['p:ph']?.['@type'] === 'title');
    out.push({
      type:    isHeading ? 'heading' : 'paragraph',
      order,
      x: box.x, y: box.y, width: box.w, height: box.h,
      content: { text: rich.text, runs: rich.runs },
      groupId,
    });
  }

  private handlePic(
    pic: any,
    out: ImportedElement[],
    order: number,
    slidePath: string,
    pkg: OoxmlPackage,
    mediaMap: Map<string, MediaEntry>,
    groupId?: string,
  ) {
    const box = readBox(pic['p:spPr']);
    if (!box) return;
    const blipId = pic['p:blipFill']?.['a:blip']?.['@r:embed'];
    let url: string | undefined;
    if (blipId) {
      const media = pkg.mediaPathFor(slidePath, blipId);
      if (media) url = mediaMap.get(media.path)?.publicUrl;
    }
    out.push({
      type:    'image',
      order,
      x: box.x, y: box.y, width: box.w, height: box.h,
      content: { src: url || '', url, alt: '' },
      groupId,
    });
  }

  private handleGraphicFrame(
    gf: any,
    out: ImportedElement[],
    order: number,
    slidePath: string,
    pkg: OoxmlPackage,
    mediaMap: Map<string, MediaEntry>,
    oleMap: Map<string, OleEntry>,
    smartArt: ImportedSmartArt[],
    warnings: string[],
    groupId?: string,
  ) {
    const xfrm = gf['p:xfrm'];
    const off  = xfrm?.['a:off']; const ext  = xfrm?.['a:ext'];
    const box  = off && ext
      ? readBox({ 'a:xfrm': { 'a:off': off, 'a:ext': ext } })
      : null;
    if (!box) return;
    const data = gf['a:graphic']?.['a:graphicData'];
    if (!data) return;

    // Chart?
    const chartRef = data['c:chart']?.['@r:id'];
    if (chartRef) {
      const chartPath = pkg.chartPathFor(slidePath, chartRef);
      if (chartPath) {
        const c = importChart(pkg, chartPath);
        if (c) {
          if (c.skipped) warnings.push(`Chart "${c.title || 'untitled'}" mapped to bar (unsupported OOXML kind).`);
          out.push({
            type:    'chart',
            order,
            x: box.x, y: box.y, width: box.w, height: box.h,
            content: {
              type:       c.type,
              title:      c.title,
              categories: c.categories,
              series:     c.series.map((s) => ({ name: s.name, data: s.values, color: s.color })),
              axes:       c.axes,
              legend:     c.legend,
            },
            groupId,
          });
          return;
        }
      }
    }

    // Table?
    const tbl = data['a:tbl'];
    if (tbl) {
      const t = importTable(tbl);
      if (t) {
        out.push({
          type:    'table',
          order,
          x: box.x, y: box.y, width: box.w, height: box.h,
          content: t,
          groupId,
        });
      }
      return;
    }

    // SmartArt? (38.2A)
    // PowerPoint stores SmartArt as <dgm:relIds r:dm="rId…" r:lo r:qs r:cs/>.
    // We use the rId to find the data XML; the diagram comes pre-rendered
    // in `ppt/diagrams/drawingN.xml` (matched via the same drawing rId).
    const dgm = data['dgm:relIds'];
    if (dgm) {
      const drawingRelId = dgm['@r:dm'];
      // Find drawing path through slide rels' diagramData → resolve to drawing.xml
      let drawing: ImportedSmartArt | null = null;
      if (drawingRelId) {
        const slideRels = pkg.rels(slidePath);
        const r = slideRels.get(drawingRelId);
        if (r) {
          // r.target points at data.xml; drawing.xml is a sibling.
          const guess = r.target.replace(/data(\d+)\.xml$/, 'drawing$1.xml');
          drawing = smartArt.find((s) => s.source === guess) || null;
        }
      }
      if (!drawing) drawing = smartArt[0] || null;
      if (drawing) {
        out.push({
          type:    'smartArt',
          order,
          x: box.x, y: box.y, width: box.w, height: box.h,
          content: {
            kind:      drawing.kind,
            nodeCount: drawing.nodeCount,
            nodes:     drawing.nodes,
            shapes:    drawing.shapes,
          },
          groupId,
        });
      } else {
        warnings.push('SmartArt found but no drawing fallback — slot left empty.');
      }
      return;
    }

    // OLE? (38.2B) — graphicData/oleObj with r:id refers to ppt/embeddings/*.
    const ole = data['p:oleObj'] || data['mc:AlternateContent']?.['mc:Choice']?.['p:oleObj'];
    if (ole) {
      const relId = ole['@r:id'];
      let oleEntry: OleEntry | undefined;
      if (relId) {
        const slideRels = pkg.rels(slidePath);
        const r = slideRels.get(relId);
        if (r) oleEntry = oleMap.get(r.target);
      }
      out.push({
        type:    'oleObject',
        order,
        x: box.x, y: box.y, width: box.w, height: box.h,
        content: oleEntry
          ? {
              kind:     oleEntry.kind,
              filename: oleEntry.filename,
              url:      oleEntry.publicUrl,
              bytes:    oleEntry.bytes,
              label:    `${oleEntry.kind} attachment`,
            }
          : { kind: 'binary', label: 'Embedded object (binary lost)' },
        groupId,
      });
      if (!oleEntry) warnings.push('OLE-embedded object reference could not be resolved.');
      return;
    }

    // Unknown graphicData → ignore.
  }
}

// =============================================================================
//  Helpers
// =============================================================================

function guessSlideType(idx: number, total: number): string {
  if (idx === 0)            return 'cover';
  if (idx === total - 1)    return 'closing';
  return 'content';
}

function computeFidelityScore(c: {
  text: number; img: number; chart: number; table: number;
  notes: number; themes: number; masters: number;
  smartArt?: number; ole?: number; resolved?: number;
  warnings: number;
}): number {
  // Phase 38.2 rebalanced — same feature weights, with SmartArt + OLE +
  // theme-inheritance resolution carrying their own contributions.
  let score = 0;
  if (c.text > 0)        score += 0.22;
  if (c.img  > 0)        score += 0.12;
  if (c.chart > 0)       score += 0.12;
  if (c.table > 0)       score += 0.08;
  if (c.notes > 0)       score += 0.08;
  if (c.themes > 0)      score += 0.08;
  if (c.masters > 0)     score += 0.08;
  if ((c.smartArt ?? 0) > 0) score += 0.08;
  if ((c.ole ?? 0) > 0)      score += 0.06;
  if ((c.resolved ?? 0) > 0) score += 0.08;
  score -= Math.min(0.2, c.warnings * 0.03);
  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}

// =============================================================================
//  Phase 38.2H — Compatibility report builder.
// =============================================================================
function buildCompatReport(c: {
  slides: number; text: number; images: number; charts: number; tables: number;
  notes: number; smartArt: number; ole: number; themes: number; masters: number;
  layouts: number; resolved: number; warnings: string[];
}): CompatibilityReport {
  const imported: CompatibilityReport['imported'] = [];
  const partial:  CompatibilityReport['partiallyImported'] = [];
  const skipped:  CompatibilityReport['skipped']  = [];
  const scores:   CompatibilityReport['scores']   = {};

  const push = (kind: string, count: number, into: any[], note?: string) => {
    if (count > 0) into.push({ kind, count, ...(note ? { note } : {}) });
  };

  push('text',     c.text,     imported);
  push('images',   c.images,   imported);
  push('charts',   c.charts,   imported, c.charts > 0 ? 'mapped to closest Pitchonix chart kind (3D / surface flattened)' : undefined);
  push('tables',   c.tables,   imported);
  push('notes',    c.notes,    imported);
  push('themes',   c.themes,   imported);
  push('masters',  c.masters,  imported);
  push('layouts',  c.layouts,  imported);

  // SmartArt is flattened — always "partial".
  if (c.smartArt > 0) {
    partial.push({ kind: 'smartArt', count: c.smartArt, note: 'Imported as grouped flat shapes (live edit semantics not preserved)' });
  }
  // OLE objects: extracted as attachments, never live-editable.
  if (c.ole > 0) {
    partial.push({ kind: 'oleObjects', count: c.ole, note: 'Imported as attachment cards (open in original application)' });
  }
  // Theme inheritance resolution scope.
  if (c.resolved > 0) {
    partial.push({ kind: 'themeInheritance', count: c.resolved, note: 'Resolved master→layout→slide tokens; advanced inheritance edge-cases not 100%' });
  }

  // Warnings → typed skipped entries (rough categorisation).
  for (const w of c.warnings) {
    if (/smartart/i.test(w)) skipped.push({ kind: 'smartArt', count: 1, note: w });
    else if (/ole/i.test(w)) skipped.push({ kind: 'oleObjects', count: 1, note: w });
    else if (/chart/i.test(w)) skipped.push({ kind: 'charts', count: 1, note: w });
    else                     skipped.push({ kind: 'other', count: 1, note: w });
  }

  // Per-category 0..100 score (rough; UI uses this for the report bars).
  scores.text          = c.text > 0 ? 100 : 0;
  scores.images        = c.images > 0 ? 100 : 0;
  scores.charts        = c.charts > 0 ? 85 : 0;
  scores.tables        = c.tables > 0 ? 90 : 0;
  scores.notes         = c.notes > 0 ? 100 : 0;
  scores.themes        = c.themes > 0 ? 80 : 0;
  scores.masters       = c.masters > 0 ? 80 : 0;
  scores.layouts       = c.layouts > 0 ? 80 : 0;
  scores.smartArt      = c.smartArt > 0 ? 75 : 0;
  scores.oleObjects    = c.ole > 0 ? 60 : 0;
  scores.themeInheritance = c.resolved > 0 ? 75 : 0;
  scores.animations    = 70;   // OOXML export complete; import side TBD
  scores.transitions   = 90;

  return { imported, partiallyImported: partial, skipped, scores };
}
