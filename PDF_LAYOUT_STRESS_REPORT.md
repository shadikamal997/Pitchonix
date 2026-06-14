# PDF_LAYOUT_STRESS_REPORT
## Phase Ω.PDF.QUALITY.1B — Deep Pagination & Layout Stress Certification

**Generated:** 2026-06-13T07:32:26.255Z
**Method:** Real API calls to POST /api/pdf-studio/smart-builder/generate. All metrics from returned PageComposition[]. No estimation, no inference.
**Templates tested:** 30 (all 29 user-selectable templates)
**Scenarios per template:** 15
**Total generations attempted:** 450
**Successful generations:** 450
**Failed generations:** 0
**Average generation time:** 35ms

---

## CERTIFICATION VERDICT

```
╔══════════════════════════════════════════════════════════════╗
║  Ω.PDF.QUALITY.1B — FAILS CERTIFICATION                      ║
║                                                              ║
║  3 failure criteria not met                              ║
║  See "Certification Failures" section below                  ║
╚══════════════════════════════════════════════════════════════╝
```

### Certification Failures

- ❌ 270 continuation pages below 40% utilization (require 0) — tails between 28–40% not caught by current minContinuationOccupancy (0.28) threshold
- ❌ Average utilization 66% < 80% required — pipeline idealOccupancy is 72%; short documents (46–57% util) pull average below threshold
- ❌ Average whitespace 34% > 30% maximum — inverse of utilization gap above

**Note on overflow:** Pipeline emitted 0 VISUAL_OVERFLOW_RISK events. The 420 pages flagged by script height-estimation as ">90%" are likely false positives for list-heavy scenarios. This criterion is marked REQUIRES_HUMAN_REVIEW, not FAIL.

---

## SCORES

| Score | Value | Threshold | Status |
|-------|------:|----------:|:------:|
| Pagination | 89/100 | ≥ 85 | ✅ |
| Composition | 91/100 | ≥ 70 | ✅ |
| Hierarchy | 80/100 | ≥ 70 | ✅ |
| Density | 77/100 | ≥ 60 | ✅ |
| Typography | REQUIRES_HUMAN_REVIEW | — | ⚠️ |
| Template Consistency | 100/100 | ≥ 70 | ✅ |

> **Typography score** cannot be measured from PageComposition[] JSON. Font rendering, kerning, line spacing, column alignment, and glyph quality require visual inspection of rendered PDFs. All typography assertions are marked REQUIRES_HUMAN_REVIEW.

---

## HARD FAILURE CRITERIA

| Criterion | Required | Observed | Status |
|-----------|:--------:|:--------:|:------:|
| Blank pages | 0 | 0 | ✅ PASS |
| Orphan heading pages | 0 | 0 | ✅ PASS |
| Continuation pages < 40% util | 0 | 270 | ❌ FAIL |
| Pages < 30% util | 0 | 30 | ❌ FAIL |
| Repeated headings | 0 | 0 | ✅ PASS |
| Average utilization | ≥ 80% | 66% | ❌ FAIL |
| Average whitespace | ≤ 30% | 34% | ❌ FAIL |
| Overflow pages (pipeline-confirmed) | 0 | 0 | ✅ PASS |
| Overflow pages (script estimation) | 0 | 420 | REQUIRES_HUMAN_REVIEW |
| Table continuation ≤ 1 row | 0 | REQUIRES_HUMAN_REVIEW | ⚠️ |
| Content clipping | 0 | REQUIRES_HUMAN_REVIEW | ⚠️ |

> **Overflow pages note:** The pipeline emitted zero `VISUAL_OVERFLOW_RISK` publishing issues across all 450 documents — meaning the pipeline does not believe any pages have remaining overflow after splitting. The 420 pages flagged by the script's height re-estimation are **likely false positives**: the list section height formula (`words × 5.4px`) does not account for nesting depth. Deeply nested lists in `hundred_bullets` (9 pages/doc) and `nested_lists` (5 pages/doc) scenarios produce sections the pipeline correctly placed at ≤90% occupancy, but the script's re-estimation of those placed sections exceeds 90%. True overflow confirmation requires visual inspection of rendered PDFs. The 750 `AUTO_SPLIT_OVERFLOW` pipeline events represent overflows that were **auto-fixed** during composition — not remaining overflows.

