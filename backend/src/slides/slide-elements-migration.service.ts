import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ElementType } from './element-types';
import { validateSmartComponentTree } from './smart-tree-validator';

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
//
//  Phase 32.75 Tier 5 — Smart Component Rendering Cutover:
//
//  When a slide arrives with `content.smartComponent.elementTree`, the
//  migration service trusts that tree as the canonical render and skips the
//  legacy reconstruction entirely. Invalid or absent trees fall back to the
//  legacy path so existing decks (and unmigrated generators) keep working.
//
//  This makes Smart Components the PRIMARY rendering source. The legacy
//  branches below stay in place as the fallback (T5C — never break
//  generation) and are tagged @deprecated in T5F.
// =============================================================================

const SLIDE_VERSION_AFTER_MIGRATE = 1;

/**
 * Migration telemetry. After Tier 10 the only paths are:
 *   - `smartPath`              — slide had a valid smartComponent tree
 *   - `missingSmartComponent`  — slide had no smartComponent (chrome-only render)
 *   - `invalidTrees`           — slide had a tree that failed validation
 * `fallbackPath` is retained for backwards-compatible accessors but is now
 * always 0; it was the Tier 7 minimal-fallback counter, removed in Tier 10.
 */
export interface MigrationPathMetrics {
  smartPath:              number;
  fallbackPath:           number;
  invalidTrees:           number;
  missingSmartComponent?: number;
  families:               Record<string, number>;
  components:             Record<string, number>;
}

interface MigrationResult {
  totalSlides:      number;
  migratedSlides:   number;
  skippedSlides:    number;
  elementsCreated:  number;
  errors:           Array<{ slideId: string; message: string }>;
  pathMetrics?:     MigrationPathMetrics;
}

@Injectable()
export class SlideElementsMigrationService {
  private readonly logger = new Logger(SlideElementsMigrationService.name);

  /** Per-run path metrics. Reset at the top of `migrateAll`. */
  private pathMetrics: MigrationPathMetrics = {
    smartPath: 0, fallbackPath: 0, invalidTrees: 0,
    missingSmartComponent: 0,
    families: {}, components: {},
  };

  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  //  Public entry points
  // ---------------------------------------------------------------------------

  async migrateAll(opts: { force?: boolean } = {}): Promise<MigrationResult> {
    this.resetPathMetrics();
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

    result.pathMetrics = { ...this.pathMetrics };
    this.logger.log(
      `Migration: ${result.migratedSlides}/${result.totalSlides} migrated ` +
      `(${result.elementsCreated} elements created, ${result.skippedSlides} skipped, ` +
      `${result.errors.length} errors)`,
    );
    const total = this.pathMetrics.smartPath + this.pathMetrics.fallbackPath;
    if (total > 0) {
      const smartPct = (this.pathMetrics.smartPath / total) * 100;
      this.logger.log(
        `Tier 5 path metrics: ${this.pathMetrics.smartPath} smart / ${this.pathMetrics.fallbackPath} fallback ` +
        `(${smartPct.toFixed(1)}% smart, ${this.pathMetrics.invalidTrees} invalid trees rejected)`,
      );
    }
    return result;
  }

  /** Public accessor for tests/scripts (T5E). */
  getPathMetrics(): MigrationPathMetrics {
    return { ...this.pathMetrics, families: { ...this.pathMetrics.families }, components: { ...this.pathMetrics.components } };
  }

