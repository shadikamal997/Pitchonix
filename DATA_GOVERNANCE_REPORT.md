# DATA GOVERNANCE REPORT
## Phase Ω.PRODUCT.4 — Phase 7: Storage & Data Retention Certification
**Date:** 2026-06-12  
**Method:** Verified code inspection  
**Scope:** Uploads, exports, ownership, retention policies, soft deletes, recovery

---

## 1. STORAGE ARCHITECTURE

**Source:** `backend/src/main.ts:105-174`

| Directory | Purpose | Access Control |
|----------|---------|---------------|
| `/uploads/` | User-uploaded files (images, documents) | Ownership-gated via `UploadedAsset` table |
| `/exports/` | Generated exports (PPTX, PDF, XLSX) | Ownership-gated via deck/project chain |
| `/public/` | Static assets (templates, logos) | Unprotected — public CDN equivalent |

**Storage provider:** Local filesystem only  
**Cloud storage (S3/GCS/Azure Blob):** ❌ Not implemented  
**CDN:** ❌ Not implemented

---

## 2. UPLOAD OWNERSHIP ENFORCEMENT

**Source:** `backend/src/files/uploaded-asset.service.ts:84-95`

```typescript
async authorize(publicPath, userId): Promise<boolean | null> {
  const asset = await this.findByPublicPath(publicPath);
  if (!asset) return null;              // unknown file → caller decides
  if (asset.deletedAt) return false;   // soft-deleted → deny
  if (asset.visibility === 'public') return true;
  if (!userId) return false;           // unauthenticated → deny
  if (asset.userId === userId) return true;       // owner → allow
  if (asset.project?.userId === userId) return true; // project owner → allow
  return false;
}
```

**UploadedAsset model fields** (`schema.prisma:1999-2024`):
- `userId` — owner
- `sizeBytes` — file size recorded
- `module` — origin module (brand_kit, career_photo, cv_document, pdf_studio, presentation, pptx_import, excel, convert, generic)
- `visibility` — private | shared | public
- `deletedAt` — soft delete

**Strict mode:** `UPLOADS_STRICT_OWNERSHIP=1` env var — files with no `UploadedAsset` record are denied (no legacy fallback)

---

## 3. EXPORT OWNERSHIP ENFORCEMENT

**Source:** `backend/src/main.ts:117-172` (export middleware)

- Caller must own the deck/project that generated the export
- Ownership verified through deck → project → userId chain
- Signed token support for temporary export links
- `/exports/` is not publicly browseable

---

## 4. SOFT DELETES

| Model | Soft Delete Field | Evidence |
|-------|-------------------|---------|
| `Project` | `archivedAt: DateTime?` | `schema.prisma:102` |
| `Comment` | `deletedAt: DateTime?` | `schema.prisma:1167-1168` |
| `UploadedAsset` | `deletedAt: DateTime?` | `schema.prisma:2017` |
| `User` | ❌ None | Hard delete via `DELETE /api/users/me` |
| `Deck` | ❌ None | Hard delete |
| `Workspace` | ❌ None | Hard delete |
| `WorkspaceMember` | ❌ None | Hard delete |
| `PdfDocument` | ❌ None | Hard delete |
| `CvDocument` | ❌ None | Hard delete |
| `ExcelProject` | ❌ None | Hard delete |

**Summary:** Soft deletes exist for Projects (archive), Comments, and Uploads. All other major entities are hard-deleted permanently.

---

## 5. RETENTION POLICIES

### Version Auto-Prune (Decks)
**Source:** `version-history/version-history.service.ts` (`pruneAutoSaves()`)
- Keeps **last 50 AUTO_SAVE + SAFETY versions** per deck
- Older auto-save versions purged automatically after each save
- Manual snapshots retained indefinitely

### Quality History Prune (Decks)
**Source:** `export/services/quality-history.service.ts` (`pruneOldHistory()`)
- Keeps **last 100 quality history entries** per deck
- Best-effort — not guaranteed to run on every operation

### Export Job Cleanup
**Source:** `batch-export.service.ts` (`cleanupOldJobs(daysOld=30)`)
- Purges `ExportJob` records older than 30 days
- **Optional maintenance task** — not automatically scheduled; must be invoked manually

### Beta Telemetry
- **No retention policy** — records accumulate indefinitely
- No scheduled purge

### All Other Data (Users, Projects, Decks, PDFs, CVs, Excel)
- **No retention policy defined**
- Data retained indefinitely unless manually deleted
- No TTL fields, no scheduled cleanup jobs found

---

## 6. STORAGE QUOTA ENFORCEMENT

| Quota Type | Status | Evidence |
|-----------|--------|---------|
| Per-user storage limit | ❌ | `sizeBytes` recorded but never summed or blocked |
| Per-workspace storage limit | ❌ | Not implemented |
| Per-file size limit | ✅ | Request body: 10MB (`main.ts:58-59`) |
| Export quota | ❌ | `exportCount` tracked but never blocked |
| Upload quota | ❌ | Not implemented |

---

## 7. BACKUP & RECOVERY STRATEGY

| Capability | Status |
|-----------|--------|
| Database backup | ❌ Not defined (PostgreSQL, but no backup procedure documented) |
| File system backup | ❌ Not defined |
| Point-in-time recovery | ❌ Not implemented |
| Disaster recovery plan | ❌ Not documented |
| Export-based user data recovery | ⚠️ Version snapshots allow deck recovery; no full data export |
| Self-service data export | ❌ No "download all my data" endpoint |

---

## 8. DATA RESIDENCY & COMPLIANCE

| Capability | Status |
|-----------|--------|
| Data residency controls | ❌ Local only; no region selection |
| GDPR right to erasure | ⚠️ `DELETE /api/users/me` exists but hard-deletes; no audit of deletion |
| GDPR data portability | ❌ No structured data export endpoint |
| Data processing agreements | ❌ Not implemented at platform level |
| PII encryption at rest | ❌ Database fields stored in plaintext (passwords are bcrypt-hashed) |
| PII encryption in transit | ⚠️ Depends on TLS configuration outside the app |

---

## 9. CERTIFICATION SUMMARY

| Domain | Status | Score |
|--------|--------|-------|
| Upload ownership enforcement | ✅ Strong | — |
| Export ownership enforcement | ✅ Strong | — |
| Soft deletes (partial) | ⚠️ 3/10 models | — |
| Retention policies | ⚠️ Minimal | — |
| Storage quotas | ❌ Missing | — |
| Backup strategy | ❌ Missing | — |
| GDPR compliance | ⚠️ Partial | — |
| Cloud storage | ❌ Local only | — |

**Data Governance Score: 50/100**

**To reach enterprise grade:**
1. Implement per-user and per-workspace storage quota enforcement
2. Add soft deletes to `Deck`, `User`, `PdfDocument`, `CvDocument`, `Workspace`
3. Define and automate backup strategy (daily DB dumps + file backup)
4. Add GDPR data export endpoint (structured JSON/ZIP of all user data)
5. Schedule export job cleanup automatically (not manual invocation)
6. Define retention policy for audit logs, telemetry, and content nodes

---

*All findings verified via direct code inspection.*
