/**
 * Phase 27A — Content Structure Analyzer
 *
 * Pure-function service. Takes raw wizard input text fields and extracts
 * structured facts (numbers, people, pricing tiers, roadmap phases, etc.)
 * using regex + simple parsing. No LLM, no prompts.
 */

import { Injectable } from '@nestjs/common';
import { SlideContent, SlideType, WizardInput } from '../slide-types/types';
import {
  BlockKind,
  ContentStructureProfile,
  ExtractedAllocation,
  ExtractedCompetitor,
  ExtractedFeature,
  ExtractedMarketSizing,
  ExtractedNumber,
  ExtractedPerson,
  ExtractedPricingTier,
  ExtractedRoadmapPhase,
  ExtractedSwot,
} from './types';

@Injectable()
export class ContentStructureAnalyzer {
  /**
   * Analyse a single slide in the context of the full wizard input.
   * Pulls text from the slide's existing content blob AND from the wizard
   * fields relevant to that slide type, so we get the richest extraction.
   */
  analyze(slide: SlideContent, input: WizardInput): ContentStructureProfile {
    const text = this.gatherText(slide, input);
    const slideType = slide.type;

    let numbers = this.extractNumbers(text);

    // Phase 28 — Merge structured KPIs as numbers (with their labels in context).
    if (input.structured?.kpis && input.structured.kpis.length > 0) {
      const structuredNums: ExtractedNumber[] = input.structured.kpis.map((k) => ({
        value:        k.value,
        numeric:      parseFloat((k.value || '').replace(/[^0-9.\-]/g, '')) || 0,
        unit:         k.value?.includes('%') ? '%' : k.value?.includes('$') ? '$' : undefined,
        isPercent:    !!k.value?.includes('%'),
        isCurrency:   !!k.value?.includes('$'),
        isMultiplier: /\dx/i.test(k.value || ''),
        context:      k.label,
      }));
      // Structured KPIs come first; deduplicate by value
      const seen = new Set(structuredNums.map((n) => n.value));
      numbers = [...structuredNums, ...numbers.filter((n) => !seen.has(n.value))];
    }
    const people       = this.extractPeople(input, slide);
    const pricingTiers = this.extractPricingTiers(input, slide);
    const phases       = this.extractRoadmap(input, slide);
    const allocations  = this.extractAllocations(input, slide, numbers);
    const features     = this.extractFeatures(input, slide);
    const competitors  = this.extractCompetitors(input);
    const swot         = this.extractSwot(input);
    const marketSizing = this.extractMarketSizing(input, slide, numbers);

    const visualCandidates = this.rankCandidates(slideType, {
      numbers, people, pricingTiers, phases, allocations,
      features, competitors, swot, marketSizing,
    });

    const dataDensity   = this.computeDataDensity({ numbers, people, pricingTiers, phases, allocations, features, competitors, swot, marketSizing });
    const structureScore = this.computeStructureScore(visualCandidates, dataDensity);
    const contentCategory = this.classifyCategory(slideType);

    return {
      slideType,
      contentCategory,
      visualCandidates,
      dataDensity,
      structureScore,
      extracted: { numbers, people, pricingTiers, phases, allocations, features, competitors, swot, marketSizing },
    };
  }

  // ===========================================================================
  //  Text gathering — pulls from slide + relevant wizard fields
  // ===========================================================================

  private gatherText(slide: SlideContent, input: WizardInput): string {
    const c = (slide.content || {}) as any;
    const slideText = [
      slide.title, slide.subtitle,
      c.description, c.body, c.text, c.summary, c.paragraph,
      Array.isArray(c.bullets) ? c.bullets.join(' ') : '',
      Array.isArray(c.features) ? c.features.join(' ') : '',
      Array.isArray(c.highlights) ? c.highlights.join(' ') : '',
    ].filter(Boolean).join(' ');

    const wizardText = [
      input.problem, input.solution, input.targetCustomers, input.marketOpportunity,
      input.competitors, input.differentiation, input.revenueModel, input.pricing,
      input.traction, input.team, input.fundingAsk, input.roadmap,
      input.shortDescription, input.productService,
    ].filter(Boolean).join(' ');

    // Slide-type-specific text wins: weight it 2× by repeating
    const slideRelevant = this.slideTypeRelevantWizardText(slide.type, input);
    return `${slideText} ${slideText} ${slideRelevant} ${wizardText}`;
  }

