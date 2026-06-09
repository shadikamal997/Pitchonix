# Pitchonix — Full Platform Forensic Audit

_Generated from a 39-agent multi-agent forensic workflow (per-module audit + adversarial verification of every P0/P1). 2.6M tokens, ~54 min._

## 1. Executive Summary
Pitchonix presents as a broad multi-format creation platform (decks, PDFs, Excel, career docs, conversions, brand kits), but the audit shows the breadth is wider than the depth is solid: several headline flows are wired to UI but not to working backends. The single most damaging defect is that all ten PDF document types dead-end after creation — the Create wizard discards the returned pdfDocumentId and routes users to a deck-only project page that shows "No decks yet," so the primary "Create Business Plan" path on the dashboard hero and most Quick Create cards lead nowhere usable. Core list surfaces are also broken: the dedicated /projects page mis-parses the response envelope and always renders empty, and the same Project table mixes PDF and slide projects with no type detection, so a PDF project opening the slide editor offers a "Generate Deck" button that runs the wrong pipeline. A recurring and serious pattern is functionality that lies through success toasts: ATS "Apply Fix" returns hardcoded success and mutates nothing, PDF "Expand/Shorten/Restructure" all run the same grammar regex with no LLM, brand kits write theme tokens no renderer reads, and "apply template" claims to be non-destructive while actually deleting and regenerating every slide, destroying manual edits. Exports are frequently mislabeled: PDF conversion and Excel report export silently return HTML bytes stamped as application/pdf when LibreOffice/Puppeteer is unavailable, and every Excel XLSX export silently drops all cell styling because the project ships the free SheetJS Community build that cannot write styles — gutting the entire "modernize/executive-ready formatting" value proposition. Security is the most alarming cross-cutting area: an unauthenticated @Public preview endpoint discloses full document content (IDOR), multiple smart-builder and document-version write paths skip ownership checks, an Unsplash proxy enables authenticated SSRF that leaks the API key, upload-delete allows path traversal, and all exported/uploaded artifacts are served as public static assets with no auth. The database foundation is fragile: the live DB was built with `prisma db push`, the migration history is in a FAILED state (error 42701), so Prisma will refuse all future migrations, and the hottest dashboard query (projects by userId) has no index and does a sequential scan. Analytics is largely theater — Total Exports is permanently 0 because incrementExport has zero callers, Views counts only anonymous public-link hits, and all KPIs are client-side reductions silently truncated at 100 projects. The genuinely strong areas — the slide/PDF editors, presentations, and PPTX import — are real and beta-quality, but they sit on top of broken navigation, fake metrics, mislabeled exports, and material security holes that would each independently embarrass the product in front of a paying user.

## 2. Overall Score
**61/100 — Major Work Required**

## 3. Module Scores
| Module | Score | Grade |
|---|---:|---|
| Dashboard | 72 | demo |
| Create New | 58 | major work |
| Projects | 52 | major work |
| Presentations | 84 | beta |
| PDF Studio | 62 | major work |
| Career Docs | 78 | demo-plus / low-beta |
| Excel Studio | 74 | demo |
| Brand Kits | 58 | major work |
| Convert | 58 | major work |
| Import PPTX | 78 | demo-to-beta |
| Analytics | 42 | major work |
| Settings | 62 | major work |
| Help & Support | 52 | major work |
| Templates (cross-cutting) | 54 | major work |
| Editors (cross-cutting) | 84 | beta |
| Exports (cross-cutting) | 79 | demo-to-beta |
| Security (cross-cutting) | 64 | major work |
| Performance (cross-cutting) | 70 | major work |
| Database (cross-cutting) | 63 | major work |

## 4. Critical P0 Issues (14)
### P0#1 — [Create New] All 10 PDF document types dead-end after creation: wizard ignores returned pdfDocumentId and routes to deck-only project page
- **File:** `/Users/shadi/Desktop/Pitchonix/frontend/app/create/page.tsx` — handleFinish (format === 'pdf' branch, lines 491-503)
- **Problem:** When the selected document type has format 'pdf' (business_plan, proposal, company_profile, executive_summary, marketing_plan, financial_projection, case_study, internal_report, partnership_proposal, one_pager), handleFinish POSTs /pdf-documents/generate. The backend returns { success, pdfDocumentId, pageCount, document } at the top level (verified: pdf-documents.controller.ts:74-79). The frontend logs response.data (line 500) then DISCARDS pdfDocumentId and calls router.push(`/projects/${savedProjectId}`) (line 503). The /projects/[id] page (verified) is entirely deck/slide-centric — zero pdf/format/pdfDocument references — and projects.service.findOne (verified projects.service.ts:88-125) includes decks/generationJobs/qualityReports but never pdfDocuments. The user therefore lands on a 'No decks yet' page (page.tsx:247-284) with no link to the PDF, which actually lives at /pdf-studio/editor/<pdfDocumentId> (route verified to exist and to load the same PdfDocument by id via GET /pdf-studio/smart-builder/documents/:id, smart-builder.controller.ts:886).
- **Root cause:** handleFinish hardcodes router.push(`/projects/${savedProjectId}`) for the PDF branch (line 503) and never reads response.data.pdfDocumentId; the project page and projects.service.findOne were never taught about PdfDocument artifacts. A leftover comment at lines 501-502 ('Navigate to PDF Studio (once created) / For now, redirect to project page') confirms this was a known stub never finished.
- **User impact:** 10 of the 16 advertised create types appear to do nothing: the user completes the wizard, clicks Finish & Generate, sees a success log, and is dropped on an empty 'No decks yet' project page. The generated PDF is unreachable unless the user manually navigates to PDF Studio. The entire PDF Studio creation funnel is broken from Create New.
- **Business impact:** Half the product's headline document catalog is non-functional from the primary creation entry point, undermining the core value proposition and likely driving churn/refunds.
- **Exact fix:** In the PDF branch of handleFinish, use the returned id: replace lines 500-503 with `const pdfDocumentId = response.data?.pdfDocumentId; if (pdfDocumentId) { router.push(`/pdf-studio/editor/${pdfDocumentId}`); } else { setGenerateError('Generation did not return a document.'); setLoading(false); }`. The response shape is confirmed (controller returns pdfDocumentId at top level) and the editor route resolves any PdfDocument by id. Optional defense in depth: add pdfDocuments to projects.service.findOne and have /projects/[id] redirect to the PDF editor when a project has a PdfDocument and no decks.
- **Effort:** S (1-3 lines for the route fix; M if also hardening the project page)
- **Verify:** Log in, on dashboard click 'Create Business Plan' (or Quick Create -> Proposal). Complete the wizard with company name + industry + audience + tone + problem + solution and click Finish & Generate. EXPECTED: redirected to /pdf-studio/editor/<id> showing the generated PDF pages. ACTUAL (current): redirected to /projects/<id> showing 'No decks yet' with no PDF anywhere.
- **Verification:** confirmed — Confirmed against code. create/page.tsx line 500 logs response.data and line 503 routes to /projects/${savedProjectId}, never reading pdfDocumentId. Backend pdf-documents.controller.ts:74-79 returns pdfDocumentId at top level. projects.service.ts findOne (88-125) does not include pdfDocuments. /projects/[id]/page.tsx has no PDF handling and shows 'No decks yet'. The target editor route app/pdf-studio/editor/[id]/page.tsx exists and loads the same PdfDocument by id. A stale 'For now, redirect to project page' comment at lines 501-502 confirms intent. Severity P0 upheld.

### P0#2 — [Projects] Dedicated /projects list page always renders empty (response envelope mis-parsed)
- **File:** `/Users/shadi/Desktop/Pitchonix/frontend/app/projects/page.tsx` — fetchProjects (lines 33-45)
- **Problem:** The backend findAll() returns { data: Project[], meta: {...} } (projects.service.ts:77-85). The page does: const { data } = await api.get('/projects'); setProjects(Array.isArray(data) ? data : (data?.projects || [])). api.ts's response interceptor returns the full axios response, so destructured `data` is the response body { data, meta } — it is not an array and has no `.projects` key — so setProjects always receives []. The page therefore unconditionally shows the 'No projects found' empty state even when the user has projects.
- **Root cause:** Frontend expects either a raw array or a `.projects` field, but the API returns the list under a `.data` field of the envelope. The correct read is the envelope's `.data` (as the dashboard correctly does at dashboard/page.tsx:180 via response.data.data).
- **User impact:** Users navigating to /projects see 'No projects found' and a 'Create Your First Project' CTA even when they have many projects — the entire dedicated Projects page is non-functional.
- **Business impact:** Core navigation surface for managing projects is dead; users may think their work was lost and churn or re-create duplicates.
- **Exact fix:** Change line 38 to read the envelope: `const list = Array.isArray(data) ? data : (data?.data ?? data?.projects ?? []); setProjects(list);`
- **Effort:** 5 minutes
- **Verify:** Create 2 projects via the API/dashboard, navigate to /projects, confirm both cards render (not the empty state).
- **Verification:** confirmed — Confirmed at projects/page.tsx:35-38. findAll returns the {data,meta} envelope (projects.service.ts:77-85). api.ts response interceptor at line 39 returns `response` unchanged, so `const { data } = await api.get(...)` yields the response body = {data,meta}; `data.projects` is undefined → setProjects([]) always. Dashboard reads it correctly, confirming the envelope shape.

### P0#3 — [Projects] No project-type detection — PDF Studio projects open the presentation editor / slide-generation flow
- **File:** `/Users/shadi/Desktop/Pitchonix/frontend/app/projects/[id]/page.tsx` — ProjectPage + dashboard project cards
- **Problem:** PDF Studio creates rows in the SAME Project table with documentFormat='pdf' (smart-builder.controller.ts:486-497) and these are returned by /projects. But the schema's documentFormat field (schema.prisma:83, 'slides' vs 'pdf') is never read in the frontend (grep finds zero usages under frontend/). The detail page (/projects/[id]) renders only deck/slide UI; a PDF project has pdfDocuments not decks, so it hits the project.decks.length===0 branch (line 247) showing 'No decks yet' and, for status 'draft', a 'Generate Deck' button (line 261-281) that POSTs /generate (slide generation) on a PDF project. The dashboard 'Edit' button routes to /editor/{decks[0].id} which is undefined for PDF projects.
- **Root cause:** Routing/dispatch logic assumes every Project is a presentation. There is no switch on documentFormat/documentType to send PDF projects to /pdf-studio, Career to /career, etc.
- **User impact:** Opening a PDF project shows an empty 'No decks yet' screen and offers to run slide generation against a PDF project (POST /generate), confusing the project; users cannot reach the PDF Studio editor from the projects list.
- **Business impact:** Multi-format positioning is false at the UX layer; PDF Studio output is effectively orphaned from the projects experience.
- **Exact fix:** Add a dispatch helper, e.g. openProject(p) => p.documentFormat==='pdf' ? router.push(`/pdf-studio/${p.pdfDocuments?.[0]?.id ?? p.id}`) : router.push(`/projects/${p.id}`). Include pdfDocuments:{select:{id:true}} in findAll's include so the UI can route. Wire it into both /projects and /dashboard View/Edit/Open buttons.
- **Effort:** 0.5-1 day (add include, helper, and wire all buttons; verify pdf-studio route param)
- **Verify:** Create a smart PDF via PDF Studio, confirm it appears in /projects and dashboard, click View/Edit, confirm it opens the PDF Studio editor (not a slide-deck 'Generate Deck' screen).
- **Verification:** confirmed — Confirmed. smart-builder.controller.ts:486-497 creates Project with documentFormat:'pdf' + a separate PdfDocument (line 501). schema.prisma:83 defines documentFormat; grep across frontend/ returns ZERO documentFormat reads. projects/[id]/page.tsx:247 branches on project.decks.length===0 → 'No decks yet'; lines 261-281 show a draft-status 'Generate Deck' button POSTing /generate. findAll's include omits pdfDocuments, so the UI has no signal to route differently.

### P0#4 — [Brand Kits] 'Apply to deck' / 'Apply to workspace' writes deck.metadata.themeTokens which no renderer or exporter reads — zero branding effect
- **File:** `backend/src/brand-kits/brand-kits.service.ts` — applyToDeck (lines 275-310), applyToMany (382-402)
- **Problem:** applyToDeck writes the kit's colors/fonts/logo into deck.metadata.themeTokens and sets deck.brandKitId. But the slide render/export pipeline reads the per-slide column slide.themeTokens (slide-export.service.ts:253 -> element-html-renderer.ts:154-158), NOT deck.metadata. The slide rows are never updated. Additionally the object applyToDeck writes (lines 284-296) uses keys {primary, secondary, accent, fontFamily, headingFontFamily, borderRadius, logoUrl, companyName} whereas element-html-renderer.ts:158 reads {accent, accent2, text, muted, surface, border} — so even if it were wired to the right column, the keys wouldn't match.
- **Root cause:** Apply was implemented against deck.metadata.themeTokens (a field invented for this feature) instead of the slide.themeTokens column the renderer actually consumes, and with a mismatched token shape. No integration test traces metadata -> render.
- **User impact:** User picks a brand kit, clicks 'Apply to workspace', sees 'Applied to N decks' success toast (page.tsx:615), then opens/exports the deck and nothing changed. Branding silently fails for the entire presentations product.
- **Business impact:** The flagship value prop ('apply your brand everywhere') is non-functional for decks. Enterprise buyers evaluating brand governance will see it does nothing.
- **Exact fix:** Option (a) is the correct, render-aligned fix: in applyToDeck, after resolving the kit, also write each slide's themeTokens column in the renderer-expected SlideThemeTokens shape — map kit colors to {accent, accent2, text, muted, surface, border, background} (e.g. primary->accent, secondary->accent2) and persist via prisma.slide.updateMany({ where: { deckId }, data: { themeTokens } }) (or per-slide merge to preserve existing tokens). Option (b) fallback: make renderSlidePage fall back to deck.metadata.themeTokens/deck.brandKit when slide.themeTokens is null AND translate primary->accent etc. Add an integration test that applies a kit, exports the deck HTML, and asserts the accent color appears.
- **Effort:** 1-2 days
- **Verify:** Create a deck with default-colored slides, POST /brand-kits/:id/apply/:deckId with a kit whose primary is #FF0000, then GET the deck PDF/HTML export and grep the rendered HTML for the brand color. Currently the color is absent; after fix it must appear on every slide.
- **Verification:** confirmed — CONFIRMED at source. applyToDeck (lines 305-309) writes only deck.brandKitId + deck.metadata.themeTokens with keys primary/secondary/accent/fontFamily/headingFontFamily/borderRadius/logoUrl/companyName (lines 284-296). slide-export.service.ts:253 passes slide.themeTokens (per-slide column) into renderInput, and element-html-renderer.ts:157-158 reads tok.accent/accent2/text/muted/surface/border. grep across backend/src confirms ZERO consumers of deck.metadata.themeTokens (only the writer's own comment lines reference it). No code path writes slide.themeTokens from apply. Both the wrong-column AND wrong-key-shape claims hold. applyToMany loops applyToDeck so it inherits the dead behavior.

### P0#5 — [Brand Kits] Dashboard logo & asset upload posts wrong multipart field name — every upload is rejected
- **File:** `frontend/features/brand-kits/useBrandKits.ts` — uploadAsset (lines 166-179)
- **Problem:** uploadAsset does form.append('image', file) (line 169) and POSTs to /upload/image. The backend route POST /upload/image (upload.controller.ts:27) uses @UseInterceptors(FileInterceptor('file')) — it only accepts the field named 'file'. With FileInterceptor('file'), an unexpected field named 'image' triggers a Multer 'Unexpected field' error (and @UploadedFile() file is undefined → handler also throws BadRequestException('No file provided') at line 30). Either way the request fails.
- **Root cause:** Frontend/back field-name mismatch ('image' vs 'file'). All upload endpoints (image/thumbnail) use FileInterceptor('file'); no endpoint expects 'image'.
- **User impact:** Logos tab 'Upload a logo variant' and Assets tab 'Choose a file' both fail every time. Users can only attach logos/assets by pasting a URL; native upload is dead.
- **Business impact:** Core brand-asset onboarding (upload your logo) is broken, blocking the primary setup flow for new brand kits.
- **Exact fix:** In useBrandKits.ts:169 change form.append('image', file) to form.append('file', file). The response reads u.url/u.mimetype/u.width/u.height; saveImage (upload.service.ts:91-98) returns url + mimetype but NOT width/height, so those land as undefined on the BrandAsset (acceptable, asset still attaches). Optionally enrich saveImage to return sharp metadata width/height.
- **Effort:** 15 minutes
- **Verify:** In the Logos tab, select a PNG via 'Choose a file'. Network tab should show 200 from /api/upload/image and the asset list should refresh with the new logo. Currently the upload fails (Multer unexpected-field / 'No file provided').
- **Verification:** confirmed — CONFIRMED. useBrandKits.ts:169 does form.append('image', file). upload.controller.ts:27 uses @UseInterceptors(FileInterceptor('file')) and line 29-31 throws BadRequestException('No file provided') when the 'file' field is absent. saveImage (upload.service.ts) returns {originalName, filename, path, url, size, mimetype} — confirmed no width/height, so the original auditor's note about undefined width/height is accurate. Field-name mismatch is real; upload is broken every time.

### P0#6 — [Convert] PDF conversion silently returns HTML when LibreOffice is missing
- **File:** `backend/src/universal-conversion/exporters/pdf-exporter.ts` — exportPdf
- **Problem:** When `soffice` is not available (or its run fails), exportPdf returns the HTML buffer with mimetype text/html and extension 'html' and mode:'html' (lines 30-46). universal-conversion.service.ts exportFromUdm then sets format:'html' for a 'pdf' request (line 310). The /convert controller writes Content-Type:text/html and a .html filename straight from result.mimetype/result.extension (lines 109-110), and the frontend names the download `${base}.${preview?.extension}` = .html (page.tsx line 81). The user asked for PDF and silently receives HTML with no warning.
- **Root cause:** PDF export is implemented only as a LibreOffice shell-out (pptxToPdf via `soffice --convert-to pdf`) with an HTML fallback that is treated as a legitimate success rather than an error or an explicit user-facing notice.
- **User impact:** In any deployment without LibreOffice, every PDF target (PDF, and DOCX/XLSX/HTML/MD->PDF) yields an HTML file masquerading as the requested PDF conversion. Users get the wrong file type with no indication.
- **Business impact:** Core advertised capability ('Convert ... to PDF', hero PDF fidelity 94%) is unreliable and environment-dependent; broken file types erode trust and generate support load.
- **Exact fix:** Either (a) make PDF a first-class renderer that does not depend on LibreOffice (e.g. render the HTML to PDF with a headless Chromium/puppeteer or wkhtmltopdf path) so PDF always produces application/pdf; or (b) if falling back, surface format:'html' explicitly to the UI (the controller already emits X-Pitchonix-Conversion-Format: html, so the frontend can read it) and block/relabel the download as HTML with a visible warning, plus add a soffice availability probe to /convert/storage/diagnostics. Do not return HTML bytes under a PDF request silently.
- **Effort:** medium
- **Verify:** On a host without soffice (rename/PATH-hide /opt/homebrew/bin/soffice), upload any DOCX and choose target PDF; inspect the response Content-Type and downloaded file — confirm it is application/pdf, not text/html named .html.
- **Verification:** confirmed — Verified in pdf-exporter.ts lines 30-46 (HTML fallback returns text/html/.html/mode:'html') and service.ts line 310 (mode!=='libreoffice' => format:'html'). Controller lines 109-110 emit Content-Type/Disposition from result.mimetype/extension with no warning; X-Pitchonix-Conversion-Format header carries 'html' but the frontend ignores it (page.tsx never reads response headers, names download from preview.extension). soffice IS installed on this dev box so it works locally, exactly matching the environment-dependent claim. Real P0.

### P0#7 — [Analytics] Total Exports metric is fake — exportCount is never incremented by any export path
- **File:** `/Users/shadi/Desktop/Pitchonix/backend/src/projects/projects.service.ts` — incrementExport (line 289) / consumed in frontend/app/analytics/page.tsx:47
- **Problem:** projects.service.ts defines `incrementExport(id)` which does `exportCount: { increment: 1 }` (line 289-291), but a full-repo grep confirms ZERO callers — the only matches for `incrementExport` are its own definition. No PDF, PPTX, Excel, or slide-export controller invokes it (export/ and slide-export/ modules exist but never call it). The Analytics page sums project.exportCount into the 'Total Exports' KPI (page.tsx:47,77), renders it as a blue 'Exports' bar series (page.tsx:98), and shows it per-row in the table (page.tsx:125). For every real user exportCount is permanently 0, so the dashboard presents a hardcoded-zero value as a live metric.
- **Root cause:** The export counter increment was implemented in the service but never wired into the export controllers/services that actually produce files. Dead code on the backend (projects.service.ts:289); the frontend trusts the field as real.
- **User impact:** Users see 'Total Exports: 0' forever no matter how many PDFs/PPTX/Excel files they export. The chart's entire Exports dimension and the table Exports column are dead. The dashboard actively lies about activity.
- **Business impact:** Core 'analytics' value proposition is undermined — export engagement, a key product KPI, is invisible. The weekly email digest (email-digest.service.ts:55-62) also aggregates this permanently-zero field via _sum exportCount, so customer-facing reporting reports misleading zeros, eroding trust.
- **Exact fix:** Call projectsService.incrementExport(projectId) (or an equivalent DB increment scoped to the owning project) from every export endpoint that successfully produces a file: export.controller.ts (export/ module), slide-export.controller.ts, smart-builder export, and the Excel export path. Make the call only after successful generation and resolve projectId from the document/deck (note exports are deck-scoped, so resolve deck.projectId). Add a unit/integration test asserting exportCount increments after each export type.
- **Effort:** M (wire 4-5 export paths + resolve projectId from deck + tests)
- **Verify:** 1) Note a project's exportCount (DB or :id/analytics). 2) Export it as PDF, then PPTX, then Excel via the UI. 3) Re-query: exportCount should be 3. 4) Reload /analytics: Total Exports KPI, Exports bar, and table Exports column should reflect the new count. Currently it stays 0.
- **Verification:** confirmed — Confirmed against code. projects.service.ts:289-291 defines incrementExport; `grep -rn incrementExport` returns only that definition (zero callers). `grep -rn exportCount` shows it consumed in analytics page (47,58,125) and aggregated in email-digest.service.ts:57,62 — but written nowhere. export/ and slide-export/ modules exist with controllers yet none invoke the increment. Metric is permanently 0.

### P0#8 — [Settings] Two-factor authentication is never enforced at login (security theater)
- **File:** `/Users/shadi/Desktop/Pitchonix/backend/src/auth/auth.service.ts` — AuthService.login (lines 41-61)
- **Problem:** The Settings page lets users set up TOTP 2FA (POST /auth/2fa/setup, /enable, /disable) and shows an 'Enabled' badge, but auth.service.login() issues a JWT after only bcrypt password verification. It reads user.twoFactorEnabled and returns it in the response, but never requires a TOTP code. The LoginDto has no code field and the login page has no 2FA step.
- **Root cause:** login() (lines 45-48) does bcrypt.compare then immediately calls generateToken with no branch on user.twoFactorEnabled and no call to TwoFactorService.verifyCode. The verifyCode helper exists in backend/src/auth/two-factor.service.ts but is never invoked in the login path. AuthService does not even inject TwoFactorService.
- **User impact:** A user who enables 2FA believes their account requires a second factor. It does not — anyone with the password logs in normally. The protection is entirely illusory.
- **Business impact:** False security claim; an account marketed as 2FA-protected is not. Compliance/trust risk and potential breach exposure for high-value accounts.
- **Security impact:** Critical. 2FA provides zero actual protection. Stolen/phished passwords grant full access despite 2FA being 'enabled'.
- **Exact fix:** In login(): after the password check (line 46), if user.twoFactorEnabled, require a dto.code (add a code field to LoginDto in backend/src/auth/dto/auth.dto.ts), inject TwoFactorService and call twoFactorService.verifyCode(user.id, dto.code), throwing UnauthorizedException on failure — or return a {twoFactorRequired:true} challenge and gate token issuance behind a follow-up /auth/2fa/verify-login step. Update the login page to prompt for the code when challenged.
- **Effort:** medium
- **Verify:** Enable 2FA in Settings, log out, and log in with only email+password. Currently a token is issued and you reach the dashboard. After the fix, login must reject without a valid TOTP code.
- **Verification:** confirmed — Confirmed against auth.service.ts lines 41-61: login() does only `bcrypt.compare(dto.password, user.password)` then `generateToken` with no 2FA branch. LoginDto in auth.dto.ts has only email+password (no code field). two-factor.service.ts exists but is never referenced in the login flow. P0 stands as written.

### P0#9 — [Templates (cross-cutting)] Presentation 'apply template' wipes the deck and destroys all manual slide edits (documented as non-destructive)
- **File:** `frontend/features/slide-editor/templates/applyTemplate.ts` — applyTemplate / backend unified-pipeline.service.stageMigration
- **Problem:** applyTemplate() header comment promises 'Non-destructive: bullets, charts, images, numbers stay where the user put them. Re-applying the SAME template should be a no-op (idempotent).' In reality it POSTs to /generate/template-switch/:projectId which runs the TEMPLATE_SWITCH pipeline. In stageGeneratorExecution the deck is fully REGENERATED from wizardInput via slideFactory.generateDeck() (unified-pipeline.service.ts:305) — persisted slides and manual edits are never read. Then stageMigration() executes prisma.slide.deleteMany({where:{deckId}}) (line 442, with the explicit comment 'wipe and rewrite') and recreates slides from ctx.slides. Every manual element edit is destroyed. The returned {slidesApplied, elementsRestyled:0} is cosmetic — elementsRestyled is hardcoded 0 and slidesApplied is just the post-regeneration count.
- **Root cause:** The recolor/restyle path (deriveElementStyle in registry.ts:713) was designed for non-destructive application but is never invoked (no call site); the UI instead triggers a full destructive regenerate-from-wizardInput-and-replace pipeline. The pipeline does snapshot to deck history first (shouldSnapshotBefore at unified-pipeline.service.ts:490), so the prior deck is recoverable, but the live deck is silently rebuilt.
- **User impact:** A user who hand-tunes a deck and then tries a different template loses all manual work in the live deck. The success toast implies a safe restyle; the deck is silently rebuilt (recoverable only via version history).
- **Business impact:** Erodes trust in the core editor; users avoid switching templates, undermining the template gallery value prop. Likely support/complaint driver.
- **Exact fix:** Implement the documented non-destructive path: walk existing persisted slides/elements, apply deriveElementStyle() + template background/theme tokens in place, persist via the slides bulk-update endpoint instead of calling template-switch. Or change the TEMPLATE_SWITCH pipeline branch to re-theme existing persisted slides rather than regenerate-from-wizardInput + deleteMany. At minimum, gate the destructive switch behind an explicit 'edits will be lost (recoverable from history)' confirmation and fix the applyTemplate.ts comment.
- **Effort:** M (1-2 days to wire non-destructive restyle through existing deriveElementStyle + bulk update endpoint)
- **Verify:** Create a deck, manually move an element and edit its text, note id/position. Apply a different template from TemplateGallery. Re-fetch /slides/deck/:deckId and confirm the element's manual position/text survive. Currently they are gone (slides deleted at unified-pipeline.service.ts:442 and recreated from a fresh slideFactory.generateDeck).
- **Verification:** confirmed — Confirmed against code. applyTemplate.ts:50 POSTs /generate/template-switch; unified-pipeline.service.ts:305 regenerates the whole deck from wizardInput; line 442 deleteMany wipes slides with comment 'FAMILY_SWITCH / TEMPLATE_SWITCH / REGENERATE / REBUILD all start with a clean deck — wipe and rewrite'; deriveElementStyle (registry.ts:713) has zero call sites (grep returns only definition + the applyTemplate comment). elementsRestyled is hardcoded 0 (applyTemplate.ts:59).

### P0#10 — [Templates (cross-cutting)] PDF Studio standard templates (30): declared per-template layouts are never rendered — all produce one recolored structure
- **File:** `backend/src/pdf-studio/services/pdf-export.service.ts` — generateHTML / generateStructuredPages
- **Problem:** Each TemplateType in template-configs.ts declares a unique layouts[] component sequence plus pages.includeCoverPage/includeTableOfContents and defaultSections. generateHTML() only branches pro/visual/structured and calls generateStructuredPages(pages, style), which renders each content page as a fixed HERO_HEADER + SECTION_CARD + FOOTER. templateConfig.layouts and defaultSections are never read by ANY consumer. Cover/TOC pages render only if such pages already exist in document.pages (driven by stored data). Only style {colorScheme, headerStyle, cardStyle, spacing} reaches the renderer. preview.service.ts has the same fixed structure. All 30 templates are layout-identical, differing only by colors/header height/spacing.
- **Root cause:** The layout-component system (LAYOUT_RENDERERS, LayoutComponentType) exists but the page-generation loop hardcodes the component sequence instead of iterating templateConfig.layouts. (Note: includeCoverPage/includeTableOfContents ARE honored upstream at PLANNING time in content-structure / rule-based-page-planner / smart-builder.controller, so the renderer-only claim about those two flags is partial; layouts[] and defaultSections are fully unused everywhere.)
- **User impact:** Choosing among 30 named templates is theater: document structure is identical regardless of choice.
- **Business impact:** False advertising of a 30-template library; the differentiation users select on does not exist.
- **Exact fix:** Drive page composition from templateConfig.layouts in generateStructuredPages: map document content onto the declared component sequence (METRICS_STRIP, TWO_COLUMN_LAYOUT, TABLE_BLOCK, CHART_BLOCK, TIMELINE_BLOCK, PROCESS_STEPS_BLOCK already exist in LAYOUT_RENDERERS). Apply the same in preview.service for parity. If out of scope, collapse the registry to the genuinely distinct {headerStyle,spacing,colorScheme} combos and stop labeling them as structurally distinct. (Cover/TOC planning already works upstream; the gap is layout component sequences + defaultSections never shaping output.)
- **Effort:** L (multi-day: implement layout-driven composition for all component types and reconcile preview + export parity)
- **Verify:** Export the same document with templateType=executive_one_pager (declares TWO_COLUMN_LAYOUT) and templateType=product_requirements (compact). Diff produced HTML/PDF structure. Currently only colors/spacing differ; no two-column layout regardless of the declared layouts[].
- **Verification:** adjusted — Confirmed core claim. generateStructuredPages (pdf-export.service.ts:353) reads only `style`; grep for `.layouts` across pdf-studio finds zero readers of templateConfig.layouts (only an unrelated combineLayouts helper). defaultSections also unread by renderer. ADJUSTED: the problem overstated includeCoverPage/includeTableOfContents as 'never consulted' — they ARE consulted in the upstream page-planning pipeline (content-structure.service:45/58, rule-based-page-planner:69/76, smart-builder.controller:340/357). The renderer doesn't read them, but the system honors them at generation time. The layouts[] and defaultSections claims are fully accurate and the all-templates-recolored conclusion holds. Severity kept P0.

### P0#11 — [Templates (cross-cutting)] Excel Studio templates (12): identical workbook structure for every template; descriptions promise non-existent sheets
- **File:** `backend/src/excel-studio/excel-studio.service.ts` — buildWorkbookFromScript / TEMPLATE_PALETTE
- **Problem:** buildWorkbookFromScript() (line 1809) always emits the same fixed sheets (Executive Summary, Source Data, Assumptions, Dashboard, Audit, Script, Pitchonix Template System) plus any sheets parsed from the user's SCRIPT (analysis.detectedSheets via scaffoldRequestedSheet). templateId is used ONLY to pick a 4-color palette from TEMPLATE_PALETTE (line 1815). The 12 templates' descriptions/strengths claim distinct structures never generated: 'Board Reporting System' (decision log, risk register, KPI cockpit), 'Startup Metrics Command Center' (MRR, activation, retention, runway), 'Marketing Analytics Studio' (campaign, CAC, channel, funnel, attribution), 'Investor Financial Model' (assumptions, runway, ARR, burn, scenario). None of these template-specific sheets exist.
- **Root cause:** Template selection is wired to a color palette only; no per-template sheet/layout generators exist. The only structural variation is script-driven (scaffoldRequestedSheet keyed off analysis.detectedSheets), never templateId-driven.
- **User impact:** Picking 'Board Reporting' or 'Startup Metrics' yields the same generic 7-sheet workbook with a different accent color, not the promised structures.
- **Business impact:** Materially misleading template catalog; undermines the Excel Studio value proposition.
- **Exact fix:** Implement per-template (or per-category) sheet generators that scaffold the promised structures (board => Decision Log/Risk Register/KPI Cockpit; startup => MRR/Retention/Runway). Map templateId -> structure builder, keeping palette as styling only. If not feasible short-term, rewrite descriptions/strengths to reflect the single generic structure and reduce the catalog to honest color variants.
- **Effort:** L (multi-day: build distinct per-template/category workbook scaffolders)
- **Verify:** Generate from the same script with templateId=board-reporting then templateId=startup-metrics. List SheetNames of both XLSX. Currently identical (Executive Summary/Source Data/Assumptions/Dashboard/Audit/Script/Pitchonix Template System + any script-detected sheets), only cell colors (palette) differ; none of the described template-specific sheets appear.
- **Verification:** adjusted — Confirmed. buildWorkbookFromScript (line 1809) emits a fixed sheet set; templateId only selects TEMPLATE_PALETTE (line 1815). scaffoldRequestedSheet exists but is driven by analysis.detectedSheets (user script), not templateId (line 1849). Promised sheets in descriptions (templates array lines 48-59) are never generated. ADJUSTED only: catalog has 12 templates, not 11 (counted lines 48-59). Severity kept P0.

### P0#12 — [Exports (cross-cutting)] Excel Studio 'audit/executive/dashboard PDF' returns HTML bytes labeled as application/pdf on Puppeteer failure
- **File:** `backend/src/excel-studio/excel-studio.service.ts` — buildReportPdf / exportProject
- **Page:** /excel-studio/editor/[id]
- **Problem:** buildReportPdf() (lines 1678-1693) wraps Puppeteer in try/catch and on ANY failure does `return Buffer.from(html, 'utf8')` — raw HTML. The caller exportProject() (lines 1113-1119) unconditionally sets contentType:'application/pdf' and filename '${slug}-${normalized}.pdf'. The controller (excel-studio.controller.ts:145-146) forwards payload.contentType and a .pdf Content-Disposition verbatim. The frontend further hardcodes ext='pdf' for any format containing 'pdf'. Result: a .pdf file containing HTML that no PDF reader can open.
- **Root cause:** Silent fallback returns a different file format without updating mimetype/extension/filename. Confirmed: the catch block at line 1690-1691 returns HTML bytes, and exportProject's audit-pdf branch hardcodes application/pdf with no mode flag. Contrast with the CV export path which correctly switches to text/html + .html and reads x-pitchonix-export-extension on the frontend.
- **User impact:** User clicks 'Export Audit PDF', gets a file named report.pdf that fails to open in Acrobat/Preview/Chrome PDF viewer. Looks like a corrupt download.
- **Business impact:** Core 'audit/board PDF' deliverable of Excel Studio is unreliable in any environment where Chromium isn't launchable (common in slim Docker images, serverless, restricted CI). Erodes trust in a paid export feature.
- **Exact fix:** Make buildReportPdf return {buffer,mimetype,extension} and have exportProject propagate them; on HTML fallback set contentType:'text/html', filename '${slug}-${normalized}.html'. Surface a header (e.g. X-Pitchonix-Export-Mode) and have the frontend read Content-Disposition / a mode header instead of hardcoding ext. Alternatively fail loudly (throw 503) rather than emitting mislabeled bytes.
- **Effort:** S (about 1-2 hours)
- **Verify:** Temporarily force Puppeteer to throw (set PUPPETEER_EXECUTABLE_PATH=/nonexistent), call GET /excel-studio/projects/:id/export?format=audit-pdf, save response, run `file` on it — reports 'HTML document' while Content-Type is application/pdf and filename ends .pdf.
- **Verification:** confirmed — Read buildReportPdf (lines 1678-1693): catch block returns Buffer.from(html,'utf8'). Read exportProject audit-pdf branch (lines 1113-1119): hardcodes contentType:'application/pdf' and `.pdf` filename, no relabel. Controller (excel-studio.controller.ts:145-146) forwards these directly. Frontend download() (page.tsx:311) hardcodes ext='pdf'. All elements of the chain confirmed real as stated.

