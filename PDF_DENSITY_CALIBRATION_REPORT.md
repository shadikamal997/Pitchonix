# PDF_DENSITY_CALIBRATION_REPORT
## Phase Ω.PDF.QUALITY.1C — Density Calibration Re-run (450-document matrix)

**Generated:** 2026-06-13T08:53:40.460Z
**Method:** Real API calls to POST /api/pdf-studio/smart-builder/generate. All metrics from returned PageComposition[]. No estimation, no inference.
**Calibration changes applied:** minContinuationOccupancy 0.28→0.40, minOccupancy 0.32→0.38, idealOccupancy 0.72→0.80, forward-merge word limit 120→200, MIN_WORDS 250→320, MAX_WORDS 650→780, TARGETS.content 460→540, TARGETS.summary/intro/conclusion raised ~80 words.
**Templates tested:** 30 (all 29 user-selectable templates)
**Scenarios per template:** 15
**Total generations attempted:** 450
**Successful generations:** 446
**Failed generations:** 4
**Average generation time:** 333ms

---

## CERTIFICATION VERDICT

```
╔══════════════════════════════════════════════════════════════╗
║  Ω.PDF.QUALITY.1C — FAILS CERTIFICATION                      ║
║                                                              ║
║  1 failure criteria not met                              ║
║  See "Certification Failures" section below                  ║
╚══════════════════════════════════════════════════════════════╝
```

### Certification Failures

- ❌ Average content-page utilization 72% < 80% required (natural final pages and single-page docs excluded)

---

## SCORES

| Score | Value | Threshold | Status |
|-------|------:|----------:|:------:|
| Pagination | 95/100 | ≥ 85 | ✅ |
| Composition | 83/100 | ≥ 70 | ✅ |
| Hierarchy | 80/100 | ≥ 70 | ✅ |
| Density | 81/100 | ≥ 60 | ✅ |
| Typography | REQUIRES_HUMAN_REVIEW | — | ⚠️ |
| Template Consistency | 99/100 | ≥ 70 | ✅ |

> **Typography score** cannot be measured from PageComposition[] JSON. Font rendering, kerning, line spacing, column alignment, and glyph quality require visual inspection of rendered PDFs. All typography assertions are marked REQUIRES_HUMAN_REVIEW.

---

## HARD FAILURE CRITERIA

| Criterion | Required | Observed | Status |
|-----------|:--------:|:--------:|:------:|
| Blank pages | 0 | 0 | ✅ PASS |
| Orphan heading pages | 0 | 0 | ✅ PASS |
| Continuation pages < 40% util | 0 | 0 | ✅ PASS |
| Pages < 30% util | 0 | 0 | ✅ PASS |
| Repeated headings | 0 | 0 | ✅ PASS |
| Avg content-page util (cert, excl. natural final + single-page) | ≥ 80% | 72% | ❌ FAIL |
| Avg util all content pages | — (informational) | 67% | ℹ️ |
| Avg natural-final-page util | — (reported honestly) | 52% | ℹ️ |
| Natural final pages classified | 446 | 446 | ℹ️ |
| Cert whitespace (100% − cert util) | ≤ 30% | 28% | ✅ PASS |
| Avg whitespace all content pages | — (informational) | 33% | ℹ️ |
| Overflow pages (pipeline-confirmed) | 0 | 0 | ✅ PASS |
| Overflow pages (script estimation) | — | 390 | ⚠️ REQUIRES_HUMAN_REVIEW |
| Table continuation ≤ 1 row | 0 | REQUIRES_HUMAN_REVIEW | ⚠️ |
| Content clipping | 0 | REQUIRES_HUMAN_REVIEW | ⚠️ |

> **Natural final page policy**: The last content page of each document is classified as a "natural final page" — it is inherently sparse (closing content, cannot merge forward) and is excluded from the ≥80% avg utilization cert criterion. Reported honestly in the informational rows above.