  private slideTypeRelevantWizardText(slideType: string, input: WizardInput): string {
    const map: Record<string, (keyof WizardInput)[]> = {
      [SlideType.PROBLEM]:            ['problem'],
      [SlideType.SOLUTION]:           ['solution', 'productService'],
      [SlideType.MARKET_OPPORTUNITY]: ['marketOpportunity', 'targetCustomers'],
      [SlideType.BUSINESS_MODEL]:     ['revenueModel', 'pricing'],
      [SlideType.TRACTION]:           ['traction'],
      [SlideType.ROADMAP]:            ['roadmap'],
      [SlideType.TEAM]:               ['team'],
      [SlideType.ASK]:                ['fundingAsk'],
      [SlideType.COMPETITION]:        ['competitors', 'differentiation'],
      [SlideType.PRICING]:            ['pricing'],
      [SlideType.GO_TO_MARKET]:       ['targetCustomers', 'revenueModel'],
    };
    const keys = map[slideType] || [];
    return keys.map((k) => (input as any)[k] || '').join(' ');
  }

  // ===========================================================================
  //  Extractors
  // ===========================================================================

  extractNumbers(text: string): ExtractedNumber[] {
    if (!text) return [];
    const out: ExtractedNumber[] = [];
    const seen = new Set<string>();

    // Currency: $10, $10M, $10.5B, $1,000
    const currencyRe = /\$\s?([\d,]+(?:\.\d+)?)\s?([KMBkmb]?)/g;
    let m: RegExpExecArray | null;
    while ((m = currencyRe.exec(text)) !== null) {
      const raw = m[0];
      if (seen.has(raw)) continue;
      seen.add(raw);
      const mag = parseFloat(m[1].replace(/,/g, '')) || 0;
      const unit = (m[2] || '').toUpperCase();
      const multiplier = unit === 'K' ? 1e3 : unit === 'M' ? 1e6 : unit === 'B' ? 1e9 : 1;
      out.push({
        value: raw.trim(), numeric: mag * multiplier, unit: unit || '$',
        isPercent: false, isCurrency: true, isMultiplier: false,
        context: this.contextAround(text, m.index, raw.length),
      });
    }

    // Percentages: 50%, 25.5%
    const pctRe = /(\d+(?:\.\d+)?)\s?%/g;
    while ((m = pctRe.exec(text)) !== null) {
      const raw = m[0];
      if (seen.has(raw)) continue;
      seen.add(raw);
      out.push({
        value: raw.trim(), numeric: parseFloat(m[1]) || 0, unit: '%',
        isPercent: true, isCurrency: false, isMultiplier: false,
        context: this.contextAround(text, m.index, raw.length),
      });
    }

    // Multipliers: 3x, 10x, 2.5x
    const mulRe = /(\d+(?:\.\d+)?)\s?x\b/gi;
    while ((m = mulRe.exec(text)) !== null) {
      const raw = m[0];
      if (seen.has(raw)) continue;
      seen.add(raw);
      out.push({
        value: raw.trim(), numeric: parseFloat(m[1]) || 0, unit: 'x',
        isPercent: false, isCurrency: false, isMultiplier: true,
        context: this.contextAround(text, m.index, raw.length),
      });
    }

    // Bare counts with units: "1,000 users", "5M downloads"
    const countRe = /\b([\d,]+(?:\.\d+)?)([KMBkmb]?)\s+(users?|customers?|clients?|companies|countries?|partners?|downloads?|installs?|subscribers?|members?)\b/g;
    while ((m = countRe.exec(text)) !== null) {
      const raw = m[0];
      if (seen.has(raw)) continue;
      seen.add(raw);
      const mag = parseFloat(m[1].replace(/,/g, '')) || 0;
      const unit = (m[2] || '').toUpperCase();
      const multiplier = unit === 'K' ? 1e3 : unit === 'M' ? 1e6 : unit === 'B' ? 1e9 : 1;
      out.push({
        value: raw.trim(), numeric: mag * multiplier, unit: m[3],
        isPercent: false, isCurrency: false, isMultiplier: false,
        context: this.contextAround(text, m.index, raw.length),
      });
    }

    return out;
  }