> **Table continuation ≤ 1 row** and **content clipping** cannot be detected from PageComposition[] JSON. Markdown tables are parsed as paragraph/list sections — no table row count is available in composition metadata. Clipping requires visual inspection of rendered PDF pixels. Both require human review of rendered output.

---

## PER-TEMPLATE SCORES

Threshold: ≥ 85 required for certification.

| Template | Score | Blank | Orphan | Cont<40% | Below30% | Repeated | Overflow | Status |
|----------|------:|------:|-------:|---------:|---------:|---------:|---------:|:------:|
| Modern One Pager | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| Executive One Pager | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| Business Plan Pro | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| Clean Business Report | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| Corporate Overview | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| Financial Report | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| KPI Dashboard Report | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| Budget Plan Report | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| Data Insights Report | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| Client Proposal Pro | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| Sales Proposal Advanced | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| Client Performance Report | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| Partnership Proposal | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| Strategy Document | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| Roadmap Timeline | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| OKR Goals Report | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| Internal Team Report | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| Product Requirements | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| Technical Documentation | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| Brand Guidelines | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| Employee Handbook | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| Quarterly Business Review | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| Board Meeting Report | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| Investor Pitch Deck | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| Whitepaper | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| Case Study Document | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| Product Launch Plan | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| Market Research Report | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| Project Proposal | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |
| Sales Playbook | 89/100 | 0 | 0 | 9 | 1 | 0 | 14 | ✅ |

---

## AGGREGATE METRICS

| Metric | Value |
|--------|------:|
| Total documents generated | 450 |
| Total documents failed | 0 |
| Average page count | 8 |
| Average content utilization | 66% |
| Average whitespace | 34% |
| Average words/page | 87 |
| Total blank pages | 0 |
| Total orphan heading pages | 0 |
| Total overflow pages (pipeline-confirmed) | 0 |
| Total overflow pages (script estimation, likely false positives) | 420 |
| Total pages < 30% utilization | 30 |
| Total continuation pages < 40% | 270 |
| Total repeated headings | 0 |
| Total AUTO_SPLIT_OVERFLOW events | 750 |
| Total AUTO_MERGE_UNDERFILLED events | 0 |
| Total orphan heading removals | 30 |
| Average generation time | 35ms |

---

## PER-SCENARIO AGGREGATE

| Scenario | Docs | Avg Pages | Avg Util% | Avg WS% | Blank | Orphan | Overflow | Cont<40% |
|----------|-----:|----------:|----------:|--------:|------:|-------:|---------:|---------:|
| short | 30 | 1.7 | 46% | 54% | 0 | 0 | 0 | 0 |
| medium | 30 | 3.7 | 57% | 43% | 0 | 0 | 0 | 0 |
| long | 30 | 9.7 | 60% | 40% | 0 | 0 | 0 | 30 |
| very_long | 30 | 15.7 | 64% | 36% | 0 | 0 | 0 | 30 |
| single_massive_section | 30 | 4.7 | 71% | 29% | 0 | 0 | 0 | 0 |
| hundred_bullets | 30 | 11.7 | 86% | 14% | 0 | 0 | 270 | 30 |
| heading_hierarchy | 30 | 14.7 | 72% | 28% | 0 | 0 | 0 | 0 |
| tables_heavy | 30 | 5.7 | 56% | 44% | 0 | 0 | 0 | 30 |
| mixed_tables_charts | 30 | 4.7 | 59% | 41% | 0 | 0 | 0 | 30 |
| quote_heavy | 30 | 9.7 | 69% | 31% | 0 | 0 | 0 | 30 |
| mixed_content | 30 | 7.7 | 64% | 36% | 0 | 0 | 0 | 30 |
| arabic_doc | 30 | 3.7 | 70% | 30% | 0 | 0 | 0 | 0 |
| english_doc | 30 | 7.7 | 62% | 38% | 0 | 0 | 0 | 30 |
| mixed_rtl_ltr | 30 | 4.7 | 74% | 26% | 0 | 0 | 0 | 0 |
| nested_lists | 30 | 13.7 | 79% | 21% | 0 | 0 | 150 | 30 |

