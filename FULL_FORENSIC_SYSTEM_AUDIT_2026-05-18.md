# FULL FORENSIC SYSTEM AUDIT

Project: Pitchonix  
Date: 2026-05-18  
Audit type: Current codebase vs Master Recovery Specification  
Scope: frontend routes, backend modules/controllers/services, Prisma models, runtime probes, export probes, template/pro-template wiring, UI-only detection.

## Executive Verdict

Pitchonix has a large amount of surviving code, but it is not yet a production-ready business publishing operating system. The codebase currently resembles a partially rebuilt platform with several real engines, several disconnected engines, and some UI-only surfaces.

The strongest surviving systems are:

- PDF Studio Smart Builder backend pipeline.
- PDF document/page database models.
- Standard PDF template configuration.
- PDF preview endpoint.
- PDF and DOCX export for PDF Studio documents.
- Auth basics.
- Brand kit CRUD basics.
- Dashboard/projects/settings/help pages.

The most damaged or incomplete systems are:

- Presentation generation: runtime failed during generation with `Generated content validation failed`.
- PDF Studio PPTX export: runtime failed with `pptxgenjs_1.default is not a constructor`.
- Pro Templates: only 1 real pro template exists, not the required 20.
- Visual Design Studio: mostly template cards that feed placeholder content into Smart Builder.
- Advanced block composer: partial, not fully connected to persistence/export.
- Collaboration/versioning: partial models/controllers, not full production workflow.
- Analytics: partial dashboards and counters, not full event tracking.
- Image/Unsplash system: upload exists, Unsplash is not configured.
- Export templates page: UI says coming soon.
- Several AI/OpenAI labels and services remain, conflicting with the deterministic/no-AI requirement.

Build status:

- Frontend production build: passes.
- Backend production build: passes.

Runtime status:

- Backend API is running at `localhost:3001`.
- Existing frontend dev server at `localhost:3200` returned a 500 stale webpack runtime error: `__webpack_modules__[moduleId] is not a function`.
- Smart Builder analyze endpoint works.
- Smart Builder generate endpoint created real `PdfDocument` and `PdfPage` rows.
- Preview endpoint returned HTML.
- PDF export returned a real PDF.
- DOCX export returned a real DOCX.
- PDF Studio PPTX export failed.
- Presentation generation queued but ended failed with no slides.

## Status Legend

- ✅ Fully working: implemented and runtime verified.
- 🟡 Partial: implemented but incomplete or only partly verified.
- 🔴 Broken: exists but runtime failed.
- ⚫ Missing/deleted: not present or not wired.
- 🧩 Disconnected: code exists but route/UI/export/persistence connection is incomplete.
- 🎭 UI-only/fake: visible UI without production functionality.
- 🛠 Needs rebuild: architecture exists but not enough to meet product spec.

---

## 1. Create New System

Status: 🟡 Partial

Evidence:

- Frontend route exists: `frontend/app/create/page.tsx`.
- Document type component exists: `frontend/components/wizard/Step1DocumentType.tsx`.
- Wizard components exist for steps 1-6.
- Autosave draft exists via `/projects`.
- PDF routing exists: PDFs go to `/pdf-studio/editor/:id`.
- Presentation routing exists: presentations go to `/projects/:projectId`.

Findings:

- All 16 document labels appear to exist in the UI layer, but backend enum mismatch exists.
- Backend `CreateProjectDto.DocumentType` contains `BOARD_MEETING = 'board_meeting'`, while frontend/generation uses `board_meeting_deck`.
- `financial_projection` singular exists in backend DTO, but master spec says Financial Projections and some UI may use inconsistent naming.
- Wizard has local/session template preload, but not robust local persistence for every field beyond saved drafts.
- Runtime minimal project creation works.
- Runtime presentation generation failed after queue processing.

Classification:

- 16 document type UI: 🟡 Partial.
- 6-step wizard: 🟡 Partial.
- Autosave draft: 🟡 Partial.
- Route PDFs to PDF Studio: ✅ Working for Smart Builder/PDF flow.
- Route presentations to editor: 🟡 Routes to project page first, not directly to presentation editor.
- Generation creates PDFs: ✅ Runtime verified.
- Generation creates presentations: 🔴 Broken in runtime.

