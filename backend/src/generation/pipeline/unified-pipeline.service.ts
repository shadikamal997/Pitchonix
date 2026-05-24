// =============================================================================
//  UnifiedGenerationPipeline — Phase 31
//
//  Single execution path for every generation-related action: GENERATE,
//  REGENERATE, REFRESH, REBUILD, FAMILY_SWITCH, TEMPLATE_SWITCH,
//  WIZARD_UPDATE, STRUCTURED_UPDATE. All of them route here via
//  `pipeline.execute(command)`. Stages run in deterministic order, each
//  stage's timing + outcome is recorded for telemetry, and structured
//  failures surface through PipelineError + the event bus.
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SlideFactory } from '../slide-types/slide.factory';
import { SlidesService } from '../../slides/slides.service';
import { SlideElementsMigrationService } from '../../slides/slide-elements-migration.service';
import { AutoExpansionService, DocumentScorecardService } from '../document-quality';
import { DecksService } from '../../decks/decks.service';
import { AIEnhancementService } from '../ai-enhancement.service';
import { VersionHistoryService } from '../../version-history/version-history.service';
import type { DeckVersionType } from '../../version-history/version-types';
import { GenerationEventBus } from './event-bus';
import {
  GenerationCommand, GenerationContext, GenerationCommandType,
  PipelineResult, PipelineStage, PipelineError, STAGES_FOR_COMMAND,
} from './types';
import type { WizardInput } from '../slide-types/types';
import type { SmartFamilyId } from '../../components/smart/smart-types';

@Injectable()
export class UnifiedGenerationPipeline {
  private readonly logger = new Logger(UnifiedGenerationPipeline.name);

  constructor(
    private prisma: PrismaService,
    private slideFactory: SlideFactory,
    private slidesService: SlidesService,
    private migrationService: SlideElementsMigrationService,
    private autoExpansion: AutoExpansionService,
    private scorecardService: DocumentScorecardService,
    private decksService: DecksService,
    private aiEnhancement: AIEnhancementService,
    private versions: VersionHistoryService,
    private bus: GenerationEventBus,
  ) {}

  // ---------------------------------------------------------------------------
  //  Public entry point
  // ---------------------------------------------------------------------------

  async execute(command: GenerationCommand): Promise<PipelineResult> {
    const t0 = Date.now();
    const ctx: GenerationContext = { command };
    const stages: PipelineResult['stages'] = [];
    const stageList = STAGES_FOR_COMMAND[command.type];

    // Phase 35K — auto-snapshot BEFORE destructive commands when an existing
    // deck is in play. Safety snapshot makes every generation reversible.
    if (command.deckId && shouldSnapshotBefore(command.type)) {
      try {
        await this.versions.createSnapshot(command.deckId, {
          type: 'SAFETY',
          name: `Before ${command.type.toLowerCase().replace(/_/g, ' ')}`,
        });
      } catch (err) {
        // Don't fail the pipeline if snapshotting fails; just log.
        this.logger.warn(`Pre-pipeline snapshot failed for deck ${command.deckId}: ${(err as Error).message}`);
      }
    }

    this.bus.emit('generation.started', { command, stages: stageList });

    for (const stage of stageList) {
      const tStage = Date.now();
      this.bus.emit('stage.started', { stage, command: command.type });
      try {
        await this.runStage(stage, ctx);
        const ms = Date.now() - tStage;
        stages.push({ stage, ok: true, ms });
        this.bus.emit('stage.completed', { stage, ms, command: command.type });
      } catch (err) {
        const ms = Date.now() - tStage;
        const reason = err instanceof PipelineError ? err.reason : (err as Error).message || String(err);
        stages.push({ stage, ok: false, ms, message: reason });
        this.bus.emit('generation.failed', { command, stage, reason });
        this.logger.error(`Pipeline failure at stage ${stage}: ${reason}`);
        return {
          ok: false,
          command: command.type,
          durationMs: Date.now() - t0,
          stages,
          context: ctx,
          error: { stage, reason },
        };
      }
    }

    const durationMs = Date.now() - t0;

    // Phase 35K — post-success snapshot tagged with the command-specific
    // version type so the timeline reads naturally
    //   GENERATE      → "Generated"
    //   REGENERATE    → "Regenerated"
    //   FAMILY_SWITCH → "Family change"
    //   TEMPLATE_SWITCH → "Template change"
    //   REBUILD       → "Regenerated"
    if (ctx.deckId && shouldSnapshotAfter(command.type)) {
      try {
        await this.versions.createSnapshot(ctx.deckId, {
          type: postSnapshotType(command.type),
        });
      } catch (err) {
        this.logger.warn(`Post-pipeline snapshot failed for deck ${ctx.deckId}: ${(err as Error).message}`);
      }
    }

    this.bus.emit('generation.completed', { command, durationMs, metrics: ctx.metrics });
    return { ok: true, command: command.type, durationMs, stages, context: ctx };
  }

