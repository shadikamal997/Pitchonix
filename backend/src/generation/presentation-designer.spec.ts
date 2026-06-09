import { designInvestorSlide } from './presentation-designer';
import { materializePresentationOverflow } from './presentation-overflow-materializer';
import { SlideType, type SlideContent, type WizardInput } from './slide-types/types';
import { renderDeckHtml } from '../slide-export/element-html-renderer';
import { exportDeckToPptx } from '../slide-export/element-pptx-exporter';

const JSZip = require('jszip');

function baseInput(overrides: Partial<WizardInput> = {}): WizardInput {
  return {
    documentType: 'pitch-deck',
    companyName: 'Pitchonix',
    industry: 'Presentation software',
    businessStage: 'seed',
    audience: 'Investors',
    tone: 'professional',
    problem:
      'Teams lose time building investor materials. Manual design review slows every workflow.',
    solution:
      'Pitchonix turns raw business content into structured investor presentations. It plans, designs, renders, and exports.',
    marketOpportunity: 'Presentation workflows are moving into AI-native systems.',
    revenueModel: 'Subscription revenue. Enterprise licensing. Professional services.',
    traction: '€15K MRR. 5,000 users. €180K ARR.',
    team: 'Founder, CEO, product and fundraising. CTO, engineering and infrastructure.',
    fundingAsk: '$750K seed round for product and GTM.',
    roadmap: 'Q1: harden editor. Q2: launch GTM. Q3: enterprise controls.',
    theme: 'modern',
    brandColors: { primary: '#111111', secondary: '#ef4444', accent: '#06b6d4' },
    fontStyle: 'modern',
    visualStyle: 'premium',
    slideCount: 12,
    contentDepth: 'detailed',
    includeCharts: true,
    includeFinancials: true,
    includeSpeakerNotes: true,
    includeExecutiveSummary: true,
    ...overrides,
  };
}

function slide(type: SlideType): SlideContent {
  return { type, order: 1, title: type, content: '' };
}

function designedSlide(input: WizardInput, type: SlideType, order = 1): SlideContent {
  const base = slide(type);
  const elementTree = designInvestorSlide(input, base, 'investor-minimal') || [];
  return {
    ...base,
    order,
    title: type,
    speakerNotes: input.includeSpeakerNotes ? `Original notes for ${type}` : undefined,
    smartComponent: {
      family: 'investor-minimal',
      type: 'test-smart-component',
      elementTree,
    },
  };
}

function renderedPayload(input: WizardInput, type: SlideType): string {
  const elements = designInvestorSlide(input, slide(type), 'investor-minimal');
  expect(elements).toBeTruthy();
  const ledger = elements?.[0]?.data?.contentPreservation;
  expect(ledger).toBeTruthy();
  expect(ledger.sourcePreserved).toBe(true);
  return JSON.stringify(elements);
}

