# Collaboration — Staging Validation Runbook

Phase 34.4B/C/E: infrastructure-bound validation steps.

These tests **must be run against a real multi-process staging deployment
with Redis**. They cannot be run from the repo alone.

---

## 34.4B — Multi-process validation

### Setup

1. Provision two backend pods (or three) sharing a Redis instance:
   ```bash
   REDIS_URL=redis://staging-redis:6379 PORT=3001 npm run start:prod &  # process A
   REDIS_URL=redis://staging-redis:6379 PORT=3002 npm run start:prod &  # process B
   ```
2. Front them with a non-sticky load balancer (round-robin) so we
   actively exercise cross-process routing.
3. Point a Next.js build at the LB:
   `NEXT_PUBLIC_API_URL=https://staging.example.com/api npm run start`.

### Per-feature checklist

For each pair of users **deliberately routed to different backends** (open
each browser tab with `?backend=A` / `?backend=B` query param, or use a
proxy with sticky headers in the test harness):

| Test | Expected |
| --- | --- |
| Both users open the same deck | `presence.updated` arrives on both within 1s; both avatars appear |
| User A moves cursor; B watches | B sees a remote cursor follow A's pointer with <100ms median latency |
| User A selects an element; B watches | B sees the colored selection outline appear |
| User A types in a heading | B sees characters appear with <200ms median latency |
| Both type into the same heading simultaneously | No lost characters; result is the deterministic CRDT merge |
| User A adds a comment | B's comments panel updates without polling |
| User A approves a review | B's review status badge updates |
| User A restores a version | B sees the toast + content updates |
| User A creates a new slide | B's sidebar adds the slide |

### Convergence test

1. User A connected to process A, user B connected to process B.
2. Both edit the same paragraph.
3. After 5 seconds idle, restart process B (`docker restart pod-b`).
4. New user C connects to the deck via process B.
5. **Expected:** C sees the converged text including both A's and B's
   edits, hydrated from `SlideElement.ydocState` (which process B's
   YDocStore flushed before shutdown).

---

## 34.4C — Load test execution

Use [`scripts/collaboration-load-harness.ts`](../scripts/collaboration-load-harness.ts).

### Setup

1. Build the harness: `pnpm exec ts-node scripts/collaboration-load-harness.ts --help`
2. Create a test deck the harness user has access to.
3. Capture the JWT and deck id.

### Run matrix

```bash
DECK_ID=<deck-uuid> TOKEN=<jwt> SERVER=https://staging.example.com \
  USERS=10  DURATION_SECONDS=30 ts-node scripts/collaboration-load-harness.ts
DECK_ID=…  USERS=25  …
DECK_ID=…  USERS=50  …
DECK_ID=…  USERS=100 …
```

### Capture per run

| Metric | Target |
| --- | --- |
| `Cursor latency p50` | < 100ms |
| `Cursor latency p95` | < 300ms |
| `Cursor latency p99` | < 600ms |
| `Cursors sent/received` | sent ≈ users × ~30 per sec; received ≈ sent × (users-1) |
| Process RSS (each pod) | < 1 GB at 100 users |
| Process CPU | < 80% sustained |

The harness output already prints P50/P95/P99. Pair it with process-level
metrics via the existing `/api/collaboration/metrics/prometheus` endpoint
or `kubectl top pod`.

---

## 34.4E — Recovery tests

| Scenario | Action | Expected |
| --- | --- | --- |
| **Server restart** | `kubectl rollout restart deployment/backend-a` while users are editing | Sockets reconnect within 5s; Y.Docs re-hydrate from DB; no data loss |
| **Redis restart** | `redis-cli debug sleep 30` then resume | Sockets keep their existing connection; cross-process Y.Doc sync pauses + resumes; single-process events keep flowing |
| **Browser refresh** | User A reloads tab mid-edit | New socket → `presence.join` → `yjs.initial_state` → text restored; cursor + selection reset (expected) |
| **Network disconnect** | Disable wifi for 30s | "Reconnecting…" banner; local edits queue; on reconnect, queued cursor/selection replay; Y.Doc sync resumes |
| **Workspace switch** | User A switches to a different workspace in switcher | Editor unmounts → collaboration socket disconnects → new workspace's editor mounts → new connection |
| **Version restore** | User A restores an older version | `flushDeckYDocs` runs → snapshot written → restore replays → all collaborators see toast + updated content |

For each scenario, watch:
- Client console for socket errors
- `/api/collaboration/metrics/prometheus` for `collaboration_evictions_total` growth (should be normal)
- Backend logs for `YDocSyncBus apply failed` (should not appear)

### Acceptance

All scenarios complete without:
- Lost edits in `SlideElement.content` or `ydocState`
- Stuck "Reconnecting…" banners
- Phantom presence entries that don't fade after the 30s editing timeout
- Backend OOM or socket-leak indicators
