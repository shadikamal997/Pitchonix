import { ContentLedgerService } from './content-ledger.service';
import { PptxImportLedgerService } from './pptx-import-ledger.service';

/**
 * Phase Ω.CONTENT.2F — Phases 7 & 8.
 *
 * Phase 7 (Preservation): an imported 10-slide deck — titles, subtitles,
 * bullets, tables, images, charts, speaker notes — survives the full lifecycle
 * (Imported → Rendered → Exported → Reopened) with no silent loss.
 *
 * Phase 8 (Loss detection): deliberately drop one title, one table row, one
 * bullet, one chart label and one speaker note from the re-parsed export and
 * prove the ledger detects EXACTLY those — and nothing else.
 *
 * The ContentLedgerService runs against an in-memory ContentNode store so the
 * test proves the real reopen/loss logic without a database.
 */

// ── In-memory Prisma `contentNode` store ──────────────────────────────────────
function createMemoryPrisma() {
  const rows: any[] = [];
  const matches = (row: any, where: any = {}) => {
    for (const [k, v] of Object.entries(where)) {
      if (k === 'id' && v && typeof v === 'object' && 'in' in (v as any)) {
        if (!(v as any).in.includes(row.id)) return false;
      } else if (row[k] !== v) {
        return false;
      }
    }
    return true;
  };
  const prisma: any = {
    $transaction: async (ops: Promise<any>[]) => Promise.all(ops),
    contentNode: {
      createMany: jest.fn(async ({ data }: any) => {
        for (const d of data)
          rows.push({
            rendered: false,
            exported: false,
            reopened: false,
            mutated: false,
            rejected: false,
            lossReason: null,
            renderedAt: null,
            exportedAt: null,
            reopenedAt: null,
            destination: null,
            ...d,
          });
        return { count: data.length };
      }),
      findMany: jest.fn(async ({ where }: any = {}) =>
        rows.filter((r) => matches(r, where)).map((r) => ({ ...r })),
      ),
      updateMany: jest.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const r of rows)
          if (matches(r, where)) {
            Object.assign(r, data);
            count++;
          }
        return { count };
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const r = rows.find((x) => x.id === where.id);
        if (r) Object.assign(r, data);
        return { ...r };
      }),
      deleteMany: jest.fn(async ({ where }: any) => {
        let count = 0;
        for (let i = rows.length - 1; i >= 0; i--)
          if (matches(rows[i], where)) {
            rows.splice(i, 1);
            count++;
          }
        return { count };
      }),
    },
  };
  return { prisma, rows };
}

// ── A representative 10-slide imported deck (parser output shape) ──────────────
function buildDeck() {
  const slides: any[] = [];
  for (let i = 0; i < 10; i++) {
    const n = i + 1;
    const s: any = {
      order: i,
      title: `Slide${n} Strategic Heading Token${n}`,
      subtitle: `Subtitle${n} supporting line token${n}`,
      speakerNotes: `SpeakerNote${n} reminder talk about token${n} milestone clearly`,
      layoutSrc: `ppt/slideLayouts/slideLayout${n}.xml`,
      elements: [],
    };
    slides.push(s);
  }

  // slide 1 — shape / text box
  slides[0].elements.push({
    type: 'shape',
    content: { text: 'TextboxAlpha standalone callout message token1' },
  });

  // slide 3 — bullets (multi-line paragraph)
  slides[2].elements.push({
    type: 'paragraph',
    content: {
      text: [
        'BulletA quarterly revenue exceeded projections token3',
        'BulletB hiring plan accelerated across regions token3',
        'BulletC product launch slipped one cycle token3',
      ].join('\n'),
    },
  });

  // slide 4 — image
  slides[3].elements.push({
    type: 'image',
    content: { alt: 'ImageDiagram architecture overview token4', src: 'media/diagram4.png' },
  });

  // slide 5 — table. Row 0 is the header (≥8 words so the table's own needle is
  // header-only and survives even when a body row is dropped); row 1 is the loss
  // target whose text appears nowhere else in the deck.
  slides[4].elements.push({
    type: 'table',
    content: {
      rows: [
        [
          { text: 'RegionName Header Column' },
          { text: 'FirstQuarter Results Column' },
          { text: 'SecondQuarter Results Column' },
        ],
        [
          { text: 'EastRowOne 4821 token5' },
          { text: 'Metric5932 token5' },
          { text: 'Metric6043 token5' },
        ],
        [
          { text: 'WestRowTwo 7711 token5' },
          { text: 'Metric8120 token5' },
          { text: 'Metric8233 token5' },
        ],
      ],
    },
  });

  // slide 7 — chart
  slides[6].elements.push({
    type: 'chart',
    content: {
      title: 'ChartTitle market share token7',
      type: 'bar',
      categories: ['CategoryAsia token7', 'CategoryEurope token7', 'CategoryPolynesia token7'],
      series: [{ name: 'SeriesRevenue token7' }, { name: 'SeriesProfit token7' }],
    },
  });

  // slide 8 — extra text box
  slides[7].elements.push({
    type: 'shape',
    content: { text: 'TextboxBeta closing remarks token8' },
  });

  return slides;
}

