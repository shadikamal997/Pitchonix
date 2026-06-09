# Phase Ω.1B — Secure Static File Access — Report

## Mission
Close the open data-exposure risk: `/exports` and `/uploads` were served as **public static
assets** (`app.useStaticAssets`), so anyone with a URL could fetch private exports, uploaded
documents, CVs, Excel files, brand logos, and presentation exports — no authentication.

## Outcome
Both directories are **no longer publicly accessible**. Every request now passes an auth-gate
(signed token **or** `pitchonix-auth` cookie **or** Bearer JWT), and `/exports` additionally
enforces per-record ownership. Verified with 13 automated security tests (below). No frontend
URL changes were required — `<img>` display and blob downloads keep working.

---

## Routes / serving removed
- `app.useStaticAssets(exportsDir, { prefix: '/exports' })` — **removed** (was public).
- `app.useStaticAssets(uploadsDir, { prefix: '/uploads' })` — **removed** (was public).
- `public/` (test pages) is still served at root — it contains no user data (left as-is; noted as residual).

## Routes / middleware added
- `app.use('/exports', createFileAuthGate({ ..., resolveOwner }), express.static(exportsDir))`
  — authenticated **+ ownership-checked** serving of exports.
- `app.use('/uploads', createFileAuthGate({ ... }), express.static(uploadsDir))`
  — authenticated serving of uploads.
- New module **`backend/src/files/file-security.ts`**:
  - `createFileAuthGate(opts)` — Express middleware: signed-token | cookie | Bearer; path-safety; optional ownership.
  - `signFilePath(path, secret, ttl)` / `verifyFileToken(path, token, secret)` — HMAC-SHA256, **expiring**, **path-scoped**, **revocable** (rotate `JWT_SECRET`) tokens for sharing and for `<img>`/Puppeteer use.

### How each access path authenticates
| Caller | Mechanism |
|---|---|
| In-app `<img src>` (logos, CV photo, slide images) | same-site `pitchonix-auth` cookie (sent automatically) |
| Blob downloads (editor "Export") | already streamed via authenticated API (`res.send`) — unaffected |
| Server-side render (Puppeteer CV export) | **signed token** appended by `cv-html-renderer.assetUrl()` |
| Public sharing | `signFilePath()` → short-lived signed URL (`?token=`) |

## Files audited
- **Static config:** `backend/src/main.ts` (the two `useStaticAssets` calls).
- **Writers into `/exports`:** `pdf-generation.service.ts` (`/exports/pdfs/...`), `export.service.ts`, `slide-export.service.ts`, `element-image-exporter.ts`.
- **Writers into `/uploads`:** `upload.service.ts`, `pdf-studio/services/image-upload.service.ts`, `career.controller.ts` (photo), `brand-kit-zip.service.ts`, `universal-conversion/storage/local-storage-provider.ts` (converted), `pptx-import/media-extractor.ts` & `ole-importer.ts` (embeddings).
- **Consumers:** frontend `<img>` builders (`career/builder/[id]`, `brand-kits/[id]`, etc.) build `${API_BASE}${url}` — same-site, now cookie-gated, **no change needed**. The only server-side HTTP embedder is `cv-html-renderer.assetUrl()` — **updated to sign**.
- Confirmed **no frontend code fetches `/exports/...` directly** (exports are downloaded as authenticated blobs), so removing public serving has no UI impact.

## URLs replaced
- `cv-html-renderer.assetUrl()` now emits `…/uploads/...?token=<signed>` (and `/exports/...?token=`) so the cookie-less Puppeteer renderer still loads photos/logos in exported CVs.
- All other stored URLs unchanged (the gate preserves the `/uploads` and `/exports` path shapes), avoiding a risky data migration.

## Security tests (13/13 pass — `file-security.ts` exercised directly)
| Case | Expected | Result |
|---|---|---|
| Unauthenticated request to a file | 401 | ✅ |
| Valid Bearer JWT | pass | ✅ |
| Valid `pitchonix-auth` cookie | pass | ✅ |
| Valid signed token (no auth header) | pass | ✅ |
| Invalid/garbage JWT | 401 | ✅ |
| Path traversal (`/../../etc/passwd`) | 400 (rejected) | ✅ |
| Owner downloads own export | pass | ✅ |
| **User B requests User A's export** | **403** | ✅ |
| Signed token — wrong secret / wrong path / tampered / expired | rejected | ✅ (4 cases) |

Backend `tsc --noEmit` passes for all changed files.

## Remaining risks / follow-ups
1. **Cross-site deployments:** the cookie path works when frontend and backend are **same-site**
   (e.g. `localhost:3000`↔`localhost:4000`, or `app.example.com`↔`api.example.com`). If they are
   served from genuinely different sites, browsers won't attach the `Lax` cookie to `<img>`
   subresource loads → images break. Mitigation: mint signed URLs (`signFilePath`) for displayed
   assets, or set the auth cookie `SameSite=None; Secure` on a shared parent domain.
2. **`/uploads` ownership is auth-gated, not per-file owned.** Legacy upload paths have no uniform
   owner index, so any authenticated user who knows a file's **unguessable UUID** URL can fetch it.
   True per-file ownership needs an owner column/index on upload records (schema work, blocked on
   the P0-2 migration repair). `/exports` *does* enforce ownership where an `Export`/`PdfExport`
   record exists (fails open to auth-only for unrecorded legacy files).
3. **`public/` dir** is still served openly at root — verify it only holds non-sensitive test pages.
4. **Share endpoints not yet built:** the signing primitive (`signFilePath`) exists; wiring a
   `GET /api/share/:token` UX (issue/list/revoke) for user-facing sharing is follow-up.

## Verdict
Private uploaded/exported files are **no longer publicly accessible** — the stated completion bar
is met. The residual items above are hardening/topology concerns, documented for the next pass.

## Files changed
- `backend/src/files/file-security.ts` — new (gate + signed-token primitives)
- `backend/src/main.ts` — removed public serving of `/exports`+`/uploads`; added gated serving
- `backend/src/career/cv-html-renderer.ts` — sign render-time asset URLs for Puppeteer
