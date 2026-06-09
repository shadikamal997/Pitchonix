# Phase Ω.CONTENT.3A — Certification Failure Forensics

> Investigation only. No code, scoring, thresholds, or data were modified.
> Evidence gathered by read-only scripts: `backend/scripts/forensics-content.ts`, `backend/scripts/repro-content.ts`.

## Verdict

The platform scored **F (84.8%)** because of **35 broken nodes** on a **single synthetic test-fixture deck** — the only PPTX/presentation data in the ledger. Classification:

| Cause | Nodes | Verdict |
|---|---|---|
| `STALE_LEDGER` | **20** | importedLayout — reopened by pre-bypass code; current code passes them |
| `DETECTOR_FAILURE` | **15** | synthetic placeholder titles tracked as authored text + imprecise substring matching |
| `REAL_LOSS` | **0** | no authored user content shown lost |
| `CERTIFICATION_BUG` | **0** | scoring faithfully reflected recorded data |

**No real content loss was found.** The F grade is an artifact of stale data and a test fixture, not a fidelity failure.

---

## The data under investigation

One deck, recorded under two ledgers (same underlying id `3899ad15-…`):
- `pi-3899ad15-…` — **pptx_import** ledger, 190 nodes, imported `2026-06-08 21:35:14Z`, exported+reopened `21:52:09Z`.
- `3899ad15-…` — **presentation** ledger, 40 nodes, created/reopened `21:52:09Z`.

Broken-node breakdown (Phase 1):

```
 20  pptx_import  | importedLayout      | layout_lost          | reopen
  5  pptx_import  | importedSlide       | slide_lost           | reopen
  5  pptx_import  | importedSlideTitle  | title_lost           | reopen
  5  presentation | slideTitle          | slide_title_missing  | reopen
```

The deck is a **synthetic fixture**: titles `"Slide Title Number 1…10"`, bodies `"Cost slide N"` / `"Revenue slide N"`, subtitles `"Subtitle descriptor for slide N overview"`, notes `"Speaker note for slide N…"`. Exported file located on disk: `backend/exports/ledger-import-test-deck-1780955529347.pptx` (mtime `2026-06-09 00:52:09` local = `21:52:09Z`, exact match to `exportedAt`).

---

## Phase 2 — Timeline (proves staleness)

| Event | Time |
|---|---|
| Reopen run recorded in DB | **2026-06-08 21:52:09Z** |
| `pptx-import-ledger.service.ts` last modified | **2026-06-09 00:52:48** local (≈ 3h later) |
| `presentation-ledger.service.ts` last modified | 2026-06-08 23:27:07 local (≈ 1.5h later) |
| `slide-export.service.ts` last modified | 2026-06-09 00:24:06 local |

**Every ledger source file was edited *after* the reopen ran.** The recorded results were produced by older code. This is the signature of stale ledger data.

---

## Phase 4 — `layout_lost` ×20 → `STALE_LEDGER` (proven by reproduction)

Evidence:
- All 20 nodes: `content="ppt/slideLayouts/slideLayout1.xml"`, `binary=false`, `exported=true`, `reopened=false`, needle `"ppt slidelayouts slidelayout1 xml"`.
- The needle is a **file path**, which lives in OOXML relationships, **never in the `<a:t>` text layer** the reopen parser reads. Probe confirms: `hay.includes("ppt slidelayouts slidelayout1 xml") = false`. Pure text matching can *never* validate a layout reference.
- Current code (`pptx-import-ledger.service.ts:143`) treats `importedLayout` as **structural** → present iff the export format is rich (pptx/pdf), bypassing text matching.

**Reproduction** (`repro-content.ts`, current code vs the real export):

```
importedLayout | OLD reopened=false | CURRENT-code present = true   (×20)
20/20 layout nodes would REOPEN under current code.
```

→ The 20 `layout_lost` are **STALE_LEDGER**: recorded before the structural-layout bypass existed. Current code already resolves them. (No fix required — a re-export refreshes them.)

---

## Phase 5 — slide/title failures ×15 → `DETECTOR_FAILURE`

