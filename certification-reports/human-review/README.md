# Human Review Packet — Ω.PRODUCT.2E

Real reviewers only. Score each template **1–10** on all eight categories. Minimum **5 reviewers per family**, drawn from: startup founders, investors, recruiters, designers, consultants, operations professionals.

## What to review
Look at the ACTUAL rendered output produced by the render certification (2C/2D), not the template metadata:

- **Presentation** (20 templates) → `certification-reports/render/contact-sheets/ (per-template) + render/screenshots/<id>/`
- **CV** (49 templates) → `certification-reports/render/cv/contact-sheets/cv-all.png + render/cv/screenshots/`
- **PDF Pro** (20 templates) → `certification-reports/render/pdf/contact-sheets/pdf-pro-all.png + render/pdf/screenshots/`
- **Excel** (12 templates) → `certification-reports/render/excel/contact-sheets/excel-all.png + render/excel/screenshots/`

## Scoring categories (1–10)

1. Visual Quality
2. Readability
3. Professionalism
4. Hierarchy
5. Trustworthiness
6. Distinctiveness
7. Usability
8. Export Quality

## How to submit
Add one row per (reviewer × template) to `certification-reports/human-review/reviews.csv`, then run `node scripts/human-review.mjs` to regenerate `HUMAN_REVIEW_RESULTS.md`.

## Passing gates
- Family average ≥ 8.5
- Family median ≥ 8.5
- No template average < 7
- ≥ 5 reviewers per family
- No recurring critical readability/hierarchy complaints

## Template checklists

### Presentation

- [ ] Crimson Dark Business
- [ ] Purple Gradient Startup
- [ ] Editorial Business Report
- [ ] Dark Luxury Proposal
- [ ] Ultra Minimal Swiss
- [ ] Investor Geometric Beige
- [ ] Yellow Digital Course
- [ ] Light Blue Business Marketing
- [ ] Teal Business Plan
- [ ] Monochrome Corporate Strategy
- [ ] Fintech Investor Deck
- [ ] Startup Pitch Modern
- [ ] Product Launch Showcase
- [ ] Training Course Pro
- [ ] Board Meeting Executive
- [ ] Sales Deck Conversion
- [ ] Strategy Roadmap
- [ ] Agency Campaign Deck
- [ ] Healthcare Clean Brief
- [ ] Sustainability Impact Deck

### CV

- [ ] Executive Prestige
- [ ] Executive Gilt
- [ ] Executive Nordic
- [ ] Executive Slate
- [ ] Executive Photo
- [ ] Corporate Pro
- [ ] Corporate Classic
- [ ] Corporate Timeline
- [ ] Corporate Bold
- [ ] Civic Government
- [ ] ATS Universal
- [ ] ATS Resume
- [ ] ATS Professional
- [ ] Modern Teal Pro
- [ ] Modern Split
- [ ] Modern Indigo
- [ ] Modern Dark
- [ ] Creative Dark
- [ ] Creative Coral
- [ ] Creative Purple
- [ ] Creative Magazine
- [ ] Dev Terminal
- [ ] Dev GitHub
- [ ] Dev Full Stack
- [ ] Dev Data
- [ ] Designer Editorial
- [ ] Designer Studio
- [ ] Designer Minimal
- [ ] Startup Founder
- [ ] Startup Growth
- [ ] Startup PM
- [ ] Consultant Premium
- [ ] Consultant Brief
- [ ] Consulting Strategic
- [ ] Academic Formal
- [ ] Academic Modern
- [ ] Academic European
- [ ] Cover Letter Classic
- [ ] Cover Letter Executive
- [ ] Cover Letter Modern
- [ ] Cover Letter Creative
- [ ] Cover Letter Developer
- [ ] Cover Letter Consultant
- [ ] Cover Letter Academic
- [ ] Portfolio Executive
- [ ] Portfolio Creative
- [ ] Portfolio Developer
- [ ] Portfolio Designer
- [ ] Portfolio Minimal

### PDF Pro

- [ ] Modern Minimal Report
- [ ] Executive Board Brief
- [ ] Startup Investor Memo
- [ ] Fintech Operating Plan
- [ ] Dark Luxury Proposal
- [ ] Editorial Whitepaper
- [ ] Future Tech Brief
- [ ] Agency Campaign Book
- [ ] Analytics Performance Report
- [ ] Product Showcase Doc
- [ ] Consulting Strategy Playbook
- [ ] Premium Whitepaper System
- [ ] AI Future Tech Report
- [ ] Sustainability Impact Report
- [ ] Healthcare Program Brief
- [ ] Investor Diligence Pack
- [ ] Educational Course Guide
- [ ] Roadmap Execution Plan
- [ ] Case Study Storyline
- [ ] Ultra Minimal One Pager

### Excel

- [ ] executive-emerald
- [ ] finance-midnight
- [ ] sales-sage
- [ ] ops-copper
- [ ] dashboard-ivory
- [ ] investor-financial
- [ ] corporate-reporting
- [ ] board-reporting
- [ ] marketing-analytics
- [ ] startup-metrics
- [ ] financial-forecasting
- [ ] management-reporting
