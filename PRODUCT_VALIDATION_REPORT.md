# Pitchonix — Product Validation Report

> **STATUS: PARTIAL.** Phase Ω.PRODUCT.1. Every metric below is measured from REAL files that exist in this repository — no data is fabricated or estimated. **This is NOT the 900-document real-user corpus** the phase targets: the available files are predominantly platform-generated exports and uploaded workbooks, not sourced third-party user documents. Drop real documents under `backend/corpus/<category>/` and re-run `npm run validate:corpus` to grow this baseline.

**Generated:** 2026-06-09T10:00:38.267Z

## Corpus Provenance (honesty statement)

- Files were discovered by scanning the repository (excluding `node_modules`, `.next`, `dist`, `.git`).
- Most PPTX/PDF are Pitchonix's own exports; XLSX are previously-uploaded workbooks. They are real files, but they are **not a representative sample of real user inputs**.
- Subjective phases — **Template Quality (1–10)** and **Real User Review** — are reported as `REQUIRES_HUMAN_REVIEW`; they are deliberately left unscored because estimating them would fabricate data.
- Full platform Imported→Rendered→Exported→Reopened **ledger** retention is certified separately at 100% (Ω.CONTENT.3) but on a fixture deck; real-corpus ledger retention requires running real inputs through the live generation pipeline.

## Phase 1 — Document Ingestion (real)

Documents discovered: **197** · Import success: **197/197 (100%)**

| Category | Files | Import OK | Reopen OK | Avg units | Languages |
|---|---:|---:|---:|---:|---|
| excel-workbook | 147 | 147 (100%) | 147 (100%) | 1 | unknown, en |
| pitch-deck | 32 | 32 (100%) | 32 (100%) | 12 | en, unknown |
| uncategorized | 18 | 18 (100%) | 18 (100%) | 21 | en |

| File type | Files | Import OK | Tables | Charts | Images | Total text chars |
|---|---:|---:|---:|---:|---:|---:|
| .pptx | 19 | 19 (100%) | 10 | 0 | 63 | 94,834 |
| .pdf | 26 | 26 (100%) | 0 | 0 | 0 | 68,987 |
| .docx | 5 | 5 (100%) | 3 | 0 | 0 | 2,042 |
| .xlsx | 146 | 146 (100%) | 146 | 0 | 0 | 36,883 |
| .csv | 1 | 1 (100%) | 1 | 0 | 0 | 659 |

## Phase 2 — Content Fidelity (real)

**Authoritative retention** (Imported→Rendered→Exported→Reopened, broken/missing/mutated nodes) is the Universal Content Ledger via `npm run certify:content`. It is certified **100%** but on the Ω.CONTENT.3 fixture deck; real-corpus ledger retention requires running real *input* documents through the live generation pipeline and is **pending a real corpus** (this repo holds exports, not importable user inputs).

**Supplementary signal — cross-format text survival between two existing exports of the same document.** Two complementary measures, both computed from real files:
- **Token coverage** (robust): fraction of distinct content words (≥4 chars) that survive into the other format. Tolerant of PDF reflow.
- **Phrase survival** (strict): fraction of 8-token contiguous phrases that survive. Undercounts when a format re-wraps text.

| Document family | From → To | Token coverage | Phrase survival |
|---|---|---:|---:|
| cykel-pitch-deck | pdf (cykel-pitch-deck-1779277319142.pdf) → pptx (cykel-pitch-deck-1779277344953.pptx) | 226/228 (99.1%) | 84/114 (73.7%) |
| pitch-deck | pdf (pitch-deck.pdf) → pptx (pitch-deck.pptx) | 55/67 (82.1%) | 26/49 (53.1%) |
| pitchonix-pitch-deck | pdf (pitchonix-pitch-deck-1779228667257.pdf) → pptx (pitchonix-pitch-deck-1779228736017.pptx) | 316/316 (100%) | 96/114 (84.2%) |

**Average across 3 text-extractable family pair(s): token coverage 93.7%, phrase survival 70.3%.**

Pairs excluded from the measurement (NOT counted as loss — these are not valid text-to-text comparisons):

| Document family | From → To | Excluded because |
|---|---|---|
| components | pptx (components.pptx) → pdf (components.pdf) | negligible token overlap — likely unrelated artifacts sharing a name prefix, not the same document |
| ledger-deck | pptx (ledger-deck-1780949499882.pptx) → pdf (ledger-deck-1780950336085.pdf) | target has no extractable text layer (image-based export) — not text-verifiable |
| masters | pptx (masters.pptx) → pdf (masters.pdf) | negligible token overlap — likely unrelated artifacts sharing a name prefix, not the same document |
| matrix | pptx (matrix.pptx) → pdf (matrix.pdf) | negligible token overlap — likely unrelated artifacts sharing a name prefix, not the same document |

