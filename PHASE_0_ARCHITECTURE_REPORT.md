# Phase 0 — Complete System Architecture Report
**Date:** 2026-05-29  
**Status:** COMPLETE  
**Auditor:** Phase 0 System Mapping

---

## 1. Full Pipeline Map

```
WizardInput
    │
    ▼
UnifiedGenerationPipeline.execute(command)
    │
    ├─► [Stage 1] stageLoadContext
    │       • Loads project + deck from DB
    │       • Merges project.businessInfo + command.wizardInput → ctx.wizardInput
    │       • Resolves familyId (command override > deck.metadata > inferred later)
    │
    ├─► [Stage 2] stageValidateInput
    │       • Sets defaults: slideCount=18, theme='investor-minimal', brandColors, etc.
    │
    ├─► [Stage 3] stageBuildContext (no-op)
    │
    ├─► [Stage 4] stageSlidePlanning
    │       • AutoExpansionService.expand(wizardInput) → framework promotions
    │
    ├─► [Stage 5] stageGeneratorExecution
    │       • SlideFactory.generateDeck(wizardInput, promotions)
    │           └─► For each SlideType:
    │               BaseSlideGenerator.generate(input, order)
    │                   ├─ getTitle(input)      → slide.title    [HARDCODED in most generators]
    │                   ├─ getSubtitle(input)   → slide.subtitle [HARDCODED in most generators]
    │                   ├─ generateContent(input) → slide.content [description string only]
    │                   ├─ generationAdapter.requestFor(type, input)
    │                   │       → { family: SmartFamilyId, type: SmartComponentType }
    │                   └─ designInvestorSlide(input, out)
    │                           → rich SlideElementDTO[] (30+ element trees per slide)
    │               Output: SlideContent {
    │                   type, order, title, subtitle, content,
    │                   smartComponent: { family, type, elementTree: SlideElementDTO[] }
    │               }
    │
    ├─► [Stage 5.5] stageEnhancement (optional AI rewrite)
    │
    ├─► [Stage 6] stageSmartComponentAttachment
    │       • Counts how many slides have elementTree — telemetry only
    │
    ├─► [Stage 7] stageQualityAnalysis
    │       • DocumentScorecardService.build() → quality score
    │
    ├─► [Stage 8] stageMigration  ←── EDITOR PATH WIRES HERE
    │       • Persists SlideContent to DB as Slide rows
    │       • content JSON includes: { ...content, smartComponent }
    │       • SlideElementsMigrationService.migrateOne(slideId)
    │           └─ Reads slide.content.smartComponent.elementTree
    │           └─ Creates SlideElement rows (x, y, width, height, style, type, content)
    │           └─ Editor reads these rows — WORKS CORRECTLY
    │
    ├─► [Stage 9] stagePersistence (no-op)
    │
    └─► [Stage 10] stagePostProcessing
            • Sets deck.status = 'ready'
```

---

## 2. Data Flow — DTOs at Each Step

| Step | DTO / Object | Key Fields |
|------|-------------|------------|
| Input | `WizardInput` | companyName, problem, solution, team, kpis[], teamMembers[], marketSizing, theme |
| Generator output | `SlideContent` | type, order, title, subtitle, content: any, `smartComponent: { family, type, elementTree: SlideElementDTO[] }` |
| Visual enrichment | `VisualSlideContent` | `{...SlideContent}` spread + layout, theme, charts, images, renderStatus |
| DB persistence | `Slide` (Prisma) | type, order, title, subtitle, content: Json (carries smartComponent) |
| Editor elements | `SlideElement[]` (DB rows) | id, slideId, type, x, y, width, height, style, content, zIndex |
| Editor render | `SlideElementDTO[]` | Same shape as SlideElement, used by SlideCanvas |

---

## 3. Where elementTree Lives and Where It Dies

