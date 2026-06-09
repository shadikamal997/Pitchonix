import { evaluateRegressionGate } from './certification-gate';
import { PlatformCertification } from './content-certification.types';

/** Phase Ω.CONTENT.3 — Phase 9 regression-gate unit tests. */

function cert(partial: Partial<PlatformCertification> = {}): PlatformCertification {
  return {
    generatedAt: '2026-01-01T00:00:00.000Z',
    overallRetention: 100,
    overallEffectiveRetention: 100,
    overallGrade: 'A+',
    totals: {
      imported: 100,
      rendered: 100,
      exported: 100,
      reopened: 100,
      missing: 0,
      broken: 0,
      rejected: 0,
      mutated: 0,
      expectedMutations: 0,
      unexpectedMutations: 0,
      documents: 1,
    },
    moduleScores: [],
    certifiedModules: [],
    uncertifiedModules: [],
    topLossReasons: [],
    highestRiskModules: [],
    highestRiskPipelines: [],
    uncategorizedLossReasons: [],
    ...partial,
  };
}

describe('evaluateRegressionGate — Phase Ω.CONTENT.3 Phase 9', () => {
  it('passes a clean certification', () => {
    expect(evaluateRegressionGate(cert()).passed).toBe(true);
  });

  it('fails when overall retention drops below the floor', () => {
    const r = evaluateRegressionGate(cert({ overallEffectiveRetention: 95.5 }));
    expect(r.passed).toBe(false);
    expect(r.violations.map((v) => v.rule)).toContain('overall_retention');
  });

  it('fails when broken nodes increase versus baseline', () => {
    const baseline = cert({ totals: { ...cert().totals, broken: 2 } });
    const current = cert({ totals: { ...cert().totals, broken: 5 } });
    const r = evaluateRegressionGate(current, baseline);
    expect(r.passed).toBe(false);
    expect(r.violations.find((v) => v.rule === 'broken_increase')).toBeTruthy();
  });

  it('passes when broken nodes decrease versus baseline', () => {
    const baseline = cert({ totals: { ...cert().totals, broken: 5 } });
    const current = cert({ totals: { ...cert().totals, broken: 1 } });
    expect(evaluateRegressionGate(current, baseline).passed).toBe(true);
  });

  it('fails when a new uncategorized loss reason appears', () => {
    const r = evaluateRegressionGate(cert({ uncategorizedLossReasons: ['mystery_failure'] }));
    expect(r.passed).toBe(false);
    expect(r.violations.find((v) => v.rule === 'uncategorized_reason')?.message).toContain(
      'mystery_failure',
    );
  });

  it('fails when a certified module regresses below the floor', () => {
    const baseline = cert({ certifiedModules: ['career'] });
    const current = cert({
      moduleScores: [
        {
          module: 'career',
          label: 'Career Docs',
          documents: 1,
          imported: 100,
          rendered: 100,
          exported: 100,
          reopened: 94,
          missing: 0,
          broken: 6,
          rejected: 0,
          mutated: 0,
          expectedMutations: 0,
          unexpectedMutations: 0,
          retention: 100,
          renderRetention: 100,
          exportRetention: 100,
          reopenRetention: 94,
          reopenObserved: true,
          effectiveRetention: 94,
          grade: 'D',
          certified: false,
          topLossReasons: [],
        },
      ],
    });
    const r = evaluateRegressionGate(current, baseline);
    expect(r.passed).toBe(false);
    expect(r.violations.find((v) => v.rule === 'module_retention')?.module).toBe('career');
  });

  it('fails when a new silent mutation appears versus baseline', () => {
    const baseline = cert();
    const current = cert({ totals: { ...cert().totals, unexpectedMutations: 1, broken: 1 } });
    const r = evaluateRegressionGate(current, baseline);
    expect(r.violations.map((v) => v.rule)).toEqual(
      expect.arrayContaining(['new_mutation', 'broken_increase']),
    );
  });

  it('an empty platform (no data yet) does not fail the gate', () => {
    const empty = cert({
      overallEffectiveRetention: 100,
      overallGrade: 'N/A',
      totals: {
        imported: 0,
        rendered: 0,
        exported: 0,
        reopened: 0,
        missing: 0,
        broken: 0,
        rejected: 0,
        mutated: 0,
        expectedMutations: 0,
        unexpectedMutations: 0,
        documents: 0,
      },
    });
    expect(evaluateRegressionGate(empty).passed).toBe(true);
  });
});
