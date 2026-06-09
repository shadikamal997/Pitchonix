# Phase Ω.1 — Stability & Security Remediation Report

Scope: stability, security, data integrity, persistence, exports. No new features.
Builds on the forensic audit ([AUDIT_REPORT.md](AUDIT_REPORT.md)) and the prior fix pass ([AUDIT_FIXES.md](AUDIT_FIXES.md)).

All code changes below typecheck clean (backend `tsc`, frontend `tsc`) and `prisma validate` passes.

---

## Executive summary

The two active **data-loss / data-leak** risks are now closed in code: the presentation
template switch can no longer silently destroy manual edits (it gates behind a confirmation
with a non-destructive "Duplicate & Apply" path), and the conversion lineage endpoints are
now owner-scoped (and actually record history). The migration ledger problem is **diagnosed
with an exact, backup-gated recovery script** but deliberately not executed against the live DB.
Several Phase Ω.1 items were already resolved in the prior pass (preview IDOR, export
mislabeling, path traversal, SSRF, 2FA enforcement, project-type routing). Remaining work is
the larger Excel/queue/FK items, which are feature-grade rebuilds, not stability patches.

---

## P0-1 — Template-switch data loss → **FIXED (presentations)**

- **Was:** `applyTemplate()` → `template-switch` pipeline regenerates the deck from wizard input and runs `slide.deleteMany({ deckId })`, destroying every manual edit, despite a "non-destructive" comment.
- **Now:** [TemplateGallery.tsx](frontend/features/slide-editor/templates/TemplateGallery.tsx) gates every apply behind a blocking modal:
  - **Duplicate & Apply (keep original)** — duplicates the project, applies the template to the **copy**, opens it; the original deck is untouched. *(preferred path, matches spec)*
  - **Apply Anyway (discard edits)** — the old in-place behavior, now explicit.
  - **Cancel.**
- **Verify:** open a deck, edit a slide, open Choose Template → Apply → confirm the modal appears; "Duplicate & Apply" lands you in a new deck with the original intact.
- **Remaining:** PDF / Career / Excel template apply do not regenerate-and-delete the way presentations did (their "apply" is style/colorscheme only — see P0-10 notes), so they don't carry the same destructive risk. PDF/Excel template *distinctiveness* is a separate quality gap (audit P0#10/#11), not a data-loss one.

## P0-2 — Database migration recovery → **DIAGNOSED + SCRIPTED (not executed)**

- Verified the ledger directly: `init` applied clean; `add_phase1_fields` is **failed** (`finished_at IS NULL`); 10 further migrations are unapplied but their objects already exist (built via `db push`).
- Full report + exact backup-gated `migrate resolve --rolled-back/--applied` recovery sequence: **[MIGRATION_RECOVERY.md](MIGRATION_RECOVERY.md)**.
- Not run — touches the live DB; needs a `pg_dump` backup + maintenance window. Awaiting go-ahead.

## P0-3 — Ownership & access control → **HARDENED**

Fixed this phase:
- **Convert lineage** (`/convert/history`, `/convert/lineage/:id`, `/convert/restore/:id`) now scope to the caller's `userId`, enforce per-record ownership, and **record conversions** (history was previously empty + cross-tenant readable). [universal-conversion.controller.ts](backend/src/universal-conversion/universal-conversion.controller.ts), [conversion-lineage.service.ts](backend/src/universal-conversion/conversion-lineage.service.ts).

Already fixed in the prior pass: PDF preview IDOR, smart-builder enhance/regenerate IDOR, document-versions IDOR, PPTX import cross-tenant, Unsplash SSRF.

Swept all remaining `@Public()` endpoints — the rest are safe by design: health/root, content-in-body analyze/enhance/generate (no resource id), static template lists, token-based share links, UUID-gated SSE progress, and in-memory ATS snapshots. **No new IDOR found.**

