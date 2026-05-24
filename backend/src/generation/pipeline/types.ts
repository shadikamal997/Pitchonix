// =============================================================================
//  Generation Pipeline Types — Phase 31
//
//  Every generation-related action (initial generate, regenerate, family/
//  template switch, structured update, refresh, rebuild) is expressed as a
//  GenerationCommand and routed through the single UnifiedGenerationPipeline.
// =============================================================================

import type { SlideContent, WizardInput } from '../slide-types/types';
import type { SmartFamilyId } from '../../components/smart/smart-types';

export type GenerationCommandType =
  | 'GENERATE'
  | 'REGENERATE'
  | 'REFRESH'
  | 'REBUILD'
  | 'FAMILY_SWITCH'
  | 'TEMPLATE_SWITCH'
  | 'STRUCTURED_UPDATE'
  | 'WIZARD_UPDATE';

/** What a caller submits to the pipeline. */
export interface GenerationCommand {
  type:        GenerationCommandType;
  /** Required for every command except GENERATE (which creates the project). */
  projectId?:  string;
  /** Required for REFRESH / FAMILY_SWITCH / TEMPLATE_SWITCH. */
  deckId?:     string;
  /** New family to apply (FAMILY_SWITCH, optional for others as override). */
  familyId?:   SmartFamilyId;
  /** New template (TEMPLATE_SWITCH). */
  templateId?: string;
  /** Wizard input override (GENERATE / WIZARD_UPDATE). */
  wizardInput?: Partial<WizardInput>;
  /** Per-command flags. */
  options?: {
    /** Skip AI enhancement (debug / sync). Defaults true for synchronous commands. */
    skipAI?: boolean;
    /**
     * Phase 31.5 — enable the optional AI-enhancement stage. When true, the
     * pipeline calls aiEnhancementService.enhanceDeck after generator execution
     * and before smart-component verification. When false (default), this stage
     * is skipped — preserves the existing non-AI synchronous behaviour.
     */
    useEnhancement?: boolean;
    /** Force re-migration of element rows even when slide already migrated. */
    forceMigrate?: boolean;
    /** Skip brand-asset application. */
    skipBrandAssets?: boolean;
    /** Tag the caller for telemetry (e.g. 'queue' | 'controller' | 'script'). */
    source?: string;
    /**
     * Job id for progress event correlation. When supplied, the progress
     * bridge forwards pipeline events to the websocket gateway under this id.
     */
    jobId?: string;
  };
}

/**
 * Stages map 1:1 to the spec's 31D list, plus the Phase 31.5 `enhancement`
 * stage (gated on `command.options.useEnhancement`).
 */
export type PipelineStage =
  | 'load-context'
  | 'validate-input'
  | 'build-context'
  | 'slide-planning'
  | 'generator-execution'
  | 'enhancement'                 // Phase 31.5 — optional AI pass
  | 'smart-component-attachment'
  | 'quality-analysis'
  | 'migration'
  | 'persistence'
  | 'post-processing';

export const PIPELINE_STAGES: PipelineStage[] = [
  'load-context',
  'validate-input',
  'build-context',
  'slide-planning',
  'generator-execution',
  'enhancement',
  'smart-component-attachment',
  'quality-analysis',
  'migration',
  'persistence',
  'post-processing',
];

/** Which stages each command runs. The pipeline iterates this list. */
export const STAGES_FOR_COMMAND: Record<GenerationCommandType, PipelineStage[]> = {
  // Full pipelines (enhancement stage gated by options.useEnhancement at runtime)
  GENERATE:           PIPELINE_STAGES.slice(),
  REGENERATE:         PIPELINE_STAGES.slice(),
  REBUILD:            PIPELINE_STAGES.slice(),
  // Switching family/template re-runs the back half from planning onward
  FAMILY_SWITCH:      PIPELINE_STAGES.slice(),
  TEMPLATE_SWITCH:    PIPELINE_STAGES.slice(),
  // Input-update commands also run the full pipeline (they affect generators)
  WIZARD_UPDATE:      PIPELINE_STAGES.slice(),
  STRUCTURED_UPDATE:  PIPELINE_STAGES.slice(),
  // Refresh skips planning + generator + smart-component attachment;
  // it just re-runs quality + persistence + post-processing on existing slides
  REFRESH: ['load-context', 'quality-analysis', 'persistence', 'post-processing'],
};

/** Built up by the pipeline as stages run; the result is returned to the caller. */
export interface GenerationContext {
  command:      GenerationCommand;
  projectId?:   string;
  deckId?:      string;
  wizardInput?: WizardInput;
  familyId?:    SmartFamilyId;
  templateId?:  string;
  /** Generated SlideContent[] (output of slide-factory). */
  slides?:      SlideContent[];
  /** Persisted slide ids (output of persistence stage). */
  persistedSlideIds?: string[];
  /** Tallies from later stages. */
  metrics?: {
    slidesGenerated:    number;
    smartComponentsAttached: number;
    elementsCreated:    number;
    qualityScore:       number;
  };
}

/** Per-stage outcome captured for telemetry. */
export interface StageResult {
  stage:    PipelineStage;
  ok:       boolean;
  ms:       number;
  message?: string;
}

/** What `pipeline.execute(command)` returns. */
export interface PipelineResult {
  ok:        boolean;
  command:   GenerationCommandType;
  durationMs: number;
  stages:    StageResult[];
  context:   GenerationContext;
  error?: {
    stage:   PipelineStage;
    reason:  string;
  };
}

/**
 * Structured failure thrown from inside a stage. Wraps stage + reason +
 * arbitrary context so the pipeline can convert it into a PipelineResult
 * without losing diagnostic information.
 */
export class PipelineError extends Error {
  constructor(
    public readonly stage:   PipelineStage,
    public readonly reason:  string,
    public readonly context: Record<string, unknown> = {},
  ) {
    super(`PipelineError [${stage}]: ${reason}`);
    this.name = 'PipelineError';
  }
}
