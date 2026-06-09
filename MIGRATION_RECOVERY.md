# Migration Recovery Report (P0-2)

## Verified current state (live DB: `postgresql://shadi@localhost:5432/pitchonix`)

`_prisma_migrations` ledger contains only **2 rows**:

| migration | applied_steps | finished_at | rolled_back | state |
|---|---|---|---|---|
| `20260504125149_init` | 0 | set | no | applied (clean) |
| `20260504163331_add_phase1_fields` | 0 | **NULL** | no | **FAILED / unfinished** |

`prisma migrate status` reports **10 migrations as "not yet applied":**
`add_quality_control_fields`, `add_export_templates_quality_history`, `add_pdf_studio_tables`,
`add_image_fields_to_project`, `add_pdf_studio_smart_builder`, `phase_42_4_cv_analysis_snapshots`,
`phase_42_8_cv_section_mapping_memory`, `add_pro_template_fields_to_pdf_documents`,
`add_excel_studio`, `excel_workbook_operations`.

12 migration directories exist on disk (not 13 as the first audit pass estimated).

## Diagnosis

- The schema was built with **`prisma db push`** (raw sync), not migrations. Every table/column the 10 "pending" migrations would create **already exists** in the live DB.
- `20260504163331_add_phase1_fields` is in a **failed state** (`finished_at IS NULL`, `applied_steps_count=0`) — it died mid-apply with Postgres `42701 column "audience" already exists` (the column was already there from `db push`). **A failed row makes Prisma refuse all future `migrate dev` / `migrate deploy` runs.**
- Net: schema is correct at runtime, but the **migration ledger is desynced** from reality. Any deploy that runs `migrate deploy` will fail.

## Drift
No structural drift was found between `schema.prisma` and the live DB for the audited models (the failure is ledger bookkeeping, not schema drift). The one schema change added this phase — `@@index([userId, archivedAt])` on `projects` — is **not yet in the DB** and must be applied (step 5 below).

## Recovery plan — DO NOT run without a backup

> All commands run from `backend/`. This is a **baseline** strategy: declare the
> already-present schema as "applied" so the ledger matches reality, then switch
> to migrations going forward.

```bash
# 1. BACK UP FIRST (non-negotiable)
pg_dump "postgresql://shadi@localhost:5432/pitchonix" > pitchonix-backup-$(date +%Y%m%d-%H%M%S).sql

# 2. Clear the failed migration row (its objects already exist in the DB)
npx prisma migrate resolve --rolled-back 20260504163331_add_phase1_fields

# 3. Baseline every migration whose objects already exist as "applied"
for m in \
  20260504163331_add_phase1_fields \
  20260505065719_add_quality_control_fields \
  20260505075803_add_export_templates_quality_history \
  20260505100245_add_pdf_studio_tables \
  20260505184144_add_image_fields_to_project \
  20260506074744_add_pdf_studio_smart_builder \
  20260525000000_phase_42_4_cv_analysis_snapshots \
  20260525120000_phase_42_8_cv_section_mapping_memory \
  20260531000000_add_pro_template_fields_to_pdf_documents \
  20260602000000_add_excel_studio \
  20260603090000_excel_workbook_operations ; do
  npx prisma migrate resolve --applied "$m"
done

# 4. Confirm the ledger is now clean
npx prisma migrate status        # expect: "Database schema is up to date!"

# 5. Apply the one genuinely-new change (projects(userId,archivedAt) index).
#    Generate a migration for it now that the ledger is healthy:
npx prisma migrate dev --name add_projects_userid_archivedat_index
#    (or, if you must avoid migrate dev in this env: npx prisma db push)
```

## Hardening (after recovery)

- Add `npx prisma migrate deploy` to the deploy/boot pipeline; **stop using `db push`** outside local throwaway DBs.
- Add CI that runs **all** migrations against a clean Postgres to prove they apply end-to-end (this is what would have caught the failed row).
- Take a `pg_dump` before each deploy until the pipeline is trusted.

## Status
**EXECUTED ✅ (2026-06-05, local/dev)** — backup taken (`backend/backups/pitchonix-pre-migration-recovery-20260605-150012.sql`, 72.6 MB), failed migration repaired, all 10 unapplied migrations resolved, ledger clean (13 applied, 0 failed), zero data loss, and a new index migration applied via `migrate deploy` to prove future migrations run. Full details in **PHASE_OMEGA_1C_REPORT.md**. Production/staging DBs (if any) still need the same backup-first repair.