> ⚠️ Cross-format survival is a supplementary integrity signal on already-exported files, **not** the platform's authoritative content-retention figure. Low values here reflect format/text-layer differences (e.g. image-based PDFs) or unrelated test artifacts — not measured pipeline loss.

## Phase 3 — Template Quality

**`REQUIRES_HUMAN_REVIEW` — not scored.** A 1–10 aesthetic score for layout, hierarchy, typography, readability, visual balance and professional appearance cannot be measured from files without human judgment, and is not estimated here. Objective structural signals that CAN be measured (real):

| Category | Docs | Avg units | Avg text/unit | Empty units | Has-title rate (decks) |
|---|---:|---:|---:|---:|---:|
| excel-workbook | 147 | 1 | 39 | 34 | n/a* |
| pitch-deck | 32 | 12 | 349 | 0 | n/a* |
| uncategorized | 18 | 21 | 184 | 0 | n/a* |

_*title detection per slide requires the live deck model; not derivable from flat export text. Use a human-review intake (below) for true template scores._

## Phase 4 — Export / Reopen Integrity (real)

Every discovered export was re-opened with standard tooling and re-extracted; success = opens without corruption AND yields stable extractable content.

- Reopen success: **197/197 (100%)**

| File type | Reopen OK | Corrupt / unreadable |
|---|---:|---:|
| .pptx | 19/19 (100%) | 0 |
| .pdf | 26/26 (100%) | 0 |
| .docx | 5/5 (100%) | 0 |
| .xlsx | 146/146 (100%) | 0 |
| .csv | 1/1 (100%) | 0 |

## Phase 5 — Real User Review

**`REQUIRES_HUMAN_REVIEW` — not run.** "Looks professional / ready to send / needs fixes / unusable" requires real human reviewers. A structured intake template is provided at `certification-reports/human-review-intake.md` for reviewers to fill; results are not invented here.

## Phase 6 — Failure Analysis (real)

No import/reopen failures across the discovered corpus. ✅

## Phase 8 — Performance (real, parse/extract only)

Measured wall-clock for parse+extract (not full render/export, which need the live pipeline):

- Documents timed: 127 · p50 **1ms** · p95 **43ms** · max **110ms**

| File type | n | p50 ms | max ms | largest file |
|---|---:|---:|---:|---|
| .pptx | 19 | 2 | 28 | 1975KB |
| .pdf | 26 | 18 | 110 | 1879KB |
| .docx | 5 | 5 | 29 | 8KB |
| .xlsx | 146 | 1 | 8 | 80KB |
| .csv | 1 | 1 | 1 | 1KB |

## Phase 9 — Product Scorecard (objective signals only)

Machine-verifiable pass rates per studio surface. User-satisfaction / aesthetic scores are `REQUIRES_HUMAN_REVIEW`.

| Studio / surface | Docs | Import OK | Reopen OK | Satisfaction |
|---|---:|---:|---:|---|
| Presentation (PPTX) | 35 | 100% | 100% | REQUIRES_HUMAN_REVIEW |
| PDF Studio (PDF) | 26 | 100% | 100% | REQUIRES_HUMAN_REVIEW |
| Career / CV Studio | 0 | — | — | REQUIRES_HUMAN_REVIEW |
| Excel Studio (XLSX/CSV) | 147 | 100% | 100% | REQUIRES_HUMAN_REVIEW |
| Convert (DOCX) | 5 | 100% | 100% | REQUIRES_HUMAN_REVIEW |

## Success Criteria — measured vs target (PARTIAL)

| Criterion | Target | Measured (partial) | Status |
|---|---|---|---|
| Import success | ≥95% | 100% (n=197) | ✅ (partial corpus) |
| Content retention (ledger) | ≥99% | 100% on fixtures (Ω.CONTENT.3); real-corpus pending live pipeline | ⚠️ pending real inputs |
| — cross-format text survival | (signal) | token coverage 93.7% over 3 real pair(s) | ℹ️ supplementary |
| Export success (reopen integrity) | ≥95% | 100% reopen (n=197) | ✅ (partial) |
| Template score | ≥8/10 | REQUIRES_HUMAN_REVIEW | ⚠️ not scored (no fabrication) |
| User satisfaction | ≥8/10 | REQUIRES_HUMAN_REVIEW | ⚠️ not scored (no fabrication) |

## Verdict

This PARTIAL baseline establishes that the discovered real files ingest and re-open cleanly and that cross-format text fidelity is measurable on real exports. **It does NOT satisfy Ω.PRODUCT.1's exit criteria**, which require a real 900-document user corpus, human template scoring, and human review. Those remain open by design — supply `backend/corpus/<category>/` and add human reviews to complete the phase.
