// =============================================================================
//  Phase 38.2G — Golden PPTX fixture suite.
//
//  Programmatically generates seven representative decks so the round-trip
//  harness has a reliable corpus without committing binary files. Each
//  fixture exercises a different mix of features:
//
//    investor   — title + bullets + chart + numeric KPIs
//    sales      — comparison table + image placeholder + CTA
//    corporate  — header/footer master + 4 content sections + closing
//    training   — step-by-step process (text + numbered list, no charts)
//    financial  — multiple charts + table + footnotes
//    healthcare — clinical layout (callouts, sidebar, references)
//    enterprise — kitchen sink: all of the above on a single deck
//
//  Returns a `{ name, buffer }` per fixture. The harness round-trips each
//  through parse → export → re-parse → diff and reports the fidelity score.
// =============================================================================

export type FixtureKind =
  | 'investor' | 'sales' | 'corporate' | 'training'
  | 'financial' | 'healthcare' | 'enterprise'
  // Phase 38.3J additions
  | 'consulting' | 'government' | 'productLaunch';

export interface GoldenFixture {
  name:   FixtureKind;
  slides: number;
  buffer: Buffer;
}

const PptxGenJS = require('pptxgenjs');

export async function buildGoldenFixtures(): Promise<GoldenFixture[]> {
  return Promise.all(([
    ['investor',     buildInvestor],
    ['sales',        buildSales],
    ['corporate',    buildCorporate],
    ['training',     buildTraining],
    ['financial',    buildFinancial],
    ['healthcare',   buildHealthcare],
    ['enterprise',   buildEnterprise],
    // Phase 38.3J additions
    ['consulting',   buildConsulting],
    ['government',   buildGovernment],
    ['productLaunch', buildProductLaunch],
  ] as const).map(async ([name, fn]) => {
    const { slides, buffer } = await fn();
    return { name, slides, buffer };
  }));
}

// -----------------------------------------------------------------------------

async function buildInvestor() {
  const p = new PptxGenJS(); p.layout = 'LAYOUT_WIDE'; p.title = 'Investor';
  let s = p.addSlide();
  s.addText('Pitchonix — Series A',  { x: 0.5, y: 0.4, w: 12, h: 1.0, fontSize: 32, bold: true });
  s.addText('Investor deck · 2026',  { x: 0.5, y: 1.6, w: 12, h: 0.7, fontSize: 18 });
  s = p.addSlide();
  s.addText('Problem',               { x: 0.5, y: 0.4, w: 12, h: 1.0, fontSize: 28, bold: true });
  s.addText('Teams waste 8h/week stitching slides.', { x: 0.5, y: 1.8, w: 12, h: 0.8, fontSize: 18 });
  s = p.addSlide();
  s.addText('Traction', { x: 0.5, y: 0.4, w: 12, h: 1.0, fontSize: 28, bold: true });
  s.addChart('bar', [
    { name: 'MRR', labels: ['Q1', 'Q2', 'Q3', 'Q4'], values: [12, 28, 42, 68] },
  ] as any, { x: 0.5, y: 1.8, w: 11, h: 5 });
  s = p.addSlide();
  s.addText('Thank you', { x: 0.5, y: 0.4, w: 12, h: 1.0, fontSize: 28, bold: true });
  const buf = (await p.write({ outputType: 'nodebuffer' })) as Buffer;
  return { slides: 4, buffer: buf };
}

async function buildSales() {
  const p = new PptxGenJS(); p.layout = 'LAYOUT_WIDE'; p.title = 'Sales';
  let s = p.addSlide();
  s.addText('Acme — Solution overview', { x: 0.5, y: 0.4, w: 12, h: 1, fontSize: 32, bold: true });
  s = p.addSlide();
  s.addText('Plan comparison', { x: 0.5, y: 0.4, w: 12, h: 1, fontSize: 28, bold: true });
  s.addTable(
    [
      [{ text: 'Plan' }, { text: 'Seats' }, { text: 'Price' }],
      [{ text: 'Starter' }, { text: '1–5' }, { text: '$29' }],
      [{ text: 'Team' },    { text: '6–25' }, { text: '$99' }],
      [{ text: 'Scale' },   { text: '25+' }, { text: '$299' }],
    ],
    { x: 0.5, y: 1.8, w: 12 },
  );
  const buf = (await p.write({ outputType: 'nodebuffer' })) as Buffer;
  return { slides: 2, buffer: buf };
}

