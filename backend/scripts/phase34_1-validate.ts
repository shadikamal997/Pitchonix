/**
 * Phase 34.1 — Real-Time Collaboration Completion Pass validation
 *
 *   34.1A — Slide CRUD broadcasting (create/update/delete/duplicate/reorder)
 *   34.1B — Version event broadcasting (snapshot_created/restored/deleted/renamed)
 *   34.1C/H — Editing awareness (editing.started/stopped + indicator)
 *   34.1D — Redis adapter (@socket.io/redis-adapter) wired conditionally
 *   34.1E — Yjs server-side relay + frontend useYDoc + awareness
 *   34.1G — Offline collaboration event queue + replay
 *   34.1I — rAF cursor batching + remote-editing reaper
 *
 *   Pure source-scan — no runtime required.
 */

import * as fs from 'fs';
import * as path from 'path';

const FE = path.join(__dirname, '..', '..', 'frontend');
const BE = path.join(__dirname, '..');
const readFE   = (rel: string): string => fs.readFileSync(path.join(FE, rel), 'utf8');
const readBE   = (rel: string): string => fs.readFileSync(path.join(BE, rel), 'utf8');
const existsFE = (rel: string): boolean => fs.existsSync(path.join(FE, rel));

function check(label: string, ok: boolean): boolean {
  console.log(`  ${ok ? '·' : '!'} ${label}`);
  return ok;
}

