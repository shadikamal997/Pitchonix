/**
 * Phase 35.1C — Version History Polish Pass validation
 *
 *   Task 1 — DisabledWhilePreviewing helper + toolbar cluster wrapping +
 *            disabled-on-preview for inline Undo/Redo/Duplicate/Delete
 *   Task 2 — FloatingToolbar suppressed during preview
 *   Task 3 — useDeckMasters accepts overrideMasters param, mirrors snapshot
 *            into state, skips fetch, and guards every mutator on isPreviewing
 *
 *   Pure source-scan — no React runtime needed.
 *
 *   Run:  pnpm ts-node scripts/phase35-1C-validate.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..', 'frontend');
function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function check(label: string, ok: boolean, detail?: string): boolean {
  console.log(`  ${ok ? '·' : '!'} ${label}${detail ? '  — ' + detail : ''}`);
  return ok;
}

async function main() {
  console.log(`Phase 35.1C — Version History Polish Pass validation\n`);
  let fail = 0;

  const editor  = read('features/slide-editor/SlideEditor.tsx');
  const masters = read('features/slide-editor/masters/useDeckMasters.ts');

  // ===========================================================================
  //  Task 1 — DisabledWhilePreviewing helper + toolbar clusters
  // ===========================================================================
  console.log('Task 1 — DisabledWhilePreviewing helper');
  if (!check('helper component declared',
       /const DisabledWhilePreviewing[\s\S]{0,200}?React\.FC/.test(editor))) fail++;
  if (!check('helper carries cursor-not-allowed wrapper',
       /cursor-not-allowed[\s\S]{0,500}?pointer-events-none/.test(editor))) fail++;
  if (!check('helper carries opacity dim on children',
       /opacity-40\s+pointer-events-none/.test(editor))) fail++;
  if (!check('helper carries PREVIEW_DISABLE_TIP tooltip',
       /title=\{PREVIEW_DISABLE_TIP\}/.test(editor))) fail++;
  if (!check('PREVIEW_DISABLE_TIP string defined',
       /PREVIEW_DISABLE_TIP\s*=\s*['"]Editing disabled while previewing a historical version['"]/.test(editor))) fail++;

  console.log('\nTask 1 — toolbar clusters wrapped');
  // Template button — wrapped
  if (!check('Template button wrapped',
       /<DisabledWhilePreviewing[^>]*disabled=\{preview\.isPreviewing\}[^>]*>[\s\S]{0,800}?setTemplateGalleryOpen\(true\)/.test(editor))) fail++;
  // LayoutSwitcher — wrapped
  if (!check('LayoutSwitcher wrapped',
       /<DisabledWhilePreviewing[^>]*disabled=\{preview\.isPreviewing\}[^>]*>[\s\S]{0,400}?<LayoutSwitcher/.test(editor))) fail++;
  // InsertMenu — wrapped
  if (!check('InsertMenu wrapped',
       /<DisabledWhilePreviewing[^>]*disabled=\{preview\.isPreviewing\}[^>]*>[\s\S]{0,400}?<InsertMenu/.test(editor))) fail++;
  // SmartTools — wrapped
  if (!check('SmartTools wrapped',
       /<DisabledWhilePreviewing[^>]*disabled=\{preview\.isPreviewing\}[^>]*>[\s\S]{0,400}?<SmartTools/.test(editor))) fail++;
  // AlignTools — wrapped
  if (!check('AlignTools wrapped',
       /<DisabledWhilePreviewing[^>]*disabled=\{preview\.isPreviewing\}[^>]*>[\s\S]{0,400}?<AlignTools/.test(editor))) fail++;
  // ArrangeTools — wrapped
  if (!check('ArrangeTools wrapped',
       /<DisabledWhilePreviewing[^>]*disabled=\{preview\.isPreviewing\}[^>]*>[\s\S]{0,400}?<ArrangeTools/.test(editor))) fail++;

  console.log('\nTask 1 — inline Undo/Redo/Duplicate/Delete carry preview-disable');
  if (!check('Undo disabled or-preview',
       /history\.undo\(\)[\s\S]{0,200}?disabled=\{!history\.canUndo \|\| preview\.isPreviewing\}/.test(editor))) fail++;
  if (!check('Redo disabled or-preview',
       /history\.redo\(\)[\s\S]{0,200}?disabled=\{!history\.canRedo \|\| preview\.isPreviewing\}/.test(editor))) fail++;
  if (!check('Duplicate disabled or-preview',
       /disabled=\{selectedIds\.length === 0 \|\| preview\.isPreviewing\}[\s\S]{0,400}?handleDuplicateSelected/.test(editor))) fail++;
  if (!check('Delete disabled or-preview',
       /disabled=\{selectedIds\.length === 0 \|\| preview\.isPreviewing\}[\s\S]{0,400}?handleDeleteSelected/.test(editor))) fail++;
  // Tooltips swap to PREVIEW_DISABLE_TIP when previewing
  if (!check('Undo tooltip swaps to PREVIEW_DISABLE_TIP',
       /preview\.isPreviewing\s*\?\s*PREVIEW_DISABLE_TIP\s*:\s*['"]Undo/.test(editor))) fail++;
  if (!check('Redo tooltip swaps to PREVIEW_DISABLE_TIP',
       /preview\.isPreviewing\s*\?\s*PREVIEW_DISABLE_TIP\s*:\s*['"]Redo/.test(editor))) fail++;
  if (!check('Duplicate tooltip swaps to PREVIEW_DISABLE_TIP',
       /preview\.isPreviewing\s*\?\s*PREVIEW_DISABLE_TIP\s*:\s*['"]Duplicate/.test(editor))) fail++;
  if (!check('Delete tooltip swaps to PREVIEW_DISABLE_TIP',
       /preview\.isPreviewing\s*\?\s*PREVIEW_DISABLE_TIP\s*:\s*['"]Delete/.test(editor))) fail++;

  // ===========================================================================
  //  Task 2 — FloatingToolbar suppressed during preview
  // ===========================================================================
  console.log('\nTask 2 — FloatingToolbar suppressed during preview');
  if (!check('FloatingToolbar render gated on !preview.isPreviewing',
       /editingId && !preview\.isPreviewing && \([\s\S]{0,200}?<FloatingToolbar/.test(editor))) fail++;

  // ===========================================================================
  //  Task 3 — useDeckMasters.overrideMasters param
  // ===========================================================================
  console.log('\nTask 3 — useDeckMasters.overrideMasters override pin');
  if (!check('useDeckMasters signature accepts overrideMasters',
       /useDeckMasters\(\s*[\s\S]{0,400}?overrideMasters\?: MasterElementDTO\[\] \| null/.test(masters))) fail++;
  if (!check('hasOverride derived from Array.isArray(overrideMasters)',
       /const hasOverride = Array\.isArray\(overrideMasters\)/.test(masters))) fail++;
  if (!check('override mirrors snapshot into setMasters in an effect',
       /if \(!hasOverride\) return;[\s\S]{0,200}?setMasters\(overrideMasters as MasterElementDTO\[\]\)/.test(masters))) fail++;
  if (!check('refresh() early-returns when override is active',
       /const refresh = useCallback\(async \(\) => \{[\s\S]{0,200}?if \(hasOverride\) return;/.test(masters))) fail++;
  if (!check('refresh dep array includes hasOverride',
       /useCallback\(async \(\) => \{[\s\S]{0,1200}?\}, \[deckId, hasOverride\]\)/.test(masters))) fail++;
  // All four mutators guarded by isPreviewing
  if (!check('create guarded by isPreviewing',
       /const create = useCallback[\s\S]{0,400}?if \(isPreviewing \|\| !deckId\) return null/.test(masters))) fail++;
  if (!check('update guarded by isPreviewing',
       /const update = useCallback[\s\S]{0,400}?if \(isPreviewing \|\| !deckId\) return null/.test(masters))) fail++;
  if (!check('remove guarded by isPreviewing (pre-existing)',
       /const remove = useCallback[\s\S]{0,400}?if \(isPreviewing \|\| !deckId\) return/.test(masters))) fail++;
  if (!check('setSettingsApi guarded by isPreviewing',
       /const setSettingsApi = useCallback[\s\S]{0,400}?if \(isPreviewing \|\| !deckId\) return/.test(masters))) fail++;

  console.log();
  if (fail === 0) console.log('✅ Phase 35.1C: all polish-pass checks pass');
  else { console.error(`❌ ${fail} regressions detected`); process.exit(1); }
}

main().catch((err) => { console.error('Validation failed:', err); process.exit(1); });
