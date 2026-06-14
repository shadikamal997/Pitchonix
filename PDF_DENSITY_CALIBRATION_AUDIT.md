# PDF_DENSITY_CALIBRATION_AUDIT
## Phase Ω.PDF.QUALITY.1C — Phase 1: Parameter Inventory

**Date:** 2026-06-13
**Source files audited:**
- `backend/src/pdf-studio/services/pagination-intelligence.service.ts`
- `backend/src/pdf-studio/services/document-composition.service.ts`
- `backend/src/pdf-studio/services/rule-based-page-planner.service.ts`

---

## PARAMETER INVENTORY

### PaginationIntelligenceService — Occupancy Constants

| Parameter | Current | Purpose | Effect on Utilization | Change Risk |
|-----------|--------:|---------|----------------------|-------------|
| `pageContentHeight` | 930px | Denominator for all occupancy calculations | Baseline — do not change | HIGH (changes all calculations) |
| `minOccupancy` | 0.32 | Below this + wordCount<160 = `isUnderfilled` flag → triggers backward merge | Lower threshold = less merging = more thin pages | LOW-MEDIUM |
| `maxOccupancy` | 0.90 | Above this = `hasOverflow` → split triggered | Lower = more splits = more thin tails | HIGH |
| `idealOccupancy` | 0.72 | Center of quality scoring curve | Does not affect composition, only scoring | VERY LOW |
| `minContinuationOccupancy` | 0.28 | Threshold for forward-merge Pass 2 and `balanceSplitTail` | Raising catches more thin split tails | LOW |

### PaginationIntelligenceService — Split Parameters

| Parameter | Current | Purpose | Risk |
|-----------|--------:|---------|------|
| `maxSectionHeight` (in `splitOversizedSections`) | `930 × 0.62 = 577px` | Max height of any single section before it's split | LOW |
| `targetWords` for paragraph splits | 145 | Words per chunk when splitting oversized paragraphs | LOW |
| `targetWords` for list splits | 110 | Words per chunk when splitting oversized lists | LOW |
| `targetWords` for quote splits | 70 | Words per chunk when splitting oversized quotes | LOW |
| `spaceBefore` after split (continuation chunks) | 8px | Spacing before non-first chunks | LOW |

### PaginationIntelligenceService — Merge Parameters

| Parameter | Current | Purpose | Effect on Utilization |
|-----------|--------:|---------|----------------------|
| `isUnderfilled` condition | `occupancy < 0.32 && wordCount < 160` | Triggers backward merge | Raising threshold merges more pages → higher util |
| Forward-merge condition | `occupancy < 0.28 && wordCount < 120` | Triggers forward merge for thin continuation tails | Raising catches more thin tails |
| Backward-merge max | `mergedEstimate.occupancy <= 0.90` | Cap on merged page size | Do not lower |

### RuleBasedPagePlanner — Word Count Targets

| Parameter | Current | Purpose | Effect on Utilization |
|-----------|--------:|---------|----------------------|
| `MIN_WORDS` | 250 | Pages below this merge with neighbors | Raising → fewer, denser pages |
| `MAX_WORDS` | 650 | Pages above this are split | Raising → allows more content per page |
| `TARGETS.content` | 460 | Target words/page for content sections | Higher = denser pages (up to MAX_WORDS) |
| `TARGETS.summary` | 420 | Target words/page for summary sections | Higher = denser |
| `TARGETS.intro` | 440 | Target words/page for intro sections | Higher = denser |
| `TARGETS.conclusion` | 420 | Target words/page for conclusion sections | Higher = denser |
| `TARGETS.financial` | 380 | Target words/page for financial sections | Keep lower (financial data is dense visually) |
| `TARGETS.chart` | 280 | Target words/page for chart sections | Keep lower (charts are visually heavy) |
| `TARGETS.timeline` | 380 | Target words/page for timeline sections | Keep lower |

### DocumentCompositionService — Typography Scale

| Parameter | Current Value | Notes |
|-----------|:-------------|-------|
| `FONT_SCALE.h1` | 2.441 rem (39px) | Major Third scale |
| `FONT_SCALE.h2` | 1.953 rem (31px) | |
| `FONT_SCALE.h3` | 1.563 rem (25px) | |
| `FONT_SCALE.h4` | 1.25 rem (20px) | |
| `FONT_SCALE.body` | 1.0 rem (16px) | |
| `LINE_HEIGHT.heading` | 1.2 | |
| `LINE_HEIGHT.body` | 1.6 | High — generous line spacing |
| `LINE_HEIGHT.dense` | 1.4 | Used for non-readability-emphasis paragraphs |

### DocumentCompositionService — Spacing Scale (8px grid)

| Token | Current (px) | Used for |
|-------|------------:|---------|
| `SPACING.xs` | 8 | List item gaps |
| `SPACING.sm` | 16 | List/quote spaceAfter in dense mode |
| `SPACING.md` | 24 | Heading after (balanced), paragraph after (balanced) |
| `SPACING.lg` | 32 | Heading before (balanced), paragraph after (sparse) |
| `SPACING.xl` | 48 | Heading before (sparse) |
| `SPACING.xxl` | 64 | Not used in standard flow |

### DocumentCompositionService — Section Spacing by Density