Required repairs:

- Normalize document type constants across frontend, DTOs, Prisma, generators, templates.
- Fix presentation generation validation failure.
- Route successful presentations directly to `/editor/:deckId` or a clear project generation status screen.
- Add browser-side local persistence for in-progress wizard state.

---

## 2. Presentation System

Status: 🔴 Broken / 🛠 Needs rebuild

Evidence:

- Editor route exists: `frontend/app/editor/[id]/page.tsx`.
- Deck/slide backend exists: `backend/src/decks`, `backend/src/slides`.
- Slide generation service exists: `backend/src/generation`.
- Slide factory exists with 18-ish slide generators.
- PPTX export route exists: `POST /api/export/pptx`.

Runtime result:

- Created project `68398a3c-b066-4c79-bf36-548958881061`.
- Called `POST /api/generate`.
- Queue returned deck id `328701e7-35d4-494c-b29c-614a57693253`.
- Project ended `failed`.
- Deck status returned `draft`.
- Slides array was empty.
- Generation status reported error: `Generated content validation failed`.

Current design capacity:

- Frontend offers 10 theme cards.
- Backend slide visual theme engine has 7 actual themes.
- Slide layouts include title slide, title content, bullets, chart, two column, comparison, section header, blank.
- Slide modules include cover, problem, solution, market opportunity, business model, traction, roadmap, team, ask, competition, go-to-market, product features, case study, pricing, financials, vision, company overview, executive summary.

Gaps vs spec:

- No real premium presentation template switching.
- No Pro Template support for presentations.
- No mature slide canvas renderer in editor.
- Editor preview renders only basic type-specific JSON-derived content.
- Export renderer is separate and hardcoded.
- Runtime generation currently fails before slides persist.
- Slide count promises are inaccurate; generator usually produces available module count, not requested 20-50.
- Training/product/strategy/board decks use generic business slide modules, not dedicated archetypes.

Classification:

- Presentation editor exists: 🟡 Partial.
- Slide creation runtime: 🔴 Broken.
- Slide layouts: 🟡 Partial.
- Template switching: ⚫ Missing.
- Save: 🟡 Basic slide save exists.
- PPTX export: 🟡 Exists, not verified because deck generation failed.
- Preview: 🟡 Basic.
- Archetypes: 🟡 Partial.
- Pro templates: ⚫ Missing for presentations.

Priority:

1. Fix generation validation and persist slides.
2. Add actual slide renderer using `layoutKey`, `themeKey`, charts, images.
3. Rebuild presentation template switching.
4. Add dedicated modules for board, training, product launch, strategy.
5. Reconcile PPTX export with visual engine.

---

## 3. PDF Studio

Status: 🟡 Partial but substantial

Evidence:

- Routes exist:
  - `/pdf-studio`
  - `/pdf-studio/smart-builder`
  - `/pdf-studio/structured`
  - `/pdf-studio/visual-studio`
  - `/pdf-studio/editor/[id]`
- Large editor page exists: `frontend/app/pdf-studio/editor/[id]/page.tsx` with 1433 lines.
- Backend module exists: `backend/src/pdf-studio/pdf-studio.module.ts`.
- Smart Builder controller exists with 1112 lines.
- Many PDF Studio services exist and are wired.

Runtime result:

- Smart Builder generated document `13c99d27-d1dd-4ccc-aa4f-03b60e55d719`.
- Generated 2 pages: cover + content.
- Preview endpoint returned HTML.
- PDF export returned 238 KB PDF.
- DOCX export returned 7.9 KB DOCX.
- PPTX export failed.

Major PDF Studio issues found:

- Generated `PdfPage.pageNumber` returned `1` for both cover and content page while `order` was 1 and 2. This indicates page numbering bug or stale schema/API mapping issue.
- Cover page content duplicates/summarizes the full source content inside JSON text.
- `qualityScore` on document can be high while `validationResult` is null and `exportReady` is false.
- Short content generated a normal content page under 120 words; spec says no normal page under 120 words.
- Preview can render, but export parity needs deeper visual comparison.

