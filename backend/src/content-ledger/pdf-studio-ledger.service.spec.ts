import { ContentLedgerService } from './content-ledger.service';
import { PdfStudioLedgerService } from './pdf-studio-ledger.service';

/**
 * Phase Ω.CONTENT.3 — Phase 5 & 6 (PDF Studio).
 *
 * Proves the last-certified module's full lifecycle on a persisted PDF document:
 *   Document pages → Imported → Rendered → Exported → Reopened → Verified
 * with 100% preservation, and exact loss detection when a heading / bullet /
 * table / chart label disappears from the re-parsed export.
 */
function createMemoryPrisma(pages: any[]) {
  const rows: any[] = [];
  const matches = (row: any, where: any = {}) => {
    for (const [k, v] of Object.entries(where)) {
      if (k === 'id' && v && typeof v === 'object' && 'in' in (v as any)) {
        if (!(v as any).in.includes(row.id)) return false;
      } else if (row[k] !== v) return false;
    }
    return true;
  };
  const prisma: any = {
    $transaction: async (ops: Promise<any>[]) => Promise.all(ops),
    pdfPage: {
      findMany: jest.fn(async ({ where, orderBy }: any = {}) => {
        let out = pages.filter((p) => matches(p, where));
        if (orderBy?.order)
          out = [...out].sort((a, b) =>
            orderBy.order === 'desc' ? b.order - a.order : a.order - b.order,
          );
        return out.map((p) => ({ ...p }));
      }),
    },
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
            renderer: null,
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

const DOC = 'pdf-doc-1';

function buildPages() {
  return [
    {
      id: 'pg0',
      documentId: DOC,
      order: 0,
      pageType: 'cover',
      title: null,
      content: {
        text: JSON.stringify({
          title: 'CoverTitle annual report token0',
          subtitle: 'CoverSubtitle confidential token0',
        }),
      },
      blocks: null,
    },
    {
      id: 'pg1',
      documentId: DOC,
      order: 1,
      pageType: 'toc',
      title: 'Contents',
      content: { text: '- Executive Summary\n- Financials' },
      blocks: null,
    },
    {
      id: 'pg2',
      documentId: DOC,
      order: 2,
      pageType: 'executive_summary',
      title: 'ExecutiveSummary Heading token2',
      content: {
        text: [
          '## SubHeading market overview token2',
          'ParagraphOne revenue grew strongly this year token2',
          '- BulletA expansion into three new regions token2',
          '- BulletB margins improved across segments token2',
        ].join('\n'),
      },
      blocks: null,
    },
    {
      id: 'pg3',
      documentId: DOC,
      order: 3,
      pageType: 'financial_table',
      title: 'Financials Heading token3',
      content: {
        text: '| RegionCol token3 | RevenueCol token3 |\n| --- | --- |\n| NorthRegion token3 | Amount4821 token3 |',
      },
      blocks: [
        {
          type: 'chart',
          title: 'ChartTitle revenue by region token3',
          categories: ['LabelNorth token3', 'LabelSouth token3', 'LabelEast token3'],
          series: [{ name: 'SeriesRevenue token3' }],
        },
        { type: 'image', alt: 'ImageChartFigure token3', src: 'media/fig3.png' },
      ],
    },
    {
      id: 'pg4',
      documentId: DOC,
      order: 4,
      pageType: 'appendix',
      title: 'Appendix Heading token4',
      content: { text: 'AppendixParagraph supporting detail and notes token4' },
      blocks: null,
    },
  ];
}

const haystackOf = (nodes: any[], exclude: Set<string> = new Set()) =>
  nodes
    .filter((n) => !exclude.has(n.id))
    .map((n) => n.content)
    .join(' \n ');

describe('PdfStudioLedgerService — Phase Ω.CONTENT.3 (Phase 5)', () => {
  let ledger: ContentLedgerService;
  let service: PdfStudioLedgerService;

  beforeEach(async () => {
    const mem = createMemoryPrisma(buildPages());
    ledger = new ContentLedgerService(mem.prisma);
    service = new PdfStudioLedgerService(mem.prisma, ledger);
    await service.recordDocument(DOC);
  });

  const nodes = () => ledger.getNodes(DOC);

  it('records headings, paragraphs, bullets, tables, charts, images and appendix as imported+rendered', async () => {
    const ns = await nodes();
    const types = new Set(ns.map((n) => n.type));
    for (const t of ['heading', 'paragraph', 'bullet', 'table', 'chart', 'chart_label', 'image'])
      expect(types.has(t)).toBe(true);
    expect(ns.every((n) => n.module === 'pdf' && n.rendered)).toBe(true);
    // TOC pages are generated navigation — not certified content
    expect(
      ns.some(
        (n) => /Executive Summary|Financials/.test(n.content) && n.metadata?.pageType === 'toc',
      ),
    ).toBe(false);
    // appendix content lands in the appendix destination
    expect(ns.find((n) => /AppendixParagraph/.test(n.content))?.destination).toBe('appendix');
  });

  it('Phase 6 — PDF export/reopen preserves 100%', async () => {
    const hay = haystackOf(await nodes());
    jest.spyOn(service, 'extractText').mockResolvedValue(hay);

    const result = await service.recordExportReopen(DOC, Buffer.from('%PDF'), 'pdf');
    expect(result!.lost).toBe(0);

    const report = await ledger.calculatePreservation(DOC);
    expect(report.imported).toBeGreaterThan(0);
    expect(report.reopened).toBe(report.imported);
    expect(report.retention).toBe(100);
    expect(report.brokenNodes).toHaveLength(0);
  });

  it('Phase 6 — DOCX export/reopen preserves 100%', async () => {
    const hay = haystackOf(await nodes());
    jest.spyOn(service, 'extractText').mockResolvedValue(hay);
    const result = await service.recordExportReopen(DOC, Buffer.from('PK'), 'docx');
    expect(result!.lost).toBe(0);
  });

  it('Phase 5 — detects a dropped heading, bullet, table and chart label', async () => {
    const ns = await nodes();
    const pick = (pred: (n: any) => boolean) => {
      const n = ns.find(pred);
      if (!n) throw new Error('fixture node missing');
      return n;
    };

    const lostHeading = pick(
      (n) => n.type === 'heading' && /ExecutiveSummary Heading/.test(n.content),
    );
    const lostBullet = pick((n) => n.type === 'bullet' && /BulletA expansion/.test(n.content));
    const lostTable = pick((n) => n.type === 'table' && /NorthRegion/.test(n.content));
    const lostLabel = pick((n) => n.type === 'chart_label' && /LabelSouth/.test(n.content));
    const expected = new Set([lostHeading.id, lostBullet.id, lostTable.id, lostLabel.id]);

    jest.spyOn(service, 'extractText').mockResolvedValue(haystackOf(ns, expected));
    await service.recordExportReopen(DOC, Buffer.from('%PDF'), 'pdf');

    const after = await nodes();
    const byId = new Map(after.map((n) => [n.id, n]));
    expect(byId.get(lostHeading.id)!.lossReason).toBe('heading_lost');
    expect(byId.get(lostBullet.id)!.lossReason).toBe('bullet_lost');
    expect(byId.get(lostTable.id)!.lossReason).toBe('table_lost');
    expect(byId.get(lostLabel.id)!.lossReason).toBe('chart_label_lost');

    // nothing else falsely lost; images survive structurally
    expect(after.filter((n) => !n.reopened).length).toBe(expected.size);
    expect(after.find((n) => n.type === 'image')!.reopened).toBe(true);

    const broken = (await ledger.calculatePreservation(DOC)).brokenNodes.filter(
      (b) => b.failurePoint === 'reopen',
    );
    expect(broken).toHaveLength(expected.size);
  });

  it('image-only exports are marked exported but not text-reopened', async () => {
    const result = await service.recordExportReopen(DOC, Buffer.from('PNG'), 'png');
    expect(result).toBeNull(); // export-only
    const report = await ledger.calculatePreservation(DOC);
    expect(report.exported).toBe(report.imported); // still marked exported
  });

  it('returns null for a document that was never recorded', async () => {
    const result = await service.recordExportReopen('never-recorded', Buffer.from('x'), 'pdf');
    expect(result).toBeNull();
  });
});