### P0#13 — [Security (cross-cutting)] Unauthenticated document content disclosure via @Public preview endpoint (IDOR)
- **File:** `backend/src/pdf-studio/controllers/pdf-export.controller.ts` — PdfExportController.getPreview (GET /api/pdf-studio/export/preview/:id)
- **Problem:** The preview endpoint is decorated @Public() and @SkipThrottle for all buckets (lines 262-264). It calls previewService.generatePreview(documentId, true, ...) and returns the full rendered HTML of the document with NO authentication and NO ownership check. assertDocumentAccess IS defined in this controller (lines 61-76) and IS called by every other handler (exportDocument, invalidatePreviewCache, runPreflight) — but is deliberately not called in getPreview.
- **Root cause:** Endpoint marked @Public for iframe rendering (iframes can't send Authorization headers) but document IDs are guessable CUIDs and no per-resource access control or signed-token gate was added.
- **User impact:** Any anonymous visitor can read the full content of any user's PDF document by iterating /api/pdf-studio/export/preview/:id, exposing private business plans, resumes, financials, etc.
- **Business impact:** Mass data exfiltration of all customer documents; GDPR/privacy breach; reputational damage.
- **Security impact:** Critical broken access control (OWASP A01). Cross-tenant content disclosure to unauthenticated actors.
- **Exact fix:** Remove @Public() from getPreview and require JwtAuthGuard + add @GetUser() user and call await this.assertDocumentAccess(documentId, user) before generating the preview. If anonymous iframe rendering is genuinely required, gate it behind a short-lived signed preview token (HMAC of documentId+exp) issued only to the owner, and verify it in the handler.
- **Effort:** S (1-2 hours)
- **Verify:** Create a document as user A, note its id. Without any Authorization header, curl GET /api/pdf-studio/export/preview/<id> and confirm it currently returns A's content (200 with HTML). After fix, confirm it returns 401/403.
- **Verification:** confirmed — Confirmed in code: getPreview at lines 262-338 is @Public()/@SkipThrottle and calls previewService.generatePreview with no auth/ownership. assertDocumentAccess (lines 61-76) exists and is invoked by exportDocument (line 92), invalidatePreviewCache (line 351), and runPreflight (line 463) but NOT here. Real unauthenticated IDOR / content disclosure.

### P0#14 — [Database (cross-cutting)] Migration history is broken/failed — Prisma will refuse all future migrations
- **File:** `backend/prisma/migrations/20260504163331_add_phase1_fields/migration.sql` — _prisma_migrations table state
- **Problem:** The live database (postgresql://shadi@localhost:5432/pitchonix) was built with `prisma db push` (raw schema sync), NOT migrations. The _prisma_migrations table records only the `init` migration as applied (applied_steps_count=0 even there) and the second one (20260504163331_add_phase1_fields) is in a FAILED state: finished_at=NULL, rolled_back_at=NULL, applied_steps_count=0, logs contain Postgres error 42701 'column "audience" of relation "projects" already exists'. The column already existed because db push had already created it (verified: projects.audience exists in the live DB). `prisma migrate status` confirms 10 later migrations (quality_control, pdf_studio, smart_builder, cv_analysis, excel_studio, excel_workbook_operations, etc.) are NOT applied — their tables exist purely because of db push. NOTE: there are 12 migration directories on disk, not 13 as the first pass stated.
- **Root cause:** Someone ran `prisma db push` to materialize the schema, then later tried `prisma migrate dev/deploy`, which replays migration SQL from scratch and collided with already-present columns. The package.json only defines `prisma migrate dev` (no `migrate deploy` in any boot/CI script), so the migration directory was never the source of truth.
- **User impact:** None at runtime today (tables exist). But any future schema change cannot ship: `prisma migrate deploy` aborts with P3009 ('migrate found failed migrations in the target database') until the failed row is resolved. A fresh environment built from these migrations is untested and the add_phase1_fields migration will fail on a clean DB too if it duplicates earlier DDL.
- **Business impact:** Schema evolution is frozen for this environment without manual DBA intervention. Disaster recovery / new-environment provisioning from migrations is unverified and likely broken. High risk of data loss if someone 'fixes' it by running `migrate reset` (drops all tables).
- **Security impact:** Indirect: blocked migrations mean security-related schema fixes (e.g. adding ownership FKs/indexes) cannot be deployed cleanly.
- **Exact fix:** 1) Adopt ONE strategy. Recommended: migrations as source of truth. Run `prisma migrate resolve --rolled-back 20260504163331_add_phase1_fields` to clear the failed row, then `prisma migrate resolve --applied <name>` for every migration whose tables/columns already exist in the DB (baseline the existing schema — all 11 remaining). 2) Verify `prisma migrate status` reports 'Database schema is up to date'. 3) Add a `migrate deploy` step to the deploy/boot pipeline and remove reliance on db push. 4) Add CI that runs all migrations against a clean Postgres to prove they apply end-to-end.
- **Effort:** M (half-day: careful resolve sequence + CI guard; must verify each migration's DDL is consistent with current DB before marking applied)
- **Verify:** Run `npx prisma migrate status` against the live DB — currently it reports a failed migration (add_phase1_fields, error 42701) and 10 unapplied migrations. After fix it must report all 12 applied and 'up to date'. Then on a throwaway empty Postgres run `npx prisma migrate deploy` and confirm exit code 0 with all ~60 tables created.
- **Verification:** confirmed — CONFIRMED via live DB. _prisma_migrations shows only 2 rows: init (finished) and add_phase1_fields (finished_at NULL, rolled_back_at NULL, applied_steps_count 0). Logs show 'Database error code: 42701 ... column "audience" of relation "projects" already exists'. The audience/documentType/tone columns DO exist in the live projects table (information_schema), proving db push created them before the migration ran. `prisma migrate status` lists 10 unapplied migrations. Only adjustment: 12 migration directories exist on disk (the first pass said 13); fix-target counts updated accordingly. Severity P0 upheld.

## 5. High P1 Issues (45)
### P1#1 — [Dashboard] "Exports" stat card is a fake metric — always shows 0
- **File:** `/Users/shadi/Desktop/Pitchonix/frontend/app/dashboard/page.tsx` — DashboardPage (totalExports, line 311)
- **Problem:** The Exports stat card value is computed as projects.filter(p => p.status === 'exported').length (line 311, verified). No backend code path ever sets a project's status to 'exported': a grep of all status writes across backend/src returns only 'generating' and 'completed' writes (slide-export.service.ts:146, pdf-generation.service.ts:132, export.service.ts:867, generation.processor.ts:88, unified-pipeline.service.ts:477, generation.controller.ts:154/199/500). The only export-related counter, ProjectsService.incrementExport / project.exportCount (projects.service.ts:289-290), is dead code: grep confirms its sole occurrence is its own definition — zero callers anywhere in backend/src. Therefore the Exports card always displays 0 regardless of how many documents the user has actually exported.
- **Root cause:** Status-enum drift: the UI assumes a project lifecycle including an 'exported' status, but the actual lifecycle implemented is draft -> generating -> completed/failed. The real export counter (exportCount) is wired into the schema/analytics/email-digest (email-digest.service.ts:57,62 sums exportCount) but its increment method is never invoked by any export controller (slide-export, export, pdf-generation services all write status 'completed' but never call incrementExport).
- **User impact:** Users see Exports: 0 on their dashboard even after exporting many documents, making the platform look unused/broken and hiding real usage.
- **Business impact:** Misleading core engagement metric; undermines trust in all dashboard analytics; also means exportCount used by the weekly email digest (email-digest.service.ts:62) is always 0.
- **Exact fix:** Two parts. (1) Surface a real export number: wire ProjectsService.incrementExport(projectId) into every export endpoint (slide-export.service.ts, export.service.ts, pdf-generation.service.ts — all already create an export record with status 'completed' but never bump exportCount) so exportCount reflects reality, then change the dashboard to compute totalExports = projects.reduce((s,p)=>s+(p.exportCount??0),0). (2) Alternatively, if 'exported' project status is intended, set project.status='exported' in the export path. Until exportCount/status is actually written, relabel the card to a metric that exists or remove it rather than showing a hardcoded-zero metric as real.
- **Effort:** M
- **Verify:** Create a project, generate a deck, export it (PDF/PPTX). Refresh /dashboard. Confirm the Exports card increments. Before the fix it stays 0; grep backend for callers of incrementExport — there are none (verified: only the method definition at projects.service.ts:289 exists).
- **Verification:** confirmed — CONFIRMED. Read page.tsx:311 — totalExports = projects.filter(p => p.status === 'exported').length. Grep of backend/src status writes shows zero 'exported' writes (only 'generating'/'completed'). Grep of 'incrementExport' across backend/src returns only the definition at projects.service.ts:289, zero callers. STATUS_COLORS (page.tsx:99) lacks an 'exported' key, reinforcing the drift. Card is permanently 0.

### P1#2 — [Dashboard] Status filter chips 'Generated' and 'Exported' always return empty results
- **File:** `/Users/shadi/Desktop/Pitchonix/frontend/app/dashboard/page.tsx` — status filter chips array (lines 572-589) + fetchProjects status param (line 175)
- **Problem:** The filter chips (lines 572-589) define ids 'generated' and 'exported'; clicking sets statusFilter, and at line 175 the code does `if (statusFilter !== 'all') params.append('status', statusFilter)` — sending status='generated' or status='exported' verbatim to GET /projects?status=. ProjectsService.findAll applies where.status = query.status (projects.service.ts:46-48, verified). But no project ever has status 'generated' or 'exported' — the only values produced are 'draft', 'generating', 'completed', 'failed' (confirmed via grep of all backend status writes). So clicking Generated or Exported always yields an empty list and the 'No projects found' empty state, even when the user has completed projects. The 'All' and 'Draft' chips work because those values exist.
- **Root cause:** Same status-enum drift between the frontend's assumed status vocabulary and the backend's actual status writes. STATUS_COLORS (page.tsx:99-103) confirms the mismatch: it maps 'completed' but neither 'generated' nor 'exported'.
- **User impact:** Two of the four filter chips appear broken — they hide all the user's real (completed) projects. Users cannot filter to their finished work.
- **Business impact:** Core list-filtering feature is non-functional for the most common state (completed), making the product feel broken.
- **Exact fix:** Align the chip values to the real status enum. Change the 'Generated' chip id from 'generated' to 'completed' (and its label to 'Completed'), and either remove the 'Exported' chip or map it to a real filter (e.g. exportCount>0, which requires a new backend filter param since where.status won't match). Optionally add 'generating'/'failed' chips. STATUS_COLORS already supports 'completed'.
- **Effort:** S
- **Verify:** With at least one completed project, click the 'Generated' chip on /dashboard. It returns nothing today (sends status=generated, no match). After changing the id to 'completed', the completed project appears. Click 'Exported' — empty today.
- **Verification:** confirmed — CONFIRMED. Read page.tsx:571-589 (chip ids 'generated'/'exported') and page.tsx:175 (params.append('status', statusFilter) sends id verbatim). Backend projects.service.ts:46-48 matches where.status = query.status exactly. Grep of all backend status writes produces only draft/generating/completed/failed — never 'generated' or 'exported'. Both chips are guaranteed empty.

### P1#3 — [Create New] Dashboard hero + Quick Create PDF cards funnel users into the broken PDF dead-end
- **File:** `/Users/shadi/Desktop/Pitchonix/frontend/app/dashboard/page.tsx` — handleCreateProject (line 274) + Quick Create array (lines 462-494) and hero 'Create Business Plan' (lines 387-393)
- **Problem:** handleCreateProject (line 274) creates a project via POST /projects and routes to /create?project=<id> (line 282). For PDF document types this is correct up to the wizard, but the wizard's finish step (see P0) dead-ends. The hero 'Create Business Plan' button (line 388, business_plan) and 6 of 8 Quick Create cards (business_plan, proposal, case_study, company_profile, one_pager, marketing_plan — verified lines 464-470) are PDF types and therefore all terminate in the empty project page.
- **Root cause:** Same root cause as the P0 — the dashboard cards/buttons are wired correctly (they just call handleCreateProject with a documentType and route into the wizard); they inherit the wizard's broken post-generation routing in create/page.tsx.
- **User impact:** The most prominent creation buttons on the dashboard appear functional through the wizard but produce no visible output, making the product feel broken on first use.
- **Business impact:** First-run experience for new users who click the highlighted CTAs is a dead-end, hurting activation/conversion.
- **Exact fix:** No change needed to these buttons once the P0 routing fix lands; they will work automatically. Add a regression test that walks each Quick Create card through to a visible artifact.
- **Effort:** S (covered by P0 fix)
- **Verify:** Click each of the 8 Quick Create cards and the 2 hero buttons; complete the wizard; confirm each lands on a page that displays the generated artifact (deck viewer for presentations, PDF editor for PDF types).
- **Verification:** confirmed — Confirmed. dashboard/page.tsx:274-282 handleCreateProject POSTs /projects and routes to /create?project=<id>. Hero 'Create Business Plan' (line 388) and Quick Create cards at lines 464-470 (business_plan, proposal, case_study, company_profile, one_pager, marketing_plan) are all PDF-format types per Step1DocumentType (lines 122-267 all format:'pdf'). They funnel into the P0 dead-end. The dashboard code itself is correct; this is a downstream consequence of P0. Severity P1 upheld.

### P1#4 — [Projects] Workspace scoping is cosmetic — list is not filtered by active workspace
- **File:** `/Users/shadi/Desktop/Pitchonix/backend/src/projects/projects.service.ts` — findAll (lines 29-86) + WorkspaceSwitcher usage
- **Problem:** The list pages render a WorkspaceSwitcher implying projects are scoped to the active workspace, but no workspace id is sent in any request (WorkspaceSwitcher only calls setCurrentWorkspaceId local state; api.ts's request interceptor adds only the Authorization header; the controller passes only user.id + QueryProjectsDto) and findAll uses where:{ userId, archivedAt:null } with no workspaceId predicate. Switching workspace changes nothing; all of a user's projects across every workspace always show.
- **Root cause:** findAll filters by userId only; the frontend never transmits the active workspace, and the backend has no workspace-membership-based access path for listing.
- **User impact:** Workspace switching has no effect on the project list; users in multiple workspaces see a single undifferentiated pool and cannot isolate workspace content.
- **Business impact:** Workspace/team isolation guarantees are not met; in a shared-account or future workspace-member scenario this risks cross-context data exposure expectations.
- **Security impact:** Listing is by owner userId so there is no cross-user leak today, but the workspace model (workspace members inheriting access via sharingMode) is unimplemented for listing — workspace-shared projects of OTHER members are not listed at all, and the access model advertised in schema comments (schema.prisma:1295-1297) is not enforced here.
- **Exact fix:** Either (a) drop the WorkspaceSwitcher from the projects/dashboard list if scoping is intentionally per-user, or (b) accept an active workspaceId (header X-Workspace-Id or query param), add it to findAll's where, and implement workspace-member visibility per sharingMode.
- **Effort:** 0.5 day for filtering; 2-3 days for full workspace-member visibility model
- **Verify:** As a user with projects in two workspaces, switch workspaces and confirm the list changes accordingly; as a workspace member (not owner) confirm workspace-shared projects appear.
- **Verification:** confirmed — Confirmed. WorkspaceSwitcher.tsx:87 calls setCurrentWorkspaceId (local context only). api.ts request interceptor (lines 19-29) adds only Authorization. projects.controller.ts:40-41 findAll passes only user.id and query. projects.service.ts:30 where = { userId, archivedAt: null } — no workspaceId. sharingMode field exists (schema.prisma:119) with access-model comments at 1295-1297 but is unenforced in listing. Security framing accurate: per-owner so no cross-user leak, but workspace-shared peers never appear.

### P1#5 — [Projects] Duplicate drops pdfDocuments, logoUrl and imageUrls — broken copies for PDF projects, lost branding for all
- **File:** `/Users/shadi/Desktop/Pitchonix/backend/src/projects/projects.service.ts` — duplicate (lines 143-199)
- **Problem:** duplicate() copies project scalar fields + decks + slides, but never copies the pdfDocuments relation, nor the logoUrl/imageUrls media fields, nor documentFormat. For a documentFormat='pdf' project (which has no decks, only a PdfDocument), the duplicate is an empty Project shell with no document content — and because documentFormat is not copied it defaults back to 'slides' (schema.prisma:83). For presentation projects, the company logo and image URLs are lost in the copy.
- **Root cause:** Duplicate logic was written only for the deck/slide shape and predates PDF projects and media fields being added to the Project model. The create() at lines 147-160 enumerates scalars explicitly and omits logoUrl/imageUrls/documentFormat.
- **User impact:** Duplicating a PDF project yields an empty, unusable project (also mislabeled as a slides project); duplicating any project loses logo/images that must be re-uploaded.
- **Business impact:** 'Duplicate' is advertised as a safe copy but produces data-incomplete artifacts, eroding trust in the feature.
- **Exact fix:** In duplicate(): also copy logoUrl, imageUrls, documentFormat onto the new project; and when originalProject.documentFormat==='pdf' (or pdfDocuments exist) deep-copy each PdfDocument (and its pages/outline) into the new projectId. Include pdfDocuments in findOne's include or query them explicitly inside duplicate.
- **Effort:** 0.5 day
- **Verify:** Duplicate a PDF Studio project, confirm the copy contains a full PdfDocument with pages and documentFormat='pdf'; duplicate a presentation with a logo, confirm logoUrl/imageUrls carry over.
- **Verification:** confirmed — Confirmed. projects.service.ts:147-160 create() copies name/description/documentType/industry/status/businessInfo/audience/tone/workspaceId only — omits logoUrl, imageUrls, documentFormat (all present on Project: schema.prisma:83,91,92). Lines 163-196 deep-copy decks/slides but never touch pdfDocuments (relation at schema.prisma:122); findOne's include (lines 91-113) doesn't load pdfDocuments either. Added note: omitting documentFormat means the PDF copy reverts to the 'slides' default.

### P1#6 — [Presentations] Template switch silently destroys all user edits by regenerating the deck from wizard input
- **File:** `backend/src/generation/pipeline/unified-pipeline.service.ts` — stageMigration / stageGeneratorExecution (TEMPLATE_SWITCH path)
- **Problem:** TEMPLATE_SWITCH is mapped to the FULL pipeline (types.ts line 99: TEMPLATE_SWITCH: PIPELINE_STAGES.slice()). stageGeneratorExecution (line 305) calls this.slideFactory.generateDeck(ctx.wizardInput!) to build brand-new slides from the original wizard input, and stageMigration runs `await this.prisma.slide.deleteMany({ where: { deckId: ctx.deckId } })` (line 442) then recreates them via createMany + migrateOne. Any edits the user made in the editor — moved/resized elements, edited text, inserted shapes/images, applied layouts — are wiped. The frontend applyTemplate.ts header comment claims 'Non-destructive: bullets, charts, images, numbers stay where the user put them', but the function body (line 50) merely POSTs to /generate/template-switch/{projectId} and re-fetches slides — the per-element deriveElementStyle restyle the comment describes does not exist in the code at all. TemplateGallery.handleApply (lines 62-81) calls applyTemplate with no confirmation dialog, and the UI shows 'Applied to ${progress.done} slides' (line 212).
- **Root cause:** Template switching reuses the from-scratch generation pipeline (delete + regenerate) instead of a non-destructive restyle that maps the new family's theme/layout onto existing persisted elements. The wizardInput is treated as the source of truth, so live editor state is ignored. The frontend applyTemplate's documented non-destructive intent was never implemented — the file only forwards to the destructive backend command.
- **User impact:** A user who spends time editing a deck and then tries a different template loses every edit instantly with no confirmation. The work is only recoverable via Version History (a TEMPLATE_CHANGED snapshot is taken before — shouldSnapshotBefore returns true for TEMPLATE_SWITCH, unified-pipeline lines 491-492), but the user is not told that, so most will perceive it as data loss.
- **Business impact:** Destroys trust in the editor as a real authoring tool; a single accidental template click can erase hours of work. Strong churn/refund driver for a paid product.
- **Exact fix:** Either (a) add a blocking confirmation in TemplateGallery.handleApply ('Switching templates rebuilds the deck and will discard manual edits — continue? A version snapshot will be saved first.'), OR preferably (b) implement a true non-destructive restyle that keeps existing SlideElement rows and applies only family themeTokens/background + family typography + optional slot re-layout. Also fix the false 'Non-destructive' comment in applyTemplate.ts (the described deriveElementStyle restyle is not implemented) and change progress copy from 'Applied' to 'Rebuilt'.
- **Effort:** medium (1-2 days for confirmation + accurate copy; 1-2 weeks for true non-destructive restyle)
- **Verify:** Open a deck, drag an element to a new position and edit its text, note the change. Open Templates, pick a different template, click Apply to deck. Reopen the slide: the moved element and edited text are gone and the slide has been regenerated from the original wizard content. Confirm a TEMPLATE_CHANGED version snapshot exists in Version History.
- **Verification:** confirmed — CONFIRMED against code. types.ts:99 maps TEMPLATE_SWITCH to full PIPELINE_STAGES.slice(). unified-pipeline.service.ts line 442 does prisma.slide.deleteMany() and line 305 regenerates from ctx.wizardInput. shouldSnapshotBefore (lines 490-493) returns true for TEMPLATE_SWITCH so a TEMPLATE_CHANGED snapshot is saved first (postSnapshotType line 507). Frontend applyTemplate.ts line 50 only POSTs to the destructive endpoint; its 'Non-destructive' header comment (lines 17-18) and the deriveElementStyle restyle it describes are NOT implemented. TemplateGallery.handleApply (lines 62-81) has no confirmation and shows 'Applied to N slides' (line 212). Severity P1 upheld.

### P1#7 — [PDF Studio] Live preview and exported PDF use different pagination logic (no WYSIWYG parity, can hide short content)
- **File:** `backend/src/pdf-studio/services/preview.service.ts` — PreviewService.generateStructuredPages
- **Problem:** Preview bins content pages into ~420-word buckets (TARGET_WORDS=420, line 400), merges multiple DB pages onto one A4 sheet (the content-bucket loop at lines 533-552 concatenates all bucket pages into one .a4-page), and skips any page with wordCount < 40 (MIN_WORDS=40) that has no chart/image (line 435: `if (wordCount < MIN_WORDS && !hasVisual) continue`). The PDF export service (pdf-export.service.ts generateStructuredPages, lines 353-458) does NOT bucket/merge/skip — it renders one DB page per page-break. The preview a user reviews therefore differs from the exported PDF in page count, layout (single vs two-column for editorial), and content (short pages visible in PDF are invisible in preview).
- **Root cause:** Two independently-maintained structured-page renderers with divergent layout algorithms. preview.service intentionally rebalances/merges pages for on-screen density (TARGET_WORDS bucketing + MIN_WORDS skip); pdf-export.service renders pages verbatim with a page-break between each. Confirmed by direct read: preview has the bucket/skip logic, export has none.
- **User impact:** Users approve a preview that does not match the downloaded PDF. Short real sections (e.g. a 20-30 word conclusion) are dropped from the preview but appear in the PDF, and a doc that looks like 6 pages on screen can export as 12.
- **Business impact:** Erodes trust in the core 'what you see is what you get' promise; support load from 'my PDF looks different from preview' complaints.
- **Exact fix:** Unify pagination: extract a single shared composeDisplayPages(pages, opts) helper used by BOTH preview.service and pdf-export.service so bucketing/merging/skipping rules are identical, OR remove bucketing from preview so it renders 1 DB page = 1 sheet like export. Ensure the <40-word skip and 420-word merge either apply to both or neither.
- **Effort:** M (1-2 days; shared module + regression tests on multi-page docs)
- **Verify:** Generate a document whose plan includes a real <40-word page and several mid-length pages. Render the preview HTML and the exported PDF. Compare A4 page count and confirm the short page's text appears in both. They currently differ.
- **Verification:** confirmed — Confirmed in source. preview.service.ts lines 400-401 define TARGET_WORDS=420/MIN_WORDS=40; line 435 skips sub-40-word pages with no visual; lines 415-450 bucket/merge multiple DB pages; lines 533-552 concatenate a bucket's pages into one .a4-page. pdf-export.service.ts lines 360-455 iterate pages 1:1 inserting a <div class='page-break'> between each — no bucketing, skipping, or merging. The two algorithms are demonstrably divergent.

### P1#8 — [PDF Studio] Brand Kit is metadata-only: selecting a kit does not change preview, PDF, or DOCX output
- **File:** `backend/src/pdf-studio/services/pdf-export.service.ts` — PdfExportService.exportDocument / PreviewService.generatePreviewHTML
- **Problem:** brandKitId is saved on pdfDocument (smart-builder generate persists config.brandKitId at line 506) and a BrandKitBadge renders in the UI, but no renderer applies it. A grep for brandKit/BrandKit across pdf-export.service.ts, preview.service.ts, and docx-export.service.ts returns ZERO matches. BrandKitService.applyBrandKitToStyle exists and is registered in pdf-studio.module.ts but is never injected into or called by any export/preview service. Style resolution in both renderers consumes only templateConfig.style + colorScheme (preview.service lines 120-125).
- **Root cause:** Brand-kit application layer was built (service + UI picker) but never wired into the actual style-resolution path of the renderers; rendering only consumes templateType + colorScheme.
- **User impact:** A user picks their company brand kit (logo, colors, fonts) and the generated PDF/preview ignore it entirely — output is identical to no kit selected.
- **Business impact:** Brand Kit is a headline differentiator/up-sell; shipping it as a no-op is a fake premium feature and a refund/churn risk.
- **Exact fix:** Inject BrandKitService into PdfExportService and PreviewService. When document.brandKitId is set, load the kit and run style = BrandKitService.applyBrandKitToStyle(templateConfig.style, kit) before generateHTML/generatePreviewHTML, and inject the kit logo into the cover/header layout renderers.
- **Effort:** M (1-2 days incl. DOCX color/font mapping and logo placement)
- **Verify:** Create a brand kit with a non-default primary color (e.g. #FF0000) and logo. Generate a doc with that brandKitId. Export PDF and open preview — confirm headers/accents use #FF0000 and the logo appears. Currently output is unchanged.
- **Verification:** confirmed — Confirmed: grep for brandKit/BrandKit in pdf-export.service.ts, preview.service.ts, and docx-export.service.ts returned no matches. preview.service builds style purely from templateConfig.style + optional colorScheme (lines 120-125). brandKitId is persisted at generate time but never consumed by any renderer.

### P1#9 — [PDF Studio] Duplicate route registration for document versions: insecure no-op controller shadows the secure one (fragile routing; secure handler currently wins)
- **File:** `backend/src/document-versions/document-versions.controller.ts` — DocumentVersionsController (route pdf-documents/:documentId/versions)
- **Problem:** DocumentVersionsController registers GET/POST pdf-documents/:documentId/versions and POST .../:versionId/restore with NO ownership check, and its restoreVersion (document-versions.service.ts lines 34-41) only sets pdfDocument.updatedAt and returns version.pagesSnapshot — it never writes pages back to the DB. PdfDocumentsController registers the EXACT SAME paths (pdf-documents/:id/versions, lines 167-236) WITH assertDocumentAccess ownership checks and a REAL restore that updateMany's each page (lines 228-233). Both modules are registered in app.module.ts. NestJS/Express treats :documentId and :id as the same route pattern, so this is a genuine duplicate registration.
- **Root cause:** Two parallel implementations of versioning bound to the same NestJS route pattern; the duplicate was never removed. NOTE (adjustment): PdfDocumentsModule is registered BEFORE DocumentVersionsModule in app.module.ts (line 123 vs line 135). Under NestJS/Express first-registered-wins route resolution, the SECURE PdfDocumentsController handler currently serves these requests, so the DocumentVersionsController is effectively dead/shadowed code rather than the live IDOR vector. The risk is (a) insecure no-op code sitting in the codebase and (b) the routing being order-dependent and fragile — a future module reorder or refactor could silently flip to the insecure handler.
- **User impact:** Currently the secure handler wins, so legitimate restore works and there is no live cross-tenant read. The latent risk: if DocumentVersionsController ever wins (registration reorder), (a) any authenticated user could list/restore another user's version snapshots by guessing documentId (IDOR), and (b) server-side restore would become a no-op.
- **Business impact:** Carries a dormant cross-tenant data-leakage + fake-restore risk that can activate on an unrelated refactor; also confusing dead code.
- **Security impact:** Latent IDOR: the duplicate controller has no userId scoping in listVersions/createSnapshot/restoreVersion. Not currently exploitable because the secure controller wins the route, but one ordering change away from being live.
- **Exact fix:** Delete DocumentVersionsModule/Controller/Service (the insecure no-op copy) and route the frontend exclusively to PdfDocumentsController's ownership-checked, real-restore endpoints. If keeping it, add assertDocumentAccess to all three handlers and make restoreVersion actually write pages via updateMany.
- **Effort:** S (0.5 day: remove duplicate module + confirm frontend hits the secure routes)
- **Verify:** As user A create a doc + version. As user B call GET /pdf-documents/{A_docId}/versions and POST .../restore. With current module order this should 403 (secure controller wins). Reorder the modules (DocumentVersionsModule first) and the request would return A's snapshot — proving the routing fragility.
- **Verification:** adjusted — Adjusted from 'insecure one can shadow the secure one' to reflect actual routing. Both controllers DO register identical paths (DocumentVersionsController @Controller('pdf-documents/:documentId/versions') + @Get()/@Post()/@Post(':versionId/restore'); PdfDocumentsController @Controller('pdf-documents') + @Get(':id/versions') etc — identical patterns). DocumentVersionsController has NO ownership check and its restoreVersion is a confirmed no-op (only updatedAt bump + echo, document-versions.service.ts lines 34-41). PdfDocumentsController has assertDocumentAccess + real updateMany restore (lines 217-235). BUT app.module.ts registers PdfDocumentsModule (line 123) before DocumentVersionsModule (line 135), so the secure handler currently wins — the IDOR is latent/dormant, not active. Severity kept at P1 for the insecure dead code + order-dependent fragility, but exploitability lowered.

### P1#10 — [PDF Studio] IDOR write on smart-builder enhance and regenerate-section (no ownership check)
- **File:** `backend/src/pdf-studio/controllers/smart-builder.controller.ts` — SmartBuilderController.enhanceDocument / regenerateSection
- **Problem:** POST /pdf-studio/smart-builder/enhance (enhanceDocument, line 696) accepts @Body('documentId') and @Body('targetId'), loads the document/page and overwrites pdfPage.content.text (lines 742-750 and the full-document branch), but takes NO @GetUser and never calls assertDocumentAccess. POST /pdf-studio/smart-builder/regenerate-section (regenerateSection, line 812) loads a page by @Body('sectionId') and overwrites its content.text (lines 855-863) with no ownership check whatsoever. Both are behind JwtAuthGuard (any logged-in user) but not scoped to the owner. The sibling endpoints addPage/deletePage/duplicatePage in the same controller DO enforce ownership (assertDocumentAccess / project.userId checks at lines 1053, 1095, 1118), confirming this is an inconsistent oversight.
- **Root cause:** Ownership enforcement (added in Phase 43 per memory) was applied to the CRUD endpoints (addPage/deletePage/duplicatePage/getDocument) but missed the enhance/regenerate mutation endpoints. assertDocumentAccess exists in the same controller (line 61) and is simply not invoked here.
- **User impact:** None for legitimate users, but any authenticated attacker can overwrite/garble the page content of any document by iterating pageIds/documentIds.
- **Business impact:** Data integrity/tampering across tenants; a malicious or buggy client can corrupt other users' documents.
- **Security impact:** IDOR write: unauthorized modification of arbitrary documents' page content. Confirmed live (these handlers are the only ones registered for these paths).
- **Exact fix:** Add @GetUser() user and call await this.assertDocumentAccess(documentId, user) at the top of enhanceDocument; for regenerateSection, load the page, derive its documentId (or require documentId in the body and assert page.documentId === documentId), and assert ownership before enhancing/updating.
- **Effort:** S (1-2 hours)
- **Verify:** As user B, POST /pdf-studio/smart-builder/enhance with user A's documentId and a valid enhancementType. Currently returns 200 and mutates A's pages; after fix it should return 403/404.
- **Verification:** confirmed — Confirmed by direct read. enhanceDocument (lines 696-806) signature is (@Body('documentId'), @Body('enhancementType'), @Body('targetId')) — no @GetUser, no assertDocumentAccess; it mutates pdfPage content at lines 742-750. regenerateSection (lines 812-880) signature is (@Body('documentId'), @Body('sectionId')) — no @GetUser, mutates page content at lines 855-863. Contrast addPage (line 1053) / deletePage (lines 1095) / duplicatePage (line 1118) which all enforce ownership.

### P1#11 — [Career Docs] ATS 'Apply Fix' / 'Apply All Fixes' is entirely fake (frontend navigates away, backend returns hardcoded success)
- **File:** `/Users/shadi/Desktop/Pitchonix/frontend/app/career/ats/page.tsx` — RecommendationSection 'Apply Fix' button + action-bar 'Apply All Fixes' + JobMatchView 'Add'; backend CareerController.applyATSFix
- **Problem:** On /career/ats, every 'Apply Fix' button (RecommendationSection, line 791-798), the gap 'Add' buttons (JobMatchView, line 680-686), and the 'Apply All Fixes' action-bar button (line 451-458) do not apply any fix. The per-rec and gap buttons call onOpenBuilder() which is openSelectedDocument (line 153-154): a plain router.push to /career/builder/{id}; 'Apply All Fixes' merely setActiveTab('fixes'). The page never calls /career/ats/apply-fix (it only POSTs to /ats/analyze and /ats/match-job). The backend endpoint POST /career/ats/apply-fix (career.controller.ts:819-837) validates documentId/recommendationId and loads the doc and profile, but then returns a hardcoded { success: true, message: 'Fix applied successfully' } with the literal comment 'For now, return success' — it never reads recommendationId to mutate or persist the profile.
- **Root cause:** Feature was scaffolded (UI + endpoint signature + input validation + doc/profile load) but the mutation logic was never implemented; the frontend buttons were wired to a navigation stub (openSelectedDocument) and never call the (non-functional) endpoint at all.
- **User impact:** Users believe they are one-click-fixing ATS issues; nothing changes. They click 'Apply Fix', get sent to the builder with no change applied, and their ATS score never improves from these actions. This is a core advertised value prop of the ATS Optimization Center.
- **Business impact:** The headline 'one-click ATS fixes' feature is non-functional, undermining trust in the paid Career product and inviting churn/refunds once users notice fixes do nothing.
- **Exact fix:** Either (a) implement CareerController.applyATSFix to look up the recommendation by recommendationId, mutate the relevant profile section (add-skill/add-keyword/improve-bullet/add-section) via CvProfilesService, persist, and return the updated profile; then change openSelectedDocument-wired buttons to call api.post('/career/ats/apply-fix', {documentId, recommendationId}) and refresh the analysis; OR (b) if out of scope, relabel the buttons to 'Open in Builder' and remove 'Apply All Fixes' so the UI does not claim a capability it lacks. Note the backend already validates inputs and loads doc+profile, so only the recommendation-to-mutation mapping + persistence is missing.
- **Effort:** medium
- **Verify:** Open /career/ats, select a document, analyze, go to Quick Fixes, click 'Apply Fix'. Confirm (current) it merely router.pushes to /career/builder/{id} and the profile/score is unchanged. After fix: confirm the targeted profile field is actually changed and re-running analysis reflects it.
- **Verification:** confirmed — VERIFIED in code. Frontend: openSelectedDocument (ats/page.tsx:153-154) = router.push to builder only; 'Apply Fix' onClick={onOpenBuilder} (line 793); gap 'Add' onClick={onOpenBuilder} (line 682); 'Apply All Fixes' onClick={() => setActiveTab('fixes')} (line 453). grep confirms the page only POSTs to /ats/analyze and /ats/match-job, never /ats/apply-fix. Backend (career.controller.ts:819-837): applyATSFix validates inputs, loads doc and profile, then 'For now, return success' and returns hardcoded {success:true, message:'Fix applied successfully'} with zero mutation/persistence. Every claim in the finding is accurate; severity P1 appropriate for a non-functional advertised core feature.

### P1#12 — [Excel Studio] Free SheetJS build silently drops ALL cell styling in every XLSX export
- **File:** `backend/src/excel-studio/excel-studio.service.ts` — buildEnhancedWorkbook / appendStyledSheet / mergeCellStyles / TEMPLATE_PALETTE
- **Problem:** The backend depends on the free npm `xlsx@0.18.5` (SheetJS Community). The Community build does NOT serialize cell styles (`s`) when writing XLSX — only SheetJS Pro does. Verified at runtime: a cell written with fill+font round-trips to `{patternType:'none'}` with no fill/font/numFmt. Therefore every styling path — the 12-template palette, appendStyledSheet header/title/label styles (lines 1416/1422/1429), mergeCellStyles (line 767), formatCell/formatRange operations, standardizeHeaders/modernizeWorkbook/protectSource enhancement actions — produces ZERO visible styling in the exported workbook. Every export branch calls XLSX.write(..., {cellStyles:true}) but cellStyles:true only affects READ, not WRITE in the Community build. The whole 'modernize / executive-ready formatting' value proposition is non-functional at the file level; only the in-app HTML preview shows styling.
- **Root cause:** Community SheetJS write() ignores cell.s; `cellStyles:true` only affects READ, not write. Number formats written into cell.s.numFmt are also dropped (only cell.z survives). Confirmed by reading package.json (name='xlsx', version 0.18.5) and a runtime round-trip test.
- **User impact:** User picks a premium template, clicks Enhance/Export, opens the downloaded .xlsx in Excel and sees a plain, unformatted workbook.
- **Business impact:** The product's central selling point (modernizing/styling workbooks into board-ready packs) does not actually ship in the deliverable file. High refund/credibility risk for a paid feature.
- **Exact fix:** Either (a) switch to a writer that serializes styles — e.g. exceljs (full style write support) and port appendStyledSheet/formatRange to its API, or (b) license SheetJS Pro and use its styled writer, or (c) for appended Pitchonix sheets, emit styled worksheet XML directly with a shared styles.xml (buildWorksheetXml already bypasses SheetJS for generated sheets — extend it to write <cellXfs> style indexes). At minimum, stop advertising styling that the exporter cannot produce.
- **Effort:** high
- **Verify:** Apply 'standardizeHeaders' to an uploaded workbook, export enhanced-xlsx, re-read with cellStyles:true (or open in Excel): assert the A1 header cell has a non-empty fill (currently patternType:'none'). Run the one-liner node check on xlsx@0.18.5 showing style loss.
- **Verification:** confirmed — CONFIRMED at runtime against the installed dependency. package.json: name='xlsx', version 0.18.5 (Community). Ran node round-trip: ws.A1.s = {fill:{fgColor:{rgb:'FF0000'},patternType:'solid'},font:{bold:true}} written via XLSX.write({cellStyles:true}) then re-read yields exactly {"patternType":"none"} — fill/font fully dropped. Service writes styles via cell.s in appendStyledSheet (1416/1422/1429) and mergeCellStyles (767); all 8 XLSX.write call sites use the Community writer. Finding is real as stated.

### P1#13 — [Excel Studio] Insert/delete row or column shifts cells but does NOT rewrite formula references — corrupts model math
- **File:** `backend/src/excel-studio/excel-studio.service.ts` — applyInsertRowsOrColumns
- **Problem:** On insertRow/deleteRow/insertColumn/deleteColumn the engine relocates each cell object to its new address but leaves its formula string untouched. applyInsertRowsOrColumns (lines 791-842) computes a new row/col index (line 808: `if (newR >= index) newR += count`) and at line 822 reassigns the ENTIRE original cell object to the new key — it never parses or offsets cell.f. Verified at runtime: with B3=`A2+A3`, inserting a row at index 1 moves the formula cell to B4 but its text stays literally `A2+A3` while the operands (10,20) shifted down to A3/A4 — so the formula now sums the wrong cells (header + first value). A grep confirms there is NO formula-reference offset pass anywhere in the file. Any formula referencing rows/cols at or below an insertion/deletion point becomes silently wrong.
- **Root cause:** applyInsertRowsOrColumns only re-keys cell positions (line 822 copies sheet[key] verbatim to the shifted address); it never parses/offsets cell references inside cell.f. The only cell.f touches in the whole service are set (737), read for output (938/1254), and count/inspect (2080/2090) — no rewrite.
- **User impact:** Inserting or deleting a row/column in a financial model silently breaks the totals and downstream formulas, producing wrong numbers with no warning.
- **Business impact:** Directly contradicts the audited claim 'formulas survive row/col shifts' and the product's 'source calculations preserved' promise. A wrong board number sourced from this tool is a serious trust/liability problem.
- **Exact fix:** When shifting rows/columns, parse each surviving formula and offset every relative cell/range reference that lies at/after the insertion (or within/after the deletion) index by ±count using a reference-rewriting pass (e.g. XLSX.utils.decode_cell on tokens, or a small A1 reference regex that respects absolute $ anchors and sheet-qualified refs). Apply the offset before line 822 reassigns the cell. Add a unit test covering a formula referencing a shifted row.
- **Effort:** high
- **Verify:** Upload/seed a sheet with values 10,20 in A2,A3 and formula =A2+A3 in B3. Apply insertRow at index 1. Export enhanced-xlsx, read B4.f and assert it equals 'A3+A4' (currently 'A2+A3').
- **Verification:** confirmed — CONFIRMED at runtime. Read applyInsertRowsOrColumns (lines 791-842): it builds newSheet by re-keying decoded positions and at line 822 does newSheet[encode_cell({r:newR,c:newC})] = sheet[key], copying the full cell object including cell.f unchanged. Simulated the exact shift on B3={f:'A2+A3'} with insert at index 1: result B4.f === 'A2+A3' while operands moved to A3=10, A4=20. grep confirms no offset/rewrite of cell.f exists anywhere in the service. Finding is real as stated.

### P1#14 — [Brand Kits] Excel Studio has no brand-kit integration despite 'applied everywhere you create' promise
- **File:** `frontend/app/brand-kits/page.tsx` — BrandKitsPage header copy / EmptyState (lines 52, 227)
- **Problem:** The page advertises brand kits 'applied everywhere you create' (line 52) and 'applies them to every deck, PDF and CV in your workspace' (line 227). grep for brandKit/brand-kit across backend/src/excel-studio, frontend/app/excel-studio, frontend/features/excel-studio returns nothing — Excel Studio never reads a brand kit. Colors/fonts/logo are not injected into spreadsheet generation or export.
- **Root cause:** Excel Studio was added (untracked dirs in git status) without wiring the brand-kit resolution path that Career/PDF use.
- **User impact:** Users expect their brand to flow into Excel outputs and it silently doesn't.
- **Business impact:** Overstated capability; inconsistent branding across the suite.
- **Exact fix:** Short term: scope the marketing copy to surfaces that actually support brand kits (decks via generation, PDF, CV) — note line 227 already names only 'deck, PDF and CV' (not Excel), so the broader line 52 'everywhere you create' is the main overclaim. Long term: add brandKitId resolution to the Excel generation/export path mirroring career.resolveBrandTokens / pdf-studio getBrandKit.
- **Effort:** Copy fix: 30 min. Real Excel integration: 2-3 days.
- **Verify:** Generate an Excel doc with a brand kit selected (if such a selector even exists) and inspect the output for brand colors/fonts. Confirm no brand-kit code path is reachable from Excel Studio.
- **Verification:** confirmed — CONFIRMED. grep for brandkit/brand-kit/'brand kit' across backend/src/excel-studio, frontend/app/excel-studio, frontend/features/excel-studio returned zero matches. Marketing copy verified: page.tsx:52 'applied everywhere you create' and page.tsx:227 'applies them to every deck, PDF and CV in your workspace'. Note line 227 specifically lists deck/PDF/CV and omits Excel, so the strongest overclaim is line 52's generic 'everywhere'. P1 severity appropriate (copy/integration gap, not a data-loss bug).

### P1#15 — [Brand Kits] 'Default' brand kit is metadata-only: no way to set it and nothing auto-applies it
- **File:** `frontend/app/brand-kits/[id]/page.tsx` — header Default badge (lines 66-71)
- **Problem:** isDefault is persisted with a one-per-workspace invariant (and the PATCH /brand-kits/:id update endpoint DOES accept isDefault, lines 206-217), but (1) there is NO UI control to set a kit as default — the only frontend reference is a read-only badge whose tooltip says 'Default only marks this kit as preferred. It will NOT be applied automatically' (page.tsx:69), and (2) nothing consumes isDefault to auto-apply a kit; generation/career/pdf all require an explicit brandKitId. The export-template.service isDefault refs are for export templates, not brand kits.
- **Root cause:** Default-kit selection logic was never built into generation/document-creation flows, and no toggle UI exists; the backend update path supports it but is unreachable from the dashboard.
- **User impact:** Users assume marking a kit default will brand new documents automatically; it does nothing and there is no way to even mark one default in the UI.
- **Business impact:** Misleading feature; undermines trust in brand governance.
- **Exact fix:** Add a 'Set as default' toggle in the dashboard that calls the existing PATCH /brand-kits/:id with { isDefault: true } (backend already handles the one-per-workspace transaction at lines 206-211, so no backend change needed for the toggle). Then, in document/deck creation flows (create wizard, career new doc, pdf new doc), default brandKitId to the workspace's isDefault kit when none is chosen. Until then, remove/soften the Default badge tooltip.
- **Effort:** 1 day
- **Verify:** Mark a kit default, create a new deck/CV without explicitly choosing a kit, and confirm the default kit's colors appear. Currently impossible (no toggle in UI) and would not auto-apply even if set via API.
- **Verification:** confirmed — CONFIRMED. Only isDefault UI in frontend source is the read-only badge at page.tsx:66-71 with tooltip (line 69) literally stating 'It will NOT be applied automatically.' grep for set-default/setDefault/make-default in app/components/features found no toggle. No generation/career/pdf code consumes brand-kit isDefault to auto-apply (export-template.service isDefault hits are unrelated export templates). Minor refinement: the backend update() already accepts isDefault with invariant handling, so the toggle is a pure-frontend add — fix updated to reflect this.

### P1#16 — [Convert] No conversion is ever recorded — History, Lineage, and Restore are non-functional
- **File:** `backend/src/universal-conversion/universal-conversion.controller.ts` — convert / startBatch
- **Problem:** Neither POST /convert (controller lines 84-115) nor POST /convert/batch (service runBatch lines 227-253) calls lineage.record(). A repo-wide grep shows the only caller of record() is ConversionLineageService.restore() (conversion-lineage.service.ts line 159). Consequently the ConvertedFile table is never populated by ordinary use. GET /convert/history always returns []; Lineage panels show nothing; Restore cannot locate a chain root.
- **Root cause:** The persistence layer (ConversionLineageService.record) was built and wired as a provider but never invoked from the conversion endpoints.
- **User impact:** Three advertised workspace tabs (History, Lineage, Restore) are dead — they render empty states or error, giving the impression of features that do nothing.
- **Business impact:** Advertised audit/lineage/restore functionality is fake; misrepresents product capability.
- **Exact fix:** After a successful svc.convert() in the controller, call this.lineage.record({ result, sourceFilename: file.originalname, sourceBuffer: file.buffer, userId: req.user.id, brandKitId }). Do the same per-file inside UniversalConversionService.runBatch() (which currently only pushes in-memory results). Then History/Lineage/Restore have data.
- **Effort:** medium
- **Verify:** Convert a file via POST /convert, then GET /convert/history — confirm a row appears with correct sourceFormat/targetFormat and that GET /convert/lineage/:id returns a chain containing it.
- **Verification:** confirmed — grep across the whole universal-conversion dir returns exactly one call to record() — at conversion-lineage.service.ts:159 inside restore(). The controller's convert() (84-115) and the service's runBatch() (227-253) never persist. Confirmed dead History/Lineage/Restore.

### P1#17 — [Convert] Restore button always 400s — frontend omits required targetFormat
- **File:** `frontend/app/convert/page.tsx` — HistoryPanel.restore
- **Problem:** restore() calls api.post(`/convert/restore/${id}`) with no targetFormat (page.tsx line 589). The controller's restore() (lines 52-53) throws BadRequestException(`Unsupported target "undefined"`) because OUTPUT_FORMATS.includes(undefined as OutputFormat) is false. The button can never succeed.
- **Root cause:** Mismatch between the controller's mandatory targetFormat query param and the frontend call that sends none.
- **User impact:** Restore always errors, even if conversion rows existed.
- **Business impact:** A visible primary action is permanently broken.
- **Exact fix:** Either make targetFormat optional in the controller (default to the row's stored targetFormat — available via lineage.findOne(id).targetFormat) or have the frontend prompt for/send a targetFormat query param. Recommended: default to the existing record's targetFormat server-side and accept an optional override.
- **Effort:** low
- **Verify:** With at least one recorded conversion, click Restore in History and confirm a new converted artifact is produced instead of a 400 error.
- **Verification:** confirmed — Confirmed: page.tsx line 589 sends no query param; controller lines 52-53 reject any target not in OUTPUT_FORMATS, so undefined fails. (Even moot today because no rows exist per finding #2, but the mismatch is real.)

### P1#18 — [Convert] Advertised conversions Images->PDF, PDF->images, CSV->XLSX do not exist (false hero/tile claims)
- **File:** `backend/src/universal-conversion/document-model.ts` — detectFormat / FORMAT_FAMILY / OUTPUT_FORMATS
- **Problem:** FORMAT_FAMILY and detectFormat recognize no image input types (png/jpg/jpeg) (document-model.ts lines 97-124), so any image path is impossible. There is no image OUTPUT format and XLSX is not in OUTPUT_FORMATS (service.ts line 48), so *->XLSX and CSV->XLSX are impossible. pdf-image-extractor.ts exists but is used only internally by pdf-geometry-importer to extract embedded images, NOT as an image-input importer. Note: the wizard's upload accept list and OUTPUTS array do not offer image input or XLSX output, so users cannot select these in the flow — but the hero copy 'Convert anything to anything' (page.tsx line 136) and the XLSX 'Avg fidelity 88%' tile (page.tsx line 164) falsely imply they work.
- **Root cause:** Marketing/UI hero copy exceeds the implemented importer/exporter matrix; image and spreadsheet outputs were never built.
- **User impact:** Users reading the hero/tiles expect image and XLSX-output conversions that the product cannot perform; trust erosion rather than a hard error in the wizard (the wizard never offers them).
- **Business impact:** Overstated capabilities; the hero and fidelity tiles assert conversions that do not exist.
- **Exact fix:** Either implement the missing paths (image importer + PDF->images rasterizer; an XLSX exporter for *->XLSX) or remove the false claims: change the hero headline away from 'anything to anything', drop or relabel the XLSX fidelity tile (page.tsx line 164), and constrain advertised capability to the 7 real outputs and the actual supported input list.
- **Effort:** high
- **Verify:** Inspect the wizard: confirm the upload accept attr and OUTPUTS list never offer png/jpg input or XLSX output (they don't), and that the hero tile still shows XLSX 88% — i.e. a claim with no backing code path. Remove the tile or implement the path.
- **Verification:** adjusted — Confirmed no png/jpg/jpeg in FORMAT_FAMILY and XLSX absent from OUTPUT_FORMATS; pdf-image-extractor is internal-only (used only by pdf-geometry-importer.ts per grep). Adjusted scope: the wizard's accept list and OUTPUTS array do NOT expose image input or XLSX output, so there is no clickable broken path — the defect is the false hero headline + XLSX 88% tile (page.tsx lines 136, 164) advertising non-existent conversions. Severity kept at P1 (misleading-capability), but reframed from 'hard errors' to 'unbacked marketing claims'.

### P1#19 — [Convert] History endpoint has no caller-ownership filtering (latent cross-tenant leak)
- **File:** `backend/src/universal-conversion/universal-conversion.controller.ts` — history
- **Problem:** history() passes only an optional workspaceId query param to lineage.list() (controller lines 40-42). list() builds an empty `where` when no filter is given and returns the 100 most recent ConvertedFile rows across ALL users (conversion-lineage.service.ts lines 112-119). The JWT userId is never used. Conversions, when recorded, are saved with userId:null (record() is called from restore() without userId, line 159).
- **Root cause:** Auth context (req.user) is not threaded into the conversion/history flow; the ownership filter relies entirely on a client-supplied workspaceId.
- **User impact:** None today because nothing is recorded; the instant record() is wired (see finding above), every user's history would be visible to every other user.
- **Business impact:** Cross-tenant data exposure of filenames, formats, and quality reports.
- **Security impact:** Broken access control: any authenticated user could read all converted-file metadata by calling GET /convert/history with no params.
- **Exact fix:** Derive userId from the JWT (@Req() req; req.user.id) and pass it to lineage.list({ userId }); set userId on record() everywhere it is called; never trust a client workspaceId without verifying membership.
- **Effort:** low
- **Verify:** After wiring record(), create conversions as user A and user B; call GET /convert/history as user B and confirm only B's rows are returned.
- **Verification:** confirmed — Confirmed: controller.history() (lines 40-42) only forwards workspaceId; list() (lines 112-119) returns all rows when where is empty; no req.user is used and record() (line 159) passes no userId. Real broken-access-control latent the moment recording is wired. Correctly latent today since nothing is recorded.

### P1#20 — [Import PPTX] Cross-tenant import: no project-ownership check on /pptx-import/into-project
- **File:** `backend/src/pptx-import/pptx-import.controller.ts` — PptxImportController.importIntoProject / PptxImportService.importIntoProject
- **Problem:** The endpoint accepts a projectId (query param or FormData field) and the service calls prisma.deck.create({ data:{ projectId, ... }}) with no verification that the authenticated user owns that project. JwtAuthGuard (class-level @UseGuards) only proves a valid token; req.user is never read in the controller and Project.userId is never checked in the service. Any authenticated user who knows or guesses another user's project UUID can write an imported deck (slides, elements, themes, masters) into that project.
- **Root cause:** Controller importIntoProject (line 56-73) destructures only @UploadedFile + @Query/@Body projectId and calls this.importer.importIntoProject(file.buffer, projectId) at line 72 — no @CurrentUser/@Req. Service importIntoProject(buffer, projectId) (line 300) parses then immediately prisma.deck.create({ data:{ projectId, title, status:'draft' }}) at line 304 with no prisma.project.findFirst({ where:{ id: projectId, userId }}) guard. Project.userId exists (schema.prisma line 78), so the ownership check is feasible and simply absent.
- **User impact:** A victim sees foreign decks appear inside their project. An attacker can pollute or seed content in projects they do not own.
- **Business impact:** Multi-tenant data-integrity breach; violates the same userId-ownership invariant established in Phase 43 security fixes (per project memory) — this endpoint was missed.
- **Security impact:** Broken object-level authorization (IDOR / BOLA). Authenticated cross-tenant write.
- **Exact fix:** Add @Req() req (or a @CurrentUser() decorator) to the controller, read req.user.id, and pass userId into importIntoProject. In the service, before deck.create do: const project = await this.prisma.project.findFirst({ where:{ id: projectId, userId }}); if(!project) throw new ForbiddenException(). Mirror the Phase 43 ownership pattern used in document/profile CRUD.
- **Effort:** S (under 1 hour)
- **Verify:** As user A obtain a JWT; POST /pptx-import/into-project with a .pptx and projectId belonging to user B. Expect 403/404; verify no Deck row is created under B's project (currently it succeeds with 201 and a deckId).
- **Verification:** confirmed — Verified in code. Controller line 72: return this.importer.importIntoProject(file.buffer, projectId) — no user passed. Service line 300 signature importIntoProject(buffer, projectId) and line 304 prisma.deck.create({ data:{ projectId, ... }}) with no findFirst ownership guard anywhere (grep for project.findFirst/findUnique/userId in service returns only the deck.create line). Project.userId confirmed at schema.prisma line 78. Genuine IDOR/BOLA, P1 stands.

### P1#21 — [Import PPTX] Imported SmartArt and OLE objects render as placeholder cards in the editor (no renderer)
- **File:** `frontend/features/slide-editor/renderers/index.tsx` — ELEMENT_RENDERERS / renderElement
- **Problem:** The importer emits SlideElement rows of type 'smartArt' and 'oleObject' (pptx-import.service.ts handleGraphicFrame, lines 595 and 623) and persists them unfiltered via slideElement.createMany (line 374, type: el.type). The editor's ELEMENT_RENDERERS registry (line 843) has no key for 'smartArt' or 'oleObject', and the ElementType union (frontend/types/slide-element.ts lines 8-47) does not even include those members, so renderElement falls back to PlaceholderRenderer (line 885: ELEMENT_RENDERERS[el.type] || PlaceholderRenderer) — a dashed box showing only el.type and a one-line summary. The extracted SmartArt shapes/nodes and OLE attachment are never drawn on the canvas or in exports.
- **Root cause:** Renderer registry omits the two types the PPTX importer produces, AND the ElementType union omits them; backend extraction is real (smartArt content carries shapes/nodes; oleObject content carries url/filename/kind) but there is no frontend visual.
- **User impact:** After importing a deck containing SmartArt diagrams or embedded objects, those slides show grey dashed placeholder cards instead of the diagram/content, looking broken or empty despite the report claiming they were imported.
- **Business impact:** Undermines the page's headline promise ('slide-for-slide'); decks with diagrams import visibly degraded.
- **Exact fix:** Extend the ElementType union and ELEMENT_TYPES array in frontend/types/slide-element.ts to include 'smartArt' and 'oleObject' (otherwise the registry record typing rejects the new keys). Then add a SmartArtRenderer that draws content.shapes (already in slide-% coords with text/fill, per service line 602) as positioned divs, and an OleObjectRenderer that renders an attachment card with download link from content.url/content.filename (service lines 626-633); register both in ELEMENT_RENDERERS.
- **Effort:** M (half day for basic shape rendering)
- **Verify:** Import a PPTX with a SmartArt process diagram, open the editor: confirm boxes/text appear instead of a single dashed 'smartArt' card. Repeat with an embedded xlsx for oleObject.
- **Verification:** adjusted — Confirmed real and slightly tightened. Service emits type:'smartArt' (line 595, content.shapes/nodes) and type:'oleObject' (line 623, content.url/filename) and persists them unfiltered (createMany line 374). ELEMENT_RENDERERS (line 843) has no key for either; grep for smartArt/oleObject across frontend/features/slide-editor returns zero matches. renderElement falls back to PlaceholderRenderer (line 885). Adjusted only to add that the ElementType union (frontend/types/slide-element.ts) must also be extended or the registry typing breaks — fix expanded accordingly. Severity P1 retained.

### P1#22 — [Analytics] Views metric only counts anonymous public-link views, not authenticated document opens
- **File:** `/Users/shadi/Desktop/Pitchonix/backend/src/projects/projects.service.ts` — getPublicProject (line 265) — only viewCount increment site
- **Problem:** viewCount is incremented in exactly one place: getPublicProject (projects.service.ts:265, the public share token route). grep confirms line 265 is the sole `viewCount: { increment }` write. No increment occurs when the owner or authenticated collaborators open a project/deck in-app — findOne (line 88) and the deck-open paths never touch viewCount. The Analytics page presents 'Total Views' (page.tsx:76) as overall document views, but it actually measures only anonymous visits to shared links.
- **Root cause:** View tracking was implemented only for the public-share flow (getPublicProject); in-app authenticated view tracking was never added to findOne or deck open paths.
- **User impact:** A user with active projects they view daily but never shared publicly sees 'Total Views: 0', making the dashboard look broken/empty and under-reporting real engagement.
- **Business impact:** Engagement reporting is materially understated; 'views' is not a meaningful product metric as labeled. Misleads internal and customer-facing usage analysis (also flows into the email digest _sum viewCount).
- **Exact fix:** Decide and document the intended semantics. If 'views' should mean all opens, increment viewCount (or a distinct authenticatedViewCount) in findOne/deck-open paths, and label the KPI accordingly. At minimum, rename the page.tsx:76 KPI/copy to 'Public Link Views' so the page is honest about what it measures (the page subtitle already says 'share link activity' but the KPI label says 'Total Views').
- **Effort:** S (relabel) to M (add authenticated view tracking)
- **Verify:** Open an owned, never-shared project several times while logged in; viewCount stays 0. Open it via a public share link; only then does viewCount increase. Confirms the metric excludes authenticated views.
- **Verification:** confirmed — Confirmed. grep for viewCount shows the only DB write is projects.service.ts:265 inside getPublicProject (public token route). findOne (:88) and authenticated open paths never increment. The share page (frontend/app/share/[token]/page.tsx:66) is the only place these views originate. KPI label 'Total Views' overstates scope.

### P1#23 — [Analytics] Dashboard totals silently truncated at 100 projects — no real server-side aggregation
- **File:** `/Users/shadi/Desktop/Pitchonix/frontend/app/analytics/page.tsx` — fetchAnalytics (line 34) — api.get('/projects?limit=100')
- **Problem:** All KPIs and charts are computed client-side by reducing over the project list returned from /projects?limit=100 (page.tsx:36, 46-48). The backend findAll (projects.service.ts:54-75) paginates with `take: limit`, and the QueryProjectsDto caps limit at @Max(100) (project.dto.ts:143) — so 100 is the hard ceiling; the client cannot even request more. Users with >100 non-archived projects have their views/exports/share totals computed over only the most recently edited 100 (ordered by lastEditedAt desc), silently under-counting. There is no analytics aggregation query (no Prisma aggregate/groupBy in projects.controller.ts — only a per-project :id/analytics endpoint at line 50); the only _sum aggregate in the codebase lives in the unrelated email digest.
- **Root cause:** Analytics was built as a thin client-side view over a paginated CRUD list endpoint whose DTO hard-caps limit at 100, instead of a purpose-built aggregation endpoint.
- **User impact:** Power users see incorrect (too-low) totals with no indication that data was truncated. The @Max(100) cap means there's no client-side workaround.
- **Business impact:** Analytics totals are unreliable for accounts at scale — exactly the customers who care about analytics. Numbers won't reconcile with reality and won't match the email digest (which aggregates over ALL projects via _sum).
- **Exact fix:** Add a backend analytics endpoint (e.g., GET /projects/analytics/summary) that runs Prisma aggregate (_sum viewCount/exportCount, count, share-link count) and optionally groupBy for the top-N chart, scoped to userId and archivedAt:null. Have the page consume it instead of paginated /projects. Keep the per-project chart server-paginated/top-N. (The email-digest.service.ts:51-58 _sum pattern is a ready template.)
- **Effort:** M
- **Verify:** Seed an account with 120 projects carrying nonzero viewCounts; the current page's Total Views equals the sum of only ~100 projects, not all 120. A real aggregate endpoint (or the email digest's _sum) returns the full sum.
- **Verification:** confirmed — Confirmed and slightly strengthened. page.tsx:36 requests limit=100; project.dto.ts:143 enforces @Max(100), so 100 is a hard server cap (not just a default). findAll (projects.service.ts:54-75) paginates with take:limit. projects.controller.ts has no aggregate/summary route — only :id/analytics (per-project). Discrepancy: email digest aggregates over all projects, so digest and dashboard totals will diverge for >100-project accounts.

### P1#24 — [Settings] Notifications section is fake — saves nothing and overwrites name
- **File:** `/Users/shadi/Desktop/Pitchonix/frontend/app/settings/page.tsx` — handleSaveNotifications (lines 94-108)
- **Problem:** The three notification checkboxes are local React state only (notifGeneration/notifQuality/notifUpdates with hardcoded defaults true/false/false). handleSaveNotifications PATCHes /users/me with only { name } (a comment admits notifications are a future feature) and then shows toast.success('Notification preferences saved'). No preference is persisted; the toggles reset to defaults on refresh. As a side effect it writes the current name input back to the profile. Note: the section IS labeled 'Preview' (lines 363-365) and carries a 'Toggles save locally today' disclaimer, which partly mitigates the deception — but the success toast and name mutation remain genuine issues.
- **Root cause:** No backend field/endpoint for notification preferences exists; the handler fakes success by reusing the profile PATCH with {name}.
- **User impact:** User toggles preferences, sees a 'Notification preferences saved' success message, but nothing is saved — toggles revert after reload. Misleading despite the Preview badge. Also unexpectedly mutates the profile name.
- **Business impact:** Erodes trust; a partially fake feature in account settings looks unfinished. Partly softened by the explicit 'Preview' badge and disclaimer.
- **Security impact:** None directly.
- **Exact fix:** Either (a) remove the Save button (or make it clearly disabled given it's already Preview), or (b) add a NotificationPreferences model + endpoint and persist/load real values. Regardless, stop PATCHing {name} from this handler and stop showing a 'saved' success toast when nothing is persisted.
- **Effort:** medium
- **Verify:** Toggle 'Email me quality score reports', click Save Preferences, hard-refresh. The toggle returns to its default (off) — proving nothing persisted.
- **Verification:** confirmed — Confirmed at lines 94-108: PATCH /users/me body is literally `{ name, /* Notifications are a future server-side feature */ }` followed by toast.success('Notification preferences saved'). Checkboxes (lines 30-32) are local state with hardcoded defaults, never hydrated from any source. Adjusted only in detail: the UI does carry a 'Preview' badge (lines 363-365) and a disclaimer, so framing is partly honest — but the misleading success toast and name side-effect confirm P1.

### P1#25 — [Settings] Delete Account uses native browser confirm() instead of in-app modal
- **File:** `/Users/shadi/Desktop/Pitchonix/frontend/app/settings/page.tsx` — handleDeleteAccount (lines 159-161)
- **Problem:** The most destructive action in the app gates on two native window.confirm() dialogs. The project ships an in-app ConfirmDialog/useConfirm used by 20+ other destructive actions (workspace delete, member remove, CV mapping delete, etc.), violating the explicit requirement that dangerous actions confirm via in-app modals.
- **Root cause:** The account settings page predates or skipped the useConfirm migration that the workspace/CV pages adopted.
- **User impact:** Inconsistent UX; native dialogs are unstyled, blockable by browsers/extensions, and can be auto-dismissed, risking accidental irreversible account deletion.
- **Business impact:** Inconsistent, unpolished UX on an irreversible action; potential accidental data loss support tickets.
- **Security impact:** Low; weak confirmation on an irreversible destructive action.
- **Exact fix:** Replace both confirm() calls (lines 160-161) with the existing useConfirm() hook (tone:'danger', optional type-to-confirm), matching WorkspaceSettingsPage's handleDelete.
- **Effort:** low
- **Verify:** Click Delete Account. A native browser confirm dialog appears (not the styled in-app ConfirmDialog used elsewhere).
- **Verification:** confirmed — Confirmed at lines 160-161: two raw `confirm(...)` calls gate handleDeleteAccount. grep shows useConfirm/ConfirmDialog is imported and used across 20+ pages including WorkspaceSettingsPage.tsx and settings/cv-import-mappings/page.tsx, but settings/page.tsx imports neither. P1 stands.

### P1#26 — [Help & Support] Contact Support has no form or backend — mailto link only, while a full contact backend ships dead
- **File:** `frontend/app/help/page.tsx` — HelpPage (Contact Support block, lines 93-116)
- **Problem:** The 'Contact Support' card on /help only renders a mailto:support@pitchonix.com link (line 105) and a hardcoded 'Within 24 hours' response-time claim (line 111). There is no in-app form, no submission, no persistence. Separately, a complete contact backend exists (backend/src/contact/contact.controller.ts, contact.service.ts) implementing POST/GET/PATCH /contact and writing to a contactMessage table — but it is entirely dead: ContactModule is NOT imported in backend/src/app.module.ts (grep for ContactModule across backend/src returns only contact.module.ts itself), so the routes 404, and the contactMessage model does not exist in backend/prisma/schema.prisma (the only 'contact' match is an unrelated comment string at line 320), so contact.service.ts createContactMessage — which calls (this.prisma as any).contactMessage.create — would throw at runtime even if the module were registered. No frontend source code POSTs to /contact (only stale .next build artifacts match).
- **Root cause:** Contact feature was scaffolded backend-first then abandoned: ContactModule never wired into AppModule's imports array, the Prisma contactMessage model never added/migrated (the service masks this with (this.prisma as any) casts so it compiles but throws at runtime), and the frontend was never built to call it. The Help page fell back to a static mailto.
- **User impact:** Users cannot submit a support request from inside the app. They must already have an email client configured and trust an unmonitored-looking address. Anything they 'send' is invisible to the platform — no record, no tracking, no SLA enforcement behind the displayed '24 hours' promise.
- **Business impact:** Support requests are not captured or triaged anywhere. The advertised 24-hour SLA is unbacked. Dead backend code creates false confidence in reviews/audits and rots (references a non-existent table).
- **Exact fix:** Pick one path. (A) If contact-via-form is wanted: add a ContactMessage model to schema.prisma (id, name, email, subject, message, userId?, status default 'new', createdAt), run a migration, add ContactModule to the imports array in app.module.ts, replace the (this.prisma as any).contactMessage casts in contact.service.ts with the now-typed client, and build a real form on /help that POSTs to the @Public() POST /contact with success/error states. Add an admin page to read GET /contact. (B) If contact-via-email is the intent: delete backend/src/contact entirely (it is dead and misleading) and keep the mailto, but verify support@pitchonix.com is a monitored inbox and remove or substantiate the '24 hours' claim.
- **Effort:** 4-8h for path A (model+migration+module wiring+form+admin inbox); 30m for path B (delete dead module, verify mailbox)
- **Verify:** 1) curl -X POST http://localhost:PORT/contact -d '{...}' → currently 404 (route not registered). 2) grep -rln ContactModule backend/src → only contact.module.ts (self), proving no import. 3) grep -i contactMessage backend/prisma/schema.prisma → no model. 4) After fix A: same curl returns 201 and a row appears in the contact table. 5) Submit the /help form in the browser and confirm a DB row + admin inbox shows it.
- **Verification:** confirmed — Verified every claim directly. frontend/app/help/page.tsx lines 93-116 contain only the mailto:support@pitchonix.com anchor (line 105) and hardcoded 'Within 24 hours' (line 111) — no form, no fetch/POST. backend/src/contact/ contains controller.ts, service.ts, module.ts; service.ts lines 17/32/38/44 all use (this.prisma as any).contactMessage, confirming the model is untyped/absent. grep -rln ContactModule backend/src returns ONLY backend/src/contact/contact.module.ts (self-reference) — it is never imported into app.module.ts's imports list. schema.prisma has no contactMessage model (only an unrelated 'contact' substring in a comment at line 320). No frontend source (app/features/lib/components) POSTs to /contact. P1 severity is correct: degraded headline capability + dead backend, but a working mailto fallback exists so it is not a P0.

### P1#27 — [Templates (cross-cutting)] PDF Studio pro-templates: ~10 of 20 are exact recolor duplicates of a sibling (same family + same shared palette)
- **File:** `backend/src/pdf-studio/pro-templates/renderers/pro-template-renderer.service.ts` — getDesignFamily + pro-template.registry palettes
- **Problem:** The pro renderer is genuinely layout-distinct PER FAMILY, but getDesignFamily() (line 85) maps 20 IDs onto 10 families, and pro-template.registry.ts (lines 48-67) assigns the SAME shared palette token OBJECT (palettes.minimal/executive/startup/...) to siblings. The render branches only on `family` and colors come from template.tokens.colors, so templates sharing both family and palette render byte-identically for identical input: minimal => modern-minimal-report, ultra-minimal-onepager, educational-course-guide; executive => executive-board-brief, case-study-storyline, consulting-strategy-playbook; editorial => editorial-whitepaper, premium-whitepaper-system; futuristic => future-tech-brief, ai-future-tech-report; fintech => fintech-operating-plan, sustainability-impact-report; startup => startup-investor-memo, product-showcase-deckdoc; analytics => analytics-performance-report, investor-diligence-pack; agency => agency-campaign-book, roadmap-execution-plan. Archetype selection is content-driven, not template-driven, so these are not even color-distinct.
- **Root cause:** Family routing collapses many IDs to one render path AND the registry reuses the same palette object within a family, so per-ID identity is name-only for the ~10 duplicate templates.
- **User impact:** Users see ~20 pro templates but get ~10 actual looks; picking 'Educational Course Guide' vs 'Ultra Minimal One Pager' yields the same PDF.
- **Business impact:** Inflated catalog count; perceived choice does not exist for half the catalog.
- **Exact fix:** Give each duplicated template a distinct palette token object and/or a family-specific layout variant (the renderer already supports family-conditional branches), or reduce the catalog to the genuinely distinct families and present color variants explicitly. At minimum assign unique palettes per template so duplicates are at least visually distinct.
- **Effort:** M (1-2 days to add unique palettes/variant tweaks per duplicate, or trim catalog)
- **Verify:** Render the same document via proTemplateId=modern-minimal-report and proTemplateId=educational-course-guide. Diff output HTML — currently identical (same 'minimal' family render path at getDesignFamily line 87/89 + the same palettes.minimal object at registry lines 48/64).
- **Verification:** adjusted — Confirmed. getDesignFamily (line 85) maps 20 IDs to 10 families; registry (lines 48-67) passes the same palettes.X object to siblings; renderer colors = template.tokens.colors (line 233) and branching is purely on `family`. So family+palette siblings produce identical HTML. ADJUSTED count: ~10 of 20 duplicates (10 unique families, 10 redundant siblings), original '~11 of 20' is approximately correct. Severity kept P1.

### P1#28 — [Editors (cross-cutting)] PDF Studio 'Expand', 'Shorten', 'Restructure' enhancement buttons are fake — all run the same grammar/clarity regex and lie via success toasts
- **File:** `backend/src/pdf-studio/controllers/smart-builder.controller.ts` — getEnhancementOptions / enhanceDocument (POST /pdf-studio/smart-builder/enhance)
- **Page:** /pdf-studio/editor/[id]
- **Problem:** The editor enhancement panel (frontend/app/pdf-studio/editor/[id]/page.tsx:1665-1671) exposes six distinct AI-styled buttons: Improve, Grammar, Structure(restructure), Expand, Shorten, Professionalize. The backend enhancement engine (content-enhancement.service.ts) imports only @nestjs/common and PrismaService — it is purely a regex dictionary of spelling fixes, clarity rewrites and tone word-swaps with NO LLM/network call. getEnhancementOptions() (lines 1032-1035) maps restructure/expand/shorten all to {improveClarity:true, fixGrammar:true/false, tone:'business'} — the SAME safe pass. 'Expand' cannot add content, 'Shorten' cannot remove content, 'Restructure' cannot reorganize. The service even rolls back to the original on structure change (detectSemanticDrift, service line 430-437), guaranteeing these three are typically no-ops, yet the editor shows success toasts 'Content expanded', 'Content shortened', 'Content restructured' (page.tsx:786-788).
- **Root cause:** Destructive AI operations were intentionally removed (comment at smart-builder.controller.ts:1025-1027 'Destructive operations ... were intentionally removed') but the UI buttons and their misleading success labels were left in place, so the affordance promises an operation the backend cannot perform.
- **User impact:** User clicks 'Expand' expecting longer content (or 'Shorten' for a trimmed version) and gets either identical text or a few grammar tweaks, while the app reports success. Erodes trust and produces no usable result for 3 of 6 advertised actions.
- **Business impact:** Advertises AI rewriting/expansion/summarization that does not exist; a paying user comparing against real AI tools will see these as broken or deceptive, damaging credibility of the 'Smart Builder' positioning.
- **Exact fix:** Either (a) remove the Expand/Shorten/Restructure buttons (page.tsx:1668-1670) and the matching toast labels (page.tsx:786-788), keeping only Improve Writing + Fix Grammar (the two that match their labels); or (b) implement real LLM-backed expand/shorten/restructure in content-enhancement.service.ts gated behind a feature flag and only then keep the buttons. Minimum honest fix is option (a).
- **Effort:** Low to remove/relabel (under 1 hour). Medium-High to implement real LLM operations (1-2 days incl. prompt design, cost controls, content-preservation tests).
- **Verify:** In the PDF editor, type a 2-sentence paragraph with no spelling errors. Click 'Expand': content is unchanged (or only clarity-tweaked) while a green 'Content expanded' toast appears. Repeat for 'Shorten' and 'Structure' — identical no-op with mismatched toasts. Diff POST /pdf-studio/smart-builder/enhance for type=expand vs type=fix_grammar and confirm both hit getEnhancementOptions' regex pass.
- **Verification:** confirmed — Confirmed in code: getEnhancementOptions (smart-builder.controller.ts:1024-1040) maps restructure/expand/shorten to safe {improveClarity,fixGrammar,tone} combos; comment lines 1025-1027 confirms destructive ops removed. content-enhancement.service.ts imports only nestjs+prisma (no Anthropic/OpenAI/fetch), is regex-only, and rolls back on semantic drift (lines 430-437). Frontend buttons (page.tsx:1666-1671) and mislabeled toasts (page.tsx:786-788) verified verbatim.

### P1#29 — [Editors (cross-cutting)] Excel Studio PDF report export mislabels HTML bytes as application/pdf on puppeteer failure
- **File:** `backend/src/excel-studio/excel-studio.service.ts` — buildReportPdf (and exportProject audit-pdf/executive-pdf/dashboard-pdf branch)
- **Page:** /excel-studio/editor/[id]
- **Problem:** buildReportPdf() (lines 1678-1693) renders the report to PDF via puppeteer in the happy path, but its catch block (lines 1690-1691) returns `Buffer.from(html, 'utf8')` — raw HTML — when Chromium fails to launch. The caller exportProject() (lines 1113-1118) hardcodes contentType 'application/pdf' and a '${slug}-${normalized}.pdf' filename, and the controller export() (excel-studio.controller.ts:145-146) sets `Content-Type: payload.contentType` and `filename=payload.filename` unconditionally. The downloaded file is therefore HTML masquerading as a PDF: it will not open in any PDF reader and is a mislabeled artifact.
- **Root cause:** Silent fallback added for puppeteer resilience but without propagating the actual produced format to the response headers/filename (contrast with Career's cv-export.service.ts which relabels the extension and sets text/html when PDF falls back via X-Pitchonix-Export-Extension).
- **User impact:** On any host where Chromium isn't available/fails (common in constrained/serverless deploys), the user gets a file named *.pdf that no PDF viewer can open, with no indication anything went wrong.
- **Business impact:** Board-export / audit-PDF is a headline 'executive' deliverable; shipping a broken-but-named PDF to an executive audience is reputationally damaging and looks like a defective product.
- **Exact fix:** Have buildReportPdf return a discriminated result {buffer, contentType, extension}. On the HTML fallback (line 1691) set contentType 'text/html' and extension 'html'. Propagate through exportProject() (lines 1113-1118) so the controller's Content-Type and filename reflect the real bytes (mirror cv-export.service.ts's pattern), and surface an editor toast like 'PDF renderer unavailable — exported HTML instead'.
- **Effort:** Low (1-2 hours): thread the format through one return type and the controller header set.
- **Verify:** Break puppeteer (invalid executablePath or no Chromium), then in the Excel editor choose Export > Audit PDF. The downloaded file's first bytes are '<!doctype html>' not '%PDF', yet it is named *.pdf and served as application/pdf. After the fix, confirm the fallback download is named *.html with Content-Type text/html.
- **Verification:** confirmed — Confirmed: buildReportPdf catch returns Buffer.from(html,'utf8') (excel-studio.service.ts:1690-1691); exportProject branch hardcodes contentType 'application/pdf' and '.pdf' filename (lines 1113-1118) with no format awareness; controller export() blindly sets payload.contentType/filename headers (controller:145-146). HTML-as-PDF on Chromium failure verified.

### P1#30 — [Exports (cross-cutting)] Excel 'Enhanced/Modernize Workbook' styling is metadata-only — xlsx Community build drops all cell styles
- **File:** `backend/src/excel-studio/excel-studio.service.ts` — appendStyledSheet / buildEnhancedWorkbook
- **Page:** /excel-studio/editor/[id]
- **Problem:** appendStyledSheet (lines 1392-1436) assigns ws[ref].s = {fill,font,border,...} and buildEnhancedWorkbook (line 1380) calls XLSX.write(..., {cellStyles:true}). The installed dependency is xlsx@0.18.5 (SheetJS Community), which does NOT write cell styles. Empirically verified: writing a cell with red solid fill + bold and reading it back yields style {patternType:'none'} — the fill and bold are gone.
- **Root cause:** Cell styling is a SheetJS Pro-only write feature; the Community build silently ignores .s on write. The code comment at line 1387-1390 incorrectly claims 'XLSX SheetJS open-source supports s on individual cell objects when cellStyles:true is passed to write()' — this is false for write (it round-trips reads only partially). No ExcelJS is installed.
- **User impact:** User exports 'Enhanced Workbook' / runs 'Modernize Workbook' expecting branded headers, accent fills, bold labels — opens the file in Excel and sees a plain unstyled grid identical in formatting to the source.
- **Business impact:** The headline value proposition of Excel Studio (turn an ugly workbook into a polished, modern, branded one) is not delivered in the exported artifact. This is a 'metadata-only transform' — it adds sheets/labels but no real visual enhancement.
- **Exact fix:** Replace the xlsx write path for styled output with ExcelJS (worksheet.getCell().fill/font/border + workbook.xlsx.writeBuffer()) — note exceljs is NOT currently in node_modules and must be added. Keep xlsx for parsing/import. Update the inline code comment (lines 1387-1390) and UI copy ('Applied modern workbook presentation system') until visual styling actually persists.
- **Effort:** M (about 1-2 days to port the enhanced/package/snapshot writers to ExcelJS)
- **Verify:** Round-trip a styled cell through xlsx@0.18.5: ws['A1'].s={fill:{patternType:'solid',fgColor:{rgb:'FFFF0000'}},font:{bold:true}}; XLSX.write({cellStyles:true}); XLSX.read; style becomes {patternType:'none'}. (Reproduced.)
- **Verification:** confirmed — Ran the exact round-trip against the installed xlsx@0.18.5 — output: style after roundtrip: {"patternType":"none"}, fill and bold lost. appendStyledSheet (1392-1436) and buildEnhancedWorkbook (1380) set those styles and write with cellStyles:true. node_modules/exceljs absent, confirming porting is required. Confirmed as stated.

### P1#31 — [Exports (cross-cutting)] Excel frontend reconstructs file extension from format string, ignoring backend Content-Disposition — mislabels CSV-origin originals as .xlsx
- **File:** `frontend/app/excel-studio/editor/[id]/page.tsx` — download()
- **Page:** /excel-studio/editor/[id]
- **Problem:** download() (lines 302-323) computes ext = format.includes('pdf')?'pdf' : format.includes('csv')||['change-log','issue-report'].includes(format)?'csv' : 'xlsx', and never reads response.headers['content-disposition']. For format 'original-xlsx' on a project uploaded as CSV, the backend exportProject original branch (lines 1084-1090) returns the ORIGINAL bytes with ext = path.extname(filename) = '.csv' and contentType 'text/csv' (contentTypeForExtension lines 1490-1495), but the frontend names the download '${title}.xlsx'. A CSV is then handed to the user as an .xlsx, which Excel opens with a 'file format and extension don't match' warning.
- **Root cause:** Frontend derives the filename/extension locally instead of honoring the server's Content-Disposition filename. The controller (excel-studio.controller.ts:146) already sets `attachment; filename="${payload.filename}"` with the correct extension in every branch; download() discards it.
- **User impact:** Downloaded file extension can mismatch its real type (CSV named .xlsx). Excel shows a corruption/format warning; double-click open path is wrong.
- **Business impact:** Looks broken/unprofessional for the 'download original' and any non-xlsx originals; undermines confidence in the export module.
- **Exact fix:** In download(), parse the filename from response.headers['content-disposition'] (regex on filename="...") and use it for a.download; only fall back to the format-derived name if the header is absent. The backend returns a correct filename in every branch (controller line 146).
- **Effort:** S (about 30 minutes)
- **Verify:** Upload a .csv to Excel Studio, then 'Download Original Workbook' (original-xlsx). Backend returns Content-Disposition with .csv; frontend saves it as .xlsx. Confirm by inspecting the saved filename and `file` output (CSV/text, not a zip/xlsx).
- **Verification:** confirmed — Read download() (page.tsx:302-323): ext computed solely from format string, no header read. Read backend original branch (1084-1090): returns -original${ext} with ext from path.extname(filename), text/csv via contentTypeForExtension (1490-1495). Controller (146) emits the correct filename in Content-Disposition. Mismatch confirmed exactly as stated.

### P1#32 — [Security (cross-cutting)] DocumentVersionsController exposes list/create/restore of any document's versions (IDOR)
- **File:** `backend/src/document-versions/document-versions.controller.ts` — DocumentVersionsController.listVersions / createSnapshot / restore
- **Problem:** Controller is mounted at pdf-documents/:documentId/versions with JwtAuthGuard but NONE of the three handlers inject @GetUser or call any ownership check. listVersions(documentId) → service.listVersions(documentId) returns snapshots of any documentId; createSnapshot writes a snapshot to any documentId; restore(documentId, versionId) → service.restoreVersion mutates any document's updatedAt and returns version.pagesSnapshot (full page content). The service (document-versions.service.ts) queries purely by raw documentId/versionId with no user scoping.
- **Root cause:** A second, parallel version controller was added without the ownership-enforcement pattern. Neither the controller nor DocumentVersionsService binds versions to the authenticated user.
- **User impact:** Any authenticated user can read another user's document content (via restore returning pagesSnapshot, and snapshot listing) and tamper with another user's document/version history.
- **Business impact:** Cross-tenant data read and destructive write; data integrity loss.
- **Security impact:** Broken access control (OWASP A01) — both confidentiality and integrity violations.
- **Exact fix:** Inject @GetUser() user into all three handlers and verify ownership before delegating: load pdfDocument with its project and assert document.project.userId === user.id (mirroring assertDocumentAccess used elsewhere). Also scope getVersion/restoreVersion so the version's documentId matches the asserted document. Alternatively delete this controller if pdf-documents.controller.ts already provides secured /versions endpoints.
- **Effort:** S (1-2 hours)
- **Verify:** As user B (valid token), GET /api/pdf-documents/<userA-docId>/versions and POST .../versions/<vId>/restore. Confirm currently succeeds and returns A's snapshot; after fix returns 403.
- **Verification:** confirmed — Confirmed: controller (33 lines) has @UseGuards(JwtAuthGuard) but no @GetUser and no ownership logic; all three handlers pass raw @Param('documentId')/@Param('versionId') to the service. document-versions.service.ts confirms queries are by raw id with no user filter; restoreVersion returns version.pagesSnapshot (full content). Real IDOR (read + write).

### P1#33 — [Security (cross-cutting)] SmartBuilder enhance & regenerate-section mutate any document/page without ownership check (IDOR)
- **File:** `backend/src/pdf-studio/controllers/smart-builder.controller.ts` — SmartBuilderController.enhanceDocument (POST /enhance) and regenerateSection (POST /regenerate-section)
- **Problem:** enhanceDocument (lines 696-806) does prisma.pdfDocument.findUnique({where:{id:documentId}}) and prisma.pdfPage.update by targetId, writing enhanced content back — with NO @GetUser and NO assertDocumentAccess. regenerateSection (lines 812-880) loads a page by sectionId and prisma.pdfPage.update's its content — also no ownership. By contrast getDocument (line 887), addPage (line 1045), deletePage (line 1080), and duplicatePage (line 1111) all enforce ownership via assertDocumentAccess or explicit project.userId checks.
- **Root cause:** Ownership checks were added to get/add/delete/duplicate handlers but not to enhance/regenerate-section during the security phase.
- **User impact:** Any authenticated user can overwrite the content of any other user's document pages by supplying their documentId/targetId/sectionId.
- **Business impact:** Cross-tenant data tampering / content corruption.
- **Security impact:** Broken access control (OWASP A01) — integrity violation.
- **Exact fix:** Add @GetUser() user to both handlers. In enhanceDocument call await this.assertDocumentAccess(documentId, user) before the findUnique, and when targetId is provided also assert the page belongs to that document. In regenerateSection load the page with { document: { include: { project: true } } } and assert page.document.project.userId === user.id (and page.documentId === documentId) before mutating.
- **Effort:** S (1 hour)
- **Verify:** As user B, POST /api/pdf-studio/smart-builder/enhance with user A's documentId+targetId. Confirm A's page text changes; after fix returns 403.
- **Verification:** confirmed — Confirmed: enhanceDocument (line 696) and regenerateSection (line 812) have neither @GetUser nor assertDocumentAccess and perform pdfPage.update by user-supplied id. Sibling handlers in the same controller (lines 887, 1045, 1080, 1111) DO enforce ownership, proving the omission. Note regenerateSection also requires a matching ContentAnalysis row (findUnique on documentId), a minor precondition but not a security gate. Real IDOR write.

### P1#34 — [Security (cross-cutting)] Authenticated SSRF + credential leak via Unsplash download proxy
- **File:** `backend/src/integrations/unsplash/unsplash.controller.ts` — UnsplashController.triggerDownload (POST /api/unsplash/download) → UnsplashService.triggerDownload
- **Problem:** The handler (lines 44-48) takes @Body('downloadUrl') and passes it straight to UnsplashService.triggerDownload, which (unsplash.service.ts lines 110-125) calls fetch(downloadUrl, { headers: { Authorization: `Client-ID ${this.apiKey}` } }). There is no allowlist that downloadUrl is an api.unsplash.com host. Any authenticated user can make the server issue a GET to any URL (cloud metadata 169.254.169.254, localhost ports, internal services) and the request carries the Unsplash API key.
- **Root cause:** User-controlled URL used directly as a server-side fetch target with no host validation; secret Authorization header attached unconditionally.
- **User impact:** n/a direct, but enables internal network reconnaissance from the server.
- **Business impact:** Pivot into internal infrastructure (169.254.169.254, internal services); leak of the Unsplash Client-ID to attacker-controlled hosts.
- **Security impact:** Server-Side Request Forgery (OWASP A10) + sensitive credential exposure.
- **Exact fix:** Validate that new URL(downloadUrl).hostname === 'api.unsplash.com' (the service's baseUrl host; download_location links are api.unsplash.com URLs) before fetching; reject anything else with BadRequestException. Only attach the Authorization header when the host matches. Better: drop the user-supplied URL and look up download_location server-side from a photo id.
- **Effort:** S (1-2 hours)
- **Verify:** As an authenticated user, POST /api/unsplash/download with {"downloadUrl":"http://169.254.169.254/latest/meta-data/"} (or a local nc listener) and confirm the server makes the outbound request today (errors are swallowed but the fetch fires); after fix the request is rejected before any fetch.
- **Verification:** confirmed — Confirmed: controller passes raw @Body('downloadUrl') with no validation; service.triggerDownload (lines 110-125) fetches it directly with the Client-ID Authorization header and no host check. baseUrl is https://api.unsplash.com but downloadUrl is fully attacker-controlled. Real authenticated SSRF + credential leak. Note errors are caught/logged so the response is always {success:true}, but the outbound request still fires (blind SSRF).

### P1#35 — [Security (cross-cutting)] Path traversal and missing ownership in upload file delete
- **File:** `backend/src/upload/upload.service.ts` — UploadService.deleteImage (called by UploadController DELETE /api/upload/:filename)
- **Problem:** deleteImage (lines 127-137) does filepath = path.join(this.uploadDir, filename) with filename coming directly from @Param('filename') (controller lines 68-73), then fs.unlink(filepath). There is no path.basename(), no containment check that the resolved path stays inside uploadDir, and no owner record. A value like ../../some/path (URL-encoded %2F, which Express decodes into the param) escapes the uploads directory. There is also no ownership check, so any authenticated user can delete any other user's uploaded file by filename.
- **Root cause:** Raw path segment concatenated into a filesystem path with an unlink sink; no auth scoping on uploaded assets.
- **User impact:** Users can have their uploaded images deleted by other users; in the worst case arbitrary files on disk can be unlinked.
- **Business impact:** Data loss / potential denial of service if critical files are removed.
- **Security impact:** Path traversal (OWASP A01/A05) + broken access control.
- **Exact fix:** In deleteImage compute const safe = path.basename(filename); const resolved = path.resolve(this.uploadDir, safe); and assert resolved.startsWith(path.resolve(this.uploadDir) + path.sep) before unlinking. Additionally persist an owner per uploaded file and verify ownership in the controller before deletion.
- **Effort:** M (2-4 hours incl. ownership model)
- **Verify:** DELETE /api/upload/..%2F..%2F<throwaway-file> with a valid token and confirm a file outside uploads is targeted. After fix, confirm only basenamed files inside uploads can be removed and only by their owner.
- **Verification:** confirmed — Confirmed: upload.service.ts deleteImage uses path.join(uploadDir, filename) with no basename/containment; controller DELETE handler (lines 68-73) passes raw @Param and has no @GetUser/ownership. unlink errors are swallowed (don't-throw-if-missing) so traversal probing is silent. Real path traversal + cross-tenant delete.

### P1#36 — [Security (cross-cutting)] Unscoped conversion lineage/history/result endpoints leak cross-tenant data (routes are /api/convert/*)
- **File:** `backend/src/universal-conversion/universal-conversion.controller.ts`
- **Problem:** history() (line 40) forwards caller-supplied workspaceId to lineage.list({ workspaceId }) and never passes userId; conversion-lineage.service.ts list() (lines 112-119) only adds a where filter when userId/workspaceId is truthy, so with no workspaceId the query returns the 100 most recent ConvertedFile records across ALL tenants. chain/lineage/:id (line 46), restore/:id (line 52), and result/:jobId (line 188) / status/:jobId take raw ids/jobIds with no ownership or workspace-membership check, so any authenticated user can read or re-convert any stored conversion and fetch any batch job's full result payload. IMPORTANT CORRECTION: the controller is @Controller('convert'), so the real routes are /api/convert/history, /api/convert/lineage/:id, /api/convert/restore/:id, /api/convert/result/:jobId — NOT /api/universal-conversion/* as originally reported.
- **Root cause:** Conversion module never binds resources to the authenticated user; controller relies on optional, caller-controlled scoping params with no membership verification. record() can persist userId/workspaceId but the read endpoints never supply or enforce them.
- **User impact:** Any logged-in user can enumerate and download other tenants' converted documents and conversion history.
- **Business impact:** Cross-tenant document exfiltration; confidentiality breach across the entire conversion subsystem.
- **Security impact:** Broken access control (OWASP A01) / multi-tenant isolation failure.
- **Exact fix:** Inject @GetUser() user, always pass userId to lineage.list (never trust caller workspaceId without verifying WorkspaceMember membership), and add ownership/membership checks to chain/restore/result/status by verifying ConvertedFile.userId (or a workspace the user belongs to) and scoping in-memory batch jobs to their creator's userId.
- **Effort:** M (4-8 hours)
- **Verify:** As user B with no workspace, GET /api/convert/history and confirm it returns user A's conversions; GET /api/convert/result/<A-jobId> and confirm it returns A's job payload. After fix both are empty/403. (Note: use /api/convert/*, not /api/universal-conversion/*.)
- **Verification:** adjusted — Underlying vuln CONFIRMED: history() never passes userId and list() returns all rows (take:100) when unscoped; chain/restore/result/status take raw ids with no ownership; in-memory batch jobs (svc.getBatch) are unscoped. ADJUSTED because the original route paths were wrong — the controller decorator is @Controller('convert'), so endpoints live under /api/convert/* (history, lineage/:id, restore/:id, result/:jobId), not /api/universal-conversion/*. Severity P1 unchanged.

### P1#37 — [Security (cross-cutting)] Exported and uploaded artifacts served as public static assets with no auth
- **File:** `backend/src/main.ts` — app.useStaticAssets(exportsDir, {prefix:'/exports'}) and app.useStaticAssets(uploadsDir, {prefix:'/uploads'})
- **Problem:** The /exports and /uploads directories are served by express static middleware (main.ts lines 80 and 87) with no authentication or ownership gate. Any file written there (generated PDFs, PPTX, PNG exports, uploaded images) is downloadable by anyone who knows or guesses the URL. helmet runs with crossOriginResourcePolicy cross-origin (line 61), so even CORP doesn't restrict cross-site fetches. Filenames include UUIDs but are returned to clients and can leak via referrers, logs, or shared links.
- **Root cause:** Static asset serving chosen for convenience instead of an authenticated streaming endpoint that checks per-file ownership.
- **User impact:** A leaked or guessed URL exposes a user's exported document to anyone, indefinitely.
- **Business impact:** Confidential document leakage; no revocation once a URL is known.
- **Security impact:** Broken access control on file serving (OWASP A01).
- **Exact fix:** Stop serving /exports (and ideally /uploads) as open static assets. Serve files through an authenticated controller that verifies the requesting user owns the underlying document/asset, sets Content-Disposition, and streams the buffer. If static serving must remain, use unguessable signed, expiring URLs (HMAC token + exp) verified by middleware.
- **Effort:** M (4-8 hours)
- **Verify:** Export a PDF as user A, capture the /exports/<file> URL. In an incognito session with no token, GET that URL and confirm it downloads today; after fix it returns 401/403.
- **Verification:** confirmed — Confirmed in main.ts lines 75-87: app.useStaticAssets is registered for exportsDir (prefix /exports) and uploadsDir (prefix /uploads) with no guard/middleware. These run as global Express static handlers and are not behind JwtAuthGuard. UUID filenames are security-by-obscurity only. Real broken access control on file serving.

### P1#38 — [Performance (cross-cutting)] Single-PDF export launches a fresh Chromium per request instead of using the browser pool
- **File:** `/Users/shadi/Desktop/Pitchonix/backend/src/pdf-generation/pdf-generation.service.ts` — PdfGenerationService.generatePdf (puppeteer.launch at line 77, browser.close at line 116)
- **Problem:** A dedicated BrowserPoolService (max 3 instances, pre-warmed, idle cleanup, crash eviction, retries) exists at backend/src/pdf-studio/services/browser-pool.service.ts and is used by pdf-studio's pdf/png/jpeg export services. But pdf-generation.service.ts ignores it and calls puppeteer.launch({headless:true,...}) on every export, then browser.close(). Cold-launching Chromium costs ~300-800ms CPU plus ~150-250MB RSS per call. Under concurrent exports this spawns unbounded Chromium processes with no cap, no reuse, and no queueing.
- **Root cause:** The pool was retrofitted only into the PdfStudioModule export services; the older PdfGenerationModule path was never migrated and still launches its own browser per call.
- **User impact:** Every PDF export pays a full browser cold-start; under load the box can exhaust memory/CPU spawning many Chromium processes, causing slow exports, timeouts, or OOM kills of the whole backend.
- **Business impact:** PDF export is a core deliverable; slow/failed exports during peak usage directly hurt conversion and retention, and the OOM risk can take down the entire API for all users.
- **Security impact:** None directly, though unbounded process spawning is a resource-exhaustion / DoS amplifier.
- **Exact fix:** Inject BrowserPoolService into PdfGenerationService and replace the puppeteer.launch/newPage/close block with this.browserPoolService.executeWithBrowser(async (browser) => { const page = await browser.newPage(); ... return; }). Register BrowserPoolService in PdfGenerationModule (or move it to a shared module imported by both). Remove the direct puppeteer.launch and browser.close.
- **Effort:** 0.5 day
- **Verify:** Fire 10 concurrent POSTs to the PDF generation endpoint and run `ps aux | grep -c chromium` (or pidof) during the burst. Before fix: process count grows ~1 per concurrent request. After fix: capped at <=3 (maxPoolSize). Also assert average export latency drops by the ~300-800ms cold-start.
- **Verification:** confirmed — Confirmed in code: line 3 imports puppeteer, line 77 `const browser = await puppeteer.launch({ headless:true, args:['--no-sandbox','--disable-setuid-sandbox'] })`, line 82 newPage, line 116 browser.close(). No BrowserPoolService reference anywhere in src/pdf-generation. Grep confirms BrowserPoolService exists and is used by pdf-studio's pdf-export/png-export/jpeg-export services, so the pool is real and this path bypasses it. Real as stated.

### P1#39 — [Performance (cross-cutting)] Excel Studio replays all workbook operations synchronously on every read/export with no caching
- **File:** `/Users/shadi/Desktop/Pitchonix/backend/src/excel-studio/excel-studio.service.ts` — buildWorkbookWithOperations (line 600) / readOriginalWorkbook (line 1472) / analyzeWorkbook (called at lines 344, 413, 1128, 1378, 1644)
- **Problem:** buildWorkbookWithOperations() does this on EVERY export, CSV download, snapshot, chart render, and analysis refresh: readOriginalWorkbook() -> fs.readFileSync(fullPath) (blocking sync disk I/O) -> XLSX.read(buffer,{cellFormula,cellDates,cellStyles,raw:false}) (full parse WITH styles — the slowest XLSX mode) -> then iterates and re-applies every approved operation in sequence. analyzeWorkbook() additionally runs XLSX.utils.sheet_to_json over every sheet (reading ALL rows before slicing for preview). None of this is cached: the same source file is re-read from disk and re-parsed on every single request, and the built workbook is thrown away each time. All of it is synchronous and runs on the Node event loop / request thread.
- **Root cause:** The operation-replay design recomputes derived state on demand instead of materializing/caching a current workbook buffer; fs.readFileSync + XLSX.read-with-styles are both event-loop-blocking and uncached.
- **User impact:** Every Excel preview, export, and CSV download blocks the event loop for the parse+replay duration (tens of ms to multiple seconds for large/heavily-edited workbooks), stalling ALL other requests on that process during the parse, not just the Excel user's.
- **Business impact:** Excel Studio feels sluggish and the whole API gets latency spikes whenever anyone exports a large workbook; limits how many concurrent Excel users the box can serve.
- **Security impact:** Resource-exhaustion vector: combined with the 50MB upload limit, a large workbook with many operations can monopolize CPU and stall the server.
- **Exact fix:** Cache the built workbook buffer keyed by (projectId, last-operation-sequence) — e.g. persist a 'currentWorkbookPath' column updated only when a new operation is approved, and read/serve that instead of replaying on each request. At minimum, switch readFileSync to fs.promises.readFile and move XLSX.read off the event loop (worker_threads or a Bull job) for files above a size threshold. Memoize analyzeWorkbook output (already stored on the project row) and avoid re-parsing for read-only endpoints.
- **Effort:** 2-3 days
- **Verify:** Create an Excel project with a ~5MB workbook and ~50 approved operations. Time 5 sequential exports and concurrently hit a cheap endpoint (e.g. GET /health). Before fix: each export re-reads+re-parses (measure with a log timer around buildWorkbookWithOperations) and the health endpoint latency spikes during exports. After fix: second+ exports serve a cached buffer (timer ~0 for replay) and health latency stays flat.
- **Verification:** confirmed — Confirmed: readOriginalWorkbook (line 1472-1475) does `XLSX.read(fs.readFileSync(fullPath), {cellFormula:true, cellDates:true, cellStyles:true, raw:false})` — synchronous read + slowest-mode parse. buildWorkbookWithOperations (line 600-607) calls it then replays every active operation with no caching of the result. Grep confirms it is invoked at lines 344 (export), 413, 1128 (CSV/chart sheet_to_json), 1378, 1644. No currentWorkbookPath/materialization exists. Real as stated.

### P1#40 — [Performance (cross-cutting)] CV import OCR runs synchronously inline on the request/event-loop thread
- **File:** `/Users/shadi/Desktop/Pitchonix/backend/src/career/career.controller.ts` — CareerController.importFile -> await this.importer.importFromFile (line 191) -> runOcrOnPdf (cv-import.service.ts line 300)
- **Problem:** The /career/profile/:profileId/import/file endpoint awaits importFromFile, which for scanned/sparse PDFs invokes runOcrOnPdf (renders pages via pdftoppm/poppler and runs Tesseract — the error text at cv-import.service.ts:343 confirms it shells out to pdftoppm + tesseract-ocr binaries). OCR of a multi-page PDF routinely takes 5-30+ seconds of CPU. There is a progress-job + SSE wrapper for UX, but the actual heavy work runs inline on the request, holding the HTTP connection open and consuming a CPU core for the whole duration. There is no offload to the existing Bull queue infrastructure (which is already used for CV EXPORT but not for import/OCR).
- **Root cause:** Import was built as a synchronous request handler with progress reporting bolted on; the CPU-heavy OCR stage was never moved to a worker thread or Bull job.
- **User impact:** Long-held requests that can hit proxy/gateway timeouts; during the CPU-bound OCR stage the Node process is busy and other users' requests on that worker stall.
- **Business impact:** Import is the on-ramp for the Career/CV product; slow or timing-out imports lose users at the critical first-use moment, and a few concurrent scanned-PDF imports can degrade the whole backend.
- **Security impact:** DoS amplification: a handful of large scanned PDFs (under the 20MB limit) can saturate CPU. Throttle of 5/5min per user mitigates but does not eliminate cross-user impact.
- **Exact fix:** Move the OCR/import work into a Bull queue (reuse the pattern from cv-export-queue.processor.ts): the endpoint enqueues a job and returns jobId immediately; the existing progress/SSE channel already supports async polling. Alternatively run runOcrOnPdf in a worker_thread/Piscina pool so it never blocks the main event loop. Cap concurrent OCR jobs.
- **Effort:** 2 days
- **Verify:** Upload a 10-page scanned PDF to /import/file and, during the import, hit GET /career/profile/import/progress/:jobId and any unrelated endpoint. Before fix: the import request stays open for the full OCR duration and unrelated endpoint latency spikes. After fix: the import POST returns a jobId in <500ms and OCR runs in the worker/queue without stalling unrelated requests.
- **Verification:** confirmed — Confirmed: career.controller.ts line 191 `importResult = await this.importer.importFromFile(...)` is awaited inline within the request handler. cv-import.service.ts line 300 calls `await runOcrOnPdf(buffer, {langs, maxPages:5, ...})` and the catch at line 343 references pdftoppm (poppler-utils) + tesseract-ocr binaries, confirming it shells out to external OCR. The progress/SSE wrapper (newJob, progress endpoint) exists but the heavy work still runs on the awaited request thread; no Bull enqueue. Note: maxPages:5 caps per-import OCR work, but the inline event-loop blocking and held connection remain. Real as stated.

### P1#41 — [Performance (cross-cutting)] In-memory cache is configured but used in only one path; all hot read paths are uncached and the cache can't scale
- **File:** `/Users/shadi/Desktop/Pitchonix/backend/src/app.module.ts` — CacheModule.register (lines 75-79) + PerformanceService (common/performance.service.ts)
- **Problem:** CacheModule.register({isGlobal:true, ttl:300, max:100}) uses the default in-process memory store (not Redis), capped at 100 items. A PerformanceService wrapper (getCached/cached/measure) exists but grep shows it is consumed in exactly ONE service: pdf-studio/services/content-analysis.service.ts. Every other hot read — project list (projects.service.findAll), deck+slides editor load (decks.service.findOne / slides.service), Excel listProjects/analysis, dashboard activity — queries Postgres directly with no caching. Because the store is in-memory, even where used it (a) is lost on every restart/deploy and (b) is not shared across instances, so it cannot back a horizontally-scaled deployment, and max:100 will thrash under real traffic.
- **Root cause:** Caching infrastructure was added but never wired into the actual high-frequency read paths, and was left on the non-distributed default memory store.
- **User impact:** Repeated identical reads (editor reloads, dashboard polling, template lists) re-hit the DB every time; latency does not improve with warmups and degrades under concurrency.
- **Business impact:** Higher DB load and worse p95 latency than necessary; blocks horizontal scaling because the cache is per-process and stateful.
- **Exact fix:** Switch CacheModule to a Redis store (cache-manager-ioredis-yet / cache-manager-redis-store — Redis is already a dependency for Bull) with a sensible max/ttl, then wrap the genuinely hot, idempotent reads (project list per user+filter, template/theme lists, deck-by-id for read-only viewers) in PerformanceService.cached with explicit invalidation on writes. Remove the misleading max:100 in-memory config.
- **Effort:** 2-3 days
- **Verify:** Hit GET /projects (same user/filters) 100x in a tight loop and inspect Postgres query logs / pg_stat_statements. Before fix: 100 SELECTs. After fix: ~1 SELECT then cache hits, and the cache survives a backend restart when backed by Redis.
- **Verification:** confirmed — Confirmed: app.module.ts lines 75-79 register CacheModule with {isGlobal:true, ttl:300, max:100} and no store (so default in-process memory). Grep across src shows PerformanceService is imported/provided only in pdf-studio.module.ts and injected only in content-analysis.service.ts — no other service consumes it. So the cache is non-distributed and wired into a single read path. Real as stated.

### P1#42 — [Performance (cross-cutting)] Batch and single PDF/PPTX export run as in-process fire-and-forget (no real queue); jobs orphan on restart
- **File:** `/Users/shadi/Desktop/Pitchonix/backend/src/export/services/batch-export.service.ts` — BatchExportService.createBatchJob -> this.processBatchJob(job.id).catch(...) (line 77, no await)
- **Problem:** Despite real Bull queues existing for 'generation' and CV export, batch export just calls this.processBatchJob(job.id) WITHOUT awaiting and detaches it with .catch(). processBatchJob then loops over deckIds sequentially (line 111) and for each deck runs a full Puppeteer PDF/PPTX render (exportToPDF at export.service.ts:790 does its own puppeteer.launch line 796) inside the SAME Node process that serves HTTP requests. Consequences: (1) heavy CPU/memory render work competes directly with request handling on the same event loop/process; (2) if the backend restarts or crashes mid-job, the ExportJob row is stuck in status 'processing' forever with no retry/recovery; (3) no concurrency cap across simultaneous batch jobs. The single-PDF pdf-generation path has the same in-process problem.
- **Root cause:** Export was implemented with detached promises instead of being enqueued onto the already-available Bull/Redis infrastructure used by generation and CV export.
- **User impact:** Large batch exports slow down the whole app for everyone; a deploy or crash during an export leaves the job permanently 'processing' (stuck spinner, never completes).
- **Business impact:** Unreliable bulk export undermines a premium/enterprise feature; orphaned jobs generate support load and erode trust.
- **Security impact:** Resource exhaustion: a user can trigger a large batch that monopolizes CPU/RAM and degrades the shared process for all tenants.
- **Exact fix:** Register a Bull queue (e.g. 'export') and move processBatchJob into a @Processor with bounded concurrency, attempts, and backoff (mirror cv-export-queue.processor.ts). queueBatchExport/createBatchJob and retryJob should only enqueue. Add startup recovery to mark previously-'processing' jobs as 'failed' (or requeue) on boot. Do the same for pdf-generation.service.
- **Effort:** 2-3 days
- **Verify:** Start a batch export of 5 decks, then kill -9 and restart the backend mid-run. Before fix: the ExportJob stays in 'processing' indefinitely and the render work was happening in the API process. After fix: the job is picked up by a Bull worker, survives restart (Redis-backed) or is cleanly marked failed/retried by startup recovery, and the API process p95 latency stays flat during the export.
- **Verification:** confirmed — Confirmed: batch-export.service.ts line 77 `this.processBatchJob(job.id).catch(...)` is fire-and-forget (also at line 349 in retryJob). processBatchJob loops deckIds sequentially (line 111) calling exportDeck -> exportService.exportToPDF/exportToPPTX. export.service.ts exportToPDF (line 790) does its own `puppeteer.launch` (line 796) in-process — not the browser pool, not a queue. No @Processor/registerQueue in src/export. ExportJob is set to 'processing' (line 90-96) with no startup recovery, so a deploy/crash orphans it. Real as stated.

### P1#43 — [Performance (cross-cutting)] PDF Studio editor autosave issues one PATCH per page (N+1, each with its own ownership query) every 3 seconds
- **File:** `/Users/shadi/Desktop/Pitchonix/frontend/app/pdf-studio/editor/[id]/page.tsx` — auto-save effect (lines 343-360): for (const page of pages) { await api.patch(`/pdf-pages/${page.id}`, {...}) }
- **Problem:** The 3-second debounced autosave loops over EVERY page in the document and awaits a separate sequential PATCH /pdf-pages/:id request per page — including pages that were never edited (the only dirty flag, isDirtyRef, is document-level, not per-page). Each PATCH on the backend (pdf-pages.controller.ts update at line 77 -> assertPageAccess line 78, which is a prisma.pdfPage.findUnique) runs an ownership query BEFORE the update (service.update line 72-73), so a 30-page document costs 30 sequential HTTP round-trips and ~60 DB queries (30 access checks + 30 updates) on every autosave cycle, even for a one-character edit on one page.
- **Root cause:** No dirty-tracking per page and no bulk/batch save endpoint; the client naively persists the whole pages array one request at a time. The existing pdf-pages.service $transaction (line 99-106) only handles reorder-by-pageId/index, not content/title saves.
- **User impact:** Editing large PDF documents produces a burst of dozens of requests every few seconds, causing visible lag, wasted bandwidth, and slow 'saved' confirmation; the sequential awaits make total save time scale linearly with page count.
- **Business impact:** Poor editor responsiveness on real (long) documents; multiplied across users this is significant needless backend and DB load.
- **Security impact:** None (ownership is checked), but the redundant per-page access checks amplify DB load.
- **Exact fix:** Track which pages are dirty client-side and PATCH only those. Add a bulk endpoint POST /pdf-pages/batch (or PATCH /pdf-documents/:id/pages) that accepts an array of {id, content, title}, verifies document ownership ONCE, and updates in a single transaction / updateMany loop. Send requests in parallel only as a fallback.
- **Effort:** 1 day
- **Verify:** Open a 30-page PDF document, edit one page, wait for autosave, and watch the Network tab + backend query log. Before fix: 30 PATCH requests and ~60 DB queries per save. After fix: 1 request and a single ownership check covering only the dirty page(s).
- **Verification:** confirmed — Confirmed on both ends. Frontend (lines 349-351): `for (const page of pages) { await api.patch(`/pdf-pages/${page.id}`, { content: page.content, title: page.title }) }` — unconditional loop over all pages, sequential awaits, gated only by document-level isDirtyRef. Backend pdf-pages.controller.ts line 77-79 `@Patch(':id') update` calls assertPageAccess (line 39-40 findUnique) then service.update (line 72-73 prisma.pdfPage.update) — one ownership findUnique + one update per page, no batch content endpoint. Real as stated.

### P1#44 — [Database (cross-cutting)] Ownership/reference columns lack foreign keys — orphaned rows on user/template delete
- **File:** `backend/prisma/schema.prisma` — CvDocument.userId, CvAnalysisSnapshot.userId, DeckVersion.userId, ReusableSlide.userId, ConvertedFile.userId/workspaceId/brandKitId, BetaTelemetry.userId, BetaFeedback.userId, CvSectionMappingMemory.userId, TemplateFavourite.templateId
- **Problem:** Many tables store a userId/workspaceId/templateId as a plain String with only an @@index, no @relation, so Postgres has NO foreign-key constraint. Verified against live DB information_schema: cv_documents.userId, cv_analysis_snapshots.userId, cv_section_mapping_memory.userId, deck_versions.userId, reusable_slides.userId, converted_files.userId/workspaceId/brandKitId, beta_telemetry.userId, beta_feedback.userId, and template_favourites.templateId all have NO foreign key. (cv_documents has FKs only on profileId+templateId; deck_versions only on deckId; converted_files only on parentId.) CvDocument cascades through profileId, but its userId column is a denormalized copy that can drift. deck_versions.userId is String? (system snapshots), so user IDs there are never validated. CORRECTION to first pass: template_favourites.userId DOES have a cascade FK to User — only its templateId is unconstrained, so user deletion already cleans favourites but template deletion leaves dangling favourite rows.
- **Root cause:** Schema author used denormalized String userId/workspaceId/templateId columns (a convenience copy alongside a relation, or for workspace-scoped tables) instead of declaring @relation fields. Prisma only emits FKs for declared relations.
- **User impact:** Stale/dangling rows after deletions: a user's CvAnalysisSnapshots, ReusableSlides, ConvertedFiles, BetaTelemetry/BetaFeedback, and section-mapping memory persist with a userId pointing at a non-existent user. TemplateFavourite rows survive deletion of the referenced Template (templateId has no FK), so favourites can reference missing templates and break the favourites list.
- **Business impact:** Data hygiene/GDPR risk: deleting a user does not fully erase their derived data (telemetry, snapshots, converted files). Reporting/analytics over these tables references ghosts.
- **Security impact:** GDPR/right-to-erasure exposure: user-linked telemetry and analysis snapshots are not guaranteed to be removed when the user is deleted (their userId columns have no cascade).
- **Exact fix:** For each genuinely user-owned table, declare a real relation with onDelete behavior: on ReusableSlide/ConvertedFile/BetaTelemetry/BetaFeedback/CvAnalysisSnapshot/CvSectionMappingMemory add `user User @relation(fields:[userId], references:[id], onDelete: Cascade)` (use SetNull where userId/workspaceId is nullable, e.g. ConvertedFile.userId? and DeckVersion.userId?). For TemplateFavourite add `template Template @relation(fields:[templateId], references:[id], onDelete: Cascade)` (userId already has its FK). Backfill-safe: add nullable+SetNull first if existing rows might dangle, then a migration creates the FK constraints. Decide explicitly which workspaceId/brandKitId columns should SetNull vs Cascade.
- **Effort:** M (schema changes + one migration + verify no existing orphan rows would violate the new FKs before adding them)
- **Verify:** In live DB run: DELETE a test user and confirm their beta_telemetry/cv_analysis_snapshots/reusable_slides rows remain (current bug, since those userId columns have no FK). After fix, the same delete should cascade/null them. Also: INSERT a template_favourites row with a random templateId — currently succeeds (proves no FK on templateId); after fix it must be rejected.
- **Verification:** adjusted — CONFIRMED via information_schema FK query. Confirmed NO FK on: cv_documents.userId, cv_analysis_snapshots.userId, cv_section_mapping_memory.userId, deck_versions.userId, reusable_slides.userId, converted_files.userId/workspaceId/brandKitId, beta_telemetry.userId, beta_feedback.userId, template_favourites.templateId. Schema confirms DeckVersion.userId is String? and ConvertedFile.userId/workspaceId/brandKitId are all String?. ADJUSTMENT: first pass listed template_favourites.userId among unconstrained columns, but the FK query and schema (line 1038) show template_favourites.userId HAS a cascade FK to User — only templateId lacks one. Symbol/problem/exactFix corrected to reflect this; brandKitId added. Severity P1 upheld.

### P1#45 — [Database (cross-cutting)] No index on the hottest ownership query path: projects(userId, archivedAt)
- **File:** `backend/src/projects/projects.service.ts` — findAll() — where: { userId, archivedAt: null }
- **Problem:** projects.service.ts findAll() builds the primary dashboard list query as `where: { userId, archivedAt: null }` (confirmed at line 30: `const where: any = { userId, archivedAt: null }`). But the projects table has NO index on userId. Verified via pg_indexes: only projects_pkey, projects_publicToken_key, and projects_workspaceId_idx exist. EXPLAIN of the dashboard query shows a Seq Scan with Filter on archivedAt IS NULL AND userId. Every dashboard load does a sequential scan filtered by userId.
- **Root cause:** The Project model declares @@index([workspaceId]) but was never updated to index userId even though userId remains the per-user list filter (workspace ownership was layered on top, not replacing userId filtering).
- **User impact:** Negligible at current scale (handful of projects) but the dashboard list — the most frequently hit authenticated query — degrades linearly as the projects table grows across all users, since it scans the whole table per user request.
- **Business impact:** Dashboard latency and DB CPU scale with total platform projects rather than per-user count; becomes a visible slowdown and cost driver as the product grows.
- **Exact fix:** Add to the Project model in schema.prisma: `@@index([userId, archivedAt])` (covers both active and archived list queries). Generate and apply a migration creating the composite index. Keep the existing workspaceId index.
- **Effort:** S (one index + migration)
- **Verify:** Run `EXPLAIN ANALYZE SELECT * FROM projects WHERE "userId"='<id>' AND "archivedAt" IS NULL;` against the live DB — currently shows Seq Scan on projects (verified). After adding the index it must show an Index Scan / Bitmap Index Scan on the new index.
- **Verification:** confirmed — CONFIRMED. pg_indexes on projects shows only pkey, publicToken_key, workspaceId_idx — no userId index. projects.service.ts line 30 builds `{ userId, archivedAt: null }`. EXPLAIN output: 'Seq Scan on projects ... Filter: ((archivedAt IS NULL) AND (userId = ...))'. Severity P1 appropriate as a scaling concern (low absolute volume today, so not P0).

## 6. Medium P2 Issues (33)
### P2#1 — [Dashboard] Dashboard stats are computed from a single paginated page (max 20), not real totals
- **File:** `/Users/shadi/Desktop/Pitchonix/frontend/app/dashboard/page.tsx` — fetchProjects (line 180) + stat computations (lines 302-311)
- **Problem:** fetchProjects reads response.data.data (the paginated slice, default limit 20 per projects.service.ts:51) and discards response.data.meta.total. All four stat cards and the 'N projects' count are derived from projects.length / reduce over this capped array. A user with 25+ projects sees 'Total Projects: 20', undercounted Decks Generated, and an average quality computed over only 20 projects.
- **Root cause:** Frontend ignores the meta.total returned by the backend and treats the first page as the full dataset; backend has no aggregate-stats endpoint.
- **User impact:** Inaccurate counts for any user with more than 20 projects; numbers silently cap and mislead.
- **Business impact:** Undercounts platform usage on the primary overview screen.
- **Exact fix:** Add a dedicated stats endpoint (e.g. GET /projects/stats returning {totalProjects, totalDecks, avgQuality, totalExports} computed across all of the user's projects via Prisma aggregate/count), and bind the four stat cards to it. As a stopgap, at minimum show meta.total for the project count instead of projects.length.
- **Effort:** M
- **Verify:** Seed a user with 25 projects. Load /dashboard. Total Projects card shows 20 (the page size) today; expected 25.

### P2#2 — [Create New] Excel creation types are absent from the unified Create New flow
- **File:** `/Users/shadi/Desktop/Pitchonix/frontend/components/wizard/Step1DocumentType.tsx` — DOCUMENT_TYPES / CATEGORIES
- **Problem:** The Create New wizard offers only Presentations, PDF Studio, and Career categories. None of the Excel creation types (Workbook, Dashboard, Financial Model, Report, Sales, Marketing) appear as creation cards. Excel creation is only reachable by separately navigating to /excel-studio (upload) or /excel-studio/smart-builder. The dashboard's only Excel touchpoint is a 'Product Suites' link to /excel-studio.
- **Root cause:** Excel Studio was added as an independent suite and never integrated into the unified document-type picker.
- **User impact:** Users expecting to create spreadsheets/financial models from the central Create New surface cannot; discoverability of Excel generation is low.
- **Business impact:** A whole product suite is siloed away from the main creation funnel, reducing usage of Excel features.
- **Exact fix:** Either add an 'Excel' category to DOCUMENT_TYPES with cards that route to /excel-studio/smart-builder?type=<preset> (matching smart-builder presets), or explicitly document that Excel creation lives in its own suite. If integrating, ensure handleFinish/pickCareer-style short-circuit routes Excel selections to the Excel builder.
- **Effort:** M
- **Verify:** On /create step 1, look for an Excel category with Workbook/Dashboard/Financial Model/etc. cards. EXPECTED if integrated: selecting one routes to the Excel builder. ACTUAL: no Excel cards exist.

### P2#3 — [Projects] Excel and Career projects are absent from the unified Projects list
- **File:** `/Users/shadi/Desktop/Pitchonix/backend/prisma/schema.prisma` — ExcelProject (1805) / CvProfile-CvDocument (1586+) vs Project (76)
- **Problem:** Excel projects live in ExcelProject and Career artifacts in CvProfile/CvDocument — entirely separate tables not joined to Project. The /projects and dashboard lists only query the Project table, so Excel and Career work never appears there. The audit requirement that the projects list route presentation->presentation, PDF->PDF Studio, Career->Career, Excel->Excel Studio cannot be satisfied because two of those artifact types are not even enumerated by this module.
- **Root cause:** No aggregation layer unifies the four artifact stores into a single project feed.
- **User impact:** Users who create Excel or CV documents cannot find or manage them from the central Projects/Dashboard view; they must know the separate /excel-studio/projects and career routes.
- **Business impact:** The 'single home for all your work' value proposition is not delivered; discoverability of Excel/Career features suffers.
- **Exact fix:** Add a unified feed endpoint (e.g. GET /projects/all) that UNIONs Project (presentation+pdf), ExcelProject, and CvDocument into a normalized {id,name,type,format,updatedAt,openHref} list, and render it on /projects with type-correct open routing.
- **Effort:** 1-2 days
- **Verify:** Create one project of each type (presentation, PDF, Excel, CV), open /projects, confirm all four appear and each opens its correct editor.

### P2#4 — [Projects] List cards show a generic icon, not real thumbnails
- **File:** `/Users/shadi/Desktop/Pitchonix/frontend/app/projects/page.tsx` — projects.map card (lines 139-187)
- **Problem:** Each card renders a static FileText icon. No slide/page preview is fetched even though SlideThumbnail exists and is used on the detail page (projects/[id]/page.tsx:431). The 'thumbnails' aspect of the list is effectively absent.
- **Root cause:** List rendering was not wired to the thumbnail component or any preview image field.
- **User impact:** Users cannot visually distinguish projects at a glance; all cards look identical aside from text.
- **Business impact:** Lower-quality browsing experience versus competitors that show deck/doc previews.
- **Exact fix:** Render SlideThumbnail for the first slide of decks[0] (presentation) or a PDF first-page preview when available; fall back to the icon only when no preview exists.
- **Effort:** 0.5 day
- **Verify:** Open /projects with at least one generated deck; confirm the card shows the first-slide thumbnail rather than a generic icon.

### P2#5 — [Presentations] Migration chrome-only fallback silently drops slide body content
- **File:** `backend/src/slides/slide-elements-migration.service.ts` — buildElementsForSlide (chrome-only fallback, line 215-216)
- **Problem:** When a slide's content lacks a valid smartComponent.elementTree, buildElementsForSlide logs an error and returns ONLY slide chrome (title + subtitle + pageNumber) via buildSlideChrome — no body reconstruction, no bullet extraction. The slide materializes with a heading and a page number and nothing else. The Tier 7 minimal body fallback was intentionally deleted. The code asserts 720/720 generated slides hit the smart path, but any slide arriving via a non-generator path (legacy import, partial content, a future generator bug) becomes a near-blank slide in editor and export.
- **Root cause:** Smart-component tree was made the sole rendering path and the defensive body-reconstruction fallback was removed, so missing/invalid trees degrade to blank rather than best-effort content.
- **User impact:** In the failure case the user sees a slide with just a title and page number; the actual content silently vanishes with only a server-side log to indicate why.
- **Business impact:** Low probability on the happy path but high blast radius if a generator regresses or imports are enabled — entire slides export blank.
- **Exact fix:** Restore a minimal body fallback (extract slide.content.body/bullets/text into a paragraph or bulletList element) when smartComponent.elementTree is missing/invalid, OR surface a visible in-editor placeholder ('Content failed to render — re-generate this slide') instead of silently emitting chrome only. Add a metric/alert when missingSmartComponent or invalidTrees > 0 (the pathMetrics counters at lines 200/207 already exist — wire them to an alert).
- **Effort:** small (half a day)
- **Verify:** Create/seed a slide whose content JSON has body text but no smartComponent.elementTree, run migrateOne, and inspect the resulting SlideElement rows: only heading/subtitle/pageNumber exist; the body text is absent in both canvas and export.
- **Verification:** confirmed — CONFIRMED (P2 unchanged). slide-elements-migration.service.ts lines 215-216 return this.buildSlideChrome(slide) as the chrome-only fallback with no body reconstruction, after logging error at lines 201-204 (invalid tree) or 208-212 (missing tree). pathMetrics.invalidTrees / missingSmartComponent counters exist (lines 200, 207) but are not surfaced as alerts.

### P2#6 — [PDF Studio] Standard templates are recolor/header variants, not structurally distinct layouts
- **File:** `backend/src/pdf-studio/templates/layout-components.ts` — LAYOUT_RENDERERS (SECTION_CARD / HERO_HEADER / FOOTER_BLOCK)
- **Problem:** All 32 standard templates in template-configs.ts feed the SAME structured renderer, which always emits a SECTION_CARD (left-border card), HERO_HEADER, and FOOTER_BLOCK. The only per-template differences are colorScheme, headerStyle (gradient/minimal/solid), cardStyle (border-radius), and spacing. The structural layout is identical across every standard template, so they look like recolors of one design. Only the Pro templates (pro-template-renderer) provide genuinely distinct page structures.
- **Root cause:** generateStructuredPages is layout-agnostic; templateType only mutates the style object, not the component arrangement.
- **User impact:** The UI advertises '20+ templates' but standard templates are visually near-identical except for color and corner radius; users perceive low value/variety.
- **Business impact:** Undermines the templates value proposition; pushes users to expect designs that the standard tier does not deliver.
- **Exact fix:** Either (a) route more document types through distinct Pro-template renderers, or (b) make generateStructuredPages branch on template archetype (e.g. sidebar layout, two-column report, dashboard-grid) so structure—not just color—varies. At minimum, relabel standard templates as 'color themes' in the UI to match reality.
- **Effort:** L (multi-day for real distinct layouts) or S (relabel)
- **Verify:** Export the same document with templateType=clean_business_report vs strategy_document vs financial_report. Diff the structural HTML (ignoring color tokens) — currently identical component tree.

### P2#7 — [PDF Studio] DOCX export repeats the same generic heading for every continuation page of a section
- **File:** `backend/src/pdf-studio/services/docx-export.service.ts` — DocxExportService.buildDocxDocument
- **Problem:** For every non-cover page the DOCX renderer emits page.title as a HEADING_1. The planner (rule-based-page-planner makeContentPage) assigns pageTitle = headingBlock?.cleanText || section.title to ALL pages of a section, so a section split across multiple continuation pages yields the same H1 repeated N times in the Word doc. The preview merges these pages and shows the heading once, so the defect is DOCX-specific (preview/DOCX divergence).
- **Root cause:** DOCX export does not detect continuation pages (page.content.isContinuation) and unconditionally prints each page.title as a heading.
- **User impact:** A long section produces a Word doc with the same heading (e.g. 'Market Analysis') repeated on consecutive pages — looks broken/unprofessional.
- **Business impact:** DOCX exports appear low-quality; reflects poorly on the product for users who edit in Word.
- **Exact fix:** In buildDocxDocument, skip emitting the page-title heading when page.content?.isContinuation is true (or when the previous page shares the same title), matching the preview's i>0 sub-header suppression.
- **Effort:** S (1-2 hours)
- **Verify:** Generate a doc with one section long enough to span 2-3 pages, export DOCX, and confirm the section heading appears once, not once per continuation page.

### P2#8 — [Career Docs] Imported 'publications' (and resume languages/projects/awards/references) silently never render in export/preview
- **File:** `/Users/shadi/Desktop/Pitchonix/backend/src/career/cv-types.ts` — DEFAULT_CV_SECTION_ORDER / DEFAULT_RESUME_SECTION_ORDER; cv-html-renderer.cvHtml; cv-documents.service.defaultContent
- **Problem:** cvHtml renders only sections listed in doc.content.sectionOrder. DEFAULT_CV_SECTION_ORDER omits 'publications'; DEFAULT_RESUME_SECTION_ORDER omits languages, projects, awards, references, publications. New documents created from an import (openImportedCvInEditor -> POST /career/documents with no content -> defaultContent) get the default order. So if the parser extracted a Publications section (or, for a resume, Languages/Projects/etc.), that content lives in the profile but is invisible in HTML preview, PDF, and DOCX until the user manually adds the section in the builder.
- **Root cause:** Section visibility is gated by a fixed default order that does not include every section the parser can populate; there is no 'append any populated-but-missing sections' step at render or document-create time.
- **User impact:** A candidate with publications (academics/researchers) or a resume with a languages/projects section exports a CV that is missing real content they entered/imported, with no warning. Looks like data loss.
- **Business impact:** Perceived data loss on export is a high-severity trust issue for a CV product; academic/research users are disproportionately affected.
- **Exact fix:** In cvHtml (and the resume default), after computing `order`, append any section key that is non-empty in the profile but absent from `order`. Alternatively add 'publications' to DEFAULT_CV_SECTION_ORDER and broaden DEFAULT_RESUME_SECTION_ORDER, and have defaultContent include any populated sections from the linked profile at document-create time.
- **Effort:** low
- **Verify:** Import a CV containing a Publications section, open it in the builder, export PDF. Confirm (current) publications are absent from the PDF while present in the profile API response; after fix, confirm they render.

### P2#9 — [Career Docs] Profile photo missing from PDF/HTML export in production (relative /uploads URL unresolvable by Puppeteer)
- **File:** `/Users/shadi/Desktop/Pitchonix/backend/src/career/cv-html-renderer.ts` — assetUrl()
- **Problem:** assetUrl() returns a bare relative '/uploads/...' path when NODE_ENV==='production' and none of PUBLIC_BACKEND_URL/BACKEND_PUBLIC_URL/API_PUBLIC_URL/NEXT_PUBLIC_API_URL is set. CvExportService.htmlToPdf uses page.setContent(html) which has no base URL, so a relative image src cannot be resolved and the <img> fails silently.
- **Root cause:** Image URLs are emitted relative; PDF rendering path provides no document base URL; production origin resolution depends on env vars that may be unset.
- **User impact:** In production, CVs that include a profile photo export with a broken/empty image — the photo the user uploaded does not appear in the downloaded PDF/HTML.
- **Business impact:** Photo-based premium templates (Executive Photo, etc.) lose their main visual element on export in production, degrading output quality for paying users.
- **Exact fix:** Make photo embedding deterministic: either (a) read the file from disk and inline it as a data: URI in assetUrl/renderHeader when the path starts with /uploads/, or (b) set a base href in the exported HTML <head> and/or pass a baseURL to Puppeteer, and ensure one backend-public-URL env var is always configured in production with a startup assertion.
- **Effort:** medium
- **Verify:** With NODE_ENV=production and all backend-URL env vars unset, upload a photo, export PDF, and inspect: confirm the <img src> is a bare /uploads path and the photo is absent. After fix (data-URI inline), confirm the photo renders regardless of env.

### P2#10 — [Excel Studio] Snapshot diff engine is implemented and correct but unreachable from the UI; 'Before/After' view is static
- **File:** `frontend/app/excel-studio/editor/[id]/page.tsx` — BeforeAfterView / compareExcelWorkbookSnapshots
- **Problem:** The backend compareWorkbookSnapshots + GET /snapshots/compare and the api.ts client compareExcelWorkbookSnapshots are real and verified by spec, but grep shows compareExcelWorkbookSnapshots is never called anywhere in the frontend. The editor's 'Before / After' tab renders BeforeAfterView, which only prints sheet names and the enhancementPlan strings — no diff, no snapshot selection, no changed-cell list.
- **Root cause:** UI diff feature was not wired; the view was built as descriptive marketing copy instead of consuming the diff endpoint.
- **User impact:** Users cannot see what actually changed between snapshots; the 'Before / After' tab implies a comparison but shows none.
- **Business impact:** A real, valuable differentiator (change auditing) is shipped dark, reducing perceived and actual capability.
- **Exact fix:** Add snapshot pickers in BeforeAfterView (or SnapshotsPanel) that call compareExcelWorkbookSnapshots(before, after) and render diff.added/removed/changed (cells, sheets, merges). Reuse existing ExcelWorkbookDiff type.
- **Effort:** medium
- **Verify:** Create two snapshots with a cell change between them, open Before/After, select both, and confirm the changed cell address/value appears (network call to /snapshots/compare fires).

### P2#11 — [Excel Studio] setFormula stores cachedValue 0 and engine never recalculates — formula cells show 0 until reopened in Excel
- **File:** `backend/src/excel-studio/excel-studio.service.ts` — applySetFormula
- **Problem:** applySetFormula writes { t:'n', f:formula, v: payload.cachedValue ?? 0 }. The frontend commitEdit sends setFormula with NO cachedValue, so v defaults to 0. SheetJS does not evaluate formulas, so the cached value stays 0 in analysis, CSV export, and any preview until the file is opened in Excel (which recalculates). Audit/score numbers derived from formula cells reflect 0, not the real result.
- **Root cause:** No formula evaluation engine; cachedValue is optional and usually absent from the UI.
- **User impact:** A cell where the user typed =B2*2 shows/exports as 0 in Pitchonix views and CSV until opened in Excel; analyzer treats it as 0.
- **Business impact:** Undermines the 'formula-aware audit' claim — derived metrics can be wrong in-app and in CSV/JSON exports.
- **Exact fix:** Integrate a lightweight evaluator (e.g. hyperformula or formulajs) to compute cachedValue on setFormula, or have the frontend send the displayed result as cachedValue. Recompute dependent formula cached values after any cell edit.
- **Effort:** medium
- **Verify:** Set A1=2, then formula =A1*5 in B1 via the editor, export CSV and read B1: assert it is 10, not 0.

### P2#12 — [Brand Kits] PDF Studio getBrandKit does not enforce kit ownership
- **File:** `backend/src/pdf-studio/services/brand-kit.service.ts` — getBrandKit (lines 102-110)
- **Problem:** getBrandKit loads the kit via prisma.brandKit.findUnique({ where: { id: brandKitId } }) with no userId/workspace check, unlike brand-kits.service.findOne which enforces brandKit.userId === userId. If a document's brandKitId can be set to another user's kit id, that kit's colors/fonts/logo would be resolved and rendered.
- **Root cause:** Two parallel brand-kit resolution services; the PDF-studio one skips the ownership guard the canonical service has.
- **User impact:** Low direct user impact but a tenancy leak: another tenant's brand identity (logo URL, palette, company name) could be rendered into a document by supplying their kit id.
- **Business impact:** Cross-tenant data exposure risk for brand assets.
- **Security impact:** IDOR — a user can resolve and render any brand kit by id, leaking logo URL, colors, and identity.companyName across workspaces.
- **Exact fix:** Pass the requesting userId into getBrandKit and validate brandKit.userId === userId (or workspace membership) before returning; otherwise return DEFAULT_BRAND_KIT. Mirror brand-kits.service.findOne's guard.
- **Effort:** 2-3 hours
- **Verify:** As user A, create a PDF document and set brandKitId to a kit owned by user B; trigger render and confirm B's branding is (incorrectly) applied. After fix, render falls back to default.

### P2#13 — [Brand Kits] No brand-guidelines / brand-book export — only raw JSON/ZIP of config
- **File:** `backend/src/brand-kits/brand-kits.controller.ts` — exportKit / exportZip
- **Problem:** The task and typical brand-kit products expect a shareable brand-guidelines document (PDF showing logo usage, palette swatches with hex, typography specimens). The only exports are exportKit (machine JSON) and exportZip (assets+JSON). No human-readable guidelines artifact is produced.
- **Root cause:** Feature scope stopped at portable transport, not a presentation-quality guidelines deliverable.
- **User impact:** Users cannot hand a designer/agency a brand guidelines PDF.
- **Business impact:** Gap vs competitor brand-kit offerings.
- **Exact fix:** Add GET /brand-kits/:id/guidelines.pdf that renders an HTML guidelines page (swatches, type specimens, logo grid) via the existing Puppeteer PDF pipeline. Reuse element-html-renderer or a dedicated template.
- **Effort:** 1-2 days
- **Verify:** Call the new endpoint and confirm it returns application/pdf with palette hex codes and logo images embedded.

### P2#14 — [Convert] Batch jobs are in-memory only and lost on restart; frontend can wedge
- **File:** `backend/src/universal-conversion/universal-conversion.service.ts` — startBatch / batches Map
- **Problem:** Batch jobs live in a per-process Map. A server restart loses all jobs; GET /convert/status/:jobId then 400s 'Unknown jobId'. The frontend BatchPanel polls and after 5 failures marks the job failed. Results are never persisted to history either.
- **Root cause:** No durable job store; batch state is ephemeral.
- **User impact:** Long-running or in-flight batches vanish on deploy/restart; users see a generic failure.
- **Business impact:** Batch convert is unreliable under normal ops (deploys), undermining the '∞ batch' claim.
- **Exact fix:** Persist batch jobs (DB or queue) or at minimum record each completed file via lineage.record so results survive; return a clearer status for unknown/expired jobs.
- **Effort:** medium
- **Verify:** Start a batch, restart the backend, then poll /convert/status/:jobId — observe the 400 and the frontend failure path.

### P2#15 — [Import PPTX] Per-run rich text formatting is extracted but dropped at render time
- **File:** `frontend/features/slide-editor/renderers/index.tsx` — textContent / TextRenderer
- **Problem:** text-run-extractor.ts captures runs[] with bold/italic/underline/size/color/font and stores them in content.runs. The editor text renderer's textContent() reads only content.text and content.html; content.runs is ignored and html is undefined, so all mixed-run formatting (a bold phrase, a colored word, larger title segment) is flattened to uniform body text.
- **Root cause:** TextRenderer has no path to convert runs[] into styled HTML; it only consumes flat text.
- **User impact:** Imported text loses inline bold/italic/color/size variation; visual fidelity is lower than the report's high text scores imply.
- **Business impact:** Imported decks look less faithful than promised; users must re-apply formatting manually.
- **Exact fix:** In the importer or renderer, synthesize content.html from runs[] (span per run with inline style for bold/italic/color/fontSize), or extend TextRenderer to map runs to styled spans. AutoFitText already supports innerHTML, so populating content.html is the smaller change.
- **Effort:** M
- **Verify:** Import a slide whose title mixes a bold red word with normal text; confirm the editor shows bold+red on that word, not uniform text.

### P2#16 — [Import PPTX] Hardcoded 'Average fidelity' bars presented as real aggregate data
- **File:** `frontend/app/pptx-import/page.tsx` — PptxImportPage hero block (lines ~151-166)
- **Problem:** The hero card renders a fixed array [{Text frames 96},{Layout 88},{Images 92},{Charts 78},{Tables 84}] under the label 'Average fidelity / Across all categories'. These are static constants shown before (and regardless of) any upload, implying measured platform performance that does not exist.
- **Root cause:** Decorative marketing numbers hardcoded in JSX rather than derived from data.
- **User impact:** Misleading; users may trust specific fidelity percentages that are invented.
- **Business impact:** Overstated capability claim on a user-facing studio page.
- **Exact fix:** Either label the block explicitly as 'illustrative' / 'typical ranges', or drive it from real aggregated import-report data. Do not present invented numbers as 'Average fidelity'.
- **Effort:** S
- **Verify:** Load /pptx-import with no upload: the bars still show 96/88/92/78/84. Confirm these never change with any imported file.

### P2#17 — [Analytics] Chart labeled/variabled as a trend but contains no time dimension
- **File:** `/Users/shadi/Desktop/Pitchonix/frontend/app/analytics/page.tsx` — trendData (line 54) + 'Views & Exports by Project' chart
- **Problem:** The data array is named `trendData` (line 54) and the section header uses a TrendingUp icon (line 84), implying a trend over time, but the chart is a per-project categorical bar chart of current cumulative counts — X axis is project names (line 93), there is no date axis, no time bucketing, and no date-range control. There is zero time-series analytics in the module despite the brief calling for date ranges/usage-over-time.
- **Root cause:** No timestamped event/analytics table exists; counters are scalar fields (viewCount/exportCount), so trends cannot be derived. Naming/iconography overstate capability.
- **User impact:** Users expecting trend/over-time insight (and a date filter) get only a static snapshot. Misleading affordance.
- **Business impact:** Module reads as more capable than it is; no ability to answer 'how is usage changing' questions.
- **Exact fix:** Either (a) rename variable/header to reflect 'by project' snapshot and remove the trend framing (TrendingUp icon + 'trendData' name), or (b) introduce an events/analytics table (timestamped view/export events) and build real time-series with a date-range picker. (a) is the honest quick fix; (b) is the real feature.
- **Effort:** S (rename) / L (real time-series)
- **Verify:** Inspect the chart: X axis is project names, no date axis, no date-range control anywhere on the page. Confirms it is not a trend.
- **Verification:** confirmed — Confirmed. page.tsx:54 names the array trendData; line 84 renders a TrendingUp icon; line 93 sets XAxis dataKey='name' (project names). No date axis or date-range control anywhere on the page. It is a per-project snapshot, not a trend.

### P2#18 — [Settings] Profile/2FA changes not written back to auth store; no user refresh on boot
- **File:** `/Users/shadi/Desktop/Pitchonix/frontend/app/settings/page.tsx` — handleSaveProfile / handleEnable2FA / handleDisable2FA
- **Problem:** handleSaveProfile PATCHes name but never calls setUser; the 2FA handlers update local twoFaEnabled state but never update store user.twoFactorEnabled. The auth store is persisted to localStorage and is populated only from the login response — there is no GET /users/me refresh on app load (only SlideEditor fetches it for an unrelated purpose). So after saving a new name or toggling 2FA, the nav/store and a hard refresh still show the stale login-time values until the user logs out and back in.
- **Root cause:** Settings mutations update the backend but not the client-persisted store, and the app never re-fetches the current user after boot.
- **User impact:** Renamed user still sees old name in the nav/store after refresh; the 2FA status badge can disagree with the backend after refresh.
- **Business impact:** Confusing stale state; looks buggy.
- **Exact fix:** After successful PATCH /users/me, call setUser({ ...user, name }); after enable/disable 2FA call setUser({ ...user, twoFactorEnabled }). Optionally add a GET /users/me on app boot that hydrates the store (and have GET /users/me select twoFactorEnabled, which it currently omits).
- **Effort:** low
- **Verify:** Change your name, save, hard-refresh. The sidebar/nav still shows the old name. Enable 2FA, refresh — store user.twoFactorEnabled is unchanged from login.

### P2#19 — [Settings] OAuth/Google users can never change or set a password
- **File:** `/Users/shadi/Desktop/Pitchonix/backend/src/auth/auth.service.ts` — validateGoogleUser (password:'' at line 208) + users.service.changePassword
- **Problem:** Google sign-up creates the user with password:''. changePassword runs bcrypt.compare(currentPassword, user.password) against that empty hash, which always returns false -> 'Current password is incorrect'. There is no 'set password' path for OAuth-only accounts, so a Google user can never establish password credentials, and the Security form is unusable for them.
- **Root cause:** Empty-string password placeholder for OAuth accounts (auth.service.ts line 208), combined with a changePassword flow that unconditionally requires a valid current password.
- **User impact:** Google users see the Change Password form but every attempt fails with a misleading 'Current password is incorrect' error; they cannot add a password fallback.
- **Business impact:** Locks OAuth users to Google-only login; if Google access is lost, the account is effectively inaccessible via password.
- **Security impact:** Low-moderate; reduces account recovery options. Note bcrypt.compare against '' returning false is safe, not a bypass.
- **Exact fix:** Detect OAuth-only accounts (no real password hash) and offer a 'Set password' flow that skips the current-password check; or hide/relabel the Change Password form for such accounts. Store null (not '') for OAuth password and branch accordingly.
- **Effort:** medium
- **Verify:** Sign in via Google, go to Settings > Security, enter a new password and any current password — it always returns 'Current password is incorrect'.

### P2#20 — [Help & Support] Help page has no documentation search and FAQ is 5 hardcoded strings
- **File:** `frontend/app/help/page.tsx` — FAQ constant (lines 8-29)
- **Problem:** The audit brief calls for documentation links, search, FAQ, and tutorials. The Help page exposes only a static FAQ array of 5 hardcoded Q/A objects, a static Getting Started ordered list, and a static document-type grid. There is no search input, no documentation links (the 'Coming Soon' docs block was previously removed per the in-file comment at line 118-120), and no tutorial content. Nothing is data-driven or searchable.
- **Root cause:** Help was implemented as a single static marketing-style page rather than a help center backed by content. No search index, no articles model, no docs.
- **User impact:** Users cannot search for help; they can only scan 5 FAQs. Any question outside those 5 items (e.g. Excel Studio, PPTX import, collaboration, billing) has no answer and pushes them to the mailto path, which is itself unbacked.
- **Business impact:** Higher inbound support load, poor self-serve. The 'Help & Support' nav entry over-promises relative to the thin static content.
- **Exact fix:** Either (a) integrate a real help-article source (MDX/CMS or a help_articles table) with a client-side or server search box and route documentation links to real pages, or (b) honestly rename/scope the page to 'FAQ & Getting Started' and ensure FAQ coverage spans all shipped modules. At minimum add a search box that filters the FAQ array client-side and expand FAQ to cover Excel Studio, PPTX import, sharing, and account/billing.
- **Effort:** 1-2h for client-side FAQ search + expanded FAQ; 1-2 days for a real searchable help center
- **Verify:** Load /help: confirm there is no search input in the DOM today (grep page.tsx for 'input'/'search' → none). After fix: type a query, confirm the FAQ list filters; click any documentation link and confirm it routes to a real page (no 404).

### P2#21 — [Help & Support] Feedback/bug-report widget is only mounted on career pages, absent from Help and the rest of the app
- **File:** `frontend/features/career/FeedbackWidget.tsx` — FeedbackWidget (mounted in frontend/app/career/page.tsx line 68 and frontend/app/career/ats/page.tsx line 465)
- **Problem:** The only working bug/feedback channel in the product is FeedbackWidget, which POSTs /career/feedback → persists to the beta_feedback table (career.controller.ts submitFeedback, lines 986-1000) and is admin-visible via the beta-telemetry page. But grep shows it is rendered ONLY on /career and /career/ats. It is not on /help, the dashboard, PDF Studio, Excel Studio, convert, or pptx-import. The Help & Support page — the natural home for 'report a bug' — has no feedback widget at all.
- **Root cause:** The widget was scoped as a Phase Ω.4 career-beta instrument and never lifted into a global app shell, so the only real reporting path is invisible outside the career module.
- **User impact:** A user on /help, the dashboard, or PDF/Excel Studio who hits a bug has no in-app way to report it (the contact backend is dead, see P1). They must navigate to a career page to find the floating Feedback button, which is non-obvious.
- **Business impact:** Most bug reports are never captured because the only working capture surface is buried in one module. Telemetry/feedback data is skewed toward career usage.
- **Exact fix:** Lift FeedbackWidget into the global AppShell (frontend/components/AppShell.tsx) so it renders on every authenticated page including /help, OR add it explicitly to /help and the other studio pages. Keep the same POST /career/feedback endpoint (or generalize the route to /feedback if career-coupling is undesirable). Pass a page-context prop per route.
- **Effort:** 1-2h (mount in AppShell, optionally rename route to a neutral /feedback)
- **Verify:** grep -rln FeedbackWidget frontend/app → today only career/page.tsx and career/ats/page.tsx. Open /help and /dashboard in browser: confirm no Feedback button today. After fix: confirm the floating Feedback button appears on /help, submit a 'bug' entry, and verify a new row in beta_feedback and that it shows on the admin beta-telemetry page.

### P2#22 — [Templates (cross-cutting)] Presentation templates are visual-identity-distinct but element geometry is shared across families (layout uniqueness is partial)
- **File:** `backend/src/components/smart/family-tokens.ts` — FamilyTokens / smart-component builders
- **Problem:** The 20 presentation templates map to smart families that supply only tokens (colors, fonts, radius, strokeWidth, shadow, spacing, labelTransform). Actual element layout (positions/structure) comes from shared smart-component builders that are family-agnostic. Families differ in look (defensible) but not in element placement/composition. registry.ts also advertises per-slide-type 'accents' (strip/divider) explicitly 'not yet wired in renderer'.
- **Root cause:** Family tokens were intentionally scoped to theming; per-family layout differentiation was not implemented.
- **User impact:** Templates feel like palette swaps with typographic personality rather than distinct layouts.
- **Business impact:** Acceptable for a themed deck system but below the bar implied by 20 'distinct' templates across 11 categories.
- **Exact fix:** Optionally introduce per-family layout variants in the smart-component builders keyed off family, and wire the declared per-slide-type accent strips. Otherwise document templates as themes, not layouts.
- **Effort:** L (multi-day if implementing per-family layout variants; S to relabel as themes)
- **Verify:** Apply ultra-minimal-swiss vs editorial-business-report to the same deck and compare element bounding boxes per slide. Expect identical geometry, only token/color/font differences.

### P2#23 — [Templates (cross-cutting)] Dead recolor code (deriveElementStyle) shipped and documented as the template-apply mechanism
- **File:** `frontend/features/slide-editor/templates/registry.ts` — deriveElementStyle
- **Problem:** registry.ts contains a fully implemented, carefully scoped deriveElementStyle() (recolors only theme-driven fields, preserves user styles) and extensive comments describing non-destructive per-element restyle. It is exported but never imported/called in the apply flow (applyTemplate.ts uses the backend pipeline). Misleading dead code that masks the actual destructive behavior (P0).
- **Root cause:** Implementation pivoted to backend pipeline-driven regeneration; the original client-side non-destructive path was left in place.
- **User impact:** None directly, but misleads maintainers/auditors into believing template apply is non-destructive.
- **Business impact:** Maintenance risk and false documentation.
- **Exact fix:** Either wire deriveElementStyle() into a real non-destructive apply path (preferred, also fixes the P0) or delete it and correct the applyTemplate.ts/registry.ts comments to describe the actual regenerate-and-replace behavior.
- **Effort:** S (deletion + comment fix; or folded into the P0 fix)
- **Verify:** Grep the codebase for deriveElementStyle( call sites — only the definition (registry.ts:713) exists; no caller. Confirms it is dead.
- **Verification:** confirmed — Confirmed dead. grep across frontend for deriveElementStyle returns only the definition at registry.ts:713 and a mention in the applyTemplate.ts comment (line 14). No call site exists. Reinforces the P0 finding.

### P2#24 — [Exports (cross-cutting)] Legacy /export deck endpoints are element-blind and would export near-blank files; also missing ownership check (IDOR)
- **File:** `backend/src/export/export.service.ts` — generateDeckHTML / exportToPptx / addSlideToPptx
- **Page:** n/a (API only)
- **Problem:** The legacy /export/pptx, /export/pdf and /export/decks/:deckId/export read the OLD slide.type + slide.content model. generateDeckHTML only emits slide.title, slide.subtitle, and content.painPoints/features/description/amount; the element-aware editor stores content in SlideElement rows which these ignore. Invoking them on a modern deck yields slides with only a title (or blank). Additionally these endpoints have JwtAuthGuard but no deck-ownership check, so any authenticated user can export any deckId passed in the body.
- **Root cause:** Dead legacy code path left mounted after the element-based pipeline (/slide-export) superseded it. No frontend currently calls it (export-templates page is a 'coming soon' placeholder; lib/export-api.exportDeck is unused), but the routes are live and reachable via Swagger/API.
- **User impact:** None today (no UI caller), but any client/integration hitting these documented endpoints gets degraded/blank exports and can read other users' decks.
- **Business impact:** Maintenance/security debt; confusing duplicate export API surface; IDOR exposure of deck content.
- **Security impact:** IDOR: /export/pptx and /export/pdf fetch deck by body deckId with no userId scoping — cross-tenant deck export.
- **Exact fix:** Either delete the legacy export.controller/service deck routes (and the unused frontend export-api functions), or gate them behind ownership checks and route them through the element-aware SlideExportService. At minimum add a deck-ownership assertion to /export/pptx and /export/pdf.
- **Effort:** M (about half a day to remove safely or add ownership + redirect to slide-export)
- **Verify:** As user A, POST /export/pptx {deckId:<user B's deckId>} with A's JWT — succeeds and returns a (title-only) PPTX of B's deck, proving both element-blindness and IDOR.

### P2#25 — [Security (cross-cutting)] No file-size limit on multipart uploads (memory-exhaustion DoS)
- **File:** `backend/src/upload/upload.controller.ts` — FileInterceptor('file') / FilesInterceptor('files',10) (also pptx-import, universal-conversion, image-upload)
- **Problem:** FileInterceptor is used with no { limits: { fileSize } } and there is no global MulterModule.register with default limits. Multer buffers the ENTIRE request body into memory before the handler's post-hoc size check (UploadService.validateFile runs after file.buffer is fully populated; universal-conversion checks file.size > 100MB only after buffering). The only mitigations are the JSON body parser limit (10mb, which does not bound multipart) and the global rate limiter. Excel-studio is the only upload with a real interceptor-level limit (50MB).
- **Root cause:** Size validation implemented at the service layer instead of at the multer interceptor boundary; no global multer limits.
- **User impact:** n/a direct.
- **Business impact:** An authenticated user can send large multipart bodies to exhaust server memory and crash the backend (single-process, and uncaughtException handlers keep it limping rather than recovering cleanly).
- **Security impact:** Denial of service (OWASP A05 misconfiguration).
- **Exact fix:** Add { limits: { fileSize: 5*1024*1024 } } (or the appropriate per-endpoint cap) to every FileInterceptor/FilesInterceptor, or register MulterModule.register({ limits: { fileSize } }) globally so multer aborts oversized uploads before buffering.
- **Effort:** S (1-2 hours)
- **Verify:** POST a 200MB file to /api/upload/image and observe memory spike / full buffering before rejection; after fix multer rejects with 413 before buffering completes.

### P2#26 — [Security (cross-cutting)] pptx-import 'into-project' injects slides into any project without ownership check
- **File:** `backend/src/pptx-import/pptx-import.controller.ts` — PptxImportController.intoProject (POST /api/pptx-import/into-project)
- **Problem:** The handler accepts a projectId via @Body and imports parsed slides into that project. The controller has JwtAuthGuard but no @GetUser and no verification that the caller owns the target project, so any authenticated user can inject slides/content into another user's project.
- **Root cause:** Project ownership not validated before mutating the target project.
- **User impact:** A user's project can be polluted with content imported by another user.
- **Business impact:** Cross-tenant data tampering / content pollution.
- **Security impact:** Broken access control (OWASP A01).
- **Exact fix:** Inject @GetUser() user and verify the project's userId (or workspace membership) matches before importing; reject with 403 otherwise.
- **Effort:** S (1 hour)
- **Verify:** As user B, POST a pptx to /api/pptx-import/into-project with user A's projectId and confirm slides land in A's project; after fix returns 403.

### P2#27 — [Security (cross-cutting)] Login issues JWT without enforcing email verification or 2FA; register auto-logs-in unverified users
- **File:** `backend/src/auth/auth.service.ts` — AuthService.login / AuthService.register
- **Problem:** login() returns a fully valid JWT after only a bcrypt password check — it never checks user.isVerified and never branches into the 2FA challenge even when twoFactorEnabled is true (the 2FA endpoints exist separately but the password-login path bypasses them). register() also calls generateToken and returns a token immediately, so an unverified account is fully usable before email verification.
- **Root cause:** Token issuance not gated on verification/2FA state in the primary credential flow.
- **User impact:** Users who enabled 2FA are not actually protected by it on password login; unverified emails get full access.
- **Business impact:** 2FA is effectively cosmetic for the password flow; account-takeover risk if a password is compromised despite 2FA being on; spam/abuse from unverified accounts.
- **Security impact:** Authentication weakness (OWASP A07) — MFA bypass on the primary login path.
- **Exact fix:** In login(), if user.twoFactorEnabled, do not return a session token; instead return a short-lived 2FA challenge token and require the TOTP code to be verified before issuing the full JWT. Optionally require isVerified (or restrict capabilities) before issuing a usable token, and reconsider auto-login on register.
- **Effort:** M (3-6 hours)
- **Verify:** Enable 2FA for a user, then call POST /api/auth/login with correct email+password and confirm a usable JWT is returned today without any TOTP code; after fix login returns a challenge requiring the code.

### P2#28 — [Performance (cross-cutting)] Excel Studio listProjects returns full per-sheet analysis blobs (cells, merges, previewRows) with no field selection or pagination
- **File:** `/Users/shadi/Desktop/Pitchonix/backend/src/excel-studio/excel-studio.service.ts` — ExcelStudioService.listProjects (lines 104-110) -> fromDb (lines 79-95)
- **Problem:** listProjects does prisma.excelProject.findMany({where:{userId,...}}) with NO select and NO pagination, then fromDb expands each row's analysis JSON including worksheets[].cells (up to an 80x N grid each), merges, columnWidths, rowHeights, previewRows, scoreExplanations, etc. For a user with many workbooks this returns a very large JSON payload to the list view, most of which the list UI does not need. There is no take/skip, so the result grows unbounded with the user's workbook count.
- **Root cause:** The same heavyweight DTO (built for the editor) is reused for the list view; no lightweight list projection and no pagination.
- **User impact:** Slow Excel Studio dashboard load and large transfers as a user accumulates workbooks; the list can balloon to many MB even though it only shows titles/scores.
- **Business impact:** Degraded first-load experience for the Excel product and wasted bandwidth/serialization CPU on every list fetch.
- **Exact fix:** Add a Prisma select to listProjects that returns only list-relevant fields (id, title, filename, fileSize, scores summary, activeTemplateId, updatedAt) and paginate (take/skip + total). Keep the full analysis only in getProject(id). Update the frontend list to consume the slim shape.
- **Effort:** 1 day
- **Verify:** Seed 25 Excel projects with non-trivial sheets, call the list endpoint, and measure response size and DB time. Before fix: payload is multi-MB and includes cells/merges arrays. After fix: payload is a few KB of summary fields and is paginated.

### P2#29 — [Performance (cross-cutting)] Universal-conversion PDF import parses with pdfjs disableWorker:true, blocking the event loop for the whole multi-page parse
- **File:** `/Users/shadi/Desktop/Pitchonix/backend/src/universal-conversion/importers/pdf-geometry-importer.ts` — pdfjs.getDocument({ data, disableWorker: true, ... }) (line 42) + per-page loop (line 53)
- **Problem:** The PDF geometry importer loads pdfjs-dist with disableWorker:true, which forces all PDF parsing, text-item extraction, and operator-list processing to run on the Node main thread. The per-page loop (line 53 onward, including image extraction via sharp at line 134) then executes entirely on the event loop with no yielding. For multi-page PDFs this blocks the event loop for the full parse, stalling all concurrent requests.
- **Root cause:** disableWorker was likely set to avoid pdfjs worker/ESM bootstrapping complexity in the NestJS/CJS runtime, at the cost of moving heavy CPU work onto the main thread.
- **User impact:** Importing/converting a large PDF freezes the whole backend for other users for the duration of the parse.
- **Business impact:** Universal conversion (a marquee capability) degrades shared API latency under any real concurrency.
- **Security impact:** Event-loop-blocking CPU work is a DoS amplifier for large PDFs.
- **Exact fix:** Run the pdfjs parse in a worker_thread / Piscina pool (or a Bull job) so the main event loop stays free, or enable the pdfjs worker. At minimum, yield (await setImmediate) between pages and cap page count, and offload image extraction. Apply the same treatment to pdf-image-extractor.ts.
- **Effort:** 1-2 days
- **Verify:** Import a 30-page PDF and concurrently poll a cheap endpoint (GET /health) measuring latency. Before fix: health latency spikes/stalls for the parse duration. After fix: parse runs off-thread and health latency stays flat.

### P2#30 — [Performance (cross-cutting)] Excel upload limit (50MB) exceeds the global body-parser limit (10mb); large uploads rejected and 50MB workbooks can saturate sync parsing
- **File:** `/Users/shadi/Desktop/Pitchonix/backend/src/excel-studio/excel-studio.controller.ts` — FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }) (line 45) vs main.ts useBodyParser('json',{limit:'10mb'})
- **Problem:** The Excel upload route advertises a 50MB fileSize limit, but main.ts (lines 52-53) sets the Express body parsers to 10mb. While multipart goes through multer (memoryStorage) and may bypass the json limit, the mismatch is at best confusing and at worst causes large multipart uploads to be rejected with 'request entity too large'. More importantly, a 50MB workbook accepted into memory then flows into the synchronous XLSX.read-with-styles + sheet_to_json analysis described in the Excel-replay finding, which can block the event loop for many seconds. Several other upload controllers (pptx-import, universal-conversion, ole-workspace, brand-kits, document-parser controller, image-upload) set NO FileInterceptor fileSize limit at all, relying solely on the 10mb body parser.
- **Root cause:** Per-route multer limits were set independently of the global body-parser limit and without considering the cost of synchronously parsing the accepted file.
- **User impact:** Confusing/inconsistent upload failures near the limits, and large accepted files cause long event-loop stalls.
- **Business impact:** Unpredictable upload behavior and shared-latency spikes from oversized accepted files.
- **Security impact:** Inconsistent/oversized limits widen the resource-exhaustion surface; the no-limit upload routes can accept files up to the 10mb body cap with no per-route guard.
- **Exact fix:** Reconcile limits: either raise the body-parser limit to match (and gate large Excel parsing behind a worker/queue), or lower the Excel multer limit to a sane streamed-processing value. Add explicit fileSize limits to every FileInterceptor (pptx-import, universal-conversion, ole-workspace, brand-kits, document-parser, image-upload). Reject oversized files before buffering where possible.
- **Effort:** 0.5 day
- **Verify:** Upload a 30MB XLSX to the Excel endpoint and observe success/failure + event-loop latency. Then upload a 12MB file to one of the no-limit routes and confirm it is rejected cleanly rather than partially buffered. Confirm all upload routes enforce a documented limit.

### P2#31 — [Performance (cross-cutting)] Two singleton-browser export services hold a cached Chromium with no concurrency cap and stale-handle risk on crash
- **File:** `/Users/shadi/Desktop/Pitchonix/backend/src/generation/export/pdf-export.service.ts` — PDFExportService.getBrowser (lines 20-28) + CvExportService.getBrowser (cv-export.service.ts lines 210-226)
- **Problem:** Both services cache a single Chromium (this.browser / this.browserPromise) and reuse it. cv-export nulls browserPromise on launch failure, which is good. But generation/export/pdf-export.service.ts NEVER nulls this.browser when the browser disconnects/crashes — after a crash, getBrowser() keeps returning the dead handle and every subsequent export fails until restart. Neither service caps concurrent newPage() calls on the single browser, so many simultaneous exports pile pages onto one browser with no backpressure. These also duplicate the BrowserPoolService that already solves exactly this (eviction on disconnect, retries, pooling).
- **Root cause:** Multiple independent ad-hoc browser-lifecycle implementations instead of consolidating on BrowserPoolService.
- **User impact:** After a Chromium crash, presentation PDF export stays broken until a backend restart; under concurrent exports a single browser can be overloaded.
- **Business impact:** Export reliability gaps and no graceful recovery from browser crashes.
- **Security impact:** None directly.
- **Exact fix:** Consolidate all browser usage onto BrowserPoolService (move it to a shared module). At minimum, add a browser.on('disconnected', () => this.browser = null) handler to pdf-export.service.ts and add a small concurrency limiter around newPage().
- **Effort:** 1 day
- **Verify:** Trigger a presentation PDF export, then kill the underlying Chromium process and trigger another export. Before fix: the second export fails (stale handle) and keeps failing. After fix (pool or disconnect handler): a fresh browser is created and the export succeeds.

### P2#32 — [Database (cross-cutting)] ExportJob.deckIds and DeckVersion lineage use String[] / loose JSON instead of relational integrity
- **File:** `backend/prisma/schema.prisma` — ExportJob.deckIds (String[]), ExportJob.outputUrls (String[]), DeckVersion.snapshot (Json)
- **Problem:** ExportJob.deckIds is `String[]` holding deck IDs with no FK and no junction table, so a batch export job can reference decks that have since been deleted, and there is no DB-level guarantee or efficient way to find 'all export jobs touching deck X'. Similarly outputUrls is a parallel String[] with no structure tying a URL to its source deck. This is the classic 'JSON/array used where a relation is needed' pattern.
- **Root cause:** Batch export was modeled as a single denormalized job row carrying arrays, avoiding a join table.
- **User impact:** Export job history can list deck IDs that no longer exist (broken 'view source deck' links). No referential cleanup when a deck is deleted — its ID lingers inside completed/failed ExportJob.deckIds arrays.
- **Business impact:** Export audit trail integrity is best-effort only; cannot reliably report export activity per deck. Minor.
- **Exact fix:** For strong integrity, introduce an ExportJobItem join model { id, exportJobId (FK cascade), deckId (FK), outputUrl, status } replacing the parallel arrays; or, if keeping arrays for simplicity, add an application-level cleanup that scrubs deleted deck IDs from ExportJob.deckIds. Minimum: document that deckIds is denormalized and add a periodic integrity check.
- **Effort:** M (new model + data migration of existing array rows, or accept and document)
- **Verify:** Create an ExportJob referencing two decks, delete one deck, then read the job — currently the deleted deck ID still appears in deckIds with a dead outputUrl. After a relational refactor, the item row would be cascade-deleted (or flagged).

### P2#33 — [Database (cross-cutting)] package.json exposes only `migrate dev`; no `migrate deploy`, db push is the de-facto deploy
- **File:** `backend/package.json` — scripts.prisma:migrate = "prisma migrate dev"
- **Problem:** The only migration script is `prisma:migrate: prisma migrate dev`, which is a development-only command (it can prompt, reset, and create shadow databases). There is no `prisma migrate deploy` script and no reference to migrate deploy anywhere in src. Combined with finding P0 (DB built via db push), this means there is no defined, safe production migration path.
- **Root cause:** Migration tooling was set up for local dev only; production schema management was done ad hoc with db push.
- **User impact:** None directly, but it institutionalizes the broken migration state in P0.
- **Business impact:** No repeatable, reviewable production schema deployment; every schema change is a manual, error-prone operation.
- **Security impact:** None directly.
- **Exact fix:** Add `"prisma:deploy": "prisma migrate deploy"` to package.json scripts and wire it into the deploy pipeline / container entrypoint. Stop using db push against the production database. Add `"prisma:status": "prisma migrate status"` and run it in CI to fail the build on drift.
- **Effort:** S (script + pipeline wiring; depends on P0 being resolved first)
- **Verify:** After P0 is resolved, run `npm run prisma:deploy` against a clean Postgres and confirm it applies all migrations and exits 0; run `prisma migrate status` and confirm 'up to date'.
- **Verification:** confirmed — CONFIRMED while verifying P0/P2: package.json scripts contain only prisma:generate, prisma:migrate (= 'prisma migrate dev'), prisma:studio, seed — no migrate deploy. P2 severity appropriate.

## 7. Low P3 Issues (23)
### P3#1 — [Dashboard] documentTypeFilter is dead — no UI control ever sets it
- **File:** `/Users/shadi/Desktop/Pitchonix/frontend/app/dashboard/page.tsx` — documentTypeFilter / setDocumentTypeFilter (line 116)
- **Problem:** State documentTypeFilter is declared and participates in the fetchProjects effect dependency array (line 145) and query building (line 174), but setDocumentTypeFilter is never called anywhere in the file — there is no document-type filter control rendered. The Filter icon is imported but unused. The feature is effectively absent though the plumbing implies it should exist.
- **Root cause:** Incomplete feature: backend supports documentType filtering, frontend wired the state and query param but never built the selector UI.
- **User impact:** No ability to filter projects by document type on the dashboard, despite backend support.
- **Business impact:** Missing convenience filter; minor.
- **Exact fix:** Either render a document-type Select/dropdown that calls setDocumentTypeFilter (backend already filters via where.documentType), or remove the dead state and unused Filter import.
- **Effort:** S
- **Verify:** Search the rendered JSX for any control invoking setDocumentTypeFilter — there is none; the filter cannot be exercised by a user.

### P3#2 — [Dashboard] NotificationBell imported but never rendered (and several other dead imports)
- **File:** `/Users/shadi/Desktop/Pitchonix/frontend/app/dashboard/page.tsx` — import NotificationBell (line 16); unused Input/Card/Select/Filter/various icons
- **Problem:** NotificationBell is imported but never placed in the JSX, so there is no notification affordance on the dashboard. Additionally Input, Card/CardContent/CardDescription/CardHeader/CardTitle, the Select family, Filter, and several lucide icons (Zap, CheckCircle2, etc.) are imported but unused.
- **Root cause:** Leftover imports from prior iterations / unfinished wiring.
- **User impact:** No notification bell on the dashboard despite an existing NotificationBell component; purely a missing affordance plus dead code (slightly larger bundle).
- **Business impact:** Negligible; minor bundle bloat and code-cleanliness.
- **Exact fix:** Either render <NotificationBell /> in the top context bar (line ~335 where there is an empty ml-auto spacer) or remove the unused imports.
- **Effort:** S
- **Verify:** Load /dashboard — no bell appears; grep shows NotificationBell imported but with zero JSX usages.

### P3#3 — [Create New] Hardcoded '16 types' copy no longer matches the 20 cards rendered
- **File:** `/Users/shadi/Desktop/Pitchonix/frontend/components/wizard/Step1DocumentType.tsx` — Step1DocumentType header 'Choose from 16 professional document types' (line 376) and dashboard 'View All 16 Types' link
- **Problem:** Step1 now renders 6 presentation + 10 PDF + 4 career = 20 cards, but the subtitle still says '16 professional document types' and the dashboard link says 'View All 16 Types'. The count was not updated when Phase 42 added the 4 career cards.
- **Root cause:** Magic-number copy not derived from DOCUMENT_TYPES.length.
- **User impact:** Minor inconsistency/erosion of trust; users see more cards than the stated count.
- **Business impact:** Negligible; cosmetic.
- **Exact fix:** Replace the literal with a derived count, e.g. `Choose from ${DOCUMENT_TYPES.length} professional document types`, and update the dashboard link text similarly (or to a static accurate number).
- **Effort:** S
- **Verify:** Load /create; confirm the subtitle count equals the number of cards shown (currently 20). Check dashboard 'View All' link text matches.

### P3#4 — [Create New] Wizard re-forces the document-type step even when the type was chosen on the dashboard
- **File:** `/Users/shadi/Desktop/Pitchonix/frontend/app/create/page.tsx` — CreateWizardPage initial currentStep + loadProjectData
- **Problem:** When a user clicks a specific type card (e.g., Quick Create -> Proposal), handleCreateProject sets project.documentType and routes to /create?project=<id>. The wizard loads documentType from the project but still starts at currentStep=1 (the Document Type picker), making the user re-confirm a choice they already made.
- **Root cause:** currentStep is initialized to 1 unconditionally (line 281); no logic to skip step 1 when documentType is already set from a loaded project.
- **User impact:** Extra redundant click/step in the funnel for every type-specific entry point.
- **Business impact:** Minor friction; small drop-off risk.
- **Exact fix:** After loadProjectData resolves with a non-empty documentType (and the entry was a type-specific deep link), advance currentStep to 2, or initialize currentStep based on whether documentType is preset.
- **Effort:** S
- **Verify:** Click Quick Create -> Proposal; observe the wizard opens on step 1 with Proposal pre-selected instead of step 2.

### P3#5 — [Projects] Public share view returns only decks; PDF-format shared projects expose metadata with no content
- **File:** `/Users/shadi/Desktop/Pitchonix/backend/src/projects/projects.service.ts` — getPublicProject (lines 254-275)
- **Problem:** getPublicProject includes only decks{slides}. A documentFormat='pdf' project shared via public link returns name/type/owner but an empty decks array — the recipient sees a shell with no document.
- **Root cause:** Public projection predates PDF projects and only models the deck shape.
- **User impact:** Sharing a PDF project via public link shows no content to viewers.
- **Business impact:** Public sharing appears broken for non-presentation projects.
- **Exact fix:** Branch on documentFormat in getPublicProject: for 'pdf' include pdfDocuments (pages/rendered output) in the projection; keep deck path for 'slides'.
- **Effort:** 0.5 day
- **Verify:** Generate a public link for a PDF project, open /share/{token} unauthenticated, confirm document content (not an empty deck) is returned.

### P3#6 — [Presentations] PDF export is rasterized image-based, not vector/selectable text
- **File:** `backend/src/slide-export/element-image-exporter.ts` — composePdfFromPngs / exportDeckToPdf
- **Problem:** exportDeckToPdf rasterizes each slide to PNG via Puppeteer then draws the PNG into a node-canvas PDF page. The resulting PDF contains no selectable/searchable text and no vector shapes — it is a sequence of full-page images. The ExportMenu labels PDF as 'High-fidelity print + sharing format' which implies more than an image dump.
- **Root cause:** PDF generation reuses the screenshot pipeline (drawImage of PNGs) rather than emitting real PDF text/vector content.
- **User impact:** Recipients cannot select, search, copy text, or get crisp scaling/printing from the PDF; large file sizes; accessibility (screen readers) is poor.
- **Business impact:** Lower perceived export quality for investor/client PDFs; fails accessibility expectations.
- **Exact fix:** Either emit a true vector PDF (e.g., Puppeteer page.pdf() which produces selectable text from the same HTML, instead of screenshot+drawImage), or relabel the option to set expectations ('PDF (image-based)'). page.pdf() is a near-drop-in replacement and keeps full HTML/CSS fidelity with selectable text.
- **Effort:** small (half a day to switch to page.pdf and re-test pagination)
- **Verify:** Export a deck to PDF, open it and attempt to select/search text — no text is selectable; zooming shows raster pixelation rather than crisp vector text.

### P3#7 — [PDF Studio] Multi-page PNG/JPEG export returns a ZIP but frontend names the file .png/.jpg (mislabeled type)
- **File:** `frontend/app/pdf-studio/editor/[id]/page.tsx` — PdfEditorPage.handleExport
- **Problem:** The backend export controller returns application/zip with a .zip filename when PNG/JPEG export spans multiple pages, but the frontend handleExport hardcodes ext = 'png' / 'jpg' regardless of the actual Content-Type, so a multi-page image export downloads ZIP bytes named document.png. This is currently latent because ExportDropdown only exposes PDF/DOCX/PPTX, so PNG/JPEG cannot be triggered from the editor UI.
- **Root cause:** Frontend derives extension from the requested format string instead of the response Content-Type, and ignores the ZIP case the backend can return.
- **User impact:** If PNG/JPEG export is ever exposed, multi-page exports produce a corrupt-looking .png that is actually a ZIP.
- **Business impact:** Low while hidden; would become a P0 mislabeled-export bug the moment PNG/JPEG is enabled in the UI.
- **Exact fix:** Derive the file extension from response Content-Type (or a Content-Disposition filename) rather than the requested format, and handle application/zip -> .zip. Then it is safe to add PNG/JPEG to ExportDropdown.
- **Effort:** S (1-2 hours)
- **Verify:** Temporarily add PNG to ExportDropdown, export a 3-page document, and confirm the downloaded file is a valid ZIP named .zip (currently downloads .png containing ZIP bytes).

### P3#8 — [Career Docs] Fixture-specific hardcoded values left in production parsing/repair code
- **File:** `/Users/shadi/Desktop/Pitchonix/backend/src/career/cv-profile-sanitizer.ts` — inferNameFromEmail() ('shadikamal' special-case); cv-import.service.ts normalizeOcrExperienceLeak() ('jordan', job-title list, 'afpleeier come mail')
- **Problem:** inferNameFromEmail hardcodes: if compact email local-part starts with 'shadikamal' return 'SHADI KAMAL'. normalizeOcrExperienceLeak hardcodes OCR-noise tokens and job-title lists tuned to a specific test CV. These are test-fixture leakage in shipping code.
- **Root cause:** Parser/repair heuristics were tuned against one specific sample CV and the sample-specific constants were left inline rather than generalized or removed.
- **User impact:** No correctness harm for general users (the branches simply won't fire), but the hardcoded 'SHADI KAMAL' could mis-name an unrelated user whose email happens to start with shadikamal, and the OCR token stripping is brittle/non-general.
- **Business impact:** Low direct impact, but indicates the OCR-experience-leak path is overfit to a fixture and may not generalize to other two-column CVs.
- **Exact fix:** Remove the 'shadikamal' branch from inferNameFromEmail (rely on the generic 2-token inference). Replace fixture-specific OCR token lists in normalizeOcrExperienceLeak with general heuristics, or move them to test fixtures.
- **Effort:** low
- **Verify:** Grep cv-profile-sanitizer.ts and cv-import.service.ts for 'shadikamal' and 'jordan'/'afpleeier'; confirm presence (current). After fix, confirm removed and that a generic two-column OCR CV still parses experience correctly.

### P3#9 — [Career Docs] Profile-photo upload uses client-supplied originalname for the saved file extension
- **File:** `/Users/shadi/Desktop/Pitchonix/backend/src/career/career.controller.ts` — uploadProfilePhoto()
- **Problem:** The saved filename extension is taken from path.extname(file.originalname) rather than derived from the validated MIME type. A request with mimetype image/png but originalname 'x.html' is saved as photo-<hex>.html under /uploads/images and later served from that directory. The MIME allowlist is enforced (good) and the basename is random hex (no traversal), so impact is limited, but extension/content-type can be mismatched.
- **Root cause:** Extension chosen from untrusted originalname instead of the validated mimetype.
- **User impact:** Negligible for users; primarily a content-type-mismatch / static-serving hygiene concern.
- **Business impact:** Low. Could matter if /uploads is served with content-sniffing and an attacker controls bytes, but MIME is already restricted to image types.
- **Security impact:** Low: stored file extension is attacker-influenced; combined with a permissive static handler this is a minor stored-content-type concern. No path traversal (random basename, extname strips dirs).
- **Exact fix:** Map file.mimetype to a fixed extension (image/jpeg->.jpg, image/png->.png, image/webp->.webp, image/gif->.gif) and ignore originalname for the extension.
- **Effort:** low
- **Verify:** POST /career/profile/photo with a valid PNG buffer but originalname 'evil.html'; confirm (current) the saved file ends in .html. After fix, confirm it is saved as .png regardless of originalname.

### P3#10 — [Excel Studio] Charts/pivots/validations/conditional-formatting always reported as 0 (parser does not expose them)
- **File:** `backend/src/excel-studio/excel-studio.service.ts` — analyzeWorkbook summary
- **Problem:** summary.charts, pivots, validations, conditionalFormatting are hardcoded to 0 because SheetJS Community does not surface these objects. visualizationQuality and dashboardReadiness scores then assume 'no charts' for every workbook, and the explanations admit charts are not detected.
- **Root cause:** Parser limitation; metrics stubbed to 0.
- **User impact:** A workbook that already contains charts/pivots is scored as if it has none, slightly skewing readiness scores.
- **Business impact:** Minor scoring inaccuracy; mostly cosmetic given the explanations disclose it.
- **Exact fix:** Parse chart/pivot/validation parts directly from the XLSX zip (xl/charts, xl/pivotTables, dataValidations in sheet XML) or use exceljs which exposes some of these; otherwise label these as 'not analyzed' rather than 0.
- **Effort:** medium
- **Verify:** Upload a workbook containing a chart and a pivot table; assert summary.charts>0 (currently always 0).

### P3#11 — [Brand Kits] BrandPreviewWall is a static CSS mockup, not the real render pipeline
- **File:** `frontend/features/brand-kits/BrandPreviewWall.tsx` — BrandPreviewWall
- **Problem:** The 'Preview' shown before applying a kit is a hand-built CSS approximation, not the actual deck/PDF/CV render with the kit injected. Given that deck apply is itself broken (P0), the preview can show branding the export will never produce.
- **Root cause:** Preview built for speed as a visual approximation.
- **User impact:** Preview-vs-output mismatch; users trust a preview that doesn't reflect the dead deck-apply path.
- **Business impact:** Erodes confidence once users notice exports differ from preview.
- **Exact fix:** Either label it clearly as an approximation, or render a real low-res preview through the same render pipeline used for export. At minimum fix the underlying apply path (P0) so the approximation isn't actively misleading for decks.
- **Effort:** 0.5-2 days depending on approach
- **Verify:** Apply a kit to a deck, compare BrandPreviewWall against the exported PDF; today they diverge because export ignores the apply.

### P3#12 — [Convert] Fidelity scores are heuristic node-count ratios, presented as measured fidelity
- **File:** `backend/src/universal-conversion/universal-conversion.service.ts` — buildQualityReport
- **Problem:** overall and fidelity sub-scores are derived purely from before/after UDM node counts (e.g. min(a,b)/b). This does not measure visual/layout fidelity. The hero tiles (PPTX 96%, PDF 94%, etc.) are hardcoded constants in the page, not computed.
- **Root cause:** Quality reporting is a structural heuristic, but the UI frames it as a fidelity percentage and shows fabricated averages.
- **User impact:** Users may over-trust a '94% fidelity' badge that reflects node retention, not how the output actually looks.
- **Business impact:** Potentially misleading quality claims.
- **Exact fix:** Relabel as 'content retention' or add a real rendered-diff measure; remove or clearly mark the hardcoded hero averages as illustrative.
- **Effort:** low
- **Verify:** Convert a content-rich PPTX to TXT and inspect the badge vs the obviously lossy output; confirm the percentage reflects node counts, not visual fidelity.

### P3#13 — [Import PPTX] Preview-only parse writes all media to disk with no cleanup or ownership scope
- **File:** `backend/src/pptx-import/media-extractor.ts` — extractMedia
- **Problem:** parseBuffer (called by the /parse preview endpoint) runs extractMedia, which writes every ppt/media/* binary to /uploads/images with a random UUID name. A user clicking 'Preview only' repeatedly, or uploading large decks they never import, permanently fills the uploads dir with orphaned files that are never referenced or garbage-collected.
- **Root cause:** Media extraction is unconditionally tied to parsing; preview and persist share the same side-effectful path, and there is no reaping of unreferenced uploads.
- **User impact:** None directly visible.
- **Business impact:** Unbounded disk growth on the shared uploads volume from preview traffic.
- **Security impact:** Minor: writes attacker-controlled binary content to a publicly served directory on every preview (content-type is inferred by extension only).
- **Exact fix:** For the preview path, either skip disk writes (return in-memory data URLs or counts only) or tag preview media and run a periodic sweep deleting uploads not referenced by any SlideElement. Validate/limit media extensions.
- **Effort:** M
- **Verify:** Call /pptx-import/parse 5 times with a media-heavy deck without importing; confirm 5x the media files accumulate in uploads/images with no deck referencing them.

### P3#14 — [Import PPTX] No automated parser tests and no committed PPTX fixtures despite certification endpoints
- **File:** `backend/src/pptx-import/__tests__` — __tests__ (empty) / scripts/fixtures-pptx
- **Problem:** The __tests__ directory is empty and scripts/fixtures-pptx contains only README.md. The shipped endpoints /pptx-import/certify, /round-trip, /regression/golden, /fixtures/real/certify imply a verification suite, but there are no real .pptx fixtures committed and no unit/integration tests exercising parseBuffer against known input.
- **Root cause:** Test scaffolding and fixture drop-dir exist but were never populated.
- **User impact:** Regressions in parsing (lost text/images, wrong chart values) can ship undetected.
- **Business impact:** Quality risk; the certification feature cannot actually run against real decks out of the box.
- **Exact fix:** Commit a handful of representative .pptx fixtures and add Jest tests asserting parseBuffer returns expected slide/text/image/chart/table counts and content. Wire buildGoldenFixtures into CI.
- **Effort:** M
- **Verify:** Run the backend test suite for pptx-import: currently there are no tests; GET /pptx-import/fixtures/real returns an empty set because the drop-dir has only a README.

### P3#15 — [Analytics] fetchAnalytics swallows all errors silently, masking outages as 'no data'
- **File:** `/Users/shadi/Desktop/Pitchonix/frontend/app/analytics/page.tsx` — fetchAnalytics catch block (line 39-40)
- **Problem:** On any API failure the catch block does nothing (page.tsx:39-40, comment '// silently fail') and loading is set false in finally (line 41-43), so a backend/auth error renders an indistinguishable 'No data yet' empty state (the length===0 guards at lines 87,107). Users cannot tell a real outage from genuinely empty analytics.
- **Root cause:** No error state modeled; failures collapse into the empty state.
- **User impact:** During an API/auth failure the page falsely implies the user has no activity.
- **Business impact:** Hides incidents; users may distrust correct data or overlook real problems.
- **Exact fix:** Add an error state: on catch (page.tsx:39), set an error flag and render a distinct 'Couldn't load analytics — retry' UI instead of the empty state.
- **Effort:** S
- **Verify:** Block /projects (e.g., return 500); the page shows 'No data yet'/empty table rather than an error. Confirms silent failure.
- **Verification:** confirmed — Confirmed. page.tsx:39-40 catch block contains only a '// silently fail' comment; finally sets loading false. On failure the page falls through to the same empty-state guards used for genuinely empty data.

### P3#16 — [Settings] Email field is disabled but backend updateProfile silently accepts email changes
- **File:** `/Users/shadi/Desktop/Pitchonix/backend/src/users/users.service.ts` — UsersService.updateProfile (lines 34-55)
- **Problem:** The Settings UI disables the email input with 'Email cannot be changed', but the backend PATCH /users/me will update email (with a uniqueness check) if an email is supplied. This is an inconsistency: an API caller can change email despite the product stating it is immutable, with no re-verification of the new address.
- **Root cause:** Backend allows email mutation; product decision to lock it is enforced only in the UI.
- **User impact:** None via the UI (disabled), but an API client can change the login email, bypassing verification.
- **Business impact:** Policy/verification gap for account email.
- **Security impact:** Low-moderate; unverified email change via API could aid account takeover or break notifications.
- **Exact fix:** Either remove email from updateProfile, or implement a proper verified email-change flow (send confirmation to the new address before applying). Keep server and UI policy consistent.
- **Effort:** low
- **Verify:** Send PATCH /users/me { email: 'new@x.com' } with a valid token — the email updates with no verification, contradicting the UI's 'Email cannot be changed'.

### P3#17 — [Help & Support] Static '24-hour response' SLA claim with no backing process
- **File:** `frontend/app/help/page.tsx` — Contact Support card (lines 109-112)
- **Problem:** The Help page hardcodes 'Response time: Within 24 hours' next to the mailto link. There is no ticketing system, queue, or monitored inbox traceable in the codebase to substantiate this. Combined with the dead /contact backend, nothing tracks or enforces response times.
- **Root cause:** Placeholder marketing copy left in a static page.
- **User impact:** Sets an SLA expectation the product cannot demonstrably meet, eroding trust if support is slow or the inbox is unmonitored.
- **Business impact:** Potential trust/credibility damage and unbacked commitment; minor legal/expectation risk.
- **Exact fix:** Either implement a tracked support pipeline (see P1 path A) that genuinely targets 24h, or remove/soften the specific SLA claim until a process exists. Verify support@pitchonix.com is monitored before advertising any response time.
- **Effort:** 15m to remove/soften copy; otherwise folded into P1 effort
- **Verify:** Confirm there is no automated routing/queue for support@pitchonix.com in the codebase (grep for support@pitchonix references → only this static page). Decide: implement pipeline or remove the SLA line.

### P3#18 — [Editors (cross-cutting)] PDF Studio full-document enhancement computes but does not redistribute enhanced content back to pages
- **File:** `backend/src/pdf-studio/controllers/smart-builder.controller.ts` — enhanceDocument (else branch, no targetId)
- **Page:** /pdf-studio/editor/[id]
- **Problem:** When enhance is called without a targetId (whole-document mode, lines 767-798), the backend joins all page text, enhances it, saves an enhancement record, and returns enhancedContent — but the inline comment at line 781 admits 'In a full implementation, you'd redistribute enhanced content back to pages. For now, return the enhancement result' and the pages are never updated. The editor always passes targetId (page.tsx:776) so this path is unreachable from the editor UI, but the endpoint is API surface and any caller using document-level enhance gets a no-persistence result.
- **Root cause:** Incomplete implementation left as a stub for the document-level path.
- **User impact:** Low in-editor (editor uses per-page path). Any API/integration calling document-level enhance sees enhanced text returned but the stored pages unchanged on next load.
- **Business impact:** Minor; an advertised capability (document-wide enhance) is half-built.
- **Exact fix:** Either remove the document-level branch and require targetId, or implement page redistribution (re-paginate enhanced text back across pages and persist via pdfPage.update). Document the endpoint's actual behavior in the meantime.
- **Effort:** Medium (re-pagination logic) or Low (restrict to per-page).
- **Verify:** POST /pdf-studio/smart-builder/enhance with documentId only (no targetId), then GET the document: confirm page contents are unchanged despite a 200 success with enhancedContent in the body.
- **Verification:** confirmed — Confirmed: enhanceDocument else-branch (lines 767-798) enhances joined text and saves a record but never calls pdfPage.update; comment line 781 admits redistribution is not implemented. Frontend always sends targetId (page.tsx:776), so unreachable from editor UI — P3 severity is correct.

### P3#19 — [Exports (cross-cutting)] slide-export manifest endpoint runs a full export to compute stats
- **File:** `backend/src/slide-export/slide-export.controller.ts` — manifest()
- **Page:** n/a (API only)
- **Problem:** GET /slide-export/:deckId/manifest calls exportService.export() (full PPTX/PDF render) just to read result.manifest, then discards the buffer. The code comment acknowledges the cost.
- **Root cause:** Manifest computation is coupled to the render pipeline.
- **User impact:** Manifest preview is slower than necessary and spins up Puppeteer/pptxgenjs needlessly for pdf/png/jpeg formats.
- **Business impact:** Unnecessary CPU/browser load if manifest preview is polled.
- **Exact fix:** Refactor loadDeck()+createRenderPlan() to expose a manifest-only path that builds manifestSlides/warnings without invoking the format exporters.
- **Effort:** S (about 1-2 hours)
- **Verify:** Call GET /slide-export/:id/manifest?format=pdf and observe Puppeteer launching / multi-hundred-ms latency despite no file being returned.

### P3#20 — [Security (cross-cutting)] JWT strategy and dev fallback use a hardcoded default secret; helmet CSP disabled
- **File:** `backend/src/auth/jwt.strategy.ts` — JwtStrategy constructor secretOrKey fallback; main.ts helmet({contentSecurityPolicy:false})
- **Problem:** jwt.strategy.ts falls back to the literal 'your-super-secret-jwt-key-change-this-in-production' when JWT_SECRET is unset. main.ts hard-fails on missing JWT_SECRET only when NODE_ENV is set to a non-development value — if NODE_ENV is undefined in production, the insecure default is silently used. Separately, helmet is configured with contentSecurityPolicy:false, so there is no CSP to mitigate XSS in the rendered preview HTML.
- **Root cause:** Insecure default kept for dev convenience; the production guard depends on NODE_ENV being explicitly set; CSP disabled for Swagger/iframe convenience.
- **User impact:** n/a direct.
- **Business impact:** If deployed without NODE_ENV set, all JWTs are forgeable with a publicly-known secret (full account takeover); absence of CSP weakens defense against injected scripts in preview/render surfaces.
- **Security impact:** Cryptographic/config weakness (OWASP A02/A05).
- **Exact fix:** Remove the hardcoded fallback in jwt.strategy.ts and read the secret from a single validated config that throws if missing regardless of NODE_ENV; treat undefined NODE_ENV as production for the secret check. Add a tightened CSP (at least for non-Swagger routes) rather than disabling it entirely.
- **Effort:** S (1-2 hours)
- **Verify:** Unset NODE_ENV and JWT_SECRET, start the app, and confirm it currently boots and accepts a token signed with the known default; after fix it refuses to start.

### P3#21 — [Performance (cross-cutting)] Dashboard project list ignores pagination metadata and the backend default cap of 20
- **File:** `/Users/shadi/Desktop/Pitchonix/frontend/app/dashboard/page.tsx` — fetchProjects (lines 166-190) — reads response.data.data but never sends page/limit or renders a pager
- **Problem:** The backend findAll paginates (default limit 20, returns meta.total/totalPages), but the dashboard never passes page/limit and never renders pagination controls — it just takes the first 20 projects. A user with >20 projects silently cannot see or reach the rest from the main dashboard (the only escape is search/filter). The 'archived' path (/projects/archived) returns an UNPAGINATED findMany of all archived projects, which is unbounded.
- **Root cause:** Pagination was implemented on the backend but the frontend list and the archived endpoint were not finished to match.
- **User impact:** Projects beyond the first 20 are invisible from the dashboard; heavy archived users get an unbounded archived payload.
- **Business impact:** Power users perceive missing data ('where did my projects go?'), and archived list scales poorly.
- **Exact fix:** Render pagination (or infinite scroll) in the dashboard using the existing meta, pass page/limit to /projects, and add take/skip to findArchived in projects.service.ts.
- **Effort:** 0.5 day
- **Verify:** Create 25 active projects; load the dashboard. Before fix: only 20 are reachable and there is no pager. After fix: all 25 are reachable via pagination, and /projects/archived is bounded.

### P3#22 — [Performance (cross-cutting)] Prisma client uses all-default connection/pool settings with no slow-query logging
- **File:** `/Users/shadi/Desktop/Pitchonix/backend/src/prisma/prisma.service.ts` — PrismaService extends PrismaClient (no constructor options)
- **Problem:** PrismaService instantiates PrismaClient with no options: no explicit connection_limit/pool_timeout tuning, no log:['warn','error'] or query-duration logging, and no transaction timeout config. Defaults (connection_limit ~= num_cpus*2+1) are workable for a single small instance but provide no visibility into slow queries and no headroom tuning for the heavier endpoints, and there is no event hook to detect the N+1 / unbounded queries flagged elsewhere in this audit.
- **Root cause:** Prisma was wired with the minimal boilerplate and never tuned or instrumented.
- **User impact:** Indirect — slow queries are invisible until they cause user-facing latency, and the pool may be over/under-sized for the workload.
- **Business impact:** Lack of observability slows down diagnosing the very performance issues in this report.
- **Exact fix:** Pass log options to PrismaClient (or use $on('query') with a duration threshold) to log slow queries in non-prod, set an explicit connection_limit/pool_timeout in DATABASE_URL appropriate to the deployment, and configure transaction timeouts. Add basic query metrics.
- **Effort:** 0.5 day
- **Verify:** Enable slow-query logging, run the dashboard + editor load + Excel export, and confirm slow queries (e.g. the unbounded findMany paths) now surface in logs with durations.

### P3#23 — [Database (cross-cutting)] Comment soft-delete/resolved filters lack supporting composite index
- **File:** `backend/prisma/schema.prisma` — Comment model indexes
- **Problem:** Comment supports soft-delete (deletedAt) and resolution (resolved) and is queried per-project/per-slide/per-page, but the indexes are single-column (@@index([projectId]), [slideId], [pageId], etc.). Common comment-panel queries filter projectId + resolved + deletedAt together; there is no composite index covering that. Low impact at current volume but a future hot path for collaboration-heavy decks.
- **Root cause:** Indexes were added per-anchor-column as features landed, without a composite for the panel's combined filter.
- **User impact:** Comment panel queries scan all comments for a project then filter resolved/deleted in memory; fine now, degrades with comment volume per project.
- **Business impact:** Minor performance scaling concern for active collaboration.
- **Exact fix:** Add `@@index([projectId, resolved, deletedAt])` (and optionally [pageId, deletedAt]) to the Comment model and migrate. Verify against actual comment query shape in the comments service before choosing column order.
- **Effort:** S (one or two indexes + migration)
- **Verify:** EXPLAIN ANALYZE the comment-panel query (projectId + resolved=false + deletedAt IS NULL) before/after; confirm it moves from Seq Scan to Index Scan.

## 8. Fake Features
- [Dashboard] Exports stat card — counts status==='exported' which is never set by any backend code; always renders 0 (CONFIRMED: no 'exported' status write in backend/src; incrementExport has zero callers)
- [Dashboard] 'Generated' and 'Exported' status filter chips — filter on status values the backend never produces; always return empty results (CONFIRMED via grep of all status writes)
- [Projects] WorkspaceSwitcher on /projects and /dashboard implies per-workspace project scoping, but no workspace id is sent to the API (WorkspaceSwitcher only mutates local state, api.ts interceptor adds only auth header) and findAll never filters by workspaceId — switching workspaces does not change the listed projects (projects/page.tsx:196-217, projects.service.ts:30)
- [Projects] Project-type routing: all 'View'/'Edit'/'Open Editor' buttons hard-route to presentation views regardless of documentType/documentFormat (zero frontend reads of documentFormat) — PDF Studio projects open the wrong editor (dashboard/page.tsx:838-851, projects/page.tsx:176-181)
- [PDF Studio] DocumentVersionsService.restoreVersion — only updates document.updatedAt and echoes version.pagesSnapshot back; never writes pages to the DB. (Currently dead code because PdfDocumentsController's real restore wins the route, but the no-op implementation is genuinely fake)
- [Career Docs] /career/ats Quick Fixes tab: every 'Apply Fix' button only calls onOpenBuilder() (router.push to builder) — applies nothing — ats/page.tsx RecommendationSection line 793
- [Career Docs] /career/ats Job Match 'Add' gap buttons: also only navigate to builder, no profile mutation — ats/page.tsx JobMatchView line 682
- [Career Docs] /career/ats 'Apply All Fixes' action bar: only setActiveTab('fixes') — ats/page.tsx line 453
- [Career Docs] Backend POST /career/ats/apply-fix: validates inputs and loads doc+profile but returns hardcoded {success:true, message:'Fix applied successfully'} with comment 'For now, return success' — never mutates the profile — career.controller.applyATSFix line 819-837
- [Brand Kits] 'Apply to workspace' button (BatchApplyButton) — calls applyToMany and shows 'Applied to N decks' success toast (page.tsx:614-615) but produces no visible branding change in preview or export
- [Brand Kits] 'Apply Kit' button in BrandKitPicker mode='apply' (deck context) — calls the dead applyToDeck endpoint; success state with no real effect
- [Convert] History tab — always empty because no conversion is ever recorded (lineage.record never called by /convert or /convert/batch)
- [Convert] Restore button — frontend omits required targetFormat so controller throws BadRequest; also no rows exist to restore
- [Convert] Lineage view — no ConvertedFile rows are ever created, so chains are always empty
- [Convert] Hero claim 'Convert anything to anything' and XLSX/image fidelity tiles — implies image and spreadsheet outputs that do not exist
- [Import PPTX] Hero 'Average fidelity' bars (96/88/92/78/84) on pptx-import page lines 151-166 — hardcoded static constants presented as aggregate data (confirmed)
- [Analytics] Total Exports KPI (page.tsx:47,77) — exportCount is never incremented anywhere; incrementExport (projects.service.ts:289) has zero callers (grep-verified), so this always renders 0 as if real
- [Analytics] 'Exports' bar series in 'Views & Exports by Project' chart (page.tsx:98) — always 0 for all real data
- [Analytics] 'Exports' column in Top Projects table (page.tsx:125) — always 0
- [Settings] Notifications section (settings/page.tsx handleSaveNotifications) — toggles are local-only, never persisted; 'Save Preferences' PATCHes only {name} and shows a 'Notification preferences saved' success toast with no real effect (UI does label it 'Preview' but still claims a save)
- [Settings] Two-Factor Authentication as a security control — the 'Enabled' badge and toggle imply account protection, but the secret/flag are never consulted during login, so it is non-functional security theater
- [Help & Support] Contact Support on /help — presented as a support channel but is only a mailto:support@pitchonix.com link plus a hardcoded 'Within 24 hours' SLA claim; no form, no ticket, no backend persistence
- [Help & Support] backend/src/contact (ContactController/ContactService) — full CRUD that appears functional but is unreachable: module not registered in app.module.ts, no contactMessage table in schema, no frontend caller. Dead code that would throw at runtime
- [Templates (cross-cutting)] PDF Studio standard 30-template gallery: distinct names/descriptions imply distinct layouts; runtime output is one fixed structured-page layout recolored by {colorScheme, headerStyle, spacing}
- [Templates (cross-cutting)] Excel Studio 12-template gallery: distinct names/descriptions imply distinct workbook structures; runtime output is one fixed 7-sheet set recolored by a 4-color palette (template-specific structure never generated)
- [Templates (cross-cutting)] Presentation applyTemplate.ts 'non-destructive / idempotent' contract and exported deriveElementStyle recolor path — dead code (no call site); real path regenerates from wizardInput and deleteMany-wipes the deck
- [Templates (cross-cutting)] PDF Studio pro-template duplicates (~10 of 20) that render byte-identically to a sibling (same family render path + same shared palette token object)
- [Editors (cross-cutting)] PDF Studio enhancement buttons 'Expand' / 'Shorten' / 'Restructure' — all map to the same safe grammar+clarity regex pass (getEnhancementOptions, lines 1032-1034), cannot add/remove/reorganize content, yet show success toasts 'Content expanded/shortened/restructured' (page.tsx:786-788). CONFIRMED.
- [Exports (cross-cutting)] Excel audit-pdf/executive-pdf/dashboard-pdf when Puppeteer is unavailable: returns Buffer.from(html) but response is labeled application/pdf with .pdf filename — a fake PDF (P0, confirmed)

## 9. Metadata-Only Features
- [PDF Studio] Brand Kit selection — brandKitId stored on document and badge shown, but no renderer (pdf-export/preview/docx-export) references brandKit; output is identical with or without a kit selected
- [Excel Studio] Template engine / 12-template palette (TEMPLATE_PALETTE): visually meaningful only in the in-app preview; exported XLSX has no styling applied
- [Excel Studio] formatCell / formatRange operations: write style objects into cell.s which the free SheetJS build discards on export
- [Excel Studio] standardizeHeaders / modernizeWorkbook / protectSource enhancement actions: their formatRange styling is non-functional in exports (header rows are not actually colored/bolded in the file)
- [Excel Studio] appendStyledSheet header/label/title styles: dropped on write — appended sheets contain correct data text but no styling
- [Brand Kits] applyToDeck / applyToMany (Apply to deck, Apply to workspace) — writes deck.metadata.themeTokens + deck.brandKitId which NO renderer or exporter reads; verified zero consumers in backend/src; pure metadata with no render effect
- [Brand Kits] Default kit (isDefault) — stored and badge-displayed, but no UI to set it and nothing ever auto-applies it; the detail-page tooltip itself admits it is not applied automatically
- [Import PPTX] oleObject elements — bytes/filename/url extracted but editor renders only a placeholder card, no live object or download link (confirmed)
- [Templates (cross-cutting)] PDF Studio standard template layouts[] component sequences (TABLE_BLOCK, CHART_BLOCK, TWO_COLUMN_LAYOUT, TIMELINE_BLOCK, PROCESS_STEPS_BLOCK) — declared per template (template-configs.ts) but never read by any consumer (verified: only .layouts reader is unrelated combineLayouts)
- [Templates (cross-cutting)] PDF Studio standard template defaultSections — declared per template, not used to shape export/preview output
- [Templates (cross-cutting)] Excel Studio template descriptions & strengths[] claiming sheet structures (risk register, KPI cockpit, retention, attribution, runway, burn) that buildWorkbookFromScript never generates
- [Exports (cross-cutting)] Excel 'Enhanced/Modernize Workbook' visual styling — appendStyledSheet sets cell .s fills/fonts/borders and writes with cellStyles:true, but xlsx@0.18.5 Community does NOT persist styles (empirically verified round-trip yields patternType:'none', losing fill/bold), so the 'modern workbook presentation system' is metadata/structure-only with no visual styling in the actual file

## 10. Real Features
- [Dashboard] Recent/Your Projects grid — backend ProjectsService.findAll returns real DB rows with decks, qualityScore, status (projects.service.ts:29)
- [Dashboard] Server-side debounced search (300ms) wired to /projects?search= (page.tsx:148-157, projects.service.ts:33)
- [Dashboard] Create project quick-actions & hero buttons -> POST /projects then route to /create?project= (page.tsx:274-286, route exists)
- [Dashboard] Duplicate / Delete / Archive / Restore -> real endpoints POST /projects/:id/duplicate|archive|restore, DELETE /projects/:id (projects.controller.ts)
- [Dashboard] Bulk delete / bulk archive -> POST /projects/bulk/delete|archive (page.tsx:247-272, projects.controller.ts:86-94)
- [Dashboard] Archived view -> GET /projects/archived (projects.controller.ts:32)
- [Dashboard] Recent Activity feed -> GET /activity?limit=5, DB-backed (activity.service.ts:8)
- [Dashboard] Total Projects stat — real (projects.length), but page-capped
- [Dashboard] Decks Generated stat — real (sum of decks.length), but page-capped
- [Dashboard] Avg Quality stat — real (avg of project.qualityScore from DB, written by generation.processor.ts:88), but page-capped
- [Dashboard] Quick Create cards for 8 document types -> handleCreateProject (real)
- [Dashboard] Product Suite links /excel-studio, /pdf-studio, /career — all routes exist
- [Dashboard] View/Edit buttons -> /projects/:id and /editor/:deckId (routes exist)
- [Dashboard] Keyboard shortcuts -> /create, /dashboard, /templates, /brand-kits (all routes exist)
- [Dashboard] Workspace switcher + Create Workspace modal (features/workspaces/* exist)
- [Dashboard] Empty/loading states (DashboardSkeleton, EmptyState) — real components
- [Dashboard] Status filter chips 'All' and 'Draft' — work (those status values exist)
- [Create New] Presentation creation (pitch_deck, sales_deck, board_meeting_deck, training_presentation, product_launch, strategy_presentation) — wizard collects data, POST /generate creates a deck, /projects/[id] polls + renders slides
- [Create New] Career creation (cv, resume, cover_letter->coverLetter, portfolio) — Step1 career cards call pickCareer -> /career?create=<type> which POSTs /career/documents and redirects to /career/builder/<id>
- [Create New] Dashboard Quick Create + hero buttons create a project via POST /projects and route into the wizard with documentType prefilled
- [Create New] Templates deep-link: /templates 'Use' button stores wizard data in sessionStorage and opens /create?template=true, which hydrates the wizard
- [Create New] Draft autosave: saveDraft() PATCHes/POSTs /projects on each Next and persists businessInfo
- [Create New] Wizard file uploads: logo/images are really uploaded via POST /pdf-studio/images/upload and substituted as URLs before generation
- [Projects] Backend CRUD with per-user ownership: create/findOne/update/remove all gate on userId via findOne() throwing ForbiddenException (projects.service.ts)
- [Projects] Archive (soft-delete via archivedAt) and restore — findAll excludes archivedAt!=null, findArchived returns only archived (projects.service.ts:207-226)
- [Projects] Bulk delete and bulk archive scoped by userId in the where clause (projects.service.ts:228-239)
- [Projects] Duplicate of decks+slides: real deep DB copy of slide content/title/order/notes into new rows (projects.service.ts:163-198)
- [Projects] Search + status + documentType filters honored in findAll where clause (projects.service.ts:29-49)
- [Projects] Public share link generate/revoke with random token and unauthenticated /share/:token view + view-count increment (projects.service.ts:241-275)
- [Projects] Dashboard list correctly parses {data,meta} envelope (response.data.data || response.data) and renders cards, duplicate/archive/restore/delete actions (dashboard/page.tsx:166-190)
- [Presentations] Element-model canvas rendering via shared renderElement (SlideCanvas.tsx)
- [Presentations] Sidebar slide thumbnails reusing the same renderers (SlideThumbnail.tsx) with concurrency semaphore
- [Presentations] Insert element menu (InsertMenu.tsx) creating real SlideElement rows
- [Presentations] Slide duplicate with full element copy (slides.service.ts duplicate)
- [Presentations] Slide insert-blank seeding default elements (slides.service.ts insertBlank)
- [Presentations] Slide reorder via two-phase order shift (slides.service.ts reorder)
- [Presentations] Undo/redo snapshot stacks per slide (useUndoRedo.ts)
- [Presentations] Layout switcher with slot-based idempotent repositioning (applyLayout.ts)
- [Presentations] Speaker notes editing + persistence (SlidePanel.tsx -> slide PATCH)
- [Presentations] Comments: pins, threads, mentions, assign, PDF appendix (comments backend + CommentsPanel)
- [Presentations] Version history with snapshot-before on destructive commands (unified-pipeline shouldSnapshotBefore)
- [Presentations] PPTX export (element-pptx-exporter) with correct MIME
- [Presentations] PDF/PNG/JPEG export via Puppeteer rasterization + node-canvas PDF + archiver zip (element-image-exporter)
- [Presentations] Template gallery with fullscreen preview + 20 distinct families (registry.ts, templateFamilyMap.ts)
- [Presentations] Editor/export collision-repair parity (backend render-planner.ts validateAndAdjust mirrors the frontend SlideCanvas repair — verified near-identical)
- [Presentations] Brand kit application, presenter mode, layers panel, align/arrange tools, group/ungroup, tidy
- [PDF Studio] Smart-builder generate pipeline (normalize/extract/analyze/outline/plan/compose/persist) — deterministic, rule-based, persists real page content
- [PDF Studio] Per-page auto-save in editor via PATCH /pdf-pages/:id — real DB writes, ownership-checked, persists after refresh
- [PDF Studio] PDF export via Puppeteer — real bytes, application/pdf, correct filename
- [PDF Studio] DOCX export via docx library — real .docx bytes, correct MIME, markdown-to-paragraph parsing
- [PDF Studio] PPTX export via pptxgenjs — real presentation bytes
- [PDF Studio] Preflight quality gate — real per-page word/overflow checks, blocks export only on blocking errors
- [PDF Studio] Page add/delete/duplicate (smart-builder controller) — real, transactional, ownership-checked
- [PDF Studio] Document gallery list (/pdf-documents) — real user-scoped query
- [PDF Studio] Template/colorScheme/proTemplate selection persisted to document.metadata via PUT /pdf-documents/:id
- [PDF Studio] Pro-template renderer — genuinely distinct multi-page layouts (cover/stats/timeline/closing)
- [PDF Studio] PdfDocumentsController versions/restore — ownership-checked, real updateMany restore (currently the live handler given module registration order)
- [Career Docs] CV file import (PDF/DOCX/HTML/MD) via UniversalConversionService — career.controller importFile + CvImportService.importFromFile
- [Career Docs] OCR fallback for sparse/scanned PDFs — runOcrOnPdf (real pdftoppm rasterize @150dpi + tesseract.js recognize, multi-language, page-by-page progress)
- [Career Docs] Multi-trigger OCR decision (forceOcr, <80 chars, <8 nodes, post-walk zero-sections) — cv-import.service.ts shouldRunOcr/attemptOcr
- [Career Docs] Two-column OCR section reclassification (resolveOcrSections, bidirectional anchor scan, education-pollution redistribution)
- [Career Docs] Letter-spaced heading collapse ('P R O F I L E' -> 'PROFILE') — collapseSpacedLetters
- [Career Docs] Person-name vs section-heading disambiguation at CV top — looksLikePersonName + collectPersonal guards
- [Career Docs] Semantic preservation validator that THROWS BadRequestException on bullet/experience collapse — validateSemanticImport
- [Career Docs] State-machine experience parser with role/company/date/location/bullet extraction and look-ahead — mapLinesToSection case 'experience'
- [Career Docs] LinkedIn JSON import — CvImportService.importFromLinkedIn
- [Career Docs] Profile sanitizer/repair (fullName-as-heading, education poison, summary contact stripping) — sanitizeCvProfile + /documents/:id/repair
- [Career Docs] Template gallery: 49 real DB-seeded templates with distinct layouts/customCSS — CvTemplatesService + CV_TEMPLATE_LIBRARY
- [Career Docs] Builder editor with inline section CRUD, live HTML preview, template switching, brand kit, photo upload — builder/[id]/page.tsx
- [Career Docs] PDF export via Headless Chromium (Puppeteer) with retry + html-fallback — CvExportService
- [Career Docs] DOCX/PPTX/HTML/MD export via universal-conversion exporters — CvExportService
- [Career Docs] ATS scoring engine (7-category weighted breakdown, recommendations, risks, strengths) — AtsAnalyzerService
- [Career Docs] Job matching engine (JD keyword/skill/experience/education/cert matching, gaps, match %) — JobMatcherService
- [Career Docs] CV Intelligence Studio analyze/apply-fix that ACTUALLY mutates the snapshot — CvAnalyzerService.applyFix
- [Career Docs] Import progress via SSE stream + polling + cancel — career.controller importProgressStream/importProgress/importCancel
- [Career Docs] Snapshot save/list/restore/compare, benchmark, interview readiness, preflight, variants generation
- [Career Docs] Profile photo upload with MIME allowlist + 5MB limit — career.controller uploadProfilePhoto
- [Excel Studio] Upload XLSX/XLS/CSV with validation (extension + 50MB cap), stored to disk, parsed via SheetJS (createFromUpload)
- [Excel Studio] Workbook analyzer: per-sheet rows/cols/formulas/error-cells/currency/date/numeric/blank detection (analyzeWorkbook, inspectWorksheet)
- [Excel Studio] Issue detection engine with severity/category/suggestedFix (detectIssues) — real signals from parsed data
- [Excel Studio] Scoring engine across 9 dimensions with explanations (scoreWorkbook, explainScores)
- [Excel Studio] Append-only operation engine: setCellValue, setFormula, insert/delete row/col, create/rename/delete/move sheet, merge/unmerge, freezePane (applyWorkbookOperationToWorkbook) — verified edits land in exported XLSX
- [Excel Studio] Undo/redo via approved/undone status flags + replay (undoLastWorkbookOperation/redo) — verified by spec
- [Excel Studio] Snapshots: real XLSX buffer written to disk per snapshot (createWorkbookSnapshot)
- [Excel Studio] Restore snapshot: re-approves/undoes operations to match snapshot operationIds (restoreWorkbookSnapshot) — verified
- [Excel Studio] Backend snapshot diff engine: cell add/remove/change + sheet + merge diff (diffWorkbooks) — correct, verified by spec
- [Excel Studio] Original export returns the exact original bytes with correct MIME/extension (readOriginalWorkbookBuffer) — verified byte-equal
- [Excel Studio] Enhanced XLSX export replays operations onto original then writes (buildEnhancedWorkbook) — verified edits present
- [Excel Studio] Freeze-pane XML post-processing via adm-zip injecting state=frozen (applyFreezePaneXml) — verified in output
- [Excel Studio] CSV export of first sheet with formula injection escaping (csvCell)
- [Excel Studio] Script-to-workbook generation producing a real multi-sheet XLSX with computed forecast projections (createFromScript, buildWorkbookFromScript, projectMetricValue)
- [Excel Studio] Smart-builder script analysis: type detection, metric/dimension extraction, template recommendation (analyzeScript)
- [Excel Studio] Enhancement actions converted into real replayable operations (operationsForEnhancementAction) — e.g. freezeHeaderRow->freezePane op verified
- [Excel Studio] PDF report export via puppeteer with HTML fallback (buildReportPdf)
- [Excel Studio] Prisma persistence: ExcelProject/Version/Snapshot/Operation models migrated, tables exist, ownership scoped by userId on every query
- [Excel Studio] Frontend editor: real cell edit + formula bar committing setCellValue/setFormula ops, row/col context menu, sheet rename/create/delete tabs
- [Brand Kits] Brand kit CRUD (create/list/detail/update/delete) with ownership enforcement (brand-kits.service findOne checks userId at lines 191-193)
- [Brand Kits] Colors tab — primary/secondary/accent/semantic palette persisted to tokens.colors via PATCH (brand-kits/[id]/page.tsx ColorsTab)
- [Brand Kits] Typography tab — heading/body/caption families persisted to tokens.typography
- [Brand Kits] Voice tab — tone/voice/house rules persisted to voice JSON
- [Brand Kits] Apply via SELECT mode on Career CV documents — brandKitId stored on CvDocument, re-resolved at export by resolveBrandTokens and injected into HTML/PDF
- [Brand Kits] Apply via SELECT mode on PDF Studio documents — pdf-studio brand-kit.service.getBrandKit resolves tokens at render time
- [Brand Kits] Generation pipeline brand application — theme.service loads kit by brandKitId at generate time and merges colors/fonts/voice/identity/logo
- [Brand Kits] Chart rebrand (rebrandChartElement / rebrandAllCharts) — rewrites slideElement.data.colors/palette on real chart rows (verified lines 321-376)
- [Brand Kits] Brand audit (brand-audit.service.auditDeck) — real static analysis of deck slides/elements vs kit palette/fonts
- [Brand Kits] Export JSON (exportKit) and Import JSON (importKit) with V1 schema validation (lines 408-469)
- [Brand Kits] Export ZIP / Import ZIP with embedded asset binaries (brand-kit-zip.service)
- [Brand Kits] One-default-per-workspace invariant enforced transactionally in create/update (lines 140-145, 206-211)
- [Convert] Single-file upload + format detection (extension + mimetype fallback) in detectFormat()
- [Convert] PPTX/PDF/DOCX/HTML/MD/TXT/RTF/XLSX/CSV import to UniversalDocument (real importers)
- [Convert] DOCX export via `docx` library + Packer.toBuffer (real)
- [Convert] PPTX export with tables/charts/images element treatment (real)
- [Convert] HTML export with table/list/quote/callout/code/image rendering (real)
- [Convert] Markdown / Text / RTF export (real)
- [Convert] Preview endpoint returning fidelity report + page/node breakdown (real, computed from before/after node counts)
- [Convert] Brand Kit application merging colors/fonts/logo into doc.theme (real)
- [Convert] File size validation (100MB) and unsupported-format rejection
- [Convert] Batch conversion with in-memory job tracking + status polling (real, but not persisted)
- [Convert] PDF export via LibreOffice when soffice is installed (real)
- [Import PPTX] OOXML unzip + XML parse via adm-zip/fast-xml-parser (OoxmlPackage)
- [Import PPTX] Slide structure + ordering + slide-type guessing
- [Import PPTX] Text frame extraction with per-run formatting (text-run-extractor.ts)
- [Import PPTX] Image/media extraction written to /uploads/images with public URL remap
- [Import PPTX] Chart extraction: kind, categories, series numeric values, axes, legend, colors
- [Import PPTX] Table extraction: cells, gridSpan/rowSpan merges, fills, alignment, header row
- [Import PPTX] Slide master / layout / theme import + FK wiring
- [Import PPTX] Speaker notes extraction from notesSlideN.xml
- [Import PPTX] SmartArt node-tree + flattened-shape extraction (data backend only)
- [Import PPTX] OLE object extraction as attachment cards
- [Import PPTX] Persistence to Deck/Slide/SlideElement/MasterSlide/LayoutTemplate/DeckTheme
- [Import PPTX] Preview (parse-only, no persist) with fidelity + compatibility report
- [Import PPTX] Editor render path: imported SlideElement rows fetched + rendered on canvas
- [Import PPTX] Import report counters + per-category compatibility scoreboard (driven by real parse data)
- [Settings] Profile name update — PATCH /users/me persists to DB (users.service.updateProfile)
- [Settings] Change password — PATCH /users/me/password verifies current password via bcrypt and re-hashes (users.service.changePassword), with min-length validation on both client and server
- [Settings] Delete account — DELETE /users/me actually deletes the user row (users.service.deleteAccount)
- [Settings] 2FA setup/enable/disable backend — generates real TOTP secret + QR via speakeasy/qrcode and verifies codes (two-factor.service.ts) — the operations themselves are real even though login never checks them
- [Settings] Workspace settings (general/members/invites/activity) — real backend hooks, role-gated via can(), in-app ConfirmDialog for all destructive actions (WorkspaceSettingsPage.tsx)
- [Settings] CV Import Mappings preferences — real CRUD against /career/import/mappings with in-app confirm dialogs (settings/cv-import-mappings/page.tsx)
- [Settings] Password visibility toggles (show/hide) on the security form
- [Help & Support] Onboarding flow (frontend/app/onboarding/page.tsx) — 3-step wizard, POSTs /auth/onboarding/complete (real endpoint in auth.controller.ts line 92), CTAs route to existing /brand-kits, /create, /export-templates
- [Help & Support] Career FeedbackWidget (frontend/features/career/FeedbackWidget.tsx) — bug/feedback dialog that POSTs /career/feedback, persists to beta_feedback table (career.controller.ts line 986-1000, model BetaFeedback schema.prisma line 1758), admin-readable via GET /career/feedback and the beta-telemetry admin page
- [Help & Support] /help static FAQ + Getting Started content — renders correctly, auth-gated, no dead in-page links
- [Templates (cross-cutting)] Career CV template library — config-driven genuine layout variation seeded in cv-templates.ts / cv-templates.service.ts
- [Templates (cross-cutting)] PDF Studio PRO templates — pro-template-renderer.service.ts branches on design family producing genuinely distinct HTML per family (10 distinct families verified)
- [Templates (cross-cutting)] Presentation smart-family token system — distinct color/font/radius/shadow/spacing per family in family-tokens.ts
- [Templates (cross-cutting)] Template version snapshotting before destructive switch (shouldSnapshotBefore for TEMPLATE_SWITCH, unified-pipeline.service.ts:490) so wiped decks are recoverable
- [Templates (cross-cutting)] PDF Studio includeCoverPage/includeTableOfContents flags ARE honored at the page-PLANNING stage (content-structure.service / rule-based-page-planner / smart-builder.controller) even though the export renderer itself does not read them
- [Editors (cross-cutting)] Presentation editor: element CRUD with optimistic edit + debounced PATCH persistence (useElementsApi)
- [Editors (cross-cutting)] Presentation editor: undo/redo via useUndoRedo + POST /slides/:id/elements/sync (syncAll)
- [Editors (cross-cutting)] Presentation editor: PPTX export via pptxgenjs (real OOXML bytes, correct MIME)
- [Editors (cross-cutting)] Presentation editor: PDF export via node-canvas 'pdf' surface + screenshots
- [Editors (cross-cutting)] Presentation editor: PNG/JPEG export via puppeteer screenshot + sharp, zipped via archiver
- [Editors (cross-cutting)] Presentation editor: align/arrange/distribute toolbar wired to onUpdateMany, correctly disabled without selection
- [Editors (cross-cutting)] Presentation editor: beforeunload dirty-guard
- [Editors (cross-cutting)] PDF Studio editor: contentEditable editing with 3s debounced autosave + manual Save (PATCH /pdf-pages/:id)
- [Editors (cross-cutting)] PDF Studio editor: undo/redo local history, version save/restore, page add/delete/duplicate
- [Editors (cross-cutting)] PDF Studio editor: DOCX export via docx lib Packer.toBuffer (real .docx)
- [Editors (cross-cutting)] PDF Studio editor: PPTX export via pptxgenjs, PNG via puppeteer screenshot
- [Editors (cross-cutting)] PDF Studio editor: preflight gating before export
- [Editors (cross-cutting)] Career Builder: section editing PATCH /career/documents/:id (content/title/template)
- [Editors (cross-cutting)] Career Builder: multi-format export with honest server-supplied extension header (PDF/DOCX/PPTX/MD/HTML)
- [Editors (cross-cutting)] Career Builder: honest PDF->HTML fallback messaging and DOCX design-loss warning
- [Editors (cross-cutting)] Career Builder: photo upload, repair, rebuild-from-profile, re-import
- [Editors (cross-cutting)] Excel Studio: cell value + formula editing replayed onto real xlsx via SheetJS
- [Editors (cross-cutting)] Excel Studio: row/column insert/delete, sheet create/rename/delete/move/freeze/merge operations
- [Editors (cross-cutting)] Excel Studio: real undo/redo (operation status approved/undone) and snapshots (real xlsx + restore)
- [Editors (cross-cutting)] Excel Studio: enhanced/comparison/board-package xlsx export with operations applied (real xlsx)
- [Editors (cross-cutting)] Excel Studio: enhancement actions create real sheets (summary/audit/dashboard) not metadata-only
- [Editors (cross-cutting)] Excel Studio: CSV/JSON/change-log/issue-report exports with correct content-type
- [Exports (cross-cutting)] Presentation PPTX export via pptxgenjs (element-aware, real OOXML, animations post-processed) — backend/src/slide-export/element-pptx-exporter.ts exportDeckToPptx
- [Exports (cross-cutting)] Presentation PDF export — Puppeteer slide screenshots composited via node-canvas PDF backend (verified %PDF- magic) — backend/src/slide-export/element-image-exporter.ts exportDeckToPdf/composePdfFromPngs
- [Exports (cross-cutting)] Presentation PNG/JPEG export as real ZIP bundles via archiver ZipArchive — buildImageZip
- [Exports (cross-cutting)] Career CV PDF export via Chromium with font-load wait and 2x retry, correct application/pdf — backend/src/career/cv-export.service.ts htmlToPdf
- [Exports (cross-cutting)] Career CV DOCX export via docx library Packer.toBuffer — backend/src/universal-conversion/exporters/docx-exporter.ts
- [Exports (cross-cutting)] Career CV HTML/MD/PPTX exports with correct mimetypes; controller uses dynamic r.mimetype/r.extension — backend/src/career/career.controller.ts:489-500
- [Exports (cross-cutting)] Career frontend reads x-pitchonix-export-extension header and toasts on PDF->HTML fallback — frontend/app/career/builder/[id]/page.tsx:367-373
- [Exports (cross-cutting)] PDF Studio PDF export via Puppeteer/browser pool from real document pages — backend/src/pdf-studio/services/pdf-export.service.ts
- [Exports (cross-cutting)] PDF Studio DOCX export via docx Packer from real document.pages content — backend/src/pdf-studio/services/docx-export.service.ts
- [Exports (cross-cutting)] PDF Studio PPTX export via pptxgenjs arraybuffer — backend/src/pdf-studio/services/pptx-export.service.ts
- [Exports (cross-cutting)] Excel XLSX/CSV/JSON export via real xlsx library (valid PK-magic XLSX, BIFF-magic XLS) — backend/src/excel-studio/excel-studio.service.ts exportProject
- [Exports (cross-cutting)] Excel audit-CSV / change-log / issue-report CSV exports — buildAuditCsv/buildChangeLogCsv
- [Exports (cross-cutting)] Slide-export controller sets correct Content-Type/Content-Disposition/Content-Length and ownership-checks the deck — backend/src/slide-export/slide-export.controller.ts download()
- [Exports (cross-cutting)] PDF Studio export controller sanitizes filenames and enforces document ownership + preflight gate — backend/src/pdf-studio/controllers/pdf-export.controller.ts
- [Exports (cross-cutting)] Excel export controller correctly sets Content-Disposition from the backend-computed filename (which carries the right extension per branch) — backend/src/excel-studio/excel-studio.controller.ts:146 (frontend just ignores it)
- [Performance (cross-cutting)] BrowserPoolService for PDF Studio exports (max 3, pre-warm, idle cleanup, crash eviction, retry with backoff) — verified at backend/src/pdf-studio/services/browser-pool.service.ts and used by pdf/png/jpeg export services
- [Performance (cross-cutting)] Projects list pagination on the backend (take/skip + meta.total/totalPages)
- [Performance (cross-cutting)] Activity feed bounded (take min(limit,100))
- [Performance (cross-cutting)] Notifications bounded (take 50)
- [Performance (cross-cutting)] Bull/Redis queue for deck generation (generation.processor)
- [Performance (cross-cutting)] Bull/Redis queue for CV export (cv-export-queue.processor, attempts+backoff)
- [Performance (cross-cutting)] Debounced autosave (3s) and debounced preview (600ms) in PDF Studio editor
- [Performance (cross-cutting)] Server-side preview caching with explicit invalidation endpoint in PDF Studio
- [Performance (cross-cutting)] react-window virtualization in the slide editor
- [Performance (cross-cutting)] Excel preview cell grid capped at 80 rows (buildCellGrid)
- [Performance (cross-cutting)] ThrottlerModule rate limiting applied globally via APP_GUARD plus per-route @Throttle on import/export/ATS (verified @Throttle 5/5min on /import/file)
- [Performance (cross-cutting)] 10mb body-parser limit correctly applied via useBodyParser after disabling Nest default parser
- [Database (cross-cutting)] Project soft-delete via archivedAt (queried in projects.service.ts with archivedAt:null filter)
- [Database (cross-cutting)] Comment soft-delete via deletedAt + edit tracking via editedAt
- [Database (cross-cutting)] Deck versioning (DeckVersion) — 320 live rows, full JSON snapshot with restore metadata
- [Database (cross-cutting)] PDF document versioning (DocumentVersion.pagesSnapshot)
- [Database (cross-cutting)] Excel versioning + snapshots + operation log with before/after state (ExcelWorkbookVersion/Snapshot/Operation) — 38 live operations, supports undo/redo and diff
- [Database (cross-cutting)] Workspace audit trail (WorkspaceAuditLog before/after JSON snapshots)
- [Database (cross-cutting)] Workspace activity feed (WorkspaceActivity)
- [Database (cross-cutting)] Brand kit assets as first-class relation (BrandAsset with kind slots)
- [Database (cross-cutting)] Element-based slide model (SlideElement) — 392 live rows, polymorphic content/data/style JSON
- [Database (cross-cutting)] Analytics counters on Project (viewCount, exportCount)
- [Database (cross-cutting)] Conversion lineage chain (ConvertedFile self-referential parentId FK, onDelete:SetNull)
- [Database (cross-cutting)] Cross-user template libraries (Template, CvTemplate, PdfTemplate, LayoutTemplate)
- [Database (cross-cutting)] Two-factor + email verification + magic link + reset token fields on User
- [Database (cross-cutting)] Public share token with unique index on projects.publicToken
- [Database (cross-cutting)] TemplateFavourite.userId has a real cascade FK to User

## 11. Broken Buttons
- [Create New] Dashboard hero 'Create Business Plan' button (PDF type -> wizard -> dead-end project page)
- [Create New] Quick Create cards: Business Plan, Proposal, Case Study, Company Profile, One Pager, Marketing Plan (all PDF types -> dead-end)
- [Projects] /projects 'View' button → /projects/[id] which assumes slide decks; for PDF projects lands on a 'Generate Deck' slide-generation flow (projects/page.tsx:176)
- [Projects] dashboard 'Edit' button → /editor/{decks[0].id} only renders when decks exist, so PDF projects (no decks) show no Edit path and presentation routing is assumed for all (dashboard/page.tsx:844-851)
- [PDF Studio] Restore version (editor) — the live server handler (PdfDocumentsController) does a real updateMany restore; the dormant DocumentVersionsController handler would no-op if it ever won the route
- [Career Docs] /career/ats 'Apply Fix' (per recommendation) — navigates to builder, applies nothing (CONFIRMED ats/page.tsx:793)
- [Career Docs] /career/ats 'Apply All Fixes' (action bar) — only switches the local tab to 'fixes', applies nothing (CONFIRMED ats/page.tsx:453)
- [Career Docs] /career/ats Job Match 'Add' (per gap) — navigates to builder, applies nothing (CONFIRMED ats/page.tsx:682)
- [Excel Studio] Editor 'Before / After' view button: renders static descriptive text, does not call the snapshot diff engine
- [Brand Kits] frontend/app/brand-kits/[id]/page.tsx BatchApplyButton 'Apply to workspace' — no render effect
- [Brand Kits] frontend/features/brand-kits/BrandKitPicker.tsx 'Apply Kit' (mode='apply') — no render effect
- [Brand Kits] frontend/app/brand-kits/[id]/page.tsx LogoUploadRow 'Choose a file' and AssetsTab upload — upload request rejected (wrong field name 'image')
- [Convert] Restore (HistoryPanel) — POST /convert/restore/:id sent without targetFormat -> BadRequestException
- [Convert] Lineage (HistoryPanel) — never returns data because no rows are recorded
- [Settings] settings/page.tsx 'Save Preferences' (Notifications) — appears to save but persists nothing
- [Settings] settings/page.tsx 'Change Password' — always fails for OAuth/Google users (currentPassword check against empty hash)
- [Editors (cross-cutting)] PDF Studio editor enhancement toolbar: 'Expand' button (frontend/app/pdf-studio/editor/[id]/page.tsx:1669) — runs grammar/clarity regex, never expands. CONFIRMED.
- [Editors (cross-cutting)] PDF Studio editor enhancement toolbar: 'Shorten' button (line 1670) — runs grammar/clarity regex, never shortens. CONFIRMED.
- [Editors (cross-cutting)] PDF Studio editor enhancement toolbar: 'Structure'/restructure button (line 1668) — runs grammar/clarity regex, never restructures. CONFIRMED.

## 12. Broken Routes
- [Create New] After PDF generation the wizard navigates to /projects/<projectId> (deck-only) instead of /pdf-studio/editor/<pdfDocumentId> (create/page.tsx:503)
- [Projects] /projects (frontend/app/projects/page.tsx) — list always renders empty due to response envelope mis-parse
- [Projects] Edit button on /projects card → /create?project=ID re-enters the generation wizard rather than opening an editor (projects/page.tsx:179)
- [PDF Studio] pdf-documents/:id/versions (GET/POST) and /restore — duplicate registration across PdfDocumentsController (secure, registered first/wins) and DocumentVersionsController (insecure no-op); resolution is order-dependent and fragile
- [PDF Studio] POST /pdf-studio/smart-builder/enhance — no @GetUser, no ownership check (IDOR write, confirmed live)
- [PDF Studio] POST /pdf-studio/smart-builder/regenerate-section — no @GetUser, no ownership check (IDOR write, confirmed live)
- [Brand Kits] POST /brand-kits/:id/apply/:deckId — succeeds but has no render/export effect
- [Brand Kits] POST /brand-kits/:id/apply-batch — succeeds but has no render/export effect
- [Convert] POST /convert/restore/:id — requires targetFormat the frontend never sends
- [Convert] GET /convert/history — returns empty (nothing recorded) and ignores caller identity
- [Help & Support] POST /contact (and GET/PATCH /contact/*) — ContactModule not imported in backend/src/app.module.ts, route does not exist at runtime (404)
- [Exports (cross-cutting)] POST /export/pptx, POST /export/pdf, POST /export/decks/:deckId/export, POST /export/batch — legacy element-blind export endpoints with no frontend caller; generateDeckHTML only reads slide.title/subtitle/content.painPoints/features/description/amount and ignores the authoritative SlideElement rows, so they would export near-blank files if invoked
- [Security (cross-cutting)] GET /api/pdf-studio/export/preview/:id (@Public, no ownership — content disclosure) [CONFIRMED]
- [Security (cross-cutting)] GET/POST /api/pdf-documents/:documentId/versions (+/:versionId/restore) (no ownership check) [CONFIRMED]
- [Security (cross-cutting)] POST /api/pdf-studio/smart-builder/enhance (no ownership check) [CONFIRMED]
- [Security (cross-cutting)] POST /api/pdf-studio/smart-builder/regenerate-section (no ownership check) [CONFIRMED]
- [Security (cross-cutting)] GET /api/convert/history (unscoped workspaceId, no userId) [CONFIRMED — route is /api/convert not /api/universal-conversion]
- [Security (cross-cutting)] GET /api/convert/result/:jobId (no ownership) [CONFIRMED]
- [Security (cross-cutting)] POST /api/convert/restore/:id (no ownership) [CONFIRMED]
- [Security (cross-cutting)] GET /api/convert/lineage/:id (no ownership) [CONFIRMED]
- [Security (cross-cutting)] POST /api/unsplash/download (authenticated SSRF + Client-ID leak) [CONFIRMED]
- [Security (cross-cutting)] DELETE /api/upload/:filename (path traversal + no ownership) [CONFIRMED]
- [Security (cross-cutting)] POST /api/pptx-import/into-project (no project ownership check) [not re-verified this pass]

## 13. Broken Exports
- [PDF Studio] Multi-page PNG/JPEG export returns application/zip but frontend names file .png/.jpg (mislabeled file type) — latent; not reachable from current ExportDropdown which only exposes PDF/DOCX/PPTX
- [Career Docs] Profile photo missing from PDF/HTML export in production when no backend-public-URL env var is set (relative /uploads/images/* not resolvable by Puppeteer)
- [Career Docs] Publications (and on resumes: languages/projects/awards/references) absent from PDF/HTML/DOCX export for freshly-imported documents because the default sectionOrder omits them
- [Excel Studio] enhanced-xlsx / enhanced-xls / comparison-xlsx / before-after-xlsx / board-package-xlsx: data correct but all cell styling silently stripped (no header colors, fills, bold) — output looks unstyled despite template selection — CONFIRMED at runtime
- [Convert] PDF export returns text/html bytes with .html extension when LibreOffice is unavailable, while the user requested PDF
- [Editors (cross-cutting)] Excel Studio audit-pdf/executive-pdf/dashboard-pdf: on puppeteer failure returns HTML bytes (excel-studio.service.ts:1691) but exportProject hardcodes contentType application/pdf and .pdf filename (lines 1115-1116) and controller sets them unconditionally (controller:145-146) — mislabeled HTML as PDF. CONFIRMED.
- [Exports (cross-cutting)] frontend/lib/export-api.ts exportDeck()/createBatchExport()/pollBatchExport() — exported but unused; point at the dead legacy /export path

## 14. Template System
All four flagged P0/P1 findings are CONFIRMED against the actual code, plus the P2 dead-code finding. Verification details:

PDF Studio standard (30 templates) — CONFIRMED. `pdf-export.service.generateStructuredPages()` (line 353) renders a fixed HERO_HEADER + SECTION_CARD + FOOTER and reads only `style`. `templateConfig.layouts[]` (defined per-template in template-configs.ts and typed in template-types.ts:107 as LayoutComponentType[]) is never read by ANY consumer — grep for `.layouts` across pdf-studio returns only the unrelated `combineLayouts(...)` helper. `defaultSections` is likewise unread by the export/preview renderer. ONE nuance worth correcting: `includeCoverPage`/`includeTableOfContents` ARE consumed — but in the upstream page-PLANNING pipeline (content-structure.service, rule-based-page-planner, smart-builder.controller), which decides which pages get persisted; the export renderer only renders cover/TOC if such pages already exist in document.pages. So the renderer doesn't read the flags, but the system as a whole partially honors them at planning time. Layout-component sequences and defaultSections remain fully unused. Finding stands.

Excel Studio — CONFIRMED. `buildWorkbookFromScript()` (line 1809) always emits Executive Summary / Source Data / Assumptions / Dashboard / Audit / Script / Pitchonix Template System; templateId is used only at line 1815 to pick `TEMPLATE_PALETTE`. The only structural variation comes from `analysis.detectedSheets` (parsed from the user's SCRIPT, via scaffoldRequestedSheet), never from templateId. Descriptions promise structures that are never generated (board-reporting: decision log/risk register/KPI cockpit; startup-metrics: MRR/activation/retention/runway; marketing-analytics: CAC/channel/funnel/attribution; investor-financial: assumptions/runway/ARR/burn/scenario). Count corrected: the catalog has 12 templates, not 11 (templates array lines 48-59).

Presentation apply-template — CONFIRMED. applyTemplate.ts POSTs to /generate/template-switch; the TEMPLATE_SWITCH command runs the full pipeline which in stageGeneratorExecution REGENERATES the entire deck from wizardInput via slideFactory.generateDeck() (line 305, ignoring all persisted slides/manual edits) and in stageMigration does prisma.slide.deleteMany({where:{deckId}}) then recreates (line 442, with an explicit comment 'wipe and rewrite'). elementsRestyled:0 and slidesApplied are cosmetic. Manual edits are destroyed in the live deck (recoverable only via the pre-snapshot from shouldSnapshotBefore at line 490). The exported deriveElementStyle (registry.ts:713) has NO call site — confirmed dead (only references are its definition and a comment). Both the P0 and the P2 dead-code finding confirmed.

PDF Studio pro (20 templates) — CONFIRMED (count tightened). getDesignFamily (renderer line 85) maps 20 IDs onto 10 families; pro-template.registry.ts (lines 48-67) assigns the SAME shared `palettes.X` token object to siblings (palettes.minimal→3 templates, palettes.executive→3, startup/fintech/editorial/futuristic/agency/analytics→2 each). Render branches only on `family` and colors come from `template.tokens.colors`, so siblings sharing family+palette produce byte-identical HTML for identical input. ~10 of 20 are pure recolor-less duplicates (same family + same palette), not even color-distinct. Original '~11 of 20' is essentially correct.

Career CV templates remain the healthiest surface (genuine config-driven layout variation); no template hides content present in others. Score held in the low-50s: the catalog claims across PDF-standard and Excel are materially misleading and the presentation apply is silently destructive, but real rendering machinery exists (pro families, CV configs, smart family tokens) and nothing is a security risk.

Findings: P0 Presentation 'apply template' wipes the deck and destroys all manual slide edits (documented as non-destructive); P0 PDF Studio standard templates (30): declared per-template layouts are never rendered — all produce one recolored structure; P0 Excel Studio templates (12): identical workbook structure for every template; descriptions promise non-existent sheets; P1 PDF Studio pro-templates: ~10 of 20 are exact recolor duplicates of a sibling (same family + same shared palette); P2 Presentation templates are visual-identity-distinct but element geometry is shared across families (layout uniqueness is partial); P2 Dead recolor code (deriveElementStyle) shipped and documented as the template-apply mechanism

## 15. Editors
Verification confirms both P0/P1 findings and the P3 finding as real, grounded in the actual code.

PDF STUDIO ENHANCEMENT (CONFIRMED): backend/src/pdf-studio/services/content-enhancement.service.ts imports only @nestjs/common and PrismaService — no Anthropic/OpenAI/network calls. It is a regex dictionary (contraction expansion, clarity rewrites, tone word-swaps) with a semantic-drift rollback (line 430-437) that reverts to original text when structure changes. smart-builder.controller.ts getEnhancementOptions() (line 1024-1040) maps restructure/expand/shorten/professionalize to combinations of {improveClarity, fixGrammar, tone} — the same safe pass; the comment at line 1025-1027 confirms 'Destructive operations ... were intentionally removed'. The editor (frontend/app/pdf-studio/editor/[id]/page.tsx) exposes six buttons including Structure/Expand/Shorten (lines 1668-1670) and emits success toasts 'Content restructured/expanded/shortened' (lines 786-788). Confirmed fake affordance for 3 of 6 buttons.

EXCEL STUDIO PDF EXPORT (CONFIRMED): excel-studio.service.ts buildReportPdf() (line 1678-1693) returns puppeteer PDF in the happy path but the catch at line 1690-1691 returns Buffer.from(html,'utf8'). The caller exportProject() (line 1113-1118) hardcodes contentType 'application/pdf' and a '.pdf' filename, and the controller export() (excel-studio.controller.ts:145-150) blindly sets those headers. On Chromium failure the user downloads HTML bytes named *.pdf served as application/pdf. Confirmed mislabeled artifact.

DOCUMENT-LEVEL ENHANCE STUB (CONFIRMED, P3): enhanceDocument() else-branch (line 767-798) enhances joined text and saves a record but never writes back to pages — comment at line 781 admits this. The editor always passes targetId (page.tsx:776) so the path is unreachable from the UI, but it is public-ish API surface.

No editor is a fake/viewer. The two defects undermine trust but neither corrupts saved content.

Findings: P1 PDF Studio 'Expand', 'Shorten', 'Restructure' enhancement buttons are fake — all run the same grammar/clarity regex and lie via success toasts; P1 Excel Studio PDF report export mislabels HTML bytes as application/pdf on puppeteer failure; P3 PDF Studio full-document enhancement computes but does not redistribute enhanced content back to pages

## 16. Export System
Verified all three P0/P1 export findings against the actual code — all three are REAL and confirmed.\n\n(1) P0 CONFIRMED — backend/src/excel-studio/excel-studio.service.ts buildReportPdf() (lines 1678-1693) returns `Buffer.from(html, 'utf8')` in its catch block on ANY Puppeteer failure, while exportProject() (lines 1113-1119) unconditionally sets contentType:'application/pdf' and filename `${slug}-${normalized}.pdf`. The controller (excel-studio.controller.ts:145-146) blindly forwards payload.contentType and a `.pdf` Content-Disposition. The frontend download() then hardcodes ext='pdf'. Net: a .pdf-named, application/pdf-typed file containing raw HTML. Unlike the CV export path (which relabels to .html), this path never relabels.\n\n(2) P1 CONFIRMED — Empirically reproduced: I wrote a cell with red solid fill + bold via ws['A1'].s, wrote with XLSX.write({cellStyles:true}) using the installed xlsx@0.18.5, and read it back — result style is {\"patternType\":\"none\"} (fill and bold lost). appendStyledSheet (lines 1392-1436) and buildEnhancedWorkbook (line 1380) set exactly these styles and write with cellStyles:true, so 'Enhanced Workbook' / 'Modernize' visual styling does not persist in the Community build. No ExcelJS is installed (node_modules/exceljs absent), confirming the suggested fix is a real porting effort.\n\n(3) P1 CONFIRMED — frontend/app/excel-studio/editor/[id]/page.tsx download() (lines 302-323) derives ext solely from the format string (pdf/csv/xlsx) and never reads response.headers['content-disposition']. For 'original-xlsx' on a CSV-origin upload, exportProject (lines 1084-1090) returns `${slug}-original.csv` with text/csv via contentTypeForExtension, and the controller emits a correct Content-Disposition filename (line 146) that the frontend discards — saving CSV bytes as .xlsx.\n\nThe dominant deck/CV/PDF-Studio export paths remain production-grade. Score held at 79: the P0 fake-PDF path and two confirmed P1s justify the cap; no findings were refuted, so accuracy is high.

Findings: P0 Excel Studio 'audit/executive/dashboard PDF' returns HTML bytes labeled as application/pdf on Puppeteer failure; P1 Excel 'Enhanced/Modernize Workbook' styling is metadata-only — xlsx Community build drops all cell styles; P1 Excel frontend reconstructs file extension from format string, ignoring backend Content-Disposition — mislabels CSV-origin originals as .xlsx; P2 Legacy /export deck endpoints are element-blind and would export near-blank files; also missing ownership check (IDOR); P3 slide-export manifest endpoint runs a full export to compute stats

## 17. Security
Verified against source. The platform has a real security baseline (global ThrottlerGuard, helmet, hard-required JWT_SECRET in non-dev, bcrypt, constant login messaging, whitelist+forbidNonWhitelisted ValidationPipe, and a genuine assertDocumentAccess ownership pattern present in pdf-export.controller.ts and smart-builder.controller.ts). However ownership enforcement is inconsistently applied, leaving several confirmed IDOR / access-control holes. CONFIRMED: (1) GET /api/pdf-studio/export/preview/:id is @Public and renders any document's full HTML with no auth — unauthenticated content-disclosure IDOR (the same controller defines assertDocumentAccess and uses it on every other handler, but not here). (2) DocumentVersionsController (/api/pdf-documents/:documentId/versions) has JwtAuthGuard but zero ownership checks on list/create/restore; the service queries purely by raw documentId/versionId. (3) SmartBuilder POST /enhance and POST /regenerate-section mutate any document/page by id with no @GetUser/assertDocumentAccess, while sibling get/add/delete/duplicate handlers DO enforce ownership. (4) POST /api/unsplash/download passes a raw user-supplied downloadUrl straight to fetch() with the Unsplash Client-ID in the Authorization header and no host allowlist — authenticated SSRF + credential leak. (5) UploadController DELETE /:filename passes the raw param into path.join with no basename/containment and no per-file ownership — path traversal + cross-tenant delete. (6) Conversion lineage/history/result endpoints are unscoped (history() never passes userId; lineage.list returns ALL ConvertedFile rows when no scope given; chain/restore/result take raw ids with no ownership) — but note these are mounted under /api/convert, NOT /api/universal-conversion as originally reported. (7) /exports and /uploads are served via app.useStaticAssets with no auth gate. All confirmed by code read; none runtime-verified.

Findings: P0 Unauthenticated document content disclosure via @Public preview endpoint (IDOR); P1 DocumentVersionsController exposes list/create/restore of any document's versions (IDOR); P1 SmartBuilder enhance & regenerate-section mutate any document/page without ownership check (IDOR); P1 Authenticated SSRF + credential leak via Unsplash download proxy; P1 Path traversal and missing ownership in upload file delete; P1 Unscoped conversion lineage/history/result endpoints leak cross-tenant data (routes are /api/convert/*); P1 Exported and uploaded artifacts served as public static assets with no auth; P2 No file-size limit on multipart uploads (memory-exhaustion DoS); P2 pptx-import 'into-project' injects slides into any project without ownership check; P2 Login issues JWT without enforcing email verification or 2FA; register auto-logs-in unverified users; P3 JWT strategy and dev fallback use a hardcoded default secret; helmet CSP disabled

## 18. Performance
Static performance audit across dashboard, project/deck loads, editors, PDF render, CV import/OCR, Excel analyze/replay, and exports. The platform has real performance infrastructure in places: the projects list is paginated, activity/notifications are bounded, there is a Puppeteer browser pool (max 3, pre-warm, idle cleanup, retries) for PDF Studio exports, Bull/Redis queues back deck generation and CV export, the PDF editor debounces autosave/preview and server-side preview is cached, and the slide editor uses react-window virtualization. However, all six P0/P1 findings were verified directly against the code and CONFIRMED: (1) the in-memory CacheModule (max:100, ttl:300, NOT Redis-backed) is wired into exactly ONE read path (pdf-studio content analysis) — confirmed via grep that PerformanceService is only injected in content-analysis.service.ts; (2) pdf-generation.service.ts launches a fresh Chromium per request (puppeteer.launch line 77, browser.close line 116) instead of the existing BrowserPoolService used by pdf-studio; (3) Excel Studio replays ALL workbook operations (synchronous fs.readFileSync + XLSX.read with cellStyles:true + re-apply every op) on EVERY export/CSV/snapshot/chart/analysis via buildWorkbookWithOperations -> readOriginalWorkbook with no caching; (4) CV import OCR (runOcrOnPdf -> pdftoppm + tesseract) runs inline on the awaited request thread; (5) batch export calls processBatchJob(job.id).catch() without await (line 77), loops decks sequentially, and exportToPDF does an in-process puppeteer.launch — no Bull processor, orphans 'processing' jobs on restart; (6) the PDF editor autosave effect loops over EVERY page with sequential awaited PATCH /pdf-pages/:id (no per-page dirty tracking), and each backend PATCH runs assertPageAccess (findUnique) before update. Most issues are P1/P2 (degraded latency, event-loop stalls, poor scaling) rather than data-corruption P0. Score reflects demo/early-beta performance maturity: correct functionally, but multiple verified event-loop-blocking and uncached hot paths that will not survive real concurrency.

Findings: P1 Single-PDF export launches a fresh Chromium per request instead of using the browser pool; P1 Excel Studio replays all workbook operations synchronously on every read/export with no caching; P1 CV import OCR runs synchronously inline on the request/event-loop thread; P1 In-memory cache is configured but used in only one path; all hot read paths are uncached and the cache can't scale; P1 Batch and single PDF/PPTX export run as in-process fire-and-forget (no real queue); jobs orphan on restart; P1 PDF Studio editor autosave issues one PATCH per page (N+1, each with its own ownership query) every 3 seconds; P2 Excel Studio listProjects returns full per-sheet analysis blobs (cells, merges, previewRows) with no field selection or pagination; P2 Universal-conversion PDF import parses with pdfjs disableWorker:true, blocking the event loop for the whole multi-page parse; P2 Excel upload limit (50MB) exceeds the global body-parser limit (10mb); large uploads rejected and 50MB workbooks can saturate sync parsing; P2 Two singleton-browser export services hold a cached Chromium with no concurrency cap and stale-handle risk on crash; P3 Dashboard project list ignores pagination metadata and the backend default cap of 20; P3 Prisma client uses all-default connection/pool settings with no slow-query logging

## 19. Database
The Prisma schema itself is well-designed: ~60 well-modeled tables with thoughtful JSON-vs-relation tradeoffs, soft-delete (Project.archivedAt, Comment.deletedAt), versioning (DeckVersion, DocumentVersion, ExcelWorkbookVersion/Snapshot/Operation), audit trails (WorkspaceAuditLog), and the schema genuinely supports each product module's promises. Verified against the LIVE database (postgresql://shadi@localhost:5432/pitchonix). All three P0/P1 findings are CONFIRMED against live DB evidence: (1) The migration/deployment layer is broken — the DB was materialized with `prisma db push`, not migrations. _prisma_migrations records only the `init` migration as applied and `20260504163331_add_phase1_fields` in a FAILED state (finished_at NULL, applied_steps_count 0, logs show Postgres error 42701 'column \"audience\" of relation \"projects\" already exists'; the audience column does exist in the live projects table, proving db push ran first). `prisma migrate status` confirms 10 further migrations are unapplied. Prisma will refuse all future migrate deploy/dev (P3009) until manually resolved. CORRECTION to the first pass: there are 12 migration directories on disk, not 13. (2) A broad pattern of ownership/reference columns with NO foreign-key constraints — verified via information_schema that cv_documents.userId, cv_analysis_snapshots.userId, cv_section_mapping_memory.userId, deck_versions.userId, reusable_slides.userId, converted_files.userId/workspaceId/brandKitId, beta_telemetry.userId, beta_feedback.userId, and template_favourites.templateId all lack FKs (note: template_favourites.userId DOES have a cascade FK, so user deletion cleans favourites; only templateId is unconstrained). (3) projects has no index on userId — pg_indexes shows only pkey, publicToken_key, workspaceId_idx, and EXPLAIN of the dashboard query shows a Seq Scan. The score reflects an excellent schema undermined by a non-production migration story and systemic missing FKs.

Findings: P0 Migration history is broken/failed — Prisma will refuse all future migrations; P1 Ownership/reference columns lack foreign keys — orphaned rows on user/template delete; P1 No index on the hottest ownership query path: projects(userId, archivedAt); P2 ExportJob.deckIds and DeckVersion lineage use String[] / loose JSON instead of relational integrity; P2 package.json exposes only `migrate dev`; no `migrate deploy`, db push is the de-facto deploy; P3 Comment soft-delete/resolved filters lack supporting composite index

## 20. Final Platform Report
### Top Risks
- PDF creation dead-end
- Unauthenticated/unscoped data exposure
- Mislabeled exports
- Fake functionality with success toasts
- Broken migration history
- Fake/truncated analytics
- SSRF + path traversal
- Cosmetic workspace scoping and lossy duplicate

### Recommended Roadmap
**P0 — Stop the bleeding (must close before any user-facing release) — Unbreak the primary creation/navigation flows, plug data-exposure and integrity holes, and repair the database foundation.**
- Fix the PDF creation dead-end: in frontend/app/create/page.tsx handleFinish, when format is 'pdf' route to /pdf-studio/editor/<pdfDocumentId> using the returned pdfDocumentId instead of router.push(`/projects/${savedProjectId}`).
- Fix the empty /projects list: in frontend/app/projects/page.tsx parse the { data, meta } envelope (use response.data.data) instead of treating the body as an array; verify dashboard list paths use the same shape.
- Add project-type detection: read documentFormat in /projects/[id] and dashboard Edit routing; route documentFormat='pdf' projects to the PDF editor and hide the slide-only 'Generate Deck' button / decks UI for them.
- Close unauthenticated document disclosure: call assertDocumentAccess in pdf-export.controller getPreview (remove blanket @Public/@SkipThrottle) so preview requires auth + ownership.
- Add ownership checks to all IDOR write paths: smart-builder enhance and regenerate-section, and DocumentVersionsController list/create/restore (inject @GetUser, call assertDocumentAccess); resolve the duplicate version route registration so only the secure handler exists.
- Stop mislabeled exports: when LibreOffice/Puppeteer is unavailable, fail loudly (4xx/5xx with clear message) instead of returning HTML bytes labeled application/pdf — fix pdf-exporter.ts, excel-studio buildReportPdf/exportProject, and the convert controller content-type/extension handling.
- Fix Excel XLSX styling: replace the free SheetJS Community build with a writer that serializes styles (e.g. exceljs) or stop advertising 'modernize/executive-ready formatting' until styles actually persist on write.
- Repair the database migration history: baseline the live DB so the FAILED add_phase1_fields migration is resolved (prisma migrate resolve) and the 10 db-push-only migrations are marked applied, restoring the ability to run future migrations safely.
- Remove fake success on ATS Apply Fix: either implement real profile mutation in career.controller apply-fix or disable the buttons and remove the misleading success toasts.
- Fix or disable brand-kit application end-to-end: stop applyToDeck/applyToWorkspace writing tokens that no renderer reads; either write the correct per-slide themeTokens keys the renderer consumes or remove the 'apply' affordance and the 'applied everywhere' marketing copy.
- Stop destructive 'apply template': either implement a truly non-destructive restyle or, at minimum, gate template switch behind an explicit in-app confirmation that warns all manual edits will be lost, and correct the false 'non-destructive' comment/UI.

**P0.5 — Server-side attack surface & secrets — Eliminate SSRF, path traversal, and public artifact exposure.**
- Add an api.unsplash.com host allowlist to the Unsplash download proxy so it cannot fetch arbitrary/internal URLs while carrying the API key.
- Harden upload delete: path.basename() + containment check that the resolved path stays inside uploadDir, plus an ownership record/check before fs.unlink.
- Gate /exports and /uploads static serving behind auth/ownership (signed URLs or an authenticated streaming endpoint) instead of open express.static.
- Scope conversion history/lineage/restore/result endpoints to the JWT userId; never return cross-tenant ConvertedFile rows; persist conversions with the real userId.

**P1 — Make the metrics and exports honest — Replace fake/truncated metrics and fix export labeling/branding so what users see matches reality.**
- Wire incrementExport into every real export path (PDF/PPTX/Excel/slide) or remove the Total Exports KPI and the 'Exports' stat card/bar/table column entirely.
- Fix dashboard status filters: stop sending non-existent 'generated'/'exported' statuses, or introduce those statuses on the real write paths.
- Replace client-side analytics reductions (capped at 100) with real server-side aggregation (Prisma aggregate/groupBy); count authenticated document opens in Views, not just anonymous public-link hits.
- Fix Excel frontend extension reconstruction to honor backend Content-Disposition (stop naming CSV-origin originals .xlsx).
- Apply brand kits in PDF Studio and Excel Studio renderers/exporters (or remove the 'applied everywhere you create' claims); add a real 'set as default' control that auto-applies if advertised.
- Make Convert honest: record lineage on every conversion, fix Restore to send targetFormat, and remove or implement the advertised Images->PDF / PDF->images / CSV->XLSX tiles.

**P1.5 — Data integrity, consistency & dead modules — Fix lossy operations, cosmetic scoping, and ship-or-cut half-built features.**
- Make duplicate() copy pdfDocuments, documentFormat, logoUrl and imageUrls so PDF copies aren't empty and branding isn't lost.
- Implement real workspace scoping: send the active workspaceId from the client and filter findAll by it, or remove the WorkspaceSwitcher illusion.
- Resolve PDF preview/export WYSIWYG drift: align pagination/bucketing/skip logic so the preview matches the exported PDF in page count, layout, and content.
- Decide on Help/Contact: either register ContactModule + add the contactMessage model + ship an in-app form, or remove the dead backend and keep mailto.
- Add real 2FA enforcement at login (TOTP code in LoginDto + login step) or remove the 2FA setup UI/'Enabled' badge so it isn't security theater.
- Replace native confirm() for Delete Account with the existing in-app ConfirmDialog; fix the Settings notifications section so it stops faking saves and mutating name.

**P2 — Performance & scalability — Move heavy work off the request thread, add caching/indexes, and use the existing pools/queues.**
- Add the missing index on projects(userId, archivedAt) to eliminate the dashboard sequential scan.
- Route single-PDF export through the existing BrowserPoolService instead of cold-launching Chromium per request; move batch/PDF/PPTX export and CV-import OCR onto the real Bull queues with concurrency caps and restart recovery.
- Cache and/or persist Excel built-workbook results instead of re-reading and re-parsing the source file with styles on every read/export; make disk I/O async.
- Batch the PDF editor autosave into a single per-document PATCH with per-page dirty tracking instead of N sequential PATCHes every 3 seconds.
- Move the cache off the 100-item in-process memory store to a shared store (Redis) and apply it to hot read paths (project list, deck+slides load) so it survives restarts and scales horizontally.

**P2.5 — Template & schema depth (truth-in-advertising) — Make templates actually differ as described and constrain the schema.**
- Render the declared per-template layouts/defaultSections for the 30 PDF Studio standard templates instead of one recolored structure; de-duplicate the ~10 pro-template recolor twins (distinct palettes/layouts or trim the catalog).
- Generate the template-specific sheets the 12 Excel templates promise (board reporting, startup metrics, marketing analytics, investor model) or rewrite the descriptions to match the single generated structure.
- Add real renderers (or a graceful, honest fallback) for imported SmartArt and OLE objects instead of placeholder cards; extend the ElementType union accordingly.
- Add foreign keys to the unconstrained ownership/reference columns (cv_documents.userId, deck_versions.userId, converted_files.*, template_favourites.templateId, etc.) to prevent orphaned/drifting rows; add the cross-tenant ownership check on /pptx-import/into-project.

### Final Verdict
Pitchonix is a Demo-grade product with a Production-grade veneer, and the gap between the two is dangerous. The editors, presentations engine, and PPTX import are genuinely good (low-to-mid 80s) and prove the team can ship real depth. But the platform's primary advertised flow — creating any of the ten PDF document types — dead-ends entirely, the projects list renders empty, and a striking number of buttons return success toasts for work that never happens (ATS fixes, AI expand/shorten/restructure, brand-kit apply, non-destructive template switch). Layered on top are mislabeled exports (HTML served as .pdf, styling silently dropped from every XLSX), fake analytics (Exports always 0), and a cluster of real security holes (unauthenticated document disclosure, multiple IDOR write paths, SSRF with credential leak, path traversal, public static artifacts). The database is on an unmanaged `db push` state with a failed migration that will block all future schema changes. None of this is unrecoverable — most P0s are small, surgical fixes (re-route one redirect, fix one envelope parse, add one ownership check) — but in its current state the platform must not be put in front of paying users or handle real tenant data. It is Major Work Required, with a clear and short path to Beta once the P0 navigation, mislabeling, security, and migration items are closed.

### Grade key
95–100 Enterprise Ready · 90–94 Production Ready · 80–89 Beta Ready · 70–79 Demo Ready · <70 Major Work Required
