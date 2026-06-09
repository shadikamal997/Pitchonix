import { PlatformCertification } from './content-certification.types';

/**
 * Phase Ω.CONTENT.3 — Phase 9 Regression Gate.
 *
 * Pure evaluator that CI runs against a fresh platform certification (and an
 * optional committed baseline). The build FAILS when:
 *   1. overall effective retention drops below the floor,
 *   2. any module's effective retention drops below the floor,
 *   3. broken-node count increases versus the baseline,
 *   4. a new uncategorized loss reason appears,
 *   5. a new unexpected (silent) mutation appears versus the baseline.
 *
 * Keeping content safety a continuously-verified gate, not an audit.
 */

export interface RegressionGateOptions {
  /** Minimum acceptable effective retention (%) — platform and per certified module. */
  minRetention?: number;
  /** Allow broken nodes to grow by at most this many vs baseline. */
  maxBrokenIncrease?: number;
  /** Treat uncategorized loss reasons as failures. */
  failOnUncategorized?: boolean;
}

export interface GateViolation {
  rule:
    | 'overall_retention'
    | 'module_retention'
    | 'broken_increase'
    | 'uncategorized_reason'
    | 'new_mutation';
  message: string;
  module?: string;
}

export interface GateResult {
  passed: boolean;
  violations: GateViolation[];
}

const DEFAULTS: Required<RegressionGateOptions> = {
  minRetention: 97,
  maxBrokenIncrease: 0,
  failOnUncategorized: true,
};

export function evaluateRegressionGate(
  current: PlatformCertification,
  baseline?: PlatformCertification | null,
  options: RegressionGateOptions = {},
): GateResult {
  const opts = { ...DEFAULTS, ...options };
  const violations: GateViolation[] = [];

  // 1a) Absolute retention floor (the certification target).
  if (current.totals.imported > 0 && current.overallEffectiveRetention < opts.minRetention) {
    violations.push({
      rule: 'overall_retention',
      message: `Platform retention ${current.overallEffectiveRetention}% is below floor ${opts.minRetention}%`,
    });
  }
  // 1b) Ratchet — never regress below the committed baseline, even when still
  // under the absolute target. Catches drops that 1a would miss once at target.
  if (
    baseline &&
    current.totals.imported > 0 &&
    current.overallEffectiveRetention < baseline.overallEffectiveRetention - 0.05
  ) {
    violations.push({
      rule: 'overall_retention',
      message: `Platform retention regressed ${baseline.overallEffectiveRetention}% → ${current.overallEffectiveRetention}% (below baseline)`,
    });
  }

  // 2) Per-module retention floor — a module that was certified must stay above it.
  const baseCertified = new Set(baseline?.certifiedModules || []);
  for (const m of current.moduleScores) {
    if (m.imported === 0) continue;
    const mustHold = baseCertified.has(m.module) || m.certified;
    if (mustHold && m.effectiveRetention < opts.minRetention) {
      violations.push({
        rule: 'module_retention',
        module: m.module,
        message: `${m.label} retention ${m.effectiveRetention}% is below floor ${opts.minRetention}%`,
      });
    }
  }

  // 3) Broken-node regression vs baseline.
  if (baseline) {
    const delta = current.totals.broken - baseline.totals.broken;
    if (delta > opts.maxBrokenIncrease) {
      violations.push({
        rule: 'broken_increase',
        message: `Broken nodes increased by ${delta} (baseline ${baseline.totals.broken} → ${current.totals.broken})`,
      });
    }
    // 5) New silent mutations vs baseline.
    if (current.totals.unexpectedMutations > baseline.totals.unexpectedMutations) {
      violations.push({
        rule: 'new_mutation',
        message: `Unexpected mutations increased (baseline ${baseline.totals.unexpectedMutations} → ${current.totals.unexpectedMutations})`,
      });
    }
  } else if (current.totals.unexpectedMutations > 0) {
    violations.push({
      rule: 'new_mutation',
      message: `${current.totals.unexpectedMutations} unexpected (silent) mutation(s) detected`,
    });
  }

  // 4) Uncategorized loss reasons — every failure mode must be registered.
  if (opts.failOnUncategorized && current.uncategorizedLossReasons.length > 0) {
    violations.push({
      rule: 'uncategorized_reason',
      message: `Uncategorized loss reason(s): ${current.uncategorizedLossReasons.join(', ')}`,
    });
  }

  return { passed: violations.length === 0, violations };
}