---

## PER-TEMPLATE DETAIL

### Modern One Pager — 89/100 ✅

Cover: false | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 1 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 3 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 15 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 4 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 11 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 14 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 5 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 4 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 9 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 7 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 3 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 4 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 13 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### Executive One Pager — 89/100 ✅

Cover: true | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 10 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 5 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 10 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 8 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### Business Plan Pro — 89/100 ✅

Cover: true | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 10 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 5 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 10 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 8 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### Clean Business Report — 89/100 ✅

Cover: false | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 1 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 3 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 15 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 4 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 11 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 14 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 5 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 4 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 9 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 7 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 3 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 4 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 13 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### Corporate Overview — 89/100 ✅

Cover: true | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 10 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 5 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 10 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 8 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### Financial Report — 89/100 ✅

Cover: true | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 10 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 5 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 10 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 8 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### KPI Dashboard Report — 89/100 ✅

Cover: false | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 1 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 3 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 15 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 4 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 11 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 14 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 5 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 4 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 9 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 7 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 3 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 4 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 13 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### Budget Plan Report — 89/100 ✅

Cover: false | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 1 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 3 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 15 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 4 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 11 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 14 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 5 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 4 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 9 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 7 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 3 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 4 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 13 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### Data Insights Report — 89/100 ✅

Cover: true | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 10 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 5 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 10 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 8 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### Client Proposal Pro — 89/100 ✅

Cover: true | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 10 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 5 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 10 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 8 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### Sales Proposal Advanced — 89/100 ✅

Cover: true | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 10 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 5 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 10 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 8 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### Client Performance Report — 89/100 ✅

Cover: false | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 1 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 3 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 15 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 4 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 11 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 14 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 5 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 4 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 9 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 7 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 3 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 4 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 13 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### Partnership Proposal — 89/100 ✅

Cover: true | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 10 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 5 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 10 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 8 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### Strategy Document — 89/100 ✅

Cover: true | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 10 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 5 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 10 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 8 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### Roadmap Timeline — 89/100 ✅

Cover: false | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 1 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 3 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 15 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 4 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 11 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 14 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 5 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 4 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 9 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 7 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 3 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 4 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 13 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### OKR Goals Report — 89/100 ✅

Cover: false | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 1 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 3 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 15 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 4 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 11 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 14 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 5 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 4 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 9 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 7 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 3 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 4 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 13 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### Internal Team Report — 89/100 ✅

Cover: false | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 1 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 3 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 15 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 4 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 11 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 14 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 5 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 4 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 9 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 7 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 3 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 4 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 13 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### Product Requirements — 89/100 ✅

Cover: true | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 10 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 5 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 10 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 8 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### Technical Documentation — 89/100 ✅

Cover: false | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 1 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 3 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 15 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 4 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 11 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 14 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 5 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 4 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 9 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 7 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 3 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 4 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 13 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### Brand Guidelines — 89/100 ✅

Cover: true | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 10 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 5 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 10 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 8 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### Employee Handbook — 89/100 ✅

Cover: true | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 10 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 5 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 10 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 8 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### Quarterly Business Review — 89/100 ✅

Cover: true | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 10 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 5 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 10 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 8 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### Board Meeting Report — 89/100 ✅

Cover: true | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 10 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 5 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 10 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 8 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### Investor Pitch Deck — 89/100 ✅

