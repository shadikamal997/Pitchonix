import { Injectable } from '@nestjs/common';
import {
  FeasibilityAnalysis,
  FeasibilityScores,
  FeasibilitySectionCheck,
  FeasibilityStudyType,
} from './feasibility-studio.types';

const SECTION_RULES: Array<{
  key: string;
  title: string;
  guidance: string;
  patterns: RegExp[];
  domain: keyof FeasibilityScores;
}> = [
  {
    key: 'executive_summary',
    title: 'Executive Summary',
    guidance:
      'Add a concise summary covering the project, decision context, viability, and recommendation.',
    domain: 'overallScore',
    patterns: [/executive summary/i, /\bsummary\b/i, /\boverview\b/i],
  },
  {
    key: 'project_overview',
    title: 'Project Overview',
    guidance:
      'Clarify the project scope, objective, owner, location, timeline, and expected outcome.',
    domain: 'operationalScore',
    patterns: [
      /project overview/i,
      /\bobjective\b/i,
      /\bscope\b/i,
      /\binitiative\b/i,
      /\bproject\b/i,
    ],
  },
  {
    key: 'market_analysis',
    title: 'Market Analysis',
    guidance:
      'Include target customers, market size, demand drivers, trends, and evidence for demand.',
    domain: 'marketScore',
    patterns: [/market/i, /customer/i, /demand/i, /tam|sam|som/i, /segment/i, /trend/i],
  },
  {
    key: 'competitive_analysis',
    title: 'Competitive Analysis',
    guidance: 'Identify competitors, alternatives, differentiation, barriers, and positioning.',
    domain: 'marketScore',
    patterns: [/competitor/i, /competition/i, /alternative/i, /differenti/i, /positioning/i],
  },
  {
    key: 'revenue_assumptions',
    title: 'Revenue Assumptions',
    guidance:
      'Define pricing, revenue streams, sales volume, conversion assumptions, and growth logic.',
    domain: 'financialScore',
    patterns: [
      /revenue/i,
      /\barr\b/i,
      /\bmrr\b/i,
      /pricing/i,
      /sales/i,
      /income/i,
      /subscription/i,
    ],
  },
  {
    key: 'cost_assumptions',
    title: 'Cost Assumptions',
    guidance: 'List startup costs, operating expenses, capex, opex, staffing, and vendor costs.',
    domain: 'financialScore',
    patterns: [/cost/i, /expense/i, /budget/i, /capex/i, /opex/i, /investment/i, /funding/i],
  },
  {
    key: 'technical_feasibility',
    title: 'Technical Feasibility',
    guidance:
      'Document platform, infrastructure, technology, integrations, constraints, and delivery complexity.',
    domain: 'technicalScore',
    patterns: [
      /technical/i,
      /technology/i,
      /platform/i,
      /system/i,
      /software/i,
      /infrastructure/i,
      /integration/i,
    ],
  },
  {
    key: 'operational_feasibility',
    title: 'Operational Feasibility',
    guidance:
      'Explain staffing, processes, vendors, logistics, governance, and daily operating model.',
    domain: 'operationalScore',
    patterns: [
      /operational/i,
      /operations/i,
      /process/i,
      /staff/i,
      /team/i,
      /vendor/i,
      /logistics/i,
    ],
  },
  {
    key: 'legal_considerations',
    title: 'Legal / Regulatory Considerations',
    guidance:
      'Add permits, compliance needs, contracts, privacy, employment, or sector-specific legal constraints.',
    domain: 'riskScore',
    patterns: [/legal/i, /regulat/i, /compliance/i, /permit/i, /license/i, /contract/i, /privacy/i],
  },
  {
    key: 'risk_assessment',
    title: 'Risk Assessment',
    guidance: 'Add a risk matrix with likelihood, impact, mitigation, owner, and fallback plan.',
    domain: 'riskScore',
    patterns: [/risk/i, /mitigation/i, /threat/i, /constraint/i, /dependency/i, /sensitivity/i],
  },
  {
    key: 'implementation_plan',
    title: 'Implementation Plan',
    guidance:
      'Add milestones, phases, timeline, dependencies, owners, and launch readiness criteria.',
    domain: 'operationalScore',
    patterns: [/implementation/i, /timeline/i, /milestone/i, /roadmap/i, /phase/i, /launch/i],
  },
  {
    key: 'recommendation',
    title: 'Recommendation',
    guidance:
      'State whether to proceed, proceed with caution, revise, or pause, with decision rationale.',
    domain: 'overallScore',
    patterns: [/recommend/i, /go\s*\/?\s*no-go/i, /proceed/i, /decision/i, /conclusion/i],
  },
];

