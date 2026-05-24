/**
 * Phase 37.1 — Brand Automation Pass validation
 *
 *   37.1A — Brand-aware generation (ThemeService.getThemeForPresentationAsync +
 *           WizardInput.brandKitId + visual-generation async)
 *   37.1B — Chart auto-rebrand (service + endpoints + inspector button)
 *   37.1C — Native asset upload flow (uploadAsset hook + LogosTab + AssetsTab)
 *   37.1D — PDF Studio adapter (toPdfStudioBrand + endpoint)
 *   37.1E — Import / export (endpoints + dashboard buttons)
 *   37.1F — Batch apply (applyToMany + endpoint + dashboard button)
 *   37.1G — Audit enhancements (wrong-logo-variant + missing-identity)
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

function check(label: string, ok: boolean): boolean {
  console.log(`  ${ok ? '·' : '!'} ${label}`);
  return ok;
}

async function main() {
  console.log('Phase 37.1 — Brand Automation Pass validation\n');
  let fail = 0;

  const themeSvc   = readBE('src/generation/visual/theme.service.ts');
  const wizardTypes= readBE('src/generation/slide-types/types.ts');
  const visualSvc  = readBE('src/generation/visual/visual-generation.service.ts');
  const svc        = readBE('src/brand-kits/brand-kits.service.ts');
  const ctl        = readBE('src/brand-kits/brand-kits.controller.ts');
  const audit      = readBE('src/brand-kits/brand-audit.service.ts');
  const dash       = readFE('app/brand-kits/[id]/page.tsx');
  const hook       = readFE('features/brand-kits/useBrandKits.ts');

  // ===========================================================================
  //  37.1A — Brand-aware generation
  // ===========================================================================
  console.log('37.1A — Brand-aware generation');
  if (!check('WizardInput gains optional brandKitId',
       /brandKitId\?:\s*string/.test(wizardTypes))) fail++;
  if (!check('ThemeService.getThemeForPresentationAsync exists',
       /async getThemeForPresentationAsync\(input: WizardInput\)/.test(themeSvc))) fail++;
  if (!check('ThemeService loads BrandKit + applies tokens',
       /brandKit\.findUnique[\s\S]{0,400}?applyBrandKitTokens/.test(themeSvc))) fail++;
  if (!check('VisualGenerationService awaits the async theme resolver',
       /await this\.themeService\.getThemeForPresentationAsync\(input\)/.test(visualSvc))) fail++;

  // ===========================================================================
  //  37.1B — Chart auto-rebrand
  // ===========================================================================
  console.log('\n37.1B — Chart auto-rebrand');
  if (!check('service.rebrandChartElement exists',
       /async rebrandChartElement\(brandKitId: string, elementId: string/.test(svc))) fail++;
  if (!check('service.rebrandAllCharts exists',
       /async rebrandAllCharts\(brandKitId: string, deckId: string/.test(svc))) fail++;
  if (!check('rebrand preserves data, only replaces colors + axis/grid/legend',
       /data:\s*\{\s*\.\.\.data,\s*colors:\s*palette,\s*palette\s*\}[\s\S]{0,400}?axisColor:[\s\S]{0,80}?gridColor:[\s\S]{0,80}?legendStyle:/.test(svc))) fail++;
  if (!check('controller: POST /brand-kits/:id/rebrand-chart/:elementId',
       /@Post\(['"]brand-kits\/:id\/rebrand-chart\/:elementId['"]\)/.test(ctl))) fail++;
  if (!check('controller: POST /brand-kits/:id/rebrand-all-charts/:deckId',
       /@Post\(['"]brand-kits\/:id\/rebrand-all-charts\/:deckId['"]\)/.test(ctl))) fail++;
  if (!check('ApplyChartBrandButton.tsx exists',
       existsFE('features/brand-kits/ApplyChartBrandButton.tsx'))) fail++;
  if (!check('ChartPanel inspector mounts ApplyChartBrandButton',
       /<ApplyChartBrandButton/.test(readFE('features/slide-editor/inspector/panels/ChartPanel.tsx')))) fail++;

  // ===========================================================================
  //  37.1C — Native asset upload
  // ===========================================================================
  console.log('\n37.1C — Native asset upload');
  if (!check('useBrandKit.uploadAsset POSTs to /upload/image then creates BrandAsset',
       /uploadAsset[\s\S]{0,800}?\/upload\/image[\s\S]{0,400}?\/brand-kits\/\$\{id\}\/assets/.test(hook))) fail++;
  if (!check('LogosTab has LogoUploadRow with file input',
       /const LogoUploadRow/.test(dash) && /type=['"]file['"]/.test(dash))) fail++;
  if (!check('AssetsTab uses file upload (no manual URL pasting)',
       /const AssetsTab[\s\S]{0,3000}?type=['"]file['"]/.test(dash))) fail++;

  // ===========================================================================
  //  37.1D — PDF Studio adapter
  // ===========================================================================
  console.log('\n37.1D — PDF Studio adapter');
  if (!check('service.toPdfStudioBrand returns PDF-flavored color/font fields',
       /async toPdfStudioBrand\([\s\S]{0,1200}?primaryColor:[\s\S]{0,200}?accentColor:[\s\S]{0,200}?headingFontFamily:/.test(svc))) fail++;
  if (!check('controller: GET /brand-kits/:id/pdf-studio-format',
       /@Get\(['"]brand-kits\/:id\/pdf-studio-format['"]\)/.test(ctl))) fail++;

  // ===========================================================================
  //  37.1E — Import / export
  // ===========================================================================
  console.log('\n37.1E — Import / export');
  if (!check('BrandKitExportV1 contract exported',
       /export interface BrandKitExportV1[\s\S]{0,400}?\$schema:\s*['"]pitchonix\.brand-kit['"][\s\S]{0,200}?version:\s*1/.test(svc))) fail++;
  if (!check('service.exportKit returns the V1 envelope',
       /async exportKit\([\s\S]{0,800}?\$schema:[\s\S]{0,80}?['"]pitchonix\.brand-kit['"]/.test(svc))) fail++;
  if (!check('service.importKit validates $schema + version then creates',
       /async importKit\([\s\S]{0,800}?Not a valid Pitchonix brand kit export[\s\S]{0,800}?Unsupported brand-kit export version/.test(svc))) fail++;
  if (!check('controller: GET /brand-kits/:id/export + POST /brand-kits/import',
       /@Get\(['"]brand-kits\/:id\/export['"]\)/.test(ctl) &&
       /@Post\(['"]brand-kits\/import['"]\)/.test(ctl))) fail++;
  if (!check('dashboard has Export + Import header buttons',
       /<ExportButton/.test(dash) && /<ImportButton/.test(dash))) fail++;
  if (!check('importBrandKit hook helper exported',
       /export async function importBrandKit/.test(hook))) fail++;

  // ===========================================================================
  //  37.1F — Batch apply
  // ===========================================================================
  console.log('\n37.1F — Batch apply');
  if (!check('service.applyToMany accepts deckIds OR workspaceId',
       /async applyToMany\([\s\S]{0,400}?deckIds\?: string\[\];[\s\S]{0,200}?workspaceId\?: string/.test(svc))) fail++;
  if (!check('controller: POST /brand-kits/:id/apply-batch',
       /@Post\(['"]brand-kits\/:id\/apply-batch['"]\)/.test(ctl))) fail++;
  if (!check('dashboard has BatchApplyButton',
       /<BatchApplyButton/.test(dash))) fail++;

  // ===========================================================================
  //  37.1G — Audit enhancements
  // ===========================================================================
  console.log('\n37.1G — Audit enhancements');
  if (!check('audit: wrong-logo-variant detection (image/logo URL not in BrandAsset library)',
       /Logo \/ image URL is not registered in the brand asset library/.test(audit))) fail++;
  if (!check('audit: missing-identity check (companyName + tagline)',
       /Brand kit has no company identity/.test(audit))) fail++;

  console.log();
  if (fail === 0) console.log('✅ Phase 37.1: all automation-pass checks pass');
  else { console.error(`❌ ${fail} regressions detected`); process.exit(1); }
}

main().catch((err) => { console.error('Validation failed:', err); process.exit(1); });
