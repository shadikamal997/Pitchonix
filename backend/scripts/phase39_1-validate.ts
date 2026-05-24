/**
 * Phase 39.1 — Workspace Completion Pass validation
 *
 *   39.1A — WorkspaceSwitcher mounted in Dashboard, Projects, SlideEditor
 *   39.1B — MentionAutocomplete + AssignMenu pass ?workspaceId=
 *   39.1C — Permission matrix extensions + retrofit of remaining controllers
 *   39.1D — DeckShare model + service + controller + DeckShareModal
 *   39.1E — Invite email + resend endpoint + ?token=… accept link
 *
 *   Pure source-scan — no runtime needed.
 */

import * as fs from 'fs';
import * as path from 'path';

const FE = path.join(__dirname, '..', '..', 'frontend');
const BE = path.join(__dirname, '..');
const readFE   = (rel: string): string => fs.readFileSync(path.join(FE, rel), 'utf8');
const readBE   = (rel: string): string => fs.readFileSync(path.join(BE, rel), 'utf8');
const existsBE = (rel: string): boolean => fs.existsSync(path.join(BE, rel));
const existsFE = (rel: string): boolean => fs.existsSync(path.join(FE, rel));

function check(label: string, ok: boolean, detail?: string): boolean {
  console.log(`  ${ok ? '·' : '!'} ${label}${detail ? '  — ' + detail : ''}`);
  return ok;
}

