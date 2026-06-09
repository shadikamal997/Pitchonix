# Phase Ω.1D — /uploads Per-File Ownership — Final Report

**Status: COMPLETE ✅** — `/uploads` is now **owner-gated**, not just auth-gated. A logged-in
user can no longer fetch another user's private uploaded file. Verified with 13 ownership tests.

---

## Schema changes (Phase 1–2)
New model **`UploadedAsset`** (table `uploaded_assets`):

| field | notes |
|---|---|
| id, userId (FK→users, cascade), workspaceId?, projectId? (FK→projects, set null), documentId? (soft ref) | ownership |
| module | brand_kit / career_photo / cv_document / pdf_studio / presentation / pptx_import / excel / convert / generic |
| storagePath **(unique)**, publicPath **(unique)** | disk path + served URL (gate matches on publicPath) |
| originalName, mimeType, sizeBytes, checksum? | metadata |
| visibility | `private` (default) / `shared` / `public` |
| createdAt, updatedAt, deletedAt? | lifecycle / soft-delete |

Indexes: `userId`, `projectId`, `documentId`, `module`, + unique on `storagePath` & `publicPath`.
Back-relations added to `User.uploadedAssets` and `Project.uploadedAssets`.

**Migration:** `20260605010000_add_uploaded_assets` authored from the exact `migrate diff` SQL and applied via **`prisma migrate deploy`** (clean ledger from Phase Ω.1C made this trivial). Verified: table + 7 indexes + 2 FKs present, `migrate status` up-to-date, **no drift** ("empty migration"), `prisma validate` ✓, `prisma generate` ✓, backend `tsc` clean. Existing uploads untouched.

## Upload writes updated (Phase 4)
New global **`FilesModule`** provides **`UploadedAssetService`** (`record` upserts by `publicPath`; `authorize` returns `true`/`false`/`null`). Wired into the live write paths:

| Endpoint | Module tag |
|---|---|
| `POST /upload/image`, `/upload/images`, `/upload/thumbnail` (brand logos, wizard logos, generic) | `generic` |
| `POST /pdf-studio/images/upload` (+ base64) | `pdf_studio` |
| `POST /career/profile/photo` | `career_photo` |

Each now writes an `UploadedAsset` row (best-effort — a metadata failure never breaks the upload). Remaining writers (PPTX media/OLE `embeddings`, converted files, excel uploads) are internal artifacts or already owner-tracked elsewhere — noted under remaining risks.

## /uploads gate upgraded (Phase 5)
The Ω.1B auth-gate is now an **ownership-gate** (`createFileAuthGate` + `resolveUploadOwner` → `UploadedAssetService.authorize`):

