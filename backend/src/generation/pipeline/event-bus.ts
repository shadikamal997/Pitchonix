// =============================================================================
//  GenerationEventBus — Phase 31 (31J)
//
//  Minimal in-process event bus the pipeline uses to broadcast lifecycle
//  events. Subscribers (telemetry, analytics, websockets) can attach without
//  the pipeline knowing about them.
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';

export type GenerationEventName =
  | 'generation.started'
  | 'generation.completed'
  | 'generation.failed'
  | 'family.changed'
  | 'template.changed'
  | 'quality.completed'
  | 'slides.generated'
  | 'components.generated'
  | 'stage.started'
  | 'stage.completed';

export interface GenerationEvent<T = any> {
  name:      GenerationEventName;
  payload:   T;
  timestamp: number;
}

type Listener = (event: GenerationEvent) => void;

@Injectable()
export class GenerationEventBus {
  private readonly logger = new Logger(GenerationEventBus.name);
  private readonly listeners = new Map<GenerationEventName, Set<Listener>>();

  on(name: GenerationEventName, listener: Listener): () => void {
    let set = this.listeners.get(name);
    if (!set) { set = new Set(); this.listeners.set(name, set); }
    set.add(listener);
    return () => set!.delete(listener);
  }

  emit<T>(name: GenerationEventName, payload: T): void {
    const event: GenerationEvent<T> = { name, payload, timestamp: Date.now() };
    const set = this.listeners.get(name);
    if (!set || set.size === 0) return;
    for (const listener of set) {
      try { listener(event); }
      catch (err) { this.logger.warn(`Listener for ${name} threw: ${(err as Error).message}`); }
    }
  }
}
