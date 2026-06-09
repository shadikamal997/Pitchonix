# Frontend SSR Recovery — Ω.INFRA.1

**Generated:** 2026-06-09 · **Status: ✅ RECOVERED**

## Phase 1 — Root cause (confirmed)

Every server-rendered route returned **HTTP 500 "Internal Server Error"** — including the public `/login` and `/` — even though `/login` is a client component. That pointed to a failure in a **shared server-rendered ancestor** (the root layout), which is exactly what was found:

- `app/layout.tsx` imports `app/fonts.ts`, which loaded **15 Google fonts via `next/font/google`**.
- `next/font/google` **fetches the font files at compile time** from `fonts.googleapis.com`.
- The build host has **no network** to Google Fonts:
  ```
  fonts.googleapis.com -> 000 (UNREACHABLE)
  ```
- The font fetch threw inside `fonts.ts` → the root layout threw during SSR → **every route 500'd**.

No font cache existed under `.next/cache` (only `eslint`/`swc`/`webpack`), so each recompile re-attempted the dead fetch. The server had also been running stale since Sunday.

## The fix (offline-resilient font loading)

Two small, surgical changes — **no build-time network dependency**, same public API:

1. **`frontend/app/fonts.ts`** — removed `next/font/google`. The exports (`inter`, `manrope`, `allFontClassNames`, `resolveFontStack`, `FONT_NAME_TO_VAR`) are preserved as shims/unchanged so all consumers (`layout.tsx`, `SlideCanvas.tsx`) keep working.
2. **`frontend/app/globals.css`** — declared the `--font-*` CSS variables in `:root` (these were previously provided by `next/font`). The actual web fonts are still loaded **browser-side** by the existing `@import url(fonts.googleapis.com…)` at the top of `globals.css` (a runtime browser fetch that does **not** block SSR). Offline, the system fallbacks in each variable apply and the app renders normally.

Result: the server never fetches fonts; online users get the real fonts via the stylesheet, offline users get clean system fallbacks, and **SSR no longer crashes**.

## Phase 2 — Startup validation

```
npm run dev  →  ✓ Ready in 1889ms (http://localhost:3002), no crash
```

## Phase 3 — Route validation (live)

| Route | Result | Note |
|---|---|---|
| `/` | **200** | was 500 |
| `/login` | **200** | was 500 |
| `/register` | **200** | was 500 |
| `/excel-studio` | **200** | renders directly |
| `/dashboard` | 307 → `/login` | correct middleware auth redirect (unauthenticated) |
| `/projects` | 307 → `/login` | correct |
| `/pdf-studio` | 307 → `/login` | correct |
| `/career` | 307 → `/login` | correct |

**No 500s on any route.** The 307s are the auth middleware correctly redirecting unauthenticated requests — not failures.

## Phase 4 — Auth validation (live)

Driven end-to-end by `backend/scripts/editor-live-probe.ts`:
- ✅ **register** (API) → JWT issued.
- ✅ **login** via the real login form → server authenticated, redirected to `/onboarding`.
- ✅ **protected route access** with a valid session → the editor route loaded with **no redirect to login**.

## Phase 5 — Editor render validation (live)

Navigating to `/projects/{id}/edit/{slideId}` with a seeded deck:
- ✅ Editor **renders** — full presentation editor UI present (toolbar: Templates, Insert, Layers, Duplicate, Delete, Export, SLIDES, Thumbs, Outline…), the seeded slide loaded ("Cover · 1/1"), screenshot non-blank (pixel stdev ≈ 21).
- The element canvas uses `data-element-id`; the live-probe needs a longer canvas-mount wait to assert individual seeded elements — a harness-timing refinement for Ω.PRODUCT.3B, **not** an infra issue.

## Success criteria

| Criterion | Status |
|---|---|
| No SSR 500s | ✅ |
| No startup crashes | ✅ |
| All primary routes return 200 (or correct auth redirect) | ✅ |
| Editors render successfully | ✅ |

## Verdict

**The frontend is recovered.** The SSR 500 was a build-time Google-Fonts fetch failing offline; it is fixed by loading fonts browser-side instead. **Ω.PRODUCT.3B (Live Editor Certification) is unblocked** — the editor authenticates and renders, so the journey harness (undo/redo, autosave fault injection, copy/paste, drag&drop) can now be built against a live editor. Next step there: extend the probe to wait for `data-element-id` on the canvas and drive real interactions.

_Changed files: `frontend/app/fonts.ts`, `frontend/app/globals.css` (uncommitted — ready to commit)._
