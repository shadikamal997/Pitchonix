/**
 * Framework Coverage — Certification test
 *
 * Every `required: true` section in every DocumentFramework must have a
 * registered generator in SlideFactory. If this test fails, a FAIL or
 * WARNING template type was introduced without a backing generator.
 *
 * Also runs board_meeting_deck and strategy_presentation with minimal input
 * to confirm the required slide types actually appear in the output.
 */

import { SlideFactory } from '../slide.factory';
import { SlideType, WizardInput } from '../types';
import { FRAMEWORKS } from '../../document-quality/frameworks';

// ── helpers ──────────────────────────────────────────────────────────────────

function minimalInput(docType: string): WizardInput {
  return {
    documentType: docType,
    slideCount: 10,
    contentDepth: 'balanced',
    includeCharts: false,
    includeFinancials: true,
    includeExecutiveSummary: false,
    companyName: 'AcmeCo',
    shortDescription: 'SaaS productivity tool for enterprise teams',
    productService: 'Collaboration platform',
    industry: 'SaaS',
    country: 'US',
    businessStage: 'growth',
    problem: 'Teams waste hours in unproductive meetings.',
    solution: 'AI-powered async collaboration that cuts meetings by 50%.',
    audience: 'Enterprise decision-makers',
    tone: 'professional',
    theme: 'investor-minimal',
    brandColors: { primary: '#1d4ed8', secondary: '#0f172a', accent: '#7c3aed' },
    fontStyle: 'modern',
    visualStyle: 'minimal',
    includeSpeakerNotes: false,
    traction: '$2M ARR, 150 enterprise customers, 98 NPS',
    team: 'Alice (CEO) ex-Salesforce; Bob (CTO) ex-Google',
    fundingAsk: '$10M Series A',
    roadmap: 'Q1: SSO, Q2: Mobile, Q3: API launch',
    targetCustomers: 'Enterprise CIOs and IT Directors',
    marketOpportunity: 'TAM $60B SAM $6B SOM $600M',
    competitors: 'Slack, Microsoft Teams, Asana',
    differentiation: 'AI-first async-native platform',
    revenueModel: 'SaaS subscription $49-$499/seat/mo',
  } as WizardInput;
}

const factory = new SlideFactory();

// ── Coverage test ─────────────────────────────────────────────────────────────

describe('Framework Coverage', () => {
  it('every required framework section has a registered generator', () => {
    const registeredTypes = new Set<SlideType>(
      (factory as any).generators.map((g: any) => g.type as SlideType),
    );

    const missing: string[] = [];

    for (const [docType, framework] of Object.entries(FRAMEWORKS)) {
      for (const section of framework.sections) {
        if (!section.required) continue;

        const covered =
          registeredTypes.has(section.slideType) ||
          (section.alternates ?? []).some((alt) => registeredTypes.has(alt));

        if (!covered) {
          missing.push(`${docType} → ${section.slideType} (${section.label}) — NO GENERATOR`);
        }
      }
    }

    if (missing.length > 0) {
      fail(
        `Missing generators for required framework sections:\n${missing.map((m) => `  ✗ ${m}`).join('\n')}`,
      );
    }
  });
});

// ── Board Meeting Deck: RISKS must appear ────────────────────────────────────

describe('Board Meeting Deck', () => {
  it('includes RISKS slide in minimal deck', () => {
    const slides = factory.generateDeck(minimalInput('board_meeting_deck'));
    const types = slides.map((s) => s.type);
    expect(types).toContain(SlideType.RISKS);
  });

  it('includes all required board meeting sections', () => {
    const slides = factory.generateDeck(minimalInput('board_meeting_deck'));
    const types = new Set(slides.map((s) => s.type));
    const framework = FRAMEWORKS['board_meeting_deck'];

    const missing = framework.sections
      .filter((s) => s.required)
      .filter(
        (s) =>
          !types.has(s.slideType) &&
          !(s.alternates ?? []).some((alt) => types.has(alt)),
      )
      .map((s) => s.slideType);

    expect(missing).toEqual([]);
  });
});

// ── Strategy Presentation: all required sections ──────────────────────────────

describe('Strategy Presentation', () => {
  it('includes all required strategy sections', () => {
    const slides = factory.generateDeck(minimalInput('strategy_presentation'));
    const types = new Set(slides.map((s) => s.type));
    const framework = FRAMEWORKS['strategy_presentation'];

    const missing = framework.sections
      .filter((s) => s.required)
      .filter(
        (s) =>
          !types.has(s.slideType) &&
          !(s.alternates ?? []).some((alt) => types.has(alt)),
      )
      .map((s) => `${s.slideType} (${s.label})`);

    expect(missing).toEqual([]);
  });
});

// ── Training Presentation: all required sections ──────────────────────────────

describe('Training Presentation', () => {
  it('includes all required training sections', () => {
    const slides = factory.generateDeck(minimalInput('training_presentation'));
    const types = new Set(slides.map((s) => s.type));
    const framework = FRAMEWORKS['training_presentation'];

    const missing = framework.sections
      .filter((s) => s.required)
      .filter(
        (s) =>
          !types.has(s.slideType) &&
          !(s.alternates ?? []).some((alt) => types.has(alt)),
      )
      .map((s) => `${s.slideType} (${s.label})`);

    expect(missing).toEqual([]);
  });
});

// ── Stress: large risk set ────────────────────────────────────────────────────

describe('Risks stress test', () => {
  it('generates board meeting deck with 10 SWOT threats without error', () => {
    const input: WizardInput = {
      ...minimalInput('board_meeting_deck'),
      structured: {
        swot: {
          strengths: ['Strong brand', 'Loyal customers'],
          weaknesses: ['High CAC'],
          opportunities: ['International expansion'],
          threats: Array.from(
            { length: 10 },
            (_, i) =>
              `Threat ${i + 1}: ${['Regulatory change', 'New competitor', 'Market downturn', 'Key person risk', 'Supply chain', 'Currency risk', 'Cyber attack', 'IP infringement', 'Customer churn', 'Tech disruption'][i]}`,
          ),
        },
      },
    };

    const slides = factory.generateDeck(input);
    const risksSlide = slides.find((s) => s.type === SlideType.RISKS);
    expect(risksSlide).toBeDefined();
    expect(risksSlide!.content.description).toContain('Threat 1');
  });
});
