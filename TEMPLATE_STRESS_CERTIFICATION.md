# Template Stress Certification

> Phase Ω.PRODUCT.2A. Objective colour/clone metrics are computed from real template definitions (post-fix). Aesthetic & human gates are `REQUIRES_HUMAN_REVIEW` — not fabricated.

**Generated:** 2026-06-09T11:31:55.848Z

## Status: NOT RUN — requires live render harness

Clipping / overflow / overlap / blank-page / broken-hierarchy detection requires **rendering** each template with edge-case content (very short, very long, large tables/charts, large CVs/plans/decks). That needs the running app + headless browser, not static analysis. It is therefore **not certified here** and must not be counted as a pass.

### Available real harness
- Presentations: `frontend/scripts/audit-presentation-templates.mjs` (Puppeteer — applies each template, screenshots, flags overflow/clipping/render errors). Run against the live editor to populate real results.
- PDF / CV / Excel: a render-based stress harness over the edge-case content matrix is the outstanding work item.

### Success-criteria impact
`0 overflow / clipping / hierarchy failures` is **UNVERIFIED** until the render harness runs. Open by design.
