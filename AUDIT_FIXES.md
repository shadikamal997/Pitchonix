# Pitchonix Audit — Fixes Applied & Remaining Work

Companion to **AUDIT_REPORT.md** (full 20-section forensic report). This file records
what was fixed in this pass and what is deliberately deferred (with reasons).

Audit result: **61/100 — Major Work Required.** 14 P0 · 45 P1 · 33 P2 · 23 P3 (1 refuted).

---

## ✅ Fixed in this pass

### P0 (10 of 14)
| # | Module | Fix | Files |
|---|--------|-----|-------|
| 1 | Create New | PDF wizard now routes to `/pdf-studio/editor/{pdfDocumentId}` instead of the deck-only project page (used returned id) | `frontend/app/create/page.tsx` |
| 2 | Projects | `/projects` list now reads the `{ data, meta }` envelope instead of dropping it → list renders | `frontend/app/projects/page.tsx` |
| 3 | Projects | Project-type routing: PDF projects open PDF editor (dashboard + projects), backend `findAll` now includes `pdfDocuments` | `frontend/app/dashboard/page.tsx`, `frontend/app/projects/page.tsx`, `backend/src/projects/projects.service.ts` |
| 4 | Brand Kits | `applyToDeck` now writes each slide's `themeTokens` in the renderer's shape (`accent/accent2/text/...`) so branding actually shows in preview/export | `backend/src/brand-kits/brand-kits.service.ts` |
| 5 | Brand Kits | Dashboard upload now posts the correct multipart field name `file` (was `image`, rejected by Multer) | `frontend/features/brand-kits/useBrandKits.ts` |
| 6 | Convert | PDF conversion now renders a **real PDF via headless Chromium** when LibreOffice is absent; falls back to honestly-labelled HTML only if both fail | `backend/src/universal-conversion/exporters/pdf-exporter.ts` |
| 7 | Analytics/Dashboard | `exportCount` is now incremented on successful deck exports and PDF Studio exports; dashboard "Exports" metric reads the real count | `backend/src/export/export.service.ts`, `backend/src/pdf-studio/controllers/pdf-export.controller.ts`, `frontend/app/dashboard/page.tsx` |
| 8 | Settings/Auth | **2FA is now enforced at login** — password alone no longer yields a token; backend challenges for a TOTP code and verifies it; login UI prompts for the code | `backend/src/auth/auth.service.ts`, `backend/src/auth/dto/auth.dto.ts`, `frontend/app/login/page.tsx` |
| 12 | Exports | Excel report "PDF" export no longer mislabels HTML bytes as `application/pdf` — `buildReportPdf` returns real mimetype/extension and the caller honours them | `backend/src/excel-studio/excel-studio.service.ts` |
| 13 | Security | PDF preview endpoint is no longer `@Public()` — requires `JwtAuthGuard` + ownership check (fixes unauthenticated document disclosure / IDOR). Verified the preview pane fetches with the bearer token, so nothing breaks | `backend/src/pdf-studio/controllers/pdf-export.controller.ts` |

