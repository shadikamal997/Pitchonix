/**
 * Phase 30A — Document Framework Engine
 *
 * Validates a generated deck against its document type's professional
 * framework. Reports which required sections are satisfied (directly or via
 * alternates), which are missing, and which slide types are "extra".
 *
 * Pure-function: no LLM, no I/O.
 */

import { Injectable } from '@nestjs/common';
import { SlideContent, SlideType } from '../slide-types/types';
import { FrameworkCompletenessReport, FrameworkSection } from './types';
import { getFramework } from './frameworks';

@Injectable()
export class DocumentFrameworkEngine {
  /**
   * Validate the slides against the framework for the document type.
   */
  validate(documentType: string, slides: SlideContent[]): FrameworkCompletenessReport {
    const framework = getFramework(documentType);
    const presentTypes = new Set(slides.map((s) => s.type));

    const satisfied:           FrameworkSection[] = [];
    const missing:             FrameworkSection[] = [];
    const satisfiedByAlternate: FrameworkSection[] = [];

    for (const section of framework.sections) {
      if (presentTypes.has(section.slideType)) {
        satisfied.push(section);
        continue;
      }
      const alt = (section.alternates ?? []).find((a) => presentTypes.has(a));
      if (alt) {
        satisfied.push(section);
        satisfiedByAlternate.push(section);
        continue;
      }
      missing.push(section);
    }

    const requiredSections = framework.sections.filter((s) => s.required);
    const requiredSatisfied = requiredSections.filter((s) => satisfied.includes(s)).length;
    const completeness = requiredSections.length === 0
      ? 100
      : Math.round((requiredSatisfied / requiredSections.length) * 100);

    const frameworkTypes = new Set(
      framework.sections.flatMap((s) => [s.slideType, ...(s.alternates ?? [])]),
    );
    const extra: SlideType[] = [];
    for (const t of presentTypes) {
      // COVER is implicit and not part of every framework — never mark it extra.
      if (t === SlideType.COVER) continue;
      if (!frameworkTypes.has(t)) extra.push(t);
    }

    return {
      documentType,
      framework: framework.name,
      completeness,
      satisfied,
      missing,
      extra,
      satisfiedByAlternate,
    };
  }

  /**
   * Sections (and their slide types) that are missing from the deck but
   * declared by the framework. Used by AutoExpansion (30I).
   */
  getMissingSlideTypes(documentType: string, slides: SlideContent[]): SlideType[] {
    return this.validate(documentType, slides).missing.map((s) => s.slideType);
  }
}
