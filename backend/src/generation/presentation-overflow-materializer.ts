import type { SlideElementDTO, ElementStyle } from '../slides/element-types';
import { SlideType, type SlideContent } from './slide-types/types';

type OverflowDestination =
  | 'primarySlide'
  | 'continuationSlide'
  | 'appendixSlide'
  | 'speakerNotes'
  | 'sourcePreservationLedger';

interface LedgerNode {
  sourceType: string;
  sourceIndex: number;
  sourceText: string;
  destination: OverflowDestination;
  reason: string;
}

interface ContentPreservationLedger {
  overflowNodes?: LedgerNode[];
  renderedNodes?: LedgerNode[];
}

interface MaterializedSlide extends SlideContent {
  metadata?: Record<string, any>;
}

interface MaterializationResult {
  slides: MaterializedSlide[];
  warnings: Array<{ slideTitle: string; unmaterializedCount: number; reason: string }>;
  materializedCounts: {
    continuationSlides: number;
    appendixSlides: number;
    speakerNotesNodes: number;
    appendixNodes: number;
  };
}

const NOW = '1970-01-01T00:00:00.000Z';
const MAX_ITEMS_PER_CONTINUATION = 5;
// 8 items overflows the slide canvas: item 7 lands at y=106.8 (safe max is 5, last item bottom=85).
const MAX_ITEMS_PER_APPENDIX_PAGE = 5;
// At most 2 slides per appendix title category (prevents one category monopolising all slots).
const MAX_APPENDIX_SLIDES_PER_TITLE = 2;
// appendix/(primary+appendix) ≤ 0.15  ⟹  appendix ≤ 0.1765 × primary
const APPENDIX_RATIO_CAP = 0.1765;
// continuation/(deck total) ≤ 0.10  ⟹  continuation ≤ 0.08 × requestedSlideCount
// Applied as a soft upper bound only. The actual limit is max(slidesWithContinuation, ratio × deck)
// so every slide that has continuation overflow gets at least one continuation slide.
const CONTINUATION_RATIO_CAP = 0.08;

const APPENDIX_HEADINGS: Record<string, string> = {
  kpi: 'Additional KPIs',
  teamMember: 'Additional Team Members',
  marketDriver: 'Additional Market Drivers',
  roadmapMilestone: 'Additional Roadmap Milestones',
  pricingTier: 'Additional Pricing Tiers',
  businessModelPoint: 'Additional Pricing Tiers',
  riskItem: 'Additional Risks',
  strategicPoint: 'Additional Risks',
  problemPoint: 'Additional Problem Points',
  solutionFeature: 'Additional Solution Features',
  competitiveAdvantage: 'Additional Competition Notes',
  competitor: 'Additional Competition Notes',
  fundingAllocation: 'Additional KPIs',
  slideContent: 'Additional Source Content',
};

const textStyle: ElementStyle = {
  fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif',
  fontSize: 12,
  fontWeight: 500,
  color: '#111827',
  lineHeight: 1.25,
};

const headingStyle: ElementStyle = {
  fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif',
  fontSize: 28,
  fontWeight: 800,
  color: '#111827',
  lineHeight: 1.05,
};

const labelStyle: ElementStyle = {
  fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif',
  fontSize: 9,
  fontWeight: 800,
  color: '#dc2626',
  textTransform: 'uppercase',
  letterSpacing: 1,
};