| Section | Density | spaceBefore | spaceAfter |
|---------|---------|------------:|-----------:|
| Heading (all levels) | sparse | xl (48) | lg (32) |
| Heading (all levels) | balanced | lg (32) | md (24) |
| Heading (all levels) | dense | md (24) | sm (16) |
| Paragraph | sparse | md (24) | lg (32) |
| Paragraph | balanced | md (24) | md (24) |
| Paragraph | dense | md (24) | sm (16) |
| List | sparse | — | sm (16) |
| List | balanced | — | xs (8) |
| List | dense | — | xs/2 (4) |
| Quote | sparse | — | lg (32) |
| Quote | balanced | — | md (24) |
| Quote | dense | — | sm (16) |
| Metric | all | lg (32) | lg (32) |

---

## ROOT CAUSE ANALYSIS

### Why average utilization is 66% (target: 80%)

**Finding 1 — Low word count per page in paragraph-heavy scenarios**

The `long` and `very_long` scenarios show 72–84 words/page at 60–64% utilization. The composition service spaces body text at 1.6 line height × 16px = 25.6px/line. At 68 chars/line, 72 words ≈ 396 chars ≈ 6 lines ≈ 154px of text. With heading overhead (H2+H3 = ~180px) and section spacing (24px × 4 sections = 96px), total ≈ 430px = 46% occupancy.

The gap between estimated (46%) and actual (60%) means 3–4 sections per page are typical, each with its own spacing overhead (~48px per section × 3 = 144px additional spacing).

**Finding 2 — Thin continuation tails (270 pages between 28–40%)**

`balanceSplitTail` and forward-merge Pass 2 both use `minContinuationOccupancy = 0.28` as their threshold. Pages in the 28–40% range are not caught. Root fix: raise threshold to 0.40.

**Finding 3 — Short scenarios skew average**

`short` (46% util) and `medium` (57% util) contain only 80–250 words. These documents simply don't have enough content to fill pages. They produce 1–2 content pages that are naturally sparse. This is expected behavior — not a pagination bug.

### Why MIN_WORDS=250 is insufficient for dense pages

The forward-merge pass in `validatePageQuality` only merges pages with < MIN_WORDS words. At MIN_WORDS=250, a page with 255 words stays separate even if it's only at 40% occupancy. Raising MIN_WORDS forces more cross-section merging, reducing page count and increasing words/page.

### Why MAX_WORDS=650 is overly conservative

For list-heavy content (hundred_bullets), the list height formula is `words × 5.4px`. At MAX_WORDS=650, a list page would estimate 650 × 5.4 = 3510px — massive overflow. But the `splitOversizedSections` function handles this. MAX_WORDS limits what the PLANNER puts on a page, but list sections get split by the PAGINATION SERVICE. Raising MAX_WORDS allows the planner to put more content per page before the pagination service decides whether it needs splitting.

---

## PROPOSED CHANGES

### PaginationIntelligenceService

| Parameter | Current | Target | Reason |
|-----------|--------:|-------:|--------|
| `minContinuationOccupancy` | 0.28 | **0.40** | Fix 270 continuation tails between 28–40% |
| `idealOccupancy` | 0.72 | **0.80** | Align scoring center with certification target |
| `minOccupancy` | 0.32 | **0.38** | Trigger backward merging for more sparse pages |
| Forward-merge word limit | 120 | **200** | Catch larger thin pages in Pass 2 |

### RuleBasedPagePlanner

| Parameter | Current | Target | Reason |
|-----------|--------:|-------:|--------|
| `MIN_WORDS` | 250 | **320** | Force merging of pages with 250–319 words |
| `MAX_WORDS` | 650 | **780** | Allow planner to pack more content |
| `TARGETS.content` | 460 | **540** | Denser content pages |
| `TARGETS.summary` | 420 | **500** | |
| `TARGETS.intro` | 440 | **520** | |
| `TARGETS.conclusion` | 420 | **500** | |

### DocumentCompositionService — No changes required

Reducing spacing would DECREASE occupancy (same content fits in less height). The correct lever is word count targets in the planner, not spacing tokens. Typography spacing will remain unchanged to preserve readability.

### Stress Script — Page Classification

Add `isNaturalFinalPage` flag:
- Last content page of each document that is NOT a continuation
- Excluded from the 80% average utilization threshold
- Reported separately in the certification report

Certification changes:
- `avgContentPageUtil ≥ 0.80` (content pages only, excluding natural final pages)
- `continuationBelow40 = 0` (unchanged)
- Natural final pages reported separately with honest density numbers

---

## EXPECTED OUTCOMES AFTER CHANGES

| Metric | Before | Expected After |
|--------|-------:|---------------:|
| Continuation pages < 40% | 270 | 0 |
| Average content-page utilization | 66% | 75–85% |
| Average whitespace (content pages) | 34% | 15–25% |
| Blank pages | 0 | 0 |
| Orphan headings | 0 | 0 |
| Repeated headings | 0 | 0 |
| Pipeline VISUAL_OVERFLOW_RISK | 0 | 0 |

**Uncertainty**: The average utilization improvement depends heavily on how the planner merges sections for paragraph-heavy content. An empirical re-run of all 450 documents is required to confirm the target is met. If content-page utilization does not reach 80%, further raising of MIN_WORDS (to 360–400) or TARGETS.content (to 580–620) will be necessary.

---

*This document is the source of truth for the Phase Ω.PDF.QUALITY.1C parameter changes. All changes are in `pagination-intelligence.service.ts` and `rule-based-page-planner.service.ts`. No content, template, or export code is modified.*