  extractPeople(input: WizardInput, slide: SlideContent): ExtractedPerson[] {
    // Phase 28 — Prefer structured wizard input
    if (input.structured?.teamMembers && input.structured.teamMembers.length > 0) {
      return input.structured.teamMembers.map((m) => ({
        name:       m.name,
        role:       m.role,
        background: m.experience || m.responsibilities,
      })).filter((p) => p.name);
    }

    // Only for team-style slides — we don't want to pull person names from
    // every text field. Pull from slide content first, then wizard.team.
    const c = (slide.content || {}) as any;
    const raw = Array.isArray(c.members) ? c.members
              : Array.isArray(c.team)    ? c.team
              : null;
    if (Array.isArray(raw)) {
      return raw.map((m: any) => ({
        name:       String(m.name || ''),
        role:       m.role || m.title,
        background: m.background || m.bio,
      })).filter((p) => p.name);
    }

    const teamText = input.team || '';
    if (!teamText) return [];

    // Heuristic: split into sentences; each sentence with a Capitalised Name is a person.
    const out: ExtractedPerson[] = [];
    const sentences = teamText.split(/[.;\n]/).map((s) => s.trim()).filter(Boolean);
    for (const s of sentences) {
      const nameMatch = s.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/);
      if (!nameMatch) continue;
      const name = nameMatch[1];
      const role = this.inferRoleFromText(s);
      out.push({ name, role, background: s.length > 40 ? s.substring(0, 140) : undefined });
      if (out.length >= 6) break;
    }
    return out;
  }

  private inferRoleFromText(text: string): string | undefined {
    const t = text.toLowerCase();
    if (/\b(ceo|chief executive)\b/.test(t)) return 'CEO';
    if (/\b(cto|chief technology)\b/.test(t)) return 'CTO';
    if (/\b(cfo|chief financial)\b/.test(t)) return 'CFO';
    if (/\b(coo|chief operating)\b/.test(t)) return 'COO';
    if (/\b(cmo|chief marketing)\b/.test(t)) return 'CMO';
    if (/\bfounder\b/.test(t)) return 'Founder';
    if (/\b(vp|vice president).*(product)/.test(t)) return 'VP Product';
    if (/\b(vp|vice president).*(engineering|tech)/.test(t)) return 'VP Engineering';
    if (/\b(vp|vice president).*(sales)/.test(t)) return 'VP Sales';
    if (/\b(head of|director of)\b/.test(t)) return 'Director';
    return undefined;
  }

  extractPricingTiers(input: WizardInput, slide: SlideContent): ExtractedPricingTier[] {
    // Phase 28 — Prefer structured wizard input
    if (input.structured?.pricingTiers && input.structured.pricingTiers.length > 0) {
      return input.structured.pricingTiers.map((t) => ({
        name:      t.name,
        price:     t.price,
        features:  t.features || [],
        highlight: t.highlight,
      })).filter((t) => t.name);
    }

    const c = (slide.content || {}) as any;
    if (Array.isArray(c.pricingTiers) && c.pricingTiers.length > 0) {
      return c.pricingTiers.map((t: any) => ({
        name: String(t.name || t.tier || ''),
        price: String(t.price || ''),
        features: Array.isArray(t.features) ? t.features.map(String) : [],
        highlight: !!t.highlight,
      })).filter((t) => t.name);
    }
    // legacy generator key 'pricing' could be an array of tiers
    if (Array.isArray(c.pricing) && c.pricing.length > 0 && typeof c.pricing[0] === 'object') {
      return c.pricing.map((t: any) => ({
        name: String(t.tier || t.name || ''),
        price: String(t.price || ''),
        features: Array.isArray(t.features) ? t.features.map(String) : [],
      }));
    }

    const pricingText = input.pricing || '';
    if (!pricingText) return [];
    // Try to split on tier separators
    const segs = pricingText.split(/[;\n]|(?:\s\/\s)/).map((s) => s.trim()).filter(Boolean);
    const tiers: ExtractedPricingTier[] = [];
    const tierNameRe = /^(starter|basic|free|pro|professional|business|premium|enterprise|team|growth|scale)\b/i;
    for (const seg of segs) {
      const nameMatch = seg.match(tierNameRe);
      const priceMatch = seg.match(/(\$[\d,.]+(?:\/(?:mo|month|year|yr))?|free|custom)/i);
      if (!nameMatch && !priceMatch) continue;
      const name  = nameMatch ? this.titleCase(nameMatch[1]) : (priceMatch ? 'Tier' : '');
      const price = priceMatch ? priceMatch[0] : '';
      if (!name) continue;
      // Trailing features (anything after price)
      const featuresText = seg.replace(nameMatch?.[0] || '', '').replace(priceMatch?.[0] || '', '').trim();
      const features = featuresText
        .split(/[,:]|\sand\s/).map((f) => f.trim()).filter((f) => f.length > 2 && f.length < 80);
      tiers.push({ name, price, features: features.slice(0, 5) });
      if (tiers.length >= 4) break;
    }
    return tiers;
  }

  extractRoadmap(input: WizardInput, slide: SlideContent): ExtractedRoadmapPhase[] {
    // Phase 28 — Prefer structured wizard input
    if (input.structured?.roadmapPhases && input.structured.roadmapPhases.length > 0) {
      return input.structured.roadmapPhases.map((p) => ({
        phase:   p.phase,
        period:  p.period,
        bullets: p.milestones || [],
      })).filter((p) => p.phase);
    }

    const c = (slide.content || {}) as any;
    const rawArr = Array.isArray(c.phases) ? c.phases
                 : Array.isArray(c.timeline) ? c.timeline
                 : Array.isArray(c.milestones) ? c.milestones
                 : null;
    if (rawArr) {
      return rawArr.map((p: any, i: number) => ({
        phase:   String(p.phase || p.title || p.milestone || `Phase ${i + 1}`),
        period:  p.period || p.date,
        bullets: Array.isArray(p.bullets) ? p.bullets.map(String)
              : (p.description ? [String(p.description)] : []),
      }));
    }

    const text = input.roadmap || '';
    if (!text) return [];

    // Split on quarters / years / phase markers
    const phaseSegRe = /\b(Q[1-4]\s*\d{2,4}|Year\s*\d|Phase\s*\d|Month\s*\d{1,2}|H[12]\s*\d{2,4}|[A-Z][a-z]+\s+\d{4})\b/g;
    const segments: { period: string; index: number }[] = [];
    let m: RegExpExecArray | null;
    while ((m = phaseSegRe.exec(text)) !== null) {
      segments.push({ period: m[1], index: m.index });
    }
    if (segments.length === 0) {
      // Fallback: split sentences into phases
      const sentences = text.split(/[.;\n]/).map((s) => s.trim()).filter((s) => s.length > 15);
      return sentences.slice(0, 4).map((s, i) => ({
        phase:   this.firstWords(s, 5),
        period:  `Phase ${i + 1}`,
        bullets: [s.substring(0, 140)],
      }));
    }

    const phases: ExtractedRoadmapPhase[] = [];
    for (let i = 0; i < segments.length; i++) {
      const start = segments[i].index + segments[i].period.length;
      const end = i + 1 < segments.length ? segments[i + 1].index : text.length;
      const segText = text.substring(start, end).trim().replace(/^[:\-—]\s*/, '');
      phases.push({
        phase:  segments[i].period,
        period: segments[i].period,
        bullets: segText ? [segText.substring(0, 200)] : [],
      });
    }
    return phases.slice(0, 6);
  }

  extractAllocations(input: WizardInput, slide: SlideContent, numbers: ExtractedNumber[]): ExtractedAllocation[] {
    // Phase 28 — Prefer structured wizard input
    if (input.structured?.funding?.allocations && input.structured.funding.allocations.length > 0) {
      return input.structured.funding.allocations.map((a) => ({
        category:   a.category,
        percentage: a.percentage,
        amount:     a.amount,
      })).filter((a) => a.category);
    }

    const c = (slide.content || {}) as any;
    if (Array.isArray(c.useOfFunds)) {
      return c.useOfFunds.map((u: any) => ({
        category:   String(u.category || ''),
        percentage: typeof u.percentage === 'number' ? u.percentage : undefined,
        amount:     u.amount,
      })).filter((a) => a.category);
    }

    const text = input.fundingAsk || '';
    if (!text) return [];
    const pcts = numbers.filter((n) => n.isPercent);
    if (pcts.length === 0) {
      const points = text.split(/[,;\n]|\sand\s/).map((s) => s.trim()).filter((s) => s.length > 4 && s.length < 60);
      return points.slice(0, 5).map((p) => ({ category: p, percentage: undefined }));
    }
    return pcts.slice(0, 5).map((p) => ({
      category: this.firstWords(p.context.replace(p.value, ''), 4) || p.context,
      percentage: p.numeric,
    }));
  }

  extractFeatures(input: WizardInput, slide: SlideContent): ExtractedFeature[] {
    const c = (slide.content || {}) as any;
    if (Array.isArray(c.features) && c.features.length > 0) {
      return c.features.map((f: any) =>
        typeof f === 'string'
          ? { title: this.firstWords(f, 5), description: f }
          : { title: String(f.title || f.name || ''), description: f.description }
      ).filter((f) => f.title);
    }
    if (Array.isArray(c.benefits) && c.benefits.length > 0) {
      return c.benefits.map((f: any) =>
        typeof f === 'string'
          ? { title: this.firstWords(f, 5), description: f }
          : { title: String(f.title || ''), description: f.description }
      );
    }
    // Build features from solution / differentiation
    const text = `${input.solution || ''} ${input.differentiation || ''}`.trim();
    if (!text) return [];
    const points = text.split(/[.;\n]|(?:\sand\s)/).map((s) => s.trim()).filter((s) => s.length > 12 && s.length < 200);
    return points.slice(0, 6).map((p) => ({ title: this.firstWords(p, 6), description: p }));
  }

  extractCompetitors(input: WizardInput): ExtractedCompetitor[] {
    // Phase 28 — Prefer structured wizard input
    if (input.structured?.competitors && input.structured.competitors.length > 0) {
      return input.structured.competitors.map((c) => ({
        name: c.name,
        strengths:  c.strengths  ? [c.strengths]  : undefined,
        weaknesses: c.weaknesses ? [c.weaknesses] : undefined,
      })).filter((c) => c.name);
    }

    const text = input.competitors || '';
    if (!text) return [];
    // Look for company-like tokens
    const names = Array.from(new Set(text.match(/\b([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)\b/g) || []));
    return names.slice(0, 4).map((name) => ({ name }));
  }

  extractSwot(input: WizardInput): ExtractedSwot | undefined {
    // Phase 28 — Prefer structured wizard input
    if (input.structured?.swot) {
      const s = input.structured.swot;
      if ((s.strengths?.length ?? 0) + (s.weaknesses?.length ?? 0) +
          (s.opportunities?.length ?? 0) + (s.threats?.length ?? 0) > 0) {
        return {
          strengths:     s.strengths     || [],
          weaknesses:    s.weaknesses    || [],
          opportunities: s.opportunities || [],
          threats:       s.threats       || [],
        };
      }
    }

    const haystack = [input.differentiation, input.problem, input.solution, input.marketOpportunity, input.competitors].filter(Boolean).join(' ');
    if (!haystack) return undefined;
    const strengths     = this.pickClauses(haystack, [/\bstrength/i, /\bunique\b/i, /\badvantage\b/i, /\bproven\b/i]);
    const weaknesses    = this.pickClauses(haystack, [/\bweak/i, /\blimitation\b/i, /\bchallenge\b/i, /\bgap\b/i]);
    const opportunities = this.pickClauses(haystack, [/\bopportunit/i, /\bgrowth\b/i, /\btrend\b/i, /\bemerging\b/i]);
    const threats       = this.pickClauses(haystack, [/\bthreat\b/i, /\brisk\b/i, /\bcompetit/i]);
    if (strengths.length + weaknesses.length + opportunities.length + threats.length === 0) return undefined;
    return { strengths, weaknesses, opportunities, threats };
  }

  extractMarketSizing(input: WizardInput, slide: SlideContent, numbers: ExtractedNumber[]): ExtractedMarketSizing | undefined {
    // Phase 28 — Prefer structured wizard input
    if (input.structured?.marketSizing) {
      const m = input.structured.marketSizing;
      if (m.tam || m.sam || m.som) {
        return {
          tam: m.tam ? { value: m.tam, label: 'TAM' } : undefined,
          sam: m.sam ? { value: m.sam, label: 'SAM' } : undefined,
          som: m.som ? { value: m.som, label: 'SOM' } : undefined,
        };
      }
    }

    const text = `${input.marketOpportunity || ''} ${(slide.content as any)?.description || ''}`;
    if (!text && numbers.length === 0) return undefined;
    const tamMatch = text.match(/TAM[^A-Za-z\d]{0,4}(\$[\d,.]+[KMB]?)/i);
    const samMatch = text.match(/SAM[^A-Za-z\d]{0,4}(\$[\d,.]+[KMB]?)/i);
    const somMatch = text.match(/SOM[^A-Za-z\d]{0,4}(\$[\d,.]+[KMB]?)/i);
    if (!tamMatch && !samMatch && !somMatch) {
      // Try to synthesise from the first 3 currency numbers in the market text
      const currencies = numbers.filter((n) => n.isCurrency).slice(0, 3);
      if (currencies.length === 0) return undefined;
      return {
        tam: currencies[0] ? { value: currencies[0].value, label: 'TAM' } : undefined,
        sam: currencies[1] ? { value: currencies[1].value, label: 'SAM' } : undefined,
        som: currencies[2] ? { value: currencies[2].value, label: 'SOM' } : undefined,
      };
    }
    return {
      tam: tamMatch ? { value: tamMatch[1], label: 'TAM' } : undefined,
      sam: samMatch ? { value: samMatch[1], label: 'SAM' } : undefined,
      som: somMatch ? { value: somMatch[1], label: 'SOM' } : undefined,
    };
  }

  // ===========================================================================
  //  Candidate ranking + scoring
  // ===========================================================================

  private rankCandidates(
    slideType: string,
    facts: {
      numbers: ExtractedNumber[]; people: ExtractedPerson[]; pricingTiers: ExtractedPricingTier[];
      phases: ExtractedRoadmapPhase[]; allocations: ExtractedAllocation[]; features: ExtractedFeature[];
      competitors: ExtractedCompetitor[]; swot?: ExtractedSwot; marketSizing?: ExtractedMarketSizing;
    },
  ): BlockKind[] {
    const out: BlockKind[] = [];
    const has = <T,>(arr: T[]) => arr && arr.length > 0;

    // 1. Slide-type-driven primary candidates
    switch (slideType) {
      case SlideType.MARKET_OPPORTUNITY:
      case 'tam_sam_som':
        if (facts.marketSizing) out.push('marketSizing');
        if (has(facts.numbers)) out.push('metricGrid');
        break;

      case SlideType.TRACTION:
        if (has(facts.numbers)) out.push('metricGrid');
        out.push('kpi');
        break;

      case SlideType.BUSINESS_MODEL:
      case SlideType.PRICING:
        if (has(facts.pricingTiers)) out.push('pricing');
        if (has(facts.features))     out.push('featureGrid');
        break;

      case SlideType.ROADMAP:
      case 'product_roadmap':
        if (has(facts.phases)) out.push('roadmap');
        out.push('timeline');
        break;

      case SlideType.TEAM:
        if (has(facts.people)) out.push('team');
        break;

      case SlideType.ASK:
      case 'investment_ask':
      case 'use_of_funds':
        if (has(facts.allocations)) out.push('fundingAllocation');
        if (has(facts.numbers))     out.push('metric');
        break;

      case SlideType.COMPETITION:
      case 'competitor_analysis':
      case 'competitive_advantage':
        if (has(facts.competitors)) out.push('comparison');
        if (facts.swot)             out.push('swot');
        break;

      case SlideType.SOLUTION:
      case SlideType.PRODUCT_FEATURES:
        if (has(facts.features)) out.push('featureGrid');
        out.push('processSteps');
        break;

      case SlideType.PROBLEM:
        if (has(facts.numbers)) out.push('metric');
        out.push('bulletList');
        break;

      case SlideType.GO_TO_MARKET:
        if (has(facts.features))    out.push('processSteps');
        if (has(facts.numbers))     out.push('metric');
        break;

      case SlideType.FINANCIALS:
      case 'financial_projection':
      case SlideType.REVENUE_MODEL:
      case SlideType.UNIT_ECONOMICS:
        out.push('chart');
        if (has(facts.numbers)) out.push('metricGrid');
        break;

      case SlideType.CASE_STUDY:
        out.push('testimonial');
        if (has(facts.numbers)) out.push('metricGrid');
        break;

      case SlideType.VISION:
      case SlideType.COVER:
        out.push('quote');
        break;
    }

    // 2. Fallback ordering by what we extracted
    if (out.length === 0) {
      if (facts.swot)                       out.push('swot');
      else if (has(facts.marketSizing ? [1] : [])) out.push('marketSizing');
      else if (has(facts.pricingTiers))     out.push('pricing');
      else if (has(facts.phases))           out.push('roadmap');
      else if (has(facts.people))           out.push('team');
      else if (has(facts.allocations))      out.push('fundingAllocation');
      else if (has(facts.competitors))      out.push('comparison');
      else if (has(facts.features))         out.push('featureGrid');
      else if (facts.numbers.length >= 2)   out.push('metricGrid');
      else if (facts.numbers.length === 1)  out.push('metric');
      else                                  out.push('bulletList');
    }

    // 3. Always end with a paragraph fallback option
    if (!out.includes('paragraph')) out.push('paragraph');
    return Array.from(new Set(out));
  }

  private computeDataDensity(facts: any): number {
    let score = 0;
    if (facts.numbers?.length)        score += Math.min(30, facts.numbers.length * 6);
    if (facts.people?.length)         score += Math.min(20, facts.people.length * 5);
    if (facts.pricingTiers?.length)   score += Math.min(20, facts.pricingTiers.length * 7);
    if (facts.phases?.length)         score += Math.min(20, facts.phases.length * 5);
    if (facts.allocations?.length)    score += Math.min(20, facts.allocations.length * 5);
    if (facts.features?.length)       score += Math.min(20, facts.features.length * 4);
    if (facts.competitors?.length)    score += Math.min(15, facts.competitors.length * 4);
    if (facts.swot)                   score += 15;
    if (facts.marketSizing)           score += 10;
    return Math.min(100, score);
  }

  private computeStructureScore(candidates: BlockKind[], density: number): number {
    const nonParagraphCount = candidates.filter((c) => c !== 'paragraph' && c !== 'bulletList').length;
    const base = nonParagraphCount * 20;
    return Math.max(0, Math.min(100, base + density * 0.3));
  }

  private classifyCategory(slideType: string): string {
    const map: Record<string, string> = {
      [SlideType.COVER]:              'narrative',
      [SlideType.PROBLEM]:            'narrative',
      [SlideType.SOLUTION]:           'features',
      [SlideType.MARKET_OPPORTUNITY]: 'metrics-heavy',
      [SlideType.BUSINESS_MODEL]:     'pricing-heavy',
      [SlideType.TRACTION]:           'metrics-heavy',
      [SlideType.ROADMAP]:            'timeline-heavy',
      [SlideType.TEAM]:               'people-heavy',
      [SlideType.ASK]:                'allocation-heavy',
      [SlideType.COMPETITION]:        'comparison-heavy',
      [SlideType.PRICING]:            'pricing-heavy',
      [SlideType.FINANCIALS]:         'chart-heavy',
      [SlideType.VISION]:             'narrative',
    };
    return map[slideType] || 'narrative';
  }

  // ===========================================================================
  //  Helpers
  // ===========================================================================

  private contextAround(text: string, idx: number, len: number, radius = 40): string {
    const s = Math.max(0, idx - radius);
    const e = Math.min(text.length, idx + len + radius);
    return text.substring(s, e).replace(/\s+/g, ' ').trim();
  }

  private firstWords(s: string, n: number): string {
    return s.trim().split(/\s+/).slice(0, n).join(' ');
  }

  private titleCase(s: string): string {
    return s.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private pickClauses(text: string, patterns: RegExp[]): string[] {
    const clauses = text.split(/[.;\n]/).map((s) => s.trim()).filter(Boolean);
    const out: string[] = [];
    for (const c of clauses) {
      if (patterns.some((p) => p.test(c))) {
        out.push(c.substring(0, 120));
        if (out.length >= 3) break;
      }
    }
    return out;
  }
}