export function materializePresentationOverflow(
  slides: SlideContent[],
  requestedSlideCount?: number,
): MaterializationResult {
  const output: MaterializedSlide[] = [];
  const appendixNodes: LedgerNode[] = [];
  const warnings: MaterializationResult['warnings'] = [];
  const counts = {
    continuationSlides: 0,
    appendixSlides: 0,
    speakerNotesNodes: 0,
    appendixNodes: 0,
  };

  // Count slides that have continuation-destined overflow nodes so every
  // overflowing slide gets at least one continuation slot regardless of deck size.
  // The ratio cap still applies as an upper bound for large explicitly-budgeted decks.
  const slidesWithContinuation = (slides as MaterializedSlide[]).reduce((n, s) => {
    const ledger = readContentPreservationLedger(s);
    return n + ((ledger?.overflowNodes || []).some((node) => node.destination === 'continuationSlide') ? 1 : 0);
  }, 0);
  const baseDeck = requestedSlideCount ?? slides.length;
  const maxContinuationSlides = Math.max(
    slidesWithContinuation,
    Math.floor(CONTINUATION_RATIO_CAP * baseDeck),
  );

  for (const original of slides as MaterializedSlide[]) {
    const slide = cloneSlide(original);
    const ledger = readContentPreservationLedger(slide);
    const overflowNodes = ledger?.overflowNodes || [];
    const continuationNodes = overflowNodes.filter(
      (node) => node.destination === 'continuationSlide',
    );
    const speakerNotesNodes = overflowNodes.filter((node) => node.destination === 'speakerNotes');
    const directAppendixNodes = overflowNodes.filter(
      (node) =>
        node.destination === 'appendixSlide' || node.destination === 'sourcePreservationLedger',
    );

    if (speakerNotesNodes.length > 0) {
      slide.speakerNotes = appendPreservedSpeakerNotes(slide.speakerNotes, speakerNotesNodes);
      counts.speakerNotesNodes += speakerNotesNodes.length;
    }

    output.push(slide);

    try {
      for (const chunk of chunkNodes(continuationNodes, MAX_ITEMS_PER_CONTINUATION)) {
        if (counts.continuationSlides >= maxContinuationSlides) break;
        output.push(
          createMaterializedSlide({
            source: slide,
            title: continuedTitle(slide.title || 'Slide'),
            subtitle: groupSubtitle(chunk),
            type: slide.type,
            nodes: chunk,
            kind: 'continuation',
          }),
        );
        counts.continuationSlides += 1;
      }
    } catch (error) {
      markContentFidelityWarning(slide, continuationNodes.length, (error as Error).message);
      warnings.push({
        slideTitle: slide.title || 'Untitled slide',
        unmaterializedCount: continuationNodes.length,
        reason: (error as Error).message,
      });
    }

    // Speaker notes must be PDF-safe too. Add them to appendix slides so PDF
    // export cannot silently lose content that PPTX stores in notes.
    appendixNodes.push(...directAppendixNodes, ...speakerNotesNodes);
  }

  try {
    const primaryCount = output.length;
    // Allow enough appendix slides to cover all overflow content (subject to per-title
    // page limit MAX_APPENDIX_SLIDES_PER_TITLE). The ratio cap sets the floor for large
    // decks; content need sets the floor for small decks so no overflow node is silently lost.
    const baseDenominator = primaryCount > 0 ? primaryCount : (requestedSlideCount ?? 10);
    const neededAppendixSlides = computeNeededAppendixSlides(appendixNodes);
    const maxAppendixSlides = Math.max(
      neededAppendixSlides,
      Math.floor(APPENDIX_RATIO_CAP * baseDenominator),
      neededAppendixSlides > 0 ? 1 : 0,
    );
    for (const appendixSlide of createAppendixSlides(
      slides[0] as MaterializedSlide | undefined,
      appendixNodes,
      maxAppendixSlides,
    )) {
      output.push(appendixSlide);
      counts.appendixSlides += 1;
    }
    counts.appendixNodes = appendixNodes.length;
  } catch (error) {
    const first = output[0];
    if (first) markContentFidelityWarning(first, appendixNodes.length, (error as Error).message);
    warnings.push({
      slideTitle: 'Deck appendix',
      unmaterializedCount: appendixNodes.length,
      reason: (error as Error).message,
    });
  }

  return {
    slides: output.map((slide, index) => ({ ...slide, order: index + 1 })),
    warnings,
    materializedCounts: counts,
  };
}

function readContentPreservationLedger(slide: SlideContent): ContentPreservationLedger | null {
  const tree =
    slide.smartComponent?.elementTree || (slide.content as any)?.smartComponent?.elementTree || [];
  for (const element of tree) {
    const ledger = element?.data?.contentPreservation;
    if (ledger && typeof ledger === 'object') return ledger as ContentPreservationLedger;
  }
  return null;
}

function computeNeededAppendixSlides(nodes: LedgerNode[]): number {
  if (nodes.length === 0) return 0;
  const grouped = groupByTitle(nodes);
  let total = 0;
  for (const groupNodes of grouped.values()) {
    total += Math.min(
      Math.ceil(groupNodes.length / MAX_ITEMS_PER_APPENDIX_PAGE),
      MAX_APPENDIX_SLIDES_PER_TITLE,
    );
  }
  return total;
}