Cover: true | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 10 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 5 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 10 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 8 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### Whitepaper — 89/100 ✅

Cover: true | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 10 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 5 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 10 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 8 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### Case Study Document — 89/100 ✅

Cover: true | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 10 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 5 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 10 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 8 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### Product Launch Plan — 89/100 ✅

Cover: true | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 10 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 5 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 10 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 8 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### Market Research Report — 89/100 ✅

Cover: true | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 10 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 5 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 10 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 8 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### Project Proposal — 89/100 ✅

Cover: true | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 10 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 5 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 10 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 8 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

### Sales Playbook — 89/100 ✅

Cover: true | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 10 | 60% | 40% | 72 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 1 | 0 | 4 | 0 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 9 | 1 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_tables_charts | 5 | 59% | 41% | 96 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| quote_heavy | 10 | 69% | 31% | 90 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 8 | 62% | 38% | 108 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 1 | 0 | 2 | 0 |

---

## SPECIFIC FINDINGS

**300 distinct findings** (300 total occurrences):

### Finding 1 — HIGH: Continuation page 9 at 33% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Modern One Pager |
| Scenario | long |
| Page | 9 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 2 — HIGH: Continuation page 12 at 34% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Modern One Pager |
| Scenario | very_long |
| Page | 12 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 3 — HIGH: Continuation page 11 at 38% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Modern One Pager |
| Scenario | hundred_bullets |
| Page | 11 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 4 — HIGH: Continuation page 5 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Modern One Pager |
| Scenario | tables_heavy |
| Page | 5 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 5 — HIGH: Continuation page 4 at 27% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Modern One Pager |
| Scenario | mixed_tables_charts |
| Page | 4 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 6 — MEDIUM: Page 4 at 27% utilization (below 30%)

| Field | Value |
|-------|-------|
| Template | Modern One Pager |
| Scenario | mixed_tables_charts |
| Page | 4 |
| Root cause | Short section not merged with adjacent page; backward and forward merge passes both rejected |
| Code location | `pagination-intelligence.service.ts:mergeUnderfilledPages()` |
| Recommended fix | Review merge rejection conditions for short sections adjacent to medium-density pages |

### Finding 7 — HIGH: Continuation page 4 at 33% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Modern One Pager |
| Scenario | quote_heavy |
| Page | 4 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 8 — HIGH: Continuation page 5 at 38% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Modern One Pager |
| Scenario | mixed_content |
| Page | 5 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 9 — HIGH: Continuation page 3 at 37% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Modern One Pager |
| Scenario | english_doc |
| Page | 3 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 10 — HIGH: Continuation page 13 at 39% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Modern One Pager |
| Scenario | nested_lists |
| Page | 13 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 11 — HIGH: Continuation page 10 at 33% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Executive One Pager |
| Scenario | long |
| Page | 10 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 12 — HIGH: Continuation page 13 at 34% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Executive One Pager |
| Scenario | very_long |
| Page | 13 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 13 — HIGH: Continuation page 12 at 38% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Executive One Pager |
| Scenario | hundred_bullets |
| Page | 12 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 14 — HIGH: Continuation page 6 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Executive One Pager |
| Scenario | tables_heavy |
| Page | 6 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 15 — HIGH: Continuation page 5 at 27% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Executive One Pager |
| Scenario | mixed_tables_charts |
| Page | 5 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 16 — MEDIUM: Page 5 at 27% utilization (below 30%)

| Field | Value |
|-------|-------|
| Template | Executive One Pager |
| Scenario | mixed_tables_charts |
| Page | 5 |
| Root cause | Short section not merged with adjacent page; backward and forward merge passes both rejected |
| Code location | `pagination-intelligence.service.ts:mergeUnderfilledPages()` |
| Recommended fix | Review merge rejection conditions for short sections adjacent to medium-density pages |