Classification:

- Page sidebar: 🟡 Exists in editor, needs runtime UX verification.
- Live preview: 🟡 Exists through iframe/preview endpoint.
- Toolbar: 🟡 Partial.
- Inspector: 🟡 Partial.
- Page actions: 🟡 Partial backend supports add/delete/duplicate; frontend completeness needs verification.
- Page density warnings: 🟡 Backend composition metrics exist; UI integration partial.
- Semantic grouping: 🟡 Backend exists; UI partial.
- Export preview: 🟡 Preview exists.

---

## 4. Smart PDF Builder

Status: 🟡 Partial / real backend, not yet spec-complete

Required services vs current:

- ContentNormalizerService: ✅ Exists.
- MarkdownParsingService: ⚫ Missing as named service.
- ContentBlockExtractorService: ✅ Exists.
- RuleBasedStructureDetectorService: ⚫ Missing as named service; structure detection is spread across services.
- SemanticStructureEngine: ✅ Exists.
- TopicSegmentationService: ✅ Exists.
- SemanticClusterService: ⚫ Missing as named service.
- SectionInferenceService: ✅ Exists.
- OutlineBuilderService: ✅ Exists.
- RuleBasedPagePlannerService: ✅ Exists.
- PageDensityBalancerService: ✅ Exists but controller comments say it is skipped because it over-splits.
- ContentPreservationService: ⚫ Missing as named service.
- SafeDeduplicationService: ⚫ Missing as named service.
- QualityCheckService: ✅ Exists.

Pipeline comparison:

- Raw Content: ✅
- Normalize Content: ✅
- Parse Markdown: 🟡 Partial through normalizer/block extractor, not a dedicated parser.
- Extract Blocks: ✅
- Detect Structure: 🟡 Partial.
- Detect Semantic Sections: ✅
- Classify Blocks: 🟡 Partial.
- Score Importance: 🟡 Partial.
- Build Outline: ✅
- Group Semantic Sections: 🟡 Partial.
- Plan Pages: ✅
- Compose Layout: ✅
- Balance Pages: 🟡 Partial/skipped in controller.
- Preserve Content: 🟡 Some logic, no dedicated service.
- Apply Rule Formatting: ✅ Partial.
- Render Pages: ✅
- Export PDF: ✅ Runtime verified.

Detection features runtime:

- H1 titles: ✅
- Headings: ✅
- Bullet lists: ✅
- Metrics/numbers/percentages: ✅
- Contact email: ✅
- Dates: ✅
- URLs/prices: likely implemented, not fully runtime verified.
- Quotes/numbered lists: likely implemented in extractor, not fully runtime verified.

Quality analyzer issue:

- Some messages are improved, e.g. semantic feedback exists.
- Still robotic messages remain:
  - `Detected potential grammar problems in your content.`
  - `Readability needs improvement`
  - UI still references AI in places.

Runtime bug:

- Content page under target density was allowed.
- Cover page duplicated content in JSON string.
- Page numbering anomaly.

---

## 5. Pro Template System

Status: 🟡 Partial / far below spec

Evidence:

- Backend folder exists: `backend/src/pdf-studio/pro-templates`.
- Frontend folder exists: `frontend/features/pdf-studio/pro-templates`.
- Backend and frontend registry each contain only 1 pro template:
  - `modern-business-flyer`
- Backend renderer exists: `ProTemplateRendererService`.
- PDF export and preview services can accept `proTemplateId`.
- Editor imports `ProTemplatesDropdown`.

Spec requirement:

- Minimum 20 categories/templates.
- Separate registry/templates/layouts/renderers/validators/components/tokens.
- Each template should include cover, intro, metrics, charts, timeline, SWOT, feature grids, CTA, team, comparison, quote, roadmap, closing.

Actual:

- 1 registry entry.
- 1 frontend concrete template folder: `businessFlyer`.
- Backend has multiple token files untracked, but registry does not expose them.
- No validators folder found.
- No full browser with 20 categories.
- No evidence all required archetypes render per template.

