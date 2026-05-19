import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ElementType } from './element-types';

// =============================================================================
//  SlideElementsMigrationService
//
//  Walks every Slide.content JSON blob in the database and materializes it
//  into typed SlideElement rows. Properties:
//    - IDEMPOTENT     — re-running is safe; slides already at elementsVersion>=1
//                       are skipped.
//    - LOSSLESS       — Slide.content is preserved untouched. The element
//                       rows are derived; if the migration ever needs to be
//                       redone we can clear elements and re-run.
//    - DEFAULT-LAYOUT — every slide gets sensible default positions; layout
//                       refinement happens later (Phase 5+).
// =============================================================================

const SLIDE_VERSION_AFTER_MIGRATE = 1;

interface MigrationResult {
  totalSlides:      number;
  migratedSlides:   number;
  skippedSlides:    number;
  elementsCreated:  number;
  errors:           Array<{ slideId: string; message: string }>;
}

@Injectable()
export class SlideElementsMigrationService {
  private readonly logger = new Logger(SlideElementsMigrationService.name);

  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  //  Public entry points
  // ---------------------------------------------------------------------------

  async migrateAll(opts: { force?: boolean } = {}): Promise<MigrationResult> {
    const slides = await this.prisma.slide.findMany({
      where: opts.force ? {} : { elementsVersion: { lt: SLIDE_VERSION_AFTER_MIGRATE } },
      orderBy: [{ deckId: 'asc' }, { order: 'asc' }],
    });

    const result: MigrationResult = {
      totalSlides: slides.length, migratedSlides: 0, skippedSlides: 0,
      elementsCreated: 0, errors: [],
    };

    for (const slide of slides) {
      try {
        const created = await this.migrateOne(slide.id, { force: !!opts.force });
        if (created === null) result.skippedSlides++;
        else { result.migratedSlides++; result.elementsCreated += created; }
      } catch (err) {
        result.errors.push({ slideId: slide.id, message: (err as Error).message });
      }
    }

    this.logger.log(
      `Migration: ${result.migratedSlides}/${result.totalSlides} migrated ` +
      `(${result.elementsCreated} elements created, ${result.skippedSlides} skipped, ` +
      `${result.errors.length} errors)`,
    );
    return result;
  }

  /**
   * Migrate a single slide. Returns the number of elements created, or null
   * if the slide was already migrated and `force` was not set.
   */
  async migrateOne(slideId: string, opts: { force?: boolean } = {}): Promise<number | null> {
    const slide = await this.prisma.slide.findUnique({ where: { id: slideId } });
    if (!slide) throw new Error(`Slide ${slideId} not found`);

    if (!opts.force && slide.elementsVersion >= SLIDE_VERSION_AFTER_MIGRATE) {
      return null;
    }

    const elements = this.buildElementsForSlide(slide);

    // Atomic per-slide replacement: delete existing + insert new + bump version.
    await this.prisma.$transaction(async (tx) => {
      if (opts.force) {
        await tx.slideElement.deleteMany({ where: { slideId: slide.id } });
      }
      if (elements.length > 0) {
        await tx.slideElement.createMany({
          data: elements.map((e) => ({ ...e, slideId: slide.id })),
        });
      }
      await tx.slide.update({
        where: { id: slide.id },
        data:  { elementsVersion: SLIDE_VERSION_AFTER_MIGRATE },
      });
    });

    return elements.length;
  }

  // ---------------------------------------------------------------------------
  //  Element extraction — derives typed elements from a slide's content blob
  // ---------------------------------------------------------------------------