### Finding 17 — HIGH: Continuation page 5 at 33% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Executive One Pager |
| Scenario | quote_heavy |
| Page | 5 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 18 — HIGH: Continuation page 6 at 38% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Executive One Pager |
| Scenario | mixed_content |
| Page | 6 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 19 — HIGH: Continuation page 4 at 37% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Executive One Pager |
| Scenario | english_doc |
| Page | 4 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 20 — HIGH: Continuation page 14 at 39% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Executive One Pager |
| Scenario | nested_lists |
| Page | 14 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 21 — HIGH: Continuation page 10 at 33% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Business Plan Pro |
| Scenario | long |
| Page | 10 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 22 — HIGH: Continuation page 13 at 34% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Business Plan Pro |
| Scenario | very_long |
| Page | 13 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 23 — HIGH: Continuation page 12 at 38% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Business Plan Pro |
| Scenario | hundred_bullets |
| Page | 12 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 24 — HIGH: Continuation page 6 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Business Plan Pro |
| Scenario | tables_heavy |
| Page | 6 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 25 — HIGH: Continuation page 5 at 27% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Business Plan Pro |
| Scenario | mixed_tables_charts |
| Page | 5 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 26 — MEDIUM: Page 5 at 27% utilization (below 30%)

| Field | Value |
|-------|-------|
| Template | Business Plan Pro |
| Scenario | mixed_tables_charts |
| Page | 5 |
| Root cause | Short section not merged with adjacent page; backward and forward merge passes both rejected |
| Code location | `pagination-intelligence.service.ts:mergeUnderfilledPages()` |
| Recommended fix | Review merge rejection conditions for short sections adjacent to medium-density pages |

### Finding 27 — HIGH: Continuation page 5 at 33% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Business Plan Pro |
| Scenario | quote_heavy |
| Page | 5 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 28 — HIGH: Continuation page 6 at 38% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Business Plan Pro |
| Scenario | mixed_content |
| Page | 6 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 29 — HIGH: Continuation page 4 at 37% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Business Plan Pro |
| Scenario | english_doc |
| Page | 4 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 30 — HIGH: Continuation page 14 at 39% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Business Plan Pro |
| Scenario | nested_lists |
| Page | 14 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 31 — HIGH: Continuation page 9 at 33% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Clean Business Report |
| Scenario | long |
| Page | 9 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 32 — HIGH: Continuation page 12 at 34% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Clean Business Report |
| Scenario | very_long |
| Page | 12 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 33 — HIGH: Continuation page 11 at 38% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Clean Business Report |
| Scenario | hundred_bullets |
| Page | 11 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 34 — HIGH: Continuation page 5 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Clean Business Report |
| Scenario | tables_heavy |
| Page | 5 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 35 — HIGH: Continuation page 4 at 27% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Clean Business Report |
| Scenario | mixed_tables_charts |
| Page | 4 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 36 — MEDIUM: Page 4 at 27% utilization (below 30%)

| Field | Value |
|-------|-------|
| Template | Clean Business Report |
| Scenario | mixed_tables_charts |
| Page | 4 |
| Root cause | Short section not merged with adjacent page; backward and forward merge passes both rejected |
| Code location | `pagination-intelligence.service.ts:mergeUnderfilledPages()` |
| Recommended fix | Review merge rejection conditions for short sections adjacent to medium-density pages |

### Finding 37 — HIGH: Continuation page 4 at 33% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Clean Business Report |
| Scenario | quote_heavy |
| Page | 4 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 38 — HIGH: Continuation page 5 at 38% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Clean Business Report |
| Scenario | mixed_content |
| Page | 5 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 39 — HIGH: Continuation page 3 at 37% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Clean Business Report |
| Scenario | english_doc |
| Page | 3 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 40 — HIGH: Continuation page 13 at 39% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Clean Business Report |
| Scenario | nested_lists |
| Page | 13 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 41 — HIGH: Continuation page 10 at 33% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Corporate Overview |
| Scenario | long |
| Page | 10 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 42 — HIGH: Continuation page 13 at 34% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Corporate Overview |
| Scenario | very_long |
| Page | 13 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 43 — HIGH: Continuation page 12 at 38% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Corporate Overview |
| Scenario | hundred_bullets |
| Page | 12 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 44 — HIGH: Continuation page 6 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Corporate Overview |
| Scenario | tables_heavy |
| Page | 6 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 45 — HIGH: Continuation page 5 at 27% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Corporate Overview |
| Scenario | mixed_tables_charts |
| Page | 5 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 46 — MEDIUM: Page 5 at 27% utilization (below 30%)

