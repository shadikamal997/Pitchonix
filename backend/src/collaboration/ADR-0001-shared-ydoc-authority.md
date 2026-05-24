# ADR 0001 — Shared Y.Doc Authority for Multi-Process Deployments

**Status:** Accepted — Option B (Redis pub/sub) implemented
**Date:** 2026-05-23
**Phase:** 34.4A

## Context

The Pitchonix collaboration stack (Phase 34 → 34.3) treats every backend
process as an authoritative `YDocStore`. Each process holds its own in-memory
Y.Doc per `docId` and persists debounced updates to `SlideElement.ydocState`.

This is correct for **single-process deployments** but has a divergence
window in **multi-process deployments**:

1. Client X (connected to process A) sends `yjs.update`.
2. Process A applies the update, persists in 2s, broadcasts to clients in
   the room via the Socket.IO Redis adapter.
3. Client Y (connected to process B, same docId room) receives the update
   via the adapter and applies it client-side ✓.
4. **But** process B's local cached Y.Doc is now stale. When a third
   client Z connects to process B, the gateway's `yjs.initial_state` would
   return outdated state until the next DB read.

The window is bounded — eviction + DB re-hydration eventually converge —
but a freshly-connected client briefly sees out-of-date text.

## Decision

We implement **Option B: Redis-backed Y.Doc replication** via a new
`YDocSyncBus`. The bus uses Redis pub/sub on the channel pattern
`pitchonix:ydoc:{docId}` to fan Y.Doc updates between backend processes.

Each accepted `yjs.update`:
1. Applies to the local `YDocStore` (existing behavior).
2. Publishes the binary update to Redis tagged with this process's origin
   nonce.
3. Other processes' `YDocSyncBus` instances receive the publish and
   apply it to their local `YDocStore` cache (idempotent CRDT — duplicate
   apply is a no-op).

The bus stays inactive (silent no-op) when `REDIS_URL` is not set, so
single-process dev/test deployments are unaffected.

### Why not the other options?

- **Option A — Sticky routing.** Smallest infra change, but pushes
  correctness into the load balancer. If we add or remove backend pods,
  sticky-hash rebalancing causes mid-flight divergence. Also rules out
  rolling deploys without temporary fragmentation. Suitable for an MVP
  multi-pod deployment if Option B turns out to have a performance ceiling.

- **Option C — Hocuspocus cluster.** Cleanest long-term architecture
  (a single source of truth for every Y.Doc), but requires standing up
  a new dedicated service, switching the client provider from raw
  socket.io to hocuspocus, and rebuilding the persistence adapter.
  Multi-week investment. Worth revisiting if Option B's pub/sub volume
  becomes a bottleneck.

## Consequences

**Positive:**
- Multi-process backends converge automatically without sticky routing.
- Zero client-side changes — clients still talk to a single namespace.
- `YDocSyncBus` is observable: its publish/receive counters are exposed
  via `/api/collaboration/metrics/prometheus` (Phase 34.4D).
- Compatible with sticky routing if we later layer it on top — sticky
  reduces pub/sub traffic without breaking correctness.

**Negative:**
- Adds Redis as a soft dependency for multi-process correctness. If Redis
  is unreachable, the bus logs + stays inactive; processes operate
  single-process-style and may diverge until Redis returns.
- Every accepted Y update produces N pub/sub messages where N = backend
  process count. At very high throughput this could saturate Redis.
  Mitigations: throttle list-item updates, prefer Option C if observed.
- Late delivery of a sync-bus message can be applied to an already-evicted
  doc, in which case the apply is silently dropped (correct — the next
  client to hydrate will re-load from DB).

## Validation

Code-level verification (`phase34_4-validate.ts`) confirms:
- `YDocSyncBus` exists with publish/receive/handler API
- `YDocStore.applyUpdate` calls `syncBus.publish`
- `YDocStore.onModuleInit` registers a receive handler
- Origin tagging prevents publish loops

Runtime verification requires staging infra (see RUNBOOK in this folder).
