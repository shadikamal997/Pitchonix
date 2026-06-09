# Phase Omega Content.1 Repair Register

Date: 2026-06-08

Scope: content fidelity only. UI polish, template redesign, and new studio work are intentionally out of scope.

## Raw Limit Scan

Command:

```bash
rg -n "\.slice\(|substring\(|substr\(|maxItems|maxBullets|maxMetrics|maxCards|maxRows|maxColumns|maxPages|maxSlides|take\(|limit\(|truncate|ellipsis|overflow|break;|continue;|return;" backend/src frontend/app frontend/features frontend/components
```

Raw matches: 2,420.

Important note: many matches are harmless UI display caps, switch statements, or guard clauses. The dangerous matches are the ones inside parsers, planners, template renderers, exporters, and workbook mutation code.

## P0 Paths Patched In This Pass

| Area | File | Previous behavior | Repair |
| --- | --- | --- | --- |
| PDF Studio PPTX export | `backend/src/pdf-studio/services/pptx-export.service.ts` | `if (yPos > maxY) break;` silently dropped remaining page content. | Overflow now creates continuation slides and preserves remaining parts. |
| Universal Convert PPTX export | `backend/src/universal-conversion/exporters/pptx-exporter.ts` | `if (y > 92) break;` silently dropped remaining UDM nodes. | UDM page nodes now paginate into continuation slides. |
| Excel Studio row/column operations | `backend/src/excel-studio/excel-studio.service.ts` | Insert/delete rows/columns deleted worksheet metadata while rebuilding cells. | Worksheet metadata is captured, shifted, and restored. Merges, row metadata, and column metadata are preserved instead of wiped. |
| PDF continuation titles | `backend/src/pdf-studio/services/pagination-intelligence.service.ts` | Split pages could append continuation labels from stale section state. | Continuation labels are normalized and stripped before reapplying. |
| PDF section split titles | `backend/src/pdf-studio/services/content-structure.service.ts` | Older splitter appended `(continued)` directly and could stack labels. | Continuation labels are centralized per splitter helper and stripped before reuse. |
| PDF Pro template extraction | `backend/src/pdf-studio/pro-templates/renderers/pro-template-renderer.service.ts` | Page mapping capped extracted paragraphs, bullets, derived bullets, feasibility metrics, warnings, section bullets, and paragraphs before render. | Extraction caps were removed. The renderer now appends a visible overflow appendix with `data-overflow-nodes` for source nodes not included by the selected visual layout branch. |
| Feasibility analyzer | `backend/src/feasibility-studio/feasibility-analyzer.service.ts` | Evidence, detected signals, warnings, and recommendations were capped before report persistence. | Analyzer now returns full evidence, warning, and recommendation arrays. |
| Feasibility report builder | `backend/src/feasibility-studio/feasibility-studio.service.ts` | Weak sections, warnings, recommendations, source paragraphs, and score metrics were sliced into short reports. | Report page generation now preserves full lists instead of silently capping them. |
| Career CV sanitizer | `backend/src/career/cv-profile-sanitizer.ts` | Suspicious sections could be dropped with only aggregate counters. | Sanitizer now records `rejectedNodes` with section, reason, and original value for every rejected experience, education, and skill node. |
| Presentation Designer source caps | `backend/src/generation/presentation-designer.ts` | KPI, team, market, roadmap, pricing, funding, risk, competition, problem, and solution arrays were visually capped with `.slice(0, N)` and no source preservation metadata. | Every generated slide now receives a `contentPreservation` ledger on the first element. Source nodes that do not appear in primary visual elements are recorded as overflow with `sourceType`, `sourceIndex`, `sourceText`, `destination`, and `reason`. |
| Presentation overflow materialization | `backend/src/generation/presentation-overflow-materializer.ts`, `backend/src/generation/pipeline/unified-pipeline.service.ts`, `backend/src/generation/generation.service.ts` | Phase 1C preserved overflow only in metadata, which made it invisible to users and unsafe for export. | Ledger overflow is now materialized before persistence: continuation slides are inserted after source slides, appendix slides are appended at deck end, and speaker-note overflow is added to notes plus PDF-safe appendix slides. |
| PDF Studio chart preview/export | `backend/src/pdf-studio/services/preview.service.ts`, `backend/src/pdf-studio/services/pdf-export.service.ts` | KPI cards and pie legends rendered only the first 6 chart data points. Bar/line charts had no searchable overflow data table. | Preview and export render all KPI cells, all pie legend labels, and a visible chart data appendix with `data-overflow-nodes` for KPI, pie, bar, and line charts. |
| Shared SVG KPI charts | `backend/src/generation/export/svg-chart-builder.ts` | KPI charts rendered only the first 4 values. | KPI SVG charts now render every source value in an adaptive grid instead of silently dropping value #5+. |
| PDF binary certification | `backend/src/pdf-studio/services/pdf-content-fidelity.spec.ts` | Previous verification was HTML-level only or blocked by a fragile JS PDF text parser. | Added a real Chromium PDF smoke test and reopened the generated binary with `pdftotext`, proving retained headings, 30 paragraphs, 40 table rows, 12 columns, 20 chart labels, and overflow sentinel text. |

