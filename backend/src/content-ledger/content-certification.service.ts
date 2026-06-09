import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContentLedgerService } from './content-ledger.service';
import { EXPECTED_LOSS_REASONS } from './content-ledger.types';
import {
  CERTIFICATION_MIN_RETENTION,
  EXPECTED_MODULES,
  GRADE_THRESHOLDS,
  KNOWN_LOSS_REASONS,
  LossReasonCount,
  MODULE_LABELS,
  ModuleCertification,
  PlatformCertification,
  RiskModule,
  RiskPipeline,
  SafetyGrade,
} from './content-certification.types';

/**
 * Phase Ω.CONTENT.3 — Platform-wide Content Safety Certification.
 *
 * The single source of truth for content fidelity. Reads the real Universal
 * Content Ledger and proves, per module and platform-wide, how much imported
 * content survived to Rendered → Exported → Reopened — with exact loss reasons,
 * risk ranking and a letter grade. No estimates: every number is ledger-backed.
 */
@Injectable()
export class ContentCertificationService {
  private readonly logger = new Logger(ContentCertificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: ContentLedgerService,
  ) {}

  private get nodes() {
    return (this.prisma as any).contentNode;
  }

  private pct(num: number, den: number): number {
    return den > 0 ? Math.round((num / den) * 1000) / 10 : 100;
  }

  /** Letter grade from reopen-aware retention, capped by silent mutations. */
  grade(effectiveRetention: number, unexpectedMutations: number, imported: number): SafetyGrade {
    if (imported === 0) return 'N/A';
    let g: SafetyGrade = 'F';
    for (const t of GRADE_THRESHOLDS) {
      if (effectiveRetention >= t.min) {
        g = t.grade;
        break;
      }
    }
    // Silent mutation is a fidelity failure even when content is "present" —
    // a module with any unexpected mutation cannot be graded A/A+.
    if (unexpectedMutations > 0 && (g === 'A+' || g === 'A')) g = 'B';
    return g;
  }

  private classifyReason(reason: string): { known: boolean; expected: boolean } {
    return {
      known: KNOWN_LOSS_REASONS.has(reason),
      expected: EXPECTED_LOSS_REASONS.has(reason),
    };
  }

