/**
 * Phase 37.2 — Brand Integration Completion validation
 *
 *   37.2A — Wizard "Brand Selection" step (StepBrandSelection) + wizard data
 *           flow + create page injects the step before Design
 *   37.2B — PDF Studio BrandKitService reads unified Phase 37 tokens/identity
 *           with fallback to legacy `config` (single source of truth)
 *   37.2C — Portable ZIP export/import (binaries + JSON)
 *            backend: BrandKitZipService + controller routes
 *            frontend: Export ZIP / Import ZIP buttons on dashboard
 *   37.2D — Audit issues navigate to /editor/{deckId}?slide=…&focus=… and
 *           the slide editor honors those query params (slide select + focus
 *           highlight via data-element-id)
 *   37.2E — Brand auto-fix actions: BrandAutofixService + controller route
 *           + per-issue "Fix" button in BrandAuditPanel that POSTs
 *           /brand-kits/:id/autofix/:elementId with {category}
 *   37.2F — BrandPreviewPanel expanded with Table slide / PDF page /
 *           Proposal page mock surfaces
 *
 *   Pure source-scan — no runtime needed.
 */

import * as fs from 'fs';
import * as path from 'path';

const FE       = path.join(__dirname, '..', '..', 'frontend');
const BE       = path.join(__dirname, '..');
const readFE   = (rel: string): string => fs.readFileSync(path.join(FE, rel), 'utf8');
const readBE   = (rel: string): string => fs.readFileSync(path.join(BE, rel), 'utf8');
const existsFE = (rel: string): boolean => fs.existsSync(path.join(FE, rel));
const existsBE = (rel: string): boolean => fs.existsSync(path.join(BE, rel));

function check(label: string, ok: boolean): boolean {
  console.log(`  ${ok ? '·' : '!'} ${label}`);
  return ok;
}