- **visibility=private** → authenticated **and** (owns asset OR owns parent project); else **403**.
- **visibility=shared** → requires a valid **signed token** (checked first), else owner-only.
- **visibility=public** → allowed.
- **soft-deleted** → denied.
- **no row (legacy/orphan)** → falls back to **auth-only** by default, or **403** when
  `UPLOADS_STRICT_OWNERSHIP=1`. (Default preserves existing functionality; flip to strict once an environment's backfill coverage is confirmed.)
- **path traversal** → 400. **unknown/unauth** → 401/403, never leaks filesystem info.

## Signed URLs (Phase 6)
The `signFilePath`/`verifyFileToken` HMAC primitives (path-scoped, expiring, revocable via secret rotation) from Ω.1B are reused. The CV Puppeteer renderer already mints signed photo/logo URLs (`cv-html-renderer.assetUrl`), and the gate checks a valid token **before** ownership — so server-side exports and shared links work without a session cookie. Test 5/6/7 below confirm token accept/expire/tamper behavior.

## Backfill (Phase 3)
`scripts/backfill-uploaded-assets.js` mapped on-disk files to owners via existing DB references (brand kit logos, brand assets, project logo/images, CV photos, converted files, pdf-studio images). Report saved to `backend/backups/uploads-backfill-report-*.json`.

| | count |
|---|---|
| Files on disk | 559 |
| **Mapped → owned** | 1 (career_photo — the one in-use photo) |
| Orphaned (no DB owner) | 558 |
| — `embeddings/` (PPTX/OLE import artifacts, internal) | 278 |
| — `images/` (unreferenced legacy/test uploads) | 260 |
| — `excel-studio/` (workbook upload artifacts) | 21 |

The orphans were verified **genuinely unreferenced** — zero references in slides, slide elements, `projects.businessInfo`, brand kits, or cv_documents, and `uploaded_images` is empty. Per the rules, **no orphaned file was deleted**. They remain inaccessible to the public (auth-gated; denied entirely under strict mode), satisfying criterion 9.

## Security tests (Phase 7 — 13/13 pass, real DB)
| # | Spec test | Result |
|---|---|---|
| 1/4 | Unauthenticated cannot view/download | 401 ✅ |
| 2 | Owner (User A) can view/download | pass ✅ |
| **3** | **User B cannot view User A's file** | **403 ✅** |
| 5 | Signed token works | pass ✅ |
| 6 | Expired token fails | 401 ✅ |
| 7 | Tampered token fails | 401 ✅ |
| 8 | Path traversal fails | 400 ✅ |
| 9 | Orphaned file not publicly accessible | 401 unauth ✅ / 403 strict ✅ |
| 10 | Existing CV/photo/logo rendering still works | owner cookie authorizes ✅ (orphans fall back to authed) |
| 11 | Puppeteer export loads signed assets | signed token bypasses ownership ✅ |

`authorize()` unit checks also pass (owner→true, non-owner→false, unknown→null).

## Orphaned files
- Count: **558** (278 embeddings, 260 images, 21 excel-studio). Full list: `backend/backups/uploads-backfill-report-20260605-154424.json`.
- All verified unreferenced in the DB; **not deleted**.

## Remaining risks / follow-ups
1. **Default is non-strict** so un-backfilled/orphan files fall back to *authenticated-user* access (not public). To make `/uploads` fully owner-gated with no fallback, set `UPLOADS_STRICT_OWNERSHIP=1` once you've confirmed every in-use file has an `UploadedAsset` row in that environment. (Tested: strict mode denies orphans with 403.)
2. **Writers not yet recording:** PPTX `embeddings`/media extraction, universal-conversion stored files, and excel-studio uploads don't yet create `UploadedAsset` rows. They're internal artifacts (not browser-served), but wiring them is the path to safely enabling strict mode everywhere.
3. **Cross-site cookie caveat** (from Ω.1B) still applies for `<img>` display when frontend/backend are different sites — use signed URLs there.
4. **Production parity:** run the same backfill on prod/staging before enabling strict mode there.

## Success criteria — met
✅ `/uploads` is no longer just auth-gated — it is **owner-gated**. ✅ No logged-in user can access another user's private uploaded file (Test 3: User B → 403). ✅ Existing uploads not broken (non-strict fallback + backfill). ✅ Orphans preserved, never public.

## Files changed
- `backend/prisma/schema.prisma` — `UploadedAsset` model + relations
- `backend/prisma/migrations/20260605010000_add_uploaded_assets/migration.sql` — new
- `backend/src/files/uploaded-asset.service.ts`, `files.module.ts` — new
- `backend/src/app.module.ts` — register `FilesModule`
- `backend/src/main.ts` — `/uploads` ownership-gate + strict flag
- `backend/src/upload/upload.controller.ts` + `upload.service.ts` — record on generic uploads
- `backend/src/pdf-studio/services/image-upload.service.ts` — record on PDF uploads
- `backend/src/career/career.controller.ts` — record on CV photo upload
- `backend/scripts/backfill-uploaded-assets.js` — backfill (+ report in `backups/`)
