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
import { getFamilyTokens } from '../../components/smart/family-tokens';
import { analyzeNarrativeFlow } from './narrative-flow';
import { contentRichness, visualCoverage, compositeScore } from './quality-signals';
import { familyForTemplate } from '../template-family-map';

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

    // Pick target deck. Project-level update commands must reuse the latest
    // existing deck; otherwise "regenerate" silently creates duplicate decks.
    if (command.deckId) {
      ctx.deckId = command.deckId;
    } else {
      const decksByRecentActivity = [...project.decks].sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.createdAt).getTime();
        const bTime = new Date(b.updatedAt || b.createdAt).getTime();
        return bTime - aTime;
      });

      let deck: any;
      if (command.type === 'GENERATE') {
        deck = decksByRecentActivity.find((d) => d.slides.length === 0);
      } else {
        deck = decksByRecentActivity[0] || project.decks.find((d) => d.slides.length === 0);
      }

      if (!deck) {
        deck = await this.decksService.create(project.id, {
          title: `${ctx.wizardInput.companyName} ${formatDocumentType(ctx.wizardInput.documentType)}`,
          description: 'AI-generated presentation',
        });
      }
      if (!deck) throw new PipelineError('load-context', 'Failed to acquire a target deck');
      ctx.deckId = deck.id;
    }

    const targetDeck = await this.prisma.deck.findUnique({ where: { id: ctx.deckId } });
    const deckMetadata = ((targetDeck?.metadata as any) || {}) as Record<string, any>;
    const storedTemplateId = targetDeck?.templateId || (typeof deckMetadata.templateId === 'string' ? deckMetadata.templateId : null);
    if (storedTemplateId && !ctx.templateId) ctx.templateId = storedTemplateId;
    const storedFamily = typeof deckMetadata.familyId === 'string'
      ? deckMetadata.familyId as SmartFamilyId
      : null;
    const storedTemplateFamily = familyForTemplate(storedTemplateId);

    // Family resolution: command override wins, then template choice, then stored
    // deck family. Downstream generation, renderer metadata, preview and export all
    // read this single family id.
    if (command.familyId) ctx.familyId = command.familyId;
    else if (command.templateId) ctx.familyId = familyForTemplate(command.templateId) || undefined;
    else if (storedTemplateFamily) ctx.familyId = storedTemplateFamily;
    else if (storedFamily) ctx.familyId = storedFamily;

    // Apply template / family side-effects right here so downstream stages see them.
    if (command.type === 'FAMILY_SWITCH' && command.familyId) {
      await this.prisma.project.update({
        where: { id: project.id },
        data:  { businessInfo: { ...businessInfo, theme: command.familyId } as any },
      });
      await this.prisma.deck.update({
        where: { id: ctx.deckId },
        data: { metadata: { ...deckMetadata, familyId: command.familyId } as any },
      });
      ctx.wizardInput.theme = command.familyId;
      this.bus.emit('family.changed', { projectId: project.id, deckId: ctx.deckId, familyId: command.familyId });
    }
    if (command.type === 'TEMPLATE_SWITCH' && command.templateId) {
      const familyId = familyForTemplate(command.templateId);
      const templateRow = await this.prisma.template.findUnique({ where: { id: command.templateId }, select: { id: true } });
      if (familyId) {
        ctx.familyId = familyId;
        ctx.wizardInput.theme = familyId;
        await this.prisma.project.update({
          where: { id: project.id },
          data:  { businessInfo: { ...businessInfo, theme: familyId } as any },
        });
      }
      await this.prisma.deck.update({
        where: { id: ctx.deckId },
        data: {
          ...(templateRow ? { templateId: command.templateId } : {}),
          metadata: {
            ...deckMetadata,
            templateId: command.templateId,
            familyId: familyId || ctx.familyId || storedFamily || null,
          } as any,
        },
      });
      ctx.templateId = command.templateId;
      this.bus.emit('template.changed', { deckId: ctx.deckId, templateId: command.templateId, familyId });
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
    input.theme = ctx.familyId || input.theme || (input as any).family || 'investor-minimal';
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
    const slideTypes = (ctx.slides || []).map((s: any) => s.type);
    const flow       = analyzeNarrativeFlow(slideTypes, ctx.wizardInput?.documentType);
    const richness   = ctx.wizardInput ? contentRichness(ctx.wizardInput) : 0;
    const coverage   = visualCoverage(ctx.slides || []);
    const score      = this.scorecardService.build(ctx.wizardInput!, ctx.slides || [], coverage);
    const scorecardTotal = (score as any)?.overall ?? (score as any)?.total ?? 0;
    const finalScore = compositeScore({
      scorecardTotal,
      narrativeScore:  flow.narrativeScore,
      contentRichness: richness,
      visualCoverage:  coverage,
    });
    ctx.metrics = {
      ...(ctx.metrics || { slidesGenerated: 0, smartComponentsAttached: 0, elementsCreated: 0, qualityScore: 0 }),
      qualityScore:   finalScore,
      narrativeScore: flow.narrativeScore,
    };
    this.bus.emit('quality.completed', {
      deckId: ctx.deckId, score, narrativeScore: flow.narrativeScore, flowGaps: flow.gaps,
      signals: { richness, coverage, scorecardTotal, finalScore },
    });
  }

  /** Stage 8 — DB persistence + smart-component-driven element materialisation. */
  private async stageMigration(ctx: GenerationContext): Promise<void> {
    if (!ctx.slides || ctx.slides.length === 0) return; // REFRESH has nothing to migrate
    if (!ctx.deckId) throw new PipelineError('migration', 'deckId missing');

    // Persist SlideContent rows first, then migrate each into SlideElement rows.
    const baseSlides = ctx.slides.map((s: any, i: number) => {
      // Resolve family tokens for background + theme so the export pipeline
      // renders the correct family colours instead of defaulting to #ffffff.
      const family: SmartFamilyId | undefined = (ctx.familyId || s.smartComponent?.family || ctx.wizardInput?.theme) as SmartFamilyId | undefined;
      let background: any = undefined;
      let themeTokens: any = undefined;
      if (family) {
        try {
          const tok = getFamilyTokens(family);
          // Store raw CSS in themeTokens.background — element-html-renderer reads
          // `theme.background` directly, so gradients work without extra parsing.
          themeTokens = {
            background:  tok.bg,
            accent:      tok.accent,
            accent2:     tok.accent2,
            text:        tok.text,
            muted:       tok.muted,
            surface:     tok.surface,
            border:      tok.border,
            fontHeading: tok.fontHeading,
            fontBody:    tok.fontBody,
          };
          // Also populate the structured SlideBackground for any renderer that
          // prefers the explicit format (PPTX exporter, etc.).
          if (!tok.bg.includes('gradient')) {
            background = { type: 'solid', color: tok.bg };
          }
        } catch { /* unknown family — leave undefined */ }
      }
      return {
        type:         s.type,
        order:        i,
        title:        s.title || '',
        subtitle:     s.subtitle,
        // Carry smartComponent inside content JSON so the migration service
        // sees it (matches the persisted shape).
        content:      { ...(s.content || {}), smartComponent: s.smartComponent },
        metadata:     {
          ...((s.metadata as any) || {}),
          ...(ctx.templateId ? { appliedTemplateId: ctx.templateId } : {}),
          ...(family ? { familyId: family } : {}),
        },
        speakerNotes: s.speakerNotes,
        ...(background  !== undefined ? { background  } : {}),
        ...(themeTokens !== undefined ? { themeTokens } : {}),
      };
    });

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