async function buildCorporate() {
  const p = new PptxGenJS(); p.layout = 'LAYOUT_WIDE'; p.title = 'Corporate';
  for (const t of ['Corporate', 'Mission', 'Values', 'Products', 'Roadmap', 'Thank you']) {
    const s = p.addSlide();
    s.addText(t, { x: 0.5, y: 0.4, w: 12, h: 1, fontSize: 28, bold: true });
    s.addText('Confidential', { x: 0.5, y: 6.9, w: 12, h: 0.4, fontSize: 10, color: '666666' });
  }
  const buf = (await p.write({ outputType: 'nodebuffer' })) as Buffer;
  return { slides: 6, buffer: buf };
}

async function buildTraining() {
  const p = new PptxGenJS(); p.layout = 'LAYOUT_WIDE'; p.title = 'Training';
  for (let i = 0; i < 5; i++) {
    const s = p.addSlide();
    s.addText(`Step ${i + 1}`, { x: 0.5, y: 0.4, w: 12, h: 1, fontSize: 28, bold: true });
    s.addText(`Detailed instructions for step ${i + 1}.`, { x: 0.5, y: 1.6, w: 12, h: 5, fontSize: 18 });
    s.addNotes(`Talking points for step ${i + 1}.`);
  }
  const buf = (await p.write({ outputType: 'nodebuffer' })) as Buffer;
  return { slides: 5, buffer: buf };
}

async function buildFinancial() {
  const p = new PptxGenJS(); p.layout = 'LAYOUT_WIDE'; p.title = 'Financial';
  let s = p.addSlide();
  s.addText('Q4 Results',  { x: 0.5, y: 0.4, w: 12, h: 1, fontSize: 28, bold: true });
  s.addChart('line', [{ name: 'Revenue', labels: ['Q1', 'Q2', 'Q3', 'Q4'], values: [120, 145, 168, 192] }] as any, { x: 0.5, y: 1.8, w: 11, h: 5 });
  s = p.addSlide();
  s.addText('Segment mix', { x: 0.5, y: 0.4, w: 12, h: 1, fontSize: 28, bold: true });
  s.addChart('pie', [{ name: 'Mix', labels: ['Enterprise', 'Mid-market', 'SMB'], values: [55, 30, 15] }] as any, { x: 0.5, y: 1.8, w: 11, h: 5 });
  const buf = (await p.write({ outputType: 'nodebuffer' })) as Buffer;
  return { slides: 2, buffer: buf };
}

async function buildHealthcare() {
  const p = new PptxGenJS(); p.layout = 'LAYOUT_WIDE'; p.title = 'Healthcare';
  let s = p.addSlide();
  s.addText('Clinical study summary', { x: 0.5, y: 0.4, w: 12, h: 1, fontSize: 28, bold: true });
  s.addText('Endpoint reached at week 12.', { x: 0.5, y: 1.8, w: 7, h: 5, fontSize: 16 });
  s.addText('References', { x: 8.5, y: 1.8, w: 4, h: 1, fontSize: 12, bold: true });
  s.addText('[1] NEJM 2025\n[2] Lancet 2024', { x: 8.5, y: 2.8, w: 4, h: 4, fontSize: 11 });
  const buf = (await p.write({ outputType: 'nodebuffer' })) as Buffer;
  return { slides: 1, buffer: buf };
}

async function buildConsulting() {
  const p = new PptxGenJS(); p.layout = 'LAYOUT_WIDE'; p.title = 'Consulting';
  let s = p.addSlide();
  s.addText('Engagement summary', { x: 0.5, y: 0.4, w: 12, h: 1, fontSize: 32, bold: true });
  s = p.addSlide();
  s.addText('Findings', { x: 0.5, y: 0.4, w: 12, h: 1, fontSize: 28, bold: true });
  s.addText('· 3 root causes identified\n· 7 quick wins\n· 2 long-term initiatives', { x: 0.5, y: 1.8, w: 12, h: 5, fontSize: 18 });
  s = p.addSlide();
  s.addText('Recommendations', { x: 0.5, y: 0.4, w: 12, h: 1, fontSize: 28, bold: true });
  s.addChart('bar', [{ name: 'Impact', labels: ['QW1', 'QW2', 'QW3', 'LT1'], values: [80, 65, 50, 90] }] as any, { x: 0.5, y: 1.8, w: 11, h: 5 });
  const buf = (await p.write({ outputType: 'nodebuffer' })) as Buffer;
  return { slides: 3, buffer: buf };
}