### P1 (selected — security + cheap correctness)
| # | Module | Fix | Files |
|---|--------|-----|-------|
| 1 | Dashboard | "Exports" stat now sums real `exportCount` | `frontend/app/dashboard/page.tsx` |
| 2 | Dashboard | Status filter chips fixed to real enum (`Completed`/`Failed`, was never-matching `Generated`/`Exported`) | `frontend/app/dashboard/page.tsx` |
| 5 | Projects | `duplicate()` now copies `logoUrl`, `imageUrls`, `documentFormat` and **deep-copies PDF documents + pages** (PDF copies were previously empty/broken) | `backend/src/projects/projects.service.ts` |
| 10/33 | Security | Ownership checks added to smart-builder `enhance` and `regenerate-section` (was IDOR write) | `backend/src/pdf-studio/controllers/smart-builder.controller.ts` |
| 17 | Convert | Restore now sends `targetFormat` as the query param the backend requires (was always 400) | `frontend/app/convert/page.tsx` |
| 20 | Import PPTX | `into-project` now verifies project ownership (was cross-tenant import) | `backend/src/pptx-import/pptx-import.controller.ts` |
| 25 | Settings | Delete-account uses the in-app confirm modal instead of native `confirm()` | `frontend/app/settings/page.tsx` |
| 29/12 | Exports | (same fix as P0#12) | — |
| 31 | Excel Studio | Download filename/extension now taken from `Content-Disposition` instead of guessed from the format string | `frontend/app/excel-studio/editor/[id]/page.tsx` |
| 32 | Security | `DocumentVersionsController` list/create/restore now enforce document ownership (was IDOR) | `backend/src/document-versions/document-versions.controller.ts` |
| 34 | Security | Unsplash download proxy now validates the URL host (SSRF + API-key-leak guard) | `backend/src/integrations/unsplash/unsplash.controller.ts` |
| 35 | Security | Upload `deleteImage` now blocks path traversal (`basename` + resolved-path containment) | `backend/src/upload/upload.service.ts` |
| 45 | Database | Added `@@index([userId, archivedAt])` to Project (hot list query) — **needs `prisma db push` to apply** | `backend/prisma/schema.prisma` |

**Verification:** backend `tsc --noEmit` clean, frontend `tsc --noEmit` clean on all edited files, `prisma validate` passes.

---

## ⚠️ Requires your decision / action

### P0#14 — Broken migration history (operational, do NOT auto-run)
The live DB was built with `prisma db push`; migration `20260504163331_add_phase1_fields`
is in a FAILED state and Prisma will refuse future migrations. Fixing means running
`prisma migrate resolve --rolled-back …` then baselining existing migrations as `--applied`
against the **live database** — environment-specific and destructive if done wrong.
**Recommended:** do this in a maintenance window with a DB backup. I can prepare the exact
command sequence on request. (The new index in P1#45 also needs `prisma db push` until this is resolved.)

### Large feature gaps (multi-day; flagged, not faked over)
- **P0#10** PDF Studio standard templates all render one structure — `templateConfig.layouts` is never consumed. Real fix = drive composition from declared layouts. Interim honest option: collapse the catalog to the genuinely-distinct style variants.
- **P0#11 / P1#14/#15** Excel templates all emit identical sheet structure; descriptions promise sheets that don't exist. Real fix = per-template sheet generators. Interim = rewrite catalog copy to match reality.
- **P0#9 / P1#6** Presentation "apply template" **regenerates from wizard input and `deleteMany`s slides**, destroying manual edits despite a "non-destructive" comment. Needs either a true in-place re-theme or, at minimum, a blocking "edits will be lost" confirmation. **High data-loss risk — recommend the confirmation gate immediately.**
- **P1#12/#13/#30/#39** Excel: free SheetJS build drops all cell styling; row/col insert doesn't rewrite formula refs; styled exports are metadata-only; operations replayed uncached on every read. Real fix = migrate the styled-write path to **ExcelJS** + formula-offset logic + caching.
- **P1#38/#40/#41/#42/#43** Performance: per-request Chromium launches, inline OCR on the event loop, in-memory cache that can't scale, fire-and-forget "queues" that orphan on restart, autosave N+1. Each is multi-day (Bull queues / browser pool / Redis cache / batch endpoint).
- **P1#44** Schema: several ownership/reference columns lack FKs → orphan rows. Needs schema + one migration (blocked on P0#14).

### Product-decision "fake feature" items (relabel vs build)
- **P1#28** PDF Studio Expand/Shorten/Restructure run the same grammar regex and lie via toasts → remove/relabel or implement real LLM ops.
- **P1#11** Career ATS "Apply Fix"/"Apply All" is fake (navigates away, backend returns hardcoded success).
- **P1#24** Settings Notifications saves nothing (and overwrites name).
- **P1#26** Help "Contact Support" is mailto-only while a full contact backend ships dead.
- **P1#18** Convert advertises Images→PDF / PDF→images / CSV→XLSX that don't exist.
Tell me, per item, "remove/relabel" or "build it" and I'll proceed.

### Remaining security (medium)
- **P1#19/#36** Convert lineage/history/result endpoints aren't user-scoped (cross-tenant metadata leak). Needs `userId` on lineage records + filtering on every read (~4-8h).
- **P1#37** `/exports` (and `/uploads`) are served as open static assets with no auth — anyone with a URL can fetch any tenant's artifact. Needs an authenticated download controller; changing this affects existing download URLs, so it's a coordinated change.
- **P1#9** Delete the duplicate insecure `DocumentVersionsModule` (now ownership-guarded, but still redundant with the secure `PdfDocumentsController` versions routes).

---

## Suggested next order
1. **P0#9 confirmation gate** (stops active data loss) + **P0#14 migration repair** (unblocks all schema work).
2. Decide the "fake feature" items (remove vs build) — quick wins for honesty.
3. ExcelJS migration (unblocks P1#12/#13/#30) and the queue/perf cluster.
4. Template-layout work (P0#10/#11) — the biggest "looks done but isn't" gap.
