/**
 * Phase 36 — Comments & Review Workflow (Foundation slice) validation
 *
 *   36A — Schema: ReviewRequest model + Deck.reviewStatus + User backrefs
 *   36B — Reviews API: controller + service + module wired into AppModule
 *   36D — Canvas comment pins (CommentPinLayer) mounted in SlideEditor
 *   36E — Comment creation mode (CommentModeOverlay + toolbar btn + C key)
 *   36H — RequestReviewModal mounted; useDeckReviews backs submit/withdraw
 *   36I — ReviewStatusBadge mounted next to DeckVersionBadge in toolbar
 *
 *   Pure source-scan — no Nest runtime needed.
 *
 *   Run:  pnpm ts-node scripts/phase36-foundation-validate.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const FE = path.join(__dirname, '..', '..', 'frontend');
const BE = path.join(__dirname, '..');
function readFE(rel: string): string { return fs.readFileSync(path.join(FE, rel), 'utf8'); }
function readBE(rel: string): string { return fs.readFileSync(path.join(BE, rel), 'utf8'); }
function exists(rel: string, root = BE): boolean { return fs.existsSync(path.join(root, rel)); }

function check(label: string, ok: boolean, detail?: string): boolean {
  console.log(`  ${ok ? '·' : '!'} ${label}${detail ? '  — ' + detail : ''}`);
  return ok;
}

async function main() {
  console.log(`Phase 36 — Comments & Review Foundation validation\n`);
  let fail = 0;

  // ===========================================================================
  //  36A — Schema
  // ===========================================================================
  console.log('36A — Prisma schema');
  const schema = readBE('prisma/schema.prisma');
  if (!check('ReviewRequest model declared',
       /^model ReviewRequest \{/m.test(schema))) fail++;
  if (!check('ReviewRequest has deckId + reviewerId + requestedById',
       /model ReviewRequest \{[\s\S]{0,1200}?deckId[\s\S]{0,400}?requestedById[\s\S]{0,400}?reviewerId/.test(schema))) fail++;
  if (!check('ReviewRequest status defaults to "requested"',
       /status\s+String\s+@default\("requested"\)/.test(schema))) fail++;
  if (!check('ReviewRequest carries optional message + dueDate + openedAt + decidedAt',
       /message\s+String\?[\s\S]{0,200}?dueDate\s+DateTime\?[\s\S]{0,200}?openedAt\s+DateTime\?[\s\S]{0,200}?decidedAt\s+DateTime\?/.test(schema))) fail++;
  if (!check('@@map "review_requests" + (deckId,status) index',
       /@@index\(\[deckId, status\]\)[\s\S]{0,400}?@@map\("review_requests"\)/.test(schema))) fail++;
  if (!check('Deck.reviewStatus String @default("draft")',
       /reviewStatus\s+String\s+@default\("draft"\)/.test(schema))) fail++;
  if (!check('Deck has reviewRequests backref',
       /model Deck \{[\s\S]+?reviewRequests\s+ReviewRequest\[\][\s\S]+?@@map\("decks"\)/.test(schema))) fail++;
  if (!check('User has both requester + reviewer backrefs',
       /reviewRequestsRequested\s+ReviewRequest\[\]\s+@relation\("ReviewRequestRequester"\)[\s\S]{0,300}?reviewRequestsReviewing\s+ReviewRequest\[\]\s+@relation\("ReviewRequestReviewer"\)/.test(schema))) fail++;

  // ===========================================================================
  //  36B — Reviews module
  // ===========================================================================
  console.log('\n36B — Reviews module (controller + service + module)');
  if (!check('reviews/reviews.module.ts exists',  exists('src/reviews/reviews.module.ts'))) fail++;
  if (!check('reviews/reviews.service.ts exists', exists('src/reviews/reviews.service.ts'))) fail++;
  if (!check('reviews/reviews.controller.ts exists', exists('src/reviews/reviews.controller.ts'))) fail++;

  const ctrl    = readBE('src/reviews/reviews.controller.ts');
  const svc     = readBE('src/reviews/reviews.service.ts');
  const appMod  = readBE('src/app.module.ts');

  if (!check('AppModule imports ReviewsModule',
       /import\s*{\s*ReviewsModule\s*}\s*from\s*['"]\.\/reviews\/reviews\.module['"]/.test(appMod))) fail++;
  if (!check('AppModule registers ReviewsModule in imports',
       /imports:\s*\[[\s\S]{0,4000}?ReviewsModule[\s\S]{0,200}?\]/.test(appMod))) fail++;

  // Endpoints
  const endpoints: Array<[RegExp, string]> = [
    [/@Post\(['"]decks\/:deckId\/review-requests['"]\)/,                  'POST /decks/:deckId/review-requests'],
    [/@Get\(['"]decks\/:deckId\/review-requests['"]\)/,                   'GET  /decks/:deckId/review-requests'],
    [/@Get\(['"]decks\/:deckId\/review-status['"]\)/,                     'GET  /decks/:deckId/review-status'],
    [/@Get\(['"]me\/review-requests['"]\)/,                               'GET  /me/review-requests'],
    [/@Patch\(['"]review-requests\/:id\/open['"]\)/,                      'PATCH .../open'],
    [/@Patch\(['"]review-requests\/:id\/approve['"]\)/,                   'PATCH .../approve'],
    [/@Patch\(['"]review-requests\/:id\/request-changes['"]\)/,           'PATCH .../request-changes'],
    [/@Patch\(['"]review-requests\/:id\/withdraw['"]\)/,                  'PATCH .../withdraw'],
  ];
  for (const [re, name] of endpoints) {
    if (!check(`endpoint ${name}`, re.test(ctrl))) fail++;
  }

  // Service guards + transitions
  if (!check('service.create accepts reviewerId OR reviewerEmail',
       /reviewerId\?:\s*string;\s*reviewerEmail\?:\s*string;/.test(svc))) fail++;
  if (!check('service.create rejects self-review',
       /Cannot request review from yourself/.test(svc))) fail++;
  if (!check('service.approve updates deck.reviewStatus = "approved"',
       /async approve[\s\S]{0,800}?reviewStatus:\s*['"]approved['"]/.test(svc))) fail++;
  if (!check('service.requestChanges updates deck.reviewStatus = "changes_requested"',
       /async requestChanges[\s\S]{0,800}?reviewStatus:\s*['"]changes_requested['"]/.test(svc))) fail++;
  if (!check('service.create updates deck.reviewStatus = "in_review"',
       /async create[\s\S]{0,2400}?reviewStatus:\s*['"]in_review['"]/.test(svc))) fail++;
  if (!check('service.withdraw demotes to draft when no active requests remain',
       /async withdraw[\s\S]{0,1200}?stillActive[\s\S]{0,200}?reviewStatus:\s*['"]draft['"]/.test(svc))) fail++;

  // ===========================================================================
  //  36D — Canvas comment pins
  // ===========================================================================
  console.log('\n36D — Canvas comment pins');
  if (!check('CommentPinLayer.tsx exists',
       exists('features/slide-editor/comments/CommentPinLayer.tsx', FE))) fail++;
  const editor = readFE('features/slide-editor/SlideEditor.tsx');
  if (!check('SlideEditor imports CommentPinLayer',
       /import\s*{\s*CommentPinLayer\s*}\s*from\s*['"]\.\/comments\/CommentPinLayer['"]/.test(editor))) fail++;
  if (!check('CommentPinLayer mounted with slideComments.comments',
       /<CommentPinLayer[\s\S]{0,400}?comments=\{slideComments\.comments\}/.test(editor))) fail++;

  // ===========================================================================
  //  36E — Comment creation mode
  // ===========================================================================
  console.log('\n36E — Comment creation mode');
  if (!check('CommentModeOverlay.tsx exists',
       exists('features/slide-editor/comments/CommentModeOverlay.tsx', FE))) fail++;
  if (!check('SlideEditor imports CommentModeOverlay',
       /import\s*{\s*CommentModeOverlay\s*}\s*from\s*['"]\.\/comments\/CommentModeOverlay['"]/.test(editor))) fail++;
  if (!check('commentMode state declared',
       /const \[commentMode, setCommentMode\] = useState\(false\)/.test(editor))) fail++;
  if (!check('bare `c` shortcut toggles commentMode (suppressed during preview)',
       /e\.key\.toLowerCase\(\) === ['"]c['"][\s\S]{0,200}?if \(preview\.isPreviewing\) return;[\s\S]{0,200}?setCommentMode/.test(editor))) fail++;
  if (!check('toolbar button toggles commentMode',
       /onClick=\{\(\) => setCommentMode\(\(v\) => !v\)\}/.test(editor))) fail++;
  if (!check('CommentModeOverlay mounted with active gating on !preview.isPreviewing',
       /<CommentModeOverlay[\s\S]{0,300}?active=\{commentMode && !preview\.isPreviewing\}/.test(editor))) fail++;
  if (!check('overlay onSubmit routes through slideComments.addComment',
       /<CommentModeOverlay[\s\S]{0,800}?onSubmit=\{[\s\S]{0,200}?slideComments\.addComment/.test(editor))) fail++;

  // ===========================================================================
  //  36H — Request Review modal + hook
  // ===========================================================================
  console.log('\n36H — Request Review modal + useDeckReviews hook');
  if (!check('useDeckReviews.ts exists',
       exists('features/slide-editor/reviews/useDeckReviews.ts', FE))) fail++;
  if (!check('RequestReviewModal.tsx exists',
       exists('features/slide-editor/reviews/RequestReviewModal.tsx', FE))) fail++;
  if (!check('SlideEditor imports useDeckReviews',
       /import\s*{\s*useDeckReviews\s*}\s*from\s*['"]\.\/reviews\/useDeckReviews['"]/.test(editor))) fail++;
  if (!check('SlideEditor imports RequestReviewModal',
       /import\s*{\s*RequestReviewModal\s*}\s*from\s*['"]\.\/reviews\/RequestReviewModal['"]/.test(editor))) fail++;
  if (!check('reviews hook instantiated with deckId',
       /const reviews = useDeckReviews\(slide\?\.deckId \|\| null\)/.test(editor))) fail++;
  if (!check('reviewModalOpen state declared',
       /const \[reviewModalOpen, setReviewModalOpen\] = useState\(false\)/.test(editor))) fail++;
  if (!check('RequestReviewModal mounted with status + onSubmit + onWithdraw',
       /<RequestReviewModal[\s\S]{0,400}?status=\{reviews\.status\}[\s\S]{0,400}?onSubmit=\{[\s\S]{0,100}?reviews\.create[\s\S]{0,100}?\}[\s\S]{0,300}?onWithdraw=\{[\s\S]{0,100}?reviews\.withdraw/.test(editor))) fail++;

  // ===========================================================================
  //  36I — Review status badge
  // ===========================================================================
  console.log('\n36I — Review status badge');
  if (!check('ReviewStatusBadge.tsx exists',
       exists('features/slide-editor/reviews/ReviewStatusBadge.tsx', FE))) fail++;
  if (!check('SlideEditor imports ReviewStatusBadge',
       /import\s*{\s*ReviewStatusBadge\s*}\s*from\s*['"]\.\/reviews\/ReviewStatusBadge['"]/.test(editor))) fail++;
  if (!check('ReviewStatusBadge mounted in toolbar opening the modal',
       /<ReviewStatusBadge[\s\S]{0,300}?status=\{reviews\.status\}[\s\S]{0,200}?onClick=\{\(\)\s*=>\s*setReviewModalOpen\(true\)\}/.test(editor))) fail++;

  const badge = readFE('features/slide-editor/reviews/ReviewStatusBadge.tsx');
  if (!check('badge defines all four status variants',
       /draft:[\s\S]{0,300}?in_review:[\s\S]{0,300}?approved:[\s\S]{0,300}?changes_requested:/.test(badge))) fail++;

  console.log();
  if (fail === 0) console.log('✅ Phase 36 foundation: all checks pass');
  else { console.error(`❌ ${fail} regressions detected`); process.exit(1); }
}

main().catch((err) => { console.error('Validation failed:', err); process.exit(1); });