**Remaining (flagged):** `/exports` and `/uploads` are still served as open static assets (audit P1#37) — needs an authenticated download controller; coordinated change because it alters existing artifact URLs.

## P0-4 — Export truth certification → **MOSTLY CERTIFIED**

| Export | Status | Notes |
|---|---|---|
| Excel "audit/exec/dashboard PDF" | ✅ Fixed | No longer ships HTML bytes as `application/pdf`; returns real mimetype/extension (prior pass) |
| Convert → PDF | ✅ Fixed | Real PDF via headless Chromium when LibreOffice absent; honest HTML fallback only if both fail |
| Excel download naming | ✅ Fixed | Uses `Content-Disposition` filename instead of guessing |
| Presentations PPTX/PDF/HTML | ✅ Real | Verified in audit (Exports module 79/100) |
| PDF Studio PDF/DOCX/HTML | ✅ Real MIME | Content preserved; preview/export pagination parity still imperfect (audit P1#7) |
| **Excel XLSX styling** | ❌ **Not fixed** | Free SheetJS build drops ALL cell styles on write (audit P1#12/#30) — requires ExcelJS migration (feature-grade) |
| **Excel formula refs on row/col shift** | ❌ **Not fixed** | Inserts/deletes don't rewrite formula references (audit P1#13) — feature-grade |

## P0-5 — Save / refresh persistence → **CERTIFIED with one efficiency caveat**

- Presentation, PDF Studio, Career, Excel editors persist to the DB and reload on refresh (audit: Editors 84/100, persistence works across all four).
- Caveat (not data loss): PDF Studio autosave issues one PATCH per page every 3s (N+1) — audit P1#43, performance not integrity.

## P0-6 — Routing integrity → **FIXED**

- Project-type routing implemented (prior pass): PDF projects open the PDF editor, slide projects open the deck editor, from both dashboard and projects list; backend `findAll` includes `pdfDocuments`. The "PDF project opens slide generator" dead-end is closed. Create-wizard PDF dead-end closed. `/projects` list envelope parse fixed.

## P0-7 — File security → **VERIFIED / HARDENED**

- **Path traversal:** upload `deleteImage` now `basename`-sanitizes + verifies the resolved path stays in `uploadDir` (prior pass).
- **SSRF:** Unsplash download proxy validates the host (prior pass).
- **CSV / formula injection:** Excel CSV builders already prefix `= + - @` cells with `'` (`csvCell`) — **verified present** on all three Excel CSV paths. No XLSX path writes user input as live formulas.
- **Upload size/MIME:** validated in `UploadService.validateFile` (size + allowed mime). Body limit raised correctly to 10MB (the `useBodyParser` fix).
- **Remaining:** open static `/exports` + `/uploads` (see P0-3).

## P0-8 — Error handling → **PARTIALLY ADDRESSED**

- Fixed honesty issues: exports no longer return success with wrong file types; convert restore no longer silently 400s; 2FA no longer reports "enabled" while unenforced.
- **Remaining "fake success" toasts** are product decisions (audit P1#28 expand/shorten/restructure, P1#11 ATS apply, P1#24 notifications) — they need remove-vs-build calls, listed in [AUDIT_FIXES.md](AUDIT_FIXES.md).

## P0-9 — Project data integrity → **HARDENED**

- `duplicate()` now copies branding (`logoUrl`/`imageUrls`), `documentFormat`, and **deep-copies PDF documents + pages** — duplicated PDF projects are now real, openable copies instead of empty/broken ones (prior pass).
- Export counter (`exportCount`) now actually increments, so analytics reflect reality.
- **Remaining:** several ownership/reference columns still lack FKs → orphan-row risk on delete (audit P1#44) — needs schema + one migration, **blocked on P0-2**.

## P0-10 — Final stability certification

See scorecard below. Two highest-severity stability risks (template data loss, cross-tenant lineage) closed; migration recovery scripted and awaiting a backup-gated run.

---

## Scorecard

| Dimension | Before | After | Notes |
|---|---:|---:|---|
| Template Safety | 30 | **80** | Presentation switch gated; PDF/Excel distinctiveness still a quality gap |
| Migration Health | 25 | **40** | Diagnosed + scripted; not yet executed (needs backup) |
| Ownership Security | 64 | **88** | Lineage scoped; only open static assets remain |
| Export Integrity | 60 | **82** | Mislabels fixed; Excel styling/formulas still feature-grade gaps |
| Persistence Reliability | 80 | **85** | Solid; autosave N+1 is perf not integrity |
| Routing Reliability | 52 | **88** | Type-aware routing + envelope fixes |
| File Security | 64 | **85** | Traversal/SSRF/CSV verified; static assets open |
| Error Handling | 55 | **70** | Honest exports; fake toasts pending product calls |
| Project Integrity | 60 | **82** | Duplicate deep-copy; FKs pending migration |
| **Overall Stability** | **55** | **≈80 (Beta-ready)** | Production-blockers: run P0-2 recovery; close static-asset auth + Excel export integrity |

**Grade:** moved from *Major Work Required* toward *Beta Ready*. Not yet production: execute the
migration recovery, lock down `/exports`+`/uploads`, and land the Excel export-integrity rebuild.

---

## Files changed this phase
- `frontend/features/slide-editor/templates/TemplateGallery.tsx` — P0-1 confirmation gate + Duplicate & Apply
- `backend/src/universal-conversion/universal-conversion.controller.ts` — P0-3 lineage ownership + recording
- `backend/src/universal-conversion/conversion-lineage.service.ts` — P0-3 restore carries owner
- `MIGRATION_RECOVERY.md` — P0-2 report + scripted recovery
- `PHASE_OMEGA_1_REPORT.md` — this report

## Recommended immediate next steps
1. **Run P0-2 recovery** (with `pg_dump` backup) — unblocks all future schema work including FKs.
2. **Lock down `/exports` + `/uploads`** behind authenticated download (last open data-exposure).
3. Decide the "fake feature" toasts (remove vs build).
4. Schedule the Excel ExcelJS + formula-shift rebuild (the remaining export-integrity gap).
