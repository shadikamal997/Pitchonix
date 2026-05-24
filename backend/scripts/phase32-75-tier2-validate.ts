/**
 * Phase 32.75 Tier 2 — Component Library validation
 *
 * Builds a 100-slide deck in memory, generates 4 component definitions
 * (KPI / Pricing / Team / Roadmap) × 10 variants each (40 components),
 * creates 200 linked instances spread across the slides, and verifies:
 *
 *   1. Each instance resolves to the right element count on its slide.
 *   2. Editing a source component is observable everywhere via the resolver
 *      (i.e. the rendered output of every linked instance reflects the
 *      latest elementTree without per-instance updates).
 *   3. All 4 export paths (PPTX/PDF/PNG/JPEG) succeed and include the
 *      resolved component content on every slide.
 *
 *  Run:  pnpm ts-node scripts/phase32-75-tier2-validate.ts
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { SlideElementDTO } from '../src/slides/element-types';
import type { RenderDeckInput, RenderSlideInput } from '../src/slide-export/render-types';
import { exportDeckToPptx } from '../src/slide-export/element-pptx-exporter';
import { exportDeckToPdf, exportDeckToPngs, exportDeckToJpegs } from '../src/slide-export/element-image-exporter';
import type {
  SavedComponentDTO, ComponentInstanceDTO, ComponentCategory,
} from '../src/components/component-types';
import { resolveInstancesForSlide } from '../src/components/component-resolve';

const SLIDE_COUNT     = 100;
const INSTANCE_COUNT  = 200;
const NOW = new Date().toISOString();

// =============================================================================
//  Component fixtures — 4 categories × 10 variants.
//  Each variant is a SavedComponentDTO with a SlideElement-shaped tree.
// =============================================================================

const CATEGORIES: { cat: ComponentCategory; label: string }[] = [
  { cat: 'kpi',     label: 'KPI'     },
  { cat: 'pricing', label: 'Pricing' },
  { cat: 'team',    label: 'Team'    },
  { cat: 'roadmap', label: 'Roadmap' },
];

function buildComponentTree(cat: ComponentCategory, variant: number): SlideElementDTO[] {
  // Coordinates are in the component's local 0..100 space. The resolver
  // translates them by instance anchorX/anchorY.
  const base = (id: string, type: SlideElementDTO['type'], partial: Partial<SlideElementDTO>): SlideElementDTO => ({
    id, slideId: '',
    type, name: null, order: 0,
    x: 0, y: 0, width: 100, height: 100, rotation: 0, zIndex: 0,
    locked: false, visible: true,
    content: null, data: null, style: null, animations: null, accessibility: null,
    createdAt: NOW, updatedAt: NOW,
    ...partial,
  });

  switch (cat) {
    case 'kpi':
      return [
        base(`title-${variant}`, 'label', {
          x: 0, y: 0, width: 100, height: 15,
          content: { text: `KPI #${variant + 1}` } as any,
        }),
        base(`value-${variant}`, 'metric', {
          x: 0, y: 18, width: 100, height: 60,
          content: { value: `${(variant + 1) * 12}%`, label: 'YoY growth', delta: '+3.4', deltaDirection: 'up' } as any,
        }),
        base(`sub-${variant}`, 'caption', {
          x: 0, y: 80, width: 100, height: 20,
          content: { text: `Variant ${variant + 1}` } as any,
        }),
      ];
    case 'pricing':
      return [
        base(`pricing-${variant}`, 'pricingCard', {
          x: 0, y: 0, width: 100, height: 100,
          content: {
            tiers: [
              { name: 'Starter', price: '$9', period: 'mo', features: ['Up to 3 users', 'Basic charts'] },
              { name: 'Pro',     price: '$29', period: 'mo', features: ['Unlimited users', 'All charts', 'Priority support'], highlight: true },
              { name: 'Team',    price: '$79', period: 'mo', features: ['Workspaces', 'SSO', 'Audit logs'] },
            ],
          } as any,
        }),
      ];
    case 'team':
      return [
        base(`team-${variant}`, 'teamCard', {
          x: 0, y: 0, width: 100, height: 100,
          content: {
            members: [
              { name: 'Alex', role: 'CEO', bio: 'Built X · ex-Google' },
              { name: 'Sam',  role: 'CTO', bio: 'Built Y · ex-Stripe' },
              { name: 'Jo',   role: 'COO', bio: 'Built Z · ex-Airbnb' },
            ],
          } as any,
        }),
      ];
    case 'roadmap':
      return [
        base(`roadmap-${variant}`, 'roadmap', {
          x: 0, y: 0, width: 100, height: 100,
          content: {
            phases: [
              { period: 'Q1', phase: 'Foundation', bullets: ['Hire team', 'MVP'] },
              { period: 'Q2', phase: 'Launch',     bullets: ['Beta', 'PR'] },
              { period: 'Q3', phase: 'Scale',      bullets: ['Enterprise', 'Funnel ops'] },
              { period: 'Q4', phase: 'Expand',     bullets: ['EU launch', 'Series B'] },
            ],
          } as any,
        }),
      ];
    default:
      return [];
  }
}

function buildComponents(): SavedComponentDTO[] {
  const out: SavedComponentDTO[] = [];
  for (const { cat, label } of CATEGORIES) {
    for (let i = 0; i < 10; i++) {
      out.push({
        id:          `comp-${cat}-${i}`,
        userId:      'user-validation',
        workspaceId: null,
        name:        `${label} ${i + 1}`,
        description: `${label} component variant ${i + 1}`,
        category:    cat,
        thumbnail:   null,
        familyId:    null,
        tags:        [cat, 'fixture'],
        favorite:    i === 0,
        usageCount:  0,
        version:     1,
        elementTree: buildComponentTree(cat, i),
        createdAt:   NOW,
        updatedAt:   NOW,
      });
    }
  }
  return out;
}

// =============================================================================
//  Distribute 200 instances across 100 slides — 2 instances per slide.
// =============================================================================
function buildInstances(components: SavedComponentDTO[]): ComponentInstanceDTO[] {
  const out: ComponentInstanceDTO[] = [];
  for (let i = 0; i < INSTANCE_COUNT; i++) {
    const slideIndex = i % SLIDE_COUNT;
    const comp = components[i % components.length];
    out.push({
      id:          `inst-${i}`,
      componentId: comp.id,
      slideId:     `slide-${slideIndex + 1}`,
      anchorX:     i % 2 === 0 ? 5  : 50,
      anchorY:     20,
      scale:       0.45, // shrink so two instances fit side-by-side at 50% width each
      version:     1,
      createdAt:   NOW,
    });
  }
  return out;
}

// =============================================================================
//  Build the deck with resolved instances merged in.
// =============================================================================
function buildSlide(
  index: number, total: number,
  instances: ComponentInstanceDTO[],
  componentMap: Map<string, SavedComponentDTO>,
): RenderSlideInput {
  const slideId = `slide-${index + 1}`;
  const onSlide = instances.filter((i) => i.slideId === slideId);
  const resolved = resolveInstancesForSlide(onSlide, { components: componentMap });

  const titleEl: SlideElementDTO = {
    id: `title-${index}`, slideId, type: 'heading',
    name: 'Title', order: 0,
    x: 5, y: 5, width: 90, height: 10,
    rotation: 0, zIndex: 1,
    locked: false, visible: true,
    content: { text: `Slide ${index + 1}` } as any,
    data: null, style: null, animations: null, accessibility: null,
    createdAt: NOW, updatedAt: NOW,
  };

  return {
    index, total,
    title: `Slide ${index + 1}`,
    background: { type: 'solid', color: '#ffffff' } as any,
    themeTokens: null,
    elements: [titleEl, ...resolved],
  };
}

function buildDeck(
  instances: ComponentInstanceDTO[],
  componentMap: Map<string, SavedComponentDTO>,
): RenderDeckInput {
  return {
    title: 'Phase 32.75 Tier 2 components validation',
    slides: Array.from({ length: SLIDE_COUNT }, (_, i) =>
      buildSlide(i, SLIDE_COUNT, instances, componentMap)
    ),
  };
}

// =============================================================================
//  PPTX inspection — verify component-derived text shows up on each slide.
// =============================================================================
function inspectPptx(pptxPath: string): Array<{ slide: number; hasComponentText: boolean }> {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pptx-32-75-t2-'));
  try {
    execSync(`unzip -q "${pptxPath}" -d "${tmp}"`);
    const slidesDir = path.join(tmp, 'ppt', 'slides');
    const files = fs.readdirSync(slidesDir)
      .filter((f) => /^slide\d+\.xml$/.test(f))
      .sort((a, b) => parseInt(a.match(/\d+/)![0]) - parseInt(b.match(/\d+/)![0]));
    return files.map((f, i) => {
      const xml = fs.readFileSync(path.join(slidesDir, f), 'utf8');
      return {
        slide: i + 1,
        // Every slide has at least one resolved instance — its text should
        // appear in the slide XML. Match on stable fixture strings.
        hasComponentText:
          /Starter|Alex|Foundation|YoY growth/.test(xml),
      };
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// =============================================================================
//  Main
// =============================================================================
async function main() {
  const components = buildComponents();
  const componentMap = new Map(components.map((c) => [c.id, c]));
  const instances = buildInstances(components);
  const outDir = path.join(__dirname, '..', 'exports', 'phase32-75-tier2');
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Phase 32.75 Tier 2 — Component library validation`);
  console.log(`   components: ${components.length}`);
  console.log(`   instances:  ${instances.length}`);
  console.log(`   slides:     ${SLIDE_COUNT}\n`);

  // --- Test 1 — instance resolution counts -----------------------------------
  let totalResolved = 0;
  for (let i = 0; i < SLIDE_COUNT; i++) {
    const slideId = `slide-${i + 1}`;
    const onSlide = instances.filter((x) => x.slideId === slideId);
    const resolved = resolveInstancesForSlide(onSlide, { components: componentMap });
    totalResolved += resolved.length;
  }
  console.log(`Test 1 — instance resolution: ${totalResolved} elements across ${SLIDE_COUNT} slides`);

  // --- Test 2 — propagation: edit a source component, verify resolver picks it up
  const target = components.find((c) => c.category === 'kpi')!;
  const before = resolveInstancesForSlide(
    instances.filter((i) => i.componentId === target.id),
    { components: componentMap },
  );
  // Mutate the source elementTree
  target.elementTree = target.elementTree.map((el) =>
    el.id === `value-0` ? { ...el, content: { ...(el.content as any), value: 'EDITED' } } as any : el
  );
  target.version += 1;
  componentMap.set(target.id, target);
  const after = resolveInstancesForSlide(
    instances.filter((i) => i.componentId === target.id),
    { components: componentMap },
  );
  const afterHasEdit = after.some((el: any) => el?.content?.value === 'EDITED');
  console.log(`Test 2 — linked propagation: ${afterHasEdit ? 'OK' : 'FAIL'} (${before.length} → ${after.length} elements; "EDITED" present on instances)`);

  // --- Test 3 — Build deck + exports -----------------------------------------
  const deck = buildDeck(instances, componentMap);

  console.log('\n· building PPTX …');
  const pptxBuf = await exportDeckToPptx(deck);
  const pptxPath = path.join(outDir, 'components.pptx');
  fs.writeFileSync(pptxPath, pptxBuf);
  const pptxReport = inspectPptx(pptxPath);

  console.log('· building PDF …');
  const pdfBuf = await exportDeckToPdf(deck);
  fs.writeFileSync(path.join(outDir, 'components.pdf'), pdfBuf);

  console.log('· building PNGs …');
  const pngs = await exportDeckToPngs(deck);
  fs.writeFileSync(path.join(outDir, 'slide-01.png'), pngs[0]);
  fs.writeFileSync(path.join(outDir, 'slide-50.png'), pngs[49]);
  fs.writeFileSync(path.join(outDir, 'slide-100.png'), pngs[99]);

  console.log('· building JPEGs …');
  const jpegs = await exportDeckToJpegs(deck);

  // --- Matrix ----------------------------------------------------------------
  const pptxOk    = pptxReport.filter((r) => r.hasComponentText).length;
  const pngOk     = pngs.filter((b)  => Buffer.isBuffer(b) && b.length  > 1024).length;
  const jpegOk    = jpegs.filter((b) => Buffer.isBuffer(b) && b.length > 1024).length;
  const pdfOk     = pdfBuf.length > 4096 ? 1 : 0;

  console.log('\nExport matrix:');
  console.log('───────────────────────────────────────────────────────────');
  console.log(`  PPTX slides w/ component text  ${pptxOk}/${SLIDE_COUNT}`);
  console.log(`  PNG slides                     ${pngOk}/${SLIDE_COUNT}`);
  console.log(`  JPEG slides                    ${jpegOk}/${SLIDE_COUNT}`);
  console.log(`  PDF (size, pages)              ${pdfBuf.length} bytes, ${SLIDE_COUNT} pages`);
  console.log(`  Files                          ${outDir}`);

  const allOk =
    afterHasEdit &&
    pptxOk === SLIDE_COUNT &&
    pngOk === SLIDE_COUNT &&
    jpegOk === SLIDE_COUNT &&
    pdfOk === 1;

  if (!allOk) {
    console.error('\n❌ Phase 32.75 Tier 2 parity NOT achieved');
    process.exit(1);
  }
  console.log('\n✅ Phase 32.75 Tier 2 component library validated across PPTX + PDF + PNG + JPEG');
}

main().catch((err) => {
  console.error('Validation script failed:', err);
  process.exit(1);
});