@Injectable()
export class FeasibilityAnalyzerService {
  analyze(
    rawContent: string,
    input: { title?: string; industry?: string; studyType?: string } = {},
  ): FeasibilityAnalysis {
    const content = this.normalize(rawContent);
    const words = content.split(/\s+/).filter(Boolean);
    const sections = this.evaluateSections(content);
    const scores = this.calculateScores(sections, words.length);
    const studyType = this.detectStudyType(content, input.studyType);
    const warnings = this.buildWarnings(sections, scores, words.length);
    const recommendations = this.buildRecommendations(sections, scores);
    const recommendation = this.recommend(scores.overallScore, scores.riskScore);

    return {
      projectName: this.detectProjectName(content, input.title),
      businessObjective: this.detectObjective(content),
      studyType,
      industry: input.industry || this.detectIndustry(content),
      detectedSignals: this.detectSignals(content),
      sections,
      scores,
      warnings,
      recommendations,
      recommendation,
      preservation: {
        originalCharacters: rawContent.length,
        originalWords: words.length,
        preservedCharacters: content.length,
        preservationRate:
          rawContent.length > 0 ? Math.round((content.length / rawContent.length) * 100) : 100,
      },
    };
  }

  private normalize(raw: string): string {
    return String(raw || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Split content into granular segments. Splits on line breaks first, then
   * breaks any long line (e.g. a single pasted paragraph with no newlines) into
   * sentences so evidence extraction and signal detection stay specific instead
   * of returning the entire blob for every section.
   */
  private segments(content: string): string[] {
    const out: string[] = [];
    for (const line of content
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)) {
      if (line.length <= 200) {
        out.push(line);
        continue;
      }
      const sentences = line
        .match(/[^.!?]+[.!?]+/g)
        ?.map((s) => s.trim())
        .filter(Boolean);
      if (sentences?.length) out.push(...sentences);
      else out.push(line);
    }
    return out;
  }

  private evaluateSections(content: string): FeasibilitySectionCheck[] {
    const lines = this.segments(content);
    return SECTION_RULES.map((rule) => {
      const evidence = lines.filter((line) => rule.patterns.some((pattern) => pattern.test(line)));
      const hits = evidence.length;
      const confidence = Math.min(
        100,
        hits * 32 + (rule.patterns.some((pattern) => pattern.test(content)) ? 20 : 0),
      );
      const status =
        confidence >= 70
          ? 'present'
          : confidence >= 42
            ? 'weak'
            : confidence >= 18
              ? 'needs_improvement'
              : 'missing';
      return {
        key: rule.key,
        title: rule.title,
        status,
        confidence,
        evidence,
        guidance: rule.guidance,
      };
    });
  }

  private calculateScores(
    sections: FeasibilitySectionCheck[],
    wordCount: number,
  ): FeasibilityScores {
    const base: FeasibilityScores = {
      marketScore: this.domainScore(sections, ['market_analysis', 'competitive_analysis']),
      financialScore: this.domainScore(sections, ['revenue_assumptions', 'cost_assumptions']),
      technicalScore: this.domainScore(sections, ['technical_feasibility']),
      operationalScore: this.domainScore(sections, [
        'project_overview',
        'operational_feasibility',
        'implementation_plan',
      ]),
      riskScore: this.domainScore(sections, ['risk_assessment', 'legal_considerations']),
      overallScore: 0,
    };
    const lengthAdjustment = wordCount < 250 ? -12 : wordCount > 800 ? 5 : 0;
    base.overallScore = this.clamp(
      Math.round(
        base.marketScore * 0.22 +
          base.financialScore * 0.23 +
          base.technicalScore * 0.15 +
          base.operationalScore * 0.17 +
          base.riskScore * 0.18 +
          this.domainScore(sections, ['executive_summary', 'recommendation']) * 0.05 +
          lengthAdjustment,
      ),
    );
    return base;
  }

  private domainScore(sections: FeasibilitySectionCheck[], keys: string[]): number {
    const selected = keys
      .map((key) => sections.find((section) => section.key === key))
      .filter(Boolean) as FeasibilitySectionCheck[];
    if (!selected.length) return 45;
    const raw =
      selected.reduce((sum, section) => {
        const statusValue =
          section.status === 'present'
            ? 90
            : section.status === 'weak'
              ? 65
              : section.status === 'needs_improvement'
                ? 48
                : 25;
        return sum + Math.max(statusValue, section.confidence);
      }, 0) / selected.length;
    return this.clamp(Math.round(raw));
  }

  private detectStudyType(content: string, requested?: string): FeasibilityStudyType {
    if (requested && requested !== 'auto') return requested as FeasibilityStudyType;
    const checks: Array<[FeasibilityStudyType, RegExp]> = [
      ['financial_viability', /financial|revenue|cost|budget|funding|break-even|margin/i],
      ['market_feasibility', /market|customer|competitor|demand|segment|tam|sam|som/i],
      ['technical_feasibility', /technical|technology|system|software|infrastructure|integration/i],
      ['operational_feasibility', /operation|staff|process|vendor|logistics|workflow/i],
      ['risk_go_no_go', /risk|go\s*\/?\s*no-go|decision|mitigation/i],
      ['real_estate_feasibility', /real estate|property|construction|site|zoning|lease/i],
      ['healthcare_feasibility', /healthcare|clinic|patient|medical|hospital|care/i],
      ['manufacturing_feasibility', /manufacturing|factory|production|supply chain|inventory/i],
      ['energy_feasibility', /solar|energy|renewable|battery|grid|power/i],
    ];
    return checks.find(([, pattern]) => pattern.test(content))?.[0] || 'general_feasibility';
  }

  private detectProjectName(content: string, title?: string): string {
    if (title?.trim()) return title.trim();
    const firstMeaningfulLine = this.segments(content).find(
      (line) => line.length > 4 && line.length < 90,
    );
    return firstMeaningfulLine || 'Untitled Feasibility Study';
  }

  private detectObjective(content: string): string {
    const line = this.segments(content).find(
      (item) => /\b(objective|goal|purpose|aim|mission|project)\b/i.test(item) && item.length < 240,
    );
    return (
      line ||
      'Assess whether the project is viable across market, financial, technical, operational, and risk dimensions.'
    );
  }

  private detectIndustry(content: string): string | undefined {
    const industries: Array<[string, RegExp]> = [
      ['Real Estate', /real estate|property|construction|housing/i],
      ['Healthcare', /healthcare|clinic|patient|medical|hospital/i],
      ['Manufacturing', /manufacturing|factory|production|supply chain/i],
      ['Energy', /solar|energy|renewable|power|grid/i],
      ['Technology', /software|platform|app|ai|saas|technology/i],
      ['Hospitality', /hotel|restaurant|hospitality|tourism/i],
    ];
    return industries.find(([, pattern]) => pattern.test(content))?.[0];
  }

  private detectSignals(content: string): Record<string, string[]> {
    const lines = this.segments(content);
    const pick = (pattern: RegExp) => lines.filter((line) => pattern.test(line));
    return {
      market: pick(/market|customer|demand|competitor|segment/i),
      financial: pick(/revenue|cost|budget|funding|pricing|arr|mrr|\$|€|£/i),
      technical: pick(/technical|technology|system|software|infrastructure|integration/i),
      operational: pick(/operation|staff|team|process|vendor|timeline|milestone/i),
      risk: pick(/risk|legal|regulation|compliance|mitigation|dependency/i),
    };
  }

  private buildWarnings(
    sections: FeasibilitySectionCheck[],
    scores: FeasibilityScores,
    wordCount: number,
  ): string[] {
    const warnings: string[] = [];
    if (wordCount < 250)
      warnings.push(
        'Source content is short for a complete feasibility study; assumptions may be under-supported.',
      );
    for (const section of sections) {
      if (section.status === 'missing') warnings.push(`${section.title} is missing.`);
      if (section.status === 'weak')
        warnings.push(`${section.title} is present but underdeveloped.`);
    }
    if (scores.financialScore < 65)
      warnings.push(
        'Financial assumptions need more detail before this can support an investment decision.',
      );
    if (scores.riskScore < 65)
      warnings.push(
        'Risk readiness is low; add mitigations, owners, and impact/likelihood scoring.',
      );
    return warnings;
  }

  private buildRecommendations(
    sections: FeasibilitySectionCheck[],
    scores: FeasibilityScores,
  ): string[] {
    const recs = sections
      .filter((section) => section.status !== 'present')
      .map((section) => section.guidance);
    if (scores.overallScore >= 80)
      recs.unshift(
        'The study is structurally strong; focus next on evidence quality and executive polish.',
      );
    return Array.from(new Set(recs));
  }

  private recommend(overall: number, risk: number): FeasibilityAnalysis['recommendation'] {
    if (overall >= 82 && risk >= 72) return 'Proceed';
    if (overall >= 68) return 'Proceed With Caution';
    if (overall >= 50) return 'Revise Before Proceeding';
    return 'Do Not Proceed Yet';
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(100, value));
  }
}