  // ---------------------------------------------------------------------------
  //  Stage dispatch
  // ---------------------------------------------------------------------------
  private async runStage(stage: PipelineStage, ctx: GenerationContext): Promise<void> {
    switch (stage) {
      case 'load-context':              return this.stageLoadContext(ctx);
      case 'validate-input':            return this.stageValidateInput(ctx);
      case 'build-context':             return this.stageBuildContext(ctx);
      case 'slide-planning':            return this.stageSlidePlanning(ctx);
      case 'generator-execution':       return this.stageGeneratorExecution(ctx);
      case 'enhancement':               return this.stageEnhancement(ctx);
      case 'smart-component-attachment':return this.stageSmartComponentAttachment(ctx);
      case 'quality-analysis':          return this.stageQualityAnalysis(ctx);
      case 'migration':                 return this.stageMigration(ctx);
      case 'persistence':               return this.stagePersistence(ctx);
      case 'post-processing':           return this.stagePostProcessing(ctx);
    }
  }

  // ---------------------------------------------------------------------------
  //  Stage implementations
  // ---------------------------------------------------------------------------

  /** Stage 1 — resolve project, deck, businessInfo. */
  private async stageLoadContext(ctx: GenerationContext): Promise<void> {
    const { command } = ctx;
    if (!command.projectId) {
      throw new PipelineError('load-context', 'projectId is required for every non-GENERATE command');
    }
    const project = await this.prisma.project.findUnique({
      where: { id: command.projectId },
      include: { decks: { include: { slides: { select: { id: true } } } } },
    });
    if (!project) {
      throw new PipelineError('load-context', `project ${command.projectId} not found`, { projectId: command.projectId });
    }
    ctx.projectId = project.id;
    const businessInfo = (project.businessInfo as any) || {};
    ctx.wizardInput = {
      documentType: businessInfo.documentType || 'pitch_deck',
      companyName:  businessInfo.companyName  || project.name || 'My Company',
      industry:     businessInfo.industry     || 'Technology',
      ...businessInfo,
      ...(command.wizardInput || {}),
    } as WizardInput;

    // Family resolution: command override wins, else stored on deck.metadata.familyId,
    // else inferred later by the smart adapter.
    if (command.familyId) ctx.familyId = command.familyId;

    // Pick target deck (REFRESH / FAMILY_SWITCH / TEMPLATE_SWITCH need an explicit one)
    if (command.deckId) {
      ctx.deckId = command.deckId;
    } else {
      // Reuse an empty deck or create a new one (REGENERATE / REBUILD)
      let deck: any = project.decks.find((d) => d.slides.length === 0);
      if (!deck) {
        deck = await this.decksService.create(project.id, {
          title: `${ctx.wizardInput.companyName} ${formatDocumentType(ctx.wizardInput.documentType)}`,
          description: 'AI-generated presentation',
        });
      }
      if (!deck) throw new PipelineError('load-context', 'Failed to acquire a target deck');
      ctx.deckId = deck.id;
    }

    // Apply template / family side-effects right here so downstream stages see them.
    if (command.type === 'FAMILY_SWITCH' && command.familyId) {
      await this.prisma.project.update({
        where: { id: project.id },
        data:  { businessInfo: { ...businessInfo, theme: command.familyId } as any },
      });
      ctx.wizardInput.theme = command.familyId;
      this.bus.emit('family.changed', { projectId: project.id, deckId: ctx.deckId, familyId: command.familyId });
    }
    if (command.type === 'TEMPLATE_SWITCH' && command.templateId) {
      await this.prisma.deck.update({ where: { id: ctx.deckId }, data: { templateId: command.templateId } });
      ctx.templateId = command.templateId;
      this.bus.emit('template.changed', { deckId: ctx.deckId, templateId: command.templateId });
    }
    if (command.type === 'WIZARD_UPDATE' || command.type === 'STRUCTURED_UPDATE') {
      await this.prisma.project.update({
        where: { id: project.id },
        data:  { businessInfo: { ...businessInfo, ...(command.wizardInput || {}) } as any },
      });
    }
  }