## P0 Paths Still Open

| Area | File | Risk |
| --- | --- | --- |
| PDF Pro templates | `backend/src/pdf-studio/pro-templates/renderers/pro-template-renderer.service.ts` | Many family layout branches still use `.slice(0, N)` for primary-card composition. The new overflow appendix prevents silent omission for paragraphs, bullets, and metrics, but this still needs a formal `ContentOverflowResult` object and cleaner continuation pagination. |
| PDF suggested section split | `backend/src/pdf-studio/services/content-structure.service.ts` | Paragraphs can be evenly redistributed into suggested sections when headings are weak. Needs source-preserving semantic section assignment. |
| Legacy parser section detection | `backend/src/document-parser/document-parser.service.ts` | Short body lines containing generic keywords can become section headers. Needs stricter heading confidence and provenance. |
| Presentation overflow export | `backend/src/generation/presentation-overflow-materializer.ts` | Materialized appendix/continuation slides feed the normal slide model and PPTX/PDF render paths. PPTX XML and PDF HTML renderer input are covered by tests. Full binary coverage exists for the PDF Studio HTML-to-PDF path, but presentation screenshot-based PDF export still needs visual/OCR-style certification because text extraction is not appropriate for image-rasterized slides. |
| Slide HTML/PPTX renderers | `backend/src/slide-export/*` | Some labels/bios/chart text are shortened for fit. Needs explicit fit report and overflow node handling. |
| Slide table visual fit | `backend/src/slide-export/element-html-renderer.ts` | Table HTML preserves all 40 rows/12 columns in regression tests, but oversized tables may still require layout-level continuation slides for readability. |
| CV sanitizer | `backend/src/career/cv-profile-sanitizer.ts` | Rejected entries are now traceable through `rejectedNodes`, but the builder/export UI still needs to surface those rejected nodes clearly to users. |
| Feasibility report builder | `backend/src/feasibility-studio/feasibility-studio.service.ts` | Silent caps are removed in the report builder, but long reports still need formal continuation page scoring and source-node ledgers. |
| Universal XLSX importer | `backend/src/universal-conversion/importers/xlsx-importer.ts` | Formulas and styles become display values in Convert. Needs formula/style-preserving UDM sheet nodes. |

## Phase Omega Content.1B Regression Tests

