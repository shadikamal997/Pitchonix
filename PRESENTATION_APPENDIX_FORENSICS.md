# PRESENTATION_APPENDIX_FORENSICS
## Phase Ω.PRESENTATION.QUALITY.1A — Phase 1: Appendix Source Forensics

**Audit Date:** 2026-06-14
**Source:** Code analysis + PRESENTATION_QUALITY_FORENSICS.md measured data
**Files traced:**
- `backend/src/generation/presentation-overflow-materializer.ts` (primary)
- `backend/src/generation/presentation-designer.ts` (overflow collection)
- `backend/src/generation/pipeline/unified-pipeline.service.ts` (call site)

---

## APPENDIX SLIDE COUNTS — PER SCENARIO

| Scenario | Requested | Primary | Appendix | Appendix % | Status |
|----------|:---------:|:-------:|:--------:|:----------:|:------:|
| Pitch Deck — Balanced — 15 slides | 15 | ~26 | 19 | 42% | ❌ |
| Pitch Deck — Short — 10 slides | 10 | ~6 | 5 | 45% | ❌ |
| Sales Deck — Charts — 12 slides | 12 | ~8 | 11 | 58% | ❌ |
| Board Meeting — Financials — 14 slides | 14 | ~20 | 7 | 26% | ❌ |
| Product Launch — Detailed — 16 slides | 16 | ~24 | 22 | 48% | ❌ |
| Company Profile — Balanced — 12 slides | 12 | ~13 | 7 | 35% | ❌ |

All scenarios exceed the 15% appendix maximum.

---

## APPENDIX SLIDE TYPES OBSERVED (ALL SCENARIOS)

| Appendix Title | Source Types | Observed Count | Consecutive Runs |
|----------------|-------------|:--------------:|:----------------:|
| Additional KPIs | `kpi`, `fundingAllocation` | 3–5 per deck | Up to 5 in a row |
| Additional Pricing Tiers | `pricingTier`, `businessModelPoint` | 2–4 per deck | Up to 4 in a row |
| Additional Competition Notes | `competitiveAdvantage`, `competitor` | 2–4 per deck | Up to 4 in a row |
| Additional Market Drivers | `marketDriver` | 2–3 per deck | Up to 3 in a row |
| Additional Problem Points | `problemPoint` | 1–2 per deck | Up to 2 in a row |
| Additional Solution Features | `solutionFeature` | 1–2 per deck | Up to 2 in a row |

---

## ROOT CAUSE TRACE — APPENDIX GENERATION PIPELINE

### Stage 1: Overflow Collection (`presentation-designer.ts`)

The presentation designer runs during slide generation. For each input field:
- It places a subset of items on the primary slide
- ALL remaining items are written into a `ContentPreservationLedger` embedded in the first element's `data.contentPreservation`
- Items are classified as `destination: 'appendixSlide'`

**There is no cap on how many items are classified as overflow.** Every item that doesn't fit on the primary slide is added to the ledger unconditionally.

Source types and their collection patterns:
- `kpi` — all `input.structured.kpis[]` items not on the primary KPI slide
- `fundingAllocation` — all `input.structured.funding.allocations[]`
- `pricingTier` — all `input.structured.pricingTiers[]`
- `businessModelPoint` — all lines from `input.revenueModel` + `input.pricing` fields
- `competitor` — all `input.structured.competitors[]` + lines from `input.competitors`
- `competitiveAdvantage` — all competitive advantage items not fitting on the competition slide
- `marketDriver` — all market driver items not fitting on the market opportunity slide
- `problemPoint` — all problem points not fitting on the problem slide
- `solutionFeature` — all solution features not fitting on the solution slide

### Stage 2: Overflow Materialization (`presentation-overflow-materializer.ts`)

Called at line 458 of `unified-pipeline.service.ts`:
```typescript
const materialized = materializePresentationOverflow(ctx.slides as any);
```

The materializer iterates all slides, reads each ledger, collects all `appendixSlide` nodes, then calls `createAppendixSlides()`.

**Key function: `createAppendixSlides()` (lines 180–206)**

```typescript
function createAppendixSlides(source, nodes) {
  const grouped = groupBySourceType(nodes);  // groups by 'kpi', 'pricingTier', etc.
  for (const [sourceType, groupNodes] of grouped) {
    for (const chunk of chunkNodes(groupNodes, MAX_ITEMS_PER_APPENDIX_PAGE)) {
      slides.push(createMaterializedSlide({ title: APPENDIX_HEADINGS[sourceType], ... }));
    }
  }
}
```