  /** Stage 2 — minimal validation; reject obviously broken inputs. */
  private async stageValidateInput(ctx: GenerationContext): Promise<void> {
    const input = ctx.wizardInput;
    if (!input) throw new PipelineError('validate-input', 'wizardInput missing');
    if (!input.documentType) throw new PipelineError('validate-input', 'documentType required');
    if (!input.companyName || !input.companyName.trim()) {
      throw new PipelineError('validate-input', 'companyName required', { companyName: input.companyName });
    }
    // Set sensible defaults
    input.slideCount = input.slideCount || 18;
    input.contentDepth = input.contentDepth || 'balanced';
    input.includeCharts = input.includeCharts !== false;
    input.includeFinancials = input.includeFinancials === true;
    input.includeSpeakerNotes = input.includeSpeakerNotes !== false;
    input.includeExecutiveSummary = input.includeExecutiveSummary === true;
    input.theme = input.theme || ctx.familyId || (input as any).family || 'investor-minimal';
    input.brandColors = input.brandColors || { primary: '#16a34a', secondary: '#0ea5e9', accent: '#a855f7' };
    input.fontStyle = input.fontStyle || 'inter';
    input.visualStyle = input.visualStyle || 'data_heavy';
    input.audience = input.audience || 'Investors';
    input.tone = input.tone || 'professional';
    input.problem = input.problem || '';
    input.solution = input.solution || '';
  }

  /** Stage 3 — already done by stages 1+2; nothing extra needed here. The
   *  pipeline keeps the named stage so telemetry breakdowns stay aligned
   *  with the spec. */
  private async stageBuildContext(_ctx: GenerationContext): Promise<void> {
    // No-op; context was assembled in load-context + validate-input.
  }

  /** Stage 4 — framework expansion (Phase 30I). */
  private async stageSlidePlanning(ctx: GenerationContext): Promise<void> {
    const expansion = this.autoExpansion.expand(ctx.wizardInput!);
    (ctx as any).promotions = expansion.promotions;
  }

  /** Stage 5 — run the 18 generators. Smart-component attachment happens
   *  inside BaseSlideGenerator.generate() (Phase 32.75 Tier 4 hook), so
   *  Stage 6 below is just a verification + telemetry step. */
  private async stageGeneratorExecution(ctx: GenerationContext): Promise<void> {
    const promotions = (ctx as any).promotions || [];
    const slides = this.slideFactory.generateDeck(ctx.wizardInput!, promotions);
    if (!slides || slides.length === 0) {
      throw new PipelineError('generator-execution', 'SlideFactory produced 0 slides', { promotions });
    }
    ctx.slides = slides;
    this.bus.emit('slides.generated', { count: slides.length, deckId: ctx.deckId });
  }

  /**
   * Stage 5.5 — optional AI enhancement (Phase 31.5). Runs the existing
   * AIEnhancementService over the generated slides when the caller opts in
   * via `options.useEnhancement`. Skipped otherwise.
   *
   * This stage preserves the queue path's prior behaviour: when the user
   * (or background job) sets `useAI`, AI enhancement runs after generators
   * and before smart-component verification + quality scoring.
   */
  private async stageEnhancement(ctx: GenerationContext): Promise<void> {
    if (!ctx.command.options?.useEnhancement) return;
    if (!ctx.slides || ctx.slides.length === 0) return;
    if (!this.aiEnhancement.isAvailable?.()) {
      this.logger.warn('Enhancement requested but AIEnhancementService is not available; skipping.');
      return;
    }
    try {
      ctx.slides = await this.aiEnhancement.enhanceDeck(ctx.slides, ctx.wizardInput!);
    } catch (err) {
      this.logger.warn(`AI enhancement failed: ${(err as Error).message}; continuing with base content`);
    }
  }

  /** Stage 6 — verify smartComponent was attached by the generators. */
  private async stageSmartComponentAttachment(ctx: GenerationContext): Promise<void> {
    const slides = ctx.slides || [];
    const attached = slides.filter((s) => s.smartComponent && s.smartComponent.elementTree?.length).length;
    ctx.metrics = {
      slidesGenerated: slides.length,
      smartComponentsAttached: attached,
      elementsCreated: 0,
      qualityScore: 0,
    };
    this.bus.emit('components.generated', { attached, total: slides.length });
  }