async function buildGovernment() {
  const p = new PptxGenJS(); p.layout = 'LAYOUT_WIDE'; p.title = 'Government';
  for (const t of ['Department of X', 'Mandate', 'Priorities', 'Budget', 'Outcomes']) {
    const s = p.addSlide();
    s.addText(t, { x: 0.5, y: 0.4, w: 12, h: 1, fontSize: 28, bold: true });
    s.addText('FOR OFFICIAL USE ONLY', { x: 0.5, y: 6.8, w: 12, h: 0.4, fontSize: 9, color: '888888', italic: true });
  }
  const buf = (await p.write({ outputType: 'nodebuffer' })) as Buffer;
  return { slides: 5, buffer: buf };
}

async function buildProductLaunch() {
  const p = new PptxGenJS(); p.layout = 'LAYOUT_WIDE'; p.title = 'Product Launch';
  let s = p.addSlide();
  s.addText('Introducing Atlas', { x: 0.5, y: 0.4, w: 12, h: 1, fontSize: 36, bold: true });
  s.addText('The most loved release ever', { x: 0.5, y: 1.8, w: 12, h: 0.8, fontSize: 18 });
  s = p.addSlide();
  s.addText('What ships', { x: 0.5, y: 0.4, w: 12, h: 1, fontSize: 28, bold: true });
  s.addText('· Faster sync\n· Brand kits 2.0\n· Enterprise PPTX import', { x: 0.5, y: 1.8, w: 12, h: 5, fontSize: 18 });
  s = p.addSlide();
  s.addText('Pricing', { x: 0.5, y: 0.4, w: 12, h: 1, fontSize: 28, bold: true });
  s.addTable(
    [
      [{ text: 'Plan' }, { text: 'Price' }, { text: 'Seat' }],
      [{ text: 'Free' }, { text: '$0' }, { text: '1' }],
      [{ text: 'Pro' },  { text: '$19' }, { text: 'unlimited' }],
    ],
    { x: 0.5, y: 1.8, w: 12 },
  );
  const buf = (await p.write({ outputType: 'nodebuffer' })) as Buffer;
  return { slides: 3, buffer: buf };
}

async function buildEnterprise() {
  const p = new PptxGenJS(); p.layout = 'LAYOUT_WIDE'; p.title = 'Enterprise';
  let s = p.addSlide();
  s.addText('Enterprise overview', { x: 0.5, y: 0.4, w: 12, h: 1, fontSize: 32, bold: true });
  s = p.addSlide();
  s.addText('Adoption funnel', { x: 0.5, y: 0.4, w: 12, h: 1, fontSize: 28, bold: true });
  s.addChart('bar', [{ name: 'Funnel', labels: ['Trial', 'POC', 'Pilot', 'Prod'], values: [400, 150, 60, 22] }] as any, { x: 0.5, y: 1.8, w: 11, h: 5 });
  s = p.addSlide();
  s.addText('SLAs', { x: 0.5, y: 0.4, w: 12, h: 1, fontSize: 28, bold: true });
  s.addTable(
    [
      [{ text: 'Tier' }, { text: 'Uptime' }, { text: 'Support' }],
      [{ text: 'Bronze' }, { text: '99.5%' }, { text: 'Email' }],
      [{ text: 'Silver' }, { text: '99.9%' }, { text: '24×7 Chat' }],
      [{ text: 'Gold' }, { text: '99.99%' }, { text: '24×7 Phone' }],
    ],
    { x: 0.5, y: 1.8, w: 12 },
  );
  s.addNotes('Reinforce the gold tier as the recommended SLA.');
  const buf = (await p.write({ outputType: 'nodebuffer' })) as Buffer;
  return { slides: 3, buffer: buf };
}
