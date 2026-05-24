// =============================================================================
//  GenerationComponentAdapter — Phase 32.75 Tier 4
//
//  The single bridge between the legacy slide generators and the Tier 3 smart
//  component registry. Each slide generator that has a matching smart
//  component family ("RoadmapGenerator" → "roadmapBlock") asks this adapter
//  for the canonical element tree, instead of hand-rolling its own layout.
//
//  Architecture:
//
//      Generation                ┐
//      WizardInput               │
//          ↓                     │
//      generator.generateContent ├──► logical content (unchanged)
//          ↓                     │
//      adapter.getComponent      ├──► smart-component metadata
//      adapter.buildTree         ├──► concrete SlideElement[] tree
//          ↓                     │
//      SlideContent { content }  ┘
//          ↓
//      SlideElementsMigrationService — can prefer componentTree if present
//          ↓
//      SlideElement rows → editor + exports
//
//  Fallback contract (Part I): if the requested smart component is missing —
//  unknown family, unknown type, registry throws — the adapter returns `null`
//  and the generator's existing manual layout stays the canonical path. Never
//  break generation.
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { smartRegistry } from '../components/smart/smart-registry';
import {
  SmartFamilyId, SmartComponentType, SMART_FAMILIES, SMART_COMPONENT_TYPES,
} from '../components/smart/smart-types';
import type { SmartComponentDTO } from '../components/smart/smart-types';
import type { SlideElementDTO } from '../slides/element-types';
import type { WizardInput } from './slide-types/types';
import { SlideType } from './slide-types/types';

/** Result of an adapter lookup. `null` means "fall back to manual layout". */
export interface SmartComponentRequest {
  family:      SmartFamilyId;
  type:        SmartComponentType;
  elementTree: SlideElementDTO[];
}

/** Map from generator SlideType → preferred smart-component type. */
const SLIDE_TYPE_TO_COMPONENT: Partial<Record<SlideType, SmartComponentType>> = {
  // Tier 4
  [SlideType.ROADMAP]:            'roadmapBlock',
  [SlideType.PRICING]:            'pricingTable',
  [SlideType.BUSINESS_MODEL]:     'pricingTable',
  [SlideType.TEAM]:               'teamGrid',
  [SlideType.MARKET_OPPORTUNITY]: 'marketOpportunity',
  [SlideType.COMPETITION]:        'comparisonMatrix',
  [SlideType.ASK]:                'fundingBlock',
  [SlideType.TRACTION]:           'statBlock',
  // Tier 6 — completes coverage
  [SlideType.COVER]:              'coverCard',
  [SlideType.PROBLEM]:            'problemStatement',
  [SlideType.SOLUTION]:           'solutionStatement',
  [SlideType.EXECUTIVE_SUMMARY]:  'executiveSummary',
  [SlideType.PRODUCT_FEATURES]:   'featureGrid',
  [SlideType.VISION]:             'visionBlock',
  [SlideType.GO_TO_MARKET]:       'processFlow',
  [SlideType.FINANCIALS]:         'financialDashboard',
  [SlideType.CASE_STUDY]:         'caseStudyBlock',
  [SlideType.COMPANY_OVERVIEW]:   'companyOverviewBlock',
};

/** Default family by document type. Falls back to `investor-minimal`. */
const DOC_TYPE_TO_FAMILY: Record<string, SmartFamilyId> = {
  pitch_deck:        'investor-minimal',
  sales_deck:        'soft-geometric-blue',
  board_deck:        'corporate-monochrome',
  strategy_deck:     'editorial-report',
  business_plan:     'light-blue-business',
  investor_deck:     'investor-minimal',
  internal_review:   'corporate-monochrome',
  launch_deck:       'startup-gradient',
  conference_deck:   'luxury-dark',
};

