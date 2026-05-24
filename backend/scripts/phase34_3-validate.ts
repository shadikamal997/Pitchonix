/**
 * Phase 34.3 — Collaboration Final Polish validation
 *
 *   34.3A — InlineListEditor per-item Yjs (list:{elementId}:{itemId})
 *   34.3D — Load harness script exists
 *   34.3E — YDocStore LRU eviction (subscribe/unsubscribe + sweep)
 *   34.3G — /collaboration/metrics endpoint exposes ydoc + presence stats
 *
 *   Pure source-scan — no runtime required.
 */

import * as fs from 'fs';
import * as path from 'path';

const FE = path.join(__dirname, '..', '..', 'frontend');
const BE = path.join(__dirname, '..');
const readFE   = (rel: string): string => fs.readFileSync(path.join(FE, rel), 'utf8');
const readBE   = (rel: string): string => fs.readFileSync(path.join(BE, rel), 'utf8');
const existsBE = (rel: string): boolean => fs.existsSync(path.join(BE, rel));

function check(label: string, ok: boolean): boolean {
  console.log(`  ${ok ? '·' : '!'} ${label}`);
  return ok;
}

async function main() {
  console.log('Phase 34.3 — Collaboration Final Polish validation\n');
  let fail = 0;

  const store     = readBE('src/collaboration/ydoc-store.ts');
  const gateway   = readBE('src/collaboration/collaboration.gateway.ts');
  const presence  = readBE('src/collaboration/presence-store.ts');
  const mod       = readBE('src/collaboration/collaboration.module.ts');
  const metricsCtl = readBE('src/collaboration/collaboration-metrics.controller.ts');
  const listEditor = readFE('features/slide-editor/editing/InlineListEditor.tsx');
  const slideEd    = readFE('features/slide-editor/SlideEditor.tsx');

  // ===========================================================================
  //  34.3A — InlineListEditor Yjs
  // ===========================================================================
  console.log('34.3A — InlineListEditor per-item Yjs');
  if (!check('imports Collaboration + CollaborationCaret + useYDoc',
       /import Collaboration from ['"]@tiptap\/extension-collaboration['"]/.test(listEditor) &&
       /import CollaborationCaret from ['"]@tiptap\/extension-collaboration-caret['"]/.test(listEditor) &&
       /import { useYDoc }/.test(listEditor))) fail++;
  if (!check('useYDoc called with list:{elementId}:{itemId} pattern',
       /useYDoc\(`list:\$\{elementId\}:\$\{item\.id\}`\)/.test(listEditor))) fail++;
  if (!check('per-item editor mounts Collaboration.configure({ document: ydoc.doc })',
       /Collaboration\.configure\(\{\s*document:\s*ydoc\.doc/.test(listEditor))) fail++;
  if (!check('per-item editor mounts CollaborationCaret with caret user',
       /CollaborationCaret\.configure\([\s\S]{0,400}?awareness:\s*ydoc\.awareness[\s\S]{0,400}?user:/.test(listEditor))) fail++;
  if (!check('per-item editor omits content prop when ydoc active',
       /content:\s*ydoc\?\.doc[\s\S]{0,80}?undefined/.test(listEditor))) fail++;
  if (!check('per-item editor seeds Y.Doc from item.html if empty (safety net)',
       /seededRef[\s\S]{0,400}?editor\.commands\.setContent\(html/.test(listEditor))) fail++;
  if (!check('ListEditor accepts collaborator prop + passes elementId + collaborator to rows',
       /collaborator\?:\s*\{\s*name:\s*string;\s*color:\s*string\s*\}/.test(listEditor) &&
       /elementId=\{element\.id\}/.test(listEditor) &&
       /collaborator=\{collaborator\}/.test(listEditor))) fail++;
  if (!check('SlideEditor passes collaborator prop to BOTH list editors',
       (slideEd.match(/<InlineListEditor[\s\S]{0,400}?collaborator=/g) || []).length >= 2)) fail++;

  // ===========================================================================
  //  34.3E — LRU eviction
  // ===========================================================================
  console.log('\n34.3E — YDocStore LRU eviction');
  if (!check('CacheEntry.subscribers tracks subscriber count',
       /subscribers:\s*number/.test(store))) fail++;
  if (!check('subscribe(docId) + unsubscribe(docId) exported',
       /subscribe\(docId: string\): void/.test(store) &&
       /unsubscribe\(docId: string\): void/.test(store))) fail++;
  if (!check('sweep() skips active subscribers + idle docs only',
       /async sweep\([\s\S]{0,500}?subscribers > 0[\s\S]{0,100}?continue/.test(store) &&
       /lastUpdated >= cutoff[\s\S]{0,100}?continue/.test(store))) fail++;
  if (!check('sweep() flushes dirty docs before evicting',
       /async sweep[\s\S]{0,800}?if \(entry\.dirty\)[\s\S]{0,200}?await this\.flush/.test(store))) fail++;
  if (!check('YDOC_IDLE_MINUTES env honored',
       /YDOC_IDLE_MINUTES/.test(store))) fail++;
  if (!check('gateway: yjs.join calls ydocStore.subscribe',
       /yjs\.join[\s\S]{0,800}?this\.ydocStore\.subscribe\(body\.docId\)/.test(gateway))) fail++;
  if (!check('gateway: yjs.leave calls ydocStore.unsubscribe',
       /yjs\.leave[\s\S]{0,400}?this\.ydocStore\.unsubscribe\(body\.docId\)/.test(gateway))) fail++;
  if (!check('gateway: handleDisconnect unsubscribes every held docId',
       /handleDisconnect[\s\S]{0,800}?ydocSubs[\s\S]{0,300}?unsubscribe\(docId\)/.test(gateway))) fail++;

  // ===========================================================================
  //  34.3G — Metrics endpoint
  // ===========================================================================
  console.log('\n34.3G — Metrics endpoint');
  if (!check('CollaborationMetricsController exists at /collaboration/metrics',
       /@Controller\(['"]collaboration['"]\)/.test(metricsCtl) &&
       /@Get\(['"]metrics['"]\)/.test(metricsCtl))) fail++;
  if (!check('YDocStore.stats() returns cache + active + eviction counters',
       /stats\(\):\s*\{[\s\S]{0,600}?cachedDocs:[\s\S]{0,200}?activeDocs:[\s\S]{0,200}?evictionCount:/.test(store))) fail++;
  if (!check('PresenceStore.stats() returns rooms + users + sockets',
       /stats\(\):\s*\{[\s\S]{0,300}?rooms:[\s\S]{0,200}?users:[\s\S]{0,200}?connectedSockets:/.test(presence))) fail++;
  if (!check('Gateway exposes presenceStats() accessor',
       /presenceStats\(\)/.test(gateway))) fail++;
  if (!check('CollaborationModule registers the metrics controller',
       /CollaborationMetricsController/.test(mod) &&
       /controllers:\s*\[CollaborationMetricsController\]/.test(mod))) fail++;

  // ===========================================================================
  //  34.3D — Load harness
  // ===========================================================================
  console.log('\n34.3D — Load harness');
  if (!check('scripts/collaboration-load-harness.ts exists',
       existsBE('scripts/collaboration-load-harness.ts'))) fail++;
  const harness = readBE('scripts/collaboration-load-harness.ts');
  if (!check('harness opens N socket.io clients + measures cursor latency',
       /USERS/.test(harness) && /cursor\.move/.test(harness) && /p50/.test(harness) && /p95/.test(harness))) fail++;

  // ===========================================================================
  //  docId helpers (also exercised by 34.3A)
  // ===========================================================================
  console.log('\nydoc-store: docId helpers');
  if (!check('listItemDocId helper exported',
       /export function listItemDocId/.test(store))) fail++;
  if (!check('parseDocId returns DocTarget union (element + listItem)',
       /export type DocTarget[\s\S]{0,300}?'listItem'/.test(store) &&
       /docId\.startsWith\(['"]list:['"]\)/.test(store))) fail++;
  if (!check('flush() persists element kind only (list items in-memory)',
       /async flush[\s\S]{0,800}?if \(target\.kind === ['"]element['"]\)[\s\S]{0,300}?slideElement\.update/.test(store))) fail++;

  console.log();
  if (fail === 0) console.log('✅ Phase 34.3: all final-polish checks pass');
  else { console.error(`❌ ${fail} regressions detected`); process.exit(1); }
}

main().catch((err) => { console.error('Validation failed:', err); process.exit(1); });
