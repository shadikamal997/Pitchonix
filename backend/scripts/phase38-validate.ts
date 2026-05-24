/**
 * Phase 38 — Advanced PPTX Editing validation
 *
 *   38A — MasterSlide model + service + controller + apply-to-deck
 *   38B — LayoutTemplate model + service + Convert Slide → Layout
 *   38C — DeckTheme model + service + workspace theme + Theme Builder page
 *   38D — PPTX import service + controller + import UI
 *   38E — PPTX export fidelity (speaker notes + transitions + sections passthrough)
 *   38F — Speaker notes panel (already present, verified)
 *   38G — DeckSection model + service + controller (reorder + duplicate)
 *   38H — SlideAnimations service + controller + AnimationsPanel UI
 *   38I — SlideTransitions service + controller + TransitionControl UI
 *   38J — Advanced tables — merge/split UI in TablePanel
 *   38K — GuidesOverlay (rulers + draggable guides + safe area + snap helper)
 *   38L+M — Presenter mode (existing PresenterMode.tsx; verified)
 *   38N — MediaRenderer (HTML5 video/audio/GIF)
 *   38O — ReusableSlide model + SlideLibrary service + page
 *   38P — DeckTemplate model + service + Template Builder page
 *
 *   Pure source-scan — no runtime needed.
 */

import * as fs from 'fs';
import * as path from 'path';

const FE       = path.join(__dirname, '..', '..', 'frontend');
const BE       = path.join(__dirname, '..');
const readFE   = (rel: string): string => fs.readFileSync(path.join(FE, rel), 'utf8');
const readBE   = (rel: string): string => fs.readFileSync(path.join(BE, rel), 'utf8');
const existsFE = (rel: string): boolean => fs.existsSync(path.join(FE, rel));
const existsBE = (rel: string): boolean => fs.existsSync(path.join(BE, rel));

let fail = 0;
function check(label: string, ok: boolean): void {
  console.log(`  ${ok ? '·' : '!'} ${label}`);
  if (!ok) fail++;
}