```
presentation-designer.ts
    designInvestorSlide(input, out)
    → returns SlideElementDTO[50+]           ✅ CREATED HERE

BaseSlideGenerator.generate()
    out.smartComponent = { family, type, elementTree }   ✅ STORED ON SlideContent

VisualGenerationService (if used)
    const visual = { ...slide, layout, theme, charts }   ✅ CARRIED THROUGH (spread)

UnifiedPipeline stageMigration
    content: { ...content, smartComponent }              ✅ PERSISTED TO DB

SlideElementsMigrationService.migrateOne()
    reads content.smartComponent.elementTree             ✅ CREATES SlideElement ROWS

SlideCanvas.tsx + renderers/index.tsx
    renders SlideElementDTO[] via renderElement()        ✅ EDITOR WORKS

─────────────────────────────────────────────────────────────────────────
HTMLPreviewService.renderContent(slide)
    reads slide.content.description                      ❌ IGNORES elementTree
    reads slide.content.painPoints                       ❌ IGNORES elementTree
    reads slide.content.features                         ❌ IGNORES elementTree
    NEVER reads slide.smartComponent.elementTree         ❌ DEAD CODE KILLS EXPORT

PDFExportService
    wraps HTMLPreviewService                             ❌ INHERITS ALL HTML BUGS

PowerPointExportService.addStructuredContent()
    reads content.description                            ❌ IGNORES elementTree
    reads content.painPoints                             ❌ IGNORES elementTree
    reads content.features                               ❌ IGNORES elementTree
    NEVER reads smartComponent.elementTree               ❌ DEAD CODE KILLS EXPORT

SlideRenderer.tsx (legacy frontend component)
    reads slide.content.bullets                          ❌ IGNORES elementTree
    reads slide.content.body                             ❌ WRONG FIELD NAMES
```

---

## 4. The elementTree Disappearance — Confirmed Root Cause

**The elementTree is NOT lost in transit.**  
It rides through the `{...slide}` spread in VisualGenerationService and is persisted to DB inside the `content` JSON column.

**It is deliberately ignored by all 3 export services**, which were written against an older contract where `slide.content.description` was the primary content field. They were never updated to read the rich `smartComponent.elementTree`.

**The editor works correctly** because `SlideElementsMigrationService` was written specifically to read `elementTree` (Phase 32.75 Tier 10).

---

## 5. Renderer Audit — All 5 Paths

### Path 1: Editor (SlideCanvas.tsx + renderers/index.tsx)
- **Source:** `SlideElement` DB rows → `SlideElementDTO[]`
- **Reads elementTree:** YES (via migration service)
- **Output quality:** PREMIUM — full visual layouts with positioning, styling, charts
- **Status:** ✅ WORKS

### Path 2: HTML Export (html-preview.service.ts)
- **Source:** `VisualSlideContent.content.description`
- **Reads elementTree:** NO
- **Output quality:** PLAIN TEXT — `<p>` tags on white backgrounds, no visual design
- **Status:** ❌ BROKEN

### Path 3: PDF Export (pdf-export.service.ts → html-preview.service.ts → Puppeteer)
- **Source:** Same as HTML export
- **Reads elementTree:** NO
- **Output quality:** Same plain text as HTML, exported to PDF
- **Status:** ❌ BROKEN

### Path 4: PPTX Export (powerpoint-export.service.ts)
- **Source:** `VisualSlideContent.content.description/painPoints/features/keyBenefits`
- **Reads elementTree:** NO
- **Layout:** Uses `layout.regions` (title/subtitle/content/chart regions)
- **Output quality:** Basic bullet points in PptxGenJS, no visual design
- **Status:** ❌ BROKEN