function createAppendixSlides(
  source: MaterializedSlide | undefined,
  nodes: LedgerNode[],
  maxTotalSlides: number,
): MaterializedSlide[] {
  if (nodes.length === 0) return [];
  const slides: MaterializedSlide[] = [];
  // Group by display title (not sourceType) so 'kpi' and 'fundingAllocation' share
  // one "Additional KPIs" group instead of producing consecutive identically-titled slides.
  const grouped = groupByTitle(nodes);
  let pageNumber = 1;

  for (const [title, groupNodes] of grouped) {
    if (slides.length >= maxTotalSlides) break;
    let slidesForTitle = 0;
    for (const chunk of chunkNodes(groupNodes, MAX_ITEMS_PER_APPENDIX_PAGE)) {
      if (slides.length >= maxTotalSlides) break;
      if (slidesForTitle >= MAX_APPENDIX_SLIDES_PER_TITLE) break;
      slides.push(
        createMaterializedSlide({
          source,
          title,
          subtitle: `Appendix ${pageNumber}`,
          type: SlideType.APPENDIX,
          nodes: chunk,
          kind: 'appendix',
        }),
      );
      pageNumber += 1;
      slidesForTitle++;
    }
  }

  return slides;
}

function createMaterializedSlide(opts: {
  source?: MaterializedSlide;
  title: string;
  subtitle?: string;
  type: SlideType | string;
  nodes: LedgerNode[];
  kind: 'appendix' | 'continuation';
}): MaterializedSlide {
  const family =
    opts.source?.smartComponent?.family ||
    (opts.source?.content as any)?.smartComponent?.family ||
    opts.source?.themeKey ||
    'investor-minimal';
  const elementTree = buildOverflowElementTree(opts.title, opts.subtitle, opts.nodes, opts.kind);
  return {
    type: opts.type as SlideType,
    order: 0,
    title: opts.title,
    subtitle: opts.subtitle,
    content: {
      materializedOverflow: {
        kind: opts.kind,
        sourceTitle: opts.source?.title || null,
        nodes: opts.nodes,
      },
    },
    layoutKey: opts.source?.layoutKey || 'content_fidelity_overflow',
    themeKey: opts.source?.themeKey,
    speakerNotes: null,
    qualityScore: opts.source?.qualityScore,
    smartComponent: {
      family,
      type: `content-fidelity-${opts.kind}`,
      elementTree,
    },
    metadata: {
      ...((opts.source as any)?.metadata || {}),
      contentFidelityMaterialized: true,
      contentFidelityKind: opts.kind,
      materializedNodeCount: opts.nodes.length,
    },
  };
}

function buildOverflowElementTree(
  title: string,
  subtitle: string | undefined,
  nodes: LedgerNode[],
  kind: 'appendix' | 'continuation',
): SlideElementDTO[] {
  const elements: SlideElementDTO[] = [];
  let id = 0;
  const make = (
    type: SlideElementDTO['type'],
    geo: { x: number; y: number; w: number; h: number; z?: number },
    content: Record<string, any>,
    style: ElementStyle | null,
    name: string,
  ): SlideElementDTO => ({
    id: `content-fidelity-${kind}-${++id}`,
    slideId: '',
    type,
    name,
    order: id,
    x: geo.x,
    y: geo.y,
    width: geo.w,
    height: geo.h,
    rotation: 0,
    zIndex: geo.z ?? id,
    locked: false,
    visible: true,
    content,
    data: null,
    style,
    animations: null,
    accessibility: null,
    createdAt: NOW,
    updatedAt: NOW,
  });

  elements.push(
    make(
      'shape',
      { x: 0, y: 0, w: 100, h: 100, z: -5 },
      { kind: 'rect', fill: '#f8fafc' },
      { fill: '#f8fafc' },
      'Overflow background',
    ),
  );
  elements.push(
    make(
      'label',
      { x: 6, y: 6, w: 46, h: 4 },
      {
        text: kind === 'appendix' ? 'Preserved Appendix Content' : 'Preserved Continuation Content',
      },
      labelStyle,
      'Content fidelity label',
    ),
  );
  elements.push(
    make('heading', { x: 6, y: 12, w: 82, h: 10 }, { text: title }, headingStyle, 'Overflow title'),
  );
  if (subtitle)
    elements.push(
      make(
        'caption',
        { x: 6, y: 23, w: 82, h: 4 },
        { text: subtitle },
        { ...textStyle, fontSize: 10, color: '#64748b' },
        'Overflow subtitle',
      ),
    );
  elements.push(
    make(
      'shape',
      { x: 6, y: 29, w: 88, h: 0.4, z: 1 },
      { kind: 'rect', fill: '#dc2626' },
      { fill: '#dc2626' },
      'Overflow rule',
    ),
  );

  let y = 34;
  nodes.forEach((node, index) => {
    const sourceLabel = `${titleizeSourceType(node.sourceType)} #${node.sourceIndex + 1}`;
    elements.push(
      make(
        'label',
        { x: 7, y, w: 24, h: 3 },
        { text: sourceLabel },
        labelStyle,
        `Overflow source ${index + 1}`,
      ),
    );
    elements.push(
      make(
        'paragraph',
        { x: 7, y: y + 3.6, w: 84, h: 5.8 },
        { text: node.sourceText },
        textStyle,
        `Overflow text ${index + 1}`,
      ),
    );
    y += 10.4;
  });

  elements.push(
    make(
      'caption',
      { x: 6, y: 93, w: 82, h: 4 },
      {
        text: 'Content preserved from original source input. Generated by Pitchonix content fidelity materializer.',
      },
      { ...textStyle, fontSize: 9, color: '#64748b' },
      'Overflow footer',
    ),
  );
  return elements;
}