/** Lower-case heuristics for the WizardInput.theme string. */
const THEME_HINT_TO_FAMILY: Array<{ pattern: RegExp; family: SmartFamilyId }> = [
  { pattern: /crimson|red|bold/i,               family: 'crimson-dark' },
  { pattern: /luxury|gold|premium|elegant/i,    family: 'luxury-dark' },
  { pattern: /startup|gradient|vibrant|fun/i,   family: 'startup-gradient' },
  { pattern: /investor|minimal|terracotta/i,    family: 'investor-minimal' },
  { pattern: /corporate|monochrome|formal/i,    family: 'corporate-monochrome' },
  { pattern: /editorial|report|magazine|serif/i,family: 'editorial-report' },
  { pattern: /geometric|soft|playful/i,         family: 'soft-geometric-blue' },
  { pattern: /business|blue/i,                  family: 'light-blue-business' },
];

@Injectable()
export class GenerationComponentAdapter {
  private readonly logger = new Logger(GenerationComponentAdapter.name);

  // ---------------------------------------------------------------------------
  //  Family inference (Part J — supports family-switching regeneration)
  // ---------------------------------------------------------------------------

  /**
   * Pick a smart family from the wizard input. Order of precedence:
   *   1. Explicit `input.theme` heuristic match
   *   2. `input.documentType` mapping
   *   3. `investor-minimal` (a neutral, professional default)
   *
   * Callers can override by passing `forcedFamily` (used by regeneration so
   * the user's family choice in the editor wins over the heuristics).
   */
  inferFamily(input: WizardInput, forcedFamily?: SmartFamilyId | null): SmartFamilyId {
    if (forcedFamily && SMART_FAMILIES.includes(forcedFamily)) return forcedFamily;

    const theme = (input.theme || '').toLowerCase();
    if (theme) {
      // Allow direct family name match first.
      if (SMART_FAMILIES.includes(theme as SmartFamilyId)) return theme as SmartFamilyId;
      for (const { pattern, family } of THEME_HINT_TO_FAMILY) {
        if (pattern.test(theme)) return family;
      }
    }

    const byDoc = DOC_TYPE_TO_FAMILY[(input.documentType || '').toLowerCase()];
    if (byDoc) return byDoc;

    return 'investor-minimal';
  }

  // ---------------------------------------------------------------------------
  //  Lookup (Part A — the canonical API surface)
  // ---------------------------------------------------------------------------

  /**
   * Spec API: `getComponent(familyId, componentType) → elementTree`.
   * Returns the full SmartComponentDTO so callers can grab tags/category
   * if they want; `elementTree` is what the generators usually want.
   *
   * Returns null when the family/type isn't valid — generators MUST handle
   * null and fall back to their manual layout (Part I).
   */
  getComponent(family: SmartFamilyId, type: SmartComponentType): SmartComponentDTO | null {
    if (!SMART_FAMILIES.includes(family) || !SMART_COMPONENT_TYPES.includes(type)) return null;
    try {
      return smartRegistry.getOne(family, type);
    } catch (err) {
      this.logger.warn(`smart-component lookup failed for ${family}/${type}: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Map a slide generator's type to its smart component (if any), build the
   * element tree for the current family, and return a request object. Used
   * by the seven Tier-4 generators in the spec.
   */
  requestFor(slideType: SlideType, input: WizardInput, forcedFamily?: SmartFamilyId | null): SmartComponentRequest | null {
    const compType = SLIDE_TYPE_TO_COMPONENT[slideType];
    if (!compType) return null;
    const family = this.inferFamily(input, forcedFamily);
    const dto = this.getComponent(family, compType);
    if (!dto) return null;
    return { family, type: compType, elementTree: dto.elementTree };
  }

  /**
   * Invalidate cached smart components for a family. Hook for the
   * "Regenerate after family switch" flow (Part J) — clears the registry
   * cache so the next generation pass uses fresh tokens.
   */
  invalidateFamily(family: SmartFamilyId): void {
    smartRegistry.invalidate(family);
  }
}

/** Module-level singleton shared by every generator. */
export const generationAdapter = new GenerationComponentAdapter();