Classification:

- Separate registry: ✅ Exists.
- Templates: 🔴 Only 1 of 20.
- Layouts: 🟡 Partial via renderer/styles.
- Renderers: 🟡 Exists.
- Validators: ⚫ Missing.
- Preview browser: 🟡 Dropdown exists, not full premium browser.
- Export integration: 🟡 Hook exists, needs deeper parity testing.

Repair:

- Register all token/template definitions.
- Add validators.
- Add frontend premium browser.
- Build 20 real categories, not color swaps.
- Add export snapshot tests per pro template.

---

## 6. Visual Design Studio

Status: 🎭 UI-heavy / 🟡 Partial

Evidence:

- Route exists: `/pdf-studio/visual-studio`.
- UI lists 10 visual templates:
  - Modern One Pager
  - Business Flyer
  - Case Study Sheet
  - Startup Overview
  - Marketing Flyer
  - Corporate Brochure
  - Executive Handout
  - Product Flyer
  - Brand Overview
  - Promotional Sheet
- Clicking a template calls Smart Builder generate with placeholder content:
  - `Start creating your visual document here...`
  - `Feature 1`
  - `Feature 2`
  - `Feature 3`

Conclusion:

Visual Studio is not a true visual design engine yet. It is a template picker that seeds Smart Builder with placeholder text and layout flags.

Missing:

- Real flyer/brochure composition engine.
- Visual-only document canvas.
- Image-driven layouts.
- Canva-style editing.
- Marketing PDF components.
- Infographic compositions.
- Visual export parity tests.

Classification: 🎭 UI-only/partial, needs rebuild.

---

## 7. Standard Template System

Status: 🟡 Partial

Evidence:

- Backend template configs contain 30+ `TemplateType` entries.
- Template endpoint exists: `GET /api/pdf-studio/export/templates`.
- Editor fetches templates from `/pdf-studio/export/templates`.
- Frontend TemplatePreview SVG mockups exist.
- Public `/templates` gallery exists for industry/project templates.

Issues:

- `frontend/public/templates/previews` does not exist in current inventory.
- Template previews are mostly SVG/mock previews, not generated screenshots.
- `Export Templates` page still says coming soon.
- Standard templates are not clearly persisted as user-editable reusable layout entities.

Classification:

- Standard PDF configs: ✅ Exists.
- Template categories: 🟡 Partial.
- 30+ target: ✅ Backend config appears to meet count.
- Preview assets: 🟡 Partial/mock.
- User template marketplace/export templates: 🎭 UI-only/coming soon.

---

## 8. Image System

Status: 🟡 Partial

Evidence:

- Backend image upload controller exists: `POST /api/pdf-studio/images/upload`.
- Upload service exists.
- UploadedImage Prisma model exists.
- Frontend image upload components exist.
- Global upload controller exists.
- Unsplash controller/service exists.
- Runtime Unsplash status returned:
  - `configured: false`
  - `enabled: false`

Missing/incomplete:

- Unsplash not configured.
- Export preservation of images not deeply verified.
- Image masks/captions/background/hero image controls incomplete.
- Visual Studio image composition incomplete.
- Frontend public template images mostly missing; only a few images exist in `frontend/public/images`.

Classification:

- Upload: 🟡 Exists, not runtime upload tested.
- Replacement: 🟡 Partial.
- Unsplash: 🔴 Disabled.
- Masks/captions/hero/background: ⚫ Missing/partial.
- Export preservation: 🟡 Unverified.

---

## 9. Chart System

Status: 🟡 Partial

Evidence:

- Chart services exist:
  - PDF Studio chart generation/rendering.
  - Generation chart generation/rendering.
- Frontend `ChartPanel.tsx` exists.
- PPT/PDF export paths include chart rendering logic.

Issues:

- Chart edit data/export parity not fully runtime verified.
- PDF Studio generated runtime test included `charts: []`.
- Visual templates do not yet create real chart-heavy documents by default.