function appendPreservedSpeakerNotes(existing: string | undefined, nodes: LedgerNode[]): string {
  const grouped = groupBySourceType(nodes);
  const parts = ['Preserved source content:'];
  for (const [sourceType, groupNodes] of grouped) {
    parts.push(`${titleizeSourceType(sourceType)}:`);
    groupNodes.forEach((node) => parts.push(`- [${node.sourceIndex + 1}] ${node.sourceText}`));
  }
  return [existing || '', parts.join('\n')].filter(Boolean).join('\n\n');
}

function markContentFidelityWarning(slide: MaterializedSlide, count: number, reason: string): void {
  slide.metadata = {
    ...(slide.metadata || {}),
    contentFidelityWarning: {
      unmaterializedLedgerItems: count,
      reason,
    },
  };
}

function continuedTitle(title: string): string {
  const cleaned = String(title || 'Slide')
    .replace(/\s*[·\-–—:]?\s*continued(?:\s+\d+)?$/i, '')
    .trim();
  return `${cleaned || 'Slide'} continued`;
}

function groupSubtitle(nodes: LedgerNode[]): string {
  const types = Array.from(new Set(nodes.map((node) => titleizeSourceType(node.sourceType))));
  return types.join(' · ');
}

function groupBySourceType(nodes: LedgerNode[]): Map<string, LedgerNode[]> {
  const grouped = new Map<string, LedgerNode[]>();
  for (const node of nodes) {
    const list = grouped.get(node.sourceType) || [];
    list.push(node);
    grouped.set(node.sourceType, list);
  }
  return grouped;
}

// Groups nodes by their display title (APPENDIX_HEADINGS[sourceType]) so that multiple
// sourceTypes sharing the same heading are consolidated into one group. This prevents
// consecutive slides with identical titles (e.g. 'kpi' + 'fundingAllocation' both produce
// "Additional KPIs" — they must share one group, not generate separate slide runs).
function groupByTitle(nodes: LedgerNode[]): Map<string, LedgerNode[]> {
  const grouped = new Map<string, LedgerNode[]>();
  for (const node of nodes) {
    const title = APPENDIX_HEADINGS[node.sourceType] || titleizeSourceType(node.sourceType);
    const list = grouped.get(title) || [];
    list.push(node);
    grouped.set(title, list);
  }
  return grouped;
}

function chunkNodes<T>(nodes: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < nodes.length; i += size) chunks.push(nodes.slice(i, i + size));
  return chunks;
}

function titleizeSourceType(sourceType: string): string {
  return String(sourceType || 'source')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function cloneSlide(slide: MaterializedSlide): MaterializedSlide {
  return {
    ...slide,
    content: cloneJson(slide.content),
    smartComponent: slide.smartComponent
      ? {
          ...slide.smartComponent,
          elementTree: cloneJson(slide.smartComponent.elementTree),
        }
      : undefined,
    metadata: cloneJson(slide.metadata || {}),
  };
}

function cloneJson<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}