### Path 5: Frontend Preview (SlideRenderer.tsx — legacy)
- **Source:** `slide.content.bullets` or `slide.content.body`
- **Reads elementTree:** NO
- **Field names:** Wrong (bullets/body don't exist on current SlideContent)
- **Output quality:** Empty bullets, only title/subtitle visible
- **Status:** ❌ BROKEN (legacy stub, not used in main editor path)

---

## 6. Content Quality Bugs (Independent of elementTree)

| Bug | Location | Severity |
|-----|----------|----------|
| Title hardcoded: `'The Problem'` | problem.generator.ts:getTitle() | P0 |
| Title hardcoded: `'Our Solution'` | solution.generator.ts:getTitle() | P0 |
| Title hardcoded: `'Market Opportunity'` | market.generator.ts:getTitle() | P0 |
| Title hardcoded: `'Business Model'` | core-slides.generator.ts | P0 |
| Title hardcoded: `'Traction'` | core-slides.generator.ts | P0 |
| Title hardcoded: `'Our Team'` | core-slides.generator.ts | P0 |
| Subtitle is a question: `'What challenge are we addressing?'` | problem.generator.ts | P0 |
| Fallback subtitle: `'Building the future'` | cover.generator.ts | P1 |
| Sentence fragment bullets: CSV split on commas | html-preview.service.ts renderContent() | P1 |
| Team content is raw string: `input.team \|\| ''` | core-slides.generator.ts | P1 |
| All slide backgrounds white | theme.service.ts | P1 |
| Market fallbacks: TAM=$185B (fake data) | presentation-designer.ts marketSizing() | P1 |

---

## 7. Smart Component Registry

- **30 SmartComponentTypes** across 8 families
- **8 SmartFamilyIds:** investor-minimal, soft-geometric-blue, corporate-monochrome, editorial-report, light-blue-business, startup-gradient, luxury-dark, crimson-dark
- **Family inferred** from documentType in smart-adapter.ts:
  - `pitch_deck` → `investor-minimal`
  - `sales_deck` → `soft-geometric-blue`
- **elementTree generated** by presentation-designer.ts per slide type, not looked up from registry for export

---

## 8. Pipeline Stage Map (Unified Pipeline)

```
Command Types: GENERATE | REGENERATE | REFRESH | REBUILD | FAMILY_SWITCH | TEMPLATE_SWITCH | WIZARD_UPDATE | STRUCTURED_UPDATE

Stages (in order):
  load-context              → DB reads, wizardInput assembly
  validate-input            → defaults, required fields
  build-context             → no-op
  slide-planning            → AutoExpansionService promotions
  generator-execution       → SlideFactory (18 generators, elementTree produced here)
  enhancement               → optional AI rewrite
  smart-component-attachment → telemetry only
  quality-analysis          → scorecard
  migration                 → DB persist + SlideElement materialisation
  persistence               → no-op
  post-processing           → status updates

Version snapshots:
  - Before: REGENERATE, REBUILD, FAMILY_SWITCH, TEMPLATE_SWITCH, WIZARD_UPDATE, STRUCTURED_UPDATE
  - After:  GENERATE, REGENERATE, REBUILD, FAMILY_SWITCH, TEMPLATE_SWITCH
```

---

## 9. Fix Required for Each Phase

### Phase 1 (Wire elementTree to HTML export)
**File:** `backend/src/generation/export/html-preview.service.ts`  
**Fix:** `renderContent()` must read `slide.smartComponent?.elementTree` and render it to HTML instead of reading `content.description`

### Phase 2 (Per-slide-type HTML renderers)
**Files:** New file `html-element-renderer.ts`  
**Fix:** Create `renderSlideElement(el: SlideElementDTO): string` that maps each element type to semantic HTML

### Phase 3 (Template Visual DNA in HTML)
**File:** `html-preview.service.ts getStyles()`  
**Fix:** Replace system fonts + white backgrounds with family-specific CSS (Inter/DM Sans, brand colors, dark backgrounds for cover/ask)

### Phase 4 (PPTX parity)
**File:** `powerpoint-export.service.ts`  
**Fix:** `addSlide()` must read `smartComponent.elementTree` and use PptxGenJS shapes/text for each element type

### Phase 5 (Narrative title engine)
**Files:** All `*.generator.ts`  
**Fix:** `getTitle()` must derive conclusions from input, not return category labels

---

## 10. Phase 0 Verdict

| Area | Status |
|------|--------|
| Pipeline mapping | ✅ COMPLETE |
| elementTree disappearance point | ✅ CONFIRMED: html-preview.service.ts renderContent() |
| All 5 renderer paths audited | ✅ COMPLETE |
| Root cause identified | ✅ All 3 exports ignore smartComponent.elementTree |
| Content bugs catalogued | ✅ 12 bugs across generators |
| Architecture report | ✅ THIS DOCUMENT |

**Phase 0 is COMPLETE with 0 open questions.**

---

*Next: Phase 1 — Wire elementTree to HTML export*