  resetPathMetrics(): void {
    this.pathMetrics = {
      smartPath: 0, fallbackPath: 0, invalidTrees: 0,
      missingSmartComponent: 0,
      families: {}, components: {},
    };
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
  //
  //  Phase 32.75 Tier 5 — Smart Component first. When the slide's content
  //  carries a valid `smartComponent.elementTree`, we materialise *that*
  //  directly and return. Every legacy branch below the smart-first early
  //  return is now a FALLBACK and tagged @deprecated for T5F removal.
  //
  //  `public` so the Tier 5 validation script can drive it without spinning
  //  up Prisma. The instance state used by the helper methods (logger,
  //  pathMetrics) is benign in test contexts.
  // ---------------------------------------------------------------------------

  public buildElementsForSlide(slide: {
    type: string; title: string; subtitle: string | null;
    content: Prisma.JsonValue; speakerNotes: string | null;
  }): Array<Prisma.SlideElementCreateManyInput> {
    const c = (slide.content || {}) as Record<string, any>;
    const smart = c.smartComponent;

    // ── Phase 32.75 Tier 10 — Smart Component is the SOLE rendering path ──
    // The Tier 7 minimal fallback (chrome + body + bullets) was deleted
    // after the Tier 9 matrix verified 720/720 slides hit the smart path
    // with 0 fallback hits. Slides arriving without a valid smart-component
    // payload now get slide chrome only, plus a structured error placeholder
    // so the developer sees the problem instead of silent rendering. Raw
    // imports must be converted to smart components before reaching here.

    if (smart && smart.elementTree) {
      const validation = validateSmartComponentTree(smart.elementTree);
      if (validation.valid) {
        const built = this.materializeSmartTree(smart);
        if (built.length > 0) {
          this.recordSmartPath(smart);
          const chrome = this.buildSlideChrome(slide);
          return [...chrome, ...built] as Array<Prisma.SlideElementCreateManyInput>;
        }
      } else {
        this.pathMetrics.invalidTrees += 1;
        this.logger.error(
          `Slide ${slide.type}: smartComponent tree is invalid (${validation.reason}). ` +
          `Slide will render with chrome only. Fix the generator or repair the slide content.`,
        );
      }
    } else {
      this.pathMetrics.missingSmartComponent = (this.pathMetrics.missingSmartComponent ?? 0) + 1;
      this.logger.error(
        `Slide ${slide.type}: missing smartComponent.elementTree. ` +
        `Legacy slide content is no longer renderable directly — convert to a smart component first. ` +
        `Slide will render with chrome only.`,
      );
    }

    // Chrome-only fallback. No body reconstruction, no bullet extraction.
    return this.buildSlideChrome(slide) as Array<Prisma.SlideElementCreateManyInput>;
  }

  // ---------------------------------------------------------------------------
  //  Phase 32.75 Tier 5 — Smart Component materialisation
  // ---------------------------------------------------------------------------

  /** Convert a (validated) smart-component element tree into Prisma create inputs. */
  private materializeSmartTree(smart: { family?: string; type?: string; elementTree: any[] }): Array<Omit<Prisma.SlideElementCreateManyInput, 'slideId'>> {
    return (smart.elementTree as any[]).map((e, i): Omit<Prisma.SlideElementCreateManyInput, 'slideId'> => ({
      type:        e.type as ElementType,
      name:        e.name ?? null,
      // Title chrome occupies order 0..1, so smart-tree starts at 100 to keep
      // headings ordered above body elements without colliding.
      order:       100 + i,
      zIndex:      typeof e.zIndex === 'number' ? e.zIndex : (100 + i),
      x:           e.x, y: e.y, width: e.width, height: e.height,
      rotation:    typeof e.rotation === 'number' ? e.rotation : 0,
      locked:      !!e.locked,
      visible:     e.visible !== false,
      content:     e.content ?? null,
      data:        e.data ?? null,
      style:       e.style ?? null,
      animations:  e.animations ?? null,
      accessibility: e.accessibility ?? null,
    }));
  }

  /** Slide chrome (title + subtitle + footer + page number) is independent of
   *  the smart body tree. Same defaults the legacy branch uses, hoisted into
   *  a small helper. */
  private buildSlideChrome(slide: { title: string; subtitle: string | null }): Array<Omit<Prisma.SlideElementCreateManyInput, 'slideId'>> {
    const chrome: Array<Omit<Prisma.SlideElementCreateManyInput, 'slideId'>> = [];
    if (slide.title) {
      chrome.push({
        type: 'heading', name: 'Title',
        order: 0, zIndex: 1,
        x: 6, y: 8, width: 88, height: 14,
        rotation: 0, locked: false, visible: true,
        content: { text: slide.title }, data: null, style: null,
        animations: null, accessibility: null,
      });
    }
    if (slide.subtitle) {
      chrome.push({
        type: 'subheading', name: 'Subtitle',
        order: 1, zIndex: 2,
        x: 6, y: 22, width: 88, height: 8,
        rotation: 0, locked: false, visible: true,
        content: { text: slide.subtitle }, data: null, style: null,
        animations: null, accessibility: null,
      });
    }
    chrome.push({
      type: 'footer', name: 'Footer',
      order: 9998, zIndex: 9998,
      x: 6, y: 94, width: 70, height: 4,
      rotation: 0, locked: false, visible: true,
      content: { text: '' }, data: null, style: null,
      animations: null, accessibility: null,
    });
    chrome.push({
      type: 'pageNumber', name: 'Page #',
      order: 9999, zIndex: 9999,
      x: 88, y: 94, width: 8, height: 4,
      rotation: 0, locked: false, visible: true,
      content: { format: 'numeric' }, data: null, style: null,
      animations: null, accessibility: null,
    });
    return chrome;
  }

  private recordSmartPath(smart: { family?: string; type?: string }) {
    this.pathMetrics.smartPath += 1;
    if (smart.family) {
      this.pathMetrics.families[smart.family] = (this.pathMetrics.families[smart.family] || 0) + 1;
    }
    if (smart.type) {
      this.pathMetrics.components[smart.type] = (this.pathMetrics.components[smart.type] || 0) + 1;
    }
  }

}

// Phase 32.75 Tier 10 — `pickFirst` + `pickFirstArray` deleted along with
// the minimal fallback they fed. The service is now smart-component-only.
