/**
 * Phase 36.1 — Comments & Review Workflow COMPLETE validation
 *
 *   36.1A — Mentions (parser, autocomplete, rendering, persistence)
 *   36.1B — Reviewer Mode (banner, read-only, comments preserved)
 *   36.1C — Version History Integration (snapshot on transitions)
 *   36.1D — Counts & filter tabs (CommentsPanel)
 *   36.1E — Thread UX (edit/delete soft/edited badge/relative time/reply count)
 *   36.1F — Review Dashboard panel
 *   36.1G — Reopen review + open endpoints
 *   36.1H — Comment assignment (model + service + AssignMenu)
 *   36.1I — Role-aware access (owner/reviewer guards in services)
 *   36.1J — PDF export with comments appendix (opt-in via ?withComments)
 *   36.1K — Resolve all (per-slide + per-deck endpoints + UI button)
 *   36.1L — Comment search (server endpoint + panel)
 *   36.1M — ReviewEventBus (comment.* and review.* events emitted)
 *
 *   Pure source-scan — no runtime needed.
 *   Run:  pnpm ts-node scripts/phase36-complete-validate.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const FE = path.join(__dirname, '..', '..', 'frontend');
const BE = path.join(__dirname, '..');
const readFE = (rel: string): string => fs.readFileSync(path.join(FE, rel), 'utf8');
const readBE = (rel: string): string => fs.readFileSync(path.join(BE, rel), 'utf8');
const existsBE = (rel: string): boolean => fs.existsSync(path.join(BE, rel));
const existsFE = (rel: string): boolean => fs.existsSync(path.join(FE, rel));

function check(label: string, ok: boolean, detail?: string): boolean {
  console.log(`  ${ok ? '·' : '!'} ${label}${detail ? '  — ' + detail : ''}`);
  return ok;
}

async function main() {
  console.log(`Phase 36.1 — Comments & Review Workflow COMPLETE validation\n`);
  let fail = 0;

  const schema    = readBE('prisma/schema.prisma');
  const cSvc      = readBE('src/comments/comments.service.ts');
  const cCtrl     = readBE('src/comments/comments.controller.ts');
  const cMod      = readBE('src/comments/comments.module.ts');
  const rSvc      = readBE('src/reviews/reviews.service.ts');
  const rCtrl     = readBE('src/reviews/reviews.controller.ts');
  const rMod      = readBE('src/reviews/reviews.module.ts');
  const usrCtrl   = readBE('src/users/users.controller.ts');
  const usrSvc    = readBE('src/users/users.service.ts');
  const vTypes    = readBE('src/version-history/version-types.ts');
  const editor    = readFE('features/slide-editor/SlideEditor.tsx');
  const panel     = readFE('features/slide-editor/comments/CommentsPanel.tsx');
  const hook      = readFE('features/slide-editor/comments/useSlideComments.ts');
  const reviewHook= readFE('features/slide-editor/reviews/useDeckReviews.ts');
  const exporter  = readBE('src/slide-export/element-image-exporter.ts');
  const exportSvc = readBE('src/slide-export/slide-export.service.ts');
  const exportCtl = readBE('src/slide-export/slide-export.controller.ts');
  const expMenu   = readFE('features/slide-editor/export/ExportMenu.tsx');

  // ===========================================================================
  //  36.1A — Mentions
  // ===========================================================================
  console.log('36.1A — Mentions');
  if (!check('schema: Comment.mentions Json?',
       /model Comment[\s\S]+?mentions\s+Json\?/.test(schema))) fail++;
  if (!check('backend mention-parser exists',
       existsBE('src/comments/mention-parser.ts'))) fail++;
  if (!check('CommentsService parses mentions on create',
       /private async parseAndResolveMentions/.test(cSvc) &&
       /parseAndResolveMentions\(content, projectId\)/.test(cSvc))) fail++;
  if (!check('frontend MentionAutocomplete + MentionTextarea + MentionText + tokenizer exist',
       existsFE('features/slide-editor/comments/MentionAutocomplete.tsx') &&
       existsFE('features/slide-editor/comments/MentionTextarea.tsx') &&
       existsFE('features/slide-editor/comments/MentionText.tsx') &&
       existsFE('features/slide-editor/comments/mention-tokens.ts'))) fail++;
  if (!check('CommentsPanel uses MentionTextarea + MentionText',
       /import\s*{\s*MentionTextarea\s*}/.test(panel) &&
       /import\s*{\s*MentionText\s*}/.test(panel))) fail++;
  if (!check('GET /users/search endpoint registered',
       /@Get\(['"]search['"]\)/.test(usrCtrl) &&
       /searchCollaborators/.test(usrSvc))) fail++;

  // ===========================================================================
  //  36.1B — Reviewer Mode
  // ===========================================================================
  console.log('\n36.1B — Reviewer Mode');
  if (!check('ReviewerBanner.tsx exists',
       existsFE('features/slide-editor/reviews/ReviewerBanner.tsx'))) fail++;
  if (!check('SlideEditor imports ReviewerBanner',
       /import\s*{\s*ReviewerBanner\s*}/.test(editor))) fail++;
  if (!check('isReviewerMode derived from reviews.isReviewerForMe(currentUserId)',
       /const isReviewerMode\s*=\s*reviews\.isReviewerForMe\(currentUserId\)/.test(editor))) fail++;
  if (!check('editingDisabled combines preview + reviewer mode',
       /const editingDisabled\s*=\s*preview\.isPreviewing \|\| isReviewerMode/.test(editor))) fail++;
  if (!check('readOnly props use editingDisabled (3 sites)',
       (editor.match(/readOnly=\{editingDisabled\}/g) || []).length >= 3)) fail++;
  if (!check('ReviewerBanner mounted with all 4 actions',
       /<ReviewerBanner[\s\S]{0,800}?onOpen=\{[\s\S]{0,200}?onApprove=\{[\s\S]{0,200}?onRequestChanges=\{[\s\S]{0,200}?onReopen=/.test(editor))) fail++;
  if (!check('useDeckReviews exposes isReviewerForMe + activeRequest + open/reopen',
       /isReviewerForMe/.test(reviewHook) &&
       /activeRequest/.test(reviewHook) &&
       /const open = useCallback/.test(reviewHook) &&
       /const reopen = useCallback/.test(reviewHook))) fail++;

  // ===========================================================================
  //  36.1C — Version History Integration
  // ===========================================================================
  console.log('\n36.1C — Version History Integration');
  if (!check('DeckVersionType extends with REVIEW_* + COMMENTS_RESOLVED_ALL',
       /REVIEW_REQUESTED[\s\S]+?REVIEW_STARTED[\s\S]+?REVIEW_APPROVED[\s\S]+?REVIEW_CHANGES_REQUESTED[\s\S]+?COMMENTS_RESOLVED_ALL/.test(vTypes))) fail++;
  if (!check('ReviewsService imports VersionHistoryService',
       /import\s*{\s*VersionHistoryService\s*}/.test(rSvc))) fail++;
  if (!check('ReviewsModule imports VersionHistoryModule',
       /imports:\s*\[VersionHistoryModule\]/.test(rMod))) fail++;
  if (!check('snapshot helper + transition-time calls (create / open / approve / requestChanges)',
       /private async snapshot/.test(rSvc) &&
       /REVIEW_REQUESTED[\s\S]+?Before review request/.test(rSvc) &&
       /REVIEW_STARTED[\s\S]+?Review started/.test(rSvc) &&
       /REVIEW_APPROVED[\s\S]+?Approved version/.test(rSvc) &&
       /REVIEW_CHANGES_REQUESTED[\s\S]+?Changes requested/.test(rSvc))) fail++;

  // ===========================================================================
  //  36.1D — Counts + Filter tabs
  // ===========================================================================
  console.log('\n36.1D — Counts + Filter tabs');
  if (!check('CommentsPanel: tab state (open/all/resolved/mine/slide)',
       /type FilterTab\s*=\s*['"]all['"]\s*\|\s*['"]open['"]\s*\|\s*['"]resolved['"]\s*\|\s*['"]mine['"]\s*\|\s*['"]slide['"]/.test(panel))) fail++;
  if (!check('CommentsPanel renders four TabButtons with counts',
       (panel.match(/<TabButton\b/g) || []).length >= 4)) fail++;
  if (!check('counts computed (all/open/resolved/mine)',
       /const counts\s*=\s*useMemo[\s\S]{0,400}?all:[\s\S]{0,40}?open:[\s\S]{0,40}?resolved:[\s\S]{0,40}?mine:/.test(panel))) fail++;

  // ===========================================================================
  //  36.1E — Thread UX (edit / soft-delete / edited badge / reply count)
  // ===========================================================================
  console.log('\n36.1E — Thread UX');
  if (!check('CommentsService.edit (own only) + editedAt set',
       /async edit\(id: string, userId: string, content: string\)[\s\S]{0,800}?editedAt: new Date\(\)/.test(cSvc))) fail++;
  if (!check('CommentsService.remove uses soft delete (deletedAt + content="[deleted]")',
       /async remove[\s\S]{0,800}?deletedAt: new Date\(\)[\s\S]{0,200}?content:\s*['"]\[deleted\]['"]/.test(cSvc))) fail++;
  if (!check('Controller has PATCH /comments/:id edit endpoint',
       /@Patch\(['"]comments\/:id['"]\)[\s\S]{0,200}?edit\(/.test(cCtrl))) fail++;
  if (!check('Panel renders edited badge + reply count + relative time helper',
       /italic[\s\S]{0,40}?edited/.test(panel) &&
       /repl\{[\s\S]{0,40}?\? ['"]y['"]\s*:\s*['"]ies['"]/.test(panel) &&
       /import\s*{\s*relativeTime\s*}/.test(panel))) fail++;
  if (!check('useSlideComments hook exposes edit + assign + resolveAll',
       /edit:\s*\(id: string, content: string\)/.test(hook) &&
       /assign:\s*\(id: string, assigneeId: string \| null\)/.test(hook) &&
       /resolveAll:\s*\(\) => Promise<number>/.test(hook))) fail++;

  // ===========================================================================
  //  36.1F — Review Dashboard
  // ===========================================================================
  console.log('\n36.1F — Review Dashboard');
  if (!check('ReviewDashboardPanel.tsx exists',
       existsFE('features/slide-editor/reviews/ReviewDashboardPanel.tsx'))) fail++;
  if (!check('SlideEditor imports + mounts ReviewDashboardPanel',
       /import\s*{\s*ReviewDashboardPanel\s*}/.test(editor) &&
       /<ReviewDashboardPanel/.test(editor))) fail++;
  if (!check('Toolbar Reviews button toggles reviewDashboardOpen',
       /setReviewDashboardOpen\(\(v\) => !v\)/.test(editor))) fail++;
  if (!check('dashboard hits /me/review-requests endpoint',
       /me\/review-requests/.test(readFE('features/slide-editor/reviews/ReviewDashboardPanel.tsx')))) fail++;

  // ===========================================================================
  //  36.1G — Reviewer Actions (open + reopen)
  // ===========================================================================
  console.log('\n36.1G — Reviewer actions');
  if (!check('reviews controller has /open + /reopen endpoints',
       /@Patch\(['"]review-requests\/:id\/open['"]\)/.test(rCtrl) &&
       /@Patch\(['"]review-requests\/:id\/reopen['"]\)/.test(rCtrl))) fail++;
  if (!check('reviews service.reopen: changes_requested → in_review',
       /async reopen[\s\S]{0,800}?Only changes-requested reviews can be re-opened[\s\S]{0,800}?status:\s*['"]in_review['"]/.test(rSvc))) fail++;
  if (!check('open sets openedAt + flips status to in_review',
       /async open[\s\S]{0,800}?status:\s*['"]in_review['"],\s*openedAt: new Date\(\)/.test(rSvc))) fail++;

  // ===========================================================================
  //  36.1H — Comment Assignment
  // ===========================================================================
  console.log('\n36.1H — Comment Assignment');
  if (!check('schema: Comment.assignedToId + assignedTo User relation',
       /assignedToId\s+String\?/.test(schema) &&
       /assignedTo\s+User\?\s+@relation\("CommentAssignee"/.test(schema))) fail++;
  if (!check('schema: User.commentsAssigned backref',
       /commentsAssigned\s+Comment\[\]\s+@relation\("CommentAssignee"\)/.test(schema))) fail++;
  if (!check('service.assign + replies guard',
       /async assign\(id: string, userId: string, assigneeId: string \| null\)/.test(cSvc) &&
       /Replies cannot be assigned/.test(cSvc))) fail++;
  if (!check('controller: PATCH /comments/:id/assign',
       /@Patch\(['"]comments\/:id\/assign['"]\)/.test(cCtrl))) fail++;
  if (!check('AssignMenu.tsx exists',
       existsFE('features/slide-editor/comments/AssignMenu.tsx'))) fail++;

  // ===========================================================================
  //  36.1I — Role-aware access
  // ===========================================================================
  console.log('\n36.1I — Role-aware access');
  if (!check('reviews: assertDeckOwner / assertRequesterOrReviewer',
       /assertDeckOwner/.test(rSvc) &&
       /assertRequesterOrReviewer/.test(rSvc))) fail++;
  if (!check('reviews: approve/requestChanges gated by isReviewer',
       /async approve[\s\S]{0,400}?if \(!isReviewer\)/.test(rSvc) &&
       /async requestChanges[\s\S]{0,400}?if \(!isReviewer\)/.test(rSvc))) fail++;
  if (!check('reviews: withdraw gated by isOwner',
       /async withdraw[\s\S]{0,400}?if \(!isOwner\)/.test(rSvc))) fail++;
  if (!check('comments: assertProjectAccess used throughout',
       (cSvc.match(/this\.assertProjectAccess/g) || []).length >= 3)) fail++;
  if (!check('comments: remove enforces author-only',
       /async remove[\s\S]{0,400}?Cannot delete another user's comment/.test(cSvc))) fail++;
  if (!check('comments: edit enforces author-only',
       /async edit[\s\S]{0,800}?Cannot edit another user's comment/.test(cSvc))) fail++;

  // ===========================================================================
  //  36.1J — Export with comments
  // ===========================================================================
  console.log('\n36.1J — Export with comments (PDF appendix)');
  if (!check('exporter: PdfAppendixComment + PdfExportOptions types',
       /export interface PdfAppendixComment/.test(exporter) &&
       /export interface PdfExportOptions/.test(exporter))) fail++;
  if (!check('exporter: composePdfFromPngs accepts optional appendix',
       /composePdfFromPngs\([\s\S]{0,200}?appendix\?: PdfAppendixComment\[\]/.test(exporter))) fail++;
  if (!check('exporter: drawAppendixPages renders headings + word-wrap',
       /function drawAppendixPages/.test(exporter) &&
       /Comments appendix/.test(exporter) &&
       /function wrapText/.test(exporter))) fail++;
  if (!check('service: export() accepts options.includeComments + loads appendix',
       /options:\s*\{\s*includeComments\?\:\s*boolean\s*\}/.test(exportSvc) &&
       /loadCommentsAppendix/.test(exportSvc))) fail++;
  if (!check('controller: ?withComments query forwarded to service',
       /withComments[\s\S]{0,200}?includeComments/.test(exportCtl))) fail++;
  if (!check('frontend ExportMenu: comments-appendix checkbox + URL flag',
       /setWithComments/.test(expMenu) &&
       /withComments=1/.test(expMenu))) fail++;

  // ===========================================================================
  //  36.1K — Resolve all
  // ===========================================================================
  console.log('\n36.1K — Resolve all');
  if (!check('service.resolveAllForSlide + .resolveAllForDeck',
       /async resolveAllForSlide/.test(cSvc) &&
       /async resolveAllForDeck/.test(cSvc))) fail++;
  if (!check('controller: POST /slides/:slideId/comments/resolve-all',
       /@Post\(['"]slides\/:slideId\/comments\/resolve-all['"]\)/.test(cCtrl))) fail++;
  if (!check('CommentsPanel handleResolveAll button uses CheckCheck icon',
       /handleResolveAll/.test(panel) &&
       /CheckCheck/.test(panel))) fail++;

  // ===========================================================================
  //  36.1L — Search
  // ===========================================================================
  console.log('\n36.1L — Search');
  if (!check('service.search filters content + author + replies + mention names + slide title',
       /async search[\s\S]{0,1600}?slideTitle[\s\S]{0,400}?mentions/.test(cSvc))) fail++;
  if (!check('controller: GET /projects/:projectId/comments/search?q=',
       /@Get\(['"]projects\/:projectId\/comments\/search['"]\)/.test(cCtrl))) fail++;
  if (!check('CommentsPanel search input filters across author + mentions',
       /Search author, message, @mention/.test(panel))) fail++;

  // ===========================================================================
  //  36.1M — Event hooks
  // ===========================================================================
  console.log('\n36.1M — ReviewEventBus');
  if (!check('review-event-bus exists',
       existsBE('src/reviews/review-event-bus.ts'))) fail++;
  const bus = readBE('src/reviews/review-event-bus.ts');
  const expectedEvents = [
    'comment.created', 'comment.resolved', 'comment.reopened',
    'comment.assigned', 'comments.resolved_all',
    'review.requested', 'review.started', 'review.approved',
    'review.changes_requested', 'review.withdrawn', 'review.reopened',
  ];
  for (const ev of expectedEvents) {
    if (!check(`event "${ev}" declared on ReviewEvent union`,
         bus.includes(`'${ev}'`))) fail++;
  }
  if (!check('ReviewsModule exports ReviewEventBus + CommentsModule imports ReviewsModule',
       /providers:\s*\[ReviewsService, ReviewEventBus\][\s\S]{0,200}?exports:\s*\[ReviewsService, ReviewEventBus\]/.test(rMod) &&
       /import\s*{\s*ReviewsModule\s*}/.test(cMod))) fail++;
  if (!check('CommentsService emits events from create / resolve / assign / resolveAll',
       /this\.events\.emit\(\{ type:\s*['"]comment\.created['"]/.test(cSvc) &&
       /this\.events\.emit\(\{ type:\s*['"]comment\.resolved['"]/.test(cSvc) &&
       /this\.events\.emit\(\{ type:\s*['"]comment\.assigned['"]/.test(cSvc) &&
       /this\.events\.emit\(\{ type:\s*['"]comments\.resolved_all['"]/.test(cSvc))) fail++;
  if (!check('ReviewsService emits events for review.* transitions',
       /this\.events\.emit\(\{[\s\S]{0,100}?type:\s*['"]review\.requested['"]/.test(rSvc) &&
       /this\.events\.emit\(\{[\s\S]{0,100}?type:\s*['"]review\.approved['"]/.test(rSvc) &&
       /this\.events\.emit\(\{[\s\S]{0,100}?type:\s*['"]review\.changes_requested['"]/.test(rSvc) &&
       /this\.events\.emit\(\{[\s\S]{0,100}?type:\s*['"]review\.reopened['"]/.test(rSvc))) fail++;

  console.log();
  if (fail === 0) console.log('✅ Phase 36.1: all completion-pass checks pass');
  else { console.error(`❌ ${fail} regressions detected`); process.exit(1); }
}

main().catch((err) => { console.error('Validation failed:', err); process.exit(1); });
