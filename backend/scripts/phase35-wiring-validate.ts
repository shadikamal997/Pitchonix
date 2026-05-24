/**
 * Version History Final Wiring — completion-pass validation
 *
 *   Tasks 1 + 2 + 3 + 4 — Provider, Banner, Badge, Panel-drawer mounted in
 *                         SlideEditor
 *   Task 5             — useSlidesForRender wired to the page-number context
 *   Task 6             — SlideCanvas's two pre-existing type errors fixed
 *                         (findAllVariants added, renderElement ctx extended)
 *   Task 7             — read-only enforced at hook chokepoint (verified by
 *                         re-running the 35.1A script — same coverage holds)
 *   Task 8             — useDeckMasters.remove + useSlideInstances.remove
 *                         adopt useSafetySnapshot
 *
 *   Pure source-scan — no React runtime needed.
 *
 *   Run:  pnpm ts-node scripts/phase35-wiring-validate.ts
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
  console.log(`Version History Final Wiring validation\n`);
  let fail = 0;

  // ===========================================================================
  //  SlideEditor wiring
  // ===========================================================================
  const editor = read('features/slide-editor/SlideEditor.tsx');

  console.log('Test 1 — SlideEditor imports the version-history surface');
  if (!check('imports VersionPreviewProvider + useVersionPreview + useSlidesForRender',
       /VersionPreviewProvider[\s\S]*useVersionPreview[\s\S]*useSlidesForRender/.test(editor))) fail++;
  if (!check('imports VersionPreviewBanner',  /import\s*{\s*VersionPreviewBanner\s*}/.test(editor))) fail++;
  if (!check('imports VersionHistoryPanel',   /import\s*{\s*VersionHistoryPanel\s*}/.test(editor))) fail++;
  if (!check('imports DeckVersionBadge',      /import\s*{\s*DeckVersionBadge\s*}/.test(editor))) fail++;
  if (!check('imports useVersionHistory',     /import\s*{\s*useVersionHistory\s*}/.test(editor))) fail++;

  console.log('\nTest 2 — SlideEditor mounts the pieces');
  if (!check('Provider wraps the editor tree',          /<VersionPreviewProvider>[\s\S]*?<EditorErrorBoundary/.test(editor))) fail++;
  if (!check('Banner rendered when preview.isPreviewing', /preview\.isPreviewing[\s\S]{0,200}?<VersionPreviewBanner/.test(editor))) fail++;
  if (!check('Badge in toolbar with versions prop',     /<DeckVersionBadge\s+versions=\{versionHistory\.versions\}/.test(editor))) fail++;
  if (!check('Panel drawer renders when versionPanelOpen', /versionPanelOpen[\s\S]{0,1200}?<VersionHistoryPanel/.test(editor))) fail++;
  if (!check('Panel onPreview wires to preview.enter',  /onPreview=\{\(versionId\)\s*=>\s*\{[\s\S]{0,80}?preview\.enter\(versionId\)/.test(editor))) fail++;

  console.log('\nTest 3 — slidesForRender wired into page-number indicator');
  if (!check('slidesForRender used for page count',     /slidesForRender\.length/.test(editor))) fail++;

  console.log('\nTest 4 — Banner Restore calls existing restore()');
  if (!check('Banner onRestore awaits versionHistory.restore(...)',
       /<VersionPreviewBanner[\s\S]{0,400}?versionHistory\.restore\(preview\.versionId/.test(editor))) fail++;
  if (!check('Banner onExit calls preview.exit',
       /<VersionPreviewBanner[\s\S]{0,400}?onExit=\{preview\.exit\}/.test(editor))) fail++;

  // ===========================================================================
  //  Pre-existing type errors fixed
  // ===========================================================================
  console.log('\nTest 5 — SlideCanvas pre-existing type errors fixed');
  const types = read('features/slide-editor/templates/composition/types.ts');
  const renderers = read('features/slide-editor/renderers/index.tsx');
  if (!check('findAllVariants exported from composition/types',
       /export function findAllVariants\(/.test(types))) fail++;
  if (!check('renderElement ctx accepts familyId',
       /renderElement\(el:[\s\S]{0,80}?ctx:\s*\{\s*pageNumber\?:[\s\S]{0,80}?familyId\?/.test(renderers))) fail++;
  if (!check('ELEMENT_RENDERERS Record type includes familyId',
       /ELEMENT_RENDERERS:\s*Record<ElementType,[\s\S]{0,200}?familyId\?/.test(renderers))) fail++;

  // ===========================================================================
  //  Additional safety-snapshot adoption
  // ===========================================================================
  const masters = read('features/slide-editor/masters/useDeckMasters.ts');
  const components = read('features/slide-editor/components/useComponents.ts');

  console.log('\nTest 6 — useDeckMasters adoption');
  if (!check('imports useIsPreviewing + useSafetySnapshot',
       /useIsPreviewing[\s\S]{0,80}?useSafetySnapshot|useSafetySnapshot[\s\S]{0,80}?useIsPreviewing/.test(masters))) fail++;
  if (!check('master.remove guarded + safety.beforeDelete(\'master\')',
       /const remove = useCallback[\s\S]{0,400}?if \(isPreviewing[\s\S]{0,400}?safety\.beforeDelete\(['"]master['"]\)/.test(masters))) fail++;

  console.log('\nTest 7 — useSlideInstances adoption (component instances)');
  if (!check('useSlideInstances accepts deckId arg',
       /useSlideInstances\(\s*slideId:[\s\S]{0,200}?deckId\?: string \| null/.test(components))) fail++;
  if (!check('useSlideInstances.remove guarded + safety.beforeDelete(\'component\')',
       /const remove = useCallback[\s\S]{0,400}?if \(isPreviewing[\s\S]{0,400}?safety\.beforeDelete\(['"]component['"]\)/.test(components))) fail++;
  if (!check('useSlideInstances.insert guarded by isPreviewing',
       /const insert = useCallback[\s\S]{0,500}?if \(isPreviewing/.test(components))) fail++;

  console.log();
  if (fail === 0) console.log('✅ Version History Final Wiring: all adoption checks pass');
  else { console.error(`❌ ${fail} regressions detected`); process.exit(1); }
}

main().catch((err) => { console.error('Validation failed:', err); process.exit(1); });