describe('Presentation Designer content preservation ledger', () => {
  it('preserves 10 KPI source nodes even when the visual slide summarizes them', () => {
    const kpis = Array.from({ length: 10 }, (_, i) => ({
      label: `KPI ${i + 1}`,
      value: `${i + 1}00K`,
      trend: `+${i + 1}%`,
    }));
    const payload = renderedPayload(baseInput({ structured: { kpis } }), SlideType.TRACTION);

    for (const item of kpis) {
      expect(payload).toContain(`${item.label}: ${item.value} (${item.trend})`);
    }
  });

  it('preserves 8 team members beyond visible team-card capacity', () => {
    const teamMembers = Array.from({ length: 8 }, (_, i) => ({
      name: `Leader ${i + 1}`,
      role: `Function ${i + 1}`,
      experience: `Owns workstream ${i + 1} with relevant operator experience.`,
    }));
    const payload = renderedPayload(baseInput({ structured: { teamMembers } }), SlideType.TEAM);

    for (const member of teamMembers) {
      expect(payload).toContain(`${member.name}: ${member.role}. ${member.experience}`);
    }
  });

  it('preserves 12 market drivers beyond visual market-driver grids', () => {
    const drivers = Array.from(
      { length: 12 },
      (_, i) => `Market driver ${i + 1} creates durable demand for AI-native presentation systems.`,
    );
    const payload = renderedPayload(
      baseInput({
        structured: {
          marketSizing: { tam: '$185B', sam: '$12B', som: '$850M', growthRate: '25%', drivers },
        },
      }),
      SlideType.MARKET_OPPORTUNITY,
    );

    for (const driver of drivers) {
      expect(payload).toContain(driver);
    }
  });

  it('preserves 10 roadmap milestones beyond visible roadmap capacity', () => {
    const roadmapPhases = Array.from({ length: 10 }, (_, i) => ({
      phase: `Milestone ${i + 1}`,
      period: `Q${(i % 4) + 1}`,
      milestones: [`Ship capability ${i + 1}`, `Validate customer signal ${i + 1}`],
    }));
    const payload = renderedPayload(
      baseInput({ structured: { roadmapPhases } }),
      SlideType.ROADMAP,
    );

    for (const phase of roadmapPhases) {
      expect(payload).toContain(`${phase.period} ${phase.phase}: ${phase.milestones.join('; ')}`);
    }
  });

  it('preserves 8 pricing tiers beyond visible pricing-card capacity', () => {
    const pricingTiers = Array.from({ length: 8 }, (_, i) => ({
      name: `Tier ${i + 1}`,
      price: `$${(i + 1) * 19}`,
      features: [`Feature ${i + 1}A`, `Feature ${i + 1}B`, `Feature ${i + 1}C`],
    }));
    const payload = renderedPayload(baseInput({ structured: { pricingTiers } }), SlideType.PRICING);

    for (const tier of pricingTiers) {
      expect(payload).toContain(`${tier.name}: ${tier.price}. ${tier.features.join('; ')}`);
    }
  });

  it('preserves 10 risk nodes beyond visible SWOT capacity', () => {
    const weaknesses = Array.from(
      { length: 5 },
      (_, i) => `Weakness risk ${i + 1} needs mitigation ownership.`,
    );
    const threats = Array.from(
      { length: 5 },
      (_, i) => `Threat risk ${i + 1} needs investor-visible mitigation.`,
    );
    const payload = renderedPayload(
      baseInput({
        structured: { swot: { strengths: [], weaknesses, opportunities: [], threats } },
      }),
      SlideType.RISKS,
    );

    for (const risk of [...weaknesses, ...threats]) {
      expect(payload).toContain(risk);
    }
  });
});