Classification: 🟡 Partial.

---

## 10. Export System

Status: 🟡 Partial with one hard failure

Runtime verified:

- PDF Studio PDF export: ✅ `201`, `application/pdf`, 238 KB.
- PDF Studio DOCX export: ✅ `201`, DOCX content type, 7.9 KB.
- PDF Studio preview: ✅ `200`, HTML.
- PDF Studio PPTX export: 🔴 failed.

PPTX failure:

Endpoint:

`POST /api/pdf-studio/export/13c99d27-d1dd-4ccc-aa4f-03b60e55d719`

Body:

`{"format":"pptx"}`

Runtime error:

`pptxgenjs_1.default is not a constructor`

Missing formats:

- PNG: ⚫ Missing.
- JPEG: ⚫ Missing.
- Future web publishing: ⚫ Missing.

Other issues:

- Deck PPTX export exists separately at `/api/export/pptx`, but presentation generation failed so end-to-end deck export could not be verified.
- Export parity between preview and PDF not visually verified.
- Image/chart preservation needs sample-doc tests.

Classification:

- PDF: ✅ Runtime working.
- DOCX: ✅ Runtime working.
- PPTX for PDF Studio: 🔴 Broken.
- PPTX for slide decks: 🟡 Exists, not end-to-end verified.
- PNG/JPEG: ⚫ Missing.

---

## 11. Preview System

Status: 🟡 Partial

Evidence:

- Preview endpoint exists: `/api/pdf-studio/export/preview/:id`.
- Runtime preview returned HTML.
- Editor has preview iframe/modal logic.

Issues:

- Frontend dev server at `localhost:3200` returned a stale webpack runtime 500.
- Need clean dev server restart to verify UI preview.
- Preview/export parity not visually confirmed.
- Raw JSON risk exists because cover page content is stored as JSON string in `content.text`.
- No PNG/JPEG preview/export parity.

Classification: 🟡 Partial.

---

## 12. Brand Kit System

Status: 🟡 Partial

Evidence:

- Frontend route exists: `/brand-kits`.
- Backend module/controller/service exists.
- Prisma `BrandKit` model exists.
- Editor has brand-kit references.
- PDF Studio has `BrandKitService`.

Known recent issue:

- User reported logo needed upload, not URL.
- Current audit did not fully runtime test logo upload/apply/export.

Likely gaps:

- Full fonts/spacing rules/global theme application incomplete.
- Brand presets incomplete.
- Export integration partial.

Classification:

- Create/edit/delete basics: 🟡 Likely.
- Logos: 🟡 Partial.
- Fonts: 🟡 Partial.
- Spacing rules/presets/global application: ⚫ Missing/partial.

---

## 13. Collaboration, Versioning, Presence

Status: 🟡 Partial / 🛠 Needs rebuild

Evidence:

- Presence gateway/module exists.
- Comments module/controller/service exists.
- Project sharing module exists.
- Document versions module exists.
- Prisma models exist:
  - ProjectShare
  - Comment
  - DocumentVersion
  - Notification
  - Activity

Missing/incomplete:

- No full 50-state editor history.
- Undo/redo in PDF editor topbar exists visually but needs persistence/runtime verification.
- Rollback exists via versions controller, but editor integration is incomplete.
- Mentions not verified.
- Workspace collaboration not fully present.
- WebSocket presence component exists, but production collaboration flow unverified.

Classification: 🟡 Partial.

---

## 14. Auth System

Status: 🟡 Partial

Runtime verified:

- Register works and returns JWT.

Evidence:

- Login/register/forgot/reset/verify/magic-link routes exist.
- 2FA setup/enable/disable routes exist.
- Google strategy exists.
- Frontend auth pages exist.

Issues:

- Social login buttons say coming soon.
- Email verification depends on email service setup.
- Magic link depends on email service setup.
- API key management not found.
- OpenAI/API key admin flow not aligned with no-AI requirement.

Classification:

- Login/register: ✅/🟡.
- Forgot/reset/verify/magic: 🟡 Exists, email-dependent.
- 2FA: 🟡 Exists, not runtime verified.
- API key management: ⚫ Missing.
- Onboarding: 🟡 Exists.