const ALL_TYPES = [
  'importedSlide',
  'importedSlideTitle',
  'importedSlideSubtitle',
  'importedTextBox',
  'importedBullet',
  'importedTable',
  'importedTableRow',
  'importedTableCell',
  'importedChart',
  'importedChartSeries',
  'importedChartLabel',
  'importedImage',
  'importedSpeakerNote',
  'importedLayout',
];

const haystackOf = (nodes: any[], excludeIds: Set<string> = new Set()) =>
  nodes
    .filter((n) => !excludeIds.has(n.id))
    .map((n) => n.content)
    .join(' \n ');

describe('PptxImportLedgerService — Phase Ω.CONTENT.2F', () => {
  const DECK_ID = 'deck-pptx-import-test';
  let ledger: ContentLedgerService;
  let service: PptxImportLedgerService;
  let rows: any[];

  beforeEach(async () => {
    const mem = createMemoryPrisma();
    rows = mem.rows;
    ledger = new ContentLedgerService(mem.prisma);
    service = new PptxImportLedgerService(ledger);
    await service.recordImport(DECK_ID, buildDeck());
  });

  const nodes = () => ledger.getNodes(`pi-${DECK_ID}`);

  // ── PHASE 1 + 2 — every node type captured at import ────────────────────────
  it('Phase 1/2 — records all imported node types', async () => {
    const ns = await nodes();
    const seen = new Set(ns.map((n) => n.type));
    for (const t of ALL_TYPES) expect(seen.has(t)).toBe(true);
    expect(ns.every((n) => n.module === 'pptx_import')).toBe(true);
    expect(ns.every((n) => n.sourceDocumentId === `pi-${DECK_ID}`)).toBe(true);
    expect(ns.every((n) => !!n.contentHash)).toBe(true);
  });

  // ── PHASE 3 + 4 — parsed content is rendered + saved 1:1 ─────────────────────
  it('Phase 3/4 — every imported node is rendered (saved) with a destination', async () => {
    const ns = await nodes();
    expect(ns.length).toBeGreaterThan(0);
    expect(ns.every((n) => n.rendered)).toBe(true);
    expect(ns.every((n) => !!n.destination)).toBe(true);
    // speaker notes route to their own destination
    const note = ns.find((n) => n.type === 'importedSpeakerNote');
    expect(note?.destination).toBe('speaker_notes');
  });

  // ── PHASE 5 + 6 + 7 — full preservation through export → reopen (PPTX) ───────
  it('Phase 7 — PPTX export/reopen preserves 100% with zero loss', async () => {
    const hay = haystackOf(await nodes());
    jest.spyOn(service, 'extractText').mockResolvedValue(hay);

    const result = await service.recordExportReopen(DECK_ID, Buffer.from('pptx-bytes'), 'pptx');
    expect(result).not.toBeNull();
    expect(result!.lost).toBe(0);

    const report = await ledger.calculatePreservation(`pi-${DECK_ID}`);
    expect(report.imported).toBeGreaterThan(0);
    expect(report.rendered).toBe(report.imported);
    expect(report.exported).toBe(report.imported);
    expect(report.reopened).toBe(report.imported); // Imported = Rendered = Exported = Reopened
    expect(report.retention).toBe(100);
    expect(report.reopenRetention).toBe(100);
    expect(report.brokenNodes).toHaveLength(0);
    // every node type round-trips fully
    for (const t of ALL_TYPES) {
      const row = report.byType[t];
      expect(row.imported).toBe(row.reopened);
    }
  });

  // ── PHASE 7 — full preservation through PDF export (text + structural) ───────
  it('Phase 7 — PDF export/reopen preserves 100%', async () => {
    const hay = haystackOf(await nodes());
    jest.spyOn(service, 'extractText').mockResolvedValue(hay);

    const result = await service.recordExportReopen(DECK_ID, Buffer.from('%PDF-bytes'), 'pdf');
    expect(result!.lost).toBe(0);

    const report = await ledger.calculatePreservation(`pi-${DECK_ID}`);
    expect(report.reopened).toBe(report.imported);
    expect(report.brokenNodes).toHaveLength(0);
  });

  // ── PHASE 8 — deliberate loss is detected EXACTLY ────────────────────────────
  it('Phase 8 — detects a dropped title, table row, bullet, chart label and speaker note', async () => {
    const ns = await nodes();
    const find = (pred: (n: any) => boolean) => {
      const n = ns.find(pred);
      if (!n) throw new Error('test fixture node not found');
      return n;
    };

    // 1 title — the title text also backs the slide's own importedSlide node, so
    // dropping the title removes both that title and the slide identity text.
    const lostTitle = find((n) => n.type === 'importedSlideTitle' && n.metadata?.slide === 2);
    const lostSlide = find((n) => n.type === 'importedSlide' && n.metadata?.slide === 2);
    // 1 bullet
    const lostBullet = find((n) => n.type === 'importedBullet' && /BulletB/.test(n.content));
    // 1 table row (+ its cells) — keep header row 0 so importedTable still survives
    const lostRow = find(
      (n) => n.type === 'importedTableRow' && n.metadata?.slide === 5 && n.metadata?.row === 1,
    );
    const lostCells = ns.filter(
      (n) => n.type === 'importedTableCell' && n.metadata?.slide === 5 && n.metadata?.row === 1,
    );
    // 1 chart label
    const lostLabel = find((n) => n.type === 'importedChartLabel' && /Polynesia/.test(n.content));
    // 1 speaker note
    const lostNote = find((n) => n.type === 'importedSpeakerNote' && n.metadata?.slide === 9);

    // Nodes that MUST be flagged lost.
    const expectedLost = new Set<string>([
      lostTitle.id,
      lostSlide.id,
      lostBullet.id,
      lostRow.id,
      ...lostCells.map((c) => c.id),
      lostLabel.id,
      lostNote.id,
    ]);
    // Text to omit from the simulated re-parse. Also omit the whole-table flat
    // node so the dropped row's text doesn't leak back in through it — the table
    // still survives because its header-derived needle remains via row 0.
    const lostTable = find((n) => n.type === 'importedTable' && n.metadata?.slide === 5);
    const haystackExclude = new Set<string>([...expectedLost, lostTable.id]);
    const hay = haystackOf(ns, haystackExclude);
    jest.spyOn(service, 'extractText').mockResolvedValue(hay);

    await service.recordExportReopen(DECK_ID, Buffer.from('pptx-bytes'), 'pptx');

    const after = await nodes();
    const byId = new Map(after.map((n) => [n.id, n]));

    // the dropped nodes are flagged not-reopened, with their exact loss reasons
    expect(byId.get(lostTitle.id)!.reopened).toBe(false);
    expect(byId.get(lostTitle.id)!.lossReason).toBe('title_lost');
    expect(byId.get(lostSlide.id)!.lossReason).toBe('slide_lost');
    expect(byId.get(lostBullet.id)!.lossReason).toBe('bullet_lost');
    expect(byId.get(lostRow.id)!.lossReason).toBe('table_row_lost');
    expect(byId.get(lostLabel.id)!.lossReason).toBe('chart_label_lost');
    expect(byId.get(lostNote.id)!.lossReason).toBe('speaker_note_lost');
    for (const c of lostCells) expect(byId.get(c.id)!.reopened).toBe(false);

    // nothing else was falsely reported lost
    const lostCount = after.filter((n) => !n.reopened).length;
    expect(lostCount).toBe(expectedLost.size);

    // a sibling bullet, the table itself and other slides' titles survived
    expect(
      after.find((n) => n.type === 'importedBullet' && /BulletA/.test(n.content))!.reopened,
    ).toBe(true);
    expect(after.find((n) => n.type === 'importedTable' && n.metadata?.slide === 5)!.reopened).toBe(
      true,
    );
    expect(
      after.find((n) => n.type === 'importedSlideTitle' && n.metadata?.slide === 1)!.reopened,
    ).toBe(true);

    // ── PHASE 9/10 — report/loss surfaces the exact failure points ─────────────
    const report = await ledger.calculatePreservation(`pi-${DECK_ID}`);
    expect(report.exported).toBe(report.imported); // export still complete
    expect(report.reopened).toBe(report.imported - expectedLost.size);
    expect(report.reopenRetention).toBeLessThan(100);

    const reopenLosses = report.brokenNodes.filter((b) => b.failurePoint === 'reopen');
    const reasons = new Set(reopenLosses.map((b) => b.reason));
    for (const r of [
      'title_lost',
      'slide_lost',
      'bullet_lost',
      'table_row_lost',
      'table_cell_lost',
      'chart_label_lost',
      'speaker_note_lost',
    ]) {
      expect(reasons.has(r)).toBe(true);
    }
    expect(reopenLosses).toHaveLength(expectedLost.size);
  });

  // ── Guard — a non-imported deck is a no-op (no false ledger entries) ─────────
  it('recordExportReopen returns null for a deck that was never PPTX-imported', async () => {
    const res = await service.recordExportReopen('some-native-deck', Buffer.from('x'), 'pptx');
    expect(res).toBeNull();
  });

  // ── Ω.CONTENT.3B — synthetic placeholder titles must NOT reduce the score ────
  it('placeholder "Slide N" titles for untitled slides are structural, never counted as loss', async () => {
    const mem = createMemoryPrisma(); // fresh store
    const l = new ContentLedgerService(mem.prisma);
    const s = new PptxImportLedgerService(l);
    const deck = [
      { order: 0, title: 'Real Authored Title Alpha token', elements: [] },
      { order: 1, title: 'Slide 2', elements: [] }, // untitled → synthetic placeholder
      { order: 2, title: null, elements: [] }, // untitled → importedSlide placeholder
    ];
    await s.recordImport('ph-deck', deck);
    const ns = await l.getNodes('pi-ph-deck');
    // placeholder nodes are flagged
    const ph = ns.filter((n) => n.metadata?.placeholder);
    expect(ph.length).toBeGreaterThan(0);
    expect(ph.some((n) => n.content === 'Slide 2')).toBe(true);

    // Export text contains the real title and unrelated "Cost slide 2" body, but
    // NOT a standalone "Slide 2" title.
    jest.spyOn(s, 'extractText').mockResolvedValue('Real Authored Title Alpha token\nCost slide 2');
    await s.recordExportReopen('ph-deck', Buffer.from('pptx'), 'pptx');

    const after = await l.getNodes('pi-ph-deck');
    // every placeholder reopened (structural) — zero placeholder losses
    expect(after.filter((n) => n.metadata?.placeholder).every((n) => n.reopened)).toBe(true);
    // the real authored title reopened via substring; no false loss anywhere
    expect(after.find((n) => n.content === 'Real Authored Title Alpha token')!.reopened).toBe(true);
    const report = await l.calculatePreservation('pi-ph-deck');
    expect(report.brokenNodes).toHaveLength(0);
    expect(report.reopened).toBe(report.imported);
  });
});
