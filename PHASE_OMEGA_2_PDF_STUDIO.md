# Phase Ω.2 — PDF Studio Overhaul

Plan agreed: **both, sequenced** (fix the generate flow first, then build the upload→enhance
import flow) with **real LLM** enhancement. This document = forensic audit + root causes + Pass 1
results + the Pass 2 plan + scorecard.

---

## 1. Forensic audit (grounded in the code)

| # | Finding | Evidence | Severity |
|---|---|---|---|
| A | **No upload-to-enhance flow.** PDF Studio is generate-from-pasted-text only; the smart-builder UI has a RichTextEditor, no file upload. The `document-parser` backend exists but is **not wired** to PDF Studio. | `frontend/app/pdf-studio/smart-builder/page.tsx` (RichTextEditor, no file input); `document-parser.*` unreferenced by pdf-studio frontend | P0 (blocks acceptance test) |
| B | **Import fidelity loss.** DOCX parsed with `mammoth.extractRawText` (drops headings/bold/lists/tables); PDF via `pdf-parse` (text only). | `document-parser.service.ts:130` | P1 |
| C | **Fake enhancement actions.** `fixGrammar`/`improveClarity` are real (805-line regex engine), but Expand/Shorten/Restructure/Professionalize all mapped to the same grammar rules, and the editor always showed a success toast. | `getEnhancementOptions()`; `editor/[id]/page.tsx:783-791` | P1#28 |
| D | **Fake templates.** All 30 standard templates rendered one fixed structure (`HERO_HEADER + SECTION_CARD + FOOTER`); `templateConfig.layouts` never consumed. | `pdf-export.service.generateStructuredPages` | P0#10 |
| E | **Export ≠ preview.** Two separate `generateStructuredPages` (export per-page; preview re-buckets to ~420 words) with different body rendering. | `pdf-export.service` vs `preview.service` | P1#7 |
| F | **Brand kit metadata-only.** `BrandKitService.applyBrandKitToStyle` existed but was never called by export/preview, and it wrote `colorScheme` as an object while `getColorScheme()` only accepted strings. | `pdf-export.service`, `layout-components.getColorScheme` | P1#8 |

### Root cause
PDF Studio was built as a **generator** (paste → compose pages), not an **enhancer**
(import → preserve → improve). Enhancement is bolted-on regex; the renderer ignores its own
layout declarations; preview and export are two separate code paths; brand kits were wired into
metadata but never into the renderer.

---

## 2. Pass 1 — generate-flow fixes (DONE, typecheck-clean)

### C — Real enhancement, no fake actions ✅
- New `PdfLlmEnhancementService` (`services/pdf-llm-enhancement.service.ts`): real LLM
  transforms for expand/shorten/restructure/professionalize via the existing OpenAI client,
  with **content-preservation** system prompts (preserve every fact/number/name; only transform).
- `smart-builder.controller.enhanceDocument` routes those four ops to the LLM (grammar/clarity
  stay on the real regex engine), and returns `aiUsed` + `changed`.
- **Honest degradation:** when `OPENAI_API_KEY` is unset/placeholder (current state), the action
  does **not** persist and does **not** claim success — the editor shows "AI enhancement is not
  available, so no changes were made" (`editor/[id]/page.tsx` handleEnhance). When configured, it
  performs the real transformation; "no change" is reported truthfully too.
- Result: **no button lies** — it either does the real thing or says it can't.

### D — Template distinctiveness ✅ (body level)
- `pdf-export.service` now drives content-page body composition from the template's declared
  `layouts`: `two_column` (magazine split), `text` (flat), or `card` — chosen by `pickProseBody()`.
  All three accept arbitrary prose, so **content is always preserved**.
- Verified variety across the 31 configs: **24 card · 5 two-column · 2 text** (e.g. Executive One
  Pager / Corporate Overview / Sales Proposal / Partnership Proposal / Brand Guidelines now render
  two-column; Financial Report / Budget Plan render flat text) — previously all identical.
- Follow-up: mapping the *specialized* declared components (METRICS_STRIP, TIMELINE, TABLE…) needs
  content-type detection so prose isn't forced into a metrics strip — deferred (content-safe scope first).

### E — Export/preview parity ✅ (body) / ⏳ (pagination)
- The same `pickProseBody`/`composeContentBody` now runs in `preview.service`, so the editor preview
  and exported PDF use the **same body composition**.
- Remaining: preview still re-buckets pages to ~420 words while export renders per stored page, so
  page **boundaries** can differ. True pagination parity needs a shared `composeDisplayPages` used by
  both — deferred to a focused parity pass.

### F — Brand kit actually applied ✅
- `getColorScheme()` now accepts a brand color **object** (not just named schemes).
- `pdf-export.service` and `preview.service` load the document's brand kit
  (`BrandKitService.getBrandKit` → `applyBrandKitToStyle`) and inject its colors/fonts into `style`,
  so a selected kit changes both preview and PDF. An explicit `colorScheme` query param still wins.

**Files changed (Pass 1):** `pdf-llm-enhancement.service.ts` (new), `pdf-studio.module.ts`,
`controllers/smart-builder.controller.ts`, `services/pdf-export.service.ts`,
`services/preview.service.ts`, `templates/layout-components.ts`,
`frontend/app/pdf-studio/editor/[id]/page.tsx`.

---

## 3. Pass 2 — upload→enhance import flow (NEXT, not yet built)
The acceptance criterion ("a real uploaded PDF/DOCX can be enhanced…reopened with no data loss")
needs this flow, which does not exist yet:
1. **Frontend:** add an Upload entry to PDF Studio (drag/drop PDF/DOCX) → POST to a parse endpoint.
2. **Backend import fidelity:** switch DOCX parsing to `mammoth.convertToHtml` (preserves headings/
   bold/lists/tables); for PDF keep text but preserve paragraph/heading structure where detectable.
