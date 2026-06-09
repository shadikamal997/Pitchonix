import { ContentLedgerService } from './content-ledger.service';
import { ContentCertificationService } from './content-certification.service';
import { ReopenResultUpdate } from './content-ledger.types';

/**
 * Phase Ω.CONTENT.3 — Phases 1, 2, 4, 7, 9, 10.
 *
 * Drives the real ContentLedgerService + ContentCertificationService against an
 * in-memory ContentNode store and proves the platform certification: per-module
 * grading, loss-reason analytics, risk ranking, certified/uncertified split and
 * the regression-gate signals (retention floor, uncategorized loss reasons).
 */
function createMemoryPrisma() {
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

describe('ContentCertificationService — Phase Ω.CONTENT.3', () => {
  let ledger: ContentLedgerService;
  let cert: ContentCertificationService;

  beforeEach(() => {
    const mem = createMemoryPrisma();
    ledger = new ContentLedgerService(mem.prisma);
    cert = new ContentCertificationService(mem.prisma, ledger);
  });

  /** Seed one module's full lifecycle with controllable losses. */
  async function seed(
    module: string,
    docId: string,
    opts: {
      count: number;
      reopenLost?: number;
      lossReason?: string;
      mutatedUnexpected?: number;
      renderer?: string;
    },
  ) {
    const created = await ledger.recordImport(
      Array.from({ length: opts.count }, (_, i) => ({
        module,
        sourceDocumentId: docId,
        type: 'node',
        content: `${module}-${docId}-content-${i}`,
      })),
    );
    const ids = created.map((c) => c.id);
    await ledger.recordRender(docId, { renderer: opts.renderer || module });
    await ledger.recordExport(docId);
    const updates: ReopenResultUpdate[] = [];
    let i = 0;
    for (; i < (opts.reopenLost || 0); i++)
      updates.push({ id: ids[i], reopened: false, lossReason: opts.lossReason || 'node_lost' });
    for (let m = 0; m < (opts.mutatedUnexpected || 0); m++, i++)
      updates.push({
        id: ids[i],
        reopened: true,
        mutated: true,
        lossReason: 'unexpected_mutation',
      });
    for (; i < ids.length; i++) updates.push({ id: ids[i], reopened: true });
    await ledger.applyReopenResults(updates);
    return ids;
  }

  it('Phase 1/2/7/10 — grades every module and the platform from ledger data', async () => {
    await seed('presentation', 'deck1', { count: 100 }); // 100% → A+
    await seed('career', 'cv1', { count: 100, reopenLost: 1, lossReason: 'skill_missing' }); // 99% → A
    await seed('excel', 'wb1', { count: 100, reopenLost: 5, lossReason: 'formula_lost' }); // 95% → C
    await seed('pdf', 'doc1', { count: 100, mutatedUnexpected: 1 }); // silent mutation → capped B

    const c = await cert.certifyPlatform();
    const by = Object.fromEntries(c.moduleScores.map((m) => [m.module, m]));

    expect(by.presentation.grade).toBe('A+');
    expect(by.presentation.certified).toBe(true);
    expect(by.presentation.effectiveRetention).toBe(100);

    expect(by.career.grade).toBe('A');
    expect(by.career.certified).toBe(true);
    expect(by.career.effectiveRetention).toBe(99);

    expect(by.excel.grade).toBe('C');
    expect(by.excel.certified).toBe(false); // below 97% floor

    // unexpected mutation caps grade at B and blocks certification
    expect(by.pdf.unexpectedMutations).toBe(1);
    expect(by.pdf.grade).toBe('B');
    expect(by.pdf.certified).toBe(false);

    // Phase 2 — every module reports the full lifecycle counts
    expect(by.presentation.imported).toBe(100);
    expect(by.presentation.exported).toBe(100);
    expect(by.presentation.reopened).toBe(100);
    expect(by.career.documents).toBe(1);
  });

  it('Phase 4 — aggregates loss reasons and ranks module/pipeline risk', async () => {
    await seed('career', 'cv1', {
      count: 100,
      reopenLost: 8,
      lossReason: 'skill_missing',
      renderer: 'cv-html',
    });
    await seed('excel', 'wb1', {
      count: 100,
      reopenLost: 2,
      lossReason: 'formula_lost',
      renderer: 'xlsx',
    });

    const c = await cert.certifyPlatform();
    const reasons = Object.fromEntries(c.topLossReasons.map((r) => [r.reason, r.count]));
    expect(reasons['skill_missing']).toBe(8);
    expect(reasons['formula_lost']).toBe(2);
    expect(c.topLossReasons.every((r) => r.known)).toBe(true);

    // highest-risk module is career (8% loss vs excel 2%)
    expect(c.highestRiskModules[0].module).toBe('career');
    expect(c.highestRiskModules[0].riskRate).toBe(8);
    // pipelines ranked the same way
    expect(c.highestRiskPipelines[0].pipeline).toBe('cv-html');
  });

  it('Phase 3 contract — certified vs uncertified module split', async () => {
    await seed('presentation', 'deck1', { count: 50 }); // certified
    await seed('convert', 'cv1', { count: 50, reopenLost: 10, lossReason: 'heading_lost' }); // 80% → F, uncertified

    const c = await cert.certifyPlatform();
    expect(c.certifiedModules).toContain('presentation');
    expect(c.certifiedModules).not.toContain('convert');
    // expected modules with no data are reported uncertified
    for (const m of ['feasibility', 'excel', 'career', 'pptx_import', 'pdf', 'convert']) {
      expect(c.uncertifiedModules).toContain(m);
    }
  });

  it('Phase 9 — surfaces uncategorized loss reasons (regression signal)', async () => {
    await seed('presentation', 'deck1', {
      count: 100,
      reopenLost: 1,
      lossReason: 'mystery_new_failure',
    });
    const c = await cert.certifyPlatform();
    expect(c.uncategorizedLossReasons).toContain('mystery_new_failure');
    const known = c.topLossReasons.find((r) => r.reason === 'mystery_new_failure');
    expect(known?.known).toBe(false);
  });

  it('Phase 8 — renders a Markdown certification report', async () => {
    await seed('presentation', 'deck1', { count: 100 });
    const c = await cert.certifyPlatform();
    const md = cert.renderMarkdown(c);
    expect(md).toContain('# Pitchonix — Content Safety Certification');
    expect(md).toContain('Content Safety Grade');
    expect(md).toContain('Presentations');
    expect(md).toContain('| Module | Grade |');
  });

  it('empty platform certifies cleanly with N/A overall grade', async () => {
    const c = await cert.certifyPlatform();
    expect(c.overallGrade).toBe('N/A');
    expect(c.moduleScores).toHaveLength(0);
    expect(c.uncertifiedModules.sort()).toEqual(
      ['career', 'convert', 'excel', 'feasibility', 'pdf', 'pptx_import', 'presentation'].sort(),
    );
  });
});
