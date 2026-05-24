import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Y from 'yjs';
import { PrismaService } from '../prisma/prisma.service';
import { YDocSyncBus } from './ydoc-sync-bus';

// =============================================================================
//  Phase 34.2B — YDocStore (server-authoritative Y.Doc cache + persistence)
//
//  Holds one Y.Doc per `docId` in memory. The gateway calls into this to:
//
//    1. ensure(docId)         — lazy-load from DB or seed empty Y.Doc
//    2. applyUpdate(docId, b) — apply a client's binary update to the doc
//    3. encodeState(docId)    — full state snapshot for newcomers
//
//  Persistence happens on a debounce timer (~2s) per docId. On every
//  applyUpdate we reset the timer; when it fires we encode the current
//  state and write it to SlideElement.ydocState (for `text:{elementId}`
//  docIds — currently the only kind we persist).
//
//  This is a single-process store. In multi-process Redis deployments, the
//  Redis socket adapter handles fan-out of yjs.update messages between
//  processes, but the in-memory Y.Doc cache stays process-local. That's
//  acceptable because:
//    - First yjs.join in a fresh process re-hydrates from DB
//    - Every update is reapplied via the socket adapter
//
//  The "correct" multi-process solution is a single hocuspocus instance or
//  a Redis-backed Y.Doc store; both are larger investments and deferred.
// =============================================================================

const DEBOUNCE_MS = 2_000;

// Phase 34.3E — idle eviction. A doc with no subscribers + no updates for
// this long is dropped from cache. Configurable via YDOC_IDLE_MINUTES env
// var so ops can tune without redeploys.
const DEFAULT_IDLE_MINUTES = 10;
const EVICTION_SWEEP_MS    = 60_000;       // sweep once a minute

interface CacheEntry {
  doc:           Y.Doc;
  lastUpdated:   number;
  saveTimer:     NodeJS.Timeout | null;
  /** Track whether the in-memory state has un-persisted edits. */
  dirty:         boolean;
  /** Phase 34.3E — count of active sockets currently subscribed to this doc. */
  subscribers:   number;
}

@Injectable()
export class YDocStore implements OnModuleInit {
  private readonly logger = new Logger(YDocStore.name);
  private readonly cache  = new Map<string, CacheEntry>();
  private readonly idleMs: number;
  private sweepTimer:      NodeJS.Timeout | null = null;
  // Phase 34.3G — observability counters.
  private evictionCount    = 0;

  constructor(
    private prisma: PrismaService,
    // Phase 34.4A — cross-process Y.Doc replication via Redis pub/sub.
    private syncBus: YDocSyncBus,
  ) {
    const idleMin = Math.max(1, parseInt(process.env.YDOC_IDLE_MINUTES || '', 10) || DEFAULT_IDLE_MINUTES);
    this.idleMs = idleMin * 60 * 1000;
    // Start the sweeper. unref so it doesn't block process shutdown in tests.
    this.sweepTimer = setInterval(() => this.sweep(), EVICTION_SWEEP_MS);
    (this.sweepTimer as any).unref?.();
  }

  onModuleInit() {
    // Phase 34.4A — receive Y.Doc updates from peer backend processes and
    // apply them to our local cache. Yjs updates are idempotent CRDTs so
    // late / duplicate deliveries are safe.
    this.syncBus.setHandler((docId, update) => {
      const entry = this.cache.get(docId);
      if (!entry) return;        // not cached here → no need to apply
      try { Y.applyUpdate(entry.doc, update, 'sync-bus'); }
      catch (e: any) { this.logger.warn(`Sync-bus apply ${docId} failed: ${e?.message}`); }
      entry.lastUpdated = Date.now();
      entry.dirty = true;        // persist on next debounce window
    });
  }

  /**
   * Get or hydrate a Y.Doc. Recognised docId formats:
   *   - `text:{elementId}` → persisted via SlideElement.ydocState
   *   - anything else      → in-memory only (no persistence)
   */
  async ensure(docId: string): Promise<Y.Doc> {
    const existing = this.cache.get(docId);
    if (existing) return existing.doc;

    const doc = new Y.Doc();
    const persisted = await this.loadFromDb(docId);
    if (persisted) {
      try { Y.applyUpdate(doc, persisted, 'persisted'); }
      catch (e: any) { this.logger.warn(`Hydrate ${docId} failed: ${e?.message}`); }
    }

    this.cache.set(docId, {
      doc,
      lastUpdated: Date.now(),
      saveTimer:   null,
      dirty:       false,
      subscribers: 0,
    });
    return doc;
  }

  /** Phase 34.3E — track active subscribers (called from gateway on join/leave). */
  subscribe(docId: string): void {
    const entry = this.cache.get(docId);
    if (entry) entry.subscribers += 1;
  }
  unsubscribe(docId: string): void {
    const entry = this.cache.get(docId);
    if (entry && entry.subscribers > 0) entry.subscribers -= 1;
  }

  /** Apply a binary update from a client. Triggers a debounced save. */
  async applyUpdate(docId: string, update: Uint8Array): Promise<void> {
    const doc = await this.ensure(docId);
    try { Y.applyUpdate(doc, update, 'remote'); }
    catch (e: any) { this.logger.warn(`Update ${docId} failed: ${e?.message}`); return; }

    const entry = this.cache.get(docId)!;
    entry.lastUpdated = Date.now();
    entry.dirty = true;
    if (entry.saveTimer) clearTimeout(entry.saveTimer);
    entry.saveTimer = setTimeout(() => this.flush(docId), DEBOUNCE_MS);

    // Phase 34.4A — fan the same update out to peer backend processes so
    // their cached Y.Docs converge with ours. Idempotent + tagged with this
    // process's origin so we never apply our own publish.
    this.syncBus.publish(docId, update);
  }

