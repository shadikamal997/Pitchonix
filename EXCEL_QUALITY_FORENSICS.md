# Ω.EXCEL.QUALITY.1 — Excel Studio Workbook Layout & Export Forensics

**Generated:** 2026-06-14 12:23:04 UTC  
**Branch:** chore/product-certifications  
**Overall:** ✅ PASSES CERTIFICATION

## Certification Thresholds

| Metric | Threshold |
|---|---|
| Weighted avg sheet density | ≥ 60% |
| Clipped columns (wch < 5 with content) | = 0 |
| Formula error cells (#REF!, #DIV/0!, etc.) | = 0 |
| Auto-sizing failures (0-width col, content >8 chars) | = 0 |
| Sheets with >20% blank rows | = 0 |
| Chart overlap | none |

## Scenario Summary

| # | Scenario | Template | Export | Sheets | Avg Density | Formulas | Err | Clipped | Freeze | Cert |
|---|---|---|---|---|---|---|---|---|---|---|
| S1 | Financial Forecast | financial-forecasting | enhanced-xlsx | 11 | 72% | 0 | 0 | 0 | 0 sheet(s) | ✅ |
| S2 | Sales Dashboard (modernize) | sales-sage | board-package-xlsx | 17 | 74% | 0 | 0 | 0 | 1 sheet(s) | ✅ |
| S3 | SaaS Metrics (freeze+headers) | startup-metrics | enhanced-xlsx | 12 | 72% | 0 | 0 | 0 | 1 sheet(s) | ✅ |
| S4 | Marketing Analytics | marketing-analytics | comparison-xlsx | 15 | 74% | 0 | 0 | 0 | 0 sheet(s) | ✅ |

---

## S1: Financial Forecast

**Template:** `financial-forecasting`  
**Export format:** `enhanced-xlsx`  
**Actions applied:** none  
**File size:** 43.3 KB  
**Cert:** ✅ PASS  

### Workbook-level Metrics

| Metric | Value |
|---|---|
| Sheets | 11 |
| Sheet names | Executive Summary, Source Data, Assumptions, Dashboard, Revenue Forecast, Cost Model, Cash Flow, Forecast, Audit, Script, Pitchonix Template System |
| Generic names (Sheet1…) | 0 |
| Total cells (used range) | 451 |
| Non-blank cells | 323 |
| Avg density (weighted) | **72%** |
| Sparse sheets (density <20%) | 0 |
| Blank-row-heavy sheets (>20%) | 0 |
| Total formulas | 0 |
| Formula errors | 0 |
| Clipped columns | 0 |
| Auto-size failures | 0 |
| Charts | 0 |
| Chart overlap | No |
| Sheets with freeze pane | 0 |
| Sheets with print setup | 0 |

### Per-Sheet Breakdown

| Sheet | Used Range | Density | Blank % | Formulas | Freeze | Flags |
|---|---|---|---|---|---|---|
| Executive Summary | A1:H19 | 28% | rows 11% / cols 0% | 0 | — | — |
| Source Data | A1:F7 | 100% | rows 0% / cols 0% | 0 | — | — |
| Assumptions | A1:D5 | 100% | rows 0% / cols 0% | 0 | — | — |
| Dashboard | A1:D5 | 100% | rows 0% / cols 0% | 0 | — | — |
| Revenue Forecast | A1:F7 | 100% | rows 0% / cols 0% | 0 | — | — |
| Cost Model | A1:C10 | 93% | rows 0% / cols 0% | 0 | — | — |
| Cash Flow | A1:C10 | 93% | rows 0% / cols 0% | 0 | — | — |
| Forecast | A1:F7 | 100% | rows 0% / cols 0% | 0 | — | — |
| Audit | A1:C6 | 100% | rows 0% / cols 0% | 0 | — | — |
| Script | A1:A27 | 89% | rows 11% / cols 0% | 0 | — | — |
| Pitchonix Template System | A1:D7 | 61% | rows 14% / cols 0% | 0 | — | — |

### Certification Checks

| Check | Result | Measured | Threshold |
|---|---|---|---|
| sheet-density | ✅ | 72% | ≥60% |
| no-clipped-cols | ✅ | 0 clipped col(s) | =0 |
| no-formula-errors | ✅ | 0 error formula(s) | =0 |
| no-autosize-failures | ✅ | 0 autosize failure(s) | =0 |
| no-blank-row-heavy-sheets | ✅ | 0 sheet(s) with >20% blank rows | =0 |
| no-chart-overlap | ✅ | no overlap | no overlap |

#### Column Widths: Executive Summary

| Col | wch | Max content len | Clipped | Autosize fail |
|---|---|---|---|---|
| A | 28 | 100 | — | — |
| B | 20 | 22 | — | — |
| C | 14 | 14 | — | — |
| D | 40 | 21 | — | — |
| E | 50 | 4 | — | — |
| F | 40 | 18 | — | — |
| G | 12 | 10 | — | — |
| H | (default) | 4 | — | — |

#### Column Widths: Source Data

| Col | wch | Max content len | Clipped | Autosize fail |
|---|---|---|---|---|
| A | 28 | 6 | — | — |
| B | 20 | 15 | — | — |
| C | 14 | 10 | — | — |
| D | 40 | 10 | — | — |
| E | 50 | 21 | — | — |
| F | 40 | 11 | — | — |

---

## S2: Sales Dashboard (modernize)

**Template:** `sales-sage`  
**Export format:** `board-package-xlsx`  
**Actions applied:** modernizeWorkbook  
**File size:** 55.5 KB  
**Cert:** ✅ PASS  

### Workbook-level Metrics

| Metric | Value |
|---|---|
| Sheets | 17 |
| Sheet names | Executive Summary, Source Data, Assumptions, Dashboard, Pipeline Overview, Quota vs Actual, Revenue by Rep, Opportunity Log, Forecast, Audit, Script, Pitchonix Template System, Pitchonix Template System 2, Pitchonix Comparison, Pitchonix Audit, Pitchonix Change Log, Pitchonix Board Summary |
| Generic names (Sheet1…) | 0 |
| Total cells (used range) | 579 |
| Non-blank cells | 431 |
| Avg density (weighted) | **74%** |
| Sparse sheets (density <20%) | 0 |
| Blank-row-heavy sheets (>20%) | 0 |
| Total formulas | 0 |
| Formula errors | 0 |
| Clipped columns | 0 |
| Auto-size failures | 0 |
| Charts | 0 |
| Chart overlap | No |
| Sheets with freeze pane | 1 |
| Sheets with print setup | 0 |

### Per-Sheet Breakdown

| Sheet | Used Range | Density | Blank % | Formulas | Freeze | Flags |
|---|---|---|---|---|---|---|
| Executive Summary | A1:H19 | 28% | rows 11% / cols 0% | 0 | R1C0 | — |
| Source Data | A1:F7 | 100% | rows 0% / cols 0% | 0 | — | — |
| Assumptions | A1:D5 | 100% | rows 0% / cols 0% | 0 | — | — |
| Dashboard | A1:D5 | 100% | rows 0% / cols 0% | 0 | — | — |
| Pipeline Overview | A1:D5 | 100% | rows 0% / cols 0% | 0 | — | — |
| Quota vs Actual | A1:C10 | 93% | rows 0% / cols 0% | 0 | — | — |
| Revenue by Rep | A1:C10 | 93% | rows 0% / cols 0% | 0 | — | — |
| Opportunity Log | A1:C10 | 93% | rows 0% / cols 0% | 0 | — | — |
| Forecast | A1:F7 | 100% | rows 0% / cols 0% | 0 | — | — |
| Audit | A1:C6 | 100% | rows 0% / cols 0% | 0 | — | — |
| Script | A1:A17 | 94% | rows 6% / cols 0% | 0 | — | — |
| Pitchonix Template System | A1:D7 | 61% | rows 14% / cols 0% | 0 | — | — |
| Pitchonix Template System 2 | A1:D7 | 61% | rows 14% / cols 0% | 0 | — | — |
| Pitchonix Comparison | A1:C8 | 67% | rows 0% / cols 0% | 0 | — | — |
| Pitchonix Audit | A1:G8 | 100% | rows 0% / cols 0% | 0 | — | — |
| Pitchonix Change Log | A1:C4 | 100% | rows 0% / cols 0% | 0 | — | — |
| Pitchonix Board Summary | A1:B5 | 90% | rows 0% / cols 0% | 0 | — | — |

### Certification Checks

| Check | Result | Measured | Threshold |
|---|---|---|---|
| sheet-density | ✅ | 74% | ≥60% |
| no-clipped-cols | ✅ | 0 clipped col(s) | =0 |
| no-formula-errors | ✅ | 0 error formula(s) | =0 |
| no-autosize-failures | ✅ | 0 autosize failure(s) | =0 |
| no-blank-row-heavy-sheets | ✅ | 0 sheet(s) with >20% blank rows | =0 |
| no-chart-overlap | ✅ | no overlap | no overlap |

#### Column Widths: Executive Summary

| Col | wch | Max content len | Clipped | Autosize fail |
|---|---|---|---|---|
| A | 28 | 115 | — | — |
| B | 20 | 22 | — | — |
| C | 14 | 14 | — | — |
| D | 40 | 10 | — | — |
| E | 50 | 4 | — | — |
| F | 40 | 18 | — | — |
| G | 12 | 10 | — | — |
| H | (default) | 4 | — | — |

#### Column Widths: Source Data

| Col | wch | Max content len | Clipped | Autosize fail |
|---|---|---|---|---|
| A | 28 | 6 | — | — |
| B | 20 | 20 | — | — |
| C | 14 | 17 | — | — |
| D | 40 | 8 | — | — |
| E | 50 | 17 | — | — |
| F | 40 | 20 | — | — |

### Applied Actions

- `modernizeWorkbook`

---

## S3: SaaS Metrics (freeze+headers)

**Template:** `startup-metrics`  
**Export format:** `enhanced-xlsx`  
**Actions applied:** freezeHeaderRow, standardizeHeaders  
**File size:** 43.8 KB  
**Cert:** ✅ PASS  

### Workbook-level Metrics

| Metric | Value |
|---|---|
| Sheets | 12 |
| Sheet names | Executive Summary, Source Data, Assumptions, Dashboard, MRR Dashboard, Customer Cohorts, Unit Economics, Churn Analysis, Forecast, Audit, Script, Pitchonix Template System |
| Generic names (Sheet1…) | 0 |
| Total cells (used range) | 459 |
| Non-blank cells | 329 |
| Avg density (weighted) | **72%** |
| Sparse sheets (density <20%) | 0 |
| Blank-row-heavy sheets (>20%) | 0 |
| Total formulas | 0 |
| Formula errors | 0 |
| Clipped columns | 0 |
| Auto-size failures | 0 |
| Charts | 0 |
| Chart overlap | No |
| Sheets with freeze pane | 1 |
| Sheets with print setup | 0 |

### Per-Sheet Breakdown

| Sheet | Used Range | Density | Blank % | Formulas | Freeze | Flags |
|---|---|---|---|---|---|---|
| Executive Summary | A1:H19 | 28% | rows 11% / cols 0% | 0 | R1C0 | — |
| Source Data | A1:F7 | 100% | rows 0% / cols 0% | 0 | — | — |
| Assumptions | A1:D5 | 100% | rows 0% / cols 0% | 0 | — | — |
| Dashboard | A1:D5 | 100% | rows 0% / cols 0% | 0 | — | — |
| MRR Dashboard | A1:C10 | 93% | rows 0% / cols 0% | 0 | — | — |
| Customer Cohorts | A1:C10 | 93% | rows 0% / cols 0% | 0 | — | — |
| Unit Economics | A1:C10 | 93% | rows 0% / cols 0% | 0 | — | — |
| Churn Analysis | A1:C10 | 93% | rows 0% / cols 0% | 0 | — | — |
| Forecast | A1:F7 | 100% | rows 0% / cols 0% | 0 | — | — |
| Audit | A1:C6 | 100% | rows 0% / cols 0% | 0 | — | — |
| Script | A1:A17 | 94% | rows 6% / cols 0% | 0 | — | — |
| Pitchonix Template System | A1:D7 | 61% | rows 14% / cols 0% | 0 | — | — |

### Certification Checks

| Check | Result | Measured | Threshold |
|---|---|---|---|
| sheet-density | ✅ | 72% | ≥60% |
| no-clipped-cols | ✅ | 0 clipped col(s) | =0 |
| no-formula-errors | ✅ | 0 error formula(s) | =0 |
| no-autosize-failures | ✅ | 0 autosize failure(s) | =0 |
| no-blank-row-heavy-sheets | ✅ | 0 sheet(s) with >20% blank rows | =0 |
| no-chart-overlap | ✅ | no overlap | no overlap |

#### Column Widths: Executive Summary

| Col | wch | Max content len | Clipped | Autosize fail |
|---|---|---|---|---|
| A | 28 | 111 | — | — |
| B | 20 | 22 | — | — |
| C | 14 | 14 | — | — |
| D | 40 | 15 | — | — |
| E | 50 | 4 | — | — |
| F | 40 | 18 | — | — |
| G | 12 | 10 | — | — |
| H | (default) | 4 | — | — |

#### Column Widths: Source Data

| Col | wch | Max content len | Clipped | Autosize fail |
|---|---|---|---|---|
| A | 28 | 6 | — | — |
| B | 20 | 25 | — | — |
| C | 14 | 24 | — | — |
| D | 40 | 15 | — | — |
| E | 50 | 14 | — | — |
| F | 40 | 10 | — | — |

### Applied Actions

- `freezeHeaderRow`
- `standardizeHeaders`

---

## S4: Marketing Analytics

**Template:** `marketing-analytics`  
**Export format:** `comparison-xlsx`  
**Actions applied:** none  
**File size:** 53.2 KB  
**Cert:** ✅ PASS  

### Workbook-level Metrics

| Metric | Value |
|---|---|
| Sheets | 15 |
| Sheet names | Executive Summary, Source Data, Assumptions, Dashboard, Channel Performance, Campaign Results, Lead Attribution, Budget vs Actual, Forecast, Audit, Script, Pitchonix Template System, Pitchonix Comparison, Pitchonix Audit, Pitchonix Change Log |
| Generic names (Sheet1…) | 0 |
| Total cells (used range) | 537 |
| Non-blank cells | 399 |
| Avg density (weighted) | **74%** |
| Sparse sheets (density <20%) | 0 |
| Blank-row-heavy sheets (>20%) | 0 |
| Total formulas | 0 |
| Formula errors | 0 |
| Clipped columns | 0 |
| Auto-size failures | 0 |
| Charts | 0 |
| Chart overlap | No |
| Sheets with freeze pane | 0 |
| Sheets with print setup | 0 |

### Per-Sheet Breakdown

| Sheet | Used Range | Density | Blank % | Formulas | Freeze | Flags |
|---|---|---|---|---|---|---|
| Executive Summary | A1:H19 | 28% | rows 11% / cols 0% | 0 | — | — |
| Source Data | A1:F7 | 100% | rows 0% / cols 0% | 0 | — | — |
| Assumptions | A1:D5 | 100% | rows 0% / cols 0% | 0 | — | — |
| Dashboard | A1:D5 | 100% | rows 0% / cols 0% | 0 | — | — |
| Channel Performance | A1:C10 | 93% | rows 0% / cols 0% | 0 | — | — |
| Campaign Results | A1:C10 | 93% | rows 0% / cols 0% | 0 | — | — |
| Lead Attribution | A1:C10 | 93% | rows 0% / cols 0% | 0 | — | — |
| Budget vs Actual | A1:C10 | 93% | rows 0% / cols 0% | 0 | — | — |
| Forecast | A1:F7 | 100% | rows 0% / cols 0% | 0 | — | — |
| Audit | A1:C7 | 100% | rows 0% / cols 0% | 0 | — | — |
| Script | A1:A17 | 94% | rows 6% / cols 0% | 0 | — | — |
| Pitchonix Template System | A1:D7 | 61% | rows 14% / cols 0% | 0 | — | — |
| Pitchonix Comparison | A1:C8 | 67% | rows 0% / cols 0% | 0 | — | — |
| Pitchonix Audit | A1:G6 | 100% | rows 0% / cols 0% | 0 | — | — |
| Pitchonix Change Log | A1:C3 | 100% | rows 0% / cols 0% | 0 | — | — |

### Certification Checks

| Check | Result | Measured | Threshold |
|---|---|---|---|
| sheet-density | ✅ | 74% | ≥60% |
| no-clipped-cols | ✅ | 0 clipped col(s) | =0 |
| no-formula-errors | ✅ | 0 error formula(s) | =0 |
| no-autosize-failures | ✅ | 0 autosize failure(s) | =0 |
| no-blank-row-heavy-sheets | ✅ | 0 sheet(s) with >20% blank rows | =0 |
| no-chart-overlap | ✅ | no overlap | no overlap |

#### Column Widths: Executive Summary

| Col | wch | Max content len | Clipped | Autosize fail |
|---|---|---|---|---|
| A | 28 | 121 | — | — |
| B | 20 | 22 | — | — |
| C | 14 | 14 | — | — |
| D | 40 | 19 | — | — |
| E | 50 | 4 | — | — |
| F | 40 | 18 | — | — |
| G | 12 | 10 | — | — |
| H | (default) | 4 | — | — |

#### Column Widths: Source Data

| Col | wch | Max content len | Clipped | Autosize fail |
|---|---|---|---|---|
| A | 28 | 6 | — | — |
| B | 20 | 21 | — | — |
| C | 14 | 21 | — | — |
| D | 40 | 13 | — | — |
| E | 50 | 25 | — | — |
| F | 40 | 15 | — | — |

---

## Defect Inventory

No defects detected across 4 scenarios.

## Methodology

Source of truth: actual `.xlsx` buffers exported from `GET /api/excel-studio/projects/:id/export?format=...`.

- **Sheet density**: non-blank cells ÷ total cells in used range (`!ref`)
- **Blank row %**: rows where every cell in used range is empty ÷ total rows
- **Clipped column**: column with `wch < 5` that contains data content
- **Auto-size failure**: column with `wch = 0` where max content string > 8 chars
- **Formula errors**: cells where `cell.t === "e"` or display value ∈ \{#REF!, #DIV/0!, …\}
- **Freeze pane**: detected from `<pane state="frozen">` in `xl/worksheets/sheetN.xml` ZIP entry
- **Charts**: detected from `xl/charts/chartN.xml` entries; overlap via anchor position comparison
- **Print setup**: detected from `<pageSetup` or `<printOptions` in sheet XML
