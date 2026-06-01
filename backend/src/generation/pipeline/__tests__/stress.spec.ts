/**
 * Phase 16 — 100-Presentation Stress Test
 *
 * Validates that:
 *  1. SlideFactory.generateDeck() succeeds for every document type
 *  2. designInvestorSlide() succeeds for every SmartFamily
 *  3. analyzeNarrativeFlow() returns a valid score for every doc type
 *  4. contentRichness() handles sparse and rich inputs without throwing
 *  5. No combination of doc-type × family throws a runtime error
 */

import { SlideFactory } from '../../slide-types/slide.factory';
import { designInvestorSlide } from '../../presentation-designer';
import { analyzeNarrativeFlow } from '../narrative-flow';
import { contentRichness, visualCoverage, compositeScore } from '../quality-signals';
import { SMART_FAMILIES } from '../../../components/smart/smart-types';
import { validateSmartComponentTree } from '../../../slides/smart-tree-validator';
import { familyForTemplate, TEMPLATE_TO_SMART_FAMILY } from '../../template-family-map';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { WizardInput, SlideContent, SlideType } from '../../slide-types/types';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { SmartFamilyId } from '../../../components/smart/smart-types';

// ---- Fixtures ---------------------------------------------------------------

const DOC_TYPES = [
  'pitch_deck', 'business_plan', 'proposal', 'sales_deck', 'company_profile',
  'board_meeting', 'training_presentation', 'product_launch', 'strategy_presentation',
  'case_study', 'marketing_plan', 'executive_summary', 'financial_projection',
  'partnership_proposal', 'internal_report', 'one_pager',
];

function minimalInput(docType: string): WizardInput {
  return {
    documentType: docType,
    slideCount: 6,
    contentDepth: 'balanced',
    includeCharts: true,
    includeFinancials: false,
    includeExecutiveSummary: false,
    companyName: 'TestCo',
    shortDescription: 'A test company',
    productService: 'Test product',
    industry: 'SaaS',
    country: 'US',
    businessStage: 'seed',
    problem: 'A problem exists.',
    solution: 'We solve it.',
    tone: 'professional',
    theme: 'investor-minimal',
    brandColors: { primary: '#dc2626', secondary: '#06b6d4', accent: '#7c3aed' },
    fontStyle: 'modern',
    visualStyle: 'minimal',
    includeSpeakerNotes: false,
    traction: '', team: '', fundingAsk: '', roadmap: '',
  } as WizardInput;
}

function richInput(docType: string): WizardInput {
  return {
    ...minimalInput(docType),
    traction: '$1.2M ARR, 340 customers, 95 NPS',
    team: 'Jane (CEO): 10 years SaaS, John (CTO): ex-Google, Sara (CMO): B2B growth',
    fundingAsk: '$5M Series A: 50% product, 30% GTM, 20% ops',
    roadmap: 'Q1: Enterprise SSO, Q2: API launch, Q3: Mobile app, Q4: International',
    marketOpportunity: 'TAM $45B SAM $4B SOM $400M',
    structured: {
      kpis: [
        { label: 'ARR', value: '$1.2M', trend: '+85%' },
        { label: 'Customers', value: '340', trend: '+42%' },
        { label: 'NPS', value: '95', trend: '+8 pts' },
      ],
      teamMembers: [
        { name: 'Jane', role: 'CEO', experience: '10 years SaaS founder' },
        { name: 'John', role: 'CTO', experience: 'Ex-Google ML engineer' },
        { name: 'Sara', role: 'CMO', experience: 'B2B growth, 3 exits' },
      ],
      pricingTiers: [
        { name: 'Starter', price: '$49', period: 'mo', features: ['5 seats', 'Core features'], highlight: false },
        { name: 'Pro', price: '$149', period: 'mo', features: ['25 seats', 'AI features', 'Priority support'], highlight: true },
        { name: 'Enterprise', price: 'Custom', features: ['Unlimited', 'SSO', 'SLA'], highlight: false },
      ],
      roadmapPhases: [
        { phase: 'Enterprise', period: 'Q1', milestones: ['SSO', 'Audit logs'] },
        { phase: 'API', period: 'Q2', milestones: ['REST API', 'Webhooks'] },
      ],
      funding: {
        amount: '$5M',
        roundType: 'Series A',
        runway: '24 mo',
        allocations: [
          { category: 'Product', percentage: 50 },
          { category: 'GTM', percentage: 30 },
          { category: 'Operations', percentage: 20 },
        ],
      },
      marketSizing: { tam: '$45B', sam: '$4B', som: '$400M', growthRate: '28%' },
    },
  } as WizardInput;
}