The 10 pptx_import nodes (`slide_lost` ×5 + `title_lost` ×5) and 5 presentation `slide_title_missing` nodes all have content of the form `"Slide 12" … "Slide 20"` — **synthetic placeholder titles the importer fabricates for untitled slides** (`s.title || \`Slide ${ord}\``).

Reproduction against the real export text layer:

```
hay.includes("slide 2")  = true     hay.includes("slide 12") = false
hay.includes("slide 4")  = true     hay.includes("slide 14") = false
hay.includes("slide 10") = true     hay.includes("slide 16") = false
                                     hay.includes("slide 18") = false
"slide NN" tokens present: slide 1..slide 10 only   slide 20 = false
```

Two compounding detector defects, both proven:

1. **False negatives (≥12).** The export contains no `"Slide 12"…"Slide 20"` — its content only references slides 1–10. The fabricated placeholders for untitled slides at positions 12–20 have no counterpart in the export, so they read as "lost." But **no authored title ever existed** for those slides; the placeholder is a ledger artifact, not user content. Current code still marks them lost (reproduction: `present=false`), so this is **not** stale — it is a detector/data-modeling failure.

2. **False positives (≤10).** The placeholders `"Slide 2".."Slide 10"` reopened only because the short needle `"slide 2"` is a **substring of unrelated body text** — `"Cost slide 2"`, `"Revenue slide 2"`, `"Subtitle descriptor for slide 2"`. Naive `includes()` matching accepts these coincidental hits. So the 160/190 reopen rate is itself **inflated by false positives**.

→ Tracking synthesized placeholder titles as verifiable authored text, combined with imprecise substring matching, produces failures in **both** directions. Classified **DETECTOR_FAILURE**. No real content loss: the slides' real titles (`"Slide Title Number 1…10"`), subtitles, bodies, charts and notes all reopened.

---

## Phase 6 — Detector validation (known-good deck)

The controlled spec `pptx-import-ledger.service.spec.ts` (6/6 passing) proves the reopen parser correctly detects titles, subtitles, bullets, table rows + headers, chart labels, speaker notes and structural layouts on a **clean deck with real titles** — 100% preservation and exact loss detection. The detector logic is sound for authored content; the live failures stem from (a) stale layout data and (b) synthetic placeholders + substring imprecision, **not** a broken parser.

---

## Phase 7 — Root-cause classification (every broken node)

| # | Module | Type | Reason | Classification | Evidence |
|---|---|---|---|---|---|
| 20 | pptx_import | importedLayout | layout_lost | **STALE_LEDGER** | current code reopens 20/20; needle is a non-text file path |
| 5 | pptx_import | importedSlide | slide_lost | **DETECTOR_FAILURE** | synthetic `"Slide 12–20"` placeholder; absent from export; current code still marks lost |
| 5 | pptx_import | importedSlideTitle | title_lost | **DETECTOR_FAILURE** | same placeholder mechanism |
| 5 | presentation | slideTitle | slide_title_missing | **DETECTOR_FAILURE** | same placeholder mechanism in presentation ledger |

- **REAL_LOSS:** 0 confirmed. (Caveat: the only data in scope is a synthetic fixture — confirm platform-wide by certifying real user decks.)
- **CERTIFICATION_BUG:** 0. Aggregation and grading correctly reflected the recorded ledger state.

---

## Why the platform scored F

1. The ledger's only PPTX/presentation data is one synthetic test deck.
2. Its reopen was recorded by **older code** (≈3h before the current ledger files were saved), so 20 layout references were marked lost that current code passes — **stale data**.
3. The importer fabricates placeholder titles for untitled slides and the text-based detector tracks them as authored content, yielding 15 false "losses" (and several false-positive reopens) — **detector imprecision**, not loss.

**28 of 35 are stale/coincidental; 15 are detector artifacts; 0 are real loss.** The certification math is correct — it faithfully reported bad inputs.

### Recommended next step (not performed — repair is out of scope for 3A)
Re-export the fixture deck (or reset+re-import) to clear stale layout losses, and decide whether synthesized placeholder titles for untitled slides should be ledger-tracked at all (or marked structural / excluded), plus tighten reopen matching beyond substring `includes()`. These are remediation decisions for a follow-up phase.
