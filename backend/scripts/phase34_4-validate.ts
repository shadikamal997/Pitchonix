/**
 * Phase 34.4 — Collaboration Enterprise Hardening validation
 *
 *   34.4A — YDocSyncBus (Redis pub/sub) + ADR + store wiring
 *   34.4B — Runbook for multi-process validation
 *   34.4C — Runbook for load-test execution (harness already exists)
 *   34.4D — Prometheus exporter + event counters
 *   34.4E — Runbook for recovery tests
 *
 *   Pure source-scan — no runtime required. Runtime validation against a
 *   real staging cluster is covered in RUNBOOK-staging-validation.md.
 */

import * as fs from 'fs';
import * as path from 'path';

const BE       = path.join(__dirname, '..');
const readBE   = (rel: string): string => fs.readFileSync(path.join(BE, rel), 'utf8');
const existsBE = (rel: string): boolean => fs.existsSync(path.join(BE, rel));

function check(label: string, ok: boolean): boolean {
  console.log(`  ${ok ? '·' : '!'} ${label}`);
  return ok;
}

async function main() {
  console.log('Phase 34.4 — Collaboration Enterprise Hardening validation\n');
  let fail = 0;

  // ===========================================================================
  //  34.4A — YDocSyncBus
  // ===========================================================================
  console.log('34.4A — YDocSyncBus + ADR');
  if (!check('ydoc-sync-bus.ts exists', existsBE('src/collaboration/ydoc-sync-bus.ts'))) fail++;
  const bus = existsBE('src/collaboration/ydoc-sync-bus.ts')
    ? readBE('src/collaboration/ydoc-sync-bus.ts') : '';
  if (!check('YDocSyncBus is a NestJS @Injectable with OnModuleInit',
       /@Injectable\(\)\s*export class YDocSyncBus[\s\S]+?OnModuleInit/.test(bus))) fail++;
  if (!check('bus uses Redis pub/sub with pitchonix:ydoc: prefix',
       /pitchonix:ydoc:/.test(bus) && /psubscribe/.test(bus))) fail++;
  if (!check('publish() tags with this process\'s origin nonce',
       /originId\s*=\s*crypto\.randomBytes\([\s\S]{0,80}?\.toString\(['"]hex['"]\)/.test(bus) &&
       /publish\(docId[\s\S]{0,400}?originId/.test(bus))) fail++;
  if (!check('subscriber skips publishes that originated here',
       /origin === this\.originId/.test(bus))) fail++;
  if (!check('bus stays inactive without REDIS_URL (graceful fallback)',
       /if \(!process\.env\.REDIS_URL\)[\s\S]{0,200}?staying single-process/.test(bus))) fail++;
  if (!check('stats() returns active + published + received counters',
       /stats\(\)[\s\S]{0,300}?active:\s*boolean[\s\S]{0,200}?published:\s*number[\s\S]{0,200}?received:\s*number/.test(bus))) fail++;

  const store = readBE('src/collaboration/ydoc-store.ts');
  if (!check('YDocStore injects YDocSyncBus',
       /private syncBus:\s*YDocSyncBus/.test(store))) fail++;
  if (!check('YDocStore.onModuleInit registers syncBus handler',
       /onModuleInit\(\)[\s\S]{0,800}?this\.syncBus\.setHandler/.test(store))) fail++;
  if (!check('YDocStore.applyUpdate publishes to peers after local apply',
       /async applyUpdate[\s\S]{0,1200}?this\.syncBus\.publish\(docId, update\)/.test(store))) fail++;
  if (!check('YDocSyncBus registered in CollaborationModule',
       /YDocSyncBus/.test(readBE('src/collaboration/collaboration.module.ts')))) fail++;
  if (!check('ADR-0001 markdown exists with Status: Accepted',
       existsBE('src/collaboration/ADR-0001-shared-ydoc-authority.md') &&
       /Status:?\s*\**\s*Accepted/.test(readBE('src/collaboration/ADR-0001-shared-ydoc-authority.md')))) fail++;
  if (!check('ADR enumerates all three options (A sticky, B Redis, C Hocuspocus)',
       /Option A[\s\S]+?Option B[\s\S]+?Option C/.test(readBE('src/collaboration/ADR-0001-shared-ydoc-authority.md')))) fail++;

  // ===========================================================================
  //  34.4D — Prometheus exporter + counters
  // ===========================================================================
  console.log('\n34.4D — Prometheus exporter');
  const gateway = readBE('src/collaboration/collaboration.gateway.ts');
  if (!check('gateway tracks cursorEvents + yjsUpdates + editingEvents counters',
       /private cursorEvents\s*=\s*0/.test(gateway) &&
       /private yjsUpdates\s*=\s*0/.test(gateway) &&
       /private editingEvents\s*=\s*0/.test(gateway))) fail++;
  if (!check('cursor.move handler increments cursorEvents',
       /@SubscribeMessage\(['"]cursor\.move['"]\)[\s\S]{0,400}?this\.cursorEvents\+\+/.test(gateway))) fail++;
  if (!check('yjs.update handler increments yjsUpdates',
       /@SubscribeMessage\(['"]yjs\.update['"]\)[\s\S]{0,400}?this\.yjsUpdates\+\+/.test(gateway))) fail++;
  if (!check('editing.started handler increments editingEvents',
       /@SubscribeMessage\(['"]editing\.started['"]\)[\s\S]{0,400}?this\.editingEvents\+\+/.test(gateway))) fail++;
  if (!check('eventCounters() accessor exposed to metrics endpoint',
       /eventCounters\(\)[\s\S]{0,300}?cursorEvents[\s\S]{0,100}?yjsUpdates[\s\S]{0,100}?editingEvents/.test(gateway))) fail++;

  const ctl = readBE('src/collaboration/collaboration-metrics.controller.ts');
  if (!check('GET /collaboration/metrics/prometheus endpoint exists',
       /@Get\(['"]metrics\/prometheus['"]\)/.test(ctl))) fail++;
  if (!check('exporter sets text/plain Prometheus content-type',
       /@Header\(['"]Content-Type['"],\s*['"]text\/plain;\s*version=0\.0\.4;\s*charset=utf-8['"]\)/.test(ctl))) fail++;
  // Required metric names per spec
  const wantMetrics = [
    'collaboration_active_docs',
    'collaboration_active_users',
    'collaboration_active_rooms',
    'collaboration_dirty_docs',
    'collaboration_evictions_total',
    'collaboration_cursor_events_total',
    'collaboration_yjs_updates_total',
  ];
  for (const m of wantMetrics) {
    if (!check(`exporter emits ${m}`, new RegExp(m).test(ctl))) fail++;
  }
  if (!check('exporter emits HELP + TYPE lines per metric (Prometheus 0.0.4 format)',
       /# HELP/.test(ctl) && /# TYPE/.test(ctl))) fail++;
  if (!check('exporter exposes YDocSyncBus health (active + published + received)',
       /collaboration_syncbus_active/.test(ctl) &&
       /collaboration_syncbus_published_total/.test(ctl) &&
       /collaboration_syncbus_received_total/.test(ctl))) fail++;

  // ===========================================================================
  //  34.4B/C/E — Staging runbook
  // ===========================================================================
  console.log('\n34.4B/C/E — Staging runbook');
  if (!check('RUNBOOK-staging-validation.md exists',
       existsBE('src/collaboration/RUNBOOK-staging-validation.md'))) fail++;
  const runbook = existsBE('src/collaboration/RUNBOOK-staging-validation.md')
    ? readBE('src/collaboration/RUNBOOK-staging-validation.md') : '';
  if (!check('runbook covers 34.4B multi-process + 34.4C load + 34.4E recovery',
       /34\.4B/.test(runbook) && /34\.4C/.test(runbook) && /34\.4E/.test(runbook))) fail++;
  if (!check('runbook references the existing load harness script',
       /collaboration-load-harness/.test(runbook))) fail++;

  console.log();
  if (fail === 0) console.log('✅ Phase 34.4: all enterprise-hardening checks pass');
  else { console.error(`❌ ${fail} regressions detected`); process.exit(1); }
}

main().catch((err) => { console.error('Validation failed:', err); process.exit(1); });
