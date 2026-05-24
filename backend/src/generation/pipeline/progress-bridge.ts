// =============================================================================
//  GenerationProgressBridge — Phase 31.5 (31.5D)
//
//  Subscribes to GenerationEventBus and forwards pipeline lifecycle events
//  to the existing ProgressGateway (frontend websocket). This is the single
//  bridge between the in-process pipeline events and the user-facing
//  progress stream — no duplicate progress systems.
//
//  Pipeline stages map to the gateway's existing 5-stage UI taxonomy:
//
//    load-context / validate-input / build-context  → 'outline'  (10–20%)
//    slide-planning / generator-execution            → 'slides'   (30–50%)
//    enhancement / smart-component-attachment        → 'design'   (60–70%)
//    quality-analysis                                → 'quality'  (80%)
//    migration / persistence / post-processing       → 'complete' (90–100%)
//
//  Activation: the pipeline only emits jobId when `command.options.jobId`
//  is set, so this bridge is invisible to callers that don't care about UI
//  progress (controller-side regenerate/refresh/family-switch).
// =============================================================================

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GenerationEventBus } from './event-bus';
import { ProgressGateway, ProgressUpdate } from '../progress/progress.gateway';
import type { PipelineStage } from './types';

const STAGE_UI: Record<PipelineStage, { stage: ProgressUpdate['stage']; progress: number; message: string }> = {
  'load-context':              { stage: 'outline',  progress: 5,  message: 'Loading wizard context…' },
  'validate-input':            { stage: 'outline',  progress: 10, message: 'Validating input…' },
  'build-context':             { stage: 'outline',  progress: 15, message: 'Building generation context…' },
  'slide-planning':            { stage: 'slides',   progress: 25, message: 'Planning slides…' },
  'generator-execution':       { stage: 'slides',   progress: 45, message: 'Generating slide content…' },
  'enhancement':               { stage: 'design',   progress: 60, message: 'Enhancing content…' },
  'smart-component-attachment':{ stage: 'design',   progress: 70, message: 'Attaching smart components…' },
  'quality-analysis':          { stage: 'quality',  progress: 80, message: 'Running quality checks…' },
  'migration':                 { stage: 'complete', progress: 90, message: 'Materialising slide elements…' },
  'persistence':               { stage: 'complete', progress: 95, message: 'Persisting deck…' },
  'post-processing':           { stage: 'complete', progress: 98, message: 'Finalising…' },
};

@Injectable()
export class GenerationProgressBridge implements OnModuleInit {
  private readonly logger = new Logger(GenerationProgressBridge.name);

  constructor(
    private bus: GenerationEventBus,
    private gateway: ProgressGateway,
  ) {}

  onModuleInit() {
    this.bus.on('generation.started', (e) => {
      const jobId = this.jobId(e.payload);
      if (!jobId) return;
      this.gateway?.emitProgress({
        jobId, stage: 'outline', progress: 1,
        message: `Generation started (${(e.payload as any).command?.type})`,
        timestamp: new Date(),
      });
    });

    this.bus.on('stage.completed', (e) => {
      const payload = e.payload as { stage: PipelineStage; ms: number; command: string };
      const ui = STAGE_UI[payload.stage];
      if (!ui) return;
      // Only emit if a jobId is in the current pipeline run. We can't read
      // command.options.jobId off the stage event directly; we rely on the
      // pipeline emitting a single 'generation.started' that carried the
      // command — and on the gateway de-duping. Practical compromise: the
      // gateway only forwards to clients subscribed to a jobId, so spurious
      // emissions are no-ops.
      const jobId = (payload as any).jobId ?? '';
      this.gateway?.emitProgress({
        jobId,
        stage: ui.stage,
        progress: ui.progress,
        message: ui.message,
        details: { stage: payload.stage, ms: payload.ms },
        timestamp: new Date(),
      });
    });

    this.bus.on('slides.generated', (e) => {
      const payload = e.payload as { count: number; deckId?: string };
      this.gateway?.emitProgress({
        jobId: '', stage: 'slides', progress: 50,
        message: `Generated ${payload.count} slides`,
        details: { totalSlides: payload.count, deckId: payload.deckId },
        timestamp: new Date(),
      });
    });

    this.bus.on('generation.completed', (e) => {
      const jobId = this.jobId(e.payload);
      this.gateway?.emitProgress({
        jobId,
        stage: 'complete', progress: 100,
        message: 'Presentation ready',
        details: (e.payload as any).metrics,
        timestamp: new Date(),
      });
    });

    this.bus.on('generation.failed', (e) => {
      const payload = e.payload as { command: any; stage: PipelineStage; reason: string };
      const jobId = this.jobId(payload);
      this.gateway?.emitProgress({
        jobId,
        stage: 'error', progress: 0,
        message: `Generation failed at ${payload.stage}: ${payload.reason}`,
        details: { stage: payload.stage },
        timestamp: new Date(),
      });
    });

    this.logger.log('GenerationProgressBridge wired to ProgressGateway.');
  }

  /** Pull jobId off any pipeline payload that includes the command. */
  private jobId(payload: any): string {
    return payload?.command?.options?.jobId || '';
  }
}