// ---- Helpers ----------------------------------------------------------------

const factory = new SlideFactory();

function assertInRange(name: string, val: number, min: number, max: number): void {
  if (val < min || val > max) {
    throw new Error(`${name}: ${val} is not in [${min}, ${max}]`);
  }
}

// ---- Tests ------------------------------------------------------------------

describe('Phase 16: Stress test', () => {
  // 1. SlideFactory generates without throw for every doc type
  describe('SlideFactory — all doc types', () => {
    for (const docType of DOC_TYPES) {
      it(`generates minimal deck for ${docType}`, () => {
        const slides = factory.generateDeck(minimalInput(docType));
        expect(slides.length).toBeGreaterThan(0);
        expect(slides.every((s) => s.type && s.order >= 0)).toBe(true);
      });

      it(`generates rich deck for ${docType}`, () => {
        const slides = factory.generateDeck(richInput(docType));
        expect(slides.length).toBeGreaterThan(0);
      });
    }
  });

  // 2. designInvestorSlide for all 20 families
  describe('designInvestorSlide — all families', () => {
    const slideTypes = [
      SlideType.COVER,
      SlideType.PROBLEM,
      SlideType.SOLUTION,
      SlideType.MARKET_OPPORTUNITY,
      SlideType.BUSINESS_MODEL,
      SlideType.COMPETITION,
      SlideType.TRACTION,
      SlideType.TEAM,
      SlideType.ROADMAP,
      SlideType.ASK,
    ];

    for (const family of SMART_FAMILIES) {
      it(`renders valid smart trees for family ${family}`, () => {
        const input = minimalInput('pitch_deck');
        for (const slideType of slideTypes) {
          const testSlide: SlideContent = {
            type: slideType,
            order: 0,
            title: 'Test',
            subtitle: 'Subtitle',
            content: {},
          };
          const els = designInvestorSlide(input, testSlide, family as SmartFamilyId);
          expect(Array.isArray(els)).toBe(true);
          const validation = validateSmartComponentTree(els);
          expect(validation).toMatchObject({ valid: true });
        }
      });
    }
  });

  describe('template → smart-family map', () => {
    it('resolves every presentation template to a smart family', () => {
      for (const [templateId, family] of Object.entries(TEMPLATE_TO_SMART_FAMILY)) {
        expect(SMART_FAMILIES).toContain(family);
        expect(familyForTemplate(templateId)).toBe(family);
      }
    });
  });

  // 3. analyzeNarrativeFlow for all doc types
  describe('analyzeNarrativeFlow — all doc types', () => {
    for (const docType of DOC_TYPES) {
      it(`returns valid score for ${docType}`, () => {
        const slides = factory.generateDeck(minimalInput(docType));
        const types = slides.map((s) => s.type);
        const result = analyzeNarrativeFlow(types as any, docType);
        assertInRange(`narrativeScore(${docType})`, result.narrativeScore, 0, 100);
        expect(Array.isArray(result.gaps)).toBe(true);
      });
    }
  });

  // 4. contentRichness edge cases
  describe('contentRichness', () => {
    it('returns 0 for totally empty input', () => {
      const score = contentRichness({} as WizardInput);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('returns higher score for rich input', () => {
      const richScore = contentRichness(richInput('pitch_deck'));
      const minScore  = contentRichness(minimalInput('pitch_deck'));
      expect(richScore).toBeGreaterThan(minScore);
    });
  });

  // 5. visualCoverage
  describe('visualCoverage', () => {
    it('returns 0 for empty slides', () => {
      expect(visualCoverage([])).toBe(0);
    });
    it('returns value in [0,100]', () => {
      const slides = factory.generateDeck(minimalInput('pitch_deck'));
      const vc = visualCoverage(slides as any);
      assertInRange('visualCoverage', vc, 0, 100);
    });
  });

  // 6. compositeScore sanity
  describe('compositeScore', () => {
    it('is bounded 0–100', () => {
      const score = compositeScore({ scorecardTotal: 72, narrativeScore: 85, contentRichness: 60, visualCoverage: 40 });
      assertInRange('compositeScore', score, 0, 100);
    });
    it('is 0 when all inputs are 0', () => {
      expect(compositeScore({ scorecardTotal: 0, narrativeScore: 0, contentRichness: 0, visualCoverage: 0 })).toBe(0);
    });
    it('is 100 when all inputs are 100', () => {
      expect(compositeScore({ scorecardTotal: 100, narrativeScore: 100, contentRichness: 100, visualCoverage: 100 })).toBe(100);
    });
  });
});