async function main() {
  console.log('Phase 39.1 — Workspace Completion Pass validation\n');
  let fail = 0;

  const schema  = readBE('prisma/schema.prisma');
  const perms   = readBE('src/workspaces/workspace-permissions.ts');
  const guard   = readBE('src/workspaces/role.guard.ts');
  const wsSvc   = readBE('src/workspaces/workspaces.service.ts');
  const wsCtrl  = readBE('src/workspaces/workspaces.controller.ts');
  const wsMod   = readBE('src/workspaces/workspaces.module.ts');
  const emailSvc = readBE('src/email/email.service.ts');
  const dsSvc   = readBE('src/sharing/deck-shares.service.ts');
  const dsCtrl  = readBE('src/sharing/deck-shares.controller.ts');
  const dsMod   = readBE('src/sharing/sharing.module.ts');
  const appMod  = readBE('src/app.module.ts');
  const seCtrl  = readBE('src/slides/slide-elements.controller.ts');
  const meCtrl  = readBE('src/master-elements/master-elements.controller.ts');
  const compCtrl = readBE('src/components/components.controller.ts');
  const expCtrl = readBE('src/slide-export/slide-export.controller.ts');
  const vhCtrl  = readBE('src/version-history/version-history.controller.ts');

  const mention = readFE('features/slide-editor/comments/MentionAutocomplete.tsx');
  const assignM = readFE('features/slide-editor/comments/AssignMenu.tsx');
  const dashPg  = readFE('app/dashboard/page.tsx');
  const projPg  = readFE('app/projects/page.tsx');
  const editor  = readFE('features/slide-editor/SlideEditor.tsx');

  // ===========================================================================
  //  39.1A — WorkspaceSwitcher mounts
  // ===========================================================================
  console.log('39.1A — WorkspaceSwitcher mounts');
  if (!check('Dashboard imports + mounts WorkspaceSwitcher',
       /import\s*{\s*WorkspaceSwitcher\s*}\s*from\s*['"]@\/features\/workspaces\/WorkspaceSwitcher['"]/.test(dashPg) &&
       /<WorkspaceSwitcher/.test(dashPg))) fail++;
  if (!check('Projects page imports + mounts WorkspaceSwitcher',
       /import\s*{\s*WorkspaceSwitcher\s*}\s*from\s*['"]@\/features\/workspaces\/WorkspaceSwitcher['"]/.test(projPg) &&
       /<WorkspaceSwitcher/.test(projPg))) fail++;
  if (!check('SlideEditor imports + mounts WorkspaceSwitcher',
       /import\s*{\s*WorkspaceSwitcher\s*}\s*from\s*['"]@\/features\/workspaces\/WorkspaceSwitcher['"]/.test(editor) &&
       /<WorkspaceSwitcher/.test(editor))) fail++;

  // ===========================================================================
  //  39.1B — workspace-scoped search
  // ===========================================================================
  console.log('\n39.1B — Reviewer / mention search workspace-scoped');
  if (!check('MentionAutocomplete reads useCurrentWorkspace + forwards workspaceId',
       /useCurrentWorkspace/.test(mention) &&
       /params\.workspaceId\s*=\s*workspaceId/.test(mention))) fail++;
  if (!check('AssignMenu reads useCurrentWorkspace + forwards workspaceId',
       /useCurrentWorkspace/.test(assignM) &&
       /params\.workspaceId\s*=\s*workspaceId/.test(assignM))) fail++;

  // ===========================================================================
  //  39.1C — Permission matrix + remaining route retrofits
  // ===========================================================================
  console.log('\n39.1C — Permission matrix + remaining route retrofits');
  for (const action of [
    'elements.view', 'elements.edit',
    'masters.edit', 'components.edit',
    'exports.generate',
    'versionHistory.restore', 'versionHistory.delete',
  ]) {
    if (!check(`matrix has "${action}"`, perms.includes(`'${action}'`))) fail++;
  }
  if (!check('guard supports workspaceFromSlide + workspaceFromElement + workspaceFromVersion',
       /'workspaceFromSlide'/.test(guard) &&
       /'workspaceFromElement'/.test(guard) &&
       /'workspaceFromVersion'/.test(guard))) fail++;
  if (!check('SlideElements: @RequireRole on list/create/update/delete/duplicate',
       /@RequireRole\(['"]elements\.view['"]/.test(seCtrl) &&
       (seCtrl.match(/@RequireRole\(['"]elements\.edit['"]/g) || []).length >= 4)) fail++;
  if (!check('MasterElements: @RequireRole guards (view + edit)',
       /@RequireRole\(['"]deck\.view['"]/.test(meCtrl) &&
       (meCtrl.match(/@RequireRole\(['"]masters\.edit['"]/g) || []).length >= 3)) fail++;
  if (!check('Components: @RequireRole on slide-instance routes',
       /@RequireRole\(['"]deck\.view['"]/.test(compCtrl) &&
       /@RequireRole\(['"]components\.edit['"]/.test(compCtrl))) fail++;
  if (!check('Slide export: @RequireRole on manifest + download',
       (expCtrl.match(/@RequireRole\(['"]exports\.generate['"]/g) || []).length >= 2)) fail++;
  if (!check('Version history: @RequireRole on list + restore + delete',
       /@RequireRole\(['"]versionHistory\.restore['"]/.test(vhCtrl) &&
       /@RequireRole\(['"]versionHistory\.delete['"]/.test(vhCtrl))) fail++;

  // ===========================================================================
  //  39.1D — Deck sharing matrix
  // ===========================================================================
  console.log('\n39.1D — Deck sharing matrix');
  if (!check('schema: Project.sharingMode default "workspace"',
       /sharingMode\s+String\s+@default\("workspace"\)/.test(schema))) fail++;
  if (!check('schema: DeckShare model + (projectId,memberId) unique',
       /^model DeckShare \{[\s\S]+?@@unique\(\[projectId, memberId\]\)/m.test(schema))) fail++;
  if (!check('User backrefs: deckSharesReceived + deckSharesCreated',
       /deckSharesReceived\s+DeckShare\[\][\s\S]+?deckSharesCreated\s+DeckShare\[\]/.test(schema))) fail++;
  if (!check('DeckSharesService.resolvePermission combines workspace role + grants',
       /async resolvePermission\([\s\S]{0,2000}?higher\(workspacePerm, sharePerm\)/.test(dsSvc))) fail++;
  if (!check('DeckSharesService.upsert / revoke / setMode exist',
       /async upsert\(/.test(dsSvc) && /async revoke\(/.test(dsSvc) && /async setMode\(/.test(dsSvc))) fail++;
  const dsEndpoints: Array<[RegExp, string]> = [
    [/@Get\(['"]projects\/:projectId\/shares['"]\)/,                   'GET /projects/:projectId/shares'],
    [/@Post\(['"]projects\/:projectId\/shares['"]\)/,                  'POST /projects/:projectId/shares'],
    [/@Delete\(['"]projects\/:projectId\/shares\/:shareId['"]\)/,      'DELETE .../shares/:shareId'],
    [/@Patch\(['"]projects\/:projectId\/sharing-mode['"]\)/,           'PATCH .../sharing-mode'],
    [/@Get\(['"]projects\/:projectId\/my-permission['"]\)/,            'GET .../my-permission'],
  ];
  for (const [re, name] of dsEndpoints) {
    if (!check(`endpoint ${name}`, re.test(dsCtrl))) fail++;
  }
  if (!check('SharingModule registered in AppModule',
       /SharingModule/.test(appMod))) fail++;
  if (!check('useDeckShares.ts + DeckShareModal.tsx exist',
       existsFE('features/sharing/useDeckShares.ts') &&
       existsFE('features/sharing/DeckShareModal.tsx'))) fail++;
  const shareModal = readFE('features/sharing/DeckShareModal.tsx');
  if (!check('DeckShareModal forwards workspaceId in member search',
       /params\.workspaceId\s*=\s*workspaceId/.test(shareModal))) fail++;
  if (!check('DeckShareModal renders private/workspace/shared visibility radios',
       /private/.test(shareModal) && /workspace/.test(shareModal) && /shared/.test(shareModal))) fail++;

  // ===========================================================================
  //  39.1E — Invite email delivery
  // ===========================================================================
  console.log('\n39.1E — Invite email delivery');
  if (!check('EmailService.sendWorkspaceInviteEmail exists + has token link',
       /async sendWorkspaceInviteEmail/.test(emailSvc) &&
       /\/workspaces\/accept\?token=\$\{input\.token\}/.test(emailSvc))) fail++;
  if (!check('EmailService.sendWorkspaceInviteEmail returns false on failure',
       /sendWorkspaceInviteEmail[\s\S]{0,2000}?return false/.test(emailSvc))) fail++;
  if (!check('WorkspacesModule imports EmailModule',
       /import\s*{\s*EmailModule\s*}/.test(wsMod) &&
       /imports:\s*\[EmailModule\]/.test(wsMod))) fail++;
  if (!check('WorkspacesService.invite fires sendInviteEmail',
       /async invite\([\s\S]+?await this\.sendInviteEmail\(invite\.id\)/.test(wsSvc))) fail++;
  if (!check('WorkspacesService.resendInvite rotates token + extends expiry',
       /async resendInvite\([\s\S]{0,1200}?crypto\.randomBytes\(24\)\.toString\(['"]hex['"]\)[\s\S]{0,400}?expiresAt[\s\S]{0,80}?new Date/.test(wsSvc))) fail++;
  if (!check('POST /workspaces/:id/invites/:inviteId/resend route exists',
       /@Post\(['"]workspaces\/:id\/invites\/:inviteId\/resend['"]\)/.test(wsCtrl))) fail++;

  console.log();
  if (fail === 0) console.log('✅ Phase 39.1: all completion-pass checks pass');
  else { console.error(`❌ ${fail} regressions detected`); process.exit(1); }
}

main().catch((err) => { console.error('Validation failed:', err); process.exit(1); });