> **Overflow pages (script estimation)**: The script's list height formula (`words × 5.4px`) does not account for nesting depth. Bullet-heavy scenarios (hundred_bullets, nested_lists) are flagged by this estimate, but the pipeline emitted 0 VISUAL_OVERFLOW_RISK events — no actual overflow. These are estimation artifacts, not real overflow. REQUIRES_HUMAN_REVIEW of rendered PDFs.

> **Table continuation ≤ 1 row** and **content clipping** cannot be detected from PageComposition[] JSON. Markdown tables are parsed as paragraph/list sections — no table row count is available in composition metadata. Clipping requires visual inspection of rendered PDF pixels. Both require human review of rendered output.

---

## PER-TEMPLATE SCORES

Threshold: ≥ 85 required for certification.

| Template | Score | Blank | Orphan | Cont<40% | Below30% | Repeated | Overflow | Status |
|----------|------:|------:|-------:|---------:|---------:|---------:|---------:|:------:|
| Modern One Pager | 95/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| Executive One Pager | 95/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| Business Plan Pro | 95/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| Clean Business Report | 95/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| Corporate Overview | 95/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| Financial Report | 95/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| KPI Dashboard Report | 94/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| Budget Plan Report | 95/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| Data Insights Report | 95/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| Client Proposal Pro | 95/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| Sales Proposal Advanced | 95/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| Client Performance Report | 95/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| Partnership Proposal | 95/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| Strategy Document | 94/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| Roadmap Timeline | 95/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| OKR Goals Report | 95/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| Internal Team Report | 95/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| Product Requirements | 95/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| Technical Documentation | 95/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| Brand Guidelines | 95/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| Employee Handbook | 94/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| Quarterly Business Review | 95/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| Board Meeting Report | 95/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| Investor Pitch Deck | 95/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| Whitepaper | 95/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| Case Study Document | 95/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| Product Launch Plan | 94/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| Market Research Report | 95/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| Project Proposal | 95/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |
| Sales Playbook | 95/100 | 0 | 0 | 0 | 0 | 0 | 13 | ✅ |

---

## AGGREGATE METRICS

| Metric | Value |
|--------|------:|
| Total documents generated | 446 |
| Total documents failed | 4 |
| Average page count | 8 |
| Avg content-page util (cert metric, excl. natural final + single-page docs) | 72% |
| Cert-eligible documents (multi-page with non-final content) | 416 |
| Avg content util all pages (incl. natural final) | 67% |
| Avg natural-final-page util | 52% |
| Total natural final pages classified | 446 |
| Average whitespace | 33% |
| Average words/page | 89 |
| Total blank pages | 0 |
| Total orphan heading pages | 0 |
| Total overflow pages | 390 |
| Total pages < 30% utilization | 0 |
| Total continuation pages < 40% | 0 |
| Total repeated headings | 0 |
| Total AUTO_SPLIT_OVERFLOW events | 595 |
| Total AUTO_MERGE_UNDERFILLED events | 30 |
| Total orphan heading removals | 29 |
| Average generation time | 333ms |

---

## PER-SCENARIO AGGREGATE

| Scenario | Docs | Avg Pages | Avg Util% | Avg WS% | Blank | Orphan | Overflow | Cont<40% |
|----------|-----:|----------:|----------:|--------:|------:|-------:|---------:|---------:|
| short | 30 | 1.7 | 46% | 54% | 0 | 0 | 0 | 0 |
| medium | 30 | 3.7 | 57% | 43% | 0 | 0 | 0 | 0 |
| long | 29 | 8.7 | 68% | 32% | 0 | 0 | 0 | 0 |
| very_long | 30 | 15.7 | 64% | 36% | 0 | 0 | 0 | 0 |
| single_massive_section | 30 | 4.7 | 71% | 29% | 0 | 0 | 0 | 0 |
| hundred_bullets | 30 | 11.7 | 86% | 14% | 0 | 0 | 240 | 0 |
| heading_hierarchy | 29 | 14.7 | 72% | 28% | 0 | 0 | 0 | 0 |
| tables_heavy | 30 | 5.7 | 56% | 44% | 0 | 0 | 0 | 0 |
| mixed_tables_charts | 30 | 4.7 | 60% | 40% | 0 | 0 | 0 | 0 |
| quote_heavy | 30 | 9.7 | 68% | 32% | 0 | 0 | 0 | 0 |
| mixed_content | 29 | 7.7 | 64% | 36% | 0 | 0 | 0 | 0 |
| arabic_doc | 30 | 3.7 | 70% | 30% | 0 | 0 | 0 | 0 |
| english_doc | 30 | 6.7 | 72% | 28% | 0 | 0 | 0 | 0 |
| mixed_rtl_ltr | 29 | 4.7 | 74% | 26% | 0 | 0 | 0 | 0 |
| nested_lists | 30 | 13.7 | 79% | 21% | 0 | 0 | 150 | 0 |

