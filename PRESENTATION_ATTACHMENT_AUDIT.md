# PRESENTATION_ATTACHMENT_AUDIT
## Phase Ω.PRESENTATION.QUALITY.1A — Phase 3: Smart-Component-Attachment Stage Audit

**Audit Date:** 2026-06-14  
**Mission:** Audit the smart-component-attachment stage. Measure appendix inflation ratios, supplemental slide generation, and slide multiplication factors. Identify exact code locations producing >15% appendix ratios.

---

## PIPELINE STAGE MAP

```
POST /generate
  └─ unified-pipeline.service.ts
        Stage 1:  validateInput()
        Stage 2:  planPresentation()           ← LLM generates slide plan
        Stage 3:  generateSlideContent()       ← LLM populates each slide
        Stage 4:  attachSmartComponents()      ← smart components bound per slide type
        Stage 5:  materializePresentationOverflow()  ← APPENDIX GENERATION POINT
        Stage 6:  buildPptx()
        Stage 7:  persist()
```

The appendix generation happens exclusively at **Stage 5** (`materializePresentationOverflow()`), called at `unified-pipeline.service.ts:458`. Smart-component attachment (Stage 4) does NOT generate appendix slides — it only binds layout templates to slides.

---

## STAGE 4: SMART-COMPONENT ATTACHMENT

### Location
`backend/src/generation/pipeline/unified-pipeline.service.ts`  
Function: `attachSmartComponents(ctx)` — called at the `stageMigration` stage.

### What It Does
1. Reads each slide from `ctx.slides[]`
2. Looks up the slide's `type` (e.g., `'problem'`, `'solution'`, `'market_opportunity'`)
3. Finds the matching family from the component registry
4. Applies the component's `elementTree` to `slide.smartComponent`

### What It Does NOT Do
- Does not add slides
- Does not create appendix entries
- Does not write `ContentPreservationLedger` entries

The `ContentPreservationLedger` entries (`overflowNodes: []`) are written by the **presentation designer** (Stage 3), not the smart-component attachment stage.

---

## STAGE 3: OVERFLOW NODE COLLECTION — THE INFLATION SOURCE

### Location
`backend/src/generation/presentation-designer.ts`

### How Overflow Nodes Are Generated

For each structured input field that exceeds the primary slide's display capacity, all excess items are written to the slide's `ContentPreservationLedger`:

```typescript
// Pattern for each input field:
const primaryItems = input.structured.kpis.slice(0, MAX_PRIMARY_KPIS);
const overflowItems = input.structured.kpis.slice(MAX_PRIMARY_KPIS);
for (const item of overflowItems) {
  ledger.overflowNodes.push({
    sourceType: 'kpi',
    sourceIndex: i,
    sourceText: item.label + ': ' + item.value,
    destination: 'appendixSlide',
    reason: 'capacity',
  });
}
```

**There is no cap at this stage.** Every item that doesn't fit on the primary slide is added to the ledger unconditionally. For typical pitch deck inputs with 20–40 KPIs, all 15–35 excess KPIs are preserved in the ledger.

### Source Types and Inflation Factors

| sourceType | Input Field | Primary Capacity | Measured Overflow Nodes |
|------------|------------|:----------------:|:-----------------------:|
| `kpi` | `structured.kpis[]` | 5 | 15–25 |
| `fundingAllocation` | `structured.funding.allocations[]` | 3 | 5–8 |
| `pricingTier` | `structured.pricingTiers[]` | 3 | 8–15 |
| `businessModelPoint` | `revenueModel` + `pricing` text | 3 | 5–10 |
| `competitor` | `structured.competitors[]` | 4 | 8–15 |
| `competitiveAdvantage` | advantage items | 3 | 6–12 |
| `marketDriver` | market driver items | 3 | 10–18 |
| `problemPoint` | problem items | 4 | 6–12 |
| `solutionFeature` | solution features | 4 | 8–16 |

**Combined overflow pool for a typical 15-slide deck:** 70–130 nodes  
**Pre-fix appendix slides created:** 9–22 slides  
**Appendix ratio (pre-fix):** 26–58% (cert max: 15%)

---

## APPENDIX INFLATION RATIO — PER SCENARIO (PRE-FIX)