---

## 15. Dashboard Pages

Status: 🟡 Partial

Routes exist:

- Dashboard: ✅
- Create New: ✅
- Projects: ✅
- PDF Studio: ✅
- Smart Builder: ✅
- Structured Documents: ✅
- Visual Studio: ✅
- Templates: ✅
- Brand Kits: ✅
- Export Templates: 🎭 Coming soon
- Analytics: 🟡 Partial
- Settings: 🟡 Partial
- Help & Support: 🟡 Partial with stale AI FAQ and coming soon documentation
- Share Page: ✅ Route exists
- Google Slides Import: 🟡 Route exists, functionality not verified

Important UI-only/fake/stale content:

- `/export-templates` explicitly says coming soon.
- Register/login social buttons say coming soon.
- Help still says AI generation requires OpenAI.
- PDF Studio hero says AI-powered despite deterministic requirement.
- Dashboard labels still say AI-powered.

Classification: 🟡 Partial, with several 🎭 UI-only surfaces.

---

## 16. Database + Backend Models

Status: 🟡 Partial but broad

Models present:

- User: ✅
- Project: ✅
- Deck: ✅
- Slide: ✅
- PdfDocument: ✅
- PdfPage: ✅
- SmartBuilderConfig: ✅
- ContentAnalysis: ✅
- PdfDocumentVersion: represented as `DocumentVersion`: 🟡
- BrandKit: ✅
- TwoFactorAuth: fields on User, no separate model found: 🟡
- ShareLink: represented through project sharing/public token: 🟡
- Notification: ✅
- ExportRecord: represented as `Export`, `PdfExport`, `ExportTemplate`, `ExportJob`: 🟡

PdfDocument support:

- qualityScore: ✅
- validationResult: ✅
- exportReady: ✅
- outline: ✅
- metadata: ✅
- template: 🟡 via metadata/templateType, no direct pro template field.
- Pro Template: 🟡 stored in metadata, not schema-level relation.
- brand kit: ✅
- pages: ✅

PdfPage support:

- order: ✅
- pageType: ✅
- title: ✅
- content JSON: ✅
- blocks: 🟡 inside content/composition, not first-class field.
- styles: 🟡 customStyles exists.
- semanticSectionId: 🟡 stored inside content.sectionId, not schema field.
- densityScore: 🟡 inside content.composition.metrics, not schema field.

Migration needs:

- Add explicit `proTemplateId` to `PdfDocument`.
- Add explicit `blocks`, `styles`, `semanticSectionId`, `densityScore`, `pageNumber` to `PdfPage`.
- Add export records that cover PDF/DOCX/PPTX/PNG/JPEG consistently.
- Add collaboration/versions history metadata for 50-state editor history if not using separate event model.

---

## 17. Runtime Bug Detection

Confirmed runtime bugs:

1. Frontend dev server at `localhost:3200` returned 500 stale webpack runtime error.
2. Presentation generation failed with `Generated content validation failed`.
3. Presentation project ended `failed`, deck had zero slides.
4. PDF Studio PPTX export failed: `pptxgenjs_1.default is not a constructor`.
5. Generated PDF document had `exportReady: false` and `validationResult: null` despite `qualityScore: 94/95`.
6. Generated `PdfPage.pageNumber` returned `1` for both page 1 and page 2.
7. Generated content page had under 120 words, violating density requirement.
8. Cover page stored full content summary as JSON string in `content.text`.
9. Unsplash is disabled: `{ configured: false, enabled: false }`.
10. Storytelling/visual-intelligence API route mismatch: frontend calls `/storytelling/...` and `/visual-intelligence/...`, but backend controllers are `api/storytelling` and `api/visual-intelligence` under global `/api`, making actual routes `/api/api/...`. Runtime `/api/storytelling/metaphors` returned 404.

Likely bugs needing browser QA:

- Dropdown overflow in PDF Studio editor/template picker.
- Raw JSON rendering risk.
- Preview/export mismatch.
- Image clipping in exports.
- Chart export parity.
- Editor save/reload parity.

