/**
 * Phase 34 — Real-Time Collaboration validation
 *
 *   34A — CollaborationGateway (/collaboration namespace, deck rooms)
 *   34B — PresenceStore (in-memory, color, slide, cursor, selection, lastSeen)
 *   34C — PresenceAvatars (frontend)
 *   34D — Cursor broadcast (cursor.move) + CursorOverlay + emitter
 *   34E — Selection broadcast (selection.change) + SelectionOverlay
 *   34F — presence.slide → "John viewing slide X"
 *   34G — element.* broadcasts from slide-elements service
 *   34K — pickColor deterministic
 *   34L/M — ReviewEventBus bridge forwards comment.* + review.*
 *   34N — version.* events (handled via ReviewEvent union if present)
 *   34O/P — ConnectionBanner reflects connection state
 *   34Q — CollaborationBroadcaster service exposed app-wide
 *   34S — gateway resolves workspace access before allowing room join
 *   34W — CollaborationPanel
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
const existsFE = (rel: string): boolean => fs.existsSync(path.join(FE, rel));

function check(label: string, ok: boolean): boolean {
  console.log(`  ${ok ? '·' : '!'} ${label}`);
  return ok;
}

async function main() {
  console.log('Phase 34 — Real-Time Collaboration validation\n');
  let fail = 0;

  const gateway = readBE('src/collaboration/collaboration.gateway.ts');
  const store   = readBE('src/collaboration/presence-store.ts');
  const bcast   = readBE('src/collaboration/collaboration-broadcaster.ts');
  const mod     = readBE('src/collaboration/collaboration.module.ts');
  const appMod  = readBE('src/app.module.ts');
  const elSvc   = readBE('src/slides/slide-elements.service.ts');

  const types   = readFE('features/collaboration/types.ts');
  const hook    = readFE('features/collaboration/useCollaboration.ts');
  const editor  = readFE('features/slide-editor/SlideEditor.tsx');

  // ===========================================================================
  //  34A — Gateway
  // ===========================================================================
  console.log('34A — CollaborationGateway');
  if (!check('@WebSocketGateway namespace /collaboration',
       /@WebSocketGateway\([\s\S]{0,200}?namespace:\s*['"]\/collaboration['"]/.test(gateway))) fail++;
  if (!check('CollaborationModule is @Global + registers gateway + broadcaster',
       /@Global\(\)/.test(mod) && /CollaborationGateway/.test(mod) && /CollaborationBroadcaster/.test(mod))) fail++;
  if (!check('AppModule registers CollaborationModule',
       /CollaborationModule/.test(appMod))) fail++;

  // ===========================================================================
  //  34B — Presence store
  // ===========================================================================
  console.log('\n34B/K — PresenceStore + stable color');
  if (!check('PresenceStore class with join/leave/patch/snapshot',
       /class PresenceStore/.test(store) &&
       /join\([\s\S]{0,80}?PresenceUser\)/.test(store) &&
       /leave\(socketId/.test(store) &&
       /patch\(socketId/.test(store) &&
       /snapshot\(deckId/.test(store))) fail++;
  if (!check('pickColor deterministic palette',
       /function pickColor\(userId: string\)/.test(store) &&
       /COLORS\[Math\.abs\(hash\) % COLORS\.length\]/.test(store))) fail++;

  // ===========================================================================
  //  34A/S — Auth + access on join
  // ===========================================================================
  console.log('\n34A/S — Connection auth + room access');
  if (!check('handleConnection verifies JWT (disconnects on failure)',
       /handleConnection\([\s\S]{0,400}?this\.jwt\.verify[\s\S]{0,400}?client\.disconnect\(true\)/.test(gateway))) fail++;
  if (!check('presence.join resolves workspace access before join',
       /presence\.join[\s\S]{0,1200}?resolveAccess\(/.test(gateway))) fail++;
  if (!check('resolveAccess walks deck → project → workspaceMember',
       /resolveAccess[\s\S]{0,1200}?workspaceMember\.findUnique/.test(gateway))) fail++;

  // ===========================================================================
  //  34D — Cursors
  // ===========================================================================
  console.log('\n34D — Cursor broadcasts');
  if (!check('cursor.move handler broadcasts to room excluding sender',
       /@SubscribeMessage\(['"]cursor\.move['"]\)[\s\S]{0,800}?client\.to\(roomName\(deckId\)\)\.emit\(['"]cursor\.move['"]/.test(gateway))) fail++;
  if (!check('CursorOverlay.tsx exists',
       existsFE('features/collaboration/CursorOverlay.tsx'))) fail++;
  if (!check('CollaborationCursorEmitter throttles at ~60fps',
       existsFE('features/collaboration/CollaborationCursorEmitter.tsx') &&
       /MIN_INTERVAL\s*=\s*16/.test(readFE('features/collaboration/CollaborationCursorEmitter.tsx')))) fail++;

  // ===========================================================================
  //  34E — Selections
  // ===========================================================================
  console.log('\n34E — Selection broadcasts');
  if (!check('selection.change handler broadcasts to room',
       /@SubscribeMessage\(['"]selection\.change['"]\)[\s\S]{0,600}?selection\.change/.test(gateway))) fail++;
  if (!check('SelectionOverlay.tsx exists',
       existsFE('features/collaboration/SelectionOverlay.tsx'))) fail++;

  // ===========================================================================
  //  34F — Slide-view awareness
  // ===========================================================================
  console.log('\n34F — Slide-view awareness');
  if (!check('presence.slide updates the store + re-broadcasts',
       /@SubscribeMessage\(['"]presence\.slide['"]\)/.test(gateway) &&
       /this\.store\.patch\(client\.id,\s*\{\s*slideId/.test(gateway))) fail++;
  if (!check('Frontend sendSlideView called on slideId change',
       /collab\.sendSlideView\(slideId\)/.test(editor))) fail++;

  // ===========================================================================
  //  34G — Element broadcasts
  // ===========================================================================
  console.log('\n34G — Element broadcasts from server write paths');
  if (!check('slide-elements.service injects CollaborationBroadcaster',
       /CollaborationBroadcaster/.test(elSvc) &&
       /private broadcaster: CollaborationBroadcaster/.test(elSvc))) fail++;
  if (!check('element.created / .updated / .deleted broadcasts wired',
       /broadcaster\.toDeck\(deckId,\s*['"]element\.created['"]/.test(elSvc) &&
       /broadcaster\.toDeck\(deckId,\s*['"]element\.updated['"]/.test(elSvc) &&
       /broadcaster\.toDeck\(deckId,\s*['"]element\.deleted['"]/.test(elSvc))) fail++;

  // ===========================================================================
  //  34L/M/N — Comment / review / version event bridge
  // ===========================================================================
  console.log('\n34L/M/N — Bus → socket bridge');
  if (!check('gateway subscribes to reviewBus.on("*")',
       /this\.reviewBus\.on\(['"]\*['"],/.test(gateway))) fail++;
  if (!check('forwardReviewEvent resolves deckId then emits to room',
       /private async forwardReviewEvent\([\s\S]{0,800}?this\.server\.to\(roomName\(deckId\)\)\.emit/.test(gateway))) fail++;
  if (!check('hook subscribes to comment.* / review.* / comments.resolved_all',
       /comment\.created/.test(hook) &&
       /review\.approved/.test(hook) &&
       /comments\.resolved_all/.test(hook))) fail++;

  // ===========================================================================
  //  34O/P — Connection management
  // ===========================================================================
  console.log('\n34O/P — Connection state + banner');
  if (!check('ConnectionBanner.tsx exists + handles forbidden/reconnecting/disconnected',
       existsFE('features/collaboration/ConnectionBanner.tsx') &&
       /forbidden/.test(readFE('features/collaboration/ConnectionBanner.tsx')) &&
       /Reconnecting/.test(readFE('features/collaboration/ConnectionBanner.tsx')))) fail++;
  if (!check('useCollaboration tracks ConnectionState transitions',
       /setState\(['"]reconnecting['"]\)/.test(hook) &&
       /setState\(['"]connected['"]\)/.test(hook) &&
       /setState\(['"]disconnected['"]\)/.test(hook))) fail++;

  // ===========================================================================
  //  34Q — Broadcaster (single source of truth)
  // ===========================================================================
  console.log('\n34Q — CollaborationBroadcaster');
  if (!check('Broadcaster service with toDeck + toDeckExcept + setServer',
       /class CollaborationBroadcaster/.test(bcast) &&
       /toDeck\(/.test(bcast) &&
       /toDeckExcept\(/.test(bcast) &&
       /setServer\(/.test(bcast))) fail++;
  if (!check('Gateway calls broadcaster.setServer(server) on init',
       /afterInit\(server: Server\)[\s\S]{0,200}?this\.broadcaster\.setServer\(server\)/.test(gateway))) fail++;

  // ===========================================================================
  //  34C/W — Frontend presence + collaboration panel + SlideEditor wiring
  // ===========================================================================
  console.log('\n34C/W — Frontend mounts');
  if (!check('PresenceAvatars.tsx + CollaborationPanel.tsx exist',
       existsFE('features/collaboration/PresenceAvatars.tsx') &&
       existsFE('features/collaboration/CollaborationPanel.tsx'))) fail++;
  if (!check('SlideEditor imports useCollaboration + mounts overlays + panel',
       /import\s*{\s*useCollaboration\s*}/.test(editor) &&
       /<CursorOverlay/.test(editor) &&
       /<SelectionOverlay/.test(editor) &&
       /<PresenceAvatars/.test(editor) &&
       /<CollaborationPanel/.test(editor) &&
       /<ConnectionBanner/.test(editor))) fail++;
  if (!check('useCollaboration exposes you / users / cursors / selections / send* / on*',
       /you:\s*PresenceUser \| null/.test(hook) &&
       /sendCursor:/.test(hook) &&
       /sendSelection:/.test(hook) &&
       /sendSlideView:/.test(hook) &&
       /onElement:/.test(hook) &&
       /onBusEvent:/.test(hook))) fail++;
  if (!check('types: ConnectionState union covers all five states',
       /'idle'[\s\S]{0,80}?'connecting'[\s\S]{0,80}?'connected'[\s\S]{0,80}?'reconnecting'[\s\S]{0,80}?'disconnected'/.test(types))) fail++;

  console.log();
  if (fail === 0) console.log('✅ Phase 34: all real-time collaboration checks pass');
  else { console.error(`❌ ${fail} regressions detected`); process.exit(1); }
}

main().catch((err) => { console.error('Validation failed:', err); process.exit(1); });
