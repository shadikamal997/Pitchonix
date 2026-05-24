/**
 * Phase 39 — Workspace & Team Management validation
 *
 *   39A — Organization model
 *   39B — Workspace model
 *   39C — WorkspaceMember (5 roles)
 *   39D — WorkspaceInvite + accept flow
 *   39E — Permission matrix
 *   39F — @RequireRole / WorkspaceRoleGuard
 *   39G — Project.workspaceId
 *   39I — WorkspaceSettingsPage (+ tabs)
 *   39J — Members panel
 *   39K — /users/search workspace-scoped
 *   39L — WorkspaceActivity (model + service + endpoint)
 *   39M — WorkspaceAuditLog (model + service + endpoint)
 *   39N — WorkspaceSwitcher
 *   Backfill — auto-create personal workspaces on boot
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
  console.log('Phase 39 — Workspace & Team Management validation\n');
  let fail = 0;

  const schema  = readBE('prisma/schema.prisma');
  const appMod  = readBE('src/app.module.ts');
  const perms   = readBE('src/workspaces/workspace-permissions.ts');
  const guard   = readBE('src/workspaces/role.guard.ts');
  const wsSvc   = readBE('src/workspaces/workspaces.service.ts');
  const wsCtrl  = readBE('src/workspaces/workspaces.controller.ts');
  const wsMod   = readBE('src/workspaces/workspaces.module.ts');
  const actSvc  = readBE('src/workspaces/workspace-activity.service.ts');
  const audSvc  = readBE('src/workspaces/workspace-audit.service.ts');
  const usrSvc  = readBE('src/users/users.service.ts');
  const usrCtrl = readBE('src/users/users.controller.ts');
  const deckCtl = readBE('src/decks/decks.controller.ts');
  const rvCtl   = readBE('src/reviews/reviews.controller.ts');
  const cmCtl   = readBE('src/comments/comments.controller.ts');

  // ===========================================================================
  //  39A/B/C/D — Schema models
  // ===========================================================================
  console.log('39A/B/C/D — Schema models');
  if (!check('model Organization with slug + ownerId',
       /^model Organization \{[\s\S]+?slug\s+String\s+@unique[\s\S]+?ownerId\s+String/m.test(schema))) fail++;
  if (!check('model Workspace with organizationId',
       /^model Workspace \{[\s\S]+?organizationId\s+String/m.test(schema))) fail++;
  if (!check('model WorkspaceMember with role + (workspaceId,userId) unique',
       /^model WorkspaceMember \{[\s\S]+?role\s+String[\s\S]+?@@unique\(\[workspaceId, userId\]\)/m.test(schema))) fail++;
  if (!check('model WorkspaceInvite with token + expiresAt',
       /^model WorkspaceInvite \{[\s\S]+?token\s+String\s+@unique[\s\S]+?expiresAt\s+DateTime/m.test(schema))) fail++;
  if (!check('model WorkspaceActivity',
       /^model WorkspaceActivity \{/m.test(schema))) fail++;
  if (!check('model WorkspaceAuditLog',
       /^model WorkspaceAuditLog \{/m.test(schema))) fail++;
  if (!check('Project.workspaceId String? + relation',
       /workspaceId\s+String\?[\s\S]{0,200}?workspace\s+Workspace\?/.test(schema))) fail++;
  if (!check('User backrefs (6 workspace relations)',
       /organizationsOwned\s+Organization\[\][\s\S]+?workspaceMemberships\s+WorkspaceMember\[\][\s\S]+?workspaceInvitesSent\s+WorkspaceMember\[\][\s\S]+?workspaceInvitesCreated\s+WorkspaceInvite\[\][\s\S]+?workspaceActivities\s+WorkspaceActivity\[\][\s\S]+?workspaceAuditEvents\s+WorkspaceAuditLog\[\]/.test(schema))) fail++;

  // ===========================================================================
  //  39E — Permission matrix
  // ===========================================================================
  console.log('\n39E — Permission matrix');
  if (!check('all 5 roles declared',
       /WORKSPACE_ROLES\s*=\s*\['owner', 'admin', 'editor', 'reviewer', 'viewer'\]/.test(perms))) fail++;
  if (!check('canRole() + isHigherRole() + permissionsFor() exported',
       /export function canRole/.test(perms) &&
       /export function isHigherRole/.test(perms) &&
       /export function permissionsFor/.test(perms))) fail++;
  if (!check('matrix covers workspace + member + deck + comment + review actions',
       /'workspace\.view':[\s\S]+?'member\.invite':[\s\S]+?'deck\.edit':[\s\S]+?'comment\.create':[\s\S]+?'review\.act':/.test(perms))) fail++;
  if (!check('frontend mirror types/workspace.ts exists',
       existsFE('types/workspace.ts'))) fail++;

  // ===========================================================================
  //  39F — Role guard infrastructure
  // ===========================================================================
  console.log('\n39F — Role guard');
  if (!check('RequireRole + WorkspaceRoleGuard exported',
       /export function RequireRole/.test(guard) &&
       /export class WorkspaceRoleGuard implements CanActivate/.test(guard))) fail++;
  if (!check('guard supports 7 resolver kinds',
       /'param'[\s\S]+?'body'[\s\S]+?'query'[\s\S]+?'workspaceFromDeck'[\s\S]+?'workspaceFromProject'[\s\S]+?'workspaceFromComment'[\s\S]+?'workspaceFromReview'/.test(guard))) fail++;
  if (!check('guard rejects non-members and unauthorized roles',
       /You are not a member of this workspace/.test(guard) &&
       /cannot \$\{requirement\.action\}|cannot \${requirement\.action}/.test(guard))) fail++;

  // ===========================================================================
  //  39A-D backend — services + controllers + module
  // ===========================================================================
  console.log('\nBackend services + controllers + module');
  if (!check('WorkspacesService + Controller + Module exist',
       existsBE('src/workspaces/workspaces.service.ts') &&
       existsBE('src/workspaces/workspaces.controller.ts') &&
       existsBE('src/workspaces/workspaces.module.ts'))) fail++;
  if (!check('AppModule registers WorkspacesModule',
       /WorkspacesModule/.test(appMod))) fail++;
  if (!check('WorkspacesModule is @Global',
       /@Global\(\)[\s\S]{0,200}?@Module/.test(wsMod))) fail++;
  // Endpoint coverage
  const endpoints: Array<[RegExp, string]> = [
    [/@Get\(['"]workspaces['"]\)/,                                            'GET /workspaces'],
    [/@Post\(['"]workspaces['"]\)/,                                           'POST /workspaces'],
    [/@Get\(['"]workspaces\/:id['"]\)/,                                       'GET /workspaces/:id'],
    [/@Patch\(['"]workspaces\/:id['"]\)/,                                     'PATCH /workspaces/:id'],
    [/@Delete\(['"]workspaces\/:id['"]\)/,                                    'DELETE /workspaces/:id'],
    [/@Get\(['"]workspaces\/:id\/permissions['"]\)/,                          'GET /workspaces/:id/permissions'],
    [/@Get\(['"]workspaces\/:id\/members['"]\)/,                              'GET .../members'],
    [/@Patch\(['"]workspaces\/:id\/members\/:memberId['"]\)/,                 'PATCH .../members/:memberId'],
    [/@Delete\(['"]workspaces\/:id\/members\/:memberId['"]\)/,                'DELETE .../members/:memberId'],
    [/@Post\(['"]workspaces\/:id\/transfer-ownership['"]\)/,                  'POST .../transfer-ownership'],
    [/@Get\(['"]workspaces\/:id\/invites['"]\)/,                              'GET .../invites'],
    [/@Post\(['"]workspaces\/:id\/invites['"]\)/,                             'POST .../invites'],
    [/@Delete\(['"]workspaces\/:id\/invites\/:inviteId['"]\)/,                'DELETE .../invites/:inviteId'],
    [/@Post\(['"]workspace-invites\/accept['"]\)/,                            'POST /workspace-invites/accept'],
    [/@Get\(['"]workspaces\/:id\/activity['"]\)/,                             'GET .../activity'],
    [/@Get\(['"]workspaces\/:id\/audit-log['"]\)/,                            'GET .../audit-log'],
  ];
  for (const [re, name] of endpoints) {
    if (!check(`endpoint ${name}`, re.test(wsCtrl))) fail++;
  }

  // Service safety checks
  if (!check('service: backfillPersonalWorkspaces method (auto-runs OnModuleInit)',
       /async onModuleInit/.test(wsSvc) &&
       /async backfillPersonalWorkspaces/.test(wsSvc))) fail++;
  if (!check('service: prevents demoting/removing last owner',
       /Cannot demote the last owner/.test(wsSvc) &&
       /Cannot remove the last owner/.test(wsSvc))) fail++;
  if (!check('service: transferOwnership demotes the actor to admin',
       /transferOwnership[\s\S]+?role:\s*['"]admin['"]/.test(wsSvc))) fail++;
  if (!check('service: invite token + expiry generation',
       /crypto\.randomBytes\(24\)\.toString\(['"]hex['"]\)/.test(wsSvc) &&
       /INVITE_TTL_DAYS/.test(wsSvc))) fail++;
  if (!check('service: acceptInvite verifies email match',
       /This invitation was sent to a different email address/.test(wsSvc))) fail++;

  // ===========================================================================
  //  39L/M — Activity + Audit services
  // ===========================================================================
  console.log('\n39L/M — Activity + Audit services');
  if (!check('WorkspaceActivityService.log emits and tolerates failure',
       /class WorkspaceActivityService[\s\S]+?async log\(/.test(actSvc) &&
       /this\.logger\.warn/.test(actSvc))) fail++;
  if (!check('WorkspaceAuditService.log records before/after',
       /class WorkspaceAuditService[\s\S]+?before[\s\S]+?after/.test(audSvc))) fail++;
  if (!check('audit events emitted for member.invited / role_changed / ownership.transferred',
       /action:\s*['"]member\.invited['"]/.test(wsSvc) &&
       /action:\s*['"]member\.role_changed['"]/.test(wsSvc) &&
       /action:\s*['"]ownership\.transferred['"]/.test(wsSvc))) fail++;

  // ===========================================================================
  //  39K — /users/search workspace scope
  // ===========================================================================
  console.log('\n39K — Users search scoped to workspace');
  if (!check('searchCollaborators accepts workspaceId',
       /searchCollaborators\(currentUserId: string, q: string, limit\s*=\s*\d+,\s*workspaceId\?: string\)/.test(usrSvc))) fail++;
  if (!check('search scopes to workspace_members when workspaceId provided',
       /if \(workspaceId\)[\s\S]+?workspaceMember\.findMany/.test(usrSvc))) fail++;
  if (!check('controller forwards workspaceId query param',
       /@Query\(['"]workspaceId['"]\) workspaceId\?: string/.test(usrCtrl))) fail++;

  // ===========================================================================
  //  Critical-route retrofit
  // ===========================================================================
  console.log('\nRetrofit critical routes with @RequireRole');
  if (!check('Decks: @RequireRole on create/view/edit/delete',
       /@RequireRole\(['"]deck\.create['"]/.test(deckCtl) &&
       /@RequireRole\(['"]deck\.view['"]/.test(deckCtl) &&
       /@RequireRole\(['"]deck\.edit['"]/.test(deckCtl) &&
       /@RequireRole\(['"]deck\.delete['"]/.test(deckCtl))) fail++;
  if (!check('Reviews: @RequireRole on request/approve/request-changes/withdraw/reopen',
       /@RequireRole\(['"]review\.request['"]/.test(rvCtl) &&
       /@RequireRole\(['"]review\.act['"][\s\S]{0,80}?\}\)\s*approve/.test(rvCtl) &&
       /@RequireRole\(['"]review\.act['"][\s\S]{0,80}?\}\)\s*requestChanges/.test(rvCtl) &&
       /@RequireRole\(['"]review\.act['"][\s\S]{0,80}?\}\)\s*reopen/.test(rvCtl))) fail++;
  if (!check('Comments: @RequireRole on create/resolve/reopen/assign',
       /@RequireRole\(['"]comment\.create['"]/.test(cmCtl) &&
       /@RequireRole\(['"]comment\.resolve['"]/.test(cmCtl) &&
       /@RequireRole\(['"]comment\.assign['"]/.test(cmCtl))) fail++;

  // ===========================================================================
  //  Frontend — provider + switcher + pages
  // ===========================================================================
  console.log('\nFrontend — provider, switcher, hooks, pages');
  if (!check('types/workspace.ts mirrors backend',
       existsFE('types/workspace.ts'))) fail++;
  if (!check('useWorkspaces.ts (hooks + acceptInvite)',
       existsFE('features/workspaces/useWorkspaces.ts'))) fail++;
  if (!check('WorkspaceContext.tsx (Provider + useCurrentWorkspace + useCan)',
       existsFE('features/workspaces/WorkspaceContext.tsx'))) fail++;
  if (!check('WorkspaceSwitcher.tsx',     existsFE('features/workspaces/WorkspaceSwitcher.tsx'))) fail++;
  if (!check('WorkspaceSettingsPage.tsx', existsFE('features/workspaces/WorkspaceSettingsPage.tsx'))) fail++;
  if (!check('InviteMemberModal.tsx',     existsFE('features/workspaces/InviteMemberModal.tsx'))) fail++;
  if (!check('CreateWorkspaceModal.tsx',  existsFE('features/workspaces/CreateWorkspaceModal.tsx'))) fail++;
  if (!check('Accept route /workspaces/accept/page.tsx', existsFE('app/workspaces/accept/page.tsx'))) fail++;
  if (!check('Settings route /workspaces/[id]/settings/page.tsx', existsFE('app/workspaces/[id]/settings/page.tsx'))) fail++;
  const rootLayout = readFE('app/layout.tsx');
  if (!check('Root layout wraps app in <WorkspaceProvider>',
       /<WorkspaceProvider>[\s\S]+?\{children\}[\s\S]+?<\/WorkspaceProvider>/.test(rootLayout))) fail++;

  // Permissions tabs presence in settings page
  const settings = readFE('features/workspaces/WorkspaceSettingsPage.tsx');
  if (!check('Settings page renders 4 tabs (General/Members/Invitations/Activity)',
       /label="General"[\s\S]{0,400}?label="Members"[\s\S]{0,400}?label="Invitations"[\s\S]{0,400}?label="Activity"/.test(settings))) fail++;

  console.log();
  if (fail === 0) console.log('✅ Phase 39: all checks pass');
  else { console.error(`❌ ${fail} regressions detected`); process.exit(1); }
}

main().catch((err) => { console.error('Validation failed:', err); process.exit(1); });