---

## 18. Deleted File / Missing System Detection

No production build-level missing imports were found:

- Frontend build passes.
- Backend build passes.

This means the deletion damage is less about missing imports and more about missing product systems, disconnected systems, placeholder surfaces, and incomplete runtime behavior.

Missing or incomplete by spec:

- MarkdownParsingService.
- RuleBasedStructureDetectorService.
- SemanticClusterService.
- ContentPreservationService.
- SafeDeduplicationService.
- Pro template validators.
- 20 pro template categories.
- PNG/JPEG export services.
- Future web publishing.
- Full Visual Design Studio engine.
- Presentation template engine.
- Presentation Pro Templates.
- API key management.
- Full analytics event pipeline.
- Full editor 50-state undo/version history.
- Dedicated page-level schema fields for semantic/density data.

---

## Files To Restore

Likely restore/recreate targets:

- `features/pdf-studio/pro-templates/validators/*`
- `features/pdf-studio/pro-templates/layouts/*`
- `features/pdf-studio/pro-templates/templates/*` for the missing 19+ categories
- `backend/src/pdf-studio/pro-templates/validators/*`
- `backend/src/pdf-studio/pro-templates/layouts/*`
- `backend/src/pdf-studio/services/markdown-parsing.service.ts`
- `backend/src/pdf-studio/services/rule-based-structure-detector.service.ts`
- `backend/src/pdf-studio/services/semantic-cluster.service.ts`
- `backend/src/pdf-studio/services/content-preservation.service.ts`
- `backend/src/pdf-studio/services/safe-deduplication.service.ts`
- `backend/src/pdf-studio/services/png-export.service.ts`
- `backend/src/pdf-studio/services/jpeg-export.service.ts`
- Presentation template registry/renderers.
- Presentation editor canvas renderer.

## Files To Rebuild

High-priority rebuild targets:

- `backend/src/generation/generation.processor.ts`
- `backend/src/generation/generation.service.ts`
- `backend/src/generation/slide-types/slide.factory.ts`
- `frontend/app/editor/[id]/page.tsx`
- `frontend/app/pdf-studio/editor/[id]/page.tsx`
- `backend/src/pdf-studio/services/pptx-export.service.ts`
- `backend/src/pdf-studio/controllers/pdf-export.controller.ts`
- `frontend/app/pdf-studio/visual-studio/page.tsx`
- `frontend/app/export-templates/page.tsx`
- `frontend/app/help/page.tsx`
- `frontend/lib/api.ts` or backend controller prefixes for story/visual intelligence.

## Database Migrations Needed

1. `PdfDocument.proTemplateId String?`
2. `PdfDocument.templateType String?`
3. `PdfPage.pageNumber Int?` if frontend/API expects it.
4. `PdfPage.blocks Json?`
5. `PdfPage.styles Json?`
6. `PdfPage.semanticSectionId String?`
7. `PdfPage.densityScore Float?`
8. `PdfPage.layoutType String?`
9. Dedicated `DocumentHistoryState` or `EditorHistoryEvent` for 50-state history.
10. Dedicated export model that supports `pdf`, `docx`, `pptx`, `png`, `jpeg`, and future web publishing.
11. Optional `ApiKey` model if API key management remains required.

## Components To Reconnect

- `DocumentEditor.tsx` block editor to the main PDF Studio editor route.
- `EditorToolbar.tsx` to actual persisted page/block styles.
- `ChartPanel.tsx` to page content, preview, and export.
- `ImageUploadPanel.tsx` to upload, replacement, preview, and export.
- `ProTemplatesDropdown.tsx` to a real 20-template registry.
- `TemplatePreview.tsx` to generated previews, not only SVG mocks.
- `PresenceIndicator.tsx` to real editor collaboration state.
- `ExportDialog`/`ExportOptionsPanel` to the actual PDF Studio export stack.

## Services To Reconnect