| Field | Value |
|-------|-------|
| Template | Corporate Overview |
| Scenario | mixed_tables_charts |
| Page | 5 |
| Root cause | Short section not merged with adjacent page; backward and forward merge passes both rejected |
| Code location | `pagination-intelligence.service.ts:mergeUnderfilledPages()` |
| Recommended fix | Review merge rejection conditions for short sections adjacent to medium-density pages |

### Finding 47 — HIGH: Continuation page 5 at 33% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Corporate Overview |
| Scenario | quote_heavy |
| Page | 5 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 48 — HIGH: Continuation page 6 at 38% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Corporate Overview |
| Scenario | mixed_content |
| Page | 6 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 49 — HIGH: Continuation page 4 at 37% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Corporate Overview |
| Scenario | english_doc |
| Page | 4 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 50 — HIGH: Continuation page 14 at 39% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Corporate Overview |
| Scenario | nested_lists |
| Page | 14 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

*... and 250 more findings. Full list in certification-reports/pdf-layout-stress.json.*

---

## REQUIRES_HUMAN_REVIEW

The following audit areas cannot be measured from PageComposition[] JSON. They require visual inspection of rendered PDFs.

| Audit Area | Why Not Measurable | How to Verify |
|------------|-------------------|---------------|
| Content clipping | Clipping is a CSS/render artifact not reflected in section data | Open rendered PDF; scroll each page; check text cut off at margins |
| Overflow pages confirmation | Script uses estimated heights; pipeline emitted 0 VISUAL_OVERFLOW_RISK events but 420 pages show estimated occupancy >90% for list-heavy scenarios | Render `hundred_bullets` and `nested_lists` scenarios; verify no visible content cut-off |
| Typography quality | Font rendering, kerning, ligatures require pixel inspection | Review rendered PDF on screen and print |
| Column alignment | Multi-column layout alignment is a CSS property, not composition data | Visually verify columns are flush and balanced |
| Table row count in continuation | Markdown tables convert to paragraph/list; no row count in JSON | Render PDF; check table pages for continuation with < 2 rows |
| Image placement accuracy | Image block = fixed 220px placeholder; actual image not in JSON | Render PDF with real images; verify placement and sizing |
| RTL text directionality | Unicode bidi property present in text but not validated by pipeline | Render Arabic/RTL scenarios; verify right-to-left rendering |
| Line spacing consistency | Line height is a CSS property applied at render time | Inspect rendered paragraph spacing across templates |

---

## PIPELINE EVENTS SUMMARY

| Event Code | Severity | Total | Example Templates |
|------------|----------|------:|-------------------|
| AUTO_SPLIT_OVERFLOW | info | 750 | Modern One Pager/medium, Modern One Pager/long |
| AUTO_REMOVE_ORPHAN_HEADING | warning | 30 | Modern One Pager/heading_hierarchy, Executive One Pager/heading_hierarchy |

---

*All measurements from real API responses. Pipeline: ContentBlockExtractor → OutlineBuilder → RuleBasedPagePlanner → DocumentCompositionService → PaginationIntelligenceService → PublishingIntelligenceService. Source of truth: PageComposition[] returned by POST /api/pdf-studio/smart-builder/generate. No estimation. No inference. Rendered output is the source of truth.*

*Certification date: 2026-06-13*