async function main() {
  console.log('Phase 34.1 — Real-Time Collaboration Completion Pass validation\n');
  let fail = 0;

  const slidesSvc  = readBE('src/slides/slides.service.ts');
  const vhSvc      = readBE('src/version-history/version-history.service.ts');
  const gateway    = readBE('src/collaboration/collaboration.gateway.ts');
  const store      = readBE('src/collaboration/presence-store.ts');
  const editor     = readFE('features/slide-editor/SlideEditor.tsx');
  const hook       = readFE('features/collaboration/useCollaboration.ts');
  const types      = readFE('features/collaboration/types.ts');
  const bePkg      = JSON.parse(readBE('package.json'));
  const fePkg      = JSON.parse(readFE('package.json'));

  // ===========================================================================
  //  34.1A — Slide CRUD broadcasts
  // ===========================================================================
  console.log('34.1A — Slide CRUD broadcasts');
  if (!check('SlidesService injects CollaborationBroadcaster',
       /private broadcaster: CollaborationBroadcaster/.test(slidesSvc))) fail++;
  for (const ev of ['slide.created', 'slide.updated', 'slide.deleted', 'slide.reordered']) {
    if (!check(`SlidesService broadcasts "${ev}"`,
         new RegExp(`broadcaster\\.toDeck\\([^,]+,\\s*['"]${ev.replace('.', '\\.')}['"]`).test(slidesSvc))) fail++;
  }
  if (!check('Frontend SlideEditor subscribes to slide.* + refreshes deckSlides',
       /collab\.onSlide\([\s\S]{0,300}?deckSlides\.refresh/.test(editor))) fail++;

  // ===========================================================================
  //  34.1B — Version events
  // ===========================================================================
  console.log('\n34.1B — Version event broadcasts');
  if (!check('VersionHistoryService imports CollaborationBroadcaster',
       /import.*CollaborationBroadcaster/.test(vhSvc))) fail++;
  for (const ev of ['version.snapshot_created', 'version.restored', 'version.deleted', 'version.renamed']) {
    if (!check(`VersionHistoryService broadcasts "${ev}"`,
         new RegExp(`broadcaster\\.toDeck\\([^,]+,\\s*['"]${ev.replace('.', '\\.')}['"]`).test(vhSvc))) fail++;
  }
  if (!check('Frontend SlideEditor subscribes onVersion + emits toastInfo',
       /collab\.onVersion\([\s\S]{0,800}?toastInfo/.test(editor))) fail++;

  // ===========================================================================
  //  34.1C/H — Editing awareness
  // ===========================================================================
  console.log('\n34.1C/H — Editing awareness');
  if (!check('PresenceUser includes editing: EditingFocus | null',
       /editing:\s*EditingFocus \| null/.test(store))) fail++;
  if (!check('Gateway: editing.started + editing.stopped subscribers',
       /@SubscribeMessage\(['"]editing\.started['"]\)/.test(gateway) &&
       /@SubscribeMessage\(['"]editing\.stopped['"]\)/.test(gateway))) fail++;
  if (!check('useCollaboration exposes editing + sendEditingStart/Stop',
       /editing:\s*RemoteEditing\[\]/.test(hook) &&
       /sendEditingStart:/.test(hook) &&
       /sendEditingStop:/.test(hook))) fail++;
  if (!check('EditingAwarenessOverlay.tsx exists + mounted in SlideEditor',
       existsFE('features/collaboration/EditingAwarenessOverlay.tsx') &&
       /<EditingAwarenessOverlay/.test(editor))) fail++;
  if (!check('SlideEditor emits editing.started on enter + stop on exit',
       /collab\.sendEditingStart\(slideId, editingId[\s\S]{0,300}?collab\.sendEditingStop\(slideId, editingId\)/.test(editor))) fail++;
  if (!check('Hook reaps stale editing markers after timeout',
       /EDITING_TIMEOUT_MS[\s\S]{0,400}?setInterval/.test(hook))) fail++;

  // ===========================================================================
  //  34.1D — Redis adapter
  // ===========================================================================
  console.log('\n34.1D — Redis adapter');
  if (!check('@socket.io/redis-adapter installed in backend',
       !!bePkg.dependencies?.['@socket.io/redis-adapter'])) fail++;
  if (!check('ioredis installed in backend',
       !!bePkg.dependencies?.['ioredis'])) fail++;
  if (!check('Gateway.afterInit wires Redis adapter when REDIS_URL set',
       /if \(process\.env\.REDIS_URL\)[\s\S]{0,800}?createAdapter/.test(gateway))) fail++;
  if (!check('Gateway logs fallback when Redis adapter init fails',
       /Redis adapter init failed[\s\S]{0,200}?in-memory adapter/.test(gateway))) fail++;

  // ===========================================================================
  //  34.1E/F — Yjs infrastructure
  // ===========================================================================
  console.log('\n34.1E/F — Yjs infrastructure');
  if (!check('yjs + y-protocols installed on backend',
       !!bePkg.dependencies?.yjs && !!bePkg.dependencies?.['y-protocols'])) fail++;
  if (!check('yjs + y-protocols installed on frontend',
       !!fePkg.dependencies?.yjs && !!fePkg.dependencies?.['y-protocols'])) fail++;
  if (!check('Gateway: yjs.join / yjs.update / yjs.awareness relay',
       /@SubscribeMessage\(['"]yjs\.join['"]\)/.test(gateway) &&
       /@SubscribeMessage\(['"]yjs\.update['"]\)/.test(gateway) &&
       /@SubscribeMessage\(['"]yjs\.awareness['"]\)/.test(gateway))) fail++;
  if (!check('Gateway forwards yjs.update to ydoc:{docId} room (except sender)',
       /client\.to\(`ydoc:\$\{body\.docId\}`\)\.emit\(['"]yjs\.update['"]/.test(gateway))) fail++;
  if (!check('Frontend useYDoc.ts exists with Y.Doc + Awareness',
       existsFE('features/collaboration/useYDoc.ts'))) fail++;
  const useYDoc = readFE('features/collaboration/useYDoc.ts');
  if (!check('useYDoc emits yjs.join + applies remote updates + broadcasts on doc.update',
       /sock\.emit\(['"]yjs\.join['"]/.test(useYDoc) &&
       /Y\.applyUpdate\(doc/.test(useYDoc) &&
       /sock\.emit\(['"]yjs\.update['"]/.test(useYDoc))) fail++;

  // ===========================================================================
  //  34.1G — Offline queue
  // ===========================================================================
  console.log('\n34.1G — Offline collaboration queue');
  if (!check('useCollaboration buffers cursor/selection/editing while disconnected',
       /pendingRef\.current\.cursor/.test(hook) &&
       /pendingRef\.current\.selection/.test(hook) &&
       /pendingRef\.current\.editing/.test(hook))) fail++;
  if (!check('Replay on reconnect inside handleConnect',
       /handleConnect[\s\S]{0,800}?pendingRef\.current[\s\S]{0,200}?cursor[\s\S]{0,200}?selection/.test(hook))) fail++;

  // ===========================================================================
  //  34.1I — Cursor perf
  // ===========================================================================
  console.log('\n34.1I — Cursor perf');
  if (!check('useCollaboration coalesces cursor emits with requestAnimationFrame',
       /requestAnimationFrame/.test(hook) &&
       /cursorRafRef/.test(hook))) fail++;

  // ===========================================================================
  //  Frontend type mirror
  // ===========================================================================
  console.log('\nTypes');
  if (!check('PresenceUser.editing in frontend types',
       /editing:\s*EditingFocus \| null/.test(types))) fail++;
  if (!check('RemoteEditing exported',
       /export interface RemoteEditing/.test(types))) fail++;

  console.log();
  if (fail === 0) console.log('✅ Phase 34.1: all completion-pass checks pass');
  else { console.error(`❌ ${fail} regressions detected`); process.exit(1); }
}

main().catch((err) => { console.error('Validation failed:', err); process.exit(1); });