describe('Presentation overflow materialization', () => {
  it('creates visible appendix slides for 10 KPIs', () => {
    const kpis = Array.from({ length: 10 }, (_, i) => ({
      label: `KPI ${i + 1}`,
      value: `${i + 1}00K`,
      trend: `+${i + 1}%`,
    }));
    const result = materializePresentationOverflow([
      designedSlide(baseInput({ structured: { kpis } }), SlideType.TRACTION),
    ]);
    const payload = JSON.stringify(result.slides);

    expect(result.materializedCounts.appendixSlides).toBeGreaterThan(0);
    expect(result.slides.some((s) => s.title === 'Additional KPIs')).toBe(true);
    for (const item of kpis)
      expect(payload).toContain(`${item.label}: ${item.value} (${item.trend})`);
  });

  it('creates continuation slides immediately after source slides for 8 team members', () => {
    const teamMembers = Array.from({ length: 8 }, (_, i) => ({
      name: `Leader ${i + 1}`,
      role: `Function ${i + 1}`,
      experience: `Owns workstream ${i + 1} with relevant operator experience.`,
    }));
    const result = materializePresentationOverflow([
      designedSlide(baseInput({ structured: { teamMembers } }), SlideType.TEAM),
      designedSlide(baseInput(), SlideType.MARKET_OPPORTUNITY, 2),
    ]);

    expect(result.slides[0].type).toBe(SlideType.TEAM);
    expect(result.slides[1].title).toBe('team continued');
    expect(result.slides[1].content).toEqual(
      expect.objectContaining({ materializedOverflow: expect.any(Object) }),
    );
    expect(JSON.stringify(result.slides)).toContain(
      'Leader 8: Function 8. Owns workstream 8 with relevant operator experience.',
    );
  });

  it('does not stack duplicate continued labels', () => {
    const source = designedSlide(
      baseInput({
        structured: {
          roadmapPhases: Array.from({ length: 10 }, (_, i) => ({
            phase: `Milestone ${i + 1}`,
            period: `Q${i + 1}`,
            milestones: [`Ship ${i + 1}`],
          })),
        },
      }),
      SlideType.ROADMAP,
    );
    source.title = 'Roadmap continued';

    const result = materializePresentationOverflow([source]);
    expect(result.slides[1].title).toBe('Roadmap continued');
    expect(result.slides[1].title).not.toMatch(/continued continued/i);
  });

  it('materializes 12 market drivers and speaker-note nodes into notes plus PDF-safe appendix slides', () => {
    const drivers = Array.from(
      { length: 12 },
      (_, i) => `Market driver ${i + 1} creates durable demand for AI-native presentation systems.`,
    );
    const result = materializePresentationOverflow([
      designedSlide(
        baseInput({
          structured: {
            marketSizing: { tam: '$185B', sam: '$12B', som: '$850M', growthRate: '25%', drivers },
          },
        }),
        SlideType.MARKET_OPPORTUNITY,
      ),
    ]);
    const first = result.slides[0];
    const payload = JSON.stringify(result.slides);

    expect(first.speakerNotes).toContain('Preserved source content:');
    expect(first.speakerNotes).toContain('Market Driver:');
    expect(result.materializedCounts.speakerNotesNodes).toBeGreaterThanOrEqual(12);
    expect(result.materializedCounts.appendixSlides).toBeGreaterThan(0);
    for (const driver of drivers) expect(payload).toContain(driver);
  });

  it('materializes 10 roadmap milestones, 8 pricing tiers, and 10 risks visibly', () => {
    const roadmapPhases = Array.from({ length: 10 }, (_, i) => ({
      phase: `Milestone ${i + 1}`,
      period: `Q${i + 1}`,
      milestones: [`Ship capability ${i + 1}`],
    }));
    const pricingTiers = Array.from({ length: 8 }, (_, i) => ({
      name: `Tier ${i + 1}`,
      price: `$${(i + 1) * 19}`,
      features: [`Feature ${i + 1}`],
    }));
    const weaknesses = Array.from(
      { length: 5 },
      (_, i) => `Weakness risk ${i + 1} needs mitigation ownership.`,
    );
    const threats = Array.from(
      { length: 5 },
      (_, i) => `Threat risk ${i + 1} needs investor-visible mitigation.`,
    );
    const result = materializePresentationOverflow([
      designedSlide(baseInput({ structured: { roadmapPhases } }), SlideType.ROADMAP),
      designedSlide(baseInput({ structured: { pricingTiers } }), SlideType.PRICING),
      designedSlide(
        baseInput({
          structured: { swot: { strengths: [], weaknesses, opportunities: [], threats } },
        }),
        SlideType.RISKS,
      ),
    ]);
    const payload = JSON.stringify(result.slides);

    expect(result.materializedCounts.continuationSlides).toBeGreaterThan(0);
    expect(result.materializedCounts.appendixSlides).toBeGreaterThan(0);
    for (const phase of roadmapPhases)
      expect(payload).toContain(`${phase.period} ${phase.phase}: ${phase.milestones.join('; ')}`);
    for (const tier of pricingTiers)
      expect(payload).toContain(`${tier.name}: ${tier.price}. ${tier.features.join('; ')}`);
    for (const risk of [...weaknesses, ...threats]) expect(payload).toContain(risk);
  });

  it('feeds materialized content into PDF HTML and PPTX export inputs', async () => {
    const kpis = Array.from({ length: 10 }, (_, i) => ({
      label: `KPI ${i + 1}`,
      value: `${i + 1}00K`,
      trend: `+${i + 1}%`,
    }));
    const result = materializePresentationOverflow([
      designedSlide(baseInput({ structured: { kpis } }), SlideType.TRACTION),
    ]);
    const renderDeck = {
      title: 'Overflow Export Verification',
      slides: result.slides.map((s, index) => ({
        index,
        total: result.slides.length,
        title: s.title,
        elements: s.smartComponent?.elementTree || [],
        speakerNotes: s.speakerNotes || null,
      })),
    };

    const html = renderDeckHtml(renderDeck);
    expect(html).toContain('KPI 10: 1000K (+10%)');

    const pptx = await exportDeckToPptx(renderDeck);
    const zip = await JSZip.loadAsync(pptx);
    const slideXml = await Promise.all(
      Object.keys(zip.files)
        .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
        .map((name) => zip.files[name].async('string')),
    );
    expect(slideXml.join('\n')).toContain('KPI 10: 1000K (+10%)');
  });
});