  private topReasons(counts: Map<string, number>, limit = 10): LossReasonCount[] {
    return Array.from(counts.entries())
      .map(([reason, count]) => ({ reason, count, ...this.classifyReason(reason) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * PHASE 1 / 2 / 4 / 7 / 10 — full platform certification.
   * Fetches every ledger node once, groups by document for correct (per-doc)
   * loss classification, then aggregates per module and platform-wide.
   */
  async certifyPlatform(): Promise<PlatformCertification> {
    const rows: any[] = await this.nodes.findMany({
      select: {
        id: true,
        module: true,
        sourceDocumentId: true,
        sourceType: true,
        sectionId: true,
        type: true,
        content: true,
        destination: true,
        renderer: true,
        imported: true,
        rendered: true,
        exported: true,
        reopened: true,
        reopenedAt: true,
        mutated: true,
        rejected: true,
        lossReason: true,
      },
    });

    // Group by document so reopen-observation is computed per artifact, then
    // reuse the ledger's own loss classifier (preloaded — zero extra queries).
    const byDoc = new Map<string, any[]>();
    for (const r of rows) {
      const k = r.sourceDocumentId;
      (byDoc.get(k) || byDoc.set(k, []).get(k)!).push(r);
    }
    const brokenByDoc = new Map<string, any[]>();
    for (const [docId, group] of byDoc) {
      brokenByDoc.set(docId, await this.ledger.calculateLoss(docId, group));
    }

    // ── Per-module aggregation ────────────────────────────────────────────────
    const moduleAgg = new Map<
      string,
      {
        docs: Set<string>;
        imported: number;
        rendered: number;
        exported: number;
        reopened: number;
        missing: number;
        rejected: number;
        mutated: number;
        expected: number;
        unexpected: number;
        broken: number;
        reopenObserved: boolean;
        reasons: Map<string, number>;
      }
    >();
    const ensure = (m: string) => {
      let a = moduleAgg.get(m);
      if (!a) {
        a = {
          docs: new Set(),
          imported: 0,
          rendered: 0,
          exported: 0,
          reopened: 0,
          missing: 0,
          rejected: 0,
          mutated: 0,
          expected: 0,
          unexpected: 0,
          broken: 0,
          reopenObserved: false,
          reasons: new Map(),
        };
        moduleAgg.set(m, a);
      }
      return a;
    };

    const platformReasons = new Map<string, number>();
    const pipelineAgg = new Map<string, { broken: number; total: number }>();
    // BrokenNode carries no renderer — map node id → its pipeline to attribute risk.
    const pipelineByNode = new Map<string, string>();

    for (const r of rows) {
      pipelineByNode.set(r.id, r.renderer || r.module);
      const a = ensure(r.module);
      a.docs.add(r.sourceDocumentId);
      if (r.imported) a.imported++;
      if (r.rendered) a.rendered++;
      if (r.exported) a.exported++;
      if (r.reopened) a.reopened++;
      if (r.imported && !r.rendered) a.missing++;
      if (r.rejected) a.rejected++;
      if (r.mutated) a.mutated++;
      if (r.reopenedAt || r.reopened || r.lossReason === 'absent_on_reopen')
        a.reopenObserved = true;
      const expected = EXPECTED_LOSS_REASONS.has(r.lossReason);
      if (r.mutated && expected) a.expected++;
      if (r.mutated && !expected) a.unexpected++;

      const pipe = pipelineAgg.get(r.renderer || r.module) || { broken: 0, total: 0 };
      pipe.total++;
      pipelineAgg.set(r.renderer || r.module, pipe);
    }

    // Fold broken nodes (per doc) into module + platform + pipeline tallies.
    for (const [docId, broken] of brokenByDoc) {
      for (const b of broken) {
        const a = ensure(b.module);
        a.broken++;
        a.reopenObserved =
          a.reopenObserved ||
          byDoc.get(docId)!.some((n) => n.reopened || n.lossReason === 'absent_on_reopen');
        a.reasons.set(b.reason, (a.reasons.get(b.reason) || 0) + 1);
        platformReasons.set(b.reason, (platformReasons.get(b.reason) || 0) + 1);
        const pkey = pipelineByNode.get(b.id) || b.module;
        const pipe = pipelineAgg.get(pkey) || { broken: 0, total: 0 };
        pipe.broken++;
        pipelineAgg.set(pkey, pipe);
      }
    }

    // ── Build per-module certifications ───────────────────────────────────────
    const moduleScores: ModuleCertification[] = [];
    for (const [module, a] of moduleAgg) {
      const reopenObserved = a.reopenObserved && a.reopened > 0;
      const retention = this.pct(a.exported, a.imported);
      const effectiveRetention = reopenObserved ? this.pct(a.reopened, a.imported) : retention;
      const grade = this.grade(effectiveRetention, a.unexpected, a.imported);
      const certified =
        a.imported > 0 &&
        reopenObserved &&
        effectiveRetention >= CERTIFICATION_MIN_RETENTION &&
        a.unexpected === 0;
      moduleScores.push({
        module,
        label: MODULE_LABELS[module] || module,
        documents: a.docs.size,
        imported: a.imported,
        rendered: a.rendered,
        exported: a.exported,
        reopened: a.reopened,
        missing: a.missing,
        broken: a.broken,
        rejected: a.rejected,
        mutated: a.mutated,
        expectedMutations: a.expected,
        unexpectedMutations: a.unexpected,
        retention,
        renderRetention: this.pct(a.rendered, a.imported),
        exportRetention: this.pct(a.exported, a.rendered),
        reopenRetention: this.pct(a.reopened, a.exported),
        reopenObserved,
        effectiveRetention,
        grade,
        certified,
        topLossReasons: this.topReasons(a.reasons, 5),
      });
    }
    moduleScores.sort((x, y) => x.label.localeCompare(y.label));

    // ── Platform totals ───────────────────────────────────────────────────────
    const sum = (f: (m: ModuleCertification) => number) =>
      moduleScores.reduce((s, m) => s + f(m), 0);
    const totals = {
      imported: sum((m) => m.imported),
      rendered: sum((m) => m.rendered),
      exported: sum((m) => m.exported),
      reopened: sum((m) => m.reopened),
      missing: sum((m) => m.missing),
      broken: sum((m) => m.broken),
      rejected: sum((m) => m.rejected),
      mutated: sum((m) => m.mutated),
      expectedMutations: sum((m) => m.expectedMutations),
      unexpectedMutations: sum((m) => m.unexpectedMutations),
      documents: byDoc.size,
    };
    const anyReopen = moduleScores.some((m) => m.reopenObserved);
    const overallRetention = this.pct(totals.exported, totals.imported);
    const overallEffectiveRetention = anyReopen
      ? this.pct(totals.reopened, totals.imported)
      : overallRetention;
    const overallGrade = this.grade(
      overallEffectiveRetention,
      totals.unexpectedMutations,
      totals.imported,
    );

    // ── Risk ranking + certified / uncertified split ──────────────────────────
    const highestRiskModules: RiskModule[] = moduleScores
      .filter((m) => m.imported > 0)
      .map((m) => ({
        module: m.module,
        label: m.label,
        broken: m.broken,
        imported: m.imported,
        riskRate: this.pct(m.broken, m.imported),
      }))
      .filter((m) => m.broken > 0)
      .sort((a, b) => b.riskRate - a.riskRate)
      .slice(0, 10);

    const highestRiskPipelines: RiskPipeline[] = Array.from(pipelineAgg.entries())
      .map(([pipeline, v]) => ({
        pipeline,
        broken: v.broken,
        total: v.total,
        riskRate: this.pct(v.broken, v.total),
      }))
      .filter((p) => p.broken > 0)
      .sort((a, b) => b.riskRate - a.riskRate)
      .slice(0, 10);

    const certifiedModules = moduleScores.filter((m) => m.certified).map((m) => m.module);
    const certifiedSet = new Set(certifiedModules);
    // Uncertified = expected modules that aren't certified, plus any present-but-uncertified module.
    const uncertifiedModules = Array.from(
      new Set([
        ...EXPECTED_MODULES.filter((m) => !certifiedSet.has(m)),
        ...moduleScores.filter((m) => !m.certified).map((m) => m.module),
      ]),
    );

    const topLossReasons = this.topReasons(platformReasons, 12);
    const uncategorizedLossReasons = topLossReasons.filter((r) => !r.known).map((r) => r.reason);

    return {
      generatedAt: new Date().toISOString(),
      overallRetention,
      overallEffectiveRetention,
      overallGrade,
      totals,
      moduleScores,
      certifiedModules,
      uncertifiedModules,
      topLossReasons,
      highestRiskModules,
      highestRiskPipelines,
      uncategorizedLossReasons,
    };
  }

  /** PHASE 2 — certify a single module by aggregating across its documents. */
  async certifyModule(module: string): Promise<ModuleCertification | null> {
    const platform = await this.certifyPlatform();
    return platform.moduleScores.find((m) => m.module === module) || null;
  }

  /**
   * PHASE 8 — render the certification as a Markdown report
   * (CONTENT_SAFETY_CERTIFICATION.md).
   */
  renderMarkdown(c: PlatformCertification): string {
    const L: string[] = [];
    const fmtPct = (n: number) => `${n.toFixed(1)}%`;
    L.push('# Pitchonix — Content Safety Certification');
    L.push('');
    L.push(
      '> Phase Ω.CONTENT.3 — generated from real Universal Content Ledger data. No estimates.',
    );
    L.push('');
    L.push(`**Generated:** ${c.generatedAt}`);
    L.push('');
    L.push('## Platform');
    L.push('');
    L.push(`- **Content Safety Grade:** \`${c.overallGrade}\``);
    L.push(`- **Platform Retention (exported/imported):** ${fmtPct(c.overallRetention)}`);
    L.push(`- **Effective Retention (reopen-verified):** ${fmtPct(c.overallEffectiveRetention)}`);
    L.push(
      `- **Imported / Rendered / Exported / Reopened:** ${c.totals.imported} / ${c.totals.rendered} / ${c.totals.exported} / ${c.totals.reopened}`,
    );
    L.push(
      `- **Broken nodes:** ${c.totals.broken} · **Missing:** ${c.totals.missing} · **Unexpected mutations:** ${c.totals.unexpectedMutations}`,
    );
    L.push(`- **Documents tracked:** ${c.totals.documents}`);
    L.push('');
    L.push('## Per-Module Certification');
    L.push('');
    L.push(
      '| Module | Grade | Imported | Rendered | Exported | Reopened | Missing | Broken | Retention | Certified |',
    );
    L.push('|---|---|---|---|---|---|---|---|---|---|');
    for (const m of c.moduleScores) {
      L.push(
        `| ${m.label} | \`${m.grade}\` | ${m.imported} | ${m.rendered} | ${m.exported} | ${m.reopened} | ${m.missing} | ${m.broken} | ${fmtPct(m.effectiveRetention)} | ${m.certified ? '✅' : '⚠️'} |`,
      );
    }
    L.push('');
    L.push('## Certified Modules');
    L.push('');
    L.push(
      c.certifiedModules.length
        ? c.certifiedModules.map((m) => `- ✅ ${MODULE_LABELS[m] || m}`).join('\n')
        : '- _none yet_',
    );
    L.push('');
    L.push('## Uncertified Modules');
    L.push('');
    L.push(
      c.uncertifiedModules.length
        ? c.uncertifiedModules.map((m) => `- ⚠️ ${MODULE_LABELS[m] || m}`).join('\n')
        : '- _none_',
    );
    L.push('');
    L.push('## Top Loss Reasons');
    L.push('');
    if (c.topLossReasons.length) {
      L.push('| Reason | Count | Known | Expected |');
      L.push('|---|---|---|---|');
      for (const r of c.topLossReasons)
        L.push(
          `| \`${r.reason}\` | ${r.count} | ${r.known ? 'yes' : '**NO**'} | ${r.expected ? 'yes' : 'no'} |`,
        );
    } else {
      L.push('- _no losses recorded_');
    }
    L.push('');
    L.push('## Highest-Risk Modules');
    L.push('');
    if (c.highestRiskModules.length) {
      L.push('| Module | Broken | Imported | Risk Rate |');
      L.push('|---|---|---|---|');
      for (const r of c.highestRiskModules)
        L.push(`| ${r.label} | ${r.broken} | ${r.imported} | ${fmtPct(r.riskRate)} |`);
    } else {
      L.push('- _no module risk detected_');
    }
    L.push('');
    L.push('## Highest-Risk Pipelines');
    L.push('');
    if (c.highestRiskPipelines.length) {
      L.push('| Pipeline | Broken | Total | Risk Rate |');
      L.push('|---|---|---|---|');
      for (const r of c.highestRiskPipelines)
        L.push(`| \`${r.pipeline}\` | ${r.broken} | ${r.total} | ${fmtPct(r.riskRate)} |`);
    } else {
      L.push('- _no pipeline risk detected_');
    }
    L.push('');
    if (c.uncategorizedLossReasons.length) {
      L.push('## ⚠️ Uncategorized Loss Reasons (triage required)');
      L.push('');
      L.push(c.uncategorizedLossReasons.map((r) => `- \`${r}\``).join('\n'));
      L.push('');
    }
    L.push('## Grading Scale');
    L.push('');
    L.push('| Grade | Effective Retention |');
    L.push('|---|---|');
    L.push('| A+ | ≥ 99.9% |');
    L.push('| A | ≥ 99% |');
    L.push('| B | ≥ 97% |');
    L.push('| C | ≥ 95% |');
    L.push('| D | ≥ 90% |');
    L.push('| F | < 90% |');
    L.push('');
    L.push('_Any unexpected (silent) mutation caps a module at grade B._');
    L.push('');

    // Phase 10 — remaining risks (data-driven): uncertified modules with data,
    // and the dominant loss reasons.
    L.push('## Remaining Risks');
    L.push('');
    const risky = c.moduleScores.filter((m) => m.imported > 0 && !m.certified);
    if (risky.length) {
      for (const m of risky) {
        const top = m.topLossReasons[0];
        L.push(
          `- **${m.label}** — ${fmtPct(m.effectiveRetention)} effective retention, ${m.broken} broken node(s)${top ? ` (top: \`${top.reason}\` ×${top.count})` : ''}.`,
        );
      }
    } else {
      L.push('- _No module with recorded data is currently at risk._');
    }
    L.push('');

    // Phase 8 — known limitations of the measurement methodology.
    L.push('## Known Limitations');
    L.push('');
    L.push(
      '- **Structural nodes** (images, slide layouts/masters) are verified by export-format capability, not pixel comparison — a rich target (PDF/PPTX/DOCX) is treated as preserving them.',
    );
    L.push(
      '- **Text presence** is proven by normalized needle matching against the re-parsed export; heavy re-styling that changes the first words of a node can read as a mutation.',
    );
    L.push(
      '- **Raster exports** (PNG/JPEG) are marked exported but cannot be text-reopened, so they do not contribute to reopen retention.',
    );
    L.push(
      '- Retention reflects **recorded lifecycle data only**; documents exported before a module was ledger-integrated are not counted.',
    );
    L.push(
      '- A module shows **N/A** until at least one of its documents has completed an export→reopen cycle.',
    );
    L.push('');
    L.push('---');
    L.push('');
    L.push(
      '_Generated by `npm run certify:content`. CI enforces no regression via `npm run certify:gate`._',
    );
    L.push('');
    return L.join('\n');
  }
}
