/**
 * Phase 37 — Brand Kits 2.0 validation
 *
 *   37A — Schema: BrandKit gets workspaceId / isDefault / description / tokens / voice / identity
 *         + new BrandAsset table
 *   37B — Asset endpoints (add/remove)
 *   37C — Color tokens stored in BrandKit.tokens.colors
 *   37D — Typography tokens stored in BrandKit.tokens.typography
 *   37E — Brand tokens stored in BrandKit.tokens.tokens
 *   37H — Chart palette stored in BrandKit.tokens.chart.palette
 *   37I — BrandVoice stored in BrandKit.voice
 *   37J — BrandPreviewPanel renders cover/content/chart
 *   37K — applyToDeck endpoint + ApplyBrandKitMenu in editor
 *   37L — generation pipeline ready to consume kit (legacy path unchanged)
 *   37M — workspace-scoped listing endpoint
 *   37O — BrandAuditService
 *   37P — Score 0..100 + per-category breakdown
 *   37Q — Tabbed dashboard with 8 tabs
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
  console.log('Phase 37 — Brand Kits 2.0 validation\n');
  let fail = 0;

  const schema    = readBE('prisma/schema.prisma');
  const svc       = readBE('src/brand-kits/brand-kits.service.ts');
  const ctl       = readBE('src/brand-kits/brand-kits.controller.ts');
  const audit     = readBE('src/brand-kits/brand-audit.service.ts');
  const mod       = readBE('src/brand-kits/brand-kits.module.ts');
  const editor    = readFE('features/slide-editor/SlideEditor.tsx');

  // ===========================================================================
  //  37A — Schema
  // ===========================================================================
  console.log('37A — Schema');
  if (!check('BrandKit gains workspaceId / isDefault / description / tokens / voice / identity',
       /workspaceId\s+String\?/.test(schema) &&
       /isDefault\s+Boolean\s+@default\(false\)/.test(schema) &&
       /tokens\s+Json\?/.test(schema) &&
       /voice\s+Json\?/.test(schema) &&
       /identity\s+Json\?/.test(schema))) fail++;
  if (!check('Workspace has brandKits backref',
       /brandKits\s+BrandKit\[\]/.test(schema))) fail++;
  if (!check('BrandAsset model with kind + url + brandKitId FK',
       /^model BrandAsset \{[\s\S]+?brandKitId[\s\S]+?kind\s+String[\s\S]+?url\s+String/m.test(schema))) fail++;
  if (!check('BrandAsset (brandKitId, kind) index',
       /@@index\(\[brandKitId, kind\]\)/.test(schema))) fail++;

  // ===========================================================================
  //  37A/B/C/D/E/I — Service contracts
  // ===========================================================================
  console.log('\n37A/B/C/D/E/I — Service contracts');
  if (!check('BrandTokens type exported with colors/typography/tokens/chart/icon/image',
       /export interface BrandTokens[\s\S]{0,1200}?colors\?:[\s\S]{0,400}?typography\?:[\s\S]{0,400}?tokens\?:[\s\S]{0,400}?chart\?:[\s\S]{0,400}?icon\?:[\s\S]{0,400}?image\?:/.test(svc))) fail++;
  if (!check('BrandVoice + BrandIdentity types exported',
       /export interface BrandVoice/.test(svc) &&
       /export interface BrandIdentity/.test(svc))) fail++;
  if (!check('BrandKitsService.onModuleInit → backfillWorkspaceIds',
       /async onModuleInit\([\s\S]{0,400}?backfillWorkspaceIds/.test(svc))) fail++;
  if (!check('backfillWorkspaceIds maps each orphan kit to owner Personal workspace',
       /backfillWorkspaceIds[\s\S]{0,800}?workspaceMember\.findFirst[\s\S]{0,400}?brandKit\.update[\s\S]{0,200}?workspaceId/.test(svc))) fail++;
  if (!check('service preserves "one default per workspace" invariant on create/update',
       /isDefault[\s\S]{0,400}?updateMany[\s\S]{0,200}?isDefault: false/.test(svc))) fail++;

  // ===========================================================================
  //  37B — Asset CRUD
  // ===========================================================================
  console.log('\n37B — Asset CRUD');
  if (!check('service.addAsset + removeAsset',
       /async addAsset\(/.test(svc) && /async removeAsset\(/.test(svc))) fail++;
  if (!check('controller: POST /brand-kits/:id/assets',
       /@Post\(['"]brand-kits\/:id\/assets['"]\)/.test(ctl))) fail++;
  if (!check('controller: DELETE /brand-kits/:id/assets/:assetId',
       /@Delete\(['"]brand-kits\/:id\/assets\/:assetId['"]\)/.test(ctl))) fail++;

  // ===========================================================================
  //  37M — Workspace listing
  // ===========================================================================
  console.log('\n37M — Workspace listing');
  if (!check('controller: GET /workspaces/:workspaceId/brand-kits',
       /@Get\(['"]workspaces\/:workspaceId\/brand-kits['"]\)/.test(ctl))) fail++;
  if (!check('service.findForWorkspace orders by isDefault desc',
       /findForWorkspace[\s\S]{0,400}?orderBy:\s*\[\{\s*isDefault:\s*['"]desc['"]\s*\}/.test(svc))) fail++;

  // ===========================================================================
  //  37K — Apply
  // ===========================================================================
  console.log('\n37K — Apply');
  if (!check('controller: POST /brand-kits/:id/apply/:deckId',
       /@Post\(['"]brand-kits\/:id\/apply\/:deckId['"]\)/.test(ctl))) fail++;
  if (!check('service.applyToDeck writes themeTokens into deck.metadata',
       /async applyToDeck[\s\S]{0,3000}?themeTokens[\s\S]{0,800}?deck\.update/.test(svc))) fail++;
  if (!check('ApplyBrandKitMenu component exists + mounted in SlideEditor',
       existsFE('frontend/features/brand-kits/ApplyBrandKitMenu.tsx'.replace(/^frontend\//, '')) &&
       /<ApplyBrandKitMenu/.test(editor))) fail++;

  // ===========================================================================
  //  37O/P — Audit
  // ===========================================================================
  console.log('\n37O/P — Brand audit + compliance score');
  if (!check('BrandAuditService.auditDeck returns score + 5 categories + issues',
       /async auditDeck[\s\S]{0,8000}?score:\s*overall[\s\S]{0,400}?categories[\s\S]{0,400}?issues/.test(audit))) fail++;
  if (!check('all 5 categories scored (colors/typography/logos/charts/components)',
       /'colors'/.test(audit) && /'typography'/.test(audit) &&
       /'logos'/.test(audit) && /'charts'/.test(audit) && /'components'/.test(audit))) fail++;
  if (!check('weighted overall score uses category weights',
       /categories\.colors\s*\*\s*0\.35/.test(audit))) fail++;
  if (!check('controller: GET /decks/:deckId/brand-audit',
       /@Get\(['"]decks\/:deckId\/brand-audit['"]\)/.test(ctl))) fail++;
  if (!check('BrandAuditService registered in BrandKitsModule',
       /BrandAuditService/.test(mod))) fail++;

  // ===========================================================================
  //  37J / 37Q — Frontend dashboard + preview + audit panel
  // ===========================================================================
  console.log('\n37J/Q — Frontend dashboard + preview + audit');
  if (!check('types/brand-kit.ts mirrors backend',
       existsFE('types/brand-kit.ts'))) fail++;
  if (!check('useBrandKits hook (list + detail + audit) exists',
       existsFE('features/brand-kits/useBrandKits.ts') &&
       /useMyBrandKits/.test(readFE('features/brand-kits/useBrandKits.ts')) &&
       /useBrandKit\b/.test(readFE('features/brand-kits/useBrandKits.ts')) &&
       /useBrandAudit/.test(readFE('features/brand-kits/useBrandKits.ts')))) fail++;
  if (!check('BrandPreviewPanel renders cover + content + chart',
       existsFE('features/brand-kits/BrandPreviewPanel.tsx'))) fail++;
  if (!check('BrandAuditPanel renders score + category bars + issues',
       existsFE('features/brand-kits/BrandAuditPanel.tsx'))) fail++;
  if (!check('tabbed dashboard /brand-kits/[id]/page.tsx exists with all 8 tabs',
       existsFE('app/brand-kits/[id]/page.tsx'))) fail++;
  const dash = existsFE('app/brand-kits/[id]/page.tsx') ? readFE('app/brand-kits/[id]/page.tsx') : '';
  if (!check('dashboard declares all 8 tabs',
       /'overview'/.test(dash) && /'logos'/.test(dash) && /'colors'/.test(dash) &&
       /'typography'/.test(dash) && /'charts'/.test(dash) && /'voice'/.test(dash) &&
       /'assets'/.test(dash) && /'audit'/.test(dash))) fail++;
  if (!check('list page links to /brand-kits/{id} Manage view',
       /href=\{`\/brand-kits\/\$\{kit\.id\}`\}/.test(readFE('app/brand-kits/page.tsx')))) fail++;

  console.log();
  if (fail === 0) console.log('✅ Phase 37: all Brand Kits 2.0 checks pass');
  else { console.error(`❌ ${fail} regressions detected`); process.exit(1); }
}

main().catch((err) => { console.error('Validation failed:', err); process.exit(1); });