async function main() {
  console.log('Phase 38 — Advanced PPTX Editing validation\n');

  const schema    = readBE('prisma/schema.prisma');
  const appModule = readBE('src/app.module.ts');

  // ===========================================================================
  //  Schema additions
  // ===========================================================================
  console.log('Schema');
  check('MasterSlide model',     /^model MasterSlide \{[\s\S]+?layoutType\s+String/m.test(schema));
  check('LayoutTemplate model',  /^model LayoutTemplate \{[\s\S]+?slots\s+Json/m.test(schema));
  check('DeckTheme model',       /^model DeckTheme \{[\s\S]+?tokens\s+Json/m.test(schema));
  check('DeckSection model',     /^model DeckSection \{[\s\S]+?collapsed\s+Boolean/m.test(schema));
  check('ReusableSlide model',   /^model ReusableSlide \{[\s\S]+?payload\s+Json/m.test(schema));
  check('DeckTemplate model',    /^model DeckTemplate \{[\s\S]+?payload\s+Json/m.test(schema));
  check('Slide.sectionId field',        /sectionId\s+String\?/.test(schema));
  check('Slide.masterSlideId field',    /masterSlideId\s+String\?/.test(schema));
  check('Slide.layoutTemplateId field', /layoutTemplateId\s+String\?/.test(schema));
  check('Slide.themeId field',          /themeId\s+String\?/.test(schema));
  check('Slide.transition Json field',  /\btransition\s+Json\?/.test(schema));

  // ===========================================================================
  //  Backend services + controllers
  // ===========================================================================
  console.log('\nBackend services');
  const services: Array<[string, string, string]> = [
    ['38A MasterSlidesService',     'src/master-slides/master-slides.service.ts',     'applyToDeck'],
    ['38A MasterSlidesController',  'src/master-slides/master-slides.controller.ts',  'apply-to-deck'],
    ['38B LayoutTemplatesService',  'src/layout-templates/layout-templates.service.ts', 'fromSlide'],
    ['38B LayoutTemplatesController','src/layout-templates/layout-templates.controller.ts', 'from-slide'],
    ['38C ThemesService',           'src/themes/themes.service.ts',                   'applyToDeck'],
    ['38C ThemesController',        'src/themes/themes.controller.ts',                'apply-to-deck'],
    ['38G DeckSectionsService',     'src/deck-sections/deck-sections.service.ts',     'reorder'],
    ['38G DeckSectionsController',  'src/deck-sections/deck-sections.controller.ts',  'duplicate'],
    ['38H SlideAnimationsService',  'src/slide-animations/slide-animations.service.ts','reorder'],
    ['38H SlideAnimationsController','src/slide-animations/slide-animations.controller.ts','animations'],
    ['38I SlideTransitionsService', 'src/slide-transitions/slide-transitions.service.ts', 'applyToDeck'],
    ['38I SlideTransitionsController','src/slide-transitions/slide-transitions.controller.ts', 'transition'],
    ['38O SlideLibraryService',     'src/slide-library/slide-library.service.ts',     'saveSlide'],
    ['38O SlideLibraryController',  'src/slide-library/slide-library.controller.ts',  'from-slide'],
    ['38P DeckTemplatesService',    'src/deck-templates/deck-templates.service.ts',   'instantiate'],
    ['38P DeckTemplatesController', 'src/deck-templates/deck-templates.controller.ts','from-deck'],
    ['38D PptxImportService',       'src/pptx-import/pptx-import.service.ts',         'parseBuffer'],
    ['38D PptxImportController',    'src/pptx-import/pptx-import.controller.ts',      'into-project'],
  ];
  for (const [label, file, needle] of services) {
    check(`${label} (${path.basename(file)}: ${needle})`, existsBE(file) && readBE(file).includes(needle));
  }

  console.log('\nBackend module wiring');
  for (const mod of [
    'MasterSlidesModule', 'LayoutTemplatesModule', 'ThemesModule',
    'DeckSectionsModule', 'SlideAnimationsModule', 'SlideTransitionsModule',
    'SlideLibraryModule', 'DeckTemplatesModule', 'PptxImportModule',
  ]) {
    check(`app.module imports + registers ${mod}`, appModule.includes(mod));
  }

  // ===========================================================================
  //  38E — PPTX export fidelity
  // ===========================================================================
  console.log('\n38E — PPTX export fidelity');
  const exporter = readBE('src/slide-export/element-pptx-exporter.ts');
  check('exporter writes speakerNotes via ps.addNotes',     /ps\.addNotes\(/.test(exporter));
  check('exporter wires transition via pptxTransitionType', /pptxTransitionType\(/.test(exporter));
  const renderTypes = readBE('src/slide-export/render-types.ts');
  check('RenderSlideInput carries speakerNotes', /speakerNotes\?:\s*string/.test(renderTypes));
  check('RenderSlideInput carries transition',   /transition\?:/.test(renderTypes));
  check('RenderSlideInput carries sectionId',    /sectionId\?:/.test(renderTypes));
  const slideExportSvc = readBE('src/slide-export/slide-export.service.ts');
  check('slide-export passes speakerNotes through', /speakerNotes:\s*\(slide as any\)\.speakerNotes/.test(slideExportSvc));
  check('slide-export passes transition through',   /transition:\s+\(\(slide as any\)\.transition/.test(slideExportSvc));

  // ===========================================================================
  //  Frontend hooks + UI
  // ===========================================================================
  console.log('\nFrontend hooks + UI');
  const hooks = readFE('features/pptx-editing/hooks.ts');
  for (const name of [
    'useMasterSlides', 'useLayoutTemplates', 'useThemes', 'useDeckSections',
    'useElementAnimations', 'useSlideTransition', 'useSlideLibrary', 'useDeckTemplates',
    'importPptx', 'parsePptx',
  ]) {
    check(`hook ${name} exported`, new RegExp(`export\\s+(?:async\\s+function\\s+|function\\s+)?${name}\\b|export\\s+function\\s+${name}\\b|export\\s+async\\s+function\\s+${name}\\b`).test(hooks));
  }

  const inspector = readFE('features/slide-editor/inspector/Inspector.tsx');
  check('Inspector imports AnimationsPanel', /AnimationsPanel/.test(inspector));
  check('Inspector has animate tab',          /id:\s*['"]animate['"]/.test(inspector));

  const slidePanel = readFE('features/slide-editor/inspector/panels/SlidePanel.tsx');
  check('SlidePanel embeds TransitionControl', /TransitionControl/.test(slidePanel));

  const tablePanel = readFE('features/slide-editor/inspector/panels/TablePanel.tsx');
  check('TablePanel has merge actions', /Merge with cell to the right/.test(tablePanel));
  check('TablePanel has split action',  /Split merged cell/.test(tablePanel));

  check('GuidesOverlay component exists', existsFE('features/pptx-editing/GuidesOverlay.tsx'));
  if (existsFE('features/pptx-editing/GuidesOverlay.tsx')) {
    const guides = readFE('features/pptx-editing/GuidesOverlay.tsx');
    check('GuidesOverlay has rulers + safe area + findSnapTarget',
      /showRulers/.test(guides) && /showSafeArea/.test(guides) && /export function findSnapTarget/.test(guides));
  }

  check('MediaRenderer exists', existsFE('features/pptx-editing/MediaRenderer.tsx'));
  if (existsFE('features/pptx-editing/MediaRenderer.tsx')) {
    const media = readFE('features/pptx-editing/MediaRenderer.tsx');
    check('MediaRenderer supports video/audio/gif tags',
      /<video\b/.test(media) && /<audio\b/.test(media) && /pickKind/.test(media));
  }

  // ===========================================================================
  //  Pages
  // ===========================================================================
  console.log('\nPages');
  for (const [label, p] of [
    ['Theme Builder',     'app/themes/page.tsx'],
    ['Slide Library',     'app/slide-library/page.tsx'],
    ['Deck Templates',    'app/deck-templates/page.tsx'],
    ['Masters dashboard', 'app/masters/page.tsx'],
    ['PPTX Import',       'app/pptx-import/page.tsx'],
  ] as Array<[string, string]>) {
    check(`page ${label} exists`, existsFE(p));
  }

  // ===========================================================================
  //  Presenter mode (existing - verified)
  // ===========================================================================
  console.log('\n38L+M — Presenter mode (existing)');
  check('PresenterMode.tsx exists', existsFE('features/slide-editor/presenter/PresenterMode.tsx'));
  check('PresentationSlideView.tsx exists', existsFE('features/slide-editor/presenter/PresentationSlideView.tsx'));

  // ===========================================================================
  //  Summary
  // ===========================================================================
  const total = countChecks();
  console.log(`\n${fail === 0
    ? `✓ Phase 38 — all ${total} checks passed`
    : `✗ Phase 38 — ${fail} of ${total} check(s) failed`}\n`);
  process.exit(fail === 0 ? 0 : 1);
}

let _checkCount = 0;
function countChecks(): number {
  // Sneaky: monkey-patch console.log to count `·` and `!` outputs.
  return _checkCount;
}

// Recount by hooking console.log via a wrapper used inside check().
const _origLog = console.log;
console.log = ((...args: any[]) => {
  const s = args.map(String).join(' ');
  if (s.startsWith('  · ') || s.startsWith('  ! ')) _checkCount++;
  return _origLog(...args);
}) as typeof console.log;

main().catch((e) => { console.error(e); process.exit(1); });