async function main() {
  console.log('Phase 37.2 — Brand Integration Completion validation\n');
  let fail = 0;

  // ===========================================================================
  //  37.2A — Wizard brand picker
  // ===========================================================================
  console.log('37.2A — Wizard brand picker');
  if (!check('StepBrandSelection component exists',
       existsFE('components/wizard/StepBrandSelection.tsx'))) fail++;
  let stepBrand = '';
  if (existsFE('components/wizard/StepBrandSelection.tsx')) {
    stepBrand = readFE('components/wizard/StepBrandSelection.tsx');
    if (!check('StepBrandSelection lists brand kits via useMyBrandKits',
         /useMyBrandKits\(\)/.test(stepBrand))) fail++;
    if (!check('StepBrandSelection exposes onSelect callback',
         /onSelect/.test(stepBrand))) fail++;
  }
  const createPage = readFE('app/create/page.tsx');
  if (!check('create page imports StepBrandSelection',
       /StepBrandSelection/.test(createPage))) fail++;
  if (!check('wizardData carries brandKitId',
       /brandKitId\??:\s*string/.test(createPage))) fail++;
  if (!check('wizard injects Brand step before Step5 (Design)',
       /designIdx[\s\S]{0,200}?StepBrand/.test(createPage))) fail++;

  // ===========================================================================
  //  37.2B — PDF Studio brand service uses unified tokens
  // ===========================================================================
  console.log('\n37.2B — PDF Studio brand renderer switch');
  const pdfBrandSvc = readBE('src/pdf-studio/services/brand-kit.service.ts');
  if (!check('PDF Studio brand service reads unified `tokens` JSON',
       /brandKit\.tokens/.test(pdfBrandSvc))) fail++;
  if (!check('PDF Studio brand service prefers tokens then falls back to legacy config',
       /tokenColors\.primary[\s\S]{0,200}?config\.colors\?\.primary[\s\S]{0,200}?brandKit\.primaryColor/.test(pdfBrandSvc))) fail++;
  if (!check('PDF Studio brand service surfaces identity into contact block',
       /identity\?\.companyName[\s\S]{0,200}?identity\?\.website/.test(pdfBrandSvc))) fail++;
  if (!check('PDF Studio brand service derives typography from tokens.typography',
       /tokenTypo\.body\?\.family/.test(pdfBrandSvc) &&
       /tokenTypo\.heading\?\.family/.test(pdfBrandSvc))) fail++;

  // ===========================================================================
  //  37.2C — Portable ZIP (backend service + controller + frontend buttons)
  // ===========================================================================
  console.log('\n37.2C — Portable ZIP export/import');
  if (!check('BrandKitZipService exists',
       existsBE('src/brand-kits/brand-kit-zip.service.ts'))) fail++;
  const zip = existsBE('src/brand-kits/brand-kit-zip.service.ts')
    ? readBE('src/brand-kits/brand-kit-zip.service.ts') : '';
  if (!check('BrandKitZipService.exportZip embeds local assets and rewrites URLs',
       /exportZip\([\s\S]{0,2000}?archive\.append\([\s\S]{0,400}?assets\//.test(zip) &&
       /remappedAssets\.push\(\{ \.\.\.asset, url:/.test(zip))) fail++;
  if (!check('BrandKitZipService.importZip reads brand-kit.json + writes assets to uploads',
       /importZip\([\s\S]{0,2000}?brand-kit\.json/.test(zip) &&
       /writeAsset\(/.test(zip))) fail++;
  if (!check('BrandKitZipService leaves remote URLs as references during export',
       /tryReadLocal/.test(zip))) fail++;
  const ctl = readBE('src/brand-kits/brand-kits.controller.ts');
  if (!check('Controller registers GET /brand-kits/:id/export-zip',
       /export-zip/.test(ctl) && /BrandKitZipService/.test(ctl))) fail++;
  if (!check('Controller registers POST /brand-kits/import-zip with FileInterceptor',
       /import-zip/.test(ctl) && /FileInterceptor\(['"]file['"]\)/.test(ctl))) fail++;
  const mod = readBE('src/brand-kits/brand-kits.module.ts');
  if (!check('BrandKitZipService is registered in module',
       /BrandKitZipService/.test(mod))) fail++;
  const dashboard = readFE('app/brand-kits/[id]/page.tsx');
  if (!check('Dashboard renders Export ZIP button',
       /ExportZipButton/.test(dashboard))) fail++;
  if (!check('Dashboard renders Import ZIP button',
       /ImportZipButton/.test(dashboard))) fail++;
  if (!check('Dashboard ImportZip POSTs to /brand-kits/import-zip with multipart',
       /\/brand-kits\/import-zip/.test(dashboard) &&
       /multipart\/form-data/.test(dashboard))) fail++;

  // ===========================================================================
  //  37.2D — Audit → element navigation
  // ===========================================================================
  console.log('\n37.2D — Audit → element navigation');
  const auditPanel = readFE('features/brand-kits/BrandAuditPanel.tsx');
  if (!check('Audit panel uses useRouter for navigation',
       /from\s+['"]next\/navigation['"]/.test(auditPanel) &&
       /useRouter/.test(auditPanel))) fail++;
  if (!check('Audit panel builds /editor/{deckId}?slide=&focus= URLs',
       /\/editor\/\$\{deckId\}/.test(auditPanel) &&
       /URLSearchParams/.test(auditPanel) &&
       /\bset\(['"]slide['"]/.test(auditPanel) &&
       /\bset\(['"]focus['"]/.test(auditPanel))) fail++;
  const editor = readFE('app/editor/[id]/page.tsx');
  if (!check('Slide editor reads ?slide / ?focus query params',
       /useSearchParams/.test(editor) &&
       /searchParams\??.get\(['"]slide['"]\)/.test(editor) &&
       /searchParams\??.get\(['"]focus['"]\)/.test(editor))) fail++;
  if (!check('Slide editor scrolls to data-element-id={focus}',
       /data-element-id="\$\{focusElementId\}"/.test(editor) ||
       /\[data-element-id=/.test(editor))) fail++;

  // ===========================================================================
  //  37.2E — Brand auto-fix actions
  // ===========================================================================
  console.log('\n37.2E — Brand auto-fix actions');
  if (!check('BrandAutofixService exists',
       existsBE('src/brand-kits/brand-autofix.service.ts'))) fail++;
  const autofix = existsBE('src/brand-kits/brand-autofix.service.ts')
    ? readBE('src/brand-kits/brand-autofix.service.ts') : '';
  if (!check('FixCategory union covers colors|typography|logos|charts|components',
       /export type FixCategory[\s\S]{0,200}?'colors'[\s\S]{0,200}?'typography'[\s\S]{0,200}?'logos'[\s\S]{0,200}?'charts'[\s\S]{0,200}?'components'/.test(autofix))) fail++;
  if (!check('Autofix delegates charts to BrandKitsService.rebrandChartElement',
       /category === 'charts'[\s\S]{0,200}?rebrandChartElement/.test(autofix))) fail++;
  if (!check('Autofix rewrites style colors via nearestBrandColor',
       /nearestBrandColor/.test(autofix))) fail++;
  if (!check('Autofix swaps logo via primary asset or kit.logo fallback',
       /logo_primary[\s\S]{0,400}?kit\.logo/.test(autofix))) fail++;
  if (!check('Controller exposes POST /brand-kits/:id/autofix/:elementId',
       /autofix\/:elementId/.test(ctl) && /BrandAutofixService/.test(ctl))) fail++;
  if (!check('BrandAutofixService is registered in module',
       /BrandAutofixService/.test(mod))) fail++;
  if (!check('Audit panel shows per-issue Fix button gated on canFix',
       /canFix/.test(auditPanel) && /onFix/.test(auditPanel))) fail++;
  if (!check('Audit panel POSTs to /brand-kits/{kitId}/autofix/{elementId}',
       /\/brand-kits\/\$\{effectiveKitId\}\/autofix\/\$\{issue\.elementId\}/.test(auditPanel) ||
       /autofix/.test(auditPanel))) fail++;

  // ===========================================================================
  //  37.2F — Brand preview expansion
  // ===========================================================================
  console.log('\n37.2F — Brand preview expansion');
  const preview = readFE('features/brand-kits/BrandPreviewPanel.tsx');
  if (!check('BrandPreviewPanel renders Cover / Content / Chart surfaces',
       /label=["']Cover["']/.test(preview) &&
       /label=["']Content["']/.test(preview) &&
       /label=["']Chart["']/.test(preview))) fail++;
  if (!check('BrandPreviewPanel renders Table slide surface',
       /Table slide/.test(preview))) fail++;
  if (!check('BrandPreviewPanel renders PDF page surface',
       /PDF page/.test(preview))) fail++;
  if (!check('BrandPreviewPanel renders Proposal page surface',
       /Proposal page/.test(preview))) fail++;

  // ===========================================================================
  //  Summary
  // ===========================================================================
  console.log(`\n${fail === 0 ? '✓ Phase 37.2 — all checks passed' : `✗ Phase 37.2 — ${fail} check(s) failed`}\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