  /** Stage 7 — scorecard. */
  private async stageQualityAnalysis(ctx: GenerationContext): Promise<void> {
    // For REFRESH we don't have ctx.slides; reload from DB.
    if (!ctx.slides && ctx.deckId) {
      const dbSlides = await this.prisma.slide.findMany({
        where: { deckId: ctx.deckId },
        orderBy: { order: 'asc' },
      });
      ctx.slides = dbSlides.map((s: any) => ({
        type: s.type, order: s.order, title: s.title, subtitle: s.subtitle,
        content: s.content || {},
        smartComponent: (s.content as any)?.smartComponent,
      })) as any;
    }
    const score = this.scorecardService.build(ctx.wizardInput!, ctx.slides || []);
    ctx.metrics = { ...(ctx.metrics || { slidesGenerated: 0, smartComponentsAttached: 0, elementsCreated: 0, qualityScore: 0 }), qualityScore: (score as any)?.total ?? 0 };
    this.bus.emit('quality.completed', { deckId: ctx.deckId, score });
  }

  /** Stage 8 — DB persistence + smart-component-driven element materialisation. */
  private async stageMigration(ctx: GenerationContext): Promise<void> {
    if (!ctx.slides || ctx.slides.length === 0) return; // REFRESH has nothing to migrate
    if (!ctx.deckId) throw new PipelineError('migration', 'deckId missing');

    // Persist SlideContent rows first, then migrate each into SlideElement rows.
    const baseSlides = ctx.slides.map((s: any, i: number) => ({
      type:         s.type,
      order:        i,
      title:        s.title || '',
      subtitle:     s.subtitle,
      // Carry smartComponent inside content JSON so the migration service
      // sees it (matches the persisted shape).
      content:      { ...(s.content || {}), smartComponent: s.smartComponent },
      speakerNotes: s.speakerNotes,
    }));

    // FAMILY_SWITCH / TEMPLATE_SWITCH / REGENERATE / REBUILD all start with
    // a clean deck — wipe and rewrite. GENERATE uses an empty deck already.
    await this.prisma.slide.deleteMany({ where: { deckId: ctx.deckId } });
    await this.slidesService.createMany(ctx.deckId, baseSlides as any);

    // Materialise SlideElement rows for each slide.
    const persisted = await this.prisma.slide.findMany({
      where: { deckId: ctx.deckId },
      orderBy: { order: 'asc' },
      select: { id: true },
    });
    ctx.persistedSlideIds = persisted.map((s) => s.id);
    let elementsCreated = 0;
    for (const s of persisted) {
      try {
        const n = await this.migrationService.migrateOne(s.id, { force: !!ctx.command.options?.forceMigrate });
        if (typeof n === 'number') elementsCreated += n;
      } catch (err) {
        this.logger.warn(`migration failed for slide ${s.id}: ${(err as Error).message}`);
      }
    }
    if (ctx.metrics) ctx.metrics.elementsCreated = elementsCreated;
  }

  /** Stage 9 — already done inside migration for this codebase. Kept as a
   *  named stage so telemetry can split DB persist from element-row migrate
   *  later if the two are decoupled. */
  private async stagePersistence(_ctx: GenerationContext): Promise<void> {
    // No-op; persistence happens within migration stage above.
  }

  /** Stage 10 — status updates + analytics. */
  private async stagePostProcessing(ctx: GenerationContext): Promise<void> {
    if (ctx.deckId) {
      await this.prisma.deck.update({ where: { id: ctx.deckId }, data: { status: 'ready' } });
    }
    if (ctx.projectId) {
      await this.prisma.project.update({ where: { id: ctx.projectId }, data: { status: 'completed' } });
    }
  }
}

// =============================================================================
//  Helpers
// =============================================================================
function formatDocumentType(t: string): string {
  return (t || 'presentation').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Commands that wipe slide rows should always snapshot first. */
function shouldSnapshotBefore(type: string): boolean {
  return type === 'REGENERATE' || type === 'REBUILD' || type === 'FAMILY_SWITCH'
      || type === 'TEMPLATE_SWITCH' || type === 'WIZARD_UPDATE' || type === 'STRUCTURED_UPDATE';
}

/** Commands that produce a meaningful "new version" event. */
function shouldSnapshotAfter(type: string): boolean {
  return type === 'GENERATE' || type === 'REGENERATE' || type === 'REBUILD'
      || type === 'FAMILY_SWITCH' || type === 'TEMPLATE_SWITCH';
}

function postSnapshotType(type: string): DeckVersionType {
  switch (type) {
    case 'GENERATE':         return 'GENERATED';
    case 'REGENERATE':
    case 'REBUILD':          return 'REGENERATED';
    case 'FAMILY_SWITCH':    return 'FAMILY_CHANGED';
    case 'TEMPLATE_SWITCH':  return 'TEMPLATE_CHANGED';
    default:                 return 'AUTO_SAVE';
  }
}