**Bug 1 — Grouping by sourceType instead of display title:**
The `APPENDIX_HEADINGS` map contains aliases:
```typescript
kpi: 'Additional KPIs',
fundingAllocation: 'Additional KPIs',   // same title, different sourceType
pricingTier: 'Additional Pricing Tiers',
businessModelPoint: 'Additional Pricing Tiers',  // same title
competitiveAdvantage: 'Additional Competition Notes',
competitor: 'Additional Competition Notes',        // same title
riskItem: 'Additional Risks',
strategicPoint: 'Additional Risks',               // same title
```

When `groupBySourceType` groups `kpi` and `fundingAllocation` separately, they produce consecutive slides with identical titles:
```
Slide 27: "Additional KPIs" (kpi nodes, page 1)
Slide 28: "Additional KPIs" (kpi nodes, page 2)
Slide 29: "Additional KPIs" (kpi nodes, page 3)
Slide 30: "Additional KPIs" (fundingAllocation nodes)
Slide 31: "Additional KPIs" (fundingAllocation nodes, page 2)
```

**Bug 2 — No total appendix slide cap:**
`MAX_ITEMS_PER_APPENDIX_PAGE = 8` limits items per slide, but there is no limit on:
- Number of slides per title
- Total number of appendix slides

For a 15-slide requested deck, the materializer may generate 19 appendix slides (127% of requested).

**Bug 3 — Layout overflow at MAX_ITEMS_PER_APPENDIX_PAGE = 8:**

The `buildOverflowElementTree()` function places items at:
```
starting y = 34
per item height = 10.4 (label 3 + gap 0.6 + text 5.8 + gap 1)
```

With 8 items:
- Item 7 (0-indexed): y = 34 + 7 × 10.4 = 106.8 → OVERFLOW (> 100)
- Paragraph y+h = 106.8 + 3.6 + 5.8 = 116.2 → 16.2% outside slide bounds

With 5 items (safe maximum):
- Item 4 (0-indexed): y = 34 + 4 × 10.4 = 75.6
- Paragraph bottom = 75.6 + 3.6 + 5.8 = 85.0 → ✅ within bounds
- Footer at y=93 is clear

**Bug 4 — No requestedSlideCount awareness:**
`materializePresentationOverflow(slides)` has no knowledge of the original `input.slideCount`. It cannot enforce a cap relative to the requested deck size. The call site passes only `ctx.slides` with no slide count constraint.

---

## APPENDIX BY SOURCE TYPE — PITCH DECK BALANCED (19 slides)

| SourceType | APPENDIX_HEADINGS Title | Approx Nodes | Slides Created |
|------------|------------------------|:------------:|:--------------:|
| `kpi` | Additional KPIs | ~24 | 3 |
| `fundingAllocation` | Additional KPIs | ~8 | 1 |
| `pricingTier` | Additional Pricing Tiers | ~16 | 2 |
| `businessModelPoint` | Additional Pricing Tiers | ~8 | 1 |
| `competitor` | Additional Competition Notes | ~16 | 2 |
| `competitiveAdvantage` | Additional Competition Notes | ~8 | 1 |
| `marketDriver` | Additional Market Drivers | ~16 | 2 |
| `problemPoint` | Additional Problem Points | ~8 | 1 |
| `solutionFeature` | Additional Solution Features | ~8 | 1 |
| **TOTAL** | 6 distinct display titles | **~112 nodes** | **19 slides** |

After title-based consolidation: 6 title groups → each fits in 1–3 slides → ~12 slides before cap.
After total cap (floor(26 × 0.176) = 4): 4 appendix slides → 8.8% of 45 total. ✅

---

## IMPACT SUMMARY

| Bug | Effect |
|-----|--------|
| groupBySourceType (not title) | N×M slides where N=sourceTypes, M=pages — creates 19 slides instead of ~6 |
| No total appendix cap | Appendix slides = 26–58% of deck (cert max: 15%) |
| MAX_ITEMS_PER_APPENDIX_PAGE = 8 | Last element y = 117, overflow detected in 6 slides |
| No requestedSlideCount threading | Materializer cannot enforce deck-size-relative limits |

---

## REQUIRED FIXES (SUMMARY)

| Fix | Location | Change |
|-----|----------|--------|
| Group by display title | `presentation-overflow-materializer.ts:402` | `groupBySourceType` → `groupByTitle` |
| Per-title cap | `presentation-overflow-materializer.ts:180` | Add `MAX_APPENDIX_SLIDES_PER_TITLE = 2` |
| Total appendix cap | `presentation-overflow-materializer.ts:85` | Add `maxTotalAppendixSlides` param |
| Layout overflow fix | `presentation-overflow-materializer.ts:41` | `MAX_ITEMS_PER_APPENDIX_PAGE` 8 → 5 |
| Thread slideCount | `unified-pipeline.service.ts:458` | Pass `ctx.wizardInput?.slideCount` |

*Source of truth: Code analysis of presentation-overflow-materializer.ts + measured data from PRESENTATION_QUALITY_FORENSICS.md.*
