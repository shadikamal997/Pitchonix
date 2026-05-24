/**
 * Phase 35.1A — Version History Adoption Pass validation
 *
 *   This pass is largely about wiring React hooks together. Pure-logic tests
 *   can't simulate React state, but they CAN verify the adoption contract:
 *
 *     1. useVersionPreview is now Context-based (Provider exists)
 *     2. useIsPreviewing convenience hook exists
 *     3. useSlidesForRender helper exists for canvas swap
 *     4. useElementsApi accepts deckId for safety snapshots
 *     5. useElementsApi guards every mutator on isPreviewing
 *     6. useDeckSlides guards every mutator on isPreviewing
 *     7. useDeckSlides remove/removeMany call safety.beforeDelete
 *     8. VersionHistoryPanel imports toastSuccess/toastError from @/hooks/useToast
 *     9. SlideEditor passes deckId into useElementsApi
 *
 *   Each test does a focused source-scan of the actual file content so we
 *   detect regressions if anyone removes a guard.
 *
 *   Run:  pnpm ts-node scripts/phase35-1a-validate.ts
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
  console.log(`Phase 35.1A — Version History Adoption validation\n`);
  let fail = 0;

  // ===========================================================================
  //  useVersionPreview is now Context-based
  // ===========================================================================
  const preview = read('features/slide-editor/versions/useVersionPreview.ts');
  console.log('Test 1 — useVersionPreview Context refactor');
  if (!check('createContext used',         /createContext\s*[<(]/.test(preview))) fail++;
  if (!check('VersionPreviewProvider exported', /export const VersionPreviewProvider/.test(preview))) fail++;
  if (!check('useVersionPreview consumer hook reads context', /export function useVersionPreview\(\): PreviewState\s*{\s*\n\s*return useContext\(VersionPreviewContext\)/.test(preview))) fail++;
  if (!check('useIsPreviewing convenience hook',    /export function useIsPreviewing\(\): boolean/.test(preview))) fail++;
  if (!check('useSlidesForRender exported',         /export function useSlidesForRender</.test(preview))) fail++;
  if (!check('noop state for non-provider trees',   /NOOP_STATE/.test(preview))) fail++;

  // ===========================================================================
  //  useElementsApi adoption
  // ===========================================================================
  const elementsApi = read('features/slide-editor/useElementsApi.ts');
  console.log('\nTest 2 — useElementsApi guards + safety snapshot');
  if (!check('imports useIsPreviewing',             /useIsPreviewing/.test(elementsApi))) fail++;
  if (!check('imports useSafetySnapshot',           /useSafetySnapshot/.test(elementsApi))) fail++;
  if (!check('accepts deckId parameter',            /deckId\?: string \| null/.test(elementsApi))) fail++;
  // Every mutator should mention isPreviewing as a guard.
  const mutators = ['updateElement', 'updateMany', 'createElement', 'duplicateElement', 'deleteElement', 'reorder', 'syncAll'];
  for (const fn of mutators) {
    const re = new RegExp(`const ${fn} = useCallback[\\s\\S]{0,400}?if \\(isPreviewing`);
    if (!check(`${fn.padEnd(18)} guarded by isPreviewing`, re.test(elementsApi))) fail++;
  }
  if (!check('deleteElement calls safety.before(...)', /deleteElement[\s\S]{0,600}?safety\.before\(/.test(elementsApi))) fail++;

  // ===========================================================================
  //  useDeckSlides adoption
  // ===========================================================================
  const deckSlides = read('features/slide-editor/sidebar/useDeckSlides.ts');
  console.log('\nTest 3 — useDeckSlides guards + safety snapshot');
  if (!check('imports useIsPreviewing',             /useIsPreviewing/.test(deckSlides))) fail++;
  if (!check('imports useSafetySnapshot',           /useSafetySnapshot/.test(deckSlides))) fail++;
  const slideMutators = ['insertAfter', 'insertAtEnd', 'duplicate', 'remove', 'reorder', 'updateLocal', 'patchSlideMetadata', 'removeMany', 'duplicateMany'];
  for (const fn of slideMutators) {
    const re = new RegExp(`const ${fn} = useCallback[\\s\\S]{0,500}?if \\(isPreviewing`);
    if (!check(`${fn.padEnd(20)} guarded by isPreviewing`, re.test(deckSlides))) fail++;
  }
  // Safety snapshots on destructive paths.
  if (!check('remove() calls safety.beforeDelete(\'slide\')',     /remove\s*=[\s\S]{0,400}?safety\.beforeDelete\(['"]slide['"]\)/.test(deckSlides))) fail++;
  if (!check('removeMany() calls safety.beforeDelete(\'slides\', ...)', /removeMany\s*=[\s\S]{0,500}?safety\.beforeDelete\(['"]slides['"]\s*,/.test(deckSlides))) fail++;

  // ===========================================================================
  //  Toast integration
  // ===========================================================================
  const panel = read('features/slide-editor/versions/VersionHistoryPanel.tsx');
  console.log('\nTest 4 — toast integration');
  if (!check('imports toastSuccess + toastError from @/hooks/useToast', /import\s*{\s*toastSuccess\s*,\s*toastError\s*}\s*from\s*'@\/hooks\/useToast'/.test(panel))) fail++;
  if (!check('default toast routes errors to toastError', /toastError\s*\(\s*msg\s*\)/.test(panel))) fail++;
  if (!check('default toast routes success to toastSuccess', /toastSuccess\s*\(\s*msg\s*\)/.test(panel))) fail++;
  if (!check('no console.log fallback remains for toast', !/console\.log\(`\[\$\{tone\}\]/.test(panel))) fail++;

  // ===========================================================================
  //  SlideEditor wiring
  // ===========================================================================
  const editor = read('features/slide-editor/SlideEditor.tsx');
  console.log('\nTest 5 — SlideEditor passes deckId into useElementsApi');
  if (!check('useElementsApi receives slide?.deckId', /useElementsApi\(slideId,\s*slide\?\.deckId/.test(editor))) fail++;

  // ===========================================================================
  //  Summary
  // ===========================================================================
  console.log();
  if (fail === 0) {
    console.log(`✅ Phase 35.1A: ${fail === 0 ? 'all adoption checks pass' : `${fail} regressions`}`);
  } else {
    console.error(`❌ ${fail} regressions detected`);
    process.exit(1);
  }
}

main().catch((err) => { console.error('Validation failed:', err); process.exit(1); });