---

## PER-TEMPLATE DETAIL

### Modern One Pager — 95/100 ✅

Cover: false | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 1 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 3 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 8 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 15 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 4 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 11 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 14 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 5 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 4 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 9 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 7 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 3 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 6 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 4 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 13 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### Executive One Pager — 95/100 ✅

Cover: true | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 5 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 10 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### Business Plan Pro — 95/100 ✅

Cover: true | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 5 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 10 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### Clean Business Report — 95/100 ✅

Cover: false | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 1 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 3 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 8 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 15 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 4 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 11 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 14 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 5 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 4 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 9 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 7 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 3 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 6 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 4 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 13 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### Corporate Overview — 95/100 ✅

Cover: true | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 5 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 10 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### Financial Report — 95/100 ✅

Cover: true | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 5 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 10 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### KPI Dashboard Report — 94/100 ✅

Cover: false | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 1 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 3 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 8 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 15 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 4 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 11 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 14 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 5 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 4 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 9 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 3 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 6 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 4 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 13 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### Budget Plan Report — 95/100 ✅

Cover: false | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 1 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 3 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 8 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 15 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 4 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 11 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 14 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 5 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 4 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 9 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 7 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 3 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 6 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 4 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 13 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### Data Insights Report — 95/100 ✅

Cover: true | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 5 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 10 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### Client Proposal Pro — 95/100 ✅

Cover: true | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 5 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 10 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### Sales Proposal Advanced — 95/100 ✅

Cover: true | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 5 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 10 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### Client Performance Report — 95/100 ✅

Cover: false | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 1 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 3 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 8 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 15 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 4 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 11 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 14 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 5 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 4 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 9 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 7 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 3 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 6 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 4 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 13 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### Partnership Proposal — 95/100 ✅

Cover: true | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 5 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 10 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### Strategy Document — 94/100 ✅

Cover: true | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 5 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 10 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### Roadmap Timeline — 95/100 ✅

Cover: false | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 1 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 3 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 8 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 15 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 4 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 11 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 14 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 5 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 4 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 9 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 7 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 3 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 6 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 4 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 13 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### OKR Goals Report — 95/100 ✅

Cover: false | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 1 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 3 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 8 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 15 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 4 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 11 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 14 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 5 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 4 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 9 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 7 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 3 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 6 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 4 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 13 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### Internal Team Report — 95/100 ✅

Cover: false | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 1 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 3 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 8 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 15 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 4 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 11 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 14 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 5 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 4 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 9 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 7 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 3 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 6 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 4 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 13 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### Product Requirements — 95/100 ✅

Cover: true | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 5 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 10 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### Technical Documentation — 95/100 ✅

Cover: false | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 1 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 3 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 8 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 15 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 4 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 11 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 14 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 5 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 4 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 9 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 7 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 3 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 6 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 4 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 13 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### Brand Guidelines — 95/100 ✅

Cover: true | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 5 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 10 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### Employee Handbook — 94/100 ✅

Cover: true | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 5 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 10 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### Quarterly Business Review — 95/100 ✅

Cover: true | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 5 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 10 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### Board Meeting Report — 95/100 ✅

Cover: true | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 5 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 10 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### Investor Pitch Deck — 95/100 ✅

Cover: true | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 5 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 10 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### Whitepaper — 95/100 ✅

Cover: true | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 5 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 10 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### Case Study Document — 95/100 ✅

Cover: true | TOC: false

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 5 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 10 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### Product Launch Plan — 94/100 ✅