  /** Encode the current state for a newcomer to sync from. */
  async encodeState(docId: string): Promise<Uint8Array> {
    const doc = await this.ensure(docId);
    return Y.encodeStateAsUpdate(doc);
  }

  /** Force-write the current doc to DB. Used on snapshot capture + shutdown. */
  async flush(docId: string): Promise<void> {
    const entry = this.cache.get(docId);
    if (!entry || !entry.dirty) return;
    const target = parseDocId(docId);
    if (!target) return;

    const update = Y.encodeStateAsUpdate(entry.doc);
    try {
      if (target.kind === 'element') {
        await this.prisma.slideElement.update({
          where: { id: target.id },
          data:  { ydocState: Buffer.from(update) },
        });
      }
      entry.dirty = false;
      entry.saveTimer = null;
    } catch (e: any) {
      this.logger.warn(`Persist ${docId} failed: ${e?.message}`);
    }
  }

  /**
   * Phase 34.2D — snapshot the current Y.Doc state to a Buffer for inclusion
   * in a VersionHistory snapshot. Returns null when we have no cached doc
   * and no persisted state.
   */
  async snapshotState(docId: string): Promise<Buffer | null> {
    const entry = this.cache.get(docId);
    if (entry) return Buffer.from(Y.encodeStateAsUpdate(entry.doc));
    const persisted = await this.loadFromDb(docId);
    return persisted ? Buffer.from(persisted) : null;
  }

  /** Phase 34.2D — restore a Y.Doc from a previous snapshot. */
  async restoreState(docId: string, state: Buffer): Promise<void> {
    const doc = new Y.Doc();
    try { Y.applyUpdate(doc, new Uint8Array(state), 'restore'); }
    catch (e: any) { this.logger.warn(`Restore ${docId} failed: ${e?.message}`); return; }
    this.cache.set(docId, {
      doc, lastUpdated: Date.now(), saveTimer: null, dirty: true, subscribers: 0,
    });
    await this.flush(docId);
  }

  // ---------------------------------------------------------------------------
  //  Phase 34.3E — eviction sweeper
  // ---------------------------------------------------------------------------

  /**
   * Drop cached Y.Docs with no active subscribers that haven't been touched
   * in `idleMs`. Dirty docs are flushed first so we never lose un-persisted
   * edits. Returns the number of entries evicted (for /metrics).
   */
  async sweep(): Promise<number> {
    const cutoff = Date.now() - this.idleMs;
    let evicted = 0;
    for (const [docId, entry] of this.cache.entries()) {
      if (entry.subscribers > 0)         continue;   // active session
      if (entry.lastUpdated >= cutoff)   continue;   // recently touched
      if (entry.dirty) {
        try { await this.flush(docId); } catch { /* logged inside flush */ }
      }
      if (entry.saveTimer) clearTimeout(entry.saveTimer);
      this.cache.delete(docId);
      evicted++;
    }
    if (evicted > 0) {
      this.evictionCount += evicted;
      this.logger.log(`Evicted ${evicted} idle Y.Doc(s); cache size now ${this.cache.size}`);
    }
    return evicted;
  }

  /** Phase 34.3G — observability snapshot. */
  stats(): {
    cachedDocs:    number;
    activeDocs:    number;    // ≥1 subscriber
    dirtyDocs:     number;
    totalSubscribers: number;
    evictionCount: number;
    idleMs:        number;
  } {
    let active = 0;
    let dirty  = 0;
    let totalSubs = 0;
    for (const e of this.cache.values()) {
      if (e.subscribers > 0) active++;
      if (e.dirty)           dirty++;
      totalSubs += e.subscribers;
    }
    return {
      cachedDocs:       this.cache.size,
      activeDocs:       active,
      dirtyDocs:        dirty,
      totalSubscribers: totalSubs,
      evictionCount:    this.evictionCount,
      idleMs:           this.idleMs,
    };
  }

  // ---------------------------------------------------------------------------
  //  DB helpers
  // ---------------------------------------------------------------------------

  private async loadFromDb(docId: string): Promise<Uint8Array | null> {
    const target = parseDocId(docId);
    if (!target) return null;
    if (target.kind === 'element') {
      const row = await this.prisma.slideElement.findUnique({
        where:  { id: target.id },
        select: { ydocState: true },
      });
      if (row?.ydocState) return new Uint8Array(row.ydocState);
    }
    return null;
  }
}

// =============================================================================
//  docId helpers
//
//  Three recognised shapes:
//    text:{elementId}                 — persistent text element (SlideElement.ydocState)
//    list:{elementId}:{itemId}        — list item, in-memory only (canonical
//                                       state lives inside SlideElement.content)
//    anything else                    — in-memory only, no persistence
// =============================================================================

export function elementDocId(elementId: string): string { return `text:${elementId}`; }
export function listItemDocId(elementId: string, itemId: string): string {
  return `list:${elementId}:${itemId}`;
}

export type DocTarget =
  | { kind: 'element';  id: string }
  | { kind: 'listItem'; elementId: string; itemId: string };

export function parseDocId(docId: string): DocTarget | null {
  if (docId.startsWith('text:')) return { kind: 'element', id: docId.slice(5) };
  if (docId.startsWith('list:')) {
    const rest = docId.slice(5);
    const sep  = rest.indexOf(':');
    if (sep <= 0) return null;
    return { kind: 'listItem', elementId: rest.slice(0, sep), itemId: rest.slice(sep + 1) };
  }
  return null;
}
