/**
 * Phase 34.2 — Yjs Finalization & Collaboration Completion validation
 *
 *   34.2A — TipTap ↔ Yjs binding (Collaboration + CollaborationCaret on
 *           InlineTextEditor)
 *   34.2B — Y.Doc persistence (SlideElement.ydocState + YDocStore service)
 *   34.2C — Inline text awareness (CollaborationCaret with user name + color)
 *   34.2D — Version-history integration (snapshot flushes pending Y.Docs)
 *
 *   Pure source-scan — no runtime needed.
 */

import * as fs from 'fs';
import * as path from 'path';

const FE = path.join(__dirname, '..', '..', 'frontend');
const BE = path.join(__dirname, '..');
const readFE   = (rel: string): string => fs.readFileSync(path.join(FE, rel), 'utf8');
const readBE   = (rel: string): string => fs.readFileSync(path.join(BE, rel), 'utf8');

function check(label: string, ok: boolean): boolean {
  console.log(`  ${ok ? '·' : '!'} ${label}`);
  return ok;
}

async function main() {
  console.log('Phase 34.2 — Yjs Finalization & Collaboration Completion validation\n');
  let fail = 0;

  const schema  = readBE('prisma/schema.prisma');
  const store   = readBE('src/collaboration/ydoc-store.ts');
  const gateway = readBE('src/collaboration/collaboration.gateway.ts');
  const mod     = readBE('src/collaboration/collaboration.module.ts');
  const vhSvc   = readBE('src/version-history/version-history.service.ts');
  const editor  = readFE('features/slide-editor/editing/InlineTextEditor.tsx');
  const slideEd = readFE('features/slide-editor/SlideEditor.tsx');
  const fePkg   = JSON.parse(readFE('package.json'));

  // ===========================================================================
  //  34.2A — TipTap collaboration deps + extension wiring
  // ===========================================================================
  console.log('34.2A — TipTap ↔ Yjs binding');
  if (!check('@tiptap/extension-collaboration installed',
       !!fePkg.dependencies?.['@tiptap/extension-collaboration'])) fail++;
  if (!check('@tiptap/extension-collaboration-caret installed',
       !!fePkg.dependencies?.['@tiptap/extension-collaboration-caret'])) fail++;
  if (!check('y-prosemirror installed',
       !!fePkg.dependencies?.['y-prosemirror'])) fail++;
  if (!check('InlineTextEditor imports Collaboration + CollaborationCaret',
       /import Collaboration from ['"]@tiptap\/extension-collaboration['"]/.test(editor) &&
       /import CollaborationCaret from ['"]@tiptap\/extension-collaboration-caret['"]/.test(editor))) fail++;
  if (!check('InlineTextEditor mounts Collaboration.configure({ document: ydoc.doc })',
       /Collaboration\.configure\(\{\s*document:\s*ydoc\.doc/.test(editor))) fail++;
  if (!check('InlineTextEditor disables StarterKit undoRedo (Yjs owns it)',
       /undoRedo:\s*false/.test(editor))) fail++;
  if (!check('InlineTextEditor omits content prop when Yjs active',
       /content:\s*ydoc\?\.doc\s*\?\s*undefined\s*:/.test(editor))) fail++;
  if (!check('SlideEditor passes collaborator prop (name + color)',
       /collaborator=\{[\s\S]{0,200}?collab\.you\.name[\s\S]{0,200}?collab\.you\.color/.test(slideEd))) fail++;

  // ===========================================================================
  //  34.2B — Y.Doc persistence
  // ===========================================================================
  console.log('\n34.2B — Y.Doc persistence');
  if (!check('schema: SlideElement.ydocState Bytes?',
       /ydocState\s+Bytes\?/.test(schema))) fail++;
  if (!check('YDocStore class exists with ensure / applyUpdate / encodeState',
       /export class YDocStore/.test(store) &&
       /async ensure\(/.test(store) &&
       /async applyUpdate\(/.test(store) &&
       /async encodeState\(/.test(store))) fail++;
  if (!check('YDocStore debounces persistence (~2s)',
       /DEBOUNCE_MS\s*=\s*2_?000/.test(store))) fail++;
  if (!check('YDocStore.flush writes to SlideElement.ydocState',
       /async flush\([\s\S]{0,800}?slideElement\.update\([\s\S]{0,200}?ydocState/.test(store))) fail++;
  if (!check('YDocStore registered + exported in CollaborationModule',
       /YDocStore/.test(mod) && /exports:[\s\S]{0,200}?YDocStore/.test(mod))) fail++;
  if (!check('elementDocId helper + parseDocId exported',
       /export function elementDocId/.test(store) &&
       /export function parseDocId/.test(store))) fail++;

  // ===========================================================================
  //  Gateway server-authoritative upgrade
  // ===========================================================================
  console.log('\nGateway server-authoritative Yjs handling');
  if (!check('gateway injects YDocStore',
       /private ydocStore:\s*YDocStore/.test(gateway))) fail++;
  if (!check('yjs.join sends yjs.initial_state from server-side encodeState',
       /yjs\.join[\s\S]{0,800}?encodeState\(body\.docId\)[\s\S]{0,400}?yjs\.initial_state/.test(gateway))) fail++;
  if (!check('yjs.update applies server-side BEFORE relay',
       /yjs\.update[\s\S]{0,400}?this\.ydocStore\.applyUpdate[\s\S]{0,400}?client\.to/.test(gateway))) fail++;

  // ===========================================================================
  //  34.2C — Inline text awareness
  // ===========================================================================
  console.log('\n34.2C — Inline text awareness');
  if (!check('InlineTextEditor configures CollaborationCaret with awareness + user',
       /CollaborationCaret\.configure\([\s\S]{0,400}?awareness:\s*ydoc\.awareness[\s\S]{0,400}?user:\s*\{\s*name:[\s\S]{0,80}?color:/.test(editor))) fail++;
  if (!check('CollaborationCaret only mounts when both ydoc + user are present',
       /if \(ydoc\?\.doc\)[\s\S]{0,400}?if \(ydoc\.awareness && me\)/.test(editor))) fail++;

  // ===========================================================================
  //  34.2D — Version-history integration
  // ===========================================================================
  console.log('\n34.2D — Version-history integration');
  if (!check('VersionHistoryService injects YDocStore',
       /private ydocs:\s*YDocStore/.test(vhSvc))) fail++;
  if (!check('createSnapshot flushes pending Y.Docs first',
       /async createSnapshot[\s\S]{0,800}?await this\.flushDeckYDocs\(deckId\)/.test(vhSvc))) fail++;
  if (!check('flushDeckYDocs walks every element + calls ydocs.flush(elementDocId)',
       /flushDeckYDocs[\s\S]{0,600}?slideElement\.findMany[\s\S]{0,400}?ydocs\.flush\(elementDocId/.test(vhSvc))) fail++;

  console.log();
  if (fail === 0) console.log('✅ Phase 34.2: all Yjs-finalization checks pass');
  else { console.error(`❌ ${fail} regressions detected`); process.exit(1); }
}

main().catch((err) => { console.error('Validation failed:', err); process.exit(1); });