| Test | File | Assertion |
| --- | --- | --- |
| Long PDF Pro report | `backend/src/pdf-studio/pro-templates/renderers/pro-template-renderer.service.spec.ts` | A generated report with 30 paragraphs and 40 bullets keeps every paragraph and bullet in either the primary layout or overflow appendix. |
| Feasibility warnings/recommendations | `backend/src/feasibility-studio/feasibility-analyzer.service.spec.ts` | Analyzer output is no longer capped at 12 warnings or 10 recommendations before rendering. |
| CV sanitizer rejected nodes | `backend/src/career/cv-profile-sanitizer.spec.ts` | Suspicious education content is not silently deleted; the original value and rejection reason are preserved in `rejectedNodes`. |
| Presentation Designer overflow ledger | `backend/src/generation/presentation-designer.spec.ts` | Decks with 10 KPIs, 8 team members, 12 market drivers, 10 roadmap milestones, 8 pricing tiers, and 10 risks preserve every source item in primary elements or the overflow ledger. |
| Presentation overflow materialization | `backend/src/generation/presentation-designer.spec.ts` | Overflow creates visible appendix slides, continuation slides immediately after source slides, preserved speaker notes, no duplicate `continued continued` labels, and materialized content in PPTX XML plus the PDF HTML render input. |
| PDF chart/table overflow | `backend/src/pdf-studio/services/pdf-content-fidelity.spec.ts` | PDF Studio preview/export chart renderers preserve all 20 labels through visible data tables; shared SVG KPI charts preserve all 20 KPI labels; slide HTML tables include all 40 rows and all 12 columns. |
| PDF binary smoke | `backend/src/pdf-studio/services/pdf-content-fidelity.spec.ts` | Real Puppeteer PDF starts with `%PDF`, is not HTML fallback, reopens with `pdftotext`, and retains 30/30 paragraphs, 40/40 row markers, 12/12 column headers, 20/20 chart labels, and overflow sentinel text. |

## Phase Omega Content.1C Presentation Cap Classification

| Input group | Current visual cap pattern | Classification | Preservation destination |
| --- | --- | --- | --- |
| KPIs / traction metrics | Primary slides usually show 3-4 metrics. | SAFE DISPLAY SUMMARY with ledger required | `appendixSlide` |
| Team members | Team layouts show 3-6 members depending family. | NEEDS CONTINUATION | `continuationSlide` |
| Market drivers | Driver grids show 3-4 drivers. | NEEDS SPEAKER NOTES / APPENDIX | `speakerNotes` |
| Roadmap milestones | Roadmap visuals show 3-4 phases. | NEEDS CONTINUATION | `continuationSlide` |
| Pricing tiers / revenue streams | Pricing cards show 3-4 tiers. | NEEDS APPENDIX | `appendixSlide` |
| Funding allocations | Donut/funds visuals show 3-4 segments. | NEEDS APPENDIX | `appendixSlide` |
| Risks / SWOT threats and weaknesses | SWOT/list layouts summarize visible items. | NEEDS APPENDIX | `appendixSlide` |
| Problem points | Problem slides show top 3 pains. | SAFE DISPLAY SUMMARY with notes | `speakerNotes` |
| Solution features | Solution slides show top 3-4 capabilities. | SAFE DISPLAY SUMMARY with notes | `speakerNotes` |
| Competition / differentiation | Matrices show primary competitors and rows. | NEEDS APPENDIX | `appendixSlide` |

## Required Next Repair Primitive

Create a shared `ContentLedger` package with these node states:

```ts
type ContentNodeState = 'imported' | 'rendered' | 'exported' | 'reopened';

interface ContentNode {
  id: string;
  sourceId: string;
  module: string;
  type: string;
  sectionId?: string;
  parentId?: string;
  contentHash: string;
  preview?: string;
  states: Record<ContentNodeState, boolean>;
}
```

Renderers and exporters should fail or emit a blocking warning when `imported > rendered`, `rendered > exported`, or `exported > reopened`.

## Production Readiness After This Pass

Silent content loss is reduced in PPTX export paths, Excel mutation metadata, PDF Pro template extraction/render overflow, Feasibility report generation, and Career sanitizer traceability, but not eliminated platform-wide.

Current readiness after Phase Omega Content.1E: 72%.

Do not claim platform content safety complete until slide export fit reports exist, screenshot-based presentation PDF export has visual/OCR certification, PDF Pro primary layout branches have formal `ContentOverflowResult` continuation pagination, and full imported/rendered/exported/reopened content ledgers are implemented and verified.
