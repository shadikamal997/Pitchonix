/**
 * Version History Final Wiring B — preview fidelity + read-only UX validation
 *
 *   Task 1 — useElementsApi accepts overrideElements + skips fetch/write
 *            when supplied
 *   Task 2 — SlideEditor passes a preview-aware sidebar api whose `slides`
 *            field is the snapshot's slides during preview
 *   Task 3 — SlideCanvas + SectionedSidebar gain a `readOnly` prop and use
 *            it to suppress mutation affordances visually
 *   Task 4 — Inspector renders a lock pane when readOnly is true
 *
 *   Pure source-scan validation — no React runtime needed.
 *
 *   Run:  pnpm ts-node scripts/phase35-wiring-b-validate.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..', 'frontend');
function read(rel: string): string { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function check(label: string, ok: boolean, detail?: string): boolean {
  console.log(`  ${ok ? '·' : '!'} ${label}${detail ? '  — ' + detail : ''}`);
  return ok;
}

async function main() {
  console.log(`Version History Final Wiring B validation\n`);
  let fail = 0;

  // ===========================================================================
  //  Task 1 — useElementsApi overrideElements
  // ===========================================================================
  const elementsApi = read('features/slide-editor/useElementsApi.ts');
  console.log('Test 1 — useElementsApi.overrideElements');
  if (!check('signature accepts overrideElements?',
       /useElementsApi\([\s\S]{0,1500}?overrideElements\?:\s*SlideElementDTO\[\]\s*\|\s*null/.test(elementsApi))) fail++;
  if (!check('hasOverride flag derived from prop',
       /const hasOverride = Array\.isArray\(overrideElements\)/.test(elementsApi))) fail++;
  if (!check('override useEffect mirrors override into state',
       /hasOverride[\s\S]{0,300}?setState\(\{\s*elements:\s*overrideElements/.test(elementsApi))) fail++;
  if (!check('load effect short-circuits when hasOverride',
       /if \(hasOverride\) return;[\s\S]{0,200}?if \(!slideId\)/.test(elementsApi))) fail++;
  if (!check('flush() drops queue when previewing/override',
       /flush[\s\S]{0,300}?\(hasOverride \|\| isPreviewing\)[\s\S]{0,80}?pendingRef\.current\.clear/.test(elementsApi))) fail++;

  // ===========================================================================
  //  Task 3 — readOnly props on canvas + sidebar
  // ===========================================================================
  const canvas = read('features/slide-editor/SlideCanvas.tsx');
  console.log('\nTest 2 — SlideCanvas readOnly');
  if (!check('SlideCanvasProps.readOnly defined',
       /readOnly\?:\s*boolean/.test(canvas))) fail++;
  if (!check('component destructures readOnly with default',
       /readOnly\s*=\s*false,/.test(canvas))) fail++;
  if (!check('stage applies pointer-events-none when readOnly',
       /\$\{readOnly \? 'pointer-events-none' : ''\}/.test(canvas))) fail++;
  if (!check('onMouseDown early-returns when readOnly',
       /onMouseDown[\s\S]{0,400}?if \(readOnly\) return/.test(canvas))) fail++;

  const sidebar = read('features/slide-editor/sidebar/SectionedSidebar.tsx');
  console.log('\nTest 3 — SectionedSidebar readOnly');
  if (!check('Props.readOnly defined',
       /readOnly\?:\s*boolean/.test(sidebar))) fail++;
  if (!check('component destructures readOnly with default',
       /readOnly\s*=\s*false,/.test(sidebar))) fail++;
  if (!check('add-section affordance gated on !readOnly',
       /\{!readOnly && \(\s*\n[\s\S]{0,200}?handleCreateSection/.test(sidebar))) fail++;
  if (!check('bulk action bar gated on !readOnly',
       /\{!readOnly && selectedIds\.size > 1/.test(sidebar))) fail++;
  if (!check('add-slide row hidden in readOnly',
       /if \(readOnly\) return null;[\s\S]{0,200}?<button[\s\S]{0,400}?handleAdd/.test(sidebar))) fail++;

  // ===========================================================================
  //  Task 4 — Inspector lock pane
  // ===========================================================================
  const inspector = read('features/slide-editor/inspector/Inspector.tsx');
  console.log('\nTest 4 — Inspector lock pane');
  if (!check('InspectorProps.readOnly + readOnlyContext defined',
       /readOnly\?:\s*boolean[\s\S]{0,300}?readOnlyContext\?:\s*\{\s*label:\s*string/.test(inspector))) fail++;
  if (!check('renders Lock icon in readOnly branch',
       /if \(readOnly\)[\s\S]{0,2000}?Lock\s+className/.test(inspector))) fail++;
  if (!check('lock pane returns early before normal Inspector render',
       /if \(readOnly\)[\s\S]{0,3000}?return \(\s*<aside/.test(inspector))) fail++;
  if (!check('lock pane shows version context when provided',
       /readOnlyContext[\s\S]{0,400}?\{readOnlyContext\.label\}/.test(inspector))) fail++;

  // ===========================================================================
  //  Tasks 2 + 5 — SlideEditor wiring
  // ===========================================================================
  const editor = read('features/slide-editor/SlideEditor.tsx');
  console.log('\nTest 5 — SlideEditor wiring');
  if (!check('previewElements memo derives from snapshot + active order',
       /previewElements = useMemo[\s\S]{0,600}?preview\.snapshot[\s\S]{0,500}?snapSlide\?\.elements/.test(editor))) fail++;
  if (!check('useElementsApi receives previewElements as 3rd arg',
       /useElementsApi\(slideId,\s*slide\?\.deckId[\s\S]{0,80}?previewElements\)/.test(editor))) fail++;
  if (!check('sidebarApi memo replaces slides with slidesForRender',
       /sidebarApi = useMemo[\s\S]{0,400}?slides:\s*slidesForRender/.test(editor))) fail++;
  if (!check('SectionedSidebar receives sidebarApi + readOnly={preview.isPreviewing}',
       /<SectionedSidebar[\s\S]{0,800}?api=\{sidebarApi\}[\s\S]{0,800}?readOnly=\{preview\.isPreviewing\}/.test(editor))) fail++;
  if (!check('SlideCanvas receives readOnly={preview.isPreviewing}',
       /<SlideCanvas[\s\S]{0,2000}?readOnly=\{preview\.isPreviewing\}/.test(editor))) fail++;
  if (!check('SlideCanvas totalPages uses slidesForRender.length',
       /<SlideCanvas[\s\S]{0,1500}?totalPages=\{slidesForRender\.length/.test(editor))) fail++;
  if (!check('Inspector receives readOnly + readOnlyContext',
       /<Inspector[\s\S]{0,800}?readOnly=\{preview\.isPreviewing\}[\s\S]{0,400}?readOnlyContext=/.test(editor))) fail++;

  console.log();
  if (fail === 0) console.log('✅ Version History Final Wiring B: all checks pass');
  else { console.error(`❌ ${fail} regressions detected`); process.exit(1); }
}

main().catch((err) => { console.error('Validation failed:', err); process.exit(1); });
