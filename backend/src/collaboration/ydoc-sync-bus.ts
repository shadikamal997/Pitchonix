import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as crypto from 'crypto';

// =============================================================================
//  Phase 34.4A — YDocSyncBus
//
//  Cross-process Y.Doc replication via Redis pub/sub. Each backend process
//  publishes Y.Doc updates it accepted to `pitchonix:ydoc:{docId}`; other
//  processes subscribe and apply those updates to their local YDocStore.
//
//  Because Yjs updates are idempotent CRDTs, applying the same update twice
//  is a no-op. We tag every publish with this process's nonce so we don't
//  re-apply our own broadcasts in a loop.
//
//  When `REDIS_URL` is not set, the bus stays inactive and the system runs
//  in single-process mode (the Phase 34.3 architecture). No code changes
//  needed on the caller side — `publish()` is a silent no-op when offline.
//
//  This is the "Option B" path from the Phase 34.4A ADR: shared CRDT state
//  via Redis. It avoids the divergence window between multiple processes
//  that each accept writes on the same docId. Sticky routing would obviate
//  the bus, but doesn't require this code to be removed — both can coexist.
// =============================================================================

const CHANNEL_PREFIX  = 'pitchonix:ydoc:';
const SUBSCRIBE_GLOB  = 'pitchonix:ydoc:*';

export type YDocUpdateHandler = (docId: string, update: Uint8Array) => void;

@Injectable()
export class YDocSyncBus implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(YDocSyncBus.name);
  /** Stable nonce so we ignore our own published updates. */
  private readonly originId = crypto.randomBytes(8).toString('hex');
  private pub:   any = null;
  private sub:   any = null;
  private handler: YDocUpdateHandler | null = null;
  private active = false;
  private published = 0;
  private received  = 0;

  async onModuleInit() {
    if (!process.env.REDIS_URL) {
      this.logger.log('YDocSyncBus: REDIS_URL not set — staying single-process');
      return;
    }
    try {
      const { default: Redis } = await import('ioredis');
      this.pub = new (Redis as any)(process.env.REDIS_URL);
      this.sub = new (Redis as any)(process.env.REDIS_URL);
      await this.sub.psubscribe(SUBSCRIBE_GLOB);
      this.sub.on('pmessage', (_pattern: string, channel: string, message: string) => {
        this.onMessage(channel, message);
      });
      this.active = true;
      this.logger.log(`YDocSyncBus active (origin=${this.originId})`);
    } catch (e: any) {
      this.logger.warn(`YDocSyncBus init failed (${e?.message}); staying single-process`);
    }
  }

  async onModuleDestroy() {
    try { await this.sub?.punsubscribe(SUBSCRIBE_GLOB); } catch { /* ignore */ }
    try { this.pub?.disconnect(); } catch { /* ignore */ }
    try { this.sub?.disconnect(); } catch { /* ignore */ }
  }

  /** Caller (YDocStore) registers itself to receive remote updates. */
  setHandler(h: YDocUpdateHandler): void {
    this.handler = h;
  }

  /**
   * Publish a Y.Doc update accepted by THIS process. Other processes
   * subscribed via Redis receive it and apply it to their local copy.
   */
  publish(docId: string, update: Uint8Array): void {
    if (!this.active || !this.pub) return;
    try {
      // Payload format: `{originId}:{base64 update bytes}`. Origin tag lets
      // us skip re-applying our own broadcasts on the subscriber side.
      const b64 = Buffer.from(update).toString('base64');
      this.pub.publish(`${CHANNEL_PREFIX}${docId}`, `${this.originId}:${b64}`);
      this.published++;
    } catch (e: any) {
      this.logger.warn(`YDocSyncBus publish ${docId} failed: ${e?.message}`);
    }
  }

  /** Phase 34.4D — observability counter accessors. */
  stats(): { active: boolean; published: number; received: number; originId: string } {
    return { active: this.active, published: this.published, received: this.received, originId: this.originId };
  }

  private onMessage(channel: string, message: string) {
    try {
      if (!channel.startsWith(CHANNEL_PREFIX)) return;
      const sep = message.indexOf(':');
      if (sep <= 0) return;
      const origin = message.slice(0, sep);
      if (origin === this.originId) return;   // our own publish
      const b64 = message.slice(sep + 1);
      const update = new Uint8Array(Buffer.from(b64, 'base64'));
      const docId = channel.slice(CHANNEL_PREFIX.length);
      this.received++;
      this.handler?.(docId, update);
    } catch (e: any) {
      this.logger.warn(`YDocSyncBus apply failed: ${e?.message}`);
    }
  }
}