- PageDensityBalancerService: currently present but effectively bypassed in generation controller.
- ProTemplateRendererService: connected to PDF/preview but registry too small.
- BrandKitService: connect globally to editor, templates, exports.
- ChartGenerationService/ChartRenderingService: connect to editor-side chart blocks.
- ImageUploadService: connect to image replacement and export preservation.
- DocumentVersionsService: connect to editor save/rollback UI.
- Activity/Analytics services: connect to opens, exports, template use, quality checks.

## Routes To Fix

- `/api/storytelling/*` mismatch with backend `@Controller('api/storytelling')`.
- `/api/visual-intelligence/*` mismatch with backend `@Controller('api/visual-intelligence')`.
- `/api/pdf-studio/export/:id` PPTX path.
- Presentation generation status should return consistent completed/failed status.
- Create wizard should route presentations to editor after deck ready.
- Export templates page should become real or be removed from nav until implemented.

## Export Engine Fixes

- Fix `pptxgenjs` import/constructor in PDF Studio PPTX service.
- Add PNG/JPEG export.
- Add visual parity tests comparing preview/export.
- Preserve images/charts/templates/brand kit in all export formats.
- Avoid exporting editor UI.
- Add clipping/overflow checks.
- Add page density checks before export.

## Template Engine Fixes

- Build 20 Pro Template categories.
- Register all backend token files or remove dead ones.
- Add frontend concrete templates beyond `businessFlyer`.
- Add validators.
- Add export snapshots per template.
- Generate real preview images.
- Separate standard and pro template metadata cleanly.

## Priority Repair Order

P0 Stabilization:

1. Restart/clean frontend dev server; fix stale webpack runtime.
2. Fix presentation generation validation failure.
3. Fix PDF Studio PPTX export constructor error.
4. Normalize document type constants.
5. Remove/replace AI/OpenAI messaging from deterministic flows.

P1 Core Publishing:

6. Fix page numbering and density validation.
7. Stop cover pages from duplicating full source content.
8. Ensure `validationResult` and `exportReady` are computed for generated PDFs.
9. Connect editor save/reload to actual page/block persistence.
10. Add preview/export parity checks.

P2 Product Completeness:

11. Rebuild Visual Design Studio as a real visual composer.
12. Expand Pro Templates from 1 to 20.
13. Add PNG/JPEG exports.
14. Finish Brand Kit logo/font/spacing/export integration.
15. Add full analytics events.

P3 Collaboration/Enterprise:

16. 50-state history.
17. Version rollback UI.
18. Comments/mentions/presence production UX.
19. API key management if still required.
20. Google Slides import verification/rebuild.

## Estimated Rebuild Effort

Rough engineering estimate:

- Stabilization bugs: 2-4 days.
- Presentation system productionization: 1.5-3 weeks.
- PDF Studio editor persistence/composer parity: 2-4 weeks.
- Pro Templates 20-category system: 3-6 weeks depending template quality.
- Visual Design Studio rebuild: 3-5 weeks.
- Export parity and image/chart robustness: 1.5-3 weeks.
- Collaboration/versioning: 2-4 weeks.
- Full QA automation and runtime matrix: 1-2 weeks.

Total to reach the stated product goal: approximately 8-16 focused engineering weeks depending team size and how polished the Pro Templates/Visual Studio must be.

## Final Assessment

What survived:

- Large backend PDF Studio pipeline.
- Standard template configs.
- PDF/DOCX export.
- Smart Builder generation.
- Database models for most core entities.
- Basic dashboard/app shell.
- Auth basics.
- Initial pro-template scaffold.

What is damaged:

- Presentations end-to-end.
- PDF Studio PPTX export.
- Frontend dev runtime stability.
- Template/pro-template completeness.
- Visual Studio authenticity.
- Density/export readiness quality gates.

What is fake or incomplete:

- Export Templates page.
- Social login buttons.
- Large parts of Visual Studio.
- Pro Templates breadth.
- Some AI/intelligence labels.
- Some advanced analytics/collaboration claims.

Production readiness:

- Not production ready yet.
- The platform has a strong skeleton and several real engines, but the current codebase is inconsistent and needs a repair-first productionization pass before feature expansion.
