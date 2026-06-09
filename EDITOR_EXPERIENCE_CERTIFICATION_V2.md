# Editor Experience Certification V2 — Ω.PRODUCT.3B (Live)

**Generated:** 2026-06-09

> This phase requires **live, runtime** proof of editor behaviour (Playwright/headless journeys against the running app). A real harness was built and run; the results below are **observed**, and the live gates are reported honestly. **Nothing is simulated, estimated, or fabricated.**

## ⛔ Live certification is BLOCKED — the running frontend is unhealthy

A live editor harness cannot run because the frontend dev server returns **HTTP 500 "Internal Server Error" on every server-rendered page**, including the login page. Without a rendering frontend there is no editor to drive.

**Evidence (direct requests, 2026-06-09):**

| URL | Result |
|---|---|
| `http://localhost:3002/login` | **HTTP 500 — "Internal Server Error"** |
| `http://localhost:3002/` (root) | **HTTP 500** |
| `http://localhost:3002/dashboard` | 307 (redirect to the 500 login) |
| `http://localhost:3000/login` | 404 (not the app port) |

The backend API is healthy (`/api/health` → 200), but the **frontend SSR is erroring**, so no page (login, dashboard, or any editor) renders.

## What WAS built and proven (real)

A genuine live-editor harness exists and ran end-to-end up to the frontend wall — `npm run editor:live-probe` (`backend/scripts/editor-live-probe.ts`):

1. ✅ **Auth** — registers a user against the live API and receives a JWT.
2. ✅ **Seeding** — creates a real `Project → Deck → Slide → SlideElement[]` directly via Prisma (no AI), confirmed written to the database.
3. ✅ **Headless driver** — launches a headless browser, injects auth, and navigates to the real editor route `/projects/{id}/edit/{slideId}`.
4. ⛔ **Render** — the frontend returns 500 / redirects to the 500 login page; `[data-element-id]` never appears, so no interaction (undo/redo, autosave, copy/paste, drag) can be driven.

Two independent auth strategies were attempted (localStorage token injection; driving the real login form) — both blocked by the same frontend 500, confirming the blocker is the frontend, not the harness.

## Success criteria — status (all UNVERIFIED — blocked, not failed, not faked)

| Criterion | Status |
|---|---|
| Undo/Redo proven | ⛔ UNVERIFIED — needs a rendering editor |
| Autosave proven | ⛔ UNVERIFIED |
| Refresh recovery proven | ⛔ UNVERIFIED |
| Crash recovery proven | ⛔ UNVERIFIED |
| Copy/Paste certified | ⛔ UNVERIFIED (and copy/paste is unimplemented in PDF/Excel/Career per Ω.PRODUCT.3 — a feature build, not just a test) |
| Drag & Drop certified | ⛔ UNVERIFIED |
| No data loss | ⛔ UNVERIFIED |
| Workflow success ≥ 95% | ⛔ UNVERIFIED |

## What IS certified elsewhere (real, for context)

- **Editor capability presence** (which editors implement undo/redo, autosave, shortcuts, drag&drop, copy/paste, inline editing) — Ω.PRODUCT.3 static audit, source-verified.
- **Excel undo/redo** at the operation/replay level — `backend/src/excel-studio/excel-studio.service.spec.ts` passes (real automated test).
- **Import→…→Reopen content fidelity** — Universal Content Ledger (Ω.CONTENT.3, 100% on fixtures).
- **Export→Reopen render fidelity** — render certification (Ω.PRODUCT.2C/2D, 131/131 templates on real output).
- **Per-route asset budgets** — release certification (all editor routes under budget).

## To complete this phase

1. **Restore a healthy frontend** — fix the SSR 500 (the dev/build server must serve `/login` and the editor routes) on the correct port.
2. Re-run `npm run editor:live-probe` to confirm the editor renders the seeded deck.
3. Extend the harness to the full journey matrix (Create/Edit/Delete/Move/Duplicate/Import/Template-change → Undo/Redo → Refresh → Undo-after-refresh) and autosave fault injection (refresh/close/network-loss/slow-network).
4. **Implement** copy/paste in PDF Studio, Career Docs, Excel Studio (currently only Presentation has element copy/paste), then certify.
5. Record click/time/failure-rate per journey for the ≥95% workflow-success gate.

## Verdict

**The phase does NOT pass.** Live editor behaviour could not be proven because the frontend is returning Internal Server Error and cannot render any page in this environment. The harness, seeding and auth path are real and ready; certification resumes the moment a healthy frontend is available. No live result was fabricated to manufacture a pass.