Cover: true | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 5 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 10 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### Market Research Report — 95/100 ✅

Cover: true | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 5 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 10 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### Project Proposal — 95/100 ✅

Cover: true | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 5 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 10 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

### Sales Playbook — 95/100 ✅

Cover: true | TOC: true

| Scenario | Pages | Util% | WS% | Words/Pg | Blank | Orphan | Overflow | Cont<40% | Repeated | Split | Merge |
|----------|------:|------:|----:|---------:|------:|-------:|---------:|---------:|---------:|------:|------:|
| short | 2 | 46% | 54% | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | 4 | 57% | 43% | 62 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| long | 9 | 68% | 32% | 81 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| very_long | 16 | 64% | 36% | 84 | 0 | 0 | 0 | 0 | 0 | 4 | 1 |
| single_massive_section | 5 | 71% | 29% | 196 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| hundred_bullets | 12 | 86% | 14% | 43 | 0 | 0 | 8 | 0 | 0 | 1 | 0 |
| heading_hierarchy | 15 | 72% | 28% | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| tables_heavy | 6 | 56% | 44% | 151 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_tables_charts | 5 | 60% | 40% | 96 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| quote_heavy | 10 | 68% | 32% | 90 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| mixed_content | 8 | 64% | 36% | 74 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| arabic_doc | 4 | 70% | 30% | 100 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| english_doc | 7 | 72% | 28% | 126 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| mixed_rtl_ltr | 5 | 74% | 26% | 98 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| nested_lists | 14 | 79% | 21% | 34 | 0 | 0 | 5 | 0 | 0 | 2 | 0 |

---

## SPECIFIC FINDINGS

**30 distinct findings** (30 total occurrences):

### Finding 1 — HIGH: Continuation page 5 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Modern One Pager |
| Scenario | tables_heavy |
| Page | 5 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 2 — HIGH: Continuation page 6 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Executive One Pager |
| Scenario | tables_heavy |
| Page | 6 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 3 — HIGH: Continuation page 6 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Business Plan Pro |
| Scenario | tables_heavy |
| Page | 6 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 4 — HIGH: Continuation page 5 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Clean Business Report |
| Scenario | tables_heavy |
| Page | 5 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 5 — HIGH: Continuation page 6 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Corporate Overview |
| Scenario | tables_heavy |
| Page | 6 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 6 — HIGH: Continuation page 6 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Financial Report |
| Scenario | tables_heavy |
| Page | 6 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 7 — HIGH: Continuation page 5 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | KPI Dashboard Report |
| Scenario | tables_heavy |
| Page | 5 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 8 — HIGH: Continuation page 5 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Budget Plan Report |
| Scenario | tables_heavy |
| Page | 5 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 9 — HIGH: Continuation page 6 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Data Insights Report |
| Scenario | tables_heavy |
| Page | 6 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 10 — HIGH: Continuation page 6 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Client Proposal Pro |
| Scenario | tables_heavy |
| Page | 6 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 11 — HIGH: Continuation page 6 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Sales Proposal Advanced |
| Scenario | tables_heavy |
| Page | 6 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 12 — HIGH: Continuation page 5 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Client Performance Report |
| Scenario | tables_heavy |
| Page | 5 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 13 — HIGH: Continuation page 6 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Partnership Proposal |
| Scenario | tables_heavy |
| Page | 6 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 14 — HIGH: Continuation page 6 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Strategy Document |
| Scenario | tables_heavy |
| Page | 6 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 15 — HIGH: Continuation page 5 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Roadmap Timeline |
| Scenario | tables_heavy |
| Page | 5 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 16 — HIGH: Continuation page 5 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | OKR Goals Report |
| Scenario | tables_heavy |
| Page | 5 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 17 — HIGH: Continuation page 5 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Internal Team Report |
| Scenario | tables_heavy |
| Page | 5 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 18 — HIGH: Continuation page 6 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Product Requirements |
| Scenario | tables_heavy |
| Page | 6 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 19 — HIGH: Continuation page 5 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Technical Documentation |
| Scenario | tables_heavy |
| Page | 5 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 20 — HIGH: Continuation page 6 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Brand Guidelines |
| Scenario | tables_heavy |
| Page | 6 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 21 — HIGH: Continuation page 6 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Employee Handbook |
| Scenario | tables_heavy |
| Page | 6 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 22 — HIGH: Continuation page 6 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Quarterly Business Review |
| Scenario | tables_heavy |
| Page | 6 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 23 — HIGH: Continuation page 6 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Board Meeting Report |
| Scenario | tables_heavy |
| Page | 6 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 24 — HIGH: Continuation page 6 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Investor Pitch Deck |
| Scenario | tables_heavy |
| Page | 6 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 25 — HIGH: Continuation page 6 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Whitepaper |
| Scenario | tables_heavy |
| Page | 6 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 26 — HIGH: Continuation page 6 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Case Study Document |
| Scenario | tables_heavy |
| Page | 6 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 27 — HIGH: Continuation page 6 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Product Launch Plan |
| Scenario | tables_heavy |
| Page | 6 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 28 — HIGH: Continuation page 6 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Market Research Report |
| Scenario | tables_heavy |
| Page | 6 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 29 — HIGH: Continuation page 6 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Project Proposal |
| Scenario | tables_heavy |
| Page | 6 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