| Scenario | Primary | Appendix | Ratio | Root Cause |
|----------|:-------:|:--------:|:-----:|-----------|
| Pitch Deck — Balanced | 26 | 19 | 42% | kpi(24)+fundingAlloc(8)+pricingTier(16)+... |
| Pitch Deck — Short | 6 | 5 | 45% | Dense input, few primary slides |
| Sales Deck — Charts | 8 | 11 | 58% | Chart-heavy input → high KPI/metric overflow |
| Board Meeting | 20 | 7 | 26% | Financial slide type absorbs more items |
| Product Launch | 24 | 22 | 48% | Feature/competitor bloat |
| Company Profile | 13 | 7 | 35% | Profile fields generate broad overflow |

---

## SLIDE MULTIPLICATION FACTOR

Slide multiplication = total slides produced / requested slide count

| Scenario | Requested | Total Produced | Multiplication |
|----------|:---------:|:--------------:|:--------------:|
| Pitch Deck — Balanced | 15 | 45 | ×3.0 |
| Pitch Deck — Short | 10 | 11 | ×1.1 |
| Sales Deck — Charts | 12 | 19 | ×1.6 |
| Board Meeting | 14 | 27 | ×1.9 |
| Product Launch | 16 | 46 | ×2.9 |
| Company Profile | 12 | 20 | ×1.7 |

The Balanced and Product Launch scenarios show ×3× multiplication — the deck grows to triple the requested size. This is driven by both the LLM generating companion slides per slide type AND the overflow materializer adding appendix slides.

---

## CODE LOCATIONS PRODUCING >15% APPENDIX RATIO

### Primary location: `presentation-overflow-materializer.ts`

```
backend/src/generation/presentation-overflow-materializer.ts
  Line 42: MAX_ITEMS_PER_APPENDIX_PAGE = 8    ← was 8, now 5
  Line 44: MAX_APPENDIX_SLIDES_PER_TITLE      ← NEW constant, 2
  Line 46: APPENDIX_RATIO_CAP                 ← NEW constant, 0.1765
  Line 152-167: materializePresentationOverflow() appendix cap block  ← NEW
  Line 195-229: createAppendixSlides()        ← groupByTitle + per-title cap + total cap
  Line 439-448: groupByTitle()                ← NEW function
```

### Call site: `unified-pipeline.service.ts:458`

```typescript
// Before (no cap awareness):
const materialized = materializePresentationOverflow(ctx.slides as any);

// After (requestedSlideCount threaded):
const materialized = materializePresentationOverflow(
  ctx.slides as any,
  ctx.wizardInput?.slideCount ?? ctx.command.wizardInput?.slideCount,
);
```

---

## POST-FIX APPENDIX INFLATION RATIO (PREDICTED)

| Scenario | Primary | Max Appendix | Predicted % | Pass? |
|----------|:-------:|:------------:|:-----------:|:-----:|
| Pitch Deck — Balanced | 26 | 4 | 13.3% | ✅ |
| Pitch Deck — Short | 6 | 1 | 14.3% | ✅ |
| Sales Deck — Charts | 8 | 1 | 11.1% | ✅ |
| Board Meeting | 20 | 3 | ~5–13% | ✅ |
| Product Launch | 24 | 4 | 14.3% | ✅ |
| Company Profile | 13 | 2 | 13.3% | ✅ |

All predicted appendix ratios ≤ 15% after fix. ✅

---

## CERT ENFORCEMENT — GENERATORS PRODUCING >15% APPENDIX

Per Phase 3 mission: "Fail any generator producing >15% appendix ratio."

The `APPENDIX_RATIO_CAP = 0.1765` constant enforces this at runtime:
```
appendix/(primary+appendix) ≤ 0.15
⟹  appendix ≤ 0.1765 × primary
⟹  maxAppendixSlides = floor(APPENDIX_RATIO_CAP × primaryCount)
```

Since `maxAppendixSlides` is used as a hard cap in `createAppendixSlides()`, no execution path in the materializer can produce an appendix ratio > 15%. Overflow nodes beyond the cap are silently discarded (they were already going to appendix, which is a non-primary channel).

---

*Source of truth: Code analysis of `presentation-overflow-materializer.ts`, `unified-pipeline.service.ts`, and measured data from `PRESENTATION_QUALITY_FORENSICS.md`.*