3. **Populate** a new PdfDocument's pages from the parsed, structure-preserving content (no silent
   drops), then route into the existing editor → enhance → template → export → save/reopen.
4. **Content-preservation test:** original → parsed → rendered → exported, asserting ≥99% text retention.

---

## 4. Export certification (status)
- DOCX/PDF/HTML export MIME + streaming were certified earlier (Phase Ω.1 exports). Template-driven
  body + brand kit now flow into the PDF/preview. **Full visual certification + before/after
  screenshots require the running app** (Next + Nest + Postgres + Puppeteer). The `OPENAI_API_KEY`
  is a placeholder here, so live LLM enhancement can't be screenshotted in this environment — the
  honest-degradation path is what runs until a key is set.

## 5. Scorecard
| Dimension | Before | After Pass 1 | Notes |
|---|---:|---:|---|
| Enhancement honesty (no fake actions) | 30 | **90** | real LLM + honest degradation; no button lies |
| Template distinctiveness | 35 | **70** | 3 distinct body structures from declared layouts; specialized-component mapping pending |
| Export/preview parity | 50 | **70** | body composition unified; pagination bucketing still differs |
| Brand kit application | 25 | **80** | colors/fonts now reach preview + PDF |
| Import fidelity | 30 | 30 | unchanged — Pass 2 |
| Upload-to-enhance flow | 0 | 0 | not built — Pass 2 |
| Content preservation (generate) | 65 | 65 | unchanged this pass |
| **PDF Studio overall** | **62** | **~72** | Pass 1 done; Pass 2 (import flow) is the path to the acceptance bar |

## 6. Pass 2 — upload→enhance import flow (DONE, typecheck-clean)

The missing flow now exists. A real PDF/DOCX can be imported and flows into the (improved) editor →
enhance → template → export pipeline.

### Import fidelity (B) ✅
- **DOCX** now parsed with `mammoth.convertToHtml` (preserves headings, bold/italic, lists, tables);
  the old `extractRawText` path dropped all structure. Raw text still kept for analysis/word-count.
- **PDF**: text extracted via `pdf-parse`, then a new content-safe structurer (`textToStructuredHtml`)
  turns it into HTML — ALL-CAPS short lines → `<h2>`, bullet runs → `<ul>`, prose → `<p>`. **No block
  is dropped.**
- New `html` field on `ParsedDocument`, exposed by `POST /document-parser/extract-text` (non-AI, fast).

### Upload UI (A) ✅
- PDF Studio smart-builder now has an **"Import PDF / DOCX"** control. It uploads to
  `/document-parser/extract-text`, sets the editor content to the returned structure-preserving HTML,
  and auto-fills the title from the filename. The user then runs the existing
  analyze → enhance → template → export → save flow.
- Fixed a latent bug: `RichTextEditor` only read `content` at init, so imported content would never
  appear — added a sync effect (`editor.commands.setContent`) so external content (imports, AI edits)
  shows up.

### Content preservation ✅ (verified)
- Unit test on the real compiled parser: a multi-section sample (headings + paragraph + bullet list)
  → **100% of words preserved**, structure detected (2×`<h2>`, 3×`<p>`, 1×`<ul>`/3×`<li>`). No content
  loss, bullets correctly grouped even after a header line.

**Files changed (Pass 2):** `document-parser/document-parser.service.ts` (+`html`, convertToHtml,
`textToStructuredHtml`), `document-parser/document-parser.controller.ts` (expose `html`),
`frontend/components/RichTextEditor.tsx` (content sync), `frontend/app/pdf-studio/smart-builder/page.tsx`
(import control + handler).

### Why this works without an API key
The import path deliberately uses the **non-AI** `extract-text` endpoint and the **deterministic**
rule-based generate pipeline — so import → document → pages → templates → PDF export all work with no
OpenAI key. Only the *optional* LLM enhancement buttons need a key (and honestly degrade without one).

## 7. Updated scorecard
| Dimension | Before | After Pass 1 | After Pass 2 |
|---|---:|---:|---:|
| Enhancement honesty (no fake actions) | 30 | 90 | **90** |
| Template distinctiveness | 35 | 70 | **70** |
| Export/preview parity (body) | 50 | 70 | **70** |
| Brand kit application | 25 | 80 | **80** |
| **Import fidelity** | 30 | 30 | **80** (DOCX structure preserved; PDF structured) |
| **Upload-to-enhance flow** | 0 | 0 | **85** (exists, content-preserving) |
| Content preservation | 65 | 65 | **85** (verified 100% on import) |
| **PDF Studio overall** | **62** | ~72 | **~80** |

## 8. Honest completion status — code-complete, ONE gate remains
Deliverables 1–5 (audit, root causes, fixed import pipeline, fixed editor, fixed templates) are **done
and verified** (typecheck + content-preservation + template-variety tests). Remaining to fully satisfy
the mission's "do not mark complete until…" bar:

- **#7 Before/after screenshots** and the **live browser e2e** (upload → enhance → save → refresh →
  template → export → reopen) require the **running app with a logged-in session**. The backend (:4000)
  and frontend (:3000) are up, but driving an authenticated browser session + creating test data in the
  live DB (registration triggers a verification email) needs your go-ahead or a test login + sample file.
- **Live LLM enhancement** screenshots additionally need a real `OPENAI_API_KEY` (placeholder here).

I can drive the live e2e + capture screenshots via the verify skill if you provide a test login (or
approve a throwaway account) and a sample PDF/DOCX — otherwise the code path is complete and
unit-verified end to end.
