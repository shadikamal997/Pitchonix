/**
 * Phase 27J — Structure Validator
 *
 * Pre-completion checks that the blueprint list is healthy. Surfaces warnings
 * but doesn't block generation — the GenerationService keeps the deck and
 * logs the issues.
 */

import { Injectable, Logger } from '@nestjs/common';
import { BlockKind, SlideBlueprint } from './types';

export type ValidationSeverity = 'info' | 'warn' | 'error';

export interface ValidationIssue {
  severity:    ValidationSeverity;
  slideIndex?: number;
  code:        string;
  message:     string;
}

export interface ValidationReport {
  ok:      boolean;
  issues:  ValidationIssue[];
  summary: { info: number; warn: number; error: number };
}

@Injectable()
export class StructureValidator {
  private readonly logger = new Logger(StructureValidator.name);

  validate(blueprints: SlideBlueprint[]): ValidationReport {
    const issues: ValidationIssue[] = [];

    // 1. Per-slide: at least one block should exist
    blueprints.forEach((bp, i) => {
      if (bp.blocks.length === 0) {
        issues.push({
          severity: 'warn', slideIndex: i, code: 'no-blocks',
          message: `Slide ${i + 1} (${bp.slideType}) has no visual blocks`,
        });
      }
      // No empty blocks
      for (const b of bp.blocks) {
        if (this.isEmptyContent(b.content)) {
          issues.push({
            severity: 'warn', slideIndex: i, code: 'empty-block',
            message: `Slide ${i + 1}: empty ${b.kind} block`,
          });
        }
      }
    });

    // 2. Deck-wide: paragraph-heavy detection
    const totalBlocks = blueprints.reduce((s, bp) => s + bp.blocks.length, 0);
    const textHeavy = blueprints.reduce(
      (s, bp) => s + bp.blocks.filter((b) => b.kind === 'paragraph' || b.kind === 'bulletList').length, 0,
    );
    if (totalBlocks > 0 && textHeavy / totalBlocks > 0.5) {
      issues.push({
        severity: 'warn', code: 'paragraph-heavy',
        message: `Deck is paragraph-heavy (${Math.round((textHeavy / totalBlocks) * 100)}% of blocks)`,
      });
    }

    // 3. Excessive repetition
    const counts: Record<string, number> = {};
    for (const bp of blueprints) {
      for (const b of bp.blocks) counts[b.kind] = (counts[b.kind] ?? 0) + 1;
    }
    for (const [kind, count] of Object.entries(counts)) {
      if (count >= 4 && kind !== 'paragraph' && kind !== 'metric') {
        issues.push({
          severity: 'warn', code: 'excessive-repetition',
          message: `Block kind "${kind}" used ${count}× across deck`,
        });
      }
    }

    // 4. Missing structure types: a deck with 5+ slides should have >= 3 distinct visual kinds
    const visualKinds = new Set(
      Object.keys(counts).filter((k) => k !== 'paragraph' && k !== 'bulletList'),
    );
    if (blueprints.length >= 5 && visualKinds.size < 3) {
      issues.push({
        severity: 'warn', code: 'low-visual-diversity',
        message: `Only ${visualKinds.size} distinct visual block kinds for ${blueprints.length}-slide deck`,
      });
    }

    // 5. Unused opportunities — flag slides whose analyzer found facts but the
    //    blueprint didn't use them.
    blueprints.forEach((bp, i) => {
      const e = bp.profile.extracted;
      const usedKinds = new Set<BlockKind>(bp.blocks.map((b) => b.kind));
      if (e.numbers.length >= 2 && !usedKinds.has('metric') && !usedKinds.has('metricGrid') && !usedKinds.has('chart')) {
        issues.push({
          severity: 'info', slideIndex: i, code: 'unused-numbers',
          message: `Slide ${i + 1}: ${e.numbers.length} numbers extracted but no metric/chart block emitted`,
        });
      }
      if (e.people.length >= 2 && !usedKinds.has('team')) {
        issues.push({
          severity: 'info', slideIndex: i, code: 'unused-people',
          message: `Slide ${i + 1}: ${e.people.length} people extracted but no team block emitted`,
        });
      }
    });

    const summary = {
      info:  issues.filter((i) => i.severity === 'info').length,
      warn:  issues.filter((i) => i.severity === 'warn').length,
      error: issues.filter((i) => i.severity === 'error').length,
    };

    if (summary.warn + summary.error > 0) {
      this.logger.log(`StructureValidator: ${summary.error} errors, ${summary.warn} warnings, ${summary.info} info`);
    }

    return { ok: summary.error === 0, issues, summary };
  }

  private isEmptyContent(content: any): boolean {
    if (!content) return true;
    if (Array.isArray(content)) return content.length === 0;
    if (typeof content === 'object') {
      const vals = Object.values(content);
      return vals.length === 0 || vals.every((v) => v == null || (Array.isArray(v) && v.length === 0));
    }
    return false;
  }
}
