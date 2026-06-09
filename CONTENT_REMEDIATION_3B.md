# Phase Ω.CONTENT.3B — Certification Remediation & Clean Baseline

> Scoring formula unchanged. Thresholds unchanged. No failures hidden.
> The three Ω.CONTENT.3A root causes were fixed at source, then the affected
> ledger data was refreshed (non-destructively) and the baseline reset.

## Result

| | Before (3A) | After (3B) |
|---|---|---|
| Platform grade | **F** | **A+** |
| Effective retention | 84.8% | **100.0%** |
| Broken nodes | 35 | **0** |
| Imported / Reopened | 230 / 195 | 230 / 230 |
| PPTX Import | F · 84.2% · 30 broken | **A+ · 100% · 0 broken** |
| Presentations | F · 87.5% · 5 broken | **A+ · 100% · 0 broken** |
| Regression gate (`certify:gate`) | fails (84.8% < 97%) | **passes (exit 0)** |

No content was deleted. All 230 nodes are real lifecycle records; every one now traces Imported → Rendered → Exported → Reopened.

---

## Phase 1 — Stale ledger cleanup (classification + decision)

The ledger held **one deck** (`3899ad15-…`, recorded under `pi-…` pptx_import + `…` presentation). Classification:

- **TEST_FIXTURE** — synthetic `ledger-import-test-deck` (titles `"Slide Title Number N"`, placeholder `"Slide N"`, bodies `"Cost/Revenue slide N"`). Not real user content.

**Decision: Option C — re-export & refresh with current code (non-destructive).** Chosen over delete/archive because it (a) preserves the records, (b) proves the code fixes resolve the failures on real recorded data, and (c) carries zero risk to user content. Executed by `backend/scripts/refresh-content-ledger.ts --apply`.

> No `REAL_USER_CONTENT` records exist in the ledger yet, so none were touched. When real decks are certified, the same refresh path applies with no deletion.

---

## Phase 2 — Re-export affected decks (refresh)

Re-ran the reopen reconciliation against the actual exported file `exports/ledger-import-test-deck-1780955529347.pptx` with current code:

```
pptx_import : reopened 190/190, lost 0   (was 30 broken → 0)
presentation: reopened  40/40 , lost 0   (was  5 broken → 0)
```

`layout_lost ×20` disappeared, as predicted.

---

## Phase 3 — Placeholder title policy

A slide with no authored title gets a synthetic `"Slide N"` fallback. These are now classified as **structural placeholders, not authored content**:

- New code flags them at import (`metadata.placeholder = true`) via `isPlaceholderTitle()` (`/^slide\s+\d+$/i`) in both `pptx-import-ledger.service.ts` and `presentation-ledger.service.ts`.
- At reopen they are treated as **structural** — present iff the export is a rich format — so they **never count as lost content** when absent. Detection also falls back to the content pattern, so records imported *before* the policy reconcile correctly on re-reopen (no re-import needed).
- Authored titles remain fully ledger-tracked and text-verified — unchanged.

Effect: the 5 `slide_lost` + 5 `title_lost` + 5 `slide_title_missing` false losses (all `"Slide 12".."Slide 20"` placeholders) no longer reduce the score.

---

## Phase 4 — Reopen matching improvement

Replaced loose substring matching with **segment-boundary-anchored matching** in a shared `content-match.ts` used by all three ledgers (pptx-import, presentation, pdf-studio):

- Export text is now extracted **newline-separated** so per-run phrase boundaries survive (`extractText`/`extractExportedText` join with `\n`).
- `phrasePresent(needle, hay, segments)`:
  - **Content-rich** needles (≥4 tokens or ≥24 chars) → substring match (unique enough).
  - **Short** needles → must **start at an exported run boundary** and **end on a token boundary**. The needle may span consecutive runs.
- This kills the exact 3A false positive — `"slide 2"` no longer matches inside `"Cost slide 2"` (no run starts with `"slide"`), while a legitimate multi-cell table row `"Metric | Q1 | Q2"` (runs `Metric`,`Q1`,`Q2`) still matches.

The corrected rule was validated when the first (over-strict) version produced a *new* false negative on table rows; the anchored approach resolves both directions.

---

## Phase 5 — Recertification

`npm run certify:content` regenerated [CONTENT_SAFETY_CERTIFICATION.md](CONTENT_SAFETY_CERTIFICATION.md):

```
Content Safety Grade: A+
Platform Retention: 100.0%   Effective Retention: 100.0%
Imported/Rendered/Exported/Reopened: 230 / 230 / 230 / 230
Broken: 0   Missing: 0   Unexpected mutations: 0
PPTX Import   A+  100%   Presentations  A+  100%
```

- No stale `layout_lost`. ✔
- No placeholder slide-title false losses. ✔
- No substring false positives. ✔
- True platform retention. ✔

---

## Phase 6 — Gate reset

`.content-certification.baseline.json` updated to the **clean** A+/100% snapshot (only after verifying broken = 0). The strict CI gate `npm run certify:gate` now **passes (exit 0)**; any future regression below 97%, broken-node increase, new silent mutation, or new uncategorized loss reason will fail the build.

---

## Verification

- 45/45 content-ledger tests pass (added `content-match.spec.ts` + placeholder integration test; 19 new tests). Backend typecheck clean.
- New tests lock in: placeholder detection, suffix-coincidence rejection, multi-run table-row matching, and "placeholder titles never reduce score."

---

## Final summary

| Item | Outcome |
|---|---|
| Records cleaned/refreshed | 1 deck (230 nodes), refreshed in place; **0 deleted** |
| Stale nodes refreshed | 20 `layout_lost` → structural, reopened |
| Placeholder-title policy | synthetic `"Slide N"` = structural placeholder, never counted as loss; authored titles still verified |
| Matching logic change | segment-boundary-anchored; substring only for content-rich needles |
| New platform retention | **100.0%** |
| New grade | **A+** |
| Remaining real failures | **0** (no real content loss existed; all 35 were stale/detector artifacts per 3A) |
| Baseline update | clean A+/100% committed; strict gate passes |

**Success criteria met:** certification reflects real fidelity; no stale fixture data inflates or deflates the score; no synthetic placeholder counts as loss; no loose-substring false positives.