  private buildElementsForSlide(slide: {
    type: string; title: string; subtitle: string | null;
    content: Prisma.JsonValue; speakerNotes: string | null;
  }): Array<Prisma.SlideElementCreateManyInput> {
    const c = (slide.content || {}) as Record<string, any>;
    const elements: Array<Omit<Prisma.SlideElementCreateManyInput, 'slideId'>> = [];

    let order = 0;
    let zIndex = 1;
    const push = (
      type: ElementType,
      box: { x: number; y: number; width: number; height: number },
      content: any,
      extra: Partial<Prisma.SlideElementCreateManyInput> = {},
    ) => {
      elements.push({
        type, name: extra.name ?? null,
        order: order++, zIndex: zIndex++,
        x: box.x, y: box.y, width: box.width, height: box.height,
        rotation: 0, locked: false, visible: true,
        content: content ?? null,
        data: extra.data ?? null,
        style: extra.style ?? null,
        animations: null, accessibility: null,
      });
    };

    // ── Title (always) ────────────────────────────────────────────────────
    if (slide.title) {
      push('heading', { x: 6, y: 8, width: 88, height: 14 },
        { text: slide.title }, { name: 'Title' });
    }

    // ── Subtitle (if present) ─────────────────────────────────────────────
    if (slide.subtitle) {
      push('subheading', { x: 6, y: 22, width: 88, height: 8 },
        { text: slide.subtitle }, { name: 'Subtitle' });
    }

    // Track running y-position for the body region
    let bodyY = slide.subtitle ? 32 : 24;

    // ── Body paragraph(s) ─────────────────────────────────────────────────
    const bodyText = pickFirst(c, ['body', 'text', 'description', 'paragraph', 'summary']);
    if (typeof bodyText === 'string' && bodyText.trim()) {
      push('paragraph', { x: 6, y: bodyY, width: 88, height: 18 },
        { text: bodyText }, { name: 'Body' });
      bodyY += 20;
    }

    // ── Bullet list ───────────────────────────────────────────────────────
    const bullets = pickFirstArray(c, ['bullets', 'points', 'highlights', 'features']);
    if (bullets && bullets.length > 0) {
      push('bulletList', { x: 6, y: bodyY, width: 88, height: Math.min(45, 6 * bullets.length + 6) },
        { items: bullets.map((t, i) => ({ id: `item-${i + 1}`, text: String(t) })) },
        { name: 'Bullet List' });
      bodyY += Math.min(45, 6 * bullets.length + 6) + 2;
    }

    // ── Metrics ───────────────────────────────────────────────────────────
    const metrics = pickFirstArray(c, ['metrics', 'kpis', 'stats', 'numbers']);
    if (metrics && metrics.length > 0) {
      const colW = 88 / Math.min(metrics.length, 4);
      metrics.slice(0, 4).forEach((m: any, i: number) => {
        push('metric',
          { x: 6 + (i * colW), y: bodyY, width: colW - 2, height: 14 },
          { value: String(m.value ?? m.number ?? ''), label: String(m.label ?? m.name ?? ''), unit: m.unit, delta: m.delta, deltaDirection: m.deltaDirection },
          { name: `Metric ${i + 1}` });
      });
      bodyY += 16;
    }

    // ── Charts ────────────────────────────────────────────────────────────
    const charts = pickFirstArray(c, ['charts', 'visualizations']);
    if (charts && charts.length > 0) {
      charts.slice(0, 2).forEach((ch: any, i: number) => {
        const w = charts.length === 1 ? 88 : 43;
        const x = charts.length === 1 ? 6 : 6 + i * 45;
        push('chart',
          { x, y: bodyY, width: w, height: 30 },
          this.normalizeChart(ch),
          { name: ch.title || `Chart ${i + 1}` });
      });
      bodyY += 32;
    }

    // ── Hero / inline image ───────────────────────────────────────────────
    const imageUrl = pickFirst(c, ['heroImage', 'image', 'imageUrl']);
    if (typeof imageUrl === 'string' && imageUrl.trim()) {
      push('image', { x: 50, y: 24, width: 44, height: 60 },
        { src: imageUrl, fit: 'cover' }, { name: 'Image' });
    }

    // ── Quote / testimonial ───────────────────────────────────────────────
    const quote = pickFirst(c, ['quote']);
    if (typeof quote === 'string' && quote.trim()) {
      push('quote', { x: 6, y: bodyY, width: 88, height: 18 },
        { text: quote, attribution: pickFirst(c, ['quoteAttribution', 'author']) },
        { name: 'Quote' });
      bodyY += 20;
    }
    if (c.testimonial && typeof c.testimonial === 'object') {
      const t = c.testimonial;
      push('testimonial', { x: 6, y: bodyY, width: 88, height: 22 },
        { quote: t.quote || '', author: t.author || '', role: t.role, company: t.company, avatarUrl: t.avatarUrl },
        { name: 'Testimonial' });
      bodyY += 24;
    }

    // ── Timeline / roadmap ────────────────────────────────────────────────
    const timeline = pickFirstArray(c, ['timeline', 'milestones', 'phases']);
    if (timeline && timeline.length > 0 && slide.type === 'roadmap') {
      push('roadmap', { x: 6, y: bodyY, width: 88, height: 32 },
        { phases: timeline.map((p: any, i: number) => ({
            id: `phase-${i + 1}`,
            phase: p.phase || p.title || `Phase ${i + 1}`,
            period: p.period || p.date,
            bullets: Array.isArray(p.bullets) ? p.bullets : (p.description ? [p.description] : []),
          })) },
        { name: 'Roadmap' });
      bodyY += 34;
    } else if (timeline && timeline.length > 0) {
      push('timeline', { x: 6, y: bodyY, width: 88, height: 28 },
        { items: timeline.map((it: any, i: number) => ({
            id: `tl-${i + 1}`,
            date: it.date || it.period,
            title: it.title || it.milestone || `Item ${i + 1}`,
            description: it.description,
          })) },
        { name: 'Timeline' });
      bodyY += 30;
    }

    // ── Team (slide.type === 'team') ──────────────────────────────────────
    const team = pickFirstArray(c, ['team', 'members']);
    if (team && team.length > 0 && (slide.type === 'team' || slide.type === 'team_introduction')) {
      push('teamCard', { x: 6, y: bodyY, width: 88, height: 40 },
        { members: team.map((m: any, i: number) => ({
            id: `m-${i + 1}`,
            name: m.name || `Member ${i + 1}`,
            role: m.role || m.title,
            bio: m.bio,
            photoUrl: m.photoUrl || m.avatar,
            linkedin: m.linkedin,
          })) },
        { name: 'Team' });
      bodyY += 42;
    }

    // ── Pricing ───────────────────────────────────────────────────────────
    const pricing = pickFirstArray(c, ['pricingTiers', 'plans', 'tiers']);
    if (pricing && pricing.length > 0) {
      push('pricingCard', { x: 6, y: bodyY, width: 88, height: 40 },
        { tiers: pricing.map((t: any, i: number) => ({
            id: `tier-${i + 1}`,
            name: t.name || `Tier ${i + 1}`,
            price: t.price || '',
            period: t.period,
            features: Array.isArray(t.features) ? t.features : [],
            highlight: !!t.highlight,
            ctaText: t.ctaText,
          })) },
        { name: 'Pricing' });
      bodyY += 42;
    }

    // ── SWOT ──────────────────────────────────────────────────────────────
    if (c.swot || slide.type === 'swot') {
      const s = c.swot || c;
      push('swot', { x: 6, y: bodyY, width: 88, height: 40 },
        { strengths: arr(s.strengths), weaknesses: arr(s.weaknesses),
          opportunities: arr(s.opportunities), threats: arr(s.threats) },
        { name: 'SWOT' });
      bodyY += 42;
    }

    // ── Comparison table ──────────────────────────────────────────────────
    if (c.comparison && typeof c.comparison === 'object') {
      const cm = c.comparison;
      push('comparison', { x: 6, y: bodyY, width: 88, height: 32 },
        { columns: arr(cm.columns), rows: arr(cm.rows).map((r: any) => ({ feature: r.feature || '', values: arr(r.values) })) },
        { name: 'Comparison' });
      bodyY += 34;
    }

    // ── Generic table ─────────────────────────────────────────────────────
    if (c.table && typeof c.table === 'object' && (Array.isArray(c.table.rows) || Array.isArray(c.table.headers))) {
      push('table', { x: 6, y: bodyY, width: 88, height: 30 },
        this.normalizeTable(c.table),
        { name: 'Table' });
      bodyY += 32;
    }

    // ── CTA (closing/contact slides) ──────────────────────────────────────
    const ctaText = pickFirst(c, ['cta', 'ctaText', 'callToAction']);
    if (typeof ctaText === 'string' && ctaText.trim()) {
      push('cta', { x: 30, y: bodyY, width: 40, height: 8 },
        { text: ctaText, href: pickFirst(c, ['ctaHref', 'ctaUrl']) || undefined, variant: 'primary' },
        { name: 'CTA' });
      bodyY += 10;
    }

    // ── Contact info (closing slide) ──────────────────────────────────────
    if (c.contact && typeof c.contact === 'object') {
      const lines = [c.contact.company, c.contact.website, c.contact.email, c.contact.phone]
        .filter(Boolean).join(' · ');
      if (lines) {
        push('paragraph', { x: 6, y: bodyY, width: 88, height: 8 },
          { text: lines }, { name: 'Contact' });
        bodyY += 10;
      }
    }

    // ── Footer / page number (universal, always last) ─────────────────────
    push('footer', { x: 6, y: 94, width: 70, height: 4 },
      { text: '' }, { name: 'Footer' });
    push('pageNumber', { x: 88, y: 94, width: 8, height: 4 },
      { format: 'numeric' }, { name: 'Page #' });

    return elements as Array<Prisma.SlideElementCreateManyInput>;
  }