### Finding 30 — HIGH: Continuation page 6 at 35% utilization (below 40% threshold)

| Field | Value |
|-------|-------|
| Template | Sales Playbook |
| Scenario | tables_heavy |
| Page | 6 |
| Root cause | Split tail not balanced and forward merge threshold (0.28) did not catch this continuation |
| Code location | `pagination-intelligence.service.ts:balanceSplitTail()` and `mergeUnderfilledPages()` Pass 2 |
| Recommended fix | Raise `minContinuationOccupancy` threshold or increase forward-merge word count limit |

---

## REQUIRES_HUMAN_REVIEW

The following audit areas cannot be measured from PageComposition[] JSON. They require visual inspection of rendered PDFs.

| Audit Area | Why Not Measurable | How to Verify |
|------------|-------------------|---------------|
| Content clipping | Clipping is a CSS/render artifact not reflected in section data | Open rendered PDF; scroll each page; check text cut off at margins |
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
| AUTO_SPLIT_OVERFLOW | info | 595 | Modern One Pager/medium, Modern One Pager/long |
| AUTO_MERGE_UNDERFILLED | info | 30 | Modern One Pager/very_long, Executive One Pager/very_long |
| VISUAL_OVERFLOW_RISK | warning | 30 | Modern One Pager/very_long, Executive One Pager/very_long |
| AUTO_REMOVE_ORPHAN_HEADING | warning | 29 | Modern One Pager/heading_hierarchy, Executive One Pager/heading_hierarchy |

---

## GENERATION ERRORS

4 document generations failed:

| Template | Scenario | Error |
|----------|----------|-------|
| KPI Dashboard Report | mixed_content | {"statusCode":429,"timestamp":"2026-06-13T08:49:18.203Z","path":"/api/pdf-studio/smart-builder/generate","method":"POST" |
| Strategy Document | heading_hierarchy | {"statusCode":429,"timestamp":"2026-06-13T08:50:30.878Z","path":"/api/pdf-studio/smart-builder/generate","method":"POST" |
| Employee Handbook | long | {"statusCode":429,"timestamp":"2026-06-13T08:51:50.173Z","path":"/api/pdf-studio/smart-builder/generate","method":"POST" |
| Product Launch Plan | mixed_rtl_ltr | {"statusCode":429,"timestamp":"2026-06-13T08:53:03.044Z","path":"/api/pdf-studio/smart-builder/generate","method":"POST" |

---

*All measurements from real API responses. Pipeline: ContentBlockExtractor → OutlineBuilder → RuleBasedPagePlanner → DocumentCompositionService → PaginationIntelligenceService → PublishingIntelligenceService. Source of truth: PageComposition[] returned by POST /api/pdf-studio/smart-builder/generate. No estimation. No inference. Rendered output is the source of truth.*

*Certification date: 2026-06-13*