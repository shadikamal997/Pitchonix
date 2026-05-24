/**
 * Phase 27F — Document-type generation rules
 *
 * Pure lookup tables. Each document type prioritises certain block kinds.
 * The blueprint engine reads these to bias block selection.
 */

import { BlockKind } from './types';

export interface DocumentRule {
  /** Block kinds whose use we ACTIVELY prefer for this document type. */
  prefer:        BlockKind[];
  /** Block kinds we want to AVOID for this document type. */
  avoid:         BlockKind[];
  /** Target distribution for visual block kinds (each value 0..1). */
  targetMix:     Partial<Record<BlockKind, number>>;
}

export const DOCUMENT_RULES: Record<string, DocumentRule> = {
  pitch_deck: {
    prefer: ['metricGrid', 'marketSizing', 'roadmap', 'team', 'fundingAllocation', 'comparison'],
    avoid:  [],
    targetMix: {
      paragraph:        0.15,
      bulletList:       0.10,
      metricGrid:       0.20,
      metric:           0.10,
      featureGrid:      0.10,
      roadmap:          0.05,
      team:             0.05,
      fundingAllocation:0.05,
      pricing:          0.05,
      marketSizing:     0.05,
      comparison:       0.05,
      chart:            0.05,
    },
  },

  sales_deck: {
    prefer: ['featureGrid', 'testimonial', 'pricing', 'comparison', 'processSteps'],
    avoid:  ['fundingAllocation', 'marketSizing'],
    targetMix: {
      paragraph:    0.10,
      bulletList:   0.10,
      featureGrid:  0.20,
      testimonial:  0.10,
      pricing:      0.15,
      comparison:   0.10,
      processSteps: 0.10,
      metric:       0.10,
      chart:        0.05,
    },
  },

  board_meeting: {
    prefer: ['kpi', 'metricGrid', 'chart', 'comparison', 'roadmap'],
    avoid:  ['testimonial', 'quote'],
    targetMix: {
      paragraph:   0.15,
      bulletList:  0.15,
      kpi:         0.15,
      metricGrid:  0.20,
      chart:       0.15,
      comparison:  0.10,
      roadmap:     0.05,
      timeline:    0.05,
    },
  },

  product_launch: {
    prefer: ['featureGrid', 'roadmap', 'processSteps', 'metricGrid', 'testimonial'],
    avoid:  ['fundingAllocation'],
    targetMix: {
      paragraph:    0.10,
      featureGrid:  0.25,
      processSteps: 0.15,
      roadmap:      0.10,
      metricGrid:   0.15,
      testimonial:  0.10,
      pricing:      0.05,
      chart:        0.05,
    },
  },

  training: {
    prefer: ['processSteps', 'featureGrid', 'bulletList', 'timeline'],
    avoid:  ['fundingAllocation', 'pricing', 'team'],
    targetMix: {
      paragraph:    0.20,
      bulletList:   0.20,
      processSteps: 0.25,
      featureGrid:  0.15,
      timeline:     0.10,
      metric:       0.05,
    },
  },

  strategy: {
    prefer: ['swot', 'comparison', 'roadmap', 'timeline', 'metricGrid'],
    avoid:  ['testimonial', 'fundingAllocation'],
    targetMix: {
      paragraph:   0.15,
      bulletList:  0.10,
      swot:        0.15,
      comparison:  0.15,
      roadmap:     0.15,
      timeline:    0.10,
      metricGrid:  0.10,
      featureGrid: 0.05,
    },
  },

  business_plan: {
    prefer: ['marketSizing', 'metricGrid', 'roadmap', 'team', 'chart', 'pricing'],
    avoid:  [],
    targetMix: {
      paragraph:    0.15,
      bulletList:   0.10,
      metricGrid:   0.15,
      marketSizing: 0.05,
      roadmap:      0.10,
      team:         0.05,
      pricing:      0.10,
      chart:        0.10,
      featureGrid:  0.10,
      comparison:   0.05,
    },
  },

  company_profile: {
    prefer: ['team', 'featureGrid', 'metricGrid', 'roadmap'],
    avoid:  ['fundingAllocation'],
    targetMix: {
      paragraph:   0.20,
      featureGrid: 0.15,
      team:        0.10,
      metricGrid:  0.15,
      roadmap:     0.10,
      timeline:    0.10,
    },
  },
};

const DEFAULT_RULE: DocumentRule = {
  prefer: ['metricGrid', 'featureGrid'],
  avoid:  [],
  targetMix: {
    paragraph:   0.20,
    bulletList:  0.15,
    metricGrid:  0.15,
    featureGrid: 0.15,
    chart:       0.10,
    metric:      0.10,
  },
};

export function getDocumentRule(documentType: string): DocumentRule {
  return DOCUMENT_RULES[documentType] || DEFAULT_RULE;
}