  // ---------------------------------------------------------------------------
  //  Helpers to normalize legacy shapes
  // ---------------------------------------------------------------------------

  private normalizeChart(raw: any) {
    const kind = (raw.type || 'bar').toLowerCase();
    const data: any[] = Array.isArray(raw.data) ? raw.data : [];
    const categories = data.map((d) => String(d.label ?? ''));
    const series = [{
      name: raw.seriesName || raw.title || 'Series 1',
      values: data.map((d) => Number(d.value) || 0),
      color: raw.color,
    }];
    return {
      type: ['bar', 'line', 'pie', 'donut', 'area', 'kpi', 'comparison'].includes(kind) ? kind : 'bar',
      title: raw.title,
      categories,
      series,
      axes: raw.axes,
      legend: raw.legend ?? { visible: true, position: 'bottom' },
    };
  }

  private normalizeTable(raw: any) {
    const headers = (Array.isArray(raw.headers) ? raw.headers : []).map((h: any) => ({
      text: typeof h === 'string' ? h : (h?.text ?? ''),
      align: h?.align, bold: h?.bold ?? true,
    }));
    const rows = (Array.isArray(raw.rows) ? raw.rows : []).map((r: any) =>
      (Array.isArray(r) ? r : (r.cells || [])).map((c: any) => ({
        text: typeof c === 'string' ? c : (c?.text ?? ''),
        align: c?.align, bold: c?.bold, fill: c?.fill, color: c?.color,
      })),
    );
    return { headers, rows, borders: raw.borders, zebra: !!raw.zebra };
  }
}

// =============================================================================
//  Small utilities
// =============================================================================

function pickFirst(obj: Record<string, any>, keys: string[]): any {
  for (const k of keys) if (obj[k] != null) return obj[k];
  return undefined;
}

function pickFirstArray(obj: Record<string, any>, keys: string[]): any[] | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (Array.isArray(v) && v.length > 0) return v;
  }
  return undefined;
}

function arr(v: any): string[] {
  return Array.isArray(v) ? v.map((x) => String(x)) : [];
}